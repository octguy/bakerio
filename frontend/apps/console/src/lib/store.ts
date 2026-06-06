import { create } from "zustand";

interface FilterState {
  onlyActive: boolean;
  setOnlyActive: (value: boolean) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  onlyActive: false,
  setOnlyActive: (onlyActive) => set({ onlyActive }),
}));
