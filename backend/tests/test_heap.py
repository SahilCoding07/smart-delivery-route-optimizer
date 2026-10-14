"""Tests for the custom Binary MinHeap data structure."""

import random
import pytest
from app.core.heap import MinHeap


def test_min_heap_basic_operations():
    heap: MinHeap[str] = MinHeap()
    assert heap.is_empty()
    assert len(heap) == 0

    heap.push("task_a", 10.5)
    heap.push("task_b", 3.2)
    heap.push("task_c", 7.8)

    assert not heap.is_empty()
    assert len(heap) == 3
    assert "task_b" in heap
    assert "task_z" not in heap

    item, prio = heap.peek()
    assert item == "task_b"
    assert prio == pytest.approx(3.2)

    item, prio = heap.pop()
    assert item == "task_b"
    assert prio == pytest.approx(3.2)
    assert len(heap) == 2

    item, prio = heap.pop()
    assert item == "task_c"
    assert prio == pytest.approx(7.8)

    item, prio = heap.pop()
    assert item == "task_a"
    assert prio == pytest.approx(10.5)

    assert heap.is_empty()
    with pytest.raises(IndexError):
        heap.pop()
    with pytest.raises(IndexError):
        heap.peek()


def test_min_heap_against_sorted_random_data():
    """Verify heap extraction order against Python's sorted() for 1000 random elements."""
    rng = random.Random(42)
    heap: MinHeap[int] = MinHeap()

    elements = [(i, rng.uniform(0.0, 10000.0)) for i in range(1000)]
    for item, priority in elements:
        heap.push(item, priority)

    extracted = []
    while not heap.is_empty():
        item, priority = heap.pop()
        extracted.append((item, priority))

    # Check that extracted priorities are monotonically non-decreasing
    priorities = [p for _, p in extracted]
    assert priorities == sorted(priorities)


def test_min_heap_decrease_key():
    heap: MinHeap[str] = MinHeap()
    heap.push("A", 50.0)
    heap.push("B", 40.0)
    heap.push("C", 30.0)
    heap.push("D", 20.0)

    # Decrease "A" to 5.0 -> A should become root
    heap.decrease_key("A", 5.0)
    assert heap.peek() == ("A", 5.0)

    # Pushing an existing key with lower priority also decreases key
    heap.push("B", 2.0)
    assert heap.peek() == ("B", 2.0)

    # Cannot increase priority via decrease_key
    with pytest.raises(ValueError):
        heap.decrease_key("A", 100.0)

    # Decreasing key for non-existent item raises KeyError
    with pytest.raises(KeyError):
        heap.decrease_key("NON_EXISTENT", 1.0)
