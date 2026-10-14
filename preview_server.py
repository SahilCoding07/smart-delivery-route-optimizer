"""
Lightweight Interactive Visual Preview Server for Phase 1.
Serves a Leaflet.js map connected directly to our from-scratch
Graph, Dijkstra, and A* implementations.
"""

import json
import time
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
import sys
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR / "backend"))

from app.core.graph import generate_synthetic_grid
from app.core.dijkstra import dijkstra
from app.core.astar import astar, make_haversine_heuristic

# 20x20 grid (400 nodes, 1520 edges) for instantaneous visual rendering in the browser
GRID = generate_synthetic_grid(rows=20, cols=20, step_km=0.4, seed=42)
HEURISTIC = make_haversine_heuristic()

HTML_PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RouteWise - Phase 1 Visual Algorithm Preview</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; height: 100vh; background: #0f172a; color: #f8fafc; }
    #sidebar { width: 380px; background: #1e293b; padding: 24px; display: flex; flex-direction: column; gap: 16px; box-shadow: 4px 0 20px rgba(0,0,0,0.4); z-index: 1000; overflow-y: auto; }
    #map { flex: 1; height: 100%; }
    h1 { font-size: 20px; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
    .badge { display: inline-block; padding: 2px 8px; background: #0369a1; border-radius: 999px; font-size: 11px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
    .section { background: #0f172a; padding: 14px; border-radius: 8px; border: 1px solid #334155; }
    .label { font-size: 12px; font-weight: 600; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; }
    .val { font-size: 14px; font-weight: 500; color: #f1f5f9; }
    button { background: #2563eb; color: white; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    button:hover { background: #1d4ed8; }
    button.secondary { background: #334155; }
    button.secondary:hover { background: #475569; }
    .btn-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
    .stat-card { background: #1e293b; padding: 10px; border-radius: 6px; border: 1px solid #334155; text-align: center; }
    .stat-num { font-size: 18px; font-weight: 700; color: #38bdf8; }
    .stat-desc { font-size: 11px; color: #94a3b8; }
    .comparison-card { margin-top: 8px; padding: 12px; background: #022c22; border: 1px solid #059669; border-radius: 6px; color: #6ee7b7; font-size: 13px; line-height: 1.4; }
  </style>
</head>
<body>
  <div id="sidebar">
    <div>
      <span class="badge">Phase 1 Preview</span>
      <h1>RouteWise Core DSA</h1>
      <p style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Direct visual verification of our from-scratch Graph, Min-Heap, Dijkstra & A* implementations.</p>
    </div>

    <div class="section">
      <div class="label">Instructions</div>
      <div class="val" style="font-size: 13px; line-height: 1.5; color: #cbd5e1;">
        • Click any green circle to set <b>Start (Source)</b>.<br>
        • Click any red circle to set <b>Destination (Target)</b>.<br>
        • Watch the algorithms find the optimal path!
      </div>
    </div>

    <div class="section">
      <div class="label">Active Points</div>
      <div style="font-size: 13px;">
        <div><b>Origin:</b> <span id="lbl-start" style="color: #4ade80;">n_0_0</span></div>
        <div style="margin-top: 4px;"><b>Target:</b> <span id="lbl-end" style="color: #f87171;">n_19_19</span></div>
      </div>
    </div>

    <div class="btn-row">
      <button onclick="runComparison()">⚡ Compare Both</button>
      <button class="secondary" onclick="pickRandom()">🎲 Random Pair</button>
    </div>

    <div class="section" id="results-box" style="display: none;">
      <div class="label">Algorithm Benchmark Result</div>
      
      <div style="font-size: 13px; margin-bottom: 6px;">
        <b>Total Distance:</b> <span id="stat-dist" style="color: #38bdf8; font-weight: bold;">--</span>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-desc">Dijkstra Explored</div>
          <div class="stat-num" id="d-nodes">--</div>
          <div class="stat-desc" id="d-time">-- ms</div>
        </div>
        <div class="stat-card">
          <div class="stat-desc">A* Explored</div>
          <div class="stat-num" style="color: #4ade80;" id="a-nodes">--</div>
          <div class="stat-desc" id="a-time">-- ms</div>
        </div>
      </div>

      <div class="comparison-card" id="stat-summary"></div>
    </div>
  </div>

  <div id="map"></div>

  <script>
    let map = L.map('map', { zoomControl: false }).setView([28.64, 77.24], 13);
    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    let startNode = "n_0_0";
    let endNode = "n_19_19";
    let gridData = null;
    let nodeMarkers = {};
    let pathLayer = null;

    // Fetch and render road grid
    fetch('/api/grid')
      .then(res => res.json())
      .then(data => {
        gridData = data;
        
        // Draw all road segments (edges)
        let edgeCoords = [];
        data.edges.forEach(e => {
          edgeCoords.push([[e.u_lat, e.u_lon], [e.v_lat, e.v_lon]]);
        });
        L.polyline(edgeCoords, { color: '#64748b', weight: 1.5, opacity: 0.5 }).addTo(map);

        // Draw node circles
        data.nodes.forEach(n => {
          let marker = L.circleMarker([n.lat, n.lon], {
            radius: 4,
            color: '#3b82f6',
            fillColor: '#60a5fa',
            fillOpacity: 0.6,
            weight: 1
          }).addTo(map);

          marker.on('click', () => {
            selectNode(n.id);
          });
          nodeMarkers[n.id] = marker;
        });

        // Fit map bounds
        map.fitBounds([
          [data.bbox[0], data.bbox[1]],
          [data.bbox[2], data.bbox[3]]
        ], { padding: [50, 50] });

        updateMarkers();
        runComparison();
      });

    let selectMode = 'end';
    function selectNode(id) {
      if (selectMode === 'end') {
        endNode = id;
        selectMode = 'start';
      } else {
        startNode = id;
        selectMode = 'end';
      }
      updateMarkers();
      runComparison();
    }

    function updateMarkers() {
      document.getElementById('lbl-start').innerText = startNode;
      document.getElementById('lbl-end').innerText = endNode;

      for (let id in nodeMarkers) {
        if (id === startNode) {
          nodeMarkers[id].setStyle({ radius: 8, color: '#15803d', fillColor: '#22c55e', fillOpacity: 1 });
        } else if (id === endNode) {
          nodeMarkers[id].setStyle({ radius: 8, color: '#b91c1c', fillColor: '#ef4444', fillOpacity: 1 });
        } else {
          nodeMarkers[id].setStyle({ radius: 4, color: '#3b82f6', fillColor: '#60a5fa', fillOpacity: 0.6 });
        }
      }
    }

    function pickRandom() {
      if (!gridData) return;
      let randA = gridData.nodes[Math.floor(Math.random() * gridData.nodes.length)].id;
      let randB = gridData.nodes[Math.floor(Math.random() * gridData.nodes.length)].id;
      startNode = randA;
      endNode = randB;
      updateMarkers();
      runComparison();
    }

    function runComparison() {
      if (!startNode || !endNode) return;
      
      fetch(`/api/compare?start=${startNode}&end=${endNode}`)
        .then(res => res.json())
        .then(res => {
          document.getElementById('results-box').style.display = 'block';
          document.getElementById('stat-dist').innerText = res.distance_km.toFixed(2) + ' km';
          document.getElementById('d-nodes').innerText = res.dijkstra.explored;
          document.getElementById('d-time').innerText = res.dijkstra.time_ms.toFixed(2) + ' ms';
          document.getElementById('a-nodes').innerText = res.astar.explored;
          document.getElementById('a-time').innerText = res.astar.time_ms.toFixed(2) + ' ms';

          let reduction = ((1 - res.astar.explored / res.dijkstra.explored) * 100).toFixed(1);
          document.getElementById('stat-summary').innerHTML = 
            `<b>A* explored ${reduction}% fewer nodes</b> than Dijkstra while finding the exact identical shortest path of ${res.distance_km.toFixed(2)} km!`;

          // Draw the shortest path polyline
          if (pathLayer) map.removeLayer(pathLayer);
          pathLayer = L.polyline(res.path_coords, {
            color: '#22c55e',
            weight: 5,
            opacity: 0.9,
            lineJoin: 'round'
          }).addTo(map);
        });
    }
  </script>
</body>
</html>
"""


class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/" or path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_PAGE.encode("utf-8"))
            return

        elif path == "/api/grid":
            nodes_list = []
            for n in GRID.nodes:
                lat, lon = GRID.get_coords(n)
                nodes_list.append({"id": n, "lat": lat, "lon": lon})

            edges_list = []
            for u in GRID.nodes:
                u_lat, u_lon = GRID.get_coords(u)
                for v, data in GRID.neighbors(u):
                    v_lat, v_lon = GRID.get_coords(v)
                    edges_list.append({
                        "u": u, "v": v,
                        "u_lat": u_lat, "u_lon": u_lon,
                        "v_lat": v_lat, "v_lon": v_lon,
                        "length_km": data.get("length_km", 0.4)
                    })

            res = {
                "nodes": nodes_list,
                "edges": edges_list,
                "bbox": list(GRID.bounding_box())
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        elif path == "/api/compare":
            start = query.get("start", [GRID.nodes[0]])[0]
            end = query.get("end", [GRID.nodes[-1]])[0]

            # Run Dijkstra
            t0 = time.perf_counter()
            d_path, d_cost, d_explored = dijkstra(GRID, start, end)
            t_dijkstra = (time.perf_counter() - t0) * 1000.0

            # Run A*
            t0 = time.perf_counter()
            a_path, a_cost, a_explored = astar(GRID, start, end, heuristic=HEURISTIC)
            t_astar = (time.perf_counter() - t0) * 1000.0

            path_coords = [list(GRID.get_coords(n)) for n in a_path]

            res = {
                "distance_km": a_cost if a_cost != float("inf") else 0.0,
                "path_node_ids": a_path,
                "path_coords": path_coords,
                "dijkstra": {
                    "explored": d_explored,
                    "time_ms": t_dijkstra,
                },
                "astar": {
                    "explored": a_explored,
                    "time_ms": t_astar,
                }
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        self.send_error(404, "Not Found")


if __name__ == "__main__":
    port = 8000
    server = HTTPServer(("127.0.0.1", port), PreviewHandler)
    print(f"============================================================")
    print(f"  RouteWise Phase 1 Visual Preview Server Running!")
    print(f"  Open in your browser: http://localhost:{port}")
    print(f"============================================================")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping preview server...")
        server.server_close()
