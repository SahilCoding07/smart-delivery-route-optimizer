# 📘 RouteWise Algorithm & Data Structures Technical Manual

This document provides a comprehensive technical breakdown of every data structure and algorithm implemented in RouteWise. All algorithms are coded from scratch without external library wrappers.

---

## 1. Hand-Written Binary Min-Heap (`core/heap.py`)

A priority queue data structure implementing a complete binary tree over a dynamic array.

### Mathematical Invariants
For any element at index $i$:
- **Parent Index:** $\lfloor(i - 1) / 2\rfloor$
- **Left Child:** $2i + 1$
- **Right Child:** $2i + 2$
- **Min-Heap Property:** $\text{heap}[\text{parent}(i)].\text{priority} \le \text{heap}[i].\text{priority}$

### Indexed Position Tracking (`decrease_key`)
To avoid $O(n)$ array scanning when relaxing an edge to a node already in the priority queue, our implementation maintains a reverse lookup dictionary `_pos: dict[item, int]`.

```python
# Swap operation in O(1) updating index positions
def _swap(self, i: int, j: int) -> None:
    self._heap[i], self._heap[j] = self._heap[j], self._heap[i]
    self._pos[self._heap[i].item] = i
    self._pos[self._heap[j].item] = j
```

| Operation | Time Complexity | Auxiliary Space |
| :--- | :--- | :--- |
| `push(item, priority)` | $O(\log n)$ | $O(1)$ |
| `pop()` (extract-min) | $O(\log n)$ | $O(1)$ |
| `decrease_key(item, new_priority)` | $O(\log n)$ | $O(1)$ |
| `peek()` (find-min) | $O(1)$ | $O(1)$ |
| `contains(item)` | $O(1)$ | $O(1)$ |
| Total Data Structure | — | $O(n)$ |

---

## 2. Spatial Road Network Graph (`core/graph.py`)

Represents directed urban road topologies using an adjacency list.

### Geospatial Haversine Metric
Physical distances are calculated via the Great-Circle Haversine formula on a spherical earth ($R = 6,371.0\text{ km}$):
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a})$$
$$d = R \cdot c$$

---

## 3. Dijkstra's Algorithm (`core/dijkstra.py`)

Single-source shortest-path algorithm for graphs with non-negative edge weights.

### Pseudocode
```text
function DIJKSTRA(Graph, source, target, weight_fn):
    dist[source] = 0
    priority_queue.push(source, priority=0)
    
    while priority_queue is not empty:
        curr, curr_dist = priority_queue.pop()
        
        if curr == target:
            break // Target settled
            
        for neighbor, edge_data in Graph.neighbors(curr):
            tentative = curr_dist + weight_fn(curr, neighbor, edge_data)
            if tentative < dist[neighbor]:
                dist[neighbor] = tentative
                pred[neighbor] = curr
                priority_queue.push(neighbor, tentative)
                
    return reconstruct_path(pred, target), dist[target]
```

- **Time Complexity:** $O((V + E) \log V)$
- **Space Complexity:** $O(V)$

---

## 4. A* Search Algorithm (`core/astar.py`)

Directed heuristic search prioritizing nodes by estimated total cost:
$$f(n) = g(n) + h(n)$$
where $g(n)$ is the exact known cost from source to node $n$, and $h(n)$ is the heuristic estimate to target.

### Admissibility Proof
For distance optimization:
$$h(n) = \text{haversine}(n, \text{target}) \le \text{true\_road\_distance}(n, \text{target})$$
Because straight-line spherical distance is the geometric lower bound between any two coordinates, $h(n)$ can never overestimate.

For travel-time optimization:
$$h(n) = \left(\frac{\text{haversine}(n, \text{target})}{v_{\max}}\right) \times 60.0$$
Because no vehicle can travel faster than $v_{\max} = 80\text{ km/h}$, true transit time $\ge \text{dist} / v_{\max}$, guaranteeing that $h(n) \le h^*(n)$ holds unconditionally.

---

## 5. Multi-Stop TSP Solver (`core/tsp.py`)

Finds the optimal permutation of $K$ delivery stops starting and ending at the depot.

### Step 1: All-Pairs Distance Matrix
Executes A\* shortest-path queries between all pairs of stops:
- **Matrix Dimension:** $K \times K$
- **Time Complexity:** $O(K^2 \cdot (V + E) \log V)$

### Step 2: Nearest Neighbour Construction
Greedy initialization in $O(K^2)$:
1. Set current location as depot.
2. Step to the closest unvisited stop.
3. Mark stop visited and repeat until all stops are sequenced.
4. Return to depot.

### Step 3: 2-Opt Local Search Improvement
Untangles route self-intersections in $O(\text{iterations} \cdot K^2)$:
For each non-adjacent edge pair $(i-1 \to i)$ and $(k \to k+1)$:
$$\Delta = (\text{cost}(i-1, k) + \text{cost}(i, k+1)) - (\text{cost}(i-1, i) + \text{cost}(k, k+1))$$
If $\Delta < 0$, reverse sub-tour $[i \dots k]$. Repeat until no further 2-opt moves reduce total cost.

### Step 4: Brute-Force Exact Checker (for $K \le 9$)
Evaluates all $(K-1)!$ permutations to identify the true global optimum. Used in test suites to confirm that 2-Opt achieves $\le 3\%$ optimality gap on small batches.
