import React, { useMemo } from 'react';
import * as echarts from 'echarts';
import { ComputedAnalytics } from '../types/sales';
import { ChartCard } from '../components/ChartCard';
import { ValueOrNa } from '../components/NaValue';
import { CHART_COLORS, CHART_PALETTE } from '../utils/echartsTheme';
import { formatCAD, formatCADFull, formatNumber, formatPercent } from '../utils/formatters';

interface ProductsPageProps {
  analytics: ComputedAnalytics;
  filterSummary: string;
  loading: boolean;
  onToggleFilter: (key: 'categories' | 'products', value: string) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  analytics,
  filterSummary,
  loading,
  onToggleFilter,
}) => {
  const { categories, top10Products, bottom10Products, allProducts } = analytics;

  const categoryBarOption = useMemo<echarts.EChartsOption | null>(() => {
    if (categories.length === 0) return null;
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [];
          if (!arr.length) return '';
          const idx = (arr[0] as { dataIndex: number }).dataIndex;
          const c = categories[idx];
          if (!c) return '';
          return `
            <div style="font-weight:600;margin-bottom:4px;color:${CHART_COLORS.espresso};">${c.category}</div>
            <div>Net Sales: <b>${formatCADFull(c.sales)}</b></div>
            <div>Share: <b>${formatPercent(c.sharePct)}</b></div>
            <div>Units Sold: <b>${formatNumber(c.quantity)}</b></div>
          `;
        },
      },
      grid: { left: 120, right: 64, top: 18, bottom: 38 },
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
        data: categories.map((c) => c.category),
        axisLabel: { color: CHART_COLORS.ink, fontSize: 11 },
      },
      series: [
        {
          name: 'Net Sales (CAD)',
          type: 'bar',
          barMaxWidth: 26,
          data: categories.map((c, idx) => ({
            value: Number(c.sales.toFixed(2)),
            itemStyle: {
              color: CHART_PALETTE[idx % CHART_PALETTE.length],
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
  }, [categories]);

  const scatterOption = useMemo<echarts.EChartsOption | null>(() => {
    if (allProducts.length === 0) return null;
    const catNames = categories.map((c) => c.category);

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as {
            data: {
              value: [number, number];
              productName: string;
              category: string;
              sales: number;
            };
          };
          const d = p.data;
          return `
            <div style="font-weight:600;margin-bottom:4px;color:${CHART_COLORS.espresso};">${d.productName}</div>
            <div>Category: <b>${d.category}</b></div>
            <div>Avg Unit Price: <b>${formatCADFull(d.value[0])}</b></div>
            <div>Units Sold: <b>${formatNumber(d.value[1])}</b></div>
            <div>Net Sales: <b>${formatCADFull(d.sales)}</b></div>
          `;
        },
      },
      legend: {
        show: catNames.length > 1,
        top: 0,
        right: 0,
        data: catNames,
      },
      grid: { left: 60, right: 24, top: 44, bottom: 44 },
      xAxis: {
        type: 'value',
        name: 'Average Unit Price (CAD)',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: CHART_COLORS.muted, fontSize: 11 },
        min: 0,
        axisLabel: { formatter: (v: number) => formatCAD(v, true) },
      },
      yAxis: {
        type: 'value',
        name: 'Units Sold',
        nameTextStyle: { color: CHART_COLORS.muted, fontSize: 11, align: 'left' },
        min: 0,
      },
      series: catNames.map((cat, idx) => ({
        name: cat,
        type: 'scatter' as const,
        symbolSize: 11,
        itemStyle: { color: CHART_PALETTE[idx % CHART_PALETTE.length] },
        data: allProducts
          .filter((p) => p.category === cat && p.avgUnitPrice !== null)
          .map((p) => ({
            value: [Number((p.avgUnitPrice ?? 0).toFixed(2)), p.quantity],
            productName: p.product,
            category: p.category,
            sales: p.sales,
          })),
      })),
    };
  }, [allProducts, categories]);

  return (
    <div className="space-y-4">
      {/* Category Bars + Price vs Units Scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Net Sales by Category"
          subtitle={`Net Sales (CAD) · Click bar to filter · ${filterSummary}`}
          option={categoryBarOption}
          loading={loading}
          isEmpty={categories.length === 0}
          height={320}
          onChartClick={(p) => {
            if (p.name) onToggleFilter('categories', p.name);
          }}
        />
        <ChartCard
          title="Unit Price vs. Units Sold by Product"
          subtitle={`Coloured by Category · Hover point for product name · ${filterSummary}`}
          option={scatterOption}
          loading={loading}
          isEmpty={!scatterOption}
          height={320}
          onChartClick={(p) => {
            const data = p.data as { productName?: string } | undefined;
            if (data?.productName) {
              onToggleFilter('products', data.productName);
            }
          }}
        />
      </div>

      {/* Top 10 & Bottom 10 Product Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="card-surface overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5D7C1]">
            <h3 className="text-[15px] font-semibold text-[#533416]">Top 10 Products</h3>
            <p className="text-xs text-[#6B5744]">
              Highest Net Sales (CAD). Click a row to filter everywhere.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#F5EDE0] border-b border-[#E5D7C1] text-xs font-semibold text-[#6B5744]">
                  <th className="py-2.5 px-4">Product</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Sales (CAD)</th>
                  <th className="py-2.5 px-3 text-right">Units</th>
                  <th className="py-2.5 px-4 text-right">Disc. Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE5D6]">
                {top10Products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-[#6B5744]">
                      No transactions match these filters
                    </td>
                  </tr>
                ) : (
                  top10Products.map((p) => (
                    <tr
                      key={p.product}
                      onClick={() => onToggleFilter('products', p.product)}
                      className="cursor-pointer hover:bg-[#FAF6EE]"
                    >
                      <td className="py-2.5 px-4 font-medium text-[#2B1B0E] max-w-[200px] truncate">
                        {p.product}
                      </td>
                      <td className="py-2.5 px-3 text-[#6B5744] whitespace-nowrap">
                        {p.category}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-medium">
                        <ValueOrNa value={formatCAD(p.sales)} />
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {formatNumber(p.quantity)}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums">
                        <ValueOrNa value={formatPercent(p.discountRate)} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card-surface overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5D7C1]">
            <h3 className="text-[15px] font-semibold text-[#533416]">Bottom 10 Products</h3>
            <p className="text-xs text-[#6B5744]">
              Lowest Net Sales (CAD) among active products. Click a row to filter.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#F5EDE0] border-b border-[#E5D7C1] text-xs font-semibold text-[#6B5744]">
                  <th className="py-2.5 px-4">Product</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Sales (CAD)</th>
                  <th className="py-2.5 px-3 text-right">Units</th>
                  <th className="py-2.5 px-4 text-right">Disc. Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE5D6]">
                {bottom10Products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-[#6B5744]">
                      No transactions match these filters
                    </td>
                  </tr>
                ) : (
                  bottom10Products.map((p) => (
                    <tr
                      key={p.product}
                      onClick={() => onToggleFilter('products', p.product)}
                      className="cursor-pointer hover:bg-[#FAF6EE]"
                    >
                      <td className="py-2.5 px-4 font-medium text-[#2B1B0E] max-w-[200px] truncate">
                        {p.product}
                      </td>
                      <td className="py-2.5 px-3 text-[#6B5744] whitespace-nowrap">
                        {p.category}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-medium">
                        <ValueOrNa value={formatCAD(p.sales)} />
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {formatNumber(p.quantity)}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums">
                        <ValueOrNa value={formatPercent(p.discountRate)} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
