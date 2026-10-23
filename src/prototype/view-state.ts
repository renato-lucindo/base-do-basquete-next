import { useEffect, useState } from "react";

// Filtros de navegação não são gravações de negócio e não alteram Recentes.
export function useViewState<T>(
  key: string,
  fallback: T,
): [T, (value: T) => void] {
  const read = () => {
    try {
      const value = sessionStorage.getItem(`base-view:${key}`);
      return value ? (JSON.parse(value) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  const [value, setValue] = useState<T>(read);
  useEffect(() => {
    setValue(read());
  }, [key]);
  return [
    value,
    (next: T) => {
      setValue(next);
      try {
        sessionStorage.setItem(`base-view:${key}`, JSON.stringify(next));
      } catch {
        /* Estado de navegação continua em memória. */
      }
    },
  ];
}
