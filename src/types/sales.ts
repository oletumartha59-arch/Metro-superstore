export type PageId =
  | 'overview'
  | 'stores'
  | 'discounts'
  | 'salespeople'
  | 'products'
  | 'transactions'
  | 'assistant';

export type DatePreset =
  | 'all'
  | 'this_year'
  | 'last_90'
  | 'last_30'
  | 'this_month'
  | 'custom';

export type TrendGranularity = 'monthly' | 'weekly' | 'daily';

export type ValidationFlagType =
  | 'math_mismatch'
  | 'duplicate_tx_id'
  | 'missing_value'
  | 'invalid_quantity'
  | 'future_date'
  | 'invalid_date';

export const REQUIRED_COLUMNS = [
  'Transaction ID',
  'Date (yyyy-mm-dd)',
  'Product',
  'Category',
  'Quantity',
  'Unit Price (CAD)',
  'Discount Rate (0 to 1, so 0.1 means 10%)',
  'Gross Sales',
  'Discount Amount',
  'Sales Amount (net of discount)',
  'Store (a city)',
  'Province',
  'Country',
  'Sales Channel (In-Store or Online)',
  'Payment Method',
  'Salesperson',
  'Order ID',
] as const;

export type CanonicalColumn = (typeof REQUIRED_COLUMNS)[number];

export const COLUMN_ALIASES: Record<CanonicalColumn, readonly string[]> = {
  'Transaction ID': ['Transaction ID', 'Tx ID'],
  'Date (yyyy-mm-dd)': ['Date (yyyy-mm-dd)', 'Date'],
  Product: ['Product', 'Item', 'Product Name'],
  Category: ['Category'],
  Quantity: ['Quantity', 'Qty'],
  'Unit Price (CAD)': ['Unit Price (CAD)', 'Unit Price'],
  'Discount Rate (0 to 1, so 0.1 means 10%)': [
    'Discount Rate (0 to 1, so 0.1 means 10%)',
    'Discount Rate',
  ],
  'Gross Sales': ['Gross Sales'],
  'Discount Amount': ['Discount Amount'],
  'Sales Amount (net of discount)': ['Sales Amount (net of discount)', 'Sales Amount'],
  'Store (a city)': ['Store (a city)', 'Store'],
  Province: ['Province'],
  Country: ['Country'],
  'Sales Channel (In-Store or Online)': ['Sales Channel (In-Store or Online)', 'Sales Channel'],
  'Payment Method': ['Payment Method'],
  Salesperson: ['Salesperson'],
  'Order ID': ['Order ID'],
};

export interface RawSheetResponse {
  ok: boolean;
  sheet?: string;
  updatedAt?: string;
  rowCount?: number;
  headers?: string[];
  rows?: Record<string, unknown>[];
  error?: string;
}

export interface DateDim {
  dateKey: string; // YYYY-MM-DD
  dateMs: number; // UTC midnight ms
  year: number;
  quarter: string; // YYYY-Q1
  monthKey: string; // YYYY-MM
  monthLabel: string; // Nov 2026
  weekKey: string; // YYYY-Www
  day: number;
}

export interface ProductDim {
  id: string;
  product: string;
  category: string;
}

export interface StoreDim {
  id: string;
  store: string;
  province: string;
  country: string;
}

export interface SalespersonDim {
  id: string;
  salesperson: string;
}

export interface FactSalesRow {
  rowIndex: number;
  transactionId: string;
  orderId: string;
  dateKey: string;
  dateMs: number | null;
  product: string;
  category: string;
  store: string;
  province: string;
  country: string;
  channel: string;
  paymentMethod: string;
  salesperson: string;
  quantity: number | null;
  unitPrice: number | null;
  discountRate: number | null;
  grossSales: number | null;
  discountAmount: number | null;
  salesAmount: number | null;
  validationFlags: ValidationFlagType[];
  validationDetails: string[];
  isVerified: boolean;
}

export interface SalesStarModel {
  sourceType: 'live' | 'csv' | 'sample';
  sheetName: string;
  updatedAt: string;
  loadedAt: string;
  facts: FactSalesRow[];
  dateDims: Record<string, DateDim>;
  productDims: Record<string, ProductDim>;
  storeDims: Record<string, StoreDim>;
  salespersonDims: Record<string, SalespersonDim>;
  verifiedCount: number;
  totalCount: number;
  flaggedCount: number;
  flagSummary: Record<ValidationFlagType, number>;
  minDateKey: string | null;
  maxDateKey: string | null; // "Today" in data
  maxDateMs: number | null;
}

