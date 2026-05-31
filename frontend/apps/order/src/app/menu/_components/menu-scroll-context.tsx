"use client";
import { createContext, useContext } from "react";

const IsScrolledContext = createContext(false);

export function useIsScrolled() {
  return useContext(IsScrolledContext);
}

export { IsScrolledContext };
