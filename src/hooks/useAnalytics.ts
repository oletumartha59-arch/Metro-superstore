import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ComputedAnalytics,
  FilterState,
  SalesStarModel,
  TrendGranularity,
} from '../types/sales';
import { computeAnalytics } from '../utils/analyticsEngine';

const WORKER_THRESHOLD = 20_000;

export function useAnalytics(
  model: SalesStarModel | null,
  filters: FilterState,
  thresholdPct: number,
  granularity: TrendGranularity
): { analytics: ComputedAnalytics | null; isComputing: boolean } {
  const useWorker = (model?.facts.length ?? 0) > WORKER_THRESHOLD;

  const syncResult = useMemo(() => {
    if (!model || useWorker) return null;
    return computeAnalytics(model, filters, thresholdPct, granularity);
  }, [model, useWorker, filters, thresholdPct, granularity]);

  const [workerResult, setWorkerResult] = useState<ComputedAnalytics | null>(null);
  const [isWorkerComputing, setIsWorkerComputing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!useWorker || !model) {
      setIsWorkerComputing(false);
      return;
    }

    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/analytics.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }

    const reqId = ++reqIdRef.current;
    setIsWorkerComputing(true);

    const worker = workerRef.current;
    const handleMessage = (e: MessageEvent<{ requestId: number; analytics: ComputedAnalytics }>) => {
      if (e.data.requestId === reqIdRef.current) {
        setWorkerResult(e.data.analytics);
        setIsWorkerComputing(false);
      }
    };

    worker.onmessage = handleMessage;
    worker.postMessage({
      requestId: reqId,
      model,
      filters,
      thresholdPct,
      granularity,
    });
  }, [useWorker, model, filters, thresholdPct, granularity]);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  if (!model) {
    return { analytics: null, isComputing: false };
  }

  if (useWorker) {
    return {
      analytics: workerResult,
      isComputing: isWorkerComputing || workerResult === null,
    };
  }

  return { analytics: syncResult, isComputing: false };
}
