const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatCAD(value: number | null | undefined, compact = false): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'n/a';
  }
  if (compact) {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1_000_000) {
      return `${sign}$${(abs / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
    }
    if (abs >= 10_000) {
      return `${sign}$${(abs / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    }
  }
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCADFull(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'n/a';
  }
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'n/a';
  }
  return new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'n/a';
  }
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  }
  if (abs >= 10_000) {
    return `${sign}${(abs / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return formatNumber(value, 0);
}

export function formatPercent(
  ratio: number | null | undefined,
  options: { signed?: boolean; decimals?: number } = {}
): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) {
    return 'n/a';
  }
  const { signed = false, decimals = 1 } = options;
  const pct = ratio * 100;
  const prefix = signed && pct > 0 ? '+' : '';
  return `${prefix}${pct.toFixed(decimals)}%`;
}

export function formatDateDisplay(dateKey: string | null | undefined): string {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return dateKey || 'n/a';
  }
  const [y, m, d] = dateKey.split('-').map(Number);
  const monthName = MONTHS_SHORT[m - 1] ?? '???';
  return `${d} ${monthName} ${y}`;
}

export function formatMonthLabel(monthKey: string): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
  const [y, m] = monthKey.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1] ?? '???'} ${y}`;
}

export function formatDateTimeDisplay(isoString: string | null | undefined): string {
  if (!isoString) return 'n/a';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  const day = d.getDate();
  const month = MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hh}:${mm}`;
}

export function standardiseCapitalisation(
  raw: string,
  options: { preserveProvinceCode?: boolean; channelMode?: boolean } = {}
): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  if (options.preserveProvinceCode && cleaned.length <= 2) {
    return cleaned.toUpperCase();
  }

  if (options.channelMode) {
    const low = cleaned.toLowerCase();
    if (low === 'in-store' || low === 'in store' || low === 'instore') {
      return 'In-Store';
    }
    if (low === 'online') {
      return 'Online';
    }
  }

  return cleaned
    .split(' ')
    .map((word) => {
      if (word.includes('-')) {
        return word
          .split('-')
          .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : ''))
          .join('-');
      }
      if (word === '&') return '&';
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
