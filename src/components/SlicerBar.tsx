import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, SlidersHorizontal, X, Search, Filter } from 'lucide-react';
import { DatePreset, FacetCounts, FacetOption, FilterState } from '../types/sales';
import { formatDateDisplay } from '../utils/formatters';

interface MultiSelectDropdownProps {
  label: string;
  selected: string[];
  options: FacetOption[];
  searchable?: boolean;
  onChange: (next: string[]) => void;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  selected,
  options,
  searchable = false,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filtered = searchable && query.trim()
    ? options.filter((o) => o.value.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
          selected.length > 0
            ? 'border-[#CE7F20] bg-[#EEDFC7] text-[#533416]'
            : 'border-[#E5D7C1] bg-white text-[#2B1B0E] hover:bg-[#FAF6EE]'
        }`}
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="tabular-nums font-semibold">({selected.length})</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 opacity-75" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-64 rounded-[12px] border border-[#E5D7C1] bg-white shadow-lg z-40 p-2">
          {searchable && (
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-[#6B5744] absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                className="w-full h-8 pl-8 pr-2.5 text-xs border border-[#E5D7C1] rounded-lg bg-[#FAF6EE] text-[#2B1B0E] placeholder-[#6B5744] focus:bg-white"
              />
            </div>
          )}
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {filtered.length === 0 ? (
              <p className="text-xs text-[#6B5744] py-3 text-center">No matching options</p>
            ) : (
              filtered.map((opt) => {
                const checked = selected.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-[#FAF6EE] cursor-pointer text-xs"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(opt.value)}
                        className="rounded border-[#E5D7C1] accent-[#533416]"
                      />
                      <span className="truncate text-[#2B1B0E]" title={opt.value}>
                        {opt.value}
                      </span>
                    </span>
                    <span className="text-[11px] text-[#6B5744] tabular-nums shrink-0">
                      {opt.count.toLocaleString()}
                    </span>
                  </label>
                );
              })
            )}
          </div>
          {selected.length > 0 && (
            <div className="pt-2 mt-1.5 border-t border-[#E5D7C1] flex justify-end">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] font-semibold text-[#8F5109] hover:underline cursor-pointer"
              >
                Clear {label.toLowerCase()}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface SlicerBarProps {
  filters: FilterState;
  facets: FacetCounts;
  matchingCount: number;
  minDateKey: string | null;
  maxDateKey: string | null;
  onChangeFilters: (next: FilterState) => void;
  onClearAll: () => void;
}

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'all', label: 'All Time' },
  { id: 'this_year', label: 'This Year' },
  { id: 'last_90', label: 'Last 90 Days' },
  { id: 'last_30', label: 'Last 30 Days' },
  { id: 'this_month', label: 'This Month' },
];

export const SlicerBar: React.FC<SlicerBarProps> = ({
  filters,
  facets,
  matchingCount,
  minDateKey,
  maxDateKey,
  onChangeFilters,
  onClearAll,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const moreCount =
    filters.provinces.length + filters.channels.length + filters.paymentMethods.length;

  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (filters.datePreset !== 'all') {
    const presetLabel =
      filters.datePreset === 'custom'
        ? `Date: ${filters.dateFrom ? formatDateDisplay(filters.dateFrom) : 'Start'} – ${
            filters.dateTo ? formatDateDisplay(filters.dateTo) : 'End'
          }`
        : `Date: ${DATE_PRESETS.find((p) => p.id === filters.datePreset)?.label ?? filters.datePreset}`;
    chips.push({
      key: 'date',
      label: presetLabel,
      onRemove: () =>
        onChangeFilters({ ...filters, datePreset: 'all', dateFrom: '', dateTo: '' }),
    });
  }

  for (const y of filters.years) {
    chips.push({
      key: `year-${y}`,
      label: `Year: ${y}`,
      onRemove: () =>
        onChangeFilters({ ...filters, years: filters.years.filter((x) => x !== y) }),
    });
  }
  for (const s of filters.stores) {
    chips.push({
      key: `store-${s}`,
      label: `Store: ${s}`,
      onRemove: () =>
        onChangeFilters({ ...filters, stores: filters.stores.filter((x) => x !== s) }),
    });
  }
  for (const c of filters.categories) {
    chips.push({
      key: `cat-${c}`,
      label: `Category: ${c}`,
      onRemove: () =>
        onChangeFilters({
          ...filters,
          categories: filters.categories.filter((x) => x !== c),
        }),
    });
  }
  for (const sp of filters.salespeople) {
    chips.push({
      key: `sp-${sp}`,
      label: `Salesperson: ${sp}`,
      onRemove: () =>
        onChangeFilters({
          ...filters,
          salespeople: filters.salespeople.filter((x) => x !== sp),
        }),
    });
  }
  for (const p of filters.provinces) {
    chips.push({
      key: `prov-${p}`,
      label: `Province: ${p}`,
      onRemove: () =>
        onChangeFilters({ ...filters, provinces: filters.provinces.filter((x) => x !== p) }),
    });
  }
  for (const ch of filters.channels) {
    chips.push({
      key: `chan-${ch}`,
      label: `Channel: ${ch}`,
      onRemove: () =>
        onChangeFilters({ ...filters, channels: filters.channels.filter((x) => x !== ch) }),
    });
  }
  for (const pm of filters.paymentMethods) {
    chips.push({
      key: `pm-${pm}`,
      label: `Payment: ${pm}`,
      onRemove: () =>
        onChangeFilters({
          ...filters,
          paymentMethods: filters.paymentMethods.filter((x) => x !== pm),
        }),
    });
  }
  for (const prod of filters.products) {
    chips.push({
      key: `prod-${prod}`,
      label: `Product: ${prod}`,
      onRemove: () =>
        onChangeFilters({
          ...filters,
          products: filters.products.filter((x) => x !== prod),
        }),
    });
  }

  return (
    <>
      <div className="sticky top-0 z-30 bg-[#FAF6EE]/95 backdrop-blur-sm pt-1 pb-2">
        <div className="card-surface px-3.5 py-2.5">
          {/* Compact mobile header toggle (< md) to stay well within 15% mobile viewport cap */}
          <div className="flex md:hidden items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMobileExpanded((v) => !v)}
              className="h-8 px-2.5 rounded-lg border border-[#E5D7C1] bg-white text-xs font-medium text-[#2B1B0E] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-[#533416]" />
              <span>Filters{chips.length > 0 ? ` (${chips.length})` : ''}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  mobileExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>
            <span className="text-xs font-medium text-[#6B5744] tabular-nums">
              {matchingCount.toLocaleString()} transactions match
            </span>
          </div>

          {/* Slicer Controls (always visible on md+, toggled on mobile) */}
          <div className={`${mobileExpanded ? 'mt-2.5 block' : 'hidden md:block'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {/* Date Quick Picks */}
                <div
                  className="inline-flex flex-wrap items-center p-0.5 rounded-lg bg-[#F5EDE0] border border-[#E5D7C1]"
                  role="group"
                  aria-label="Date range quick picks"
                >
                  {DATE_PRESETS.map((preset) => {
                    const active = filters.datePreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          onChangeFilters({
                            ...filters,
                            datePreset: preset.id,
                            dateFrom: '',
                            dateTo: '',
                          })
                        }
                        className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                          active
                            ? 'bg-[#533416] text-white shadow-xs'
                            : 'text-[#6B5744] hover:text-[#2B1B0E]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom From / To date inputs */}
                <div className="flex items-center gap-1.5">
                  <label htmlFor="slicer-date-from" className="sr-only">
                    From date
                  </label>
                  <input
                    id="slicer-date-from"
                    type="date"
                    value={filters.datePreset === 'custom' ? filters.dateFrom : ''}
                    min={minDateKey || undefined}
                    max={maxDateKey || undefined}
                    onChange={(e) =>
                      onChangeFilters({
                        ...filters,
                        datePreset: 'custom',
                        dateFrom: e.target.value,
                      })
                    }
                    className="h-8 px-2 text-xs border border-[#E5D7C1] rounded-lg bg-white text-[#2B1B0E]"
                    title="Filter from date"
                  />
                  <span className="text-xs text-[#6B5744]">to</span>
                  <label htmlFor="slicer-date-to" className="sr-only">
                    To date
                  </label>
                  <input
                    id="slicer-date-to"
                    type="date"
                    value={filters.datePreset === 'custom' ? filters.dateTo : ''}
                    min={minDateKey || undefined}
                    max={maxDateKey || undefined}
                    onChange={(e) =>
                      onChangeFilters({
                        ...filters,
                        datePreset: 'custom',
                        dateTo: e.target.value,
                      })
                    }
                    className="h-8 px-2 text-xs border border-[#E5D7C1] rounded-lg bg-white text-[#2B1B0E]"
                    title="Filter to date"
                  />
                </div>

                {/* Year, Store, Category, Salesperson Multi-selects */}
                <MultiSelectDropdown
                  label="Year"
                  selected={filters.years}
                  options={facets.years}
                  onChange={(years) => onChangeFilters({ ...filters, years })}
                />
                <MultiSelectDropdown
                  label="Store"
                  selected={filters.stores}
                  options={facets.stores}
                  searchable
                  onChange={(stores) => onChangeFilters({ ...filters, stores })}
                />
                <MultiSelectDropdown
                  label="Category"
                  selected={filters.categories}
                  options={facets.categories}
                  onChange={(categories) => onChangeFilters({ ...filters, categories })}
                />
                <MultiSelectDropdown
                  label="Salesperson"
                  selected={filters.salespeople}
                  options={facets.salespeople}
                  searchable
                  onChange={(salespeople) => onChangeFilters({ ...filters, salespeople })}
                />

                {/* More Drawer Trigger */}
                <button
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  className={`h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                    moreCount > 0
                      ? 'border-[#CE7F20] bg-[#EEDFC7] text-[#533416]'
                      : 'border-[#E5D7C1] bg-white text-[#2B1B0E] hover:bg-[#FAF6EE]'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>More{moreCount > 0 ? ` (${moreCount})` : ''}</span>
                </button>
              </div>

              <div className="hidden md:flex items-center gap-3 shrink-0">
                <span className="text-xs font-medium text-[#6B5744] tabular-nums whitespace-nowrap">
                  {matchingCount.toLocaleString()} transactions match
                </span>
              </div>
            </div>

            {/* Active Filter Chips */}
            {chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-[#E5D7C1]">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={chip.onRemove}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EEDFC7] text-[#533416] text-xs font-medium hover:bg-[#E4CFAF] transition-colors cursor-pointer"
                  >
                    <span>{chip.label}</span>
                    <X className="w-3 h-3" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-xs font-medium text-[#B83A28] hover:underline ml-1 px-1.5 py-0.5 cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* More Filters Drawer */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[#2B1B0E]/30"
          role="dialog"
          aria-modal="true"
          aria-label="Additional dimension filters"
        >
          <div className="w-full max-w-sm bg-white h-full border-l border-[#E5D7C1] shadow-xl flex flex-col">
            <div className="px-5 py-4 border-b border-[#E5D7C1] flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#533416]">More Filters</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close more filters"
                className="p-1.5 rounded-lg text-[#6B5744] hover:bg-[#FAF6EE] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Province */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-[#2B1B0E]">Province</h3>
                  {filters.provinces.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onChangeFilters({ ...filters, provinces: [] })}
                      className="text-xs font-medium text-[#8F5109] hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {facets.provinces.map((opt) => {
                    const checked = filters.provinces.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#FAF6EE] cursor-pointer text-xs"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              onChangeFilters({
                                ...filters,
                                provinces: checked
                                  ? filters.provinces.filter((x) => x !== opt.value)
                                  : [...filters.provinces, opt.value],
                              })
                            }
                            className="rounded border-[#E5D7C1] accent-[#533416]"
                          />
                          <span className="text-[#2B1B0E]">{opt.value}</span>
                        </span>
                        <span className="text-[#6B5744] tabular-nums">
                          {opt.count.toLocaleString()}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Sales Channel */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-[#2B1B0E]">Sales Channel</h3>
                  {filters.channels.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onChangeFilters({ ...filters, channels: [] })}
                      className="text-xs font-medium text-[#8F5109] hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {facets.channels.map((opt) => {
                    const checked = filters.channels.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#FAF6EE] cursor-pointer text-xs"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              onChangeFilters({
                                ...filters,
                                channels: checked
                                  ? filters.channels.filter((x) => x !== opt.value)
                                  : [...filters.channels, opt.value],
                              })
                            }
                            className="rounded border-[#E5D7C1] accent-[#533416]"
                          />
                          <span className="text-[#2B1B0E]">{opt.value}</span>
                        </span>
                        <span className="text-[#6B5744] tabular-nums">
                          {opt.count.toLocaleString()}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-[#2B1B0E]">Payment Method</h3>
                  {filters.paymentMethods.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onChangeFilters({ ...filters, paymentMethods: [] })}
                      className="text-xs font-medium text-[#8F5109] hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {facets.paymentMethods.map((opt) => {
                    const checked = filters.paymentMethods.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#FAF6EE] cursor-pointer text-xs"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              onChangeFilters({
                                ...filters,
                                paymentMethods: checked
                                  ? filters.paymentMethods.filter((x) => x !== opt.value)
                                  : [...filters.paymentMethods, opt.value],
                              })
                            }
                            className="rounded border-[#E5D7C1] accent-[#533416]"
                          />
                          <span className="text-[#2B1B0E]">{opt.value}</span>
                        </span>
                        <span className="text-[#6B5744] tabular-nums">
                          {opt.count.toLocaleString()}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-[#E5D7C1] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setMoreOpen(false);
                }}
                className="text-xs font-medium text-[#B83A28] hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="h-9 px-4 rounded-lg bg-[#533416] text-white text-xs font-medium hover:bg-[#3F260E] cursor-pointer"
              >
                Done ({matchingCount.toLocaleString()} match)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
