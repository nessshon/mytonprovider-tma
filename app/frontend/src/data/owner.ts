import type { TriggerKey } from "@/i18n/types";
import { ACCENT, SC } from "@/lib/colors";
import { EMPTY, GB, NANO, amount, formatPriceGram } from "@/lib/format";
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
  values: (number | null)[];
  peaks: (number | null)[];
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

function formatBytes(bytes: number | null): string {
  if (bytes == null) return EMPTY;
  const gb = bytes / GB;
  return gb >= 1024 ? `${amount(gb / 1024)} TB` : `${amount(gb)} GB`;
}

function formatGram(nano: number | null): string {
  return nano != null ? formatPriceGram(nano) : EMPTY;
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

const CHART_FIELDS: Record<GaugeKey, [keyof OwnerChartPoint, keyof OwnerChartPoint]> = {
  cpu_high: ["cpu", "cpu_max"],
  ram_high: ["ram", "ram_max"],
  disk_load_high: ["disk", "disk_max"],
  network_high: ["net_mbps", "net_max"],
};

function chartValue(point: OwnerChartPoint, field: keyof OwnerChartPoint, digits: number): number | null {
  const value = point[field];
  if (value === null) return null;
  const factor = 10 ** digits;
  return Math.max(0, Math.round(value * factor) / factor);
}

function lastValue(values: (number | null)[]): number | null {
  for (let index = values.length - 1; index >= 0; index--) {
    const value = values[index];
    if (value !== null) return value;
  }
  return null;
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
      const network = key === "network_high";
      const [field, peakField] = CHART_FIELDS[key];
      const digits = network ? 1 : 0;
      const unit = network ? " Mbit/s" : "%";
      const values = payload.chart.map((point) => chartValue(point, field, digits));
      const peaks = payload.chart.map((point) => chartValue(point, peakField, digits));
      const current = lastValue(values);
      return {
        key,
        values,
        peaks,
        times: payload.chart.map((point) => point.t),
        threshold: network ? null : threshold(thresholds, key),
        unit,
        current: current !== null ? `${current}${unit}` : EMPTY,
      };
    }),
  };
}
