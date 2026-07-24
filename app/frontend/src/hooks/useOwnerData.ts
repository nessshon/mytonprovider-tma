import { BackendError, backend, type OwnerPayload, type ProviderPayload, type StatsPayload } from "@/data/backend";
import { OWNER_PERIOD_API, type OwnerPeriod } from "@/data/owner";
import { useAuth } from "@/stores/auth";
import { useEffect, useRef, useState } from "react";
import { create } from "zustand";

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; payload: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.at < CACHE_TTL_MS) return Promise.resolve(entry.payload as T);
  let request = inflight.get(key);
  if (!request) {
    request = load()
      .then((payload) => {
        cache.set(key, { at: Date.now(), payload });
        return payload;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, request);
  }
  return request as Promise<T>;
}

const useOwnerRevalidation = create<{ tick: number }>(() => ({ tick: 0 }));

let invalidatedAt = 0;

export function invalidateOwner(): void {
  const now = Date.now();
  if (now - invalidatedAt < CACHE_TTL_MS) return;
  invalidatedAt = now;
  cache.clear();
  useOwnerRevalidation.setState((s) => ({ tick: s.tick + 1 }));
}

function fetchProvider(pubkey: string): Promise<ProviderPayload> {
  return cached(`p|${pubkey}`, () => backend.provider(pubkey));
}

function fetchStats(pubkey: string, period: OwnerPeriod): Promise<StatsPayload> {
  const api = OWNER_PERIOD_API[period];
  return cached(`s|${pubkey}|${api}`, () => backend.providerStats(pubkey, api));
}

const PREFETCH_PERIODS: OwnerPeriod[] = ["hour", "week", "month"];

export function prefetchOwner(pubkey: string): void {
  if (!useAuth.getState().token) return;
  fetchProvider(pubkey).catch(() => {});
  for (const period of PREFETCH_PERIODS) {
    fetchStats(pubkey, period).catch(() => {});
  }
}

async function composedOwner(
  pubkey: string,
  period: OwnerPeriod,
  chartPeriod: OwnerPeriod,
): Promise<OwnerPayload> {
  const [provider, summaryStats, chartStats] = await Promise.all([
    fetchProvider(pubkey),
    fetchStats(pubkey, period),
    fetchStats(pubkey, chartPeriod),
  ]);
  return { ...provider, summary: summaryStats.summary, chart: chartStats.points };
}

export function useProblemBags(pubkey: string, enabled: boolean): number | null {
  const token = useAuth((s) => s.token);
  const tick = useOwnerRevalidation((s) => s.tick);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || !token) {
      setCount(null);
      return;
    }
    let alive = true;
    fetchProvider(pubkey)
      .then((provider) => {
        if (alive) setCount(provider.problem_bags);
      })
      .catch(() => {
        if (alive) setCount(null);
      });
    return () => {
      alive = false;
    };
  }, [pubkey, enabled, token, tick]);

  return count;
}

export function useOwnerData(
  pubkey: string,
  enabled: boolean,
  period: OwnerPeriod,
  chartPeriod: OwnerPeriod,
): { payload: OwnerPayload | null; denied: boolean; failed: boolean; refreshing: boolean } {
  const token = useAuth((s) => s.token);
  const tick = useOwnerRevalidation((s) => s.tick);
  const [payload, setPayload] = useState<OwnerPayload | null>(null);
  const hasData = useRef(false);
  const [denied, setDenied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!enabled || !token) {
      setPayload(null);
      setDenied(false);
      setFailed(false);
      setRefreshing(false);
      return;
    }
    if (!hasData.current) setRefreshing(true);
    let alive = true;
    composedOwner(pubkey, period, chartPeriod)
      .then((data) => {
        if (!alive) return;
        hasData.current = true;
        setPayload(data);
        setFailed(false);
        setRefreshing(false);
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setRefreshing(false);
        if (error instanceof BackendError && error.status === 403) setDenied(true);
        else {
          setFailed(true);
          console.error("owner data failed", error);
        }
      });
    return () => {
      alive = false;
    };
  }, [pubkey, enabled, token, period, chartPeriod, tick]);

  return { payload, denied, failed, refreshing };
}
