import React from 'react';
import { CircleMinus } from 'lucide-react';

interface NaValueProps {
  title?: string;
  className?: string;
}

export const NaValue: React.FC<NaValueProps> = ({
  title = 'Not available for this selection or zero denominator',
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[#6B5744] font-medium tabular-nums ${className}`}
      title={title}
    >
      <CircleMinus className="w-3.5 h-3.5 shrink-0 opacity-80" aria-hidden="true" />
      <span>n/a</span>
    </span>
  );
};

interface ValueOrNaProps {
  value: string;
  title?: string;
  className?: string;
}

export const ValueOrNa: React.FC<ValueOrNaProps> = ({ value, title, className = '' }) => {
  if (value === 'n/a') {
    return <NaValue title={title} className={className} />;
  }
  return <span className={className}>{value}</span>;
};
