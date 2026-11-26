import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatPercent } from '../utils/formatters';
import { NaValue, ValueOrNa } from './NaValue';

interface KpiCardProps {
  label: string;
  icon: React.ReactNode;
  valueDisplay: string;
  fullValueTooltip?: string;
  priorDisplay: string;
  changePct: number | null;
  comparisonLabel?: string;
  topRightBadge?: string;
  secondaryNote?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  icon,
  valueDisplay,
  fullValueTooltip,
  priorDisplay,
  changePct,
  comparisonLabel,
  topRightBadge,
  secondaryNote,
}) => {
  const hasChange = changePct !== null && Number.isFinite(changePct);
  const isUp = hasChange && changePct > 0;
  const isDown = hasChange && changePct < 0;

  return (
    <div className="card-surface px-4 py-3.5 flex items-center gap-3.5 min-w-0 border-t-2 border-t-[#CE7F20]">
      <div
        className="w-10 h-10 rounded-xl bg-[#EEDFC7] border border-[#DFC9A6] text-[#533416] flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[#6B5744] truncate">{label}</span>
          {topRightBadge ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#EEDFC7] text-[#533416] tabular-nums shrink-0">
              {topRightBadge}
            </span>
          ) : null}
        </div>

        <div className="mt-1 flex items-baseline gap-2 flex-wrap">
          <span
            className="text-2xl sm:text-[26px] leading-tight font-bold text-[#2B1B0E] tabular-nums"
            title={fullValueTooltip || valueDisplay}
          >
            <ValueOrNa value={valueDisplay} />
          </span>

          {hasChange ? (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums shrink-0 ${
                isUp
                  ? 'text-[#607938]'
                  : isDown
                    ? 'text-[#B83A28]'
                    : 'text-[#6B5744]'
              }`}
              title={
                comparisonLabel
                  ? `${comparisonLabel} (${formatPercent(changePct, { signed: true })})`
                  : 'Change vs prior period'
              }
            >
              {isUp ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : isDown ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : null}
              <span>{formatPercent(changePct, { signed: true })}</span>
            </span>
          ) : (
            <NaValue
              className="text-xs shrink-0"
              title="No prior comparison window available"
            />
          )}
        </div>

        <div className="mt-1 text-[11px] text-[#6B5744] tabular-nums flex items-center gap-1 flex-wrap">
          {secondaryNote ? (
            <>
              <span>{secondaryNote}</span>
              <span aria-hidden="true">·</span>
            </>
          ) : comparisonLabel ? (
            <>
              <span>{comparisonLabel}</span>
              <span aria-hidden="true">·</span>
            </>
          ) : null}
          <span>vs PY:</span>
          <ValueOrNa value={priorDisplay} title="Previous Year value (Same Period Last Year)" />
        </div>
      </div>
    </div>
  );
};
