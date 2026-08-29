import { create } from 'zustand';
import { FilterOptions } from '../types/ledger';

interface FilterState {
  filters: FilterOptions;
  setFilters: (newFilters: Partial<FilterOptions>) => void;
  resetFilters: () => void;
}

export const defaultFilters: FilterOptions = {
  accountId: 'all',
  type: 'all',
  dateRange: 'all',
  sortBy: 'newest',
  searchQuery: '',
};

export const useFilterStore = create<FilterState>((set) => ({
  filters: defaultFilters,
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  resetFilters: () => set({ filters: defaultFilters }),
}));
