import { backend } from "@/data/backend";
import { getInitDataRaw, isInTelegram } from "@/lib/telegram";
import { consumeRedirectCode, redirectUri } from "@/lib/telegramLogin";
import { hydrateFromServer } from "@/data/sync";
import { makeAuthUser, useAuth } from "@/stores/auth";
import { useSubscriptions } from "@/stores/subscriptions";

async function finishRedirectLogin(code: string): Promise<void> {
  const auth = useAuth.getState();
  const result = await backend.authCode(code, redirectUri());
  auth.login(makeAuthUser(result.name ?? "Telegram User", null, result.username, result.photo_url));
  auth.setToken(result.token);
}

export async function establishSession(): Promise<void> {
  const auth = useAuth.getState();
  const code = isInTelegram() ? null : consumeRedirectCode();
  try {
    if (code) {
      await finishRedirectLogin(code);
    } else if (isInTelegram()) {
      const raw = getInitDataRaw();
      if (!raw) return;
      const { token } = await backend.authTelegram(raw);
      auth.setToken(token);
    } else if (auth.token) {
      const { token } = await backend.refresh();
      auth.setToken(token);
    } else {
      if (auth.loggedIn) auth.logout();
      return;
    }
    await hydrateFromServer(true);
  } catch (error) {
    console.error("backend session failed", error);
    if (!isInTelegram()) auth.logout();
  }
}

export function endSession(): void {
  useAuth.getState().logout();
  useSubscriptions.getState().setAll([]);
}
