"use client";

import { useEffect, useState } from "react";

interface Options {
  reserved?: number;
  rowHeight?: number;
  min?: number;
}

function calculatePageSize({ reserved = 360, rowHeight = 56, min = 5 }: Options = {}) {
  if (typeof window === "undefined") return 10;
  return Math.max(min, Math.floor((window.innerHeight - reserved) / rowHeight));
}

export function useViewportPageSize(options: Options = {}) {
  const { reserved = 360, rowHeight = 56, min = 5 } = options;
  const [pageSize, setPageSize] = useState(() => calculatePageSize({ reserved, rowHeight, min }));

  useEffect(() => {
    const onResize = () => setPageSize(calculatePageSize({ reserved, rowHeight, min }));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [reserved, rowHeight, min]);

  return pageSize;
}
