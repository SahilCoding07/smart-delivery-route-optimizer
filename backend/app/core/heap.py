"""
Hand-written Binary Min-Heap with Indexed Position Tracking.

What it does:
    A priority queue data structure implementing a complete binary tree stored in an array.
    Maintains the min-heap invariant: for every node i other than root,
    heap[parent(i)].priority <= heap[i].priority.
    Also tracks item indices in a hash map to support O(log n) decrease-key operations
    without scanning the array.

Time Complexity:
    - Push: O(log n)
    - Pop (extract-min): O(log n)
    - Decrease-Key: O(log n)
    - Peek (find-min): O(1)
    - Is-Empty / Size: O(1)
    - Contains: O(1)

Space Complexity:
    - O(n) space to store n elements in the dynamic array and hash table.

When to use:
    Essential for Dijkstra's and A* search algorithms to repeatedly extract
    the unvisited node with the smallest tentative distance/priority in logarithmic time.
"""

from typing import Generic, TypeVar, Optional

T = TypeVar("T")


class MinHeapNode(Generic[T]):
    """Container for an item and its associated priority value."""
    __slots__ = ("item", "priority")

    def __init__(self, item: T, priority: float) -> None:
        self.item: T = item
        self.priority: float = priority

    def __repr__(self) -> str:
        return f"MinHeapNode(item={self.item!r}, priority={self.priority:.4f})"


class MinHeap(Generic[T]):
    """
    Binary Min-Heap supporting push, pop, decrease_key, and peek.
    Uses an internal position dictionary `_pos` to map item -> heap index.
    """

    def __init__(self) -> None:
        self._heap: list[MinHeapNode[T]] = []
        self._pos: dict[T, int] = {}

    def __len__(self) -> int:
        return len(self._heap)

    def is_empty(self) -> bool:
        """Returns True if the heap contains no elements."""
        return len(self._heap) == 0

    def contains(self, item: T) -> bool:
        """Check if an item is currently present in the heap in O(1) time."""
        return item in self._pos

    def __contains__(self, item: T) -> bool:
        return self.contains(item)

    def peek(self) -> tuple[T, float]:
        """
        Return (item, priority) of the minimum element without removing it.
        Raises IndexError if the heap is empty.
        """
        if not self._heap:
            raise IndexError("peek from an empty MinHeap")
        node = self._heap[0]
        return node.item, node.priority

    def push(self, item: T, priority: float) -> None:
        """
        Insert an item with an initial priority into the heap.
        If the item already exists and the new priority is smaller,
        updates it via decrease_key.
        """
        if item in self._pos:
            idx = self._pos[item]
            if priority < self._heap[idx].priority:
                self.decrease_key(item, priority)
            return

        node = MinHeapNode(item=item, priority=priority)
        idx = len(self._heap)
        self._heap.append(node)
        self._pos[item] = idx
        self._sift_up(idx)

    def pop(self) -> tuple[T, float]:
        """
        Remove and return (item, priority) with the smallest priority.
        Raises IndexError if the heap is empty.
        """
        if not self._heap:
            raise IndexError("pop from an empty MinHeap")

        min_node = self._heap[0]
        del self._pos[min_node.item]

        last_node = self._heap.pop()
        if self._heap:
            self._heap[0] = last_node
            self._pos[last_node.item] = 0
            self._sift_down(0)

        return min_node.item, min_node.priority

    def decrease_key(self, item: T, new_priority: float) -> None:
        """
        Decrease the priority of an existing item and restore the heap invariant.
        Raises KeyError if the item is not in the heap.
        Raises ValueError if new_priority > current priority.
        """
        if item not in self._pos:
            raise KeyError(f"Item {item!r} not found in MinHeap")

        idx = self._pos[item]
        current_priority = self._heap[idx].priority
        if new_priority > current_priority:
            raise ValueError(
                f"New priority ({new_priority}) is greater than current priority ({current_priority})"
            )

        self._heap[idx].priority = new_priority
        self._sift_up(idx)

    def _sift_up(self, idx: int) -> None:
        """Move element at index idx up until heap property is restored."""
        while idx > 0:
            parent_idx = (idx - 1) // 2
            if self._heap[idx].priority < self._heap[parent_idx].priority:
                self._swap(idx, parent_idx)
                idx = parent_idx
            else:
                break

    def _sift_down(self, idx: int) -> None:
        """Move element at index idx down until heap property is restored."""
        n = len(self._heap)
        while True:
            smallest = idx
            left_child = 2 * idx + 1
            right_child = 2 * idx + 2

            if left_child < n and self._heap[left_child].priority < self._heap[smallest].priority:
                smallest = left_child

            if right_child < n and self._heap[right_child].priority < self._heap[smallest].priority:
                smallest = right_child

            if smallest != idx:
                self._swap(idx, smallest)
                idx = smallest
            else:
                break

    def _swap(self, i: int, j: int) -> None:
        """Swap elements at indices i and j, updating the position map."""
        self._heap[i], self._heap[j] = self._heap[j], self._heap[i]
        self._pos[self._heap[i].item] = i
        self._pos[self._heap[j].item] = j
