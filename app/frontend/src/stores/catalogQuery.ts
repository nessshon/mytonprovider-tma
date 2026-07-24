import type { CatalogFilters, Sort, SortField } from "@/data/types";
import { create } from "zustand";

export type Tab = "list" | "subs" | "fav";

const EMPTY_FILTERS: CatalogFilters = {
  location: null,
  rating: null,
  uptime: null,
  price: null,
  bag: null,
  cores: null,
  ram: null,
  age: null,
  minSpan: null,
  maxSpan: null,
  space: null,
  diskRead: null,
  diskWrite: null,
  download: null,
  upload: null,
  ping: null,
  cpuVirtual: null,
  storageHash: null,
  providerHash: null,
  freeSpace: false,
  telemetry: null,
  stableOnly: false,
};

export const PAGE_SIZE = 8;

interface CatalogQueryState {
  tab: Tab;
  search: string;
  sort: Sort;
  filters: CatalogFilters;
  visible: number;
  setTab: (tab: Tab) => void;
  setSearch: (search: string) => void;
  setSortField: (field: SortField) => void;
  setFilters: (filters: CatalogFilters) => void;
  resetFilters: () => void;
  loadMore: () => void;
}

export const useCatalogQuery = create<CatalogQueryState>((set) => ({
  tab: "list",
  search: "",
  sort: { field: "rating", dir: "desc" },
  filters: EMPTY_FILTERS,
  visible: PAGE_SIZE,
  setTab: (tab) => set({ tab, visible: PAGE_SIZE }),
  setSearch: (search) => set({ search, visible: PAGE_SIZE }),
  setSortField: (field) =>
    set((state) => ({
      sort:
        state.sort.field === field
          ? { field, dir: state.sort.dir === "asc" ? "desc" : "asc" }
          : { field, dir: "desc" },
    })),
  setFilters: (filters) => set({ filters, visible: PAGE_SIZE }),
  resetFilters: () => set({ filters: EMPTY_FILTERS, visible: PAGE_SIZE }),
  loadMore: () => set((state) => ({ visible: state.visible + PAGE_SIZE })),
}));
