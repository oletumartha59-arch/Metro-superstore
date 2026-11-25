import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Columns3,
  Download,
  Flag,
  Search,
} from 'lucide-react';
import { FactSalesRow, SalesStarModel, ValidationFlagType } from '../types/sales';
import { formatCADFull, formatDateDisplay, formatPercent } from '../utils/formatters';
import { ValueOrNa } from '../components/NaValue';

interface ColumnDef {
  id: string;
  label: string;
  align?: 'left' | 'right';
  widthPx: number;
  defaultVisible: boolean;
  sortValue: (r: FactSalesRow) => string | number;
  renderText: (r: FactSalesRow) => string;
}

const FLAG_LABELS: Record<ValidationFlagType, string> = {
  math_mismatch: 'Math mismatch',
  duplicate_tx_id: 'Duplicate ID',
  missing_value: 'Missing value',
  invalid_quantity: 'Qty ≤ 0',
  future_date: 'Future date',
  invalid_date: 'Invalid date',
};

const COLUMNS: ColumnDef[] = [
  {
    id: 'transactionId',
    label: 'Transaction ID',
    widthPx: 120,
    defaultVisible: true,
    sortValue: (r) => r.transactionId,
    renderText: (r) => r.transactionId || '—',
  },
  {
    id: 'dateKey',
    label: 'Date',
    widthPx: 112,
    defaultVisible: true,
    sortValue: (r) => r.dateMs ?? -Infinity,
    renderText: (r) => (r.dateKey ? formatDateDisplay(r.dateKey) : 'Invalid'),
  },
  {
    id: 'orderId',
    label: 'Order ID',
    widthPx: 110,
    defaultVisible: true,
    sortValue: (r) => r.orderId,
    renderText: (r) => r.orderId || '—',
  },
  {
    id: 'product',
    label: 'Product',
    widthPx: 220,
    defaultVisible: true,
    sortValue: (r) => r.product,
    renderText: (r) => r.product,
  },
  {
    id: 'category',
    label: 'Category',
    widthPx: 135,
    defaultVisible: true,
    sortValue: (r) => r.category,
    renderText: (r) => r.category,
  },
  {
    id: 'quantity',
    label: 'Qty',
    align: 'right',
    widthPx: 72,
    defaultVisible: true,
    sortValue: (r) => r.quantity ?? -Infinity,
    renderText: (r) => (r.quantity !== null ? String(r.quantity) : 'n/a'),
  },
  {
    id: 'unitPrice',
    label: 'Unit Price',
    align: 'right',
    widthPx: 105,
    defaultVisible: false,
    sortValue: (r) => r.unitPrice ?? -Infinity,
    renderText: (r) => formatCADFull(r.unitPrice),
  },
  {
    id: 'grossSales',
    label: 'Gross Sales',
    align: 'right',
    widthPx: 115,
    defaultVisible: false,
    sortValue: (r) => r.grossSales ?? -Infinity,
    renderText: (r) => formatCADFull(r.grossSales),
  },
  {
    id: 'discountRate',
    label: 'Disc. Rate',
    align: 'right',
    widthPx: 95,
    defaultVisible: true,
    sortValue: (r) => r.discountRate ?? -Infinity,
    renderText: (r) => formatPercent(r.discountRate),
  },
  {
    id: 'discountAmount',
    label: 'Discount',
    align: 'right',
    widthPx: 105,
    defaultVisible: true,
    sortValue: (r) => r.discountAmount ?? -Infinity,
    renderText: (r) => formatCADFull(r.discountAmount),
  },
  {
    id: 'salesAmount',
    label: 'Net Sales',
    align: 'right',
    widthPx: 115,
    defaultVisible: true,
    sortValue: (r) => r.salesAmount ?? -Infinity,
    renderText: (r) => formatCADFull(r.salesAmount),
  },
  {
    id: 'store',
    label: 'Store',
    widthPx: 115,
    defaultVisible: true,
    sortValue: (r) => r.store,
    renderText: (r) => r.store,
  },
  {
    id: 'province',
    label: 'Province',
    widthPx: 90,
    defaultVisible: false,
    sortValue: (r) => r.province,
    renderText: (r) => r.province,
  },
  {
    id: 'channel',
    label: 'Channel',
    widthPx: 100,
    defaultVisible: true,
    sortValue: (r) => r.channel,
    renderText: (r) => r.channel,
  },
  {
    id: 'paymentMethod',
    label: 'Payment',
    widthPx: 120,
    defaultVisible: false,
    sortValue: (r) => r.paymentMethod,
    renderText: (r) => r.paymentMethod,
  },
  {
    id: 'salesperson',
    label: 'Salesperson',
    widthPx: 145,
    defaultVisible: true,
    sortValue: (r) => r.salesperson,
    renderText: (r) => r.salesperson,
  },
  {
    id: 'flags',
    label: 'Validation',
    widthPx: 170,
    defaultVisible: true,
    sortValue: (r) => (r.isVerified ? 0 : 1),
    renderText: (r) =>
      r.isVerified
        ? 'Verified'
        : r.validationFlags.map((f) => FLAG_LABELS[f]).join(', '),
  },
];

