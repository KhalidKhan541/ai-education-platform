"use client";

import { useState, useCallback, useRef } from "react";

export function useToggle(
  initialValue = false
): [boolean, { on: () => void; off: () => void; toggle: () => void; set: (value: boolean) => void }] {
  const [value, setValue] = useState(initialValue);

  const on = useCallback(() => setValue(true), []);
  const off = useCallback(() => setValue(false), []);
  const toggle = useCallback(() => setValue((v) => !v), []);
  const set = useCallback((newValue: boolean) => setValue(newValue), []);

  return [value, { on, off, toggle, set }];
}

export function useCounter(initialValue = 0, options: { min?: number; max?: number; step?: number } = {}) {
  const { min = -Infinity, max = Infinity, step = 1 } = options;
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => {
    setCount((prev) => Math.min(prev + step, max));
  }, [step, max]);

  const decrement = useCallback(() => {
    setCount((prev) => Math.max(prev - step, min));
  }, [step, min]);

  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  const set = useCallback((value: number) => {
    setCount(Math.max(min, Math.min(max, value)));
  }, [min, max]);

  return {
    count,
    increment,
    decrement,
    reset,
    set,
    isAtMin: count <= min,
    isAtMax: count >= max,
  };
}

export function useBoolean(
  initialValue = false
): [boolean, { setTrue: () => void; setFalse: () => void; toggle: () => void; set: (value: boolean) => void }] {
  const [value, setValue] = useState(initialValue);

  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  const toggle = useCallback(() => setValue((v) => !v), []);
  const set = useCallback((newValue: boolean) => setValue(newValue), []);

  return [value, { setTrue, setFalse, toggle, set }];
}

export function useMap<K, V>(initialEntries?: [K, V][]) {
  const [map, setMap] = useState<Map<K, V>>(
    () => new Map(initialEntries || [])
  );

  const set = useCallback((key: K, value: V) => {
    setMap((prev) => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
  }, []);

  const remove = useCallback((key: K) => {
    setMap((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setMap(new Map());
  }, []);

  const get = useCallback((key: K) => map.get(key), [map]);

  const has = useCallback((key: K) => map.has(key), [map]);

  const entries = useCallback(() => Array.from(map.entries()), [map]);
  const keys = useCallback(() => Array.from(map.keys()), [map]);
  const values = useCallback(() => Array.from(map.values()), [map]);

  return { map, set, remove, clear, get, has, entries, keys, values };
}

export function useSet<T>(initialValues?: T[]) {
  const [set, setSet] = useState<Set<T>>(
    () => new Set(initialValues || [])
  );

  const add = useCallback((value: T) => {
    setSet((prev) => {
      const next = new Set(prev);
      next.add(value);
      return next;
    });
  }, []);

  const remove = useCallback((value: T) => {
    setSet((prev) => {
      const next = new Set(prev);
      next.delete(value);
      return next;
    });
  }, []);

  const toggle = useCallback((value: T) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSet(new Set());
  }, []);

  const has = useCallback((value: T) => set.has(value), [set]);

  const toArray = useCallback(() => Array.from(set), [set]);

  return { set, add, remove, toggle, clear, has, toArray, size: set.size };
}

export function useQueue<T>(initialItems: T[] = []) {
  const [items, setItems] = useState<T[]>(initialItems);
  const pointer = useRef(0);

  const enqueue = useCallback((...newItems: T[]) => {
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const dequeue = useCallback((): T | undefined => {
    if (pointer.current >= items.length) return undefined;
    const item = items[pointer.current];
    pointer.current++;
    return item;
  }, [items]);

  const peek = useCallback((): T | undefined => {
    return items[pointer.current];
  }, [items]);

  const clear = useCallback(() => {
    setItems([]);
    pointer.current = 0;
  }, []);

  const size = items.length - pointer.current;

  return {
    items,
    enqueue,
    dequeue,
    peek,
    clear,
    size,
    isEmpty: size === 0,
  };
}
