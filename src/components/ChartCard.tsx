import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ensureMetroChartTheme } from '../utils/echartsTheme';

interface ChartCardProps {
  title: string;
  subtitle: string;
  option: echarts.EChartsOption | null;
  loading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  height?: number;
  headerRight?: React.ReactNode;
  onChartClick?: (params: echarts.ECElementEvent) => void;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  option,
  loading = false,
  isEmpty = false,
  emptyMessage = 'No transactions match these filters',
  height = 300,
  headerRight,
  onChartClick,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const clickHandlerRef = useRef(onChartClick);
  clickHandlerRef.current = onChartClick;

  useEffect(() => {
    ensureMetroChartTheme();
    const el = containerRef.current;
    if (!el) return;

    const instance = echarts.init(el, 'metro-light', { renderer: 'canvas' });
    chartInstanceRef.current = instance;

    instance.on('click', (params) => {
      if (clickHandlerRef.current) {
        clickHandlerRef.current(params);
      }
    });

    const observer = new ResizeObserver(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        chartInstanceRef.current?.resize();
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const instance = chartInstanceRef.current;
    if (!instance) return;

    if (loading || isEmpty || !option) {
      if (isEmpty || !option) {
        instance.clear();
      }
      return;
    }

    instance.setOption(option, { notMerge: true });
    if (containerRef.current && containerRef.current.clientWidth > 0) {
      instance.resize();
    }
  }, [option, loading, isEmpty]);

  const showEmpty = !loading && (isEmpty || !option);

  return (
    <section
      className={`card-surface p-5 flex flex-col ${className}`}
      aria-label={title}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-[#22308F] leading-snug truncate">
            {title}
          </h3>
          <p className="text-xs text-[#5B6475] mt-0.5 truncate" title={subtitle}>
            {subtitle}
          </p>
        </div>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </div>

      <div style={{ height }} className="relative w-full">
        {/* Isolated ECharts host: React never mounts/unmounts children inside this node */}
        <div
          key="echarts-host"
          ref={containerRef}
          className={`w-full h-full ${onChartClick && !loading && !showEmpty ? 'cursor-pointer' : ''} ${
            loading || showEmpty ? 'invisible' : 'visible'
          }`}
        />

        {loading ? (
          <div
            key="chart-loading"
            className="absolute inset-0 z-10 w-full h-full rounded-lg bg-[#F5F7FB] animate-pulse flex items-center justify-center"
            aria-busy="true"
          >
            <span className="text-xs text-[#5B6475]">Loading chart…</span>
          </div>
        ) : null}

        {showEmpty ? (
          <div
            key="chart-empty"
            className="absolute inset-0 z-10 w-full h-full rounded-lg border border-dashed border-[#E3E7EF] bg-[#FAFBFD] flex flex-col items-center justify-center px-4 text-center"
          >
            <p className="text-sm font-medium text-[#5B6475]">{emptyMessage}</p>
            <p className="text-xs text-[#5B6475] mt-1">
              Adjust the slicers above to view matching transactions.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
};