const ROW_HEIGHT = 42;
const OVERSCAN = 8;

interface TransactionsPageProps {
  model: SalesStarModel;
  filteredIndices: number[];
  initialFlaggedOnly?: boolean;
  onConsumeFlaggedOnly?: () => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  model,
  filteredIndices,
  initialFlaggedOnly = false,
  onConsumeFlaggedOnly,
}) => {
  const [search, setSearch] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(initialFlaggedOnly);
  const [sortCol, setSortCol] = useState<string>('dateKey');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [visibleColIds, setVisibleColIds] = useState<string[]>(() =>
    COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id)
  );
  const [colMenuOpen, setColMenuOpen] = useState(false);

  const scrollBoxRef = useRef<HTMLDivElement | null>(null);
  const colMenuRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(520);

  useEffect(() => {
    if (initialFlaggedOnly) {
      setFlaggedOnly(true);
      onConsumeFlaggedOnly?.();
    }
  }, [initialFlaggedOnly, onConsumeFlaggedOnly]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setColMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    const el = scrollBoxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setViewportHeight(el.clientHeight || 520);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const filteredBaseRows = useMemo(() => {
    return filteredIndices.map((idx) => model.facts[idx]);
  }, [filteredIndices, model.facts]);

  const flaggedInSliceCount = useMemo(
    () => filteredBaseRows.filter((r) => !r.isVerified).length,
    [filteredBaseRows]
  );

  const displayedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = filteredBaseRows;

    if (flaggedOnly) {
      list = list.filter((r) => !r.isVerified);
    }

    if (q) {
      list = list.filter(
        (r) =>
          r.transactionId.toLowerCase().includes(q) ||
          r.orderId.toLowerCase().includes(q) ||
          r.product.toLowerCase().includes(q) ||
          r.salesperson.toLowerCase().includes(q)
      );
    }

    const col = COLUMNS.find((c) => c.id === sortCol);
    if (!col) return list;

    const sorted = [...list].sort((a, b) => {
      const av = col.sortValue(a);
      const bv = col.sortValue(b);
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [filteredBaseRows, flaggedOnly, search, sortCol, sortDir]);

  // Reset scroll when dataset changes
  useEffect(() => {
    if (scrollBoxRef.current) {
      scrollBoxRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [search, flaggedOnly, filteredIndices]);

  const activeColumns = useMemo(
    () => COLUMNS.filter((c) => visibleColIds.includes(c.id)),
    [visibleColIds]
  );

  const totalWidth = useMemo(
    () => activeColumns.reduce((sum, c) => sum + c.widthPx, 0),
    [activeColumns]
  );

  const totalRows = displayedRows.length;
  const totalHeight = totalRows * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const endIndex = Math.min(totalRows, startIndex + visibleCount);
  const visibleRows = displayedRows.slice(startIndex, endIndex);

  const showingFrom = totalRows === 0 ? 0 : Math.floor(scrollTop / ROW_HEIGHT) + 1;
  const showingTo =
    totalRows === 0
      ? 0
      : Math.min(totalRows, Math.max(showingFrom, Math.min(totalRows, showingFrom + 49)));

  const handleSort = (colId: string) => {
    if (sortCol === colId) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(colId);
      setSortDir('asc');
    }
  };

  const toggleColumn = (colId: string) => {
    setVisibleColIds((prev) => {
      if (prev.includes(colId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== colId);
      }
      return [...prev, colId];
    });
  };

  const handleExportCsv = () => {
    const escapeCsv = (val: string) => {
      if (/[",\n\r]/.test(val)) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const headerLine = activeColumns.map((c) => escapeCsv(c.label)).join(',');
    const lines = displayedRows.map((row) =>
      activeColumns.map((c) => escapeCsv(c.renderText(row))).join(',')
    );

    const csvContent = [headerLine, ...lines].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'metro-superstore-filtered-transactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="card-surface overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="px-5 py-4 border-b border-[#E3E7EF] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#22308F]">Transactions Ledger</h2>
          <p className="text-xs text-[#5B6475] tabular-nums mt-0.5">
            {totalRows === 0
              ? 'Showing 0 of 0 matching transactions'
              : `Showing ${showingFrom.toLocaleString()} to ${showingTo.toLocaleString()} of ${totalRows.toLocaleString()}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#5B6475] absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Transaction ID, Order ID, Product, Salesperson…"
              aria-label="Search transactions"
              className="h-8 w-64 sm:w-72 pl-8 pr-3 text-xs border border-[#E3E7EF] rounded-lg bg-[#F5F7FB] text-[#1B2233] placeholder-[#5B6475] focus:bg-white"
            />
          </div>

          {/* Flagged Only Toggle */}
          <button
            type="button"
            onClick={() => setFlaggedOnly((f) => !f)}
            className={`h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              flaggedOnly
                ? 'border-[#C8372D] bg-[#FEF2F2] text-[#C8372D]'
                : 'border-[#E3E7EF] bg-white text-[#1B2233] hover:bg-[#F5F7FB]'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span className="tabular-nums">
              Flagged only ({flaggedInSliceCount.toLocaleString()})
            </span>
          </button>

          {/* Show/Hide Columns */}
          <div ref={colMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setColMenuOpen((o) => !o)}
              className="h-8 px-2.5 rounded-lg border border-[#E3E7EF] bg-white text-xs font-medium text-[#1B2233] hover:bg-[#F5F7FB] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Columns3 className="w-3.5 h-3.5 text-[#5B6475]" />
              <span>Columns</span>
            </button>
            {colMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 rounded-[12px] border border-[#E3E7EF] bg-white shadow-lg z-40 p-2 max-h-72 overflow-y-auto">
                {COLUMNS.map((c) => {
                  const checked = visibleColIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#F5F7FB] cursor-pointer text-xs text-[#1B2233]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleColumn(c.id)}
                        className="rounded border-[#E3E7EF] text-[#22308F]"
                      />
                      <span>{c.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Export Filtered CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={displayedRows.length === 0}
            className="h-8 px-3 rounded-lg bg-[#22308F] text-white text-xs font-medium hover:bg-[#1a256f] disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Filtered CSV</span>
          </button>
        </div>
      </div>

      {/* Virtualised Scroll Container */}
      <div
        ref={scrollBoxRef}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        className="overflow-auto relative"
        style={{ height: 540 }}
      >
        <div style={{ minWidth: totalWidth }}>
          {/* Sticky Header */}
          <div className="sticky top-0 z-20 flex bg-[#F5F7FB] border-b border-[#E3E7EF] text-xs font-semibold text-[#5B6475]">
            {activeColumns.map((col) => {
              const isSorted = sortCol === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => handleSort(col.id)}
                  style={{ width: col.widthPx }}
                  className={`shrink-0 px-3 py-2.5 flex items-center gap-1 hover:text-[#1B2233] cursor-pointer ${
                    col.align === 'right' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <span className="truncate">{col.label}</span>
                  {isSorted ? (
                    sortDir === 'asc' ? (
                      <ArrowUp className="w-3 h-3 text-[#22308F] shrink-0" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-[#22308F] shrink-0" />
                    )
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Empty State */}
          {totalRows === 0 ? (
            <div className="py-16 text-center text-sm text-[#5B6475]">
              No transactions match these filters
            </div>
          ) : (
            <div style={{ height: totalHeight, position: 'relative' }}>
              <div
                style={{
                  transform: `translateY(${startIndex * ROW_HEIGHT}px)`,
                }}
              >
                {visibleRows.map((row) => {
                  const isFlagged = !row.isVerified;
                  return (
                    <div
                      key={`${row.rowIndex}-${row.transactionId}`}
                      style={{ height: ROW_HEIGHT }}
                      title={
                        isFlagged
                          ? `Row ${row.rowIndex}: ${row.validationDetails.join(' | ')}`
                          : undefined
                      }
                      className={`flex items-center border-b border-[#EEF1F6] text-xs ${
                        isFlagged
                          ? 'bg-[#FEF2F2] hover:bg-[#FDE8E8]'
                          : 'bg-white hover:bg-[#F5F7FB]'
                      }`}
                    >
                      {activeColumns.map((col) => {
                        const text = col.renderText(row);
                        return (
                          <div
                            key={col.id}
                            style={{ width: col.widthPx }}
                            className={`shrink-0 px-3 truncate ${
                              col.align === 'right' ? 'text-right tabular-nums' : 'text-left'
                            } ${
                              col.id === 'flags' && isFlagged
                                ? 'text-[#C8372D] font-semibold'
                                : col.id === 'flags'
                                  ? 'text-[#0F9D8A] font-medium'
                                  : 'text-[#1B2233]'
                            }`}
                            title={
                              col.id === 'flags' && isFlagged
                                ? row.validationDetails.join('; ')
                                : text
                            }
                          >
                            <ValueOrNa value={text} />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
