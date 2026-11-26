import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FilterState,
  LoadError,
  PageId,
  RawSheetResponse,
  SalesStarModel,
  TrendGranularity,
} from './types/sales';
import { buildSampleSheetResponse } from './data/sampleData';
import { cleanAndValidateSheet } from './utils/dataCleaning';
import { parseCsvToSheetResponse } from './utils/csvParser';
import { useAnalytics } from './hooks/useAnalytics';
import {
  DEFAULT_FILTERS,
  describeActiveFilters,
  readStateFromUrl,
  writeStateToUrl,
} from './utils/urlSync';
import { LayoutShell } from './components/LayoutShell';
import { DataSourceBar } from './components/DataSourceBar';
import { SlicerBar } from './components/SlicerBar';
import { OverviewPage } from './pages/OverviewPage';
import { StoresPage } from './pages/StoresPage';
import { DiscountsPage } from './pages/DiscountsPage';
import { SalespeoplePage } from './pages/SalespeoplePage';
import { ProductsPage } from './pages/ProductsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AssistantPage } from './pages/AssistantPage';

const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzyVH9uXjj-l2NDL_RqJxbfb39z3wi4FtzpOArPRxnwtZcFvBrMgEIbz0f7fsBCMs7aFQ/exec';
const CASE1_CSV_URL = '/assets/aistudio/Case_1._Metro_Superstore_Sales_9db765cc.csv';
const STORAGE_KEY_URL = 'metro_superstore_apps_script_url';

function readStoredUrl(): string {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY_URL);
    return saved !== null ? saved : DEFAULT_APPS_SCRIPT_URL;
  } catch {
    return DEFAULT_APPS_SCRIPT_URL;
  }
}

function saveStoredUrl(url: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_URL, url);
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

function isValidHttpUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function App() {
  const initialUrlState = useMemo(() => readStateFromUrl(), []);
  const [activePage, setActivePage] = useState<PageId>(initialUrlState.page);
  const [filters, setFilters] = useState<FilterState>(initialUrlState.filters);
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => readStoredUrl());
  const [model, setModel] = useState<SalesStarModel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [thresholdPct, setThresholdPct] = useState<number>(20);
  const [granularity, setGranularity] = useState<TrendGranularity>('monthly');
  const [txFlaggedOnlyIntent, setTxFlaggedOnlyIntent] = useState<boolean>(false);

  // Sync page + filters to URL query string
  useEffect(() => {
    writeStateToUrl(activePage, filters);
  }, [activePage, filters]);

  const loadSampleData = useCallback((preserveError = false) => {
    const samplePayload = buildSampleSheetResponse();
    const { model: cleaned } = cleanAndValidateSheet(samplePayload, 'sample');
    if (cleaned) {
      setModel(cleaned);
    }
    if (!preserveError) {
      setLoadError(null);
    }
    setIsLoading(false);
  }, []);

  const loadCase1Csv = useCallback(
    async (preserveError = false) => {
      setIsLoading(true);
      if (!preserveError) {
        setLoadError(null);
      }

      try {
        const res = await fetch(CASE1_CSV_URL);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const csvText = await res.text();
        const payload = parseCsvToSheetResponse(csvText, 'Case 1. Metro Superstore Sales');
        const { model: cleaned, error } = cleanAndValidateSheet(payload, 'csv');
        if (error || !cleaned) {
          setLoadError(
            error ?? {
              type: 'network_error',
              title: 'Unable to parse CSV dataset',
              message: 'Check the CSV headers and rows.',
            }
          );
          if (!model) {
            loadSampleData(true);
          }
          return;
        }
        setModel(cleaned);
        if (!preserveError) {
          setLoadError(null);
        }
      } catch {
        setLoadError({
          type: 'network_error',
          title: 'Could not load Case 1 CSV dataset',
          message: 'Failed to load the attached CSV file. Falling back to built-in sample data.',
        });
        if (!model) {
          loadSampleData(true);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [loadSampleData, model]
  );

  const fetchLiveSheet = useCallback(
    async (targetUrl: string, fallbackToSampleOnFirstLoad = false) => {
      const trimmed = targetUrl.trim();
      if (!trimmed || !isValidHttpUrl(trimmed)) {
        setLoadError({
          type: 'bad_url',
          title: 'Invalid Apps Script URL',
          message:
            'Enter a valid https:// Google Apps Script web app URL ending in /exec, or switch to sample data.',
        });
        if (fallbackToSampleOnFirstLoad && !model) {
          loadSampleData(true);
        } else {
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 25_000);
        const res = await fetch(trimmed, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
        });
        window.clearTimeout(timeoutId);

        if (res.status === 401 || res.status === 403) {
          setLoadError({
            type: 'no_permission',
            title: 'No permission to read sheet',
            message: `HTTP ${res.status} returned. In Apps Script, deploy the web app with "Who has access: Anyone".`,
          });
          if (fallbackToSampleOnFirstLoad && !model) loadSampleData(true);
          return;
        }

        if (!res.ok) {
          setLoadError({
            type: 'network_error',
            title: `Request failed (HTTP ${res.status})`,
            message: 'The Apps Script URL returned an unexpected status code.',
          });
          if (fallbackToSampleOnFirstLoad && !model) loadSampleData(true);
          return;
        }

        const text = await res.text();
        let json: RawSheetResponse;
        try {
          json = JSON.parse(text) as RawSheetResponse;
        } catch {
          const looksLikeHtml = /<!doctype|<html/i.test(text);
          setLoadError({
            type: looksLikeHtml ? 'no_permission' : 'bad_url',
            title: looksLikeHtml
              ? 'Permission required or login redirect'
              : 'Response was not valid JSON',
            message: looksLikeHtml
              ? 'Google returned an HTML page instead of JSON. Deploy the Apps Script web app with access set to "Anyone".'
              : 'The URL did not return JSON in the expected { ok, sheet, headers, rows } shape.',
          });
          if (fallbackToSampleOnFirstLoad && !model) loadSampleData(true);
          return;
        }

        const { model: cleaned, error } = cleanAndValidateSheet(json, 'live');
        if (error || !cleaned) {
          setLoadError(
            error ?? {
              type: 'network_error',
              title: 'Unable to parse sheet',
              message: 'Check the sheet format and try again.',
            }
          );
          if (fallbackToSampleOnFirstLoad && !model) loadSampleData(true);
          return;
        }

        setModel(cleaned);
        setLoadError(null);
      } catch (err) {
        const isAbort = err instanceof Error && err.name === 'AbortError';
        setLoadError({
          type: 'network_error',
          title: isAbort ? 'Request timed out' : 'Network error',
          message:
            'Could not reach the Apps Script web app. Check your connection, URL, and CORS/deployment settings.',
        });
        if (fallbackToSampleOnFirstLoad && !model) {
          loadSampleData(true);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [loadSampleData, model]
  );

  // Initial load on mount: load the attached Case 1 CSV dataset directly
  useEffect(() => {
    void loadCase1Csv(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUrlSubmit = (newUrl: string) => {
    setAppsScriptUrl(newUrl);
    saveStoredUrl(newUrl);
    void fetchLiveSheet(newUrl, false);
  };

  const handleRefresh = () => {
    if (model?.sourceType === 'csv') {
      void loadCase1Csv(false);
    } else if (model?.sourceType === 'sample' && !appsScriptUrl.trim()) {
      loadSampleData(false);
    } else {
      void fetchLiveSheet(appsScriptUrl, false);
    }
  };

  const handleUseCase1Csv = () => {
    void loadCase1Csv(false);
  };

  const { analytics, isComputing } = useAnalytics(
    model,
    filters,
    thresholdPct,
    granularity
  );

  const toggleFilterMember = useCallback(
    (
      key:
        | 'stores'
        | 'categories'
        | 'salespeople'
        | 'provinces'
        | 'channels'
        | 'paymentMethods'
        | 'products',
      value: string
    ) => {
      setFilters((prev) => {
        const list = prev[key];
        const exists = list.includes(value);
        return {
          ...prev,
          [key]: exists ? list.filter((item) => item !== value) : [...list, value],
        };
      });
    },
    []
  );

  const handleClearAllFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  const filterSummary = useMemo(() => {
    if (!analytics) return 'All dates';
    return describeActiveFilters(
      filters,
      analytics.activeDateWindow.fromKey,
      analytics.activeDateWindow.toKey
    );
  }, [filters, analytics]);

  const emptyFacets = useMemo(
    () => ({
      years: [],
      stores: [],
      categories: [],
      salespeople: [],
      provinces: [],
      channels: [],
      paymentMethods: [],
    }),
    []
  );

  return (
    <LayoutShell
      activePage={activePage}
      onSelectPage={setActivePage}
      topSlot={
        <DataSourceBar
          url={appsScriptUrl}
          onUrlSubmit={handleUrlSubmit}
          onRefresh={handleRefresh}
          onUseCase1Csv={handleUseCase1Csv}
          isLoading={isLoading}
          error={loadError}
          model={model}
          onViewFlaggedTransactions={() => {
            setTxFlaggedOnlyIntent(true);
            setActivePage('transactions');
          }}
        />
      }
      slicerSlot={
        <SlicerBar
          filters={filters}
          facets={analytics?.facets ?? emptyFacets}
          matchingCount={analytics?.matchingCount ?? 0}
          minDateKey={model?.minDateKey ?? null}
          maxDateKey={model?.maxDateKey ?? null}
          onChangeFilters={setFilters}
          onClearAll={handleClearAllFilters}
        />
      }
    >
      {!model || !analytics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card-surface p-4 h-32 animate-pulse bg-white">
              <div className="h-3 w-24 bg-[#EFE5D6] rounded" />
              <div className="h-7 w-32 bg-[#EFE5D6] rounded mt-4" />
              <div className="h-3 w-20 bg-[#EFE5D6] rounded mt-4" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {activePage === 'overview' && (
            <OverviewPage
              analytics={analytics}
              filterSummary={filterSummary}
              loading={isLoading || isComputing}
              granularity={granularity}
              onChangeGranularity={setGranularity}
              filters={filters}
              onToggleFilter={toggleFilterMember}
              onNavigate={setActivePage}
            />
          )}

          {activePage === 'stores' && (
            <StoresPage
              analytics={analytics}
              filterSummary={filterSummary}
              loading={isLoading || isComputing}
              thresholdPct={thresholdPct}
              onChangeThresholdPct={setThresholdPct}
              onToggleStoreFilter={(store) => toggleFilterMember('stores', store)}
            />
          )}

          {activePage === 'discounts' && (
            <DiscountsPage
              analytics={analytics}
              filterSummary={filterSummary}
              loading={isLoading || isComputing}
              onToggleFilter={toggleFilterMember}
            />
          )}

          {activePage === 'salespeople' && (
            <SalespeoplePage
              analytics={analytics}
              filterSummary={filterSummary}
              loading={isLoading || isComputing}
              onToggleSalespersonFilter={(sp) => toggleFilterMember('salespeople', sp)}
            />
          )}

          {activePage === 'products' && (
            <ProductsPage
              analytics={analytics}
              filterSummary={filterSummary}
              loading={isLoading || isComputing}
              onToggleFilter={toggleFilterMember}
            />
          )}

          {activePage === 'transactions' && (
            <TransactionsPage
              model={model}
              filteredIndices={analytics.filteredIndices}
              initialFlaggedOnly={txFlaggedOnlyIntent}
              onConsumeFlaggedOnly={() => setTxFlaggedOnlyIntent(false)}
            />
          )}

          {activePage === 'assistant' && (
            <AssistantPage
              model={model}
              analytics={analytics}
              filterSummary={filterSummary}
            />
          )}
        </>
      )}
    </LayoutShell>
  );
}
