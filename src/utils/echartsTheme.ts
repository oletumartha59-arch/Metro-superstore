import * as echarts from 'echarts';

export const CHART_PALETTE = [
  '#22308F', // Navy
  '#0F9D8A', // Teal
  '#E0A100', // Amber
  '#6B778C', // Slate
  '#8FA3E8', // Light blue
] as const;

export const CHART_COLORS = {
  navy: '#22308F',
  teal: '#0F9D8A',
  amber: '#E0A100',
  slate: '#6B778C',
  lightBlue: '#8FA3E8',
  red: '#C8372D',
  ink: '#1B2233',
  muted: '#5B6475',
  border: '#E3E7EF',
} as const;

let themeRegistered = false;

export function ensureMetroChartTheme(): void {
  if (themeRegistered) return;
  echarts.registerTheme('metro-light', {
    color: [...CHART_PALETTE],
    backgroundColor: 'transparent',
    textStyle: {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: CHART_COLORS.ink,
    },
    title: {
      textStyle: {
        color: CHART_COLORS.ink,
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
      borderColor: '#E3E7EF',
      borderWidth: 1,
      textStyle: {
        color: CHART_COLORS.ink,
        fontSize: 12,
      },
      extraCssText: 'box-shadow: 0 4px 14px rgba(27, 34, 51, 0.08); border-radius: 8px;',
    },
    categoryAxis: {
      axisLine: {
        show: true,
        lineStyle: { color: '#E3E7EF' },
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
          color: '#EEF1F6',
          type: 'solid',
        },
      },
    },
  });
  themeRegistered = true;
}
