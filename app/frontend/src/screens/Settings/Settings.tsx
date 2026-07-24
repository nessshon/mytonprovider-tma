import { Icon } from "@/components/Icon/Icon";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SegmentControl } from "@/components/SegmentControl";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";
import { useAppliedTheme } from "@/hooks/useTheme";
import type { Lang } from "@/i18n/types";
import { useAppliedLang, useT } from "@/i18n";
import { cx } from "@/lib/cx";
import { isInTelegram } from "@/lib/telegram";
import { endSession } from "@/app/session";
import { setExplorer, setLanguage, setTheme } from "@/data/sync";
import { useAuth } from "@/stores/auth";
import { type Explorer, type Theme, useSettings } from "@/stores/settings";
import { useNavigate } from "react-router-dom";
import styles from "./Settings.module.css";

export function Settings() {
  const t = useT();
  const navigate = useNavigate();

  const theme = useAppliedTheme();
  const lang = useAppliedLang();
  const explorer = useSettings((s) => s.explorer);

  const loggedIn = useAuth((s) => s.loggedIn);
  const user = useAuth((s) => s.user);
  const logout = endSession;
  const inTelegram = isInTelegram();

  return (
    <Screen header={<ScreenHeader title={t.settings} onBack={() => navigate(-1)} />}>
      <div className={cx(styles.label, styles.labelFirst)}>{t.appearance}</div>
      <SegmentControl<Theme>
        options={[
          { value: "light", label: t.light },
          { value: "dark", label: t.dark },
        ]}
        value={theme}
        onChange={setTheme}
      />

      <div className={styles.label}>{t.language}</div>
      <SegmentControl<Lang>
        options={[
          { value: "en", label: "English" },
          { value: "ru", label: "Русский" },
        ]}
        value={lang}
        onChange={setLanguage}
      />

      <div className={styles.label}>{t.explorerLabel}</div>
      <SegmentControl<Explorer>
        options={[
          { value: "tonviewer", label: "Tonviewer" },
          { value: "tonscan", label: "Tonscan" },
        ]}
        value={explorer}
        onChange={setExplorer}
      />

      {loggedIn && user ? (
        <div className={styles.account}>
          {user.photoUrl ? (
            <img className={styles.avatar} src={user.photoUrl} alt="" />
          ) : (
            <div className={styles.avatar}>{user.initials}</div>
          )}
          <div className={styles.accountInfo}>
            <div className={styles.accountName}>{user.name}</div>
            {user.username && <div className={styles.accountUser}>@{user.username}</div>}
          </div>
          {!inTelegram && (
            <button type="button" aria-label={t.logout} className={styles.logoutBtn} onClick={logout}>
              <Icon glyph="logout" size={21} color="var(--ts-danger)" />
            </button>
          )}
        </div>
      ) : (
        !inTelegram && (
          <div className={styles.loginWrap}>
            <TelegramLoginButton />
            <div className={styles.loginHint}>
              <Icon glyph="info" size={13} />
              <span>{t.loginHint}</span>
            </div>
          </div>
        )
      )}
    </Screen>
  );
}
