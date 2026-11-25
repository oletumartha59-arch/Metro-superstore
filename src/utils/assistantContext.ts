import { ComputedAnalytics, FactSalesRow, SalesStarModel } from '../types/sales';

function round2(n: number | null): number | null {
  if (n === null || !Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function summarizeByDimension(
  rows: FactSalesRow[],
  keyFn: (r: FactSalesRow) => string
) {
  const map = new Map<
    string,
    { sales: number; gross: number; discount: number; qty: number; orders: Set<string> }
  >();

  for (const r of rows) {
    const k = keyFn(r);
    if (!k) continue;
    let entry = map.get(k);
    if (!entry) {
      entry = { sales: 0, gross: 0, discount: 0, qty: 0, orders: new Set() };
      map.set(k, entry);
    }
    entry.sales += r.salesAmount ?? 0;
    entry.gross += r.grossSales ?? 0;
    entry.discount += r.discountAmount ?? 0;
    entry.qty += r.quantity ?? 0;
    if (r.orderId) entry.orders.add(r.orderId);
  }

  return Array.from(map.entries())
    .map(([key, v]) => {
      const orders = v.orders.size;
      return {
        name: key,
        salesCAD: round2(v.sales),
        grossSalesCAD: round2(v.gross),
        discountCAD: round2(v.discount),
        discountRatePct: v.gross > 0 ? round2((v.discount / v.gross) * 100) : null,
        orders,
        quantity: v.qty,
        aovCAD: orders > 0 ? round2(v.sales / orders) : null,
      };
    })
    .sort((a, b) => (b.salesCAD ?? 0) - (a.salesCAD ?? 0));
}

function findMatchingTransactions(facts: FactSalesRow[], question: string) {
  const idMatches = question.match(/\b(?:MS|ORD)-[A-Za-z0-9-]+\b/gi) ?? [];
  const dateMatches = question.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [];

  const tokens = question
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((t) => t.length >= 4);

  const results: FactSalesRow[] = [];
  const seen = new Set<number>();

  // First pass: exact Transaction ID / Order ID / Date matches
  if (idMatches.length > 0 || dateMatches.length > 0) {
    const idSet = new Set(idMatches.map((s) => s.toUpperCase()));
    const dateSet = new Set(dateMatches);
    for (const r of facts) {
      if (
        idSet.has(r.transactionId.toUpperCase()) ||
        idSet.has(r.orderId.toUpperCase()) ||
        dateSet.has(r.dateKey)
      ) {
        if (!seen.has(r.rowIndex)) {
          seen.add(r.rowIndex);
          results.push(r);
          if (results.length >= 20) break;
        }
      }
    }
  }

  // Second pass: if question references a specific product keyword, pull top matching sample rows
  if (results.length < 10 && tokens.length > 0) {
    for (const r of facts) {
      const hay = `${r.product} ${r.store} ${r.salesperson} ${r.category}`.toLowerCase();
      if (tokens.some((tok) => r.product.toLowerCase().includes(tok) && hay.length > 0)) {
        if (!seen.has(r.rowIndex)) {
          seen.add(r.rowIndex);
          results.push(r);
          if (results.length >= 15) break;
        }
      }
    }
  }

  return results.map((r) => ({
    rowIndex: r.rowIndex,
    transactionId: r.transactionId,
    orderId: r.orderId,
    date: r.dateKey,
    product: r.product,
    category: r.category,
    quantity: r.quantity,
    unitPriceCAD: r.unitPrice,
    discountRate: r.discountRate,
    grossSalesCAD: r.grossSales,
    discountAmountCAD: r.discountAmount,
    salesAmountCAD: r.salesAmount,
    store: r.store,
    province: r.province,
    channel: r.channel,
    paymentMethod: r.paymentMethod,
    salesperson: r.salesperson,
    isVerified: r.isVerified,
    validationDetails: r.validationDetails,
  }));
}

export function buildAssistantDatasetContext(
  model: SalesStarModel,
  analytics: ComputedAnalytics,
  filterSummary: string,
  question: string
) {
  const activeRows = analytics.filteredIndices.map((idx) => model.facts[idx]);

  const activeYearly = summarizeByDimension(activeRows, (r) =>
    r.dateKey ? r.dateKey.slice(0, 4) : ''
  ).sort((a, b) => a.name.localeCompare(b.name));

  const fullDatasetYearly = summarizeByDimension(model.facts, (r) =>
    r.dateKey ? r.dateKey.slice(0, 4) : ''
  ).sort((a, b) => a.name.localeCompare(b.name));

  const channels = summarizeByDimension(activeRows, (r) => r.channel);
  const paymentMethods = summarizeByDimension(activeRows, (r) => r.paymentMethod);
  const provinces = summarizeByDimension(activeRows, (r) => r.province);

  const flaggedSample = model.facts
    .filter((r) => !r.isVerified)
    .slice(0, 15)
    .map((r) => ({
      rowIndex: r.rowIndex,
      transactionId: r.transactionId,
      date: r.dateKey,
      flags: r.validationFlags,
      details: r.validationDetails,
    }));

  return {
    datasetOverview: {
      sheetName: model.sheetName,
      sourceType: model.sourceType,
      totalTransactions: model.totalCount,
      verifiedTransactions: model.verifiedCount,
      flaggedTransactions: model.flaggedCount,
      flagSummary: model.flagSummary,
      dateSpan: {
        earliestDate: model.minDateKey,
        latestDateInData: model.maxDateKey,
      },
    },
    activeFilterContext: {
      summary: filterSummary,
      matchingTransactions: analytics.matchingCount,
      activeDateWindow: analytics.activeDateWindow,
    },
    kpis: {
      totalSalesCAD: round2(analytics.kpis.totalSales.value),
      totalSalesVsPYCAD: round2(analytics.kpis.totalSales.previousYearValue),
      totalSalesVsPYChangePct:
        analytics.kpis.totalSales.previousYearChangePct !== null
          ? round2(analytics.kpis.totalSales.previousYearChangePct * 100)
          : null,
      totalQuantity: analytics.kpis.totalQuantity.value,
      totalQuantityVsPY: analytics.kpis.totalQuantity.previousYearValue,
      totalQuantityVsPYChangePct:
        analytics.kpis.totalQuantity.previousYearChangePct !== null
          ? round2(analytics.kpis.totalQuantity.previousYearChangePct * 100)
          : null,
      orders: analytics.kpis.orders.value,
      ordersVsPY: analytics.kpis.orders.previousYearValue,
      ordersVsPYChangePct:
        analytics.kpis.orders.previousYearChangePct !== null
          ? round2(analytics.kpis.orders.previousYearChangePct * 100)
          : null,
      aovCAD: round2(analytics.kpis.aov.value),
      aovVsPYCAD: round2(analytics.kpis.aov.previousYearValue),
      aovVsPYChangePct:
        analytics.kpis.aov.previousYearChangePct !== null
          ? round2(analytics.kpis.aov.previousYearChangePct * 100)
          : null,
      totalDiscountsCAD: round2(analytics.kpis.totalDiscounts.value),
      totalDiscountsVsPYCAD: round2(analytics.kpis.totalDiscounts.previousYearValue),
      discountRatePct:
        analytics.kpis.discountRate.value !== null
          ? round2(analytics.kpis.discountRate.value * 100)
          : null,
      momGrowthPct:
        analytics.momGrowthPct !== null ? round2(analytics.momGrowthPct * 100) : null,
    },
    yearlyBreakdownFiltered: activeYearly,
    yearlyBreakdownFullDataset: fullDatasetYearly,
    stores: analytics.stores.map((s) => ({
      store: s.store,
      province: s.province,
      salesCAD: round2(s.sales),
      sharePct: s.sharePct !== null ? round2(s.sharePct * 100) : null,
      orders: s.orders,
      quantity: s.quantity,
      aovCAD: round2(s.aov),
      discountAmountCAD: round2(s.discountAmount),
      discountRatePct: s.discountRate !== null ? round2(s.discountRate * 100) : null,
      vsAveragePct: s.vsAveragePct !== null ? round2(s.vsAveragePct * 100) : null,
      changeVsPrior30DaysOrPeriodPct:
        s.changeVsPriorPct !== null ? round2(s.changeVsPriorPct * 100) : null,
      changeVsLastYearPct: s.changeVsYoyPct !== null ? round2(s.changeVsYoyPct * 100) : null,
      isUnderperforming: s.isUnderperforming,
      statusReason: s.underperformingReason,
    })),
    categories: analytics.categories.map((c) => ({
      category: c.category,
      salesCAD: round2(c.sales),
      sharePct: c.sharePct !== null ? round2(c.sharePct * 100) : null,
      orders: c.orders,
      quantity: c.quantity,
      discountAmountCAD: round2(c.discountAmount),
      discountRatePct: c.discountRate !== null ? round2(c.discountRate * 100) : null,
    })),
    provinces,
    channels,
    paymentMethods,
    discountAnalysis: {
      discountedVsFullPrice: analytics.discountedVsFullPrice,
      buckets: analytics.discountBuckets.map((b) => ({
        bucket: b.bucket,
        salesCAD: round2(b.sales),
        discountAmountCAD: round2(b.discountAmount),
        orders: b.orders,
        quantity: b.quantity,
        avgUnitsPerOrder: round2(b.avgUnitsPerOrder),
        aovCAD: round2(b.aov),
      })),
    },
    salespeople: analytics.salespeople.map((sp) => ({
      rank: sp.rank,
      salesperson: sp.salesperson,
      salesCAD: round2(sp.sales),
      sharePct: sp.sharePct !== null ? round2(sp.sharePct * 100) : null,
      orders: sp.orders,
      quantity: sp.quantity,
      aovCAD: round2(sp.aov),
      discountRatePct: sp.discountRate !== null ? round2(sp.discountRate * 100) : null,
      inStoreSalesCAD: round2(sp.inStoreSales),
      onlineSalesCAD: round2(sp.onlineSales),
    })),
    productsSummary: {
      totalDistinctProducts: analytics.allProducts.length,
      allProducts: analytics.allProducts.slice(0, 60).map((p) => ({
        product: p.product,
        category: p.category,
        salesCAD: round2(p.sales),
        quantity: p.quantity,
        orders: p.orders,
        avgUnitPriceCAD: round2(p.avgUnitPrice),
        discountRatePct: p.discountRate !== null ? round2(p.discountRate * 100) : null,
      })),
      bottom10Products: analytics.bottom10Products.map((p) => ({
        product: p.product,
        category: p.category,
        salesCAD: round2(p.sales),
        quantity: p.quantity,
        orders: p.orders,
        discountRatePct: p.discountRate !== null ? round2(p.discountRate * 100) : null,
      })),
    },
    monthlyTrend: analytics.trend.slice(-36).map((t) => ({
      period: t.label,
      salesCAD: round2(t.sales),
      quantity: t.quantity,
      orders: t.orders,
      isPeak: t.isPeak,
    })),
    matchedTransactionRows: findMatchingTransactions(model.facts, question),
    flaggedRowsSample: flaggedSample,
  };
}
