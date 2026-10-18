import {
  GraphInfo,
  MLMetrics,
  BenchmarkResult,
  RouteOptimizeRequest,
  RouteOptimizeResponse,
} from '../types';

const API_BASE = 'http://127.0.0.1:8000/api';

export async function fetchHealth(): Promise<{ status: string; app: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to reach backend health endpoint');
  return res.json();
}

export async function fetchGraphInfo(): Promise<GraphInfo> {
  const res = await fetch(`${API_BASE}/graph/info`);
  if (!res.ok) throw new Error('Failed to fetch graph info');
  return res.json();
}

export async function optimizeRoute(
  payload: RouteOptimizeRequest
): Promise<RouteOptimizeResponse> {
  const res = await fetch(`${API_BASE}/route/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Route optimization failed with status ${res.status}`
    );
  }
  return res.json();
}

export async function fetchMLMetrics(): Promise<MLMetrics> {
  const res = await fetch(`${API_BASE}/ml/metrics`);
  if (!res.ok) throw new Error('Failed to fetch ML metrics');
  return res.json();
}

export async function runLiveBenchmark(pairs: number = 30): Promise<BenchmarkResult> {
  const res = await fetch(`${API_BASE}/benchmark/run?pairs=${pairs}`);
  if (!res.ok) throw new Error('Failed to run live benchmark');
  return res.json();
}
