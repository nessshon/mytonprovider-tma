import { Chart } from "@/components/Chart";
import { Gauge } from "@/components/Gauge";
import { SectionHeader } from "@/components/SectionHeader";
import { SegmentControl } from "@/components/SegmentControl";
import { adaptOwner, type GaugeKey, type OwnerPeriod } from "@/data/owner";
import { unsubscribeProvider } from "@/data/sync";
import type { Provider } from "@/data/types";
import { prefetchOwner, useOwnerData } from "@/hooks/useOwnerData";
import { useT } from "@/i18n";
import type { Dict, DictStringKey } from "@/i18n/types";
import { explorerAddressUrl } from "@/lib/address";
import { cx } from "@/lib/cx";
import { formatTime } from "@/lib/format";
import { Icon } from "@/components/Icon/Icon";
import { useAlerts } from "@/stores/alerts";
import { useAuth } from "@/stores/auth";
import { useSettings } from "@/stores/settings";
import { type ReactNode, useEffect, useState } from "react";
import { FieldCard } from "./FieldCard";
import styles from "./ProviderDetail.module.css";

type OwnerTab = "overview" | "earnings" | "charts";

const GAUGE_LABEL: Record<GaugeKey, DictStringKey> = {
  cpu_high: "chartCpu",
  ram_high: "chartRam",
  disk_load_high: "chartDisk",
  network_high: "chartNet",
};

