export interface Coordinate {
  lat: float;
  lon: float;
}

export type float = number;

export interface StopInput {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface LegDetail {
  from_stop_id: string;
  from_name: string;
  to_stop_id: string;
  to_name: string;
  distance_km: number;
  duration_minutes: number;
  departure_time: string;
  arrival_time: string;
  polyline_coords: [number, number][];
}

export interface OrderedStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  visit_index: number;
  eta: string;
  is_depot: boolean;
}

export interface RouteOptimizeRequest {
  depot: { lat: number; lon: number };
  stops: StopInput[];
  departure_time?: string;
  weather: 'clear' | 'rain';
  algorithm: 'astar' | 'dijkstra';
  use_ml: boolean;
}

export interface RouteOptimizeResponse {
  ordered_stops: OrderedStop[];
  legs: LegDetail[];
  total_distance_km: number;
  total_time_minutes: number;
  nodes_explored: number;
  compute_time_ms: number;
  two_opt_improvement_pct: number;
  two_opt_swaps: number;
  algorithm_used: string;
  ml_applied: boolean;
}

export interface GraphInfo {
  city_name: string;
  node_count: number;
  edge_count: number;
  bounding_box: {
    min_lat: number;
    min_lon: number;
    max_lat: number;
    max_lon: number;
  };
}

export interface MLMetrics {
  models: {
    [key: string]: {
      MAE_minutes: number;
      RMSE_minutes: number;
      R2_score: number;
    };
  };
  champion: string;
  sample_count: number;
  test_size: number;
}

export interface BenchmarkResult {
  num_pairs: number;
  dijkstra_avg_time_ms: number;
  dijkstra_avg_nodes: number;
  astar_avg_time_ms: number;
  astar_avg_nodes: number;
  node_reduction_pct: number;
  time_reduction_pct: number;
}
