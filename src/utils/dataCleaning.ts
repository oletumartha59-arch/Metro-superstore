import {
  COLUMN_ALIASES,
  CanonicalColumn,
  DateDim,
  FactSalesRow,
  LoadError,
  ProductDim,
  REQUIRED_COLUMNS,
  RawSheetResponse,
  SalesStarModel,
  SalespersonDim,
  StoreDim,
  ValidationFlagType,
} from '../types/sales';
import { formatMonthLabel, standardiseCapitalisation } from './formatters';

function normalizeHeader(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function parseNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  const str = String(val).trim();
  if (!str) return null;
  const cleaned = str.replace(/[$,\s]/g, '').replace(/CAD/gi, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function parseDiscountRate(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  const str = String(val).trim();
  if (!str) return null;
  if (str.endsWith('%')) {
    const num = Number(str.slice(0, -1).trim());
    return Number.isFinite(num) ? num / 100 : null;
  }
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function parseFlexibleDate(val: unknown): { dateKey: string; dateMs: number } | null {
  if (val === null || val === undefined) return null;

  // Excel serial number (e.g., 45976)
  if (typeof val === 'number' && Number.isFinite(val) && val > 1000 && val < 200000) {
    const utcDays = Math.floor(val - 25569);
    const ms = utcDays * 86_400_000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) {
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      const day = d.getUTCDate();
      return {
        dateKey: `${y}-${pad2(m)}-${pad2(day)}`,
        dateMs: Date.UTC(y, m - 1, day),
      };
    }
  }

  const raw = String(val).trim();
  if (!raw) return null;

  // Numeric string Excel serial
  if (/^\d{4,6}(\.\d+)?$/.test(raw)) {
    const serial = Number(raw);
    if (serial > 1000 && serial < 200000) {
      return parseFlexibleDate(serial);
    }
  }

  // yyyy-mm-dd or yyyy/mm/dd or ISO timestamp starting with yyyy-mm-dd
  const isoMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (m >= 1 && m <= 12 && day >= 1 && day <= 31) {
      const ms = Date.UTC(y, m - 1, day);
      const check = new Date(ms);
      if (
        check.getUTCFullYear() === y &&
        check.getUTCMonth() === m - 1 &&
        check.getUTCDate() === day
      ) {
        return {
          dateKey: `${y}-${pad2(m)}-${pad2(day)}`,
          dateMs: ms,
        };
      }
    }
    return null;
  }

  // dd/mm/yyyy or dd-mm-yyyy
  const dmyMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const m = Number(dmyMatch[2]);
    const y = Number(dmyMatch[3]);
    if (m >= 1 && m <= 12 && day >= 1 && day <= 31) {
      const ms = Date.UTC(y, m - 1, day);
      const check = new Date(ms);
      if (
        check.getUTCFullYear() === y &&
        check.getUTCMonth() === m - 1 &&
        check.getUTCDate() === day
      ) {
        return {
          dateKey: `${y}-${pad2(m)}-${pad2(day)}`,
          dateMs: ms,
        };
      }
    }
    return null;
  }

  // Fallback standard Date parse for e.g. "15 Nov 2026" or GMT strings
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear();
    const m = parsed.getUTCMonth() + 1;
    const day = parsed.getUTCDate();
    return {
      dateKey: `${y}-${pad2(m)}-${pad2(day)}`,
      dateMs: Date.UTC(y, m - 1, day),
    };
  }

  return null;
}

function getIsoWeekKey(dateMs: number): string {
  const d = new Date(dateMs);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604_800_000);
  return `${new Date(firstThursday).getUTCFullYear()}-W${pad2(weekNum)}`;
}

