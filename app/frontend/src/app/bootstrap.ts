import { establishSession } from "@/app/session";
import { flushAlerts, hydrateFromServer } from "@/data/sync";
import { invalidateOwner } from "@/hooks/useOwnerData";
import { useCatalog } from "@/stores/catalog";
import { getTelegramUser, initTelegram, isInTelegram } from "@/lib/telegram";
import { hydrateStores } from "@/lib/storage";
import { useAlerts } from "@/stores/alerts";
import { makeAuthUser, useAuth } from "@/stores/auth";
import { useFavorites } from "@/stores/favorites";
import { useNames } from "@/stores/names";
import { useSettings } from "@/stores/settings";
import { useSubscriptions } from "@/stores/subscriptions";

const PERSISTED_STORES = [useSettings, useFavorites, useNames, useSubscriptions, useAlerts, useAuth];

function applyTelegramLogin(): void {
  const user = getTelegramUser();
  if (user) {
    useAuth.getState().login(makeAuthUser(user.first_name, user.last_name, user.username, user.photo_url));
  } else {
    useAuth.getState().logout();
  }
}

function registerFocusSync(): void {
  const revalidate = () => {
    void useCatalog.getState().load();
    if (useAuth.getState().token) {
      invalidateOwner();
      hydrateFromServer().catch((error: unknown) => console.error("focus sync failed", error));
    }
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAlerts();
    else revalidate();
  });
  window.addEventListener("focus", revalidate);
}

async function runBootSequence(): Promise<void> {
  const hydration = hydrateStores(PERSISTED_STORES);
  if (isInTelegram()) applyTelegramLogin();
  await hydration;
  if (isInTelegram()) applyTelegramLogin();
  await establishSession();
}

export function bootstrap(): void {
  initTelegram();
  registerFocusSync();
  void runBootSequence();
}
