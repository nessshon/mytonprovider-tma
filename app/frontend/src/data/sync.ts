import { type AlertSettingsPayload, backend } from "@/data/backend";
import type { Explorer, Theme } from "@/stores/settings";
import { ALERT_TYPES, DEFAULT_THRESHOLD, type AlertTypeMap, type ThresholdMap } from "@/data/alerts";
import { normalizeLang } from "@/i18n";
import type { AlertKey, Lang } from "@/i18n/types";
import { useAlerts } from "@/stores/alerts";
import { useAuth } from "@/stores/auth";
import { useSettings } from "@/stores/settings";
import { useFavorites } from "@/stores/favorites";
import { useSubscriptions } from "@/stores/subscriptions";

let chain: Promise<unknown> = Promise.resolve();

function queue(label: string, action: () => Promise<unknown>): void {
  if (!useAuth.getState().token) return;
  chain = chain.then(action).catch((error: unknown) => console.error(`${label} failed`, error));
}

function toAlertMaps(payload: AlertSettingsPayload): { types: AlertTypeMap; thresholds: ThresholdMap } {
  const types = {} as AlertTypeMap;
  const thresholds: ThresholdMap = {};
  for (const type of ALERT_TYPES) {
    types[type.key] = payload.types.includes(type.key);
    if (type.threshold) thresholds[type.key] = payload.thresholds[type.key] ?? DEFAULT_THRESHOLD;
  }
  return { types, thresholds };
}

function serializeAlerts(): AlertSettingsPayload {
  const state = useAlerts.getState();
  return {
    enabled: state.enabled,
    types: ALERT_TYPES.filter((a) => state.types[a.key]).map((a) => a.key),
    thresholds: Object.fromEntries(
      ALERT_TYPES.filter((a) => a.threshold).map((a) => [a.key, state.thresholds[a.key] ?? DEFAULT_THRESHOLD]),
    ),
  };
}

const MIGRATED_KEY = "mtp-favorites-migrated";

export async function hydrateFromServer(adoptPreferences = false): Promise<void> {
  await chain;
  const profile = await backend.profile();
  const local = useFavorites.getState().favorites;
  if (!localStorage.getItem(MIGRATED_KEY) && local.length > 0) {
    const merged = [...new Set([...profile.favorites, ...local])];
    const pushed = await backend.putFavorites(merged);
    useFavorites.getState().setAll(pushed.favorites);
  } else {
    useFavorites.getState().setAll(profile.favorites);
  }
  localStorage.setItem(MIGRATED_KEY, "1");
  useSubscriptions
    .getState()
    .setAll(profile.subscriptions.map((s) => ({ pubkey: s.pubkey, alertsEnabled: s.alerts_enabled })));
  const { types, thresholds } = toAlertMaps(profile.alerts);
  useAlerts.getState().setAll(profile.alerts.enabled, types, thresholds);
  if (adoptPreferences) {
    useSettings.setState({
      lang: normalizeLang(profile.language_code),
      langAuto: false,
      explorer: profile.explorer,
      ...(profile.theme === "auto" ? {} : { theme: profile.theme, themeAuto: false }),
    });
  }
}

export function toggleFavorite(pubkey: string): void {
  useFavorites.getState().toggle(pubkey);
  const favorites = useFavorites.getState().favorites;
  queue("favorites sync", () => backend.putFavorites(favorites));
}

export function toggleBell(pubkey: string): void {
  useSubscriptions.getState().toggleAlert(pubkey);
  const enabled = !useSubscriptions.getState().alertsOff.includes(pubkey);
  queue("subscription patch", () => backend.patchSubscription(pubkey, enabled));
}

export function unsubscribeProvider(pubkey: string): void {
  useSubscriptions.getState().unsubscribe(pubkey);
  queue("unsubscribe", () => backend.unsubscribe(pubkey));
}

export async function subscribeWithPassword(pubkey: string, password: string): Promise<void> {
  const entry = await backend.subscribe(pubkey, password);
  useSubscriptions.getState().subscribe(entry.pubkey);
}

export function saveAlerts(): void {
  if (alertsPushTimer) {
    clearTimeout(alertsPushTimer);
    alertsPushTimer = null;
  }
  queue("alerts save", () => backend.putAlerts(serializeAlerts()));
}

const ALERTS_PUSH_DELAY_MS = 600;
let alertsPushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleAlertsPush(): void {
  if (alertsPushTimer) clearTimeout(alertsPushTimer);
  alertsPushTimer = setTimeout(flushAlerts, ALERTS_PUSH_DELAY_MS);
}

export function flushAlerts(): void {
  if (!alertsPushTimer) return;
  clearTimeout(alertsPushTimer);
  alertsPushTimer = null;
  queue("alerts save", () => backend.putAlerts(serializeAlerts()));
}

export function setAlertsEnabled(enabled: boolean): void {
  useAlerts.getState().setEnabled(enabled);
  scheduleAlertsPush();
}

export function toggleAlertType(key: AlertKey): void {
  useAlerts.getState().toggleType(key);
  scheduleAlertsPush();
}

export function setAlertThreshold(key: AlertKey, value: number): void {
  useAlerts.getState().setThreshold(key, value);
  scheduleAlertsPush();
}

export function setLanguage(lang: Lang): void {
  useSettings.getState().setLang(lang);
  queue("language sync", () => backend.patchProfile({ language_code: lang }));
}

export function setTheme(theme: Theme): void {
  useSettings.getState().setTheme(theme);
  queue("theme sync", () => backend.patchProfile({ theme }));
}

export function setExplorer(explorer: Explorer): void {
  useSettings.getState().setExplorer(explorer);
  queue("explorer sync", () => backend.patchProfile({ explorer }));
}
