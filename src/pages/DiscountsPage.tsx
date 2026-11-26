import React, { useMemo } from 'react';
import * as echarts from 'echarts';
import { ComputedAnalytics } from '../types/sales';
import { ChartCard } from '../components/ChartCard';
import { NaValue, ValueOrNa } from '../components/NaValue';
import { CHART_COLORS } from '../utils/echartsTheme';
import {
  formatCAD,
  formatCADFull,
  formatCompactNumber,
  formatNumber,
  formatPercent,
} from '../utils/formatters';

interface DiscountsPageProps {
  analytics: ComputedAnalytics;
  filterSummary: string;
  loading: boolean;
  onToggleFilter: (key: 'categories' | 'stores', value: string) => void;
}

export const DiscountsPage: React.FC<DiscountsPageProps> = ({
  analytics,
  filterSummary,
  loading,
  onToggleFilter,
}) => {
  const {
    kpis,
    discountBuckets,
    discountByCategory,
    discountByStore,
    discountedVsFullPrice,
  } = analytics;

  const bucketOption = useMemo<echarts.EChartsOption | null>(() => {
    const hasData = discountBuckets.some((b) => b.sales > 0 || b.quantity > 0);
    if (!hasData) return null;

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [];
          if (!arr.length) return '';
          const idx = (arr[0] as { dataIndex: number }).dataIndex;
          const b = discountBuckets[idx];
          if (!b) return '';
          return `
            <div style="font-weight:600;margin-bottom:4px;color:${CHART_COLORS.espresso};">Discount Bucket: ${b.bucket}</div>
            <div>Net Sales: <b>${formatCADFull(b.sales)}</b></div>
            <div>Units Sold: <b>${formatNumber(b.quantity)}</b></div>
            <div>Orders: <b>${formatNumber(b.orders)}</b></div>
            <div>Avg Units / Order: <b>${
              b.avgUnitsPerOrder !== null ? b.avgUnitsPerOrder.toFixed(2) : 'n/a'
            }</b></div>
          `;
        },
      },
      legend: {
        show: true,
        top: 0,
        right: 0,
        data: ['Net Sales (CAD)', 'Units Sold'],
      },
      grid: { left: 64, right: 56, top: 44, bottom: 44 },
      xAxis: {
        type: 'category',
        name: 'Discount Rate Bucket',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: CHART_COLORS.muted, fontSize: 11 },
        data: discountBuckets.map((b) => b.bucket),
      },
      yAxis: [
        {
          type: 'value',
          name: 'Net Sales (CAD)',
          nameTextStyle: { color: CHART_COLORS.muted, fontSize: 11, align: 'left' },
          min: 0,
          axisLabel: { formatter: (v: number) => formatCAD(v, true) },
        },
        {
          type: 'value',
          name: 'Units Sold',
          nameTextStyle: { color: CHART_COLORS.muted, fontSize: 11, align: 'right' },
          min: 0,
          splitLine: { show: false },
          axisLabel: { formatter: (v: number) => formatCompactNumber(v) },
        },
      ],
      series: [
        {
          name: 'Net Sales (CAD)',
          type: 'bar',
          yAxisIndex: 0,
          barMaxWidth: 36,
          itemStyle: { color: CHART_COLORS.espresso, borderRadius: [4, 4, 0, 0] },
          data: discountBuckets.map((b) => Number(b.sales.toFixed(2))),
          label: {
            show: true,
            position: 'top',
            fontSize: 10,
            color: CHART_COLORS.ink,
            formatter: (p) => formatCAD(Number(p.value), true),
          },
        },
        {
          name: 'Units Sold',
          type: 'line',
          yAxisIndex: 1,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { color: CHART_COLORS.olive, width: 2.5 },
          itemStyle: { color: CHART_COLORS.olive },
          data: discountBuckets.map((b) => b.quantity),
        },
      ],
    };
  }, [discountBuckets]);

  const shareOption = useMemo<echarts.EChartsOption | null>(() => {
    const total =
      discountedVsFullPrice.discountedSales + discountedVsFullPrice.fullPriceSales;
    if (total <= 0) return null;

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; percent: number };
          return `
            <div style="font-weight:600;margin-bottom:2px;color:${CHART_COLORS.espresso};">${p.name}</div>
            <div>Net Sales: <b>${formatCADFull(p.value)}</b></div>
            <div>Share: <b>${p.percent.toFixed(1)}%</b></div>
          `;
        },
      },
      series: [
        {
          name: 'Sales Split',
          type: 'pie',
          radius: ['46%', '72%'],
          center: ['50%', '52%'],
          itemStyle: { borderColor: '#FFFFFF', borderWidth: 2 },
          label: {
            show: true,
            fontSize: 11,
            color: CHART_COLORS.ink,
            formatter: '{b}\n{d}%',
          },
          data: [
            {
              name: 'Discounted Sales',
              value: Number(discountedVsFullPrice.discountedSales.toFixed(2)),
              itemStyle: { color: CHART_COLORS.amber },
            },
            {
              name: 'Full-Price Sales',
              value: Number(discountedVsFullPrice.fullPriceSales.toFixed(2)),
              itemStyle: { color: CHART_COLORS.espresso },
            },
          ],
        },
      ],
    };
  }, [discountedVsFullPrice]);

  const catDiscountOption = useMemo<echarts.EChartsOption | null>(() => {
    if (discountByCategory.length === 0) return null;
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [];
          if (!arr.length) return '';
          const idx = (arr[0] as { dataIndex: number }).dataIndex;
          const c = discountByCategory[idx];
          if (!c) return '';
          return `
            <div style="font-weight:600;margin-bottom:4px;color:${CHART_COLORS.espresso};">${c.category}</div>
            <div>Discount Amount: <b>${formatCADFull(c.discountAmount)}</b></div>
            <div>Discount Rate: <b>${formatPercent(c.discountRate)}</b></div>
          `;
        },
      },
      grid: { left: 120, right: 64, top: 18, bottom: 38 },
      xAxis: {
        type: 'value',
        name: 'Discount Amount (CAD)',
        nameLocation: 'middle',
        nameGap: 26,
        nameTextStyle: { color: CHART_COLORS.muted, fontSize: 11 },
        min: 0,
        axisLabel: { formatter: (v: number) => formatCAD(v, true) },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: discountByCategory.map((c) => c.category),
        axisLabel: { color: CHART_COLORS.ink, fontSize: 11 },
      },
      series: [
        {
          name: 'Discount Amount (CAD)',
          type: 'bar',
          barMaxWidth: 24,
          itemStyle: { color: CHART_COLORS.amber, borderRadius: [0, 4, 4, 0] },
          data: discountByCategory.map((c) => Number(c.discountAmount.toFixed(2))),
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
  }, [discountByCategory]);

  const storeDiscountOption = useMemo<echarts.EChartsOption | null>(() => {
    if (discountByStore.length === 0) return null;
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [];
          if (!arr.length) return '';
          const idx = (arr[0] as { dataIndex: number }).dataIndex;
          const s = discountByStore[idx];
          if (!s) return '';
          return `
            <div style="font-weight:600;margin-bottom:4px;color:${CHART_COLORS.espresso};">${s.store}</div>
            <div>Discount Amount: <b>${formatCADFull(s.discountAmount)}</b></div>
            <div>Discount Rate: <b>${formatPercent(s.discountRate)}</b></div>
          `;
        },
      },
      grid: { left: 96, right: 64, top: 18, bottom: 38 },
      xAxis: {
        type: 'value',
        name: 'Discount Amount (CAD)',
        nameLocation: 'middle',
        nameGap: 26,
        nameTextStyle: { color: CHART_COLORS.muted, fontSize: 11 },
        min: 0,
        axisLabel: { formatter: (v: number) => formatCAD(v, true) },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: discountByStore.map((s) => s.store),
        axisLabel: { color: CHART_COLORS.ink, fontSize: 11 },
      },
      series: [
        {
          name: 'Discount Amount (CAD)',
          type: 'bar',
          barMaxWidth: 24,
          itemStyle: { color: CHART_COLORS.olive, borderRadius: [0, 4, 4, 0] },
          data: discountByStore.map((s) => Number(s.discountAmount.toFixed(2))),
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
  }, [discountByStore]);

  const topCat = discountByCategory[0];
  const topStore = discountByStore[0];
  const zeroBucket = discountBuckets.find((b) => b.bucket === '0%');
  const deepBucket = discountBuckets.find((b) => b.bucket === '20%+');

  const avg0 = zeroBucket?.avgUnitsPerOrder ?? null;
  const avgDeep = deepBucket?.avgUnitsPerOrder ?? null;
  const unitsRelationText =
    avg0 !== null && avgDeep !== null
      ? avgDeep > avg0
        ? `Orders at 20%+ discount averaged ${avgDeep.toFixed(2)} units per order versus ${avg0.toFixed(2)} units at 0% discount (${(avgDeep - avg0).toFixed(2)} more units per order).`
        : avgDeep < avg0
          ? `Orders at 20%+ discount averaged ${avgDeep.toFixed(2)} units per order versus ${avg0.toFixed(2)} units at 0% discount (${(avg0 - avgDeep).toFixed(2)} fewer units per order).`
          : `Orders at 20%+ discount and 0% discount both averaged ${avg0.toFixed(2)} units per order.`
      : 'Not enough orders across both 0% and 20%+ discount tiers to compare order unit sizes.';

  return (
    <div className="space-y-4">
      {/* Answer in Numbers Summary */}
      <section className="card-surface p-5 space-y-3">
        <h2 className="text-base font-semibold text-[#533416]">
          Discount Impact Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm text-[#2B1B0E]">
          <div className="p-3.5 rounded-xl bg-[#FAF6EE] border border-[#E5D7C1]">
            <p className="text-xs font-medium text-[#6B5744]">Revenue Given Away</p>
            <p className="text-xl font-bold text-[#533416] tabular-nums mt-1">
              <ValueOrNa value={formatCAD(kpis.totalDiscounts.value)} />
            </p>
            <p className="text-xs text-[#6B5744] mt-1 tabular-nums flex items-center gap-1 flex-wrap">
              <span>Effective discount rate:</span>
              <ValueOrNa value={formatPercent(kpis.discountRate.value)} className="font-semibold text-[#8F5109]" />
              <span>of gross sales</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF6EE] border border-[#E5D7C1]">
            <p className="text-xs font-medium text-[#6B5744]">Highest Discount Volume</p>
            <p className="text-sm font-semibold text-[#2B1B0E] mt-1 flex items-center gap-1 flex-wrap">
              <span>Category:</span>
              {topCat ? `${topCat.category} (${formatCAD(topCat.discountAmount)})` : <NaValue />}
            </p>
            <p className="text-xs text-[#6B5744] mt-1 flex items-center gap-1 flex-wrap">
              <span>Store:</span>
              {topStore ? `${topStore.store} (${formatCAD(topStore.discountAmount)})` : <NaValue />}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#EEDFC7]/55 border border-[#DFC9A6]">
            <p className="text-xs font-medium text-[#533416]">Units per Order vs. Discount Depth</p>
            <p className="text-xs text-[#2B1B0E] mt-1 leading-relaxed">{unitsRelationText}</p>
            <p className="text-[11px] font-medium text-[#6B5744] mt-1.5">
              This observed relationship in the data does not prove cause.
            </p>
          </div>
        </div>
      </section>

      {/* Discount Buckets & Full-price vs Discounted Share */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          className="lg:col-span-2"
          title="Sales and Units by Discount Rate Bucket"
          subtitle={`Net Sales (CAD) and Units Sold across rate tiers · ${filterSummary}`}
          option={bucketOption}
          loading={loading}
          isEmpty={!bucketOption}
          height={310}
        />
        <ChartCard
          title="Discounted vs. Full-Price Sales"
          subtitle={`Share of Net Sales (CAD) · ${filterSummary}`}
          option={shareOption}
          loading={loading}
          isEmpty={!shareOption}
          height={310}
        />
      </div>

      {/* Discount Amount by Category & Store */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Discount Amount by Category"
          subtitle={`Total Discounts (CAD) · Click bar to filter · ${filterSummary}`}
          option={catDiscountOption}
          loading={loading}
          isEmpty={discountByCategory.length === 0}
          height={300}
          onChartClick={(p) => {
            if (p.name) onToggleFilter('categories', p.name);
          }}
        />
        <ChartCard
          title="Discount Amount by Store"
          subtitle={`Total Discounts (CAD) · Click bar to filter · ${filterSummary}`}
          option={storeDiscountOption}
          loading={loading}
          isEmpty={discountByStore.length === 0}
          height={300}
          onChartClick={(p) => {
            if (p.name) onToggleFilter('stores', p.name);
          }}
        />
      </div>

      {/* Discount Bucket Detail Table */}
      <section className="card-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5D7C1]">
          <h3 className="text-[15px] font-semibold text-[#533416]">
            Discount Bucket Breakdown
          </h3>
          <p className="text-xs text-[#6B5744]">
            Comparison of order volume and average units per order across discount tiers (correlation does not establish causation)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#F5EDE0] border-b border-[#E5D7C1] text-xs font-semibold text-[#6B5744]">
                <th className="py-2.5 px-4">Discount Bucket</th>
                <th className="py-2.5 px-3 text-right">Net Sales (CAD)</th>
                <th className="py-2.5 px-3 text-right">Discount Given (CAD)</th>
                <th className="py-2.5 px-3 text-right">Orders</th>
                <th className="py-2.5 px-3 text-right">Total Units</th>
                <th className="py-2.5 px-3 text-right">Avg Units / Order</th>
                <th className="py-2.5 px-4 text-right">AOV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE5D6]">
              {discountBuckets.map((b) => (
                <tr key={b.bucket} className="hover:bg-[#FAF6EE]">
                  <td className="py-2.5 px-4 font-semibold text-[#533416]">{b.bucket}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    <ValueOrNa value={formatCAD(b.sales)} />
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-[#8F5109] font-medium">
                    <ValueOrNa value={formatCAD(b.discountAmount)} />
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatNumber(b.orders)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatNumber(b.quantity)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-medium">
                    {b.avgUnitsPerOrder !== null ? b.avgUnitsPerOrder.toFixed(2) : <NaValue />}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums">
                    <ValueOrNa value={formatCAD(b.aov)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
