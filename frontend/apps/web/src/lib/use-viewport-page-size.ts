"use client";

import { useEffect, useState } from "react";

interface Options {
  reserved?: number;
  rowHeight?: number;
  min?: number;
  columnsForWidth?: (w: number) => number;
}

function defaultColumnsForWidth(w: number): number {
  if (w < 640) return 2;
  if (w < 1024) return 3;
  return 4;
}

function calculatePageSize({
  reserved = 360,
  rowHeight = 56,
  min = 5,
  columnsForWidth = defaultColumnsForWidth,
}: Options = {}) {
  if (typeof window === "undefined") return 10;
  const columns = columnsForWidth(window.innerWidth);
  const rows = Math.max(1, Math.floor((window.innerHeight - reserved) / rowHeight));
  return Math.max(min, rows * columns);
}

export function useViewportPageSize(options: Options = {}) {
  const { reserved = 360, rowHeight = 56, min = 5, columnsForWidth = defaultColumnsForWidth } = options;
  const [pageSize, setPageSize] = useState(() =>
    calculatePageSize({ reserved, rowHeight, min, columnsForWidth })
  );

  useEffect(() => {
    const onResize = () =>
      setPageSize(calculatePageSize({ reserved, rowHeight, min, columnsForWidth }));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [reserved, rowHeight, min, columnsForWidth]);

  return pageSize;
}
