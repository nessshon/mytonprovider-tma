import type { TriggerKey } from "@/i18n/types";
import { ACCENT, SC } from "@/lib/colors";
import { EMPTY, NANO, amount } from "@/lib/format";
import { DEFAULT_THRESHOLD, type ThresholdMap } from "./alerts";
import type { OwnerChartPoint, OwnerPayload, OwnerSummary, OwnerTriggerEntry } from "./backend";
import type { Provider } from "./types";

export type OwnerPeriod = "hour" | "today" | "week" | "month";

export type GaugeKey = "cpu_high" | "ram_high" | "disk_load_high" | "network_high";

export const OWNER_PERIOD_API: Record<OwnerPeriod, string> = {
  hour: "hour",
  today: "day",
  week: "week",
  month: "month",
};

interface OwnerGaugeData {
  key: GaugeKey;
  value: number;
  threshold: number;
}

interface OwnerChartData {
  key: GaugeKey;
  values: number[];
  times: number[];
  threshold: number | null;
  unit: string;
  current: string;
}

interface OwnerData {
  balance: string;
  balanceUpdatedAt: number | null;
  usedGB: string;
  totalGB: string;
  usedPct: number;
  barColor: string;
  spaceOver: boolean;
  summary: { earned: string; trafficIn: string; trafficOut: string; storageGrowth: string };
  monthly: { earned: string; space: string; traffic: string };
  allTime: { earned: string; space: string; traffic: string };
  gauges: OwnerGaugeData[];
  charts: OwnerChartData[];
}

const TRIGGER_KEYS: ReadonlySet<string> = new Set([
  "telemetry_lost",
  "not_online",
  "cpu_high",
  "ram_high",
  "network_high",
  "disk_load_high",
  "disk_space_low",
]);

interface OwnerTrigger {
  key: TriggerKey;
  color: "red" | "orange";
}

export function ownerTriggers(entries: OwnerTriggerEntry[]): OwnerTrigger[] {
  return entries
    .filter((entry): entry is OwnerTriggerEntry & { key: TriggerKey } => TRIGGER_KEYS.has(entry.key))
    .map((entry) => ({ key: entry.key, color: entry.color }));
}

const GAUGE_KEYS: GaugeKey[] = ["cpu_high", "ram_high", "disk_load_high", "network_high"];

const GIB = 1024 ** 3;

function formatBytes(bytes: number | null): string {
  if (bytes == null) return EMPTY;
  const gb = bytes / GIB;
  return gb >= 1024 ? `${amount(gb / 1024)} TB` : `${amount(gb)} GB`;
}

function formatGram(nano: number | null): string {
  return nano != null ? `${amount(nano / NANO)} GRAM` : EMPTY;
}

function formatGrowth(gb: number | null): string {
  if (gb == null) return EMPTY;
  const sign = gb >= 0 ? "+" : "-";
  return `${sign}${amount(Math.abs(gb))} GB`;
}

function summaryBlock(summary: OwnerSummary) {
  return {
    earned: formatGram(summary.earned),
    trafficIn: formatBytes(summary.traffic_in),
    trafficOut: formatBytes(summary.traffic_out),
    storageGrowth: formatGrowth(summary.storage_growth_gb),
  };
}

function gaugeValues(payload: OwnerPayload): Record<GaugeKey, number | null> {
  return {
    cpu_high: payload.load.cpu,
    ram_high: payload.load.ram,
    disk_load_high: payload.load.disk,
    network_high: payload.load.net_pct,
  };
}

function chartValue(point: OwnerChartPoint, key: GaugeKey): number {
  const value = key === "cpu_high" ? point.cpu : key === "ram_high" ? point.ram : point.disk;
  return Math.max(0, Math.round(value ?? 0));
}

function threshold(thresholds: ThresholdMap, key: GaugeKey): number {
  return thresholds[key] ?? DEFAULT_THRESHOLD;
}

export function adaptOwner(p: Provider, payload: OwnerPayload, thresholds: ThresholdMap): OwnerData {
  const usedGB = p.telemetry.usedSpace ?? 0;
  const totalGB = p.telemetry.totalSpace ?? 0;
  const usedPct = totalGB > 0 ? Math.min(100, (usedGB / totalGB) * 100) : 0;
  const usedPctRound = Math.round(usedPct);
  const spaceThreshold = thresholds.disk_space_low ?? DEFAULT_THRESHOLD;
  const barColor = usedPct >= 99 ? SC.red : usedPct >= spaceThreshold ? SC.orange : ACCENT;

  const load = gaugeValues(payload);
  const monthlyTraffic =
    payload.monthly.traffic_in != null || payload.monthly.traffic_out != null
      ? (payload.monthly.traffic_in ?? 0) + (payload.monthly.traffic_out ?? 0)
      : null;

  return {
    balance: payload.balance != null ? amount(payload.balance / NANO) : EMPTY,
    balanceUpdatedAt: payload.balance_updated_at,
    usedGB: amount(usedGB),
    totalGB: amount(totalGB),
    usedPct: usedPctRound,
    barColor,
    spaceOver: usedPctRound >= spaceThreshold,
    summary: summaryBlock(payload.summary),
    monthly: {
      earned: formatGram(payload.monthly.earned),
      space: formatGrowth(payload.monthly.storage_growth_gb),
      traffic: formatBytes(monthlyTraffic),
    },
    allTime: {
      earned: formatGram(payload.all_time.earned),
      space: payload.all_time.stored_gb != null ? `${amount(payload.all_time.stored_gb)} GB` : EMPTY,
      traffic: formatBytes(payload.all_time.traffic),
    },
    gauges: GAUGE_KEYS.map((key) => ({
      key,
      value: Math.min(100, Math.max(0, Math.round(load[key] ?? 0))),
      threshold: threshold(thresholds, key),
    })),
    charts: GAUGE_KEYS.map((key) => {
      const times = payload.chart.map((point) => point.t);
      if (key === "network_high") {
        const values = payload.chart.map((point) => Math.max(0, Math.round((point.net_mbps ?? 0) * 10) / 10));
        return {
          key,
          values,
          times,
          threshold: null,
          unit: " Mbit/s",
          current: values.length ? `${values[values.length - 1]} Mbit/s` : EMPTY,
        };
      }
      const values = payload.chart.map((point) => chartValue(point, key));
      return {
        key,
        values,
        times,
        threshold: threshold(thresholds, key),
        unit: "%",
        current: values.length ? `${values[values.length - 1]}%` : EMPTY,
      };
    }),
  };
}
