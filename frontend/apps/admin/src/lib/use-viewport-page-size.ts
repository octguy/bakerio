"use client";

import { useEffect, useState } from "react";

function calculatePageSize() {
  if (typeof window === "undefined") return 10;
  const reserved = 360;
  const rowHeight = 56;
  return Math.max(5, Math.floor((window.innerHeight - reserved) / rowHeight));
}

export function useViewportPageSize() {
  const [pageSize, setPageSize] = useState(calculatePageSize);

  useEffect(() => {
    const onResize = () => setPageSize(calculatePageSize());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return pageSize;
}