export function OwnerPanel({ provider, pubkey, children }: { provider: Provider; pubkey: string; children: ReactNode }) {
  const t = useT();
  const loggedIn = useAuth((s) => s.loggedIn);
  const thresholds = useAlerts((s) => s.thresholds);

  const [tab, setTab] = useState<OwnerTab>("overview");
  const [period, setPeriod] = useState<OwnerPeriod>("today");
  const [chartPeriod, setChartPeriod] = useState<OwnerPeriod>("today");

  const { payload, denied, failed, refreshing } = useOwnerData(pubkey, loggedIn, period, chartPeriod);
  useEffect(() => {
    if (loggedIn) prefetchOwner(pubkey);
  }, [pubkey, loggedIn]);
  useEffect(() => {
    if (denied) unsubscribeProvider(pubkey);
  }, [denied, pubkey]);

  const owner = payload ? adaptOwner(provider, payload, thresholds) : null;
  const nowSec = Math.floor(Date.now() / 1000);
  const explorer = useSettings((state) => state.explorer);
  const walletUrl = explorerAddressUrl(provider.address, explorer);
  const loading = loggedIn && !payload && !denied && !failed;

  return (
    <>
      {owner ? (
        <>
          <div className={cx(styles.card, styles.balanceCard)}>
            <div className={styles.balanceMain}>
              <div className={styles.subLabel}>{t.balanceLabel}</div>
              <div className={styles.balanceRow}>
                <span className={styles.balanceValue}>{owner.balance}</span>
                <span className={styles.balanceUnit}>GRAM</span>
              </div>
              <div className={styles.balanceUpdated}>
                {owner.balanceUpdatedAt === null ? t.unknown : t.updatedAgo(formatTime(nowSec - owner.balanceUpdatedAt, t, true))}
              </div>
            </div>
            <a
              className={styles.explorerBtn}
              href={walletUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.viewInExplorer}
            >
              <Icon glyph="arrowUpRight" size={20} stroke={2.2} />
            </a>
          </div>
          <div className={cx(styles.card, styles.storageCard)}>
            <div className={styles.storageTop}>
              <span className={styles.subLabel}>{t.storageUsage}</span>
              <span className={styles.storageValue}>
                {owner.usedGB} / {owner.totalGB} GB
              </span>
            </div>
            <div className={styles.storageBarRow}>
              <div className={styles.storageBarTrack}>
                <div className={styles.storageBarFill} style={{ width: `${owner.usedPct}%`, background: owner.barColor }} />
              </div>
              <span
                className={styles.storagePct}
                style={{
                  color: owner.spaceOver ? owner.barColor : "var(--ts-hint)",
                  fontWeight: owner.spaceOver ? 600 : 500,
                }}
              >
                {owner.usedPct}%
              </span>
            </div>
          </div>
          <div className={styles.ownerSegWrap}>
            <SegmentControl<OwnerTab>
              options={[
                { value: "overview", label: t.overview },
                { value: "earnings", label: t.earningsTab },
                { value: "charts", label: t.chartsTab },
              ]}
              value={tab}
              onChange={setTab}
              height={36}
              fontSize={12}
            />
          </div>
        </>
      ) : loading ? (
        <>
          <div className={styles.card}>
            <div className={styles.skelBalanceLabel} />
            <div className={styles.skelBalanceValue} />
            <div className={styles.skelBalanceNote} />
          </div>
          <div className={cx(styles.card, styles.storageCard)}>
            <div className={styles.storageTop}>
              <div className={styles.skelStorageLabel} />
              <div className={styles.skelStorageValue} />
            </div>
            <div className={styles.skelStorageBar} />
          </div>
          <div className={styles.ownerSegWrap}>
            <div className={styles.skelSeg} />
          </div>
        </>
      ) : null}

      {(tab === "overview" || !owner) && children}

      {tab === "earnings" && owner && (
        <>
          <div className={styles.summaryCard}>
            <div className={styles.periodWrap}>
              <PeriodSegment value={period} onChange={setPeriod} t={t} />
            </div>
            <SummaryRow label={t.earnedLabel} value={owner.summary.earned} loading={refreshing} />
            <SummaryRow label={t.trafficIn} value={owner.summary.trafficIn} loading={refreshing} />
            <SummaryRow label={t.trafficOut} value={owner.summary.trafficOut} loading={refreshing} />
            <SummaryRow label={t.storageGrowth} value={owner.summary.storageGrowth} loading={refreshing} />
          </div>
          <SectionHeader glyph="calendar" title={t.monthlyHeader} />
          <FieldCard
            rows={[
              { label: t.monthlyEarned, value: owner.monthly.earned },
              { label: t.monthlySpace, value: owner.monthly.space },
              { label: t.monthlyTraffic, value: owner.monthly.traffic },
            ]}
          />
          <SectionHeader glyph="history" title={t.allTimeHeader} />
          <FieldCard
            rows={[
              { label: t.allTimeEarned, value: owner.allTime.earned },
              { label: t.allTimeStored, value: owner.allTime.space },
              { label: t.allTimeTraffic, value: owner.allTime.traffic },
            ]}
          />
        </>
      )}

      {tab === "charts" && owner && (
        <>
          <div className={styles.gaugeGrid}>
            {owner.gauges.map((gauge) => (
              <Gauge key={gauge.key} value={gauge.value} threshold={gauge.threshold} label={t[GAUGE_LABEL[gauge.key]]} />
            ))}
          </div>
          <div className={styles.chartCard}>
            <PeriodSegment value={chartPeriod} onChange={setChartPeriod} t={t} />
            {owner.charts.map((chart) => (
              <Chart
                key={chart.key}
                values={chart.values}
                times={chart.times}
                threshold={chart.threshold}
                unit={chart.unit}
                current={chart.current}
                label={t[GAUGE_LABEL[chart.key]]}
                loading={refreshing}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function SummaryRow({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div className={styles.summaryRow}>
      <span className={styles.summaryLabel}>{label}</span>
      {loading ? <span className={styles.skelValue} /> : <span>{value}</span>}
    </div>
  );
}

function PeriodSegment({ value, onChange, t }: { value: OwnerPeriod; onChange: (value: OwnerPeriod) => void; t: Dict }) {
  return (
    <SegmentControl<OwnerPeriod>
      options={[
        { value: "hour", label: t.periodHour },
        { value: "today", label: t.periodDay },
        { value: "week", label: t.periodWeek },
        { value: "month", label: t.periodMonth },
      ]}
      value={value}
      onChange={onChange}
      height={34}
      fontSize={12.5}
    />
  );
}
