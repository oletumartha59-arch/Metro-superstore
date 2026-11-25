import React, { useEffect, useMemo, useState } from 'react';
import * as echarts from 'echarts';
import { ComputedAnalytics } from '../types/sales';
import { ChartCard } from '../components/ChartCard';
import { ValueOrNa } from '../components/NaValue';
import { CHART_COLORS } from '../utils/echartsTheme';
import { formatCAD, formatCADFull, formatNumber, formatPercent } from '../utils/formatters';

interface SalespeoplePageProps {
  analytics: ComputedAnalytics;
  filterSummary: string;
  loading: boolean;
  onToggleSalespersonFilter: (name: string) => void;
}

export const SalespeoplePage: React.FC<SalespeoplePageProps> = ({
  analytics,
  filterSummary,
  loading,
  onToggleSalespersonFilter,
}) => {
  const { salespeople, salespersonMonthlyTrends } = analytics;
  const top10 = useMemo(() => salespeople.slice(0, 10), [salespeople]);
  const [selectedPerson, setSelectedPerson] = useState<string>('');

  useEffect(() => {
    if (salespeople.length === 0) {
      setSelectedPerson('');
    } else if (!selectedPerson || !salespeople.some((s) => s.salesperson === selectedPerson)) {
      setSelectedPerson(salespeople[0].salesperson);
    }
  }, [salespeople, selectedPerson]);

  const top10Option = useMemo<echarts.EChartsOption | null>(() => {
    if (top10.length === 0) return null;
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [];
          if (!arr.length) return '';
          const idx = (arr[0] as { dataIndex: number }).dataIndex;
          const sp = top10[idx];
          if (!sp) return '';
          return `
            <div style="font-weight:600;margin-bottom:4px;">#${sp.rank} ${sp.salesperson}</div>
            <div>Net Sales: <b>${formatCADFull(sp.sales)}</b></div>
            <div>Orders: <b>${formatNumber(sp.orders)}</b></div>
            <div>AOV: <b>${formatCADFull(sp.aov)}</b></div>
          `;
        },
      },
      grid: { left: 130, right: 68, top: 18, bottom: 38 },
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
        data: top10.map((s) => s.salesperson),
        axisLabel: {
          width: 115,
          overflow: 'truncate',
          color: CHART_COLORS.ink,
          fontSize: 11,
        },
      },
      series: [
        {
          name: 'Net Sales (CAD)',
          type: 'bar',
          barMaxWidth: 22,
          itemStyle: { color: CHART_COLORS.navy, borderRadius: [0, 4, 4, 0] },
          data: top10.map((s) => Number(s.sales.toFixed(2))),
          label: {
            show: true,
            position: 'right',
            fontSize: 11,
            color: CHART_COLORS.ink,
            formatter: (p) => formatCAD(Number(p.value), true),
          },
        },
      ],
    };
  }, [top10]);

  const selectedStat = useMemo(
    () => salespeople.find((s) => s.salesperson === selectedPerson) || null,
    [salespeople, selectedPerson]
  );

  const selectedTrend = selectedPerson ? salespersonMonthlyTrends[selectedPerson] ?? [] : [];

  const trendOption = useMemo<echarts.EChartsOption | null>(() => {
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
            <div style="font-weight:600;margin-bottom:2px;">${selectedPerson} · ${pt.label}</div>
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
        axisLabel: { rotate: selectedTrend.length > 10 ? 25 : 0, hideOverlap: true },
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
          itemStyle: { color: CHART_COLORS.teal, borderRadius: [4, 4, 0, 0] },
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
  }, [selectedTrend, selectedPerson]);

  const channelMixOption = useMemo<echarts.EChartsOption | null>(() => {
    if (!selectedStat || selectedStat.sales <= 0) return null;
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: () => `
          <div style="font-weight:600;margin-bottom:4px;">${selectedStat.salesperson} Channel Mix</div>
          <div>In-Store: <b>${formatCADFull(selectedStat.inStoreSales)}</b> (${formatPercent(
            selectedStat.inStoreSales / selectedStat.sales
          )})</div>
          <div>Online: <b>${formatCADFull(selectedStat.onlineSales)}</b> (${formatPercent(
            selectedStat.onlineSales / selectedStat.sales
          )})</div>
        `,
      },
      legend: {
        show: true,
        top: 0,
        right: 0,
        data: ['In-Store', 'Online'],
      },
      grid: { left: 24, right: 24, top: 44, bottom: 42 },
      xAxis: {
        type: 'value',
        name: 'Net Sales (CAD)',
        nameLocation: 'middle',
        nameGap: 26,
        nameTextStyle: { color: CHART_COLORS.muted, fontSize: 11 },
        min: 0,
        max: Number(selectedStat.sales.toFixed(2)),
        axisLabel: { formatter: (v: number) => formatCAD(v, true) },
      },
      yAxis: {
        type: 'category',
        data: [selectedStat.salesperson],
        axisLabel: { show: false },
      },
      series: [
        {
          name: 'In-Store',
          type: 'bar',
          stack: 'channel',
          barMaxWidth: 36,
          itemStyle: { color: CHART_COLORS.navy },
          data: [Number(selectedStat.inStoreSales.toFixed(2))],
          label: {
            show: selectedStat.inStoreSales > 0,
            position: 'inside',
            color: '#FFFFFF',
            fontSize: 11,
            formatter: () =>
              `In-Store ${formatPercent(selectedStat.inStoreSales / selectedStat.sales)}`,
          },
        },
        {
          name: 'Online',
          type: 'bar',
          stack: 'channel',
          barMaxWidth: 36,
          itemStyle: { color: CHART_COLORS.teal },
          data: [Number(selectedStat.onlineSales.toFixed(2))],
          label: {
            show: selectedStat.onlineSales > 0,
            position: 'inside',
            color: '#FFFFFF',
            fontSize: 11,
            formatter: () =>
              `Online ${formatPercent(selectedStat.onlineSales / selectedStat.sales)}`,
          },
        },
      ],
    };
  }, [selectedStat]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Top 10 Salespeople"
          subtitle={`Ranked strictly by Net Sales (CAD) · Click bar to inspect & filter · ${filterSummary}`}
          option={top10Option}
          loading={loading}
          isEmpty={top10.length === 0}
          height={320}
          onChartClick={(p) => {
            if (p.name) {
              setSelectedPerson(p.name);
              onToggleSalespersonFilter(p.name);
            }
          }}
        />

        <div className="space-y-4">
          <ChartCard
            title={
              selectedPerson
                ? `Monthly Trend — ${selectedPerson}`
                : 'Selected Salesperson Monthly Trend'
            }
            subtitle={`Net Sales (CAD) by month · ${filterSummary}`}
            option={trendOption}
            loading={loading}
            isEmpty={selectedTrend.length === 0}
            height={190}
            headerRight={
              salespeople.length > 0 ? (
                <select
                  aria-label="Select salesperson"
                  value={selectedPerson}
                  onChange={(e) => setSelectedPerson(e.target.value)}
                  className="h-8 px-2.5 text-xs border border-[#E3E7EF] rounded-lg bg-white text-[#1B2233]"
                >
                  {salespeople.map((sp) => (
                    <option key={sp.salesperson} value={sp.salesperson}>
                      #{sp.rank} {sp.salesperson}
                    </option>
                  ))}
                </select>
              ) : null
            }
          />

          <ChartCard
            title={
              selectedPerson ? `Channel Mix — ${selectedPerson}` : 'Salesperson Channel Mix'
            }
            subtitle={`In-Store vs. Online Net Sales (CAD) · ${filterSummary}`}
            option={channelMixOption}
            loading={loading}
            isEmpty={!channelMixOption}
            height={130}
          />
        </div>
      </div>

      {/* Leaderboard Table */}
      <section className="card-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E3E7EF] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[15px] font-semibold text-[#22308F]">
              Salesperson Leaderboard
            </h3>
            <p className="text-xs text-[#5B6475]">
              Ranked exclusively by Net Sales (CAD). Click a row to filter everywhere.
            </p>
          </div>
          <span className="text-xs text-[#5B6475] tabular-nums">
            {salespeople.length} salespeople
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#F5F7FB] border-b border-[#E3E7EF] text-xs font-semibold text-[#5B6475]">
                <th className="py-2.5 px-4 w-16">Rank</th>
                <th className="py-2.5 px-3">Salesperson</th>
                <th className="py-2.5 px-3 text-right">Net Sales (CAD)</th>
                <th className="py-2.5 px-3 text-right">Share</th>
                <th className="py-2.5 px-3 text-right">Orders</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-3 text-right">AOV</th>
                <th className="py-2.5 px-4 text-right">Discount Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF1F6]">
              {salespeople.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-[#5B6475]">
                    No transactions match these filters
                  </td>
                </tr>
              ) : (
                salespeople.map((sp) => (
                  <tr
                    key={sp.salesperson}
                    onClick={() => {
                      setSelectedPerson(sp.salesperson);
                      onToggleSalespersonFilter(sp.salesperson);
                    }}
                    className={`cursor-pointer transition-colors hover:bg-[#F5F7FB] ${
                      selectedPerson === sp.salesperson ? 'bg-[#F5F7FB]' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-semibold text-[#22308F] tabular-nums">
                      #{sp.rank}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#1B2233]">
                      {sp.salesperson}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium">
                      <ValueOrNa value={formatCAD(sp.sales)} />
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-[#5B6475]">
                      <ValueOrNa value={formatPercent(sp.sharePct)} />
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {formatNumber(sp.orders)}
                      {sp.isSmallSample && (
                        <span className="block text-[10px] text-[#C8372D]">small sample</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {formatNumber(sp.quantity)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      <ValueOrNa value={formatCAD(sp.aov)} />
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums">
                      <ValueOrNa value={formatPercent(sp.discountRate)} />
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
