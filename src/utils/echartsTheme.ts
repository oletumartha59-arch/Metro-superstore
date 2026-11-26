import * as echarts from 'echarts';

export const CHART_PALETTE = [
  '#533416', // Deep Espresso
  '#CE7F20', // Warm Amber
  '#607938', // Olive Sage
  '#9C7A54', // Roasted Chestnut
  '#C7A97F', // Toasted Oat
] as const;

export const CHART_COLORS = {
  espresso: '#533416',
  amber: '#CE7F20',
  amberText: '#8F5109',
  olive: '#607938',
  oat: '#EEDFC7',
  taupe: '#9C7A54',
  red: '#B83A28',
  ink: '#2B1B0E',
  muted: '#6B5744',
  border: '#E5D7C1',
} as const;

let themeRegistered = false;

export function ensureMetroChartTheme(): void {
  if (themeRegistered) return;
  echarts.registerTheme('metro-light', {
    color: [...CHART_PALETTE],
    backgroundColor: 'transparent',
    textStyle: {
      fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: CHART_COLORS.ink,
    },
    title: {
      textStyle: {
        color: CHART_COLORS.espresso,
        fontWeight: 600,
      },
      subtextStyle: {
        color: CHART_COLORS.muted,
      },
    },
    legend: {
      textStyle: {
        color: CHART_COLORS.muted,
        fontSize: 12,
      },
      itemWidth: 12,
      itemHeight: 8,
    },
    tooltip: {
      backgroundColor: '#FFFFFF',
      borderColor: '#E5D7C1',
      borderWidth: 1,
      textStyle: {
        color: CHART_COLORS.ink,
        fontSize: 12,
      },
      extraCssText: 'box-shadow: 0 6px 18px rgba(83, 52, 22, 0.12); border-radius: 10px;',
    },
    categoryAxis: {
      axisLine: {
        show: true,
        lineStyle: { color: '#E5D7C1' },
      },
      axisTick: { show: false },
      axisLabel: {
        color: CHART_COLORS.muted,
        fontSize: 11,
      },
      splitLine: { show: false }, // Never vertical gridlines
    },
    valueAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: CHART_COLORS.muted,
        fontSize: 11,
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#EFE5D6',
          type: 'solid',
        },
      },
    },
  });
  themeRegistered = true;
}
