import {
  CategoryStat,
  ComputedAnalytics,
  DiscountBucketStat,
  FacetOption,
  FactSalesRow,
  FilterState,
  SalesStarModel,
  SalespersonStat,
  StoreCategoryHeatmapCell,
  StorePerformance,
  TrendGranularity,
  TrendPoint,
} from '../types/sales';
import { formatCAD, formatDateDisplay, formatMonthLabel, formatPercent } from './formatters';

const DAY_MS = 86_400_000;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function msToDateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function dateKeyToMs(key: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function resolveDateWindow(
  model: SalesStarModel,
  filters: FilterState
): {
  fromMs: number | null;
  toMs: number | null;
  fromKey: string | null;
  toKey: string | null;
  priorFromMs: number | null;
  priorToMs: number | null;
  priorFromKey: string | null;
  priorToKey: string | null;
} {
  const maxMs = model.maxDateMs;
  if (maxMs === null) {
    return {
      fromMs: null,
      toMs: null,
      fromKey: null,
      toKey: null,
      priorFromMs: null,
      priorToMs: null,
      priorFromKey: null,
      priorToKey: null,
    };
  }

  let fromMs: number | null = null;
  let toMs: number | null = null;
  const maxDate = new Date(maxMs);

  switch (filters.datePreset) {
    case 'all': {
      fromMs = null;
      toMs = null;
      break;
    }
    case 'this_year': {
      fromMs = Date.UTC(maxDate.getUTCFullYear(), 0, 1);
      toMs = maxMs;
      break;
    }
    case 'last_90': {
      fromMs = maxMs - 89 * DAY_MS;
      toMs = maxMs;
      break;
    }
    case 'last_30': {
      fromMs = maxMs - 29 * DAY_MS;
      toMs = maxMs;
      break;
    }
    case 'this_month': {
      fromMs = Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth(), 1);
      toMs = maxMs;
      break;
    }
    case 'custom': {
      fromMs = filters.dateFrom ? dateKeyToMs(filters.dateFrom) : null;
      toMs = filters.dateTo ? dateKeyToMs(filters.dateTo) : null;
      break;
    }
  }

  // Determine exact prior window of equal length
  let priorFromMs: number | null = null;
  let priorToMs: number | null = null;

  if (fromMs !== null && toMs !== null && toMs >= fromMs) {
    const spanMs = toMs - fromMs + DAY_MS;
    priorToMs = fromMs - DAY_MS;
    priorFromMs = priorToMs - spanMs + DAY_MS;
  } else if (filters.datePreset === 'custom' && (fromMs !== null || toMs !== null)) {
    const effectiveFrom = fromMs ?? (model.minDateKey ? dateKeyToMs(model.minDateKey) : null);
    const effectiveTo = toMs ?? maxMs;
    if (effectiveFrom !== null && effectiveTo !== null && effectiveTo >= effectiveFrom) {
      const spanMs = effectiveTo - effectiveFrom + DAY_MS;
      priorToMs = effectiveFrom - DAY_MS;
      priorFromMs = priorToMs - spanMs + DAY_MS;
    }
  }

  return {
    fromMs,
    toMs,
    fromKey: fromMs !== null ? msToDateKey(fromMs) : model.minDateKey,
    toKey: toMs !== null ? msToDateKey(toMs) : model.maxDateKey,
    priorFromMs,
    priorToMs,
    priorFromKey: priorFromMs !== null ? msToDateKey(priorFromMs) : null,
    priorToKey: priorToMs !== null ? msToDateKey(priorToMs) : null,
  };
}

function getRowYear(row: FactSalesRow): string {
  return row.dateKey && row.dateKey.length >= 4 ? row.dateKey.slice(0, 4) : '';
}

function matchesNonDateFilters(
  row: FactSalesRow,
  filters: FilterState,
  skipKey?: keyof Pick<
    FilterState,
    | 'years'
    | 'stores'
    | 'categories'
    | 'salespeople'
    | 'provinces'
    | 'channels'
    | 'paymentMethods'
    | 'products'
  >
): boolean {
  if (skipKey !== 'years' && filters.years.length > 0 && !filters.years.includes(getRowYear(row))) {
    return false;
  }
  if (skipKey !== 'stores' && filters.stores.length > 0 && !filters.stores.includes(row.store)) {
    return false;
  }
  if (
    skipKey !== 'categories' &&
    filters.categories.length > 0 &&
    !filters.categories.includes(row.category)
  ) {
    return false;
  }
  if (
    skipKey !== 'salespeople' &&
    filters.salespeople.length > 0 &&
    !filters.salespeople.includes(row.salesperson)
  ) {
    return false;
  }
  if (
    skipKey !== 'provinces' &&
    filters.provinces.length > 0 &&
    !filters.provinces.includes(row.province)
  ) {
    return false;
  }
  if (
    skipKey !== 'channels' &&
    filters.channels.length > 0 &&
    !filters.channels.includes(row.channel)
  ) {
    return false;
  }
  if (
    skipKey !== 'paymentMethods' &&
    filters.paymentMethods.length > 0 &&
    !filters.paymentMethods.includes(row.paymentMethod)
  ) {
    return false;
  }
  if (
    skipKey !== 'products' &&
    filters.products.length > 0 &&
    !filters.products.includes(row.product)
  ) {
    return false;
  }
  return true;
}

