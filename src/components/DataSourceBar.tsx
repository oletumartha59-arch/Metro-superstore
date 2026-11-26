import React, { useState } from 'react';
import { RefreshCw, FileSpreadsheet, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { LoadError, SalesStarModel } from '../types/sales';
import { formatDateTimeDisplay } from '../utils/formatters';

interface DataSourceBarProps {
  url: string;
  onUrlSubmit: (newUrl: string) => void;
  onRefresh: () => void;
  onUseCase1Csv: () => void;
  isLoading: boolean;
  error: LoadError | null;
  model: SalesStarModel | null;
  onViewFlaggedTransactions?: () => void;
}

export const DataSourceBar: React.FC<DataSourceBarProps> = ({
  url,
  onUrlSubmit,
  onRefresh,
  onUseCase1Csv,
  isLoading,
  error,
  model,
  onViewFlaggedTransactions,
}) => {
  const [inputUrl, setInputUrl] = useState(url);

  React.useEffect(() => {
    setInputUrl(url);
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUrlSubmit(inputUrl.trim());
  };

  return (
    <div className="space-y-3">
      <div className="card-surface px-4 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col sm:flex-row gap-2 min-w-0">
            <label htmlFor="apps-script-url" className="sr-only">
              Google Apps Script Web App URL
            </label>
            <div className="relative flex-1 min-w-0">
              <input
                id="apps-script-url"
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Paste Google Apps Script web app URL (https://script.google.com/macros/s/.../exec)"
                className="w-full h-9 px-3 text-xs sm:text-sm bg-[#FAF6EE] border border-[#E5D7C1] rounded-lg text-[#2B1B0E] placeholder-[#6B5744] focus:bg-white transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="submit"
                disabled={isLoading}
                className="h-9 px-3.5 rounded-lg bg-[#533416] text-white text-xs sm:text-sm font-medium hover:bg-[#3F260E] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isLoading ? 'Loading…' : 'Load URL'}
              </button>
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-9 px-3 rounded-lg border border-[#E5D7C1] bg-white text-[#2B1B0E] text-xs sm:text-sm font-medium hover:bg-[#FAF6EE] disabled:opacity-60 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                title="Refresh data from the active source"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#533416] ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={onUseCase1Csv}
                disabled={isLoading}
                className="h-9 px-3 rounded-lg border border-[#E5D7C1] bg-white text-[#2B1B0E] text-xs sm:text-sm font-medium hover:bg-[#FAF6EE] disabled:opacity-60 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                title="Load the attached Case 1 Metro Superstore CSV dataset"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#8F5109]" />
                <span>Use Case 1 CSV</span>
              </button>
            </div>
          </form>

          {model && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B5744] lg:border-l lg:border-[#E5D7C1] lg:pl-3 shrink-0">
              {model.sourceType === 'csv' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EEDFC7] text-[#533416] font-semibold">
                  Case 1 CSV
                </span>
              ) : model.sourceType === 'sample' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#EEDFC7] text-[#533416] font-semibold">
                  Sample data
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[#607938] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Live sheet
                </span>
              )}
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {model.verifiedCount.toLocaleString()} of {model.totalCount.toLocaleString()} rows verified
              </span>
              {model.flaggedCount > 0 && onViewFlaggedTransactions ? (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={onViewFlaggedTransactions}
                    className="text-[#B83A28] font-medium hover:underline cursor-pointer tabular-nums"
                  >
                    {model.flaggedCount.toLocaleString()} flagged
                  </button>
                </>
              ) : null}
              <span aria-hidden="true">·</span>
              <span title={`Loaded at ${model.loadedAt}`}>
                Updated {formatDateTimeDisplay(model.updatedAt)}
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-[14px] border border-[#EBC5BE] bg-[#FDF1EE] px-4 py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertTriangle className="w-4 h-4 text-[#B83A28] mt-0.5 shrink-0" />
            <div className="text-xs sm:text-sm text-[#2B1B0E] space-y-1 min-w-0">
              <p className="font-semibold text-[#B83A28]">{error.title}</p>
              <p className="text-[#6B5744]">{error.message}</p>
              {error.missingColumns && error.missingColumns.length > 0 && (
                <p className="text-xs text-[#2B1B0E] break-words">
                  <span className="font-semibold">Missing columns:</span>{' '}
                  {error.missingColumns.join(', ')}
                </p>
              )}
              {model && (
                <p className="text-xs text-[#6B5744]">
                  Showing last good data ({model.sourceType === 'csv' ? 'Case 1 CSV' : model.sourceType === 'sample' ? 'Sample data' : model.sheetName}, loaded{' '}
                  {formatDateTimeDisplay(model.loadedAt)}).
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRefresh}
              className="h-8 px-3 rounded-lg bg-[#B83A28] text-white text-xs font-medium hover:bg-[#992F20] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={onUseCase1Csv}
              className="h-8 px-3 rounded-lg border border-[#E5D7C1] bg-white text-[#2B1B0E] text-xs font-medium hover:bg-[#FAF6EE] transition-colors whitespace-nowrap cursor-pointer"
            >
              Use Case 1 CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
