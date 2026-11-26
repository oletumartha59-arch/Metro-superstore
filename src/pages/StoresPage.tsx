import React, { useEffect, useMemo, useState } from 'react';
import * as echarts from 'echarts';
import { ComputedAnalytics } from '../types/sales';
import { ChartCard } from '../components/ChartCard';
import { ValueOrNa } from '../components/NaValue';
import { CHART_COLORS } from '../utils/echartsTheme';
import { formatCAD, formatCADFull, formatNumber, formatPercent } from '../utils/formatters';

interface StoresPageProps {
  analytics: ComputedAnalytics;
  filterSummary: string;
  loading: boolean;
  thresholdPct: number;
  onChangeThresholdPct: (next: number) => void;
  onToggleStoreFilter: (store: string) => void;
}

export const StoresPage: React.FC<StoresPageProps> = ({
  analytics,
  filterSummary,
  loading,
  thresholdPct,
  onChangeThresholdPct,
  onToggleStoreFilter,
}) => {
  const { stores, storeAverageSales, storeCategoryHeatmap, storeMonthlyTrends, categories } =
    analytics;

  const [selectedStore, setSelectedStore] = useState<string>('');

  useEffect(() => {
    if (stores.length === 0) {
      setSelectedStore('');
    } else if (!selectedStore || !stores.some((s) => s.store === selectedStore)) {
      const flagged = stores.find((s) => s.isUnderperforming);
      setSelectedStore(flagged ? flagged.store : stores[0].store);
    }
  }, [stores, selectedStore]);

  const storeBarOption = useMemo<echarts.EChartsOption | null>(() => {
    if (stores.length === 0) return null;
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [];
          if (!arr.length) return '';
          const idx = (arr[0] as { dataIndex: number }).dataIndex;
          const st = stores[idx];
          if (!st) return '';
          return `
            <div style="font-weight:600;margin-bottom:4px;color:${CHART_COLORS.espresso};">${st.store} (${st.province})</div>
            <div>Net Sales: <b>${formatCADFull(st.sales)}</b></div>
            <div>vs Store Avg: <b>${formatPercent(st.vsAveragePct, { signed: true })}</b></div>
            <div>Status: <b>${st.isUnderperforming ? 'Underperforming' : 'On Track'}</b></div>
            <div style="color:${CHART_COLORS.muted};margin-top:2px;">${st.underperformingReason}</div>
          `;
        },
      },
      grid: { left: 96, right: 64, top: 20, bottom: 40 },
      xAxis: {
        type: 'value',
        name: 'Net Sales (CAD)',
        nameLocation: 'middle',
        nameGap: 26,
        nameTextStyle: { color: CHART_COLORS.muted, fontSize: 11 },
        min: 0,
        axisLabel: { formatter: (v: number) => formatCAD(v, true) },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: stores.map((s) => s.store),
        axisLabel: { color: CHART_COLORS.ink, fontSize: 11 },
      },
      series: [
        {
          name: 'Net Sales (CAD)',
          type: 'bar',
          barMaxWidth: 26,
          data: stores.map((s) => ({
            value: Number(s.sales.toFixed(2)),
            itemStyle: {
              color: s.isUnderperforming ? CHART_COLORS.red : CHART_COLORS.espresso,
              borderRadius: [0, 4, 4, 0],
            },
          })),
          label: {
            show: true,
            position: 'right',
            fontSize: 11,
            color: CHART_COLORS.ink,
            formatter: (p) => formatCAD(Number(p.value), true),
          },
          markLine:
            storeAverageSales !== null
              ? {
                  symbol: 'none',
                  label: {
                    formatter: `Avg ${formatCAD(storeAverageSales, true)}`,
                    position: 'insideEndTop',
                    color: CHART_COLORS.amberText,
                    fontSize: 10,
                    fontWeight: 600,
                  },
                  lineStyle: { type: 'dashed', color: CHART_COLORS.amber, width: 1.5 },
                  data: [{ xAxis: Number(storeAverageSales.toFixed(2)) }],
                }
              : undefined,
        },
      ],
    };
  }, [stores, storeAverageSales]);

  const heatmapOption = useMemo<echarts.EChartsOption | null>(() => {
    if (stores.length === 0 || categories.length === 0) return null;
    const storeNames = stores.map((s) => s.store);
    const catNames = categories.map((c) => c.category);
    let maxVal = 0;
    const data: [number, number, number, number, number][] = [];

    for (const cell of storeCategoryHeatmap) {
      const xi = catNames.indexOf(cell.category);
      const yi = storeNames.indexOf(cell.store);
      if (xi >= 0 && yi >= 0) {
        if (cell.sales > maxVal) maxVal = cell.sales;
        data.push([
          xi,
          yi,
          Number(cell.sales.toFixed(2)),
          cell.orders,
          cell.isSmallSample ? 1 : 0,
        ]);
      }
    }

    return {
      tooltip: {
        position: 'top',
        formatter: (params: unknown) => {
          const p = params as { value: [number, number, number, number, number] };
          const [xi, yi, val, orders, small] = p.value;
          return `
            <div style="font-weight:600;margin-bottom:2px;color:${CHART_COLORS.espresso};">${storeNames[yi]} · ${catNames[xi]}</div>
            <div>Net Sales: <b>${formatCADFull(val)}</b></div>
            <div>Orders: <b>${formatNumber(orders)}</b>${
              small === 1 ? ` <span style="color:${CHART_COLORS.red};">(small sample)</span>` : ''
            }</div>
          `;
        },
      },
      grid: { left: 96, right: 20, top: 16, bottom: 58 },
      xAxis: {
        type: 'category',
        data: catNames,
        axisLabel: { fontSize: 11, color: CHART_COLORS.ink, rotate: catNames.length > 5 ? 20 : 0 },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: storeNames,
        axisLabel: { fontSize: 11, color: CHART_COLORS.ink },
      },
      visualMap: {
        show: false,
        min: 0,
        max: maxVal > 0 ? maxVal : 1,
        inRange: {
          color: ['#FAF6EE', '#EEDFC7', '#DFB67E', '#CE7F20'],
        },
      },
      series: [
        {
          name: 'Store × Category Sales',
          type: 'heatmap',
          data,
          label: {
            show: true,
            fontSize: 10,
            color: CHART_COLORS.ink,
            formatter: (params: unknown) => {
              const p = params as { value: [number, number, number, number, number] };
              const val = p.value[2];
              const small = p.value[4];
              if (val <= 0) return '—';
              return small === 1 ? `${formatCAD(val, true)}*` : formatCAD(val, true);
            },
          },
          itemStyle: {
            borderColor: '#FFFFFF',
            borderWidth: 2,
          },
        },
      ],
    };
  }, [stores, categories, storeCategoryHeatmap]);

  const selectedTrend = selectedStore ? storeMonthlyTrends[selectedStore] ?? [] : [];
  const storeTrendOption = useMemo<echarts.EChartsOption | null>(() => {
    if (selectedTrend.length === 0) return null;
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [];
          if (!arr.length) return '';
          const idx = (arr[0] as { dataIndex: number }).dataIndex;
          const pt = selectedTrend[idx];
          if (!pt) return '';
          return `
            <div style="font-weight:600;margin-bottom:2px;color:${CHART_COLORS.espresso};">${selectedStore} · ${pt.label}</div>
            <div>Net Sales: <b>${formatCADFull(pt.sales)}</b></div>
            <div>Quantity: <b>${formatNumber(pt.quantity)}</b> units</div>
            <div>Orders: <b>${formatNumber(pt.orders)}</b></div>
          `;
        },
      },
      grid: { left: 60, right: 20, top: 24, bottom: 38 },
      xAxis: {
        type: 'category',
        data: selectedTrend.map((t) => t.label),
        axisLabel: { rotate: selectedTrend.length > 12 ? 25 : 0, hideOverlap: true },
      },
      yAxis: {
        type: 'value',
        name: 'Net Sales (CAD)',
        nameTextStyle: { color: CHART_COLORS.muted, fontSize: 11, align: 'left' },
        min: 0,
        axisLabel: { formatter: (v: number) => formatCAD(v, true) },
      },
      series: [
        {
          name: 'Monthly Net Sales',
          type: 'bar',
          barMaxWidth: 28,
          itemStyle: { color: CHART_COLORS.olive, borderRadius: [4, 4, 0, 0] },
          data: selectedTrend.map((t) => Number(t.sales.toFixed(2))),
          label: {
            show: selectedTrend.length <= 14,
            position: 'top',
            fontSize: 10,
            color: CHART_COLORS.muted,
            formatter: (p) => formatCAD(Number(p.value), true),
          },
        },
      ],
    };
  }, [selectedTrend, selectedStore]);

  return (
    <div className="space-y-4">
      {/* Rule Control Banner */}
      <div className="card-surface p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[#533416]">
            Store Performance &amp; Underperforming Detection
          </h2>
          <p className="text-xs sm:text-sm text-[#6B5744]">
            A store is flagged <span className="font-semibold text-[#B83A28]">Underperforming</span>{' '}
            when its net sales are more than{' '}
            <span className="font-semibold text-[#2B1B0E] tabular-nums">{thresholdPct}%</span>{' '}
            below the store average (<ValueOrNa value={formatCAD(storeAverageSales)} />) AND/OR its sales have fallen
            versus the previous period. Groups with fewer than 5 orders are marked{' '}
            <span className="italic">small sample</span>.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 bg-[#F5EDE0] px-3.5 py-2 rounded-lg border border-[#E5D7C1]">
          <label
            htmlFor="underperforming-threshold"
            className="text-xs font-medium text-[#2B1B0E] whitespace-nowrap"
          >
            Below-average threshold:
          </label>
          <input
            id="underperforming-threshold"
            type="range"
            min={5}
            max={50}
            step={5}
            value={thresholdPct}
            onChange={(e) => onChangeThresholdPct(Number(e.target.value))}
            className="w-24 accent-[#533416] cursor-pointer"
          />
          <span className="text-sm font-semibold text-[#533416] tabular-nums w-10 text-right">
            {thresholdPct}%
          </span>
        </div>
      </div>

      {/* Store Bar Chart & Selected Store Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Net Sales by Store"
          subtitle={`Net Sales (CAD) · Click bar to inspect & filter · ${filterSummary}`}
          option={storeBarOption}
          loading={loading}
          isEmpty={stores.length === 0}
          height={310}
          onChartClick={(p) => {
            if (p.name) {
              setSelectedStore(p.name);
              onToggleStoreFilter(p.name);
            }
          }}
        />

        <ChartCard
          title={selectedStore ? `Monthly Trend — ${selectedStore}` : 'Monthly Store Trend'}
          subtitle={`Net Sales (CAD) by month · ${filterSummary}`}
          option={storeTrendOption}
          loading={loading}
          isEmpty={selectedTrend.length === 0}
          height={310}
          headerRight={
            stores.length > 0 ? (
              <select
                aria-label="Select store for monthly trend"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="h-8 px-2.5 text-xs border border-[#E5D7C1] rounded-lg bg-white text-[#2B1B0E]"
              >
                {stores.map((s) => (
                  <option key={s.store} value={s.store}>
                    {s.store}
                  </option>
                ))}
              </select>
            ) : null
          }
        />
      </div>

      {/* Store × Category Heatmap */}
      <ChartCard
        title="Store by Category Heatmap"
        subtitle={`Net Sales (CAD) · * denotes small sample (< 5 orders) · ${filterSummary}`}
        option={heatmapOption}
        loading={loading}
        isEmpty={stores.length === 0 || categories.length === 0}
        height={Math.max(240, stores.length * 44 + 80)}
      />

      {/* Ranked Store Table */}
      <section className="card-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5D7C1] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[15px] font-semibold text-[#533416]">Store Rankings &amp; Diagnostics</h3>
            <p className="text-xs text-[#6B5744]">
              Click any store row to toggle store filter everywhere
            </p>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#EEDFC7] text-[#533416] font-semibold tabular-nums">
            {stores.filter((s) => s.isUnderperforming).length} of {stores.length} flagged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#F5EDE0] border-b border-[#E5D7C1] text-xs font-semibold text-[#6B5744]">
                <th className="py-2.5 px-4">Store</th>
                <th className="py-2.5 px-3 text-right">Sales (CAD)</th>
                <th className="py-2.5 px-3 text-right">Share</th>
                <th className="py-2.5 px-3 text-right">Orders</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">AOV</th>
                <th className="py-2.5 px-3 text-right">Disc. Rate</th>
                <th className="py-2.5 px-3 text-right">vs Prior</th>
                <th className="py-2.5 px-3 text-right">vs Last Yr</th>
                <th className="py-2.5 px-4">Status &amp; Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE5D6]">
              {stores.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-sm text-[#6B5744]">
                    No transactions match these filters
                  </td>
                </tr>
              ) : (
                stores.map((s) => (
                  <tr
                    key={s.store}
                    onClick={() => {
                      setSelectedStore(s.store);
                      onToggleStoreFilter(s.store);
                    }}
                    className={`cursor-pointer transition-colors hover:bg-[#FAF6EE] ${
                      s.isUnderperforming ? 'bg-[#FDF4F2]' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-medium text-[#2B1B0E] whitespace-nowrap">
                      {s.store}{' '}
                      <span className="text-xs text-[#6B5744] font-normal">({s.province})</span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium">
                      <ValueOrNa value={formatCAD(s.sales)} />
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-[#6B5744]">
                      <ValueOrNa value={formatPercent(s.sharePct)} />
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {formatNumber(s.orders)}
                      {s.isSmallSample && (
                        <span className="block text-[10px] text-[#B83A28]">small sample</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {formatNumber(s.quantity)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      <ValueOrNa value={formatCAD(s.aov)} />
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      <ValueOrNa value={formatPercent(s.discountRate)} />
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right tabular-nums font-medium ${
                        s.changeVsPriorPct === null
                          ? 'text-[#6B5744]'
                          : s.changeVsPriorPct >= 0
                            ? 'text-[#607938]'
                            : 'text-[#B83A28]'
                      }`}
                    >
                      <ValueOrNa value={formatPercent(s.changeVsPriorPct, { signed: true })} />
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right tabular-nums font-medium ${
                        s.changeVsYoyPct === null
                          ? 'text-[#6B5744]'
                          : s.changeVsYoyPct >= 0
                            ? 'text-[#607938]'
                            : 'text-[#B83A28]'
                      }`}
                    >
                      <ValueOrNa value={formatPercent(s.changeVsYoyPct, { signed: true })} />
                    </td>
                    <td className="py-2.5 px-4 text-xs">
                      {s.isUnderperforming ? (
                        <div>
                          <span className="font-semibold text-[#B83A28]">Underperforming</span>
                          <p className="text-[#6B5744] mt-0.5">{s.underperformingReason}</p>
                        </div>
                      ) : (
                        <span className="font-semibold text-[#607938]">On track</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
