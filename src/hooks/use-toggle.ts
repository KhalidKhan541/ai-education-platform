import * as React from "react";

function useToggle(
  initialValue: boolean = false
): [boolean, () => void, (value: boolean) => void, () => void, () => void] {
  const [value, setValue] = React.useState(initialValue);

  const toggle = React.useCallback(() => {
    setValue((prev) => !prev);
  }, []);

  const setTrue = React.useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = React.useCallback(() => {
    setValue(false);
  }, []);

  return [value, toggle, setValue, setTrue, setFalse];
}

function useToggleMultiple<T extends string | number>(
  initialValues: T[]
): [Set<T>, (value: T) => void, (values: T[]) => void, () => void, () => void, (values: T[]) => void] {
  const [values, setValues] = React.useState<Set<T>>(new Set(initialValues));

  const toggle = React.useCallback((value: T) => {
    setValues((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }, []);

  const add = React.useCallback((newValues: T[]) => {
    setValues((prev) => {
      const next = new Set(prev);
      newValues.forEach((v) => next.add(v));
      return next;
    });
  }, []);

  const clear = React.useCallback(() => {
    setValues(new Set());
  }, []);

  const setAll = React.useCallback((allValues: T[]) => {
    setValues(new Set(allValues));
  }, []);

  const remove = React.useCallback((valuesToRemove: T[]) => {
    setValues((prev) => {
      const next = new Set(prev);
      valuesToRemove.forEach((v) => next.delete(v));
      return next;
    });
  }, []);

  return [values, toggle, add, clear, setAll, remove];
}

export { useToggle, useToggleMultiple };
