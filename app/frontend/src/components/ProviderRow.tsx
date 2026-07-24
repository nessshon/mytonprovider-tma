import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/Icon/Icon";
import { StatusDot } from "@/components/StatusDot";
import type { Provider } from "@/data/types";
import { useT } from "@/i18n";
import { tint } from "@/lib/colors";
import { EMPTY, formatPrice, formatTime, shorten } from "@/lib/format";
import { describeStatus } from "@/lib/status";
import type { ReactNode } from "react";
import styles from "./ProviderRow.module.css";

interface ProviderRowProps {
  provider: Provider;
  onOpen: () => void;
  trailing: ReactNode;
}

export function ProviderRow({ provider, onOpen, trailing }: ProviderRowProps) {
  const t = useT();
  const status = describeStatus(provider, t);
  const place = provider.location?.country || provider.location?.countryIso || EMPTY;
  const hasChecks = status.total > 0 && provider.status === 0;
  const age = provider.workingTime > 0 ? ` · ${formatTime(provider.workingTime, t, true)}` : "";

  return (
    <div className={styles.row} onClick={onOpen}>
      <div className={styles.main}>
        <div className={styles.head}>
          <span className={styles.pk}>{shorten(provider.pubkey, 16).toUpperCase()}</span>
          <CopyButton value={provider.pubkey} />
          <span className={styles.chip}>{`★ ${provider.rating.toFixed(2)}`}</span>
        </div>
        <div className={styles.status}>
          <StatusDot color={status.color} size={7} />
          <span className={styles.label} style={{ color: status.color }}>
            {status.label}
          </span>
          {hasChecks && (
            <span className={styles.checks}>
              <span className={styles.passed} style={{ background: tint(status.checksColor, 0.18), color: status.checksColor }}>
                {status.passed}
              </span>
              <span className={styles.slash}>/</span>
              <span className={styles.total}>{status.total}</span>
            </span>
          )}
        </div>
        <div className={styles.meta}>
          <Icon glyph="globe" size={12} />
          <span className={styles.metaText}>{`${place} · ${provider.uptime.toFixed(2)}%${age}`}</span>
        </div>
      </div>
      <span className={styles.price}>
        <img className={styles.gram} src="/gram.svg" alt="" width={15} height={15} />
        {formatPrice(provider.price)}
      </span>
      {trailing}
    </div>
  );
}
