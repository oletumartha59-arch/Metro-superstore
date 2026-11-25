import { DatePreset, FilterState, PageId } from '../types/sales';
import { formatDateDisplay } from './formatters';

export const DEFAULT_FILTERS: FilterState = {
  datePreset: 'all',
  dateFrom: '',
  dateTo: '',
  years: [],
  stores: [],
  categories: [],
  salespeople: [],
  provinces: [],
  channels: [],
  paymentMethods: [],
  products: [],
};

const VALID_PAGES: PageId[] = [
  'overview',
  'stores',
  'discounts',
  'salespeople',
  'products',
  'transactions',
  'assistant',
];

const VALID_PRESETS: DatePreset[] = [
  'all',
  'this_year',
  'last_90',
  'last_30',
  'this_month',
  'custom',
];

function parseListParam(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key);
  if (!raw) return [];
  return raw
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function readStateFromUrl(): { page: PageId; filters: FilterState } {
  try {
    const params = new URLSearchParams(window.location.search);
    const rawPage = params.get('page') as PageId | null;
    const page: PageId = rawPage && VALID_PAGES.includes(rawPage) ? rawPage : 'overview';

    const rawPreset = params.get('date') as DatePreset | null;
    const datePreset: DatePreset =
      rawPreset && VALID_PRESETS.includes(rawPreset) ? rawPreset : 'all';

    return {
      page,
      filters: {
        datePreset,
        dateFrom: params.get('from') || '',
        dateTo: params.get('to') || '',
        years: parseListParam(params, 'years'),
        stores: parseListParam(params, 'stores'),
        categories: parseListParam(params, 'categories'),
        salespeople: parseListParam(params, 'salespeople'),
        provinces: parseListParam(params, 'provinces'),
        channels: parseListParam(params, 'channels'),
        paymentMethods: parseListParam(params, 'payments'),
        products: parseListParam(params, 'products'),
      },
    };
  } catch {
    return { page: 'overview', filters: { ...DEFAULT_FILTERS } };
  }
}

export function writeStateToUrl(page: PageId, filters: FilterState): void {
  try {
    const params = new URLSearchParams();
    if (page !== 'overview') params.set('page', page);
    if (filters.datePreset !== 'all') params.set('date', filters.datePreset);
    if (filters.datePreset === 'custom') {
      if (filters.dateFrom) params.set('from', filters.dateFrom);
      if (filters.dateTo) params.set('to', filters.dateTo);
    }
    if (filters.years.length > 0) params.set('years', filters.years.join('|'));
    if (filters.stores.length > 0) params.set('stores', filters.stores.join('|'));
    if (filters.categories.length > 0) params.set('categories', filters.categories.join('|'));
    if (filters.salespeople.length > 0) params.set('salespeople', filters.salespeople.join('|'));
    if (filters.provinces.length > 0) params.set('provinces', filters.provinces.join('|'));
    if (filters.channels.length > 0) params.set('channels', filters.channels.join('|'));
    if (filters.paymentMethods.length > 0) params.set('payments', filters.paymentMethods.join('|'));
    if (filters.products.length > 0) params.set('products', filters.products.join('|'));

    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  } catch {
    // Ignore history API restrictions
  }
}

export function describeActiveFilters(
  filters: FilterState,
  fromKey: string | null,
  toKey: string | null
): string {
  const parts: string[] = [];

  if (filters.datePreset === 'all') {
    parts.push(
      fromKey && toKey
        ? `${formatDateDisplay(fromKey)} – ${formatDateDisplay(toKey)}`
        : 'All dates'
    );
  } else if (filters.datePreset === 'this_year') {
    parts.push('This Year');
  } else if (filters.datePreset === 'last_90') {
    parts.push('Last 90 Days');
  } else if (filters.datePreset === 'last_30') {
    parts.push('Last 30 Days');
  } else if (filters.datePreset === 'this_month') {
    parts.push('This Month');
  } else if (filters.datePreset === 'custom') {
    parts.push(
      `${filters.dateFrom ? formatDateDisplay(filters.dateFrom) : 'Start'} – ${
        filters.dateTo ? formatDateDisplay(filters.dateTo) : 'End'
      }`
    );
  }

  if (filters.years.length > 0) parts.push(`Year: ${filters.years.join(', ')}`);
  if (filters.stores.length > 0) parts.push(`Store: ${filters.stores.join(', ')}`);
  if (filters.categories.length > 0) parts.push(`Category: ${filters.categories.join(', ')}`);
  if (filters.salespeople.length > 0) parts.push(`Salesperson: ${filters.salespeople.join(', ')}`);
  if (filters.provinces.length > 0) parts.push(`Province: ${filters.provinces.join(', ')}`);
  if (filters.channels.length > 0) parts.push(`Channel: ${filters.channels.join(', ')}`);
  if (filters.paymentMethods.length > 0) parts.push(`Payment: ${filters.paymentMethods.join(', ')}`);
  if (filters.products.length > 0) parts.push(`Product: ${filters.products.join(', ')}`);

  return parts.join(' · ');
}
