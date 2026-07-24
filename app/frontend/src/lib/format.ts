import type { Dict } from "@/i18n/types";
import type { StatusTone } from "./colors";

export const GB = 1073741824;
const MB = 1048576;
const KB = 1024;
export const NANO = 1_000_000_000;

export const EMPTY = "—";

export function diskSpeedToNum(text: string | null): number | null {
  if (!text) return null;
  const match = text.match(/([\d.]+)\s*([KMG]i?B)/i);
  if (!match) return null;
  const mult: Record<string, number> = {
    kib: 1024,
    mib: 1048576,
    gib: 1073741824,
    kb: 1000,
    mb: 1e6,
    gb: 1e9,
  };
  return parseFloat(match[1]) * (mult[match[2].toLowerCase()] ?? 1);
}
const ELLIPSIS = "…";

export function amount(value: number): string {
  return String(parseFloat(value.toFixed(2)));
}

export function formatPrice(nanoTon: number): string {
  return amount(nanoTon / NANO);
}

export function formatPriceGram(nanoTon: number): string {
  return `${formatPrice(nanoTon)} GRAM`;
}

export function formatSpace(bytes: number, t: Dict): string {
  if (bytes <= 0) return EMPTY;
  if (bytes <= KB) return t.bytes(bytes);
  if (bytes <= MB) return t.kb((bytes / KB).toFixed(2));
  if (bytes <= GB) return t.mb((bytes / MB).toFixed(2));
  return t.gb((bytes / GB).toFixed(2));
}

export function formatTime(secs: number, t: Dict, skipLast = false): string {
  if (secs < 60) return t.sec(Math.round(secs));
  const seconds = Math.round(secs % 60);
  const minutes = Math.floor(secs / 60) % 60;
  const hours = Math.floor(secs / 3600) % 24;
  const days = Math.floor(secs / 86400) % 365;
  const years = Math.floor(secs / 31536000);
  const join = (...parts: string[]) => parts.filter(Boolean).join(" ");
  if (years > 0) return join(t.year(years), !skipLast && days ? t.days(days) : "");
  if (secs < 3600) return join(minutes ? t.min(minutes) : "", !skipLast && seconds ? t.sec(seconds) : "");
  if (secs < 86400) return join(hours ? t.hr(hours) : "", !skipLast && minutes ? t.min(minutes) : "");
  if (secs < 604800)
    return join(days ? t.days(days) : "", hours ? t.hr(hours) : "", !skipLast && minutes ? t.min(minutes) : "");
  return join(days ? t.days(days) : "", !skipLast && hours ? t.hr(hours) : "");
}

export function formatMbps(bytesPerSec: number | null): string {
  return bytesPerSec && bytesPerSec > 0 ? `${Math.round(bytesPerSec / MB)} Mbps` : EMPTY;
}

export function formatPing(ms: number | null): string {
  return ms && ms > 0 && ms < 100000 ? `${ms} ms` : EMPTY;
}

export function shorten(value: string, max: number): string {
  if (!value || value.length <= max) return value || "";
  const half = Math.floor(max / 2);
  return `${value.substring(0, half)}${ELLIPSIS}${value.substring(value.length - half)}`;
}

export function uptimeTone(uptime: number): StatusTone {
  if (uptime >= 99) return "green";
  if (uptime >= 95) return "yellow";
  if (uptime > 0) return "red";
  return "gray";
}
