import { HttpError } from "@/data/http";
import { fetchCatalog } from "@/data/providersApi";
import { computeBounds, computeRanks } from "@/data/query";
import type { FilterBounds, Provider } from "@/data/types";
import { create } from "zustand";

type LoadStatus = "idle" | "loading" | "ready" | "error";

const STALE_MS = 120_000;

interface CatalogState {
  providers: Provider[];
  ranks: Record<string, number>;
  bounds: FilterBounds | null;
  status: LoadStatus;
  errorStatus: number | null;
  loadedAt: number;
  load: () => Promise<void>;
  reload: () => Promise<void>;
}

export const useCatalog = create<CatalogState>((set, get) => {
  const fetchAll = async (silent: boolean) => {
    if (!silent) set({ status: "loading" });
    try {
      const providers = await fetchCatalog();
      set({
        providers,
        ranks: computeRanks(providers),
        bounds: computeBounds(providers),
        status: "ready",
        errorStatus: null,
        loadedAt: Date.now(),
      });
    } catch (error) {
      console.error("Catalog load failed", error);
      if (!silent) set({ status: "error", errorStatus: error instanceof HttpError ? error.status : null });
    }
  };

  return {
    providers: [],
    ranks: {},
    bounds: null,
    status: "idle",
    errorStatus: null,
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