export function cleanAndValidateSheet(
  payload: RawSheetResponse,
  sourceType: 'live' | 'csv' | 'sample'
): { model?: SalesStarModel; error?: LoadError } {
  if (!payload || typeof payload !== 'object') {
    return {
      error: {
        type: 'network_error',
        title: 'Invalid response format',
        message: 'The endpoint did not return a valid JSON object.',
      },
    };
  }

  if (payload.ok === false) {
    const msg = payload.error || 'The Apps Script web app reported an error.';
    const isPerm = /perm|auth|access|denied|unauthorized/i.test(msg);
    return {
      error: {
        type: isPerm ? 'no_permission' : 'network_error',
        title: isPerm ? 'Permission denied' : 'Apps Script returned an error',
        message: msg,
      },
    };
  }

  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  if (rows.length === 0) {
    return {
      error: {
        type: 'empty_sheet',
        title: 'Empty sheet',
        message:
          'The sheet returned 0 transaction rows. Ensure row 1 contains headers and rows 2+ contain transaction records.',
      },
    };
  }

  // Collect headers from payload.headers or first row keys
  const rawHeaderList =
    Array.isArray(payload.headers) && payload.headers.length > 0
      ? payload.headers.map(String)
      : Object.keys(rows[0]);

  const headerLookup = new Map<string, string>();
  for (const h of rawHeaderList) {
    headerLookup.set(normalizeHeader(h), h);
  }
  // Also scan first row keys in case payload.headers omitted something
  for (const k of Object.keys(rows[0])) {
    const norm = normalizeHeader(k);
    if (!headerLookup.has(norm)) {
      headerLookup.set(norm, k);
    }
  }

  const missingColumns: string[] = [];
  const colKeyMap: Partial<Record<CanonicalColumn, string>> = {};

  for (const reqCol of REQUIRED_COLUMNS) {
    const aliases = COLUMN_ALIASES[reqCol];
    let matched: string | undefined;
    for (const alias of aliases) {
      const candidate = headerLookup.get(normalizeHeader(alias));
      if (candidate) {
        matched = candidate;
        break;
      }
    }
    if (!matched) {
      if (reqCol !== 'Country') {
        missingColumns.push(reqCol);
      }
    } else {
      colKeyMap[reqCol] = matched;
    }
  }

  if (missingColumns.length > 0) {
    return {
      error: {
        type: 'missing_columns',
        title: `Missing ${missingColumns.length} required column${missingColumns.length > 1 ? 's' : ''}`,
        message:
          'Row 1 of the Metro Superstore sheet is missing required columns. Check spelling and try again.',
        missingColumns,
      },
    };
  }

  const hasCountryCol = Boolean(colKeyMap['Country']);
  const facts: FactSalesRow[] = [];
  const dateDims: Record<string, DateDim> = {};
  const productDims: Record<string, ProductDim> = {};
  const storeDims: Record<string, StoreDim> = {};
  const salespersonDims: Record<string, SalespersonDim> = {};

  const txIdCounts = new Map<string, number>();
  const now = new Date();
  const realTodayEndMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const flagSummary: Record<ValidationFlagType, number> = {
    math_mismatch: 0,
    duplicate_tx_id: 0,
    missing_value: 0,
    invalid_quantity: 0,
    future_date: 0,
    invalid_date: 0,
  };

  let minDateKey: string | null = null;
  let maxDateKey: string | null = null;
  let maxDateMs: number | null = null;

  // First pass: clean, parse, count Transaction ID occurrences
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const getCell = (col: CanonicalColumn) => {
      const key = colKeyMap[col];
      return key ? r[key] : undefined;
    };

    const transactionId = String(getCell('Transaction ID') ?? '').trim();
    const orderId = String(getCell('Order ID') ?? '').trim();
    const rawDate = getCell('Date (yyyy-mm-dd)');
    const parsedDate = parseFlexibleDate(rawDate);

    const product = String(getCell('Product') ?? '').trim().replace(/\s+/g, ' ');
    const category = standardiseCapitalisation(String(getCell('Category') ?? ''));
    const store = standardiseCapitalisation(String(getCell('Store (a city)') ?? ''));
    const province = standardiseCapitalisation(String(getCell('Province') ?? ''), {
      preserveProvinceCode: true,
    });
    const rawCountry = hasCountryCol
      ? standardiseCapitalisation(String(getCell('Country') ?? ''))
      : 'Canada';
    const country = rawCountry;
    const channel = standardiseCapitalisation(
      String(getCell('Sales Channel (In-Store or Online)') ?? ''),
      { channelMode: true }
    );
    const paymentMethod = standardiseCapitalisation(String(getCell('Payment Method') ?? ''));
    const salesperson = standardiseCapitalisation(String(getCell('Salesperson') ?? ''));

    const quantity = parseNumber(getCell('Quantity'));
    const unitPrice = parseNumber(getCell('Unit Price (CAD)'));
    const discountRate = parseDiscountRate(
      getCell('Discount Rate (0 to 1, so 0.1 means 10%)')
    );
    const grossSales = parseNumber(getCell('Gross Sales'));
    const discountAmount = parseNumber(getCell('Discount Amount'));
    const salesAmount = parseNumber(getCell('Sales Amount (net of discount)'));

    if (transactionId) {
      txIdCounts.set(transactionId, (txIdCounts.get(transactionId) ?? 0) + 1);
    }

    const flags: ValidationFlagType[] = [];
    const details: string[] = [];

    // Missing required values check
    const missingFields: string[] = [];
    if (!transactionId) missingFields.push('Transaction ID');
    if (!orderId) missingFields.push('Order ID');
    if (!product) missingFields.push('Product');
    if (!category) missingFields.push('Category');
    if (!store) missingFields.push('Store');
    if (!province) missingFields.push('Province');
    if (hasCountryCol && !country) missingFields.push('Country');
    if (!channel) missingFields.push('Sales Channel');
    if (!paymentMethod) missingFields.push('Payment Method');
    if (!salesperson) missingFields.push('Salesperson');
    if (quantity === null) missingFields.push('Quantity');
    if (unitPrice === null) missingFields.push('Unit Price');
    if (discountRate === null) missingFields.push('Discount Rate');
    if (grossSales === null) missingFields.push('Gross Sales');
    if (discountAmount === null) missingFields.push('Discount Amount');
    if (salesAmount === null) missingFields.push('Sales Amount');

    if (missingFields.length > 0) {
      flags.push('missing_value');
      details.push(`Missing: ${missingFields.join(', ')}`);
    }

    if (!parsedDate) {
      flags.push('invalid_date');
      details.push(`Unparseable date: "${String(rawDate ?? '')}"`);
    } else if (parsedDate.dateMs > realTodayEndMs) {
      flags.push('future_date');
      details.push(`Future date (${parsedDate.dateKey})`);
    }

    if (quantity !== null && quantity <= 0) {
      flags.push('invalid_quantity');
      details.push(`Quantity is ${quantity} (expected > 0)`);
    }

    // Arithmetic checks within 0.02
    if (
      quantity !== null &&
      unitPrice !== null &&
      grossSales !== null &&
      discountRate !== null &&
      discountAmount !== null &&
      salesAmount !== null
    ) {
      const expectedGross = quantity * unitPrice;
      const expectedDiscount = grossSales * discountRate;
      const expectedSales = grossSales - discountAmount;

      const grossDiff = Math.abs(grossSales - expectedGross);
      const discDiff = Math.abs(discountAmount - expectedDiscount);
      const salesDiff = Math.abs(salesAmount - expectedSales);

      if (grossDiff > 0.02 || discDiff > 0.02 || salesDiff > 0.02) {
        flags.push('math_mismatch');
        const parts: string[] = [];
        if (grossDiff > 0.02) {
          parts.push(`Gross ${grossSales.toFixed(2)} != ${expectedGross.toFixed(2)}`);
        }
        if (discDiff > 0.02) {
          parts.push(`Discount ${discountAmount.toFixed(2)} != ${expectedDiscount.toFixed(2)}`);
        }
        if (salesDiff > 0.02) {
          parts.push(`Sales ${salesAmount.toFixed(2)} != ${expectedSales.toFixed(2)}`);
        }
        details.push(`Arithmetic mismatch: ${parts.join('; ')}`);
      }
    }

    const dateKey = parsedDate?.dateKey ?? '';
    const dateMs = parsedDate?.dateMs ?? null;

    if (dateKey && dateMs !== null) {
      if (!minDateKey || dateKey < minDateKey) minDateKey = dateKey;
      if (!maxDateKey || dateKey > maxDateKey) {
        maxDateKey = dateKey;
        maxDateMs = dateMs;
      }

      if (!dateDims[dateKey]) {
        const d = new Date(dateMs);
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth() + 1;
        const quarterNum = Math.floor((month - 1) / 3) + 1;
        const monthKey = `${year}-${pad2(month)}`;
        dateDims[dateKey] = {
          dateKey,
          dateMs,
          year,
          quarter: `${year}-Q${quarterNum}`,
          monthKey,
          monthLabel: formatMonthLabel(monthKey),
          weekKey: getIsoWeekKey(dateMs),
          day: d.getUTCDate(),
        };
      }
    }

    if (product) {
      const pid = `${product}__${category}`;
      if (!productDims[pid]) {
        productDims[pid] = { id: pid, product, category: category || 'Uncategorized' };
      }
    }

    if (store) {
      if (!storeDims[store]) {
        storeDims[store] = {
          id: store,
          store,
          province: province || 'Unknown',
          country: country || 'Canada',
        };
      }
    }

    if (salesperson) {
      if (!salespersonDims[salesperson]) {
        salespersonDims[salesperson] = { id: salesperson, salesperson };
      }
    }

    facts.push({
      rowIndex: i + 2, // Spreadsheet 1-based row number (Row 1 = headers)
      transactionId,
      orderId,
      dateKey,
      dateMs,
      product: product || '(Missing)',
      category: category || '(Missing)',
      store: store || '(Missing)',
      province: province || '(Missing)',
      country: country || '(Missing)',
      channel: channel || '(Missing)',
      paymentMethod: paymentMethod || '(Missing)',
      salesperson: salesperson || '(Missing)',
      quantity,
      unitPrice,
      discountRate,
      grossSales,
      discountAmount,
      salesAmount,
      validationFlags: flags,
      validationDetails: details,
      isVerified: flags.length === 0,
    });
  }

  // Second pass: apply duplicate Transaction ID flags & compute counts
  let verifiedCount = 0;
  let flaggedCount = 0;

  for (const row of facts) {
    if (row.transactionId && (txIdCounts.get(row.transactionId) ?? 0) > 1) {
      row.validationFlags.push('duplicate_tx_id');
      row.validationDetails.push(
        `Duplicate Transaction ID "${row.transactionId}" (${txIdCounts.get(row.transactionId)} occurrences)`
      );
      row.isVerified = false;
    }

    if (row.isVerified) {
      verifiedCount++;
    } else {
      flaggedCount++;
      for (const f of row.validationFlags) {
        flagSummary[f]++;
      }
    }
  }

  return {
    model: {
      sourceType,
      sheetName: payload.sheet || 'Metro Superstore',
      updatedAt: payload.updatedAt || new Date().toISOString(),
      loadedAt: new Date().toISOString(),
      facts,
      dateDims,
      productDims,
      storeDims,
      salespersonDims,
      verifiedCount,
      totalCount: facts.length,
      flaggedCount,
      flagSummary,
      minDateKey,
      maxDateKey,
      maxDateMs,
    },
  };
}