export interface FilterState {
  datePreset: DatePreset;
  dateFrom: string; // YYYY-MM-DD or ''
  dateTo: string; // YYYY-MM-DD or ''
  years: string[];
  stores: string[];
  categories: string[];
  salespeople: string[];
  provinces: string[];
  channels: string[];
  paymentMethods: string[];
  products: string[];
}

export type LoadErrorType =
  | 'bad_url'
  | 'no_permission'
  | 'empty_sheet'
  | 'missing_columns'
  | 'network_error';

export interface LoadError {
  type: LoadErrorType;
  title: string;
  message: string;
  missingColumns?: string[];
}

export interface FacetOption {
  value: string;
  count: number;
}

export interface FacetCounts {
  years: FacetOption[];
  stores: FacetOption[];
  categories: FacetOption[];
  salespeople: FacetOption[];
  provinces: FacetOption[];
  channels: FacetOption[];
  paymentMethods: FacetOption[];
}

export interface KpiMetric {
  value: number | null;
  priorValue: number | null;
  changePct: number | null;
  comparisonLabel?: string;
  previousYearValue: number | null;
  previousYearChangePct: number | null;
}

export interface TrendPoint {
  key: string;
  label: string;
  sales: number;
  quantity: number;
  orders: number;
  isPeak: boolean;
}

export interface CategoryStat {
  category: string;
  sales: number;
  grossSales: number;
  discountAmount: number;
  discountRate: number | null;
  quantity: number;
  orders: number;
  sharePct: number | null;
}

export interface StorePerformance {
  store: string;
  province: string;
  country: string;
  sales: number;
  grossSales: number;
  discountAmount: number;
  discountRate: number | null;
  quantity: number;
  orders: number;
  aov: number | null;
  sharePct: number | null;
  priorSales: number | null;
  changeVsPriorPct: number | null;
  yoyPriorSales: number | null;
  changeVsYoyPct: number | null;
  vsAveragePct: number | null;
  isUnderperforming: boolean;
  underperformingReason: string;
  isSmallSample: boolean;
}

export interface StoreCategoryHeatmapCell {
  store: string;
  category: string;
  sales: number;
  orders: number;
  isSmallSample: boolean;
}

export interface DiscountBucketStat {
  bucket: string;
  minRate: number;
  maxRate: number;
  sales: number;
  grossSales: number;
  discountAmount: number;
  quantity: number;
  orders: number;
  avgUnitsPerOrder: number | null;
  aov: number | null;
}

export interface SalespersonStat {
  rank: number;
  salesperson: string;
  sales: number;
  grossSales: number;
  discountAmount: number;
  discountRate: number | null;
  quantity: number;
  orders: number;
  aov: number | null;
  sharePct: number | null;
  inStoreSales: number;
  onlineSales: number;
  isSmallSample: boolean;
}

export interface ProductStat {
  product: string;
  category: string;
  sales: number;
  grossSales: number;
  discountAmount: number;
  discountRate: number | null;
  quantity: number;
  orders: number;
  avgUnitPrice: number | null;
}

export interface ComputedAnalytics {
  matchingCount: number;
  activeDateWindow: {
    fromKey: string | null;
    toKey: string | null;
    priorFromKey: string | null;
    priorToKey: string | null;
    hasPriorWindow: boolean;
  };
  kpis: {
    totalSales: KpiMetric;
    totalQuantity: KpiMetric;
    orders: KpiMetric;
    aov: KpiMetric;
    totalDiscounts: KpiMetric;
    discountRate: {
      value: number | null;
      priorValue: number | null;
      changePctPoints: number | null;
      previousYearValue: number | null;
      previousYearChangePctPoints: number | null;
    };
  };
  momGrowthPct: number | null;
  trend: TrendPoint[];
  categories: CategoryStat[];
  stores: StorePerformance[];
  storeAverageSales: number | null;
  storeCategoryHeatmap: StoreCategoryHeatmapCell[];
  storeMonthlyTrends: Record<string, TrendPoint[]>;
  discountBuckets: DiscountBucketStat[];
  discountByCategory: CategoryStat[];
  discountByStore: StorePerformance[];
  discountedVsFullPrice: {
    discountedSales: number;
    fullPriceSales: number;
    discountedOrders: number;
    fullPriceOrders: number;
    discountedAvgUnitsPerOrder: number | null;
    fullPriceAvgUnitsPerOrder: number | null;
  };
  salespeople: SalespersonStat[];
  salespersonMonthlyTrends: Record<string, TrendPoint[]>;
  top10Products: ProductStat[];
  bottom10Products: ProductStat[];
  allProducts: ProductStat[];
  insights: string[];
  questionCards: {
    underperformingStores: string;
    discountImpact: string;
    topSalespeople: string;
  };
  facets: FacetCounts;
  filteredIndices: number[];
}
