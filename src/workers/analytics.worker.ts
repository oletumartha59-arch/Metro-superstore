import {
  ComputedAnalytics,
  FilterState,
  SalesStarModel,
  TrendGranularity,
} from '../types/sales';
import { computeAnalytics } from '../utils/analyticsEngine';

interface WorkerRequest {
  requestId: number;
  model: SalesStarModel;
  filters: FilterState;
  thresholdPct: number;
  granularity: TrendGranularity;
}

interface WorkerResponse {
  requestId: number;
  analytics: ComputedAnalytics;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { requestId, model, filters, thresholdPct, granularity } = event.data;
  const analytics = computeAnalytics(model, filters, thresholdPct, granularity);
  const response: WorkerResponse = { requestId, analytics };
  self.postMessage(response);
};
