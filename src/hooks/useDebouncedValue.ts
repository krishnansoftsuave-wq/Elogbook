"use client";

import { useEffect, useState } from "react";

/** Delays propagating a fast-changing value — typically a search input. */
export const useDebouncedValue = <TValue>(
  value: TValue,
  delayMs = 300
): TValue => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
};