function matchesDateRange(
  row: FactSalesRow,
  fromMs: number | null,
  toMs: number | null
): boolean {
  if (fromMs === null && toMs === null) return true;
  if (row.dateMs === null) return false;
  if (fromMs !== null && row.dateMs < fromMs) return false;
  if (toMs !== null && row.dateMs > toMs) return false;
  return true;
}

function safeDiv(num: number, den: number): number | null {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  return num / den;
}

function calcChangePct(current: number | null, prior: number | null): number | null {
  if (current === null || prior === null || prior <= 0) return null;
  return (current - prior) / prior;
}

function summarizeRows(rows: FactSalesRow[]) {
  let sales = 0;
  let grossSales = 0;
  let discountAmount = 0;
  let quantity = 0;
  const orderSet = new Set<string>();

  for (const r of rows) {
    sales += r.salesAmount ?? 0;
    grossSales += r.grossSales ?? 0;
    discountAmount += r.discountAmount ?? 0;
    quantity += r.quantity ?? 0;
    if (r.orderId) orderSet.add(r.orderId);
  }

  const orders = orderSet.size;
  return {
    sales,
    grossSales,
    discountAmount,
    quantity,
    orders,
    aov: safeDiv(sales, orders),
    discountRate: safeDiv(discountAmount, grossSales),
  };
}

function buildTrend(
  rows: FactSalesRow[],
  model: SalesStarModel,
  granularity: TrendGranularity
): TrendPoint[] {
  const buckets = new Map<
    string,
    { label: string; sales: number; quantity: number; orders: Set<string> }
  >();

  for (const r of rows) {
    if (!r.dateKey) continue;
    const dim = model.dateDims[r.dateKey];
    if (!dim) continue;

    let key = dim.monthKey;
    let label = dim.monthLabel;
    if (granularity === 'weekly') {
      key = dim.weekKey;
      label = dim.weekKey;
    } else if (granularity === 'daily') {
      key = dim.dateKey;
      label = formatDateDisplay(dim.dateKey);
    }

    let b = buckets.get(key);
    if (!b) {
      b = { label, sales: 0, quantity: 0, orders: new Set<string>() };
      buckets.set(key, b);
    }
    b.sales += r.salesAmount ?? 0;
    b.quantity += r.quantity ?? 0;
    if (r.orderId) b.orders.add(r.orderId);
  }

  const sortedKeys = Array.from(buckets.keys()).sort();
  let peakKey = '';
  let peakSales = -Infinity;
  for (const k of sortedKeys) {
    const val = buckets.get(k)!.sales;
    if (val > peakSales) {
      peakSales = val;
      peakKey = k;
    }
  }

  return sortedKeys.map((k) => {
    const b = buckets.get(k)!;
    return {
      key: k,
      label: b.label,
      sales: b.sales,
      quantity: b.quantity,
      orders: b.orders.size,
      isPeak: k === peakKey && sortedKeys.length > 0,
    };
  });
}

function shiftYearMs(ms: number, deltaYears: number): number {
  const d = new Date(ms);
  const targetYear = d.getUTCFullYear() + deltaYears;
  const month = d.getUTCMonth();
  const maxDayInMonth = new Date(Date.UTC(targetYear, month + 1, 0)).getUTCDate();
  const day = Math.min(d.getUTCDate(), maxDayInMonth);
  return Date.UTC(targetYear, month, day);
}

function buildFacetOptions(
  allFacts: FactSalesRow[],
  filters: FilterState,
  fromMs: number | null,
  toMs: number | null,
  dimension:
    | 'years'
    | 'stores'
    | 'categories'
    | 'salespeople'
    | 'provinces'
    | 'channels'
    | 'paymentMethods',
  extractor: (r: FactSalesRow) => string
): FacetOption[] {
  const counts = new Map<string, number>();

  for (const r of allFacts) {
    const key = extractor(r);
    if (!key) continue;
    if (!counts.has(key)) counts.set(key, 0);
    if (matchesDateRange(r, fromMs, toMs) && matchesNonDateFilters(r, filters, dimension)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) =>
      dimension === 'years'
        ? b.value.localeCompare(a.value)
        : b.count - a.count || a.value.localeCompare(b.value)
    );
}

