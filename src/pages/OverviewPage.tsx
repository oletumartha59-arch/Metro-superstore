import React, { useMemo } from 'react';
import * as echarts from 'echarts';
import {
  ArrowRight,
  Boxes,
  DollarSign,
  ShoppingCart,
  Tag,
  Wallet,
} from 'lucide-react';
import {
  ComputedAnalytics,
  FilterState,
  PageId,
  TrendGranularity,
} from '../types/sales';
import { KpiCard } from '../components/KpiCard';
import { ChartCard } from '../components/ChartCard';
import { ValueOrNa } from '../components/NaValue';
import { CHART_COLORS, CHART_PALETTE } from '../utils/echartsTheme';
import {
  formatCAD,
  formatCADFull,
  formatCompactNumber,
  formatNumber,
  formatPercent,
} from '../utils/formatters';

interface OverviewPageProps {
  analytics: ComputedAnalytics;
  filterSummary: string;
  loading: boolean;
  granularity: TrendGranularity;
  onChangeGranularity: (g: TrendGranularity) => void;
  filters: FilterState;
  onToggleFilter: (
    key: 'stores' | 'categories' | 'products',
    value: string
  ) => void;
  onNavigate: (page: PageId) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  analytics,
  filterSummary,
  loading,
  granularity,
  onChangeGranularity,
  onToggleFilter,
  onNavigate,
}) => {
  const { kpis, trend, categories, stores, top10Products, insights, questionCards } =
    analytics;

  const trendOption = useMemo<echarts.EChartsOption | null>(() => {
    if (trend.length === 0) return null;
    const peakPoint = trend.find((t) => t.isPeak);
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const list = Array.isArray(params) ? params : [];
          if (list.length === 0) return '';
          const idx = (list[0] as { dataIndex: number }).dataIndex;
          const p = trend[idx];
          if (!p) return '';
          return `
            <div style="font-weight:600;margin-bottom:4px;">${p.label}</div>
            <div>Net Sales: <b>${formatCADFull(p.sales)}</b></div>
            <div>Quantity: <b>${formatNumber(p.quantity)}</b> units</div>
            <div>Orders: <b>${formatNumber(p.orders)}</b></div>
          `;
        },
      },
      legend: {
        show: true,
        top: 0,
        right: 0,
        data: ['Net Sales (CAD)', 'Quantity (Units)'],
      },
      grid: { left: 64, right: 56, top: 44, bottom: 44 },
      xAxis: {
        type: 'category',
        data: trend.map((t) => t.label),
        axisLabel: {
          rotate: trend.length > 14 ? 30 : 0,
          hideOverlap: true,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Net Sales (CAD)',
          nameTextStyle: { color: CHART_COLORS.muted, fontSize: 11, align: 'left' },
          min: 0,
          axisLabel: {
            formatter: (v: number) => formatCAD(v, true),
          },
        },
        {
          type: 'value',
          name: 'Quantity (Units)',
          nameTextStyle: { color: CHART_COLORS.muted, fontSize: 11, align: 'right' },
          min: 0,
          splitLine: { show: false },
          axisLabel: {
            formatter: (v: number) => formatCompactNumber(v),
          },
        },
      ],
      series: [
        {
          name: 'Net Sales (CAD)',
          type: 'bar',
          yAxisIndex: 0,
          barMaxWidth: 32,
          itemStyle: { color: CHART_COLORS.navy, borderRadius: [4, 4, 0, 0] },
          data: trend.map((t) => Number(t.sales.toFixed(2))),
          label: {
            show: trend.length <= 16,
            position: 'top',
            fontSize: 10,
            color: CHART_COLORS.muted,
            formatter: (p) => formatCAD(Number(p.value), true),
          },
          markPoint: peakPoint
            ? {
                symbolSize: 42,
                itemStyle: { color: CHART_COLORS.teal },
                label: {
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: 600,
                  formatter: 'Peak',
                },
                data: [
                  {
                    name: 'Peak',
                    coord: [peakPoint.label, Number(peakPoint.sales.toFixed(2))],
                  },
                ],
              }
            : undefined,
        },
        {
          name: 'Quantity (Units)',
          type: 'line',
          yAxisIndex: 1,
          smooth: false,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: CHART_COLORS.teal, width: 2 },
          itemStyle: { color: CHART_COLORS.teal },
          data: trend.map((t) => t.quantity),
        },
      ],
    };
  }, [trend]);

  const categoryOption = useMemo<echarts.EChartsOption | null>(() => {
    if (categories.length === 0) return null;
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; percent: number };
          return `
            <div style="font-weight:600;margin-bottom:2px;">${p.name}</div>
            <div>Net Sales: <b>${formatCADFull(p.value)}</b></div>
            <div>Share: <b>${p.percent.toFixed(1)}%</b></div>
          `;
        },
      },
      series: [
        {
          name: 'Sales by Category',
          type: 'pie',
          radius: ['46%', '72%'],
          center: ['50%', '52%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: '#FFFFFF',
            borderWidth: 2,
          },
          label: {
            show: true,
            color: CHART_COLORS.ink,
            fontSize: 11,
            formatter: '{b}\n{d}%',
          },
          data: categories.map((c, idx) => ({
            name: c.category,
            value: Number(c.sales.toFixed(2)),
            itemStyle: { color: CHART_PALETTE[idx % CHART_PALETTE.length] },
          })),
        },
      ],
    };
  }, [categories]);

  const storeOption = useMemo<echarts.EChartsOption | null>(() => {
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
            <div style="font-weight:600;margin-bottom:4px;">${st.store} (${st.province})</div>
            <div>Net Sales: <b>${formatCADFull(st.sales)}</b></div>
            <div>Share: <b>${formatPercent(st.sharePct)}</b></div>
            <div>Orders: <b>${formatNumber(st.orders)}</b></div>
          `;
        },
      },
      grid: { left: 96, right: 64, top: 18, bottom: 38 },
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
          barMaxWidth: 22,
          data: stores.map((s) => ({
            value: Number(s.sales.toFixed(2)),
            itemStyle: {
              color: s.isUnderperforming ? CHART_COLORS.red : CHART_COLORS.navy,
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
        },
      ],
    };
  }, [stores]);

  const topProductsOption = useMemo<echarts.EChartsOption | null>(() => {
    if (top10Products.length === 0) return null;
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [];
          if (!arr.length) return '';
          const idx = (arr[0] as { dataIndex: number }).dataIndex;
          const prod = top10Products[idx];
          if (!prod) return '';
          return `
            <div style="font-weight:600;margin-bottom:4px;">${prod.product}</div>
            <div>Category: ${prod.category}</div>
            <div>Net Sales: <b>${formatCADFull(prod.sales)}</b></div>
            <div>Units Sold: <b>${formatNumber(prod.quantity)}</b></div>
          `;
        },
      },
      grid: { left: 175, right: 64, top: 18, bottom: 38 },
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
        data: top10Products.map((p) => p.product),
        axisLabel: {
          width: 160,
          overflow: 'truncate',
          color: CHART_COLORS.ink,
          fontSize: 11,
        },
      },
      series: [
        {
          name: 'Net Sales (CAD)',
          type: 'bar',
          barMaxWidth: 20,
          itemStyle: { color: CHART_COLORS.teal, borderRadius: [0, 4, 4, 0] },
          data: top10Products.map((p) => Number(p.sales.toFixed(2))),
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
  }, [top10Products]);

  return (
    <div className="space-y-4">
      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Total Sales (Net)"
          icon={<DollarSign className="w-[18px] h-[18px]" />}
          valueDisplay={formatCAD(kpis.totalSales.value, true)}
          fullValueTooltip={formatCADFull(kpis.totalSales.value)}
          priorDisplay={formatCAD(kpis.totalSales.priorValue, true)}
          changePct={kpis.totalSales.changePct}
          comparisonLabel={kpis.totalSales.comparisonLabel}
        />
        <KpiCard
          label="Total Quantity"
          icon={<Boxes className="w-[18px] h-[18px]" />}
          valueDisplay={formatCompactNumber(kpis.totalQuantity.value)}
          fullValueTooltip={`${formatNumber(kpis.totalQuantity.value)} units`}
          priorDisplay={formatCompactNumber(kpis.totalQuantity.priorValue)}
          changePct={kpis.totalQuantity.changePct}
          comparisonLabel={kpis.totalQuantity.comparisonLabel}
        />
        <KpiCard
          label="Orders"
          icon={<ShoppingCart className="w-[18px] h-[18px]" />}
          valueDisplay={formatCompactNumber(kpis.orders.value)}
          fullValueTooltip={`${formatNumber(kpis.orders.value)} distinct orders`}
          priorDisplay={formatCompactNumber(kpis.orders.priorValue)}
          changePct={kpis.orders.changePct}
          comparisonLabel={kpis.orders.comparisonLabel}
        />
        <KpiCard
          label="Average Order Value"
          icon={<Wallet className="w-[18px] h-[18px]" />}
          valueDisplay={formatCAD(kpis.aov.value)}
          fullValueTooltip={formatCADFull(kpis.aov.value)}
          priorDisplay={formatCAD(kpis.aov.priorValue)}
          changePct={kpis.aov.changePct}
          comparisonLabel={kpis.aov.comparisonLabel}
        />
        <KpiCard
          label="Total Discounts"
          icon={<Tag className="w-[18px] h-[18px]" />}
          valueDisplay={formatCAD(kpis.totalDiscounts.value, true)}
          fullValueTooltip={formatCADFull(kpis.totalDiscounts.value)}
          priorDisplay={formatCAD(kpis.totalDiscounts.priorValue, true)}
          changePct={kpis.totalDiscounts.changePct}
          comparisonLabel={kpis.totalDiscounts.comparisonLabel}
          topRightBadge={`${formatPercent(kpis.discountRate.value)} rate`}
        />
      </div>

      {/* Three Case-Study Question Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card-surface p-4 flex flex-col justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#22308F]">Underperforming stores</h2>
            <p className="text-xs sm:text-sm text-[#1B2233] mt-1 leading-relaxed">
              {questionCards.underperformingStores}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('stores')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#22308F] hover:underline self-start cursor-pointer"
          >
            <span>Inspect Stores</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="card-surface p-4 flex flex-col justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#22308F]">Discount impact</h2>
            <p className="text-xs sm:text-sm text-[#1B2233] mt-1 leading-relaxed">
              {questionCards.discountImpact}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('discounts')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#22308F] hover:underline self-start cursor-pointer"
          >
            <span>Inspect Discounts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="card-surface p-4 flex flex-col justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#22308F]">Top salespeople</h2>
            <p className="text-xs sm:text-sm text-[#1B2233] mt-1 leading-relaxed">
              {questionCards.topSalespeople}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('salespeople')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#22308F] hover:underline self-start cursor-pointer"
          >
            <span>Inspect Salespeople</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Primary Trend Chart + Insights Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard
          className="xl:col-span-2"
          title="Sales & Quantity Trend"
          subtitle={`Net Sales (CAD) and Units Sold · ${filterSummary}`}
          option={trendOption}
          loading={loading}
          isEmpty={trend.length === 0}
          height={320}
          headerRight={
            <div
              role="group"
              aria-label="Trend granularity"
              className="inline-flex items-center p-0.5 rounded-lg bg-[#F5F7FB] border border-[#E3E7EF]"
            >
              {(['monthly', 'weekly', 'daily'] as TrendGranularity[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => onChangeGranularity(g)}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                    granularity === g
                      ? 'bg-[#22308F] text-white'
                      : 'text-[#5B6475] hover:text-[#1B2233]'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          }
        />

        {/* Calculated Insights Panel */}
        <section className="card-surface p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-[#22308F]">Key Insights</h3>
            <p className="text-xs text-[#5B6475] mt-0.5">
              Calculated directly from matching transactions
            </p>
            <ul className="mt-4 space-y-2.5">
              {insights.map((sentence, idx) => (
                <li
                  key={idx}
                  className="text-xs sm:text-sm text-[#1B2233] leading-relaxed pl-3 border-l border-[#E3E7EF]"
                >
                  {sentence}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[11px] text-[#5B6475] mt-4 pt-3 border-t border-[#E3E7EF] tabular-nums flex items-center gap-1 flex-wrap">
            <span>Month-on-month net sales growth:</span>
            <ValueOrNa
              value={formatPercent(analytics.momGrowthPct, { signed: true })}
              className="font-semibold text-[#1B2233]"
            />
          </p>
        </section>
      </div>

      {/* Category Donut, Store Bars, Top 10 Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Sales by Category"
          subtitle={`Share of Net Sales (CAD) · Click slice to filter · ${filterSummary}`}
          option={categoryOption}
          loading={loading}
          isEmpty={categories.length === 0}
          height={310}
          onChartClick={(p) => {
            if (p.name) onToggleFilter('categories', p.name);
          }}
        />
        <ChartCard
          title="Sales by Store"
          subtitle={`Net Sales (CAD), red = underperforming · Click bar to filter`}
          option={storeOption}
          loading={loading}
          isEmpty={stores.length === 0}
          height={310}
          onChartClick={(p) => {
            if (p.name) onToggleFilter('stores', p.name);
          }}
        />
        <ChartCard
          title="Top 10 Products"
          subtitle={`Net Sales (CAD) · Click bar to filter · ${filterSummary}`}
          option={topProductsOption}
          loading={loading}
          isEmpty={top10Products.length === 0}
          height={310}
          onChartClick={(p) => {
            if (p.name) onToggleFilter('products', p.name);
          }}
        />
      </div>
    </div>
  );
};
