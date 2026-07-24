import { fetchCatalog } from "@/data/providersApi";
import { computeBounds } from "@/data/query";
import type { FilterBounds, Provider } from "@/data/types";
import { create } from "zustand";

type LoadStatus = "idle" | "loading" | "ready" | "error";

const STALE_MS = 120_000;

interface CatalogState {
  providers: Provider[];
  bounds: FilterBounds | null;
  status: LoadStatus;
  loadedAt: number;
  load: () => Promise<void>;
  reload: () => Promise<void>;
}

export const useCatalog = create<CatalogState>((set, get) => {
  const fetchAll = async (silent: boolean) => {
    if (!silent) set({ status: "loading" });
    try {
      const providers = await fetchCatalog();
      set({ providers, bounds: computeBounds(providers), status: "ready", loadedAt: Date.now() });
    } catch (error) {
      console.error("Catalog load failed", error);
      if (!silent) set({ status: "error" });
    }
  };

  return {
    providers: [],
    bounds: null,
    status: "idle",
    loadedAt: 0,
    load: async () => {
      const { status, loadedAt } = get();
      if (status === "loading") return;
      if (status === "ready") {
        if (Date.now() - loadedAt > STALE_MS) await fetchAll(true);
        return;
      }
      await fetchAll(false);
    },
    reload: () => fetchAll(false),
  };
});