export function computeAnalytics(
  model: SalesStarModel,
  filters: FilterState,
  underperformingThresholdPct: number,
  trendGranularity: TrendGranularity
): ComputedAnalytics {
  const win = resolveDateWindow(model, filters);
  const filteredRows: FactSalesRow[] = [];
  const filteredIndices: number[] = [];
  const priorRows: FactSalesRow[] = [];

  // For YoY store comparison: if a date range is active, shift it back 1 year;
  // if All Time, compare latest 12 months? Or if All Time, compare latest calendar month/window vs prior year same window!
  const yoyFromMs =
    win.fromMs !== null
      ? shiftYearMs(win.fromMs, -1)
      : model.maxDateMs !== null
        ? shiftYearMs(model.maxDateMs - 364 * DAY_MS, -1)
        : null;
  const yoyToMs =
    win.toMs !== null
      ? shiftYearMs(win.toMs, -1)
      : model.maxDateMs !== null
        ? shiftYearMs(model.maxDateMs, -1)
        : null;

  // Previous Year (SAMEPERIODLASTYEAR) window for KPIs (supports both date presets & Year slicer)
  let latestYrFromMs: number | null = null;
  let latestYrToMs: number | null = null;
  let pyFromMs: number | null = null;
  let pyToMs: number | null = null;
  const isAllTimePreset = filters.datePreset === 'all';
  const maxDataYear = model.maxDateMs !== null ? new Date(model.maxDateMs).getUTCFullYear() : null;
  const selectedYearNums = filters.years
    .map((y) => Number(y))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => b - a);
  const singleSelectedYear = selectedYearNums.length === 1 ? selectedYearNums[0] : null;
  const multiYearSelected = selectedYearNums.length > 1;

  if (!isAllTimePreset) {
    const effFrom = win.fromMs ?? (model.minDateKey ? dateKeyToMs(model.minDateKey) : null);
    const effTo = win.toMs ?? model.maxDateMs;
    if (effFrom !== null && effTo !== null && effTo >= effFrom) {
      pyFromMs = shiftYearMs(effFrom, -1);
      pyToMs = shiftYearMs(effTo, -1);
    }
  } else if (singleSelectedYear !== null && model.maxDateMs !== null && maxDataYear !== null) {
    // User picked one specific year in Year slicer (e.g. 2025 or 2026)
    const targetEnd =
      singleSelectedYear === maxDataYear
        ? model.maxDateMs
        : Date.UTC(singleSelectedYear, 11, 31);
    latestYrFromMs = Date.UTC(singleSelectedYear, 0, 1);
    latestYrToMs = targetEnd;
    pyFromMs = Date.UTC(singleSelectedYear - 1, 0, 1);
    pyToMs = shiftYearMs(targetEnd, -1);
  } else if (model.maxDateMs !== null && maxDataYear !== null) {
    const compareYear = multiYearSelected ? selectedYearNums[0] : maxDataYear;
    const targetEnd =
      compareYear === maxDataYear ? model.maxDateMs : Date.UTC(compareYear, 11, 31);
    latestYrFromMs = Date.UTC(compareYear, 0, 1);
    latestYrToMs = targetEnd;
    pyFromMs = Date.UTC(compareYear - 1, 0, 1);
    pyToMs = shiftYearMs(targetEnd, -1);
  }

  const hasExplicitPyWindow = pyFromMs !== null && pyToMs !== null;
  const hasLatestYrWindow = latestYrFromMs !== null && latestYrToMs !== null;

  // Exact preceding window of equal length when a bounded date range is active
  const hasExplicitPriorWindow = win.priorFromMs !== null && win.priorToMs !== null;

  const latestYrRows: FactSalesRow[] = [];
  const pyRows: FactSalesRow[] = [];
  const yoyRows: FactSalesRow[] = [];

  for (let i = 0; i < model.facts.length; i++) {
    const r = model.facts[i];
    const matchesAllNonDate = matchesNonDateFilters(r, filters);
    const matchesNonYearNonDate = matchesNonDateFilters(r, filters, 'years');

    if (matchesAllNonDate) {
      if (matchesDateRange(r, win.fromMs, win.toMs)) {
        filteredRows.push(r);
        filteredIndices.push(i);
      }
      if (hasExplicitPriorWindow && matchesDateRange(r, win.priorFromMs, win.priorToMs)) {
        priorRows.push(r);
      }
    }

    if (matchesNonYearNonDate) {
      if (hasLatestYrWindow && matchesDateRange(r, latestYrFromMs, latestYrToMs)) {
        latestYrRows.push(r);
      }
      if (hasExplicitPyWindow && matchesDateRange(r, pyFromMs, pyToMs)) {
        pyRows.push(r);
      }
      if (yoyFromMs !== null && yoyToMs !== null && matchesDateRange(r, yoyFromMs, yoyToMs)) {
        yoyRows.push(r);
      }
    }
  }

  const currentSummary = summarizeRows(filteredRows);
  const hasPriorData = hasExplicitPriorWindow && priorRows.length > 0;
  const priorSummary = hasPriorData ? summarizeRows(priorRows) : null;
  const hasPyData = hasExplicitPyWindow && pyRows.length > 0;
  const pySummary = hasPyData ? summarizeRows(pyRows) : null;
  const latestYrSummary =
    isAllTimePreset && hasLatestYrWindow && latestYrRows.length > 0
      ? summarizeRows(latestYrRows)
      : null;

  const useAllTimeYoy = isAllTimePreset && latestYrSummary !== null && pySummary !== null;
  const kpiCompBase = useAllTimeYoy ? latestYrSummary : currentSummary;
  const kpiCompPrior = pySummary;
  const comparisonLabel =
    isAllTimePreset && singleSelectedYear === null && useAllTimeYoy ? 'Latest yr' : undefined;

  const kpis = {
    totalSales: {
      value: filteredRows.length > 0 ? currentSummary.sales : null,
      priorValue: kpiCompPrior ? kpiCompPrior.sales : null,
      changePct: kpiCompPrior ? calcChangePct(kpiCompBase.sales, kpiCompPrior.sales) : null,
      comparisonLabel,
      previousYearValue: pySummary ? pySummary.sales : null,
      previousYearChangePct: pySummary
        ? calcChangePct(kpiCompBase.sales, pySummary.sales)
        : null,
    },
    totalQuantity: {
      value: filteredRows.length > 0 ? currentSummary.quantity : null,
      priorValue: kpiCompPrior ? kpiCompPrior.quantity : null,
      changePct: kpiCompPrior ? calcChangePct(kpiCompBase.quantity, kpiCompPrior.quantity) : null,
      comparisonLabel,
      previousYearValue: pySummary ? pySummary.quantity : null,
      previousYearChangePct: pySummary
        ? calcChangePct(kpiCompBase.quantity, pySummary.quantity)
        : null,
    },
    orders: {
      value: filteredRows.length > 0 ? currentSummary.orders : null,
      priorValue: kpiCompPrior ? kpiCompPrior.orders : null,
      changePct: kpiCompPrior ? calcChangePct(kpiCompBase.orders, kpiCompPrior.orders) : null,
      comparisonLabel,
      previousYearValue: pySummary ? pySummary.orders : null,
      previousYearChangePct: pySummary
        ? calcChangePct(kpiCompBase.orders, pySummary.orders)
        : null,
    },
    aov: {
      value: filteredRows.length > 0 ? currentSummary.aov : null,
      priorValue: kpiCompPrior ? kpiCompPrior.aov : null,
      changePct: kpiCompPrior ? calcChangePct(kpiCompBase.aov, kpiCompPrior.aov) : null,
      comparisonLabel,
      previousYearValue: pySummary ? pySummary.aov : null,
      previousYearChangePct: pySummary ? calcChangePct(kpiCompBase.aov, pySummary.aov) : null,
    },
    totalDiscounts: {
      value: filteredRows.length > 0 ? currentSummary.discountAmount : null,
      priorValue: kpiCompPrior ? kpiCompPrior.discountAmount : null,
      changePct: kpiCompPrior
        ? calcChangePct(kpiCompBase.discountAmount, kpiCompPrior.discountAmount)
        : null,
      comparisonLabel,
      previousYearValue: pySummary ? pySummary.discountAmount : null,
      previousYearChangePct: pySummary
        ? calcChangePct(kpiCompBase.discountAmount, pySummary.discountAmount)
        : null,
    },
    discountRate: {
      value: filteredRows.length > 0 ? currentSummary.discountRate : null,
      priorValue: priorSummary ? priorSummary.discountRate : null,
      changePctPoints:
        priorSummary &&
        currentSummary.discountRate !== null &&
        priorSummary.discountRate !== null
          ? currentSummary.discountRate - priorSummary.discountRate
          : null,
      previousYearValue: pySummary ? pySummary.discountRate : null,
      previousYearChangePctPoints:
        pySummary &&
        currentSummary.discountRate !== null &&
        pySummary.discountRate !== null
          ? currentSummary.discountRate - pySummary.discountRate
          : null,
    },
  };

  const trend = buildTrend(filteredRows, model, trendGranularity);
  const monthlyTrendAll = buildTrend(filteredRows, model, 'monthly');

  let momGrowthPct: number | null = null;
  if (monthlyTrendAll.length >= 2) {
    const thisMonth = monthlyTrendAll[monthlyTrendAll.length - 1].sales;
    const lastMonth = monthlyTrendAll[monthlyTrendAll.length - 2].sales;
    momGrowthPct = calcChangePct(thisMonth, lastMonth);
  }

  // Categories
  const catMap = new Map<
    string,
    { sales: number; gross: number; discount: number; qty: number; orders: Set<string> }
  >();
  for (const r of filteredRows) {
    let entry = catMap.get(r.category);
    if (!entry) {
      entry = { sales: 0, gross: 0, discount: 0, qty: 0, orders: new Set() };
      catMap.set(r.category, entry);
    }
    entry.sales += r.salesAmount ?? 0;
    entry.gross += r.grossSales ?? 0;
    entry.discount += r.discountAmount ?? 0;
    entry.qty += r.quantity ?? 0;
    if (r.orderId) entry.orders.add(r.orderId);
  }

  const categories: CategoryStat[] = Array.from(catMap.entries())
    .map(([category, v]) => ({
      category,
      sales: v.sales,
      grossSales: v.gross,
      discountAmount: v.discount,
      discountRate: safeDiv(v.discount, v.gross),
      quantity: v.qty,
      orders: v.orders.size,
      sharePct: safeDiv(v.sales, currentSummary.sales),
    }))
    .sort((a, b) => b.sales - a.sales);

  const discountByCategory = [...categories].sort((a, b) => b.discountAmount - a.discountAmount);

  // Store aggregation + Store period momentum + Store YoY + Store x Category heatmap + Store monthly trends
  const storeMap = new Map<
    string,
    {
      province: string;
      country: string;
      sales: number;
      gross: number;
      discount: number;
      qty: number;
      orders: Set<string>;
      rows: FactSalesRow[];
    }
  >();

  for (const r of filteredRows) {
    let entry = storeMap.get(r.store);
    if (!entry) {
      entry = {
        province: r.province,
        country: r.country,
        sales: 0,
        gross: 0,
        discount: 0,
        qty: 0,
        orders: new Set(),
        rows: [],
      };
      storeMap.set(r.store, entry);
    }
    entry.sales += r.salesAmount ?? 0;
    entry.gross += r.grossSales ?? 0;
    entry.discount += r.discountAmount ?? 0;
    entry.qty += r.quantity ?? 0;
    if (r.orderId) entry.orders.add(r.orderId);
    entry.rows.push(r);
  }

  const priorStoreSales = new Map<string, number>();
  for (const r of priorRows) {
    priorStoreSales.set(r.store, (priorStoreSales.get(r.store) ?? 0) + (r.salesAmount ?? 0));
  }

  const yoyStoreSales = new Map<string, number>();
  for (const r of yoyRows) {
    yoyStoreSales.set(r.store, (yoyStoreSales.get(r.store) ?? 0) + (r.salesAmount ?? 0));
  }

  const storeCount = storeMap.size;
  const storeAverageSales = storeCount > 0 ? currentSummary.sales / storeCount : null;
  const thresholdRatio = underperformingThresholdPct / 100;

  const storeMonthlyTrends: Record<string, TrendPoint[]> = {};
  const stores: StorePerformance[] = [];

  for (const [storeName, v] of storeMap.entries()) {
    const storeTrend = buildTrend(v.rows, model, 'monthly');
    storeMonthlyTrends[storeName] = storeTrend;

    let priorSalesVal: number | null = null;
    let changeVsPriorPct: number | null = null;

    if (hasExplicitPriorWindow) {
      const pVal = priorStoreSales.get(storeName) ?? 0;
      if (pVal > 0) {
        priorSalesVal = pVal;
        changeVsPriorPct = calcChangePct(v.sales, pVal);
      }
    } else if (model.maxDateMs !== null) {
      // When All Time is selected, compare equal 30-day rolling windows ending at latest date
      const recent30From = model.maxDateMs - 29 * DAY_MS;
      const prior30From = model.maxDateMs - 59 * DAY_MS;
      const prior30To = model.maxDateMs - 30 * DAY_MS;
      let recent30Sales = 0;
      let prev30Sales = 0;
      for (const r of v.rows) {
        if (r.dateMs === null) continue;
        if (r.dateMs >= recent30From && r.dateMs <= model.maxDateMs) {
          recent30Sales += r.salesAmount ?? 0;
        } else if (r.dateMs >= prior30From && r.dateMs <= prior30To) {
          prev30Sales += r.salesAmount ?? 0;
        }
      }
      if (prev30Sales > 0) {
        priorSalesVal = prev30Sales;
        changeVsPriorPct = calcChangePct(recent30Sales, prev30Sales);
      }
    }

    const yoyPrior = yoyStoreSales.get(storeName) ?? 0;
    const yoyPriorSales = yoyPrior > 0 ? yoyPrior : null;
    // Note: if All Time, compare recent 365 days vs prior 365 days if both exist
    let changeVsYoyPct: number | null = null;
    if (win.fromMs !== null && win.toMs !== null && yoyPriorSales !== null) {
      changeVsYoyPct = calcChangePct(v.sales, yoyPriorSales);
    } else if (win.fromMs === null && model.maxDateMs !== null && yoyPriorSales !== null) {
      const recent365From = model.maxDateMs - 364 * DAY_MS;
      let recent365Sales = 0;
      for (const r of v.rows) {
        if (r.dateMs !== null && r.dateMs >= recent365From) {
          recent365Sales += r.salesAmount ?? 0;
        }
      }
      changeVsYoyPct = calcChangePct(recent365Sales, yoyPriorSales);
    }

    const vsAveragePct =
      storeAverageSales !== null && storeAverageSales > 0
        ? (v.sales - storeAverageSales) / storeAverageSales
        : null;

    const belowAvgFlag = vsAveragePct !== null && vsAveragePct < -thresholdRatio;
    const declinedFlag = changeVsPriorPct !== null && changeVsPriorPct < 0;
    const isUnderperforming = belowAvgFlag || declinedFlag;

    const reasons: string[] = [];
    if (belowAvgFlag && vsAveragePct !== null) {
      reasons.push(`Sales ${Math.abs(vsAveragePct * 100).toFixed(1)}% below the store average`);
    }
    if (declinedFlag && changeVsPriorPct !== null) {
      reasons.push(
        `down ${Math.abs(changeVsPriorPct * 100).toFixed(1)}% on ${
          hasExplicitPriorWindow ? 'last period' : 'prior 30 days'
        }`
      );
    }
    const underperformingReason =
      reasons.length > 0
        ? reasons.join(' and ').replace(/^down/, 'Sales down')
        : 'On track';

    const ordersCount = v.orders.size;

    stores.push({
      store: storeName,
      province: v.province,
      country: v.country,
      sales: v.sales,
      grossSales: v.gross,
      discountAmount: v.discount,
      discountRate: safeDiv(v.discount, v.gross),
      quantity: v.qty,
      orders: ordersCount,
      aov: safeDiv(v.sales, ordersCount),
      sharePct: safeDiv(v.sales, currentSummary.sales),
      priorSales: priorSalesVal,
      changeVsPriorPct,
      yoyPriorSales,
      changeVsYoyPct,
      vsAveragePct,
      isUnderperforming,
      underperformingReason,
      isSmallSample: ordersCount > 0 && ordersCount < 5,
    });
  }

  stores.sort((a, b) => b.sales - a.sales);
  const discountByStore = [...stores].sort((a, b) => b.discountAmount - a.discountAmount);

  // Store x Category Heatmap
  const heatmapMap = new Map<string, { sales: number; orders: Set<string> }>();
  for (const r of filteredRows) {
    const key = `${r.store}|||${r.category}`;
    let cell = heatmapMap.get(key);
    if (!cell) {
      cell = { sales: 0, orders: new Set() };
      heatmapMap.set(key, cell);
    }
    cell.sales += r.salesAmount ?? 0;
    if (r.orderId) cell.orders.add(r.orderId);
  }

  const storeCategoryHeatmap: StoreCategoryHeatmapCell[] = [];
  for (const s of stores) {
    for (const c of categories) {
      const cell = heatmapMap.get(`${s.store}|||${c.category}`);
      const cellOrders = cell ? cell.orders.size : 0;
      storeCategoryHeatmap.push({
        store: s.store,
        category: c.category,
        sales: cell ? cell.sales : 0,
        orders: cellOrders,
        isSmallSample: cellOrders > 0 && cellOrders < 5,
      });
    }
  }

  // Discount buckets: 0%, 5%, 10%, 15%, 20% and above
  const bucketDefs = [
    { bucket: '0%', minRate: 0, maxRate: 0.025 },
    { bucket: '5%', minRate: 0.025, maxRate: 0.075 },
    { bucket: '10%', minRate: 0.075, maxRate: 0.125 },
    { bucket: '15%', minRate: 0.125, maxRate: 0.175 },
    { bucket: '20%+', minRate: 0.175, maxRate: 1.01 },
  ];

  const bucketAcc = bucketDefs.map((b) => ({
    ...b,
    sales: 0,
    gross: 0,
    discount: 0,
    qty: 0,
    orders: new Set<string>(),
  }));

  let discountedSales = 0;
  let fullPriceSales = 0;
  const discountedOrderSet = new Set<string>();
  const fullPriceOrderSet = new Set<string>();
  let discountedQty = 0;
  let fullPriceQty = 0;

  for (const r of filteredRows) {
    const rate = Math.max(0, r.discountRate ?? 0);
    const sAmt = r.salesAmount ?? 0;
    const gAmt = r.grossSales ?? 0;
    const dAmt = r.discountAmount ?? 0;
    const qty = r.quantity ?? 0;

    if (rate > 0.0001 || dAmt > 0.0001) {
      discountedSales += sAmt;
      discountedQty += qty;
      if (r.orderId) discountedOrderSet.add(r.orderId);
    } else {
      fullPriceSales += sAmt;
      fullPriceQty += qty;
      if (r.orderId) fullPriceOrderSet.add(r.orderId);
    }

    let target = bucketAcc[0];
    if (rate >= 0.175) target = bucketAcc[4];
    else if (rate >= 0.125) target = bucketAcc[3];
    else if (rate >= 0.075) target = bucketAcc[2];
    else if (rate >= 0.025) target = bucketAcc[1];
    else target = bucketAcc[0];

    target.sales += sAmt;
    target.gross += gAmt;
    target.discount += dAmt;
    target.qty += qty;
    if (r.orderId) target.orders.add(r.orderId);
  }

  const discountBuckets: DiscountBucketStat[] = bucketAcc.map((b) => {
    const ordersCount = b.orders.size;
    return {
      bucket: b.bucket,
      minRate: b.minRate,
      maxRate: b.maxRate,
      sales: b.sales,
      grossSales: b.gross,
      discountAmount: b.discount,
      quantity: b.qty,
      orders: ordersCount,
      avgUnitsPerOrder: safeDiv(b.qty, ordersCount),
      aov: safeDiv(b.sales, ordersCount),
    };
  });

  // Salespeople
  const spMap = new Map<
    string,
    {
      sales: number;
      gross: number;
      discount: number;
      qty: number;
      orders: Set<string>;
      inStoreSales: number;
      onlineSales: number;
      rows: FactSalesRow[];
    }
  >();

  for (const r of filteredRows) {
    let sp = spMap.get(r.salesperson);
    if (!sp) {
      sp = {
        sales: 0,
        gross: 0,
        discount: 0,
        qty: 0,
        orders: new Set(),
        inStoreSales: 0,
        onlineSales: 0,
        rows: [],
      };
      spMap.set(r.salesperson, sp);
    }
    const amt = r.salesAmount ?? 0;
    sp.sales += amt;
    sp.gross += r.grossSales ?? 0;
    sp.discount += r.discountAmount ?? 0;
    sp.qty += r.quantity ?? 0;
    if (r.orderId) sp.orders.add(r.orderId);
    if (r.channel === 'Online') sp.onlineSales += amt;
    else sp.inStoreSales += amt;
    sp.rows.push(r);
  }

  const salespersonMonthlyTrends: Record<string, TrendPoint[]> = {};
  const salespeopleSorted = Array.from(spMap.entries())
    .map(([salesperson, v]) => {
      salespersonMonthlyTrends[salesperson] = buildTrend(v.rows, model, 'monthly');
      const ordersCount = v.orders.size;
      return {
        rank: 0,
        salesperson,
        sales: v.sales,
        grossSales: v.gross,
        discountAmount: v.discount,
        discountRate: safeDiv(v.discount, v.gross),
        quantity: v.qty,
        orders: ordersCount,
        aov: safeDiv(v.sales, ordersCount),
        sharePct: safeDiv(v.sales, currentSummary.sales),
        inStoreSales: v.inStoreSales,
        onlineSales: v.onlineSales,
        isSmallSample: ordersCount > 0 && ordersCount < 5,
      };
    })
    .sort((a, b) => b.sales - a.sales);

  const salespeople: SalespersonStat[] = salespeopleSorted.map((sp, idx) => ({
    ...sp,
    rank: idx + 1,
  }));

  // Products
  const prodMap = new Map<
    string,
    {
      category: string;
      sales: number;
      gross: number;
      discount: number;
      qty: number;
      orders: Set<string>;
      unitPriceWeightedSum: number;
    }
  >();

  for (const r of filteredRows) {
    let p = prodMap.get(r.product);
    if (!p) {
      p = {
        category: r.category,
        sales: 0,
        gross: 0,
        discount: 0,
        qty: 0,
        orders: new Set(),
        unitPriceWeightedSum: 0,
      };
      prodMap.set(r.product, p);
    }
    const qty = r.quantity ?? 0;
    p.sales += r.salesAmount ?? 0;
    p.gross += r.grossSales ?? 0;
    p.discount += r.discountAmount ?? 0;
    p.qty += qty;
    p.unitPriceWeightedSum += (r.unitPrice ?? 0) * (qty > 0 ? qty : 1);
    if (r.orderId) p.orders.add(r.orderId);
  }

  const allProducts = Array.from(prodMap.entries())
    .map(([product, v]) => ({
      product,
      category: v.category,
      sales: v.sales,
      grossSales: v.gross,
      discountAmount: v.discount,
      discountRate: safeDiv(v.discount, v.gross),
      quantity: v.qty,
      orders: v.orders.size,
      avgUnitPrice: safeDiv(v.unitPriceWeightedSum, v.qty > 0 ? v.qty : v.orders.size || 1),
    }))
    .sort((a, b) => b.sales - a.sales);

  const top10Products = allProducts.slice(0, 10);
  const bottom10Products = [...allProducts].reverse().slice(0, 10);

  // Faceted counts
  const facets = {
    years: buildFacetOptions(
      model.facts,
      filters,
      win.fromMs,
      win.toMs,
      'years',
      (r) => getRowYear(r)
    ),
    stores: buildFacetOptions(model.facts, filters, win.fromMs, win.toMs, 'stores', (r) => r.store),
    categories: buildFacetOptions(
      model.facts,
      filters,
      win.fromMs,
      win.toMs,
      'categories',
      (r) => r.category
    ),
    salespeople: buildFacetOptions(
      model.facts,
      filters,
      win.fromMs,
      win.toMs,
      'salespeople',
      (r) => r.salesperson
    ),
    provinces: buildFacetOptions(
      model.facts,
      filters,
      win.fromMs,
      win.toMs,
      'provinces',
      (r) => r.province
    ),
    channels: buildFacetOptions(
      model.facts,
      filters,
      win.fromMs,
      win.toMs,
      'channels',
      (r) => r.channel
    ),
    paymentMethods: buildFacetOptions(
      model.facts,
      filters,
      win.fromMs,
      win.toMs,
      'paymentMethods',
      (r) => r.paymentMethod
    ),
  };

  // Plain-English insights (5-6 template sentences using calculated metrics only)
  const insights: string[] = [];
  if (filteredRows.length === 0) {
    insights.push('No transactions match the current filter selection.');
  } else {
    if (stores.length > 0) {
      const topStore = stores[0];
      insights.push(
        `${topStore.store} generated ${formatPercent(topStore.sharePct)} of sales (${formatCAD(
          topStore.sales
        )}), the highest of ${stores.length} active store${stores.length > 1 ? 's' : ''}.`
      );
    }

    const underperformingList = stores.filter((s) => s.isUnderperforming);
    if (underperformingList.length > 0) {
      const lowest = [...underperformingList].sort((a, b) => a.sales - b.sales)[0];
      insights.push(
        `${underperformingList.length} store${
          underperformingList.length > 1 ? 's are' : ' is'
        } flagged as underperforming against the ${underperformingThresholdPct}% rule, led by ${
          lowest.store
        } (${lowest.underperformingReason}).`
      );
    } else if (stores.length > 1) {
      insights.push(
        `All ${stores.length} stores are within ${underperformingThresholdPct}% of the store average with no period-over-period decline.`
      );
    }

    if (categories.length > 0) {
      const topCat = categories[0];
      insights.push(
        `${topCat.category} is the leading category at ${formatCAD(topCat.sales)} (${formatPercent(
          topCat.sharePct
        )} of net sales across ${topCat.orders} orders).`
      );
    }

    const discRateStr = formatPercent(currentSummary.discountRate);
    insights.push(
      `Discounts reduced gross revenue by ${formatCAD(
        currentSummary.discountAmount
      )} (${discRateStr} overall discount rate), with discounted orders representing ${formatPercent(
        safeDiv(discountedSales, currentSummary.sales)
      )} of net sales.`
    );

    if (salespeople.length > 0) {
      const topRep = salespeople[0];
      insights.push(
        `${topRep.salesperson} leads all ${salespeople.length} salespeople with ${formatCAD(
          topRep.sales
        )} across ${topRep.orders} orders (${formatCAD(topRep.aov)} AOV).`
      );
    }

    if (monthlyTrendAll.length >= 2) {
      const latestM = monthlyTrendAll[monthlyTrendAll.length - 1];
      const prevM = monthlyTrendAll[monthlyTrendAll.length - 2];
      insights.push(
        `Latest month (${latestM.label}) recorded ${formatCAD(latestM.sales)}, a ${formatPercent(
          momGrowthPct,
          { signed: true }
        )} change compared with ${prevM.label} (${formatCAD(prevM.sales)}).`
      );
    }
  }

  // Case Study Question Cards
  const underperfStores = stores.filter((s) => s.isUnderperforming);
  const underperformingStoresSummary =
    stores.length === 0
      ? 'No store transactions match the active filters.'
      : underperfStores.length === 0
        ? `All ${stores.length} stores meet the ${underperformingThresholdPct}% benchmark and period momentum target.`
        : `${underperfStores.length} of ${stores.length} stores flagged (${underperfStores
            .map((s) => s.store)
            .slice(0, 3)
            .join(', ')}${underperfStores.length > 3 ? '…' : ''}).`;

  const topDiscCat = discountByCategory[0];
  const discountImpactSummary =
    filteredRows.length === 0
      ? 'No discount data matches the active filters.'
      : `${formatCAD(currentSummary.discountAmount)} given away (${formatPercent(
          currentSummary.discountRate
        )} rate); ${topDiscCat ? `${topDiscCat.category} leads in discount dollars.` : ''}`;

  const topSp = salespeople[0];
  const topSalespeopleSummary =
    salespeople.length === 0
      ? 'No salesperson records match the active filters.'
      : `${topSp.salesperson} ranks #1 with ${formatCAD(topSp.sales)} (${formatPercent(
          topSp.sharePct
        )} share across ${topSp.orders} orders).`;

  return {
    matchingCount: filteredRows.length,
    activeDateWindow: {
      fromKey: win.fromKey,
      toKey: win.toKey,
      priorFromKey: win.priorFromKey,
      priorToKey: win.priorToKey,
      hasPriorWindow: hasPriorData,
    },
    kpis,
    momGrowthPct,
    trend,
    categories,
    stores,
    storeAverageSales,
    storeCategoryHeatmap,
    storeMonthlyTrends,
    discountBuckets,
    discountByCategory,
    discountByStore,
    discountedVsFullPrice: {
      discountedSales,
      fullPriceSales,
      discountedOrders: discountedOrderSet.size,
      fullPriceOrders: fullPriceOrderSet.size,
      discountedAvgUnitsPerOrder: safeDiv(discountedQty, discountedOrderSet.size),
      fullPriceAvgUnitsPerOrder: safeDiv(fullPriceQty, fullPriceOrderSet.size),
    },
    salespeople,
    salespersonMonthlyTrends,
    top10Products,
    bottom10Products,
    allProducts,
    insights: insights.slice(0, 6),
    questionCards: {
      underperformingStores: underperformingStoresSummary,
      discountImpact: discountImpactSummary,
      topSalespeople: topSalespeopleSummary,
    },
    facets,
    filteredIndices,
  };
}
