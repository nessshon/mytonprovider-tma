import { EmptyState } from "@/components/EmptyState";
import { FloatingTabs } from "@/components/FloatingTabs";
import { Icon } from "@/components/Icon/Icon";
import { MenuSheet } from "@/components/MenuSheet";
import { RoundToggle } from "@/components/RoundToggle";
import { TabPager } from "@/components/TabPager";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";
import { countActiveFilters, selectCatalog } from "@/data/query";
import { hydrateFromServer, setAlertsEnabled, toggleBell, toggleFavorite } from "@/data/sync";
import type { Provider } from "@/data/types";
import { useT } from "@/i18n";
import { cx } from "@/lib/cx";
import { isInTelegram } from "@/lib/telegram";
import { useAlerts } from "@/stores/alerts";
import { useAuth } from "@/stores/auth";
import { useCatalog } from "@/stores/catalog";
import { PAGE_SIZE, type Tab, useCatalogQuery } from "@/stores/catalogQuery";
import { useFavorites } from "@/stores/favorites";
import { useSubscriptions } from "@/stores/subscriptions";
import { useUi } from "@/stores/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Home.module.css";
import { ProviderPane } from "./ProviderPane";
import { TonLogo } from "./TonLogo";

const RELOAD_SPIN_MS = 1100;
const SCROLL_TOP_THRESHOLD = 360;
const TABS = ["subs", "list", "fav"] as const;

export function Home() {
  const t = useT();
  const navigate = useNavigate();

  const providers = useCatalog((s) => s.providers);
  const bounds = useCatalog((s) => s.bounds);
  const status = useCatalog((s) => s.status);
  const errorStatus = useCatalog((s) => s.errorStatus);
  const load = useCatalog((s) => s.load);
  const reload = useCatalog((s) => s.reload);

  const tab = useCatalogQuery((s) => s.tab);
  const search = useCatalogQuery((s) => s.search);
  const sort = useCatalogQuery((s) => s.sort);
  const filters = useCatalogQuery((s) => s.filters);
  const visible = useCatalogQuery((s) => s.visible);
  const setTab = useCatalogQuery((s) => s.setTab);
  const setSearch = useCatalogQuery((s) => s.setSearch);
  const setSortField = useCatalogQuery((s) => s.setSortField);
  const loadMore = useCatalogQuery((s) => s.loadMore);

  const favorites = useFavorites((s) => s.favorites);
  const loggedIn = useAuth((s) => s.loggedIn);
  const subscribed = useSubscriptions((s) => s.subscribed);
  const alertsOff = useSubscriptions((s) => s.alertsOff);
  const alertEnabled = useAlerts((s) => s.enabled);
  const menuOpen = useUi((s) => s.menuOpen);
  const setMenuOpen = useUi((s) => s.setMenuOpen);

  const panes = useRef<Record<string, HTMLDivElement | null>>({});
  const reloadTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(reloadTimer.current), []);
  const [progress, setProgress] = useState(TABS.indexOf(tab));
  const [showTop, setShowTop] = useState(false);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setShowTop((panes.current[tab]?.scrollTop ?? 0) > SCROLL_TOP_THRESHOLD);
  }, [tab]);

  const listItems = useMemo(
    () => selectCatalog(providers, { favTab: false, search, filters, sort, favorites, bounds }),
    [providers, search, filters, sort, favorites, bounds],
  );
  const favItems = useMemo(
    () => selectCatalog(providers, { favTab: true, search, filters, sort, favorites, bounds }),
    [providers, search, filters, sort, favorites, bounds],
  );
  const subItems = useMemo(() => {
    if (!loggedIn) return [];
    const query = search.trim().toLowerCase();
    return providers.filter(
      (p) => subscribed.includes(p.pubkey) && (!query || p.pubkey.toLowerCase().includes(query)),
    );
  }, [loggedIn, providers, subscribed, search]);

  const activeFilters = countActiveFilters(filters);
  const initialLoading = status !== "ready" && status !== "error";
  const loading = spinning || initialLoading;
  const subsLoading = loggedIn && loading && subscribed.length > 0;
  const favLoading = loading && favorites.length > 0;
  const isError = status === "error" && providers.length === 0;

  const onReload = () => {
    if (spinning) return;
    setSpinning(true);
    const startedAt = performance.now();
    void reload().finally(() => {
      const rest = Math.max(0, RELOAD_SPIN_MS - (performance.now() - startedAt));
      reloadTimer.current = setTimeout(() => setSpinning(false), rest);
    });
    if (useAuth.getState().token) {
      hydrateFromServer().catch((error: unknown) => console.error("reload sync failed", error));
    }
  };

  const onPaneScroll = (paneTab: Tab, scrollTop: number) => {
    if (paneTab === tab) setShowTop(scrollTop > SCROLL_TOP_THRESHOLD);
  };

  const scrollToTop = () => {
    panes.current[tab]?.scrollTo({ top: 0, behavior: "smooth" });
    setShowTop(false);
  };

  const openProvider = (pubkey: string) => navigate(`/provider/${pubkey}`);

  const starToggle = (provider: Provider) => (
    <RoundToggle
      glyph="star"
      size={18}
      active={favorites.includes(provider.pubkey)}
      ariaLabel={t.fav}
      onClick={(event) => {
        event.stopPropagation();
        toggleFavorite(provider.pubkey);
      }}
    />
  );

  const bellToggle = (provider: Provider) => (
    <RoundToggle
      glyph="bell"
      size={17}
      active={!alertsOff.includes(provider.pubkey)}
      ariaLabel={t.notifBtn}
      onClick={(event) => {
        event.stopPropagation();
        toggleBell(provider.pubkey);
      }}
    />
  );

  const hero = (
    <div className={styles.hero}>
      <span className={styles.heroLogo}>
        <TonLogo />
      </span>
      <div className={styles.heroTitle}>{t.mainTitle}</div>
      <div className={styles.heroDesc}>{t.mainDesc}</div>
    </div>
  );

  const listToolbar = (providers.length > 0 || loading) && (
    <div className={styles.toolbar}>
      <button type="button" className={styles.toolbarBtn} onClick={() => setSortField(sort.field)}>
        <span className={cx(styles.sortChevron, sort.dir === "asc" && styles.sortChevronUp)}>
          <Icon glyph="chevronDown" size={13} color="var(--ts-accent)" />
        </span>
        {t.sortField[sort.field]}
      </button>
      <button type="button" className={styles.toolbarBtn} onClick={() => navigate("/filters")}>
        <Icon glyph="sliders" size={16} />
        {t.filters}
        {activeFilters > 0 && <span className={styles.filterDot} />}
      </button>
    </div>
  );

  const subsToolbar = (subItems.length > 0 || subsLoading) && (
    <div className={styles.toolbar}>
      <button type="button" className={styles.toolbarBtn} onClick={() => setAlertsEnabled(!alertEnabled)}>
        {alertEnabled ? (
          <Icon glyph="bell" size={16} color="var(--ts-accent)" filled />
        ) : (
          <Icon glyph="bellOff" size={16} color="var(--ts-hint)" />
        )}
        {t.notifBtn}
      </button>
      <button type="button" className={styles.toolbarBtn} onClick={() => navigate("/alerts")}>
        <Icon glyph="sliders" size={16} />
        {t.settingsBtn}
      </button>
    </div>
  );

  const errorBlock = (
    <div className={styles.errorBlock}>
      <Icon glyph="close" size={42} color="var(--ts-hint)" />
      <div>
        <div className={styles.errorText}>{t.loadError}</div>
        {errorStatus !== null && <div className={styles.errorCode}>HTTP {errorStatus}</div>}
      </div>
      <button type="button" className={styles.retryBtn} onClick={onReload}>
        {t.retry}
      </button>
    </div>
  );

  const loginBlock = (
    <div className={styles.loginBlock}>
      <Icon glyph="telegram" size={44} color="var(--ts-tg)" />
      <div className={styles.loginTitle}>{t.loginTg}</div>
      <div className={styles.loginDesc}>{t.loginHint}</div>
      <div className={styles.loginButtonWrap}>
        <TelegramLoginButton />
      </div>
    </div>
  );

  const pane = (key: Tab) => {
    if (key === "subs") {
      const rows = subItems.slice(0, visible.subs);
      return (
        <ProviderPane
          toolbar={subsToolbar}
          count={loggedIn && subItems.length > 0 ? t.showing(rows.length, subItems.length) : null}
          loading={subsLoading}
          skeletonCount={rows.length || Math.min(subscribed.length, PAGE_SIZE)}
          rows={rows}
          trailing={bellToggle}
          fallback={
            !loggedIn ? (
              loginBlock
            ) : isError ? (
              errorBlock
            ) : (
              <EmptyState
                glyph="bell"
                iconColor="var(--ts-star)"
                title={t.subsEmptyTitle}
                desc={t.subsEmptyDesc}
              />
            )
          }
          onOpen={openProvider}
          onLoadMore={subItems.length > rows.length ? () => loadMore("subs") : undefined}
        />
      );
    }

    const items = key === "fav" ? favItems : listItems;
    const rows = items.slice(0, visible[key]);
    return (
      <ProviderPane
        hero={key === "list" ? hero : undefined}
        toolbar={key === "list" ? listToolbar : undefined}
        count={items.length > 0 ? t.showing(rows.length, items.length) : null}
        loading={key === "fav" ? favLoading : loading}
        skeletonCount={rows.length || (key === "fav" ? Math.min(favorites.length, PAGE_SIZE) : PAGE_SIZE)}
        rows={rows}
        trailing={starToggle}
        fallback={
          isError ? (
            errorBlock
          ) : (
            <EmptyState
              glyph={key === "fav" ? "star" : "search"}
              iconColor="var(--ts-star)"
              title={key === "fav" ? t.favEmptyTitle : t.providersNotFound}
              desc={key === "fav" ? t.favEmptyDesc : undefined}
            />
          )
        }
        onOpen={openProvider}
        onLoadMore={items.length > rows.length ? () => loadMore(key) : undefined}
      />
    );
  };

  return (
    <div className={styles.screen}>
      <nav className={styles.nav}>
        {!isInTelegram() && <div className={styles.headerTitle}>{t.appName}</div>}
        <div className={styles.search}>
          <Icon glyph="search" size={16} color="var(--ts-hint)" />
          <input
            className={styles.searchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.searchPlaceholder}
          />
          {search && (
            <button type="button" aria-label="Clear" className={styles.searchClear} onClick={() => setSearch("")}>
              <Icon glyph="close" size={16} color="var(--ts-hint)" stroke={2} />
            </button>
          )}
        </div>
        <div className={styles.navActions}>
          <button type="button" aria-label="Refresh" className={styles.headerBtn} onClick={onReload}>
            <span className={spinning ? styles.spin : undefined}>
              <Icon glyph="reload" size={20} color="var(--ts-hint)" />
            </span>
          </button>
          <button type="button" aria-label={t.settings} className={styles.headerBtn} onClick={() => setMenuOpen(true)}>
            <Icon glyph="menu" size={22} color="var(--ts-hint)" />
          </button>
        </div>
      </nav>

      <TabPager
        tabs={TABS}
        tab={tab}
        panes={panes}
        onTabChange={setTab}
        onProgress={setProgress}
        onPaneScroll={onPaneScroll}
      >
        {pane}
      </TabPager>

      <button
        type="button"
        aria-label="Scroll to top"
        aria-hidden={!showTop}
        tabIndex={showTop ? 0 : -1}
        className={cx(styles.fab, showTop && styles.fabVisible)}
        onClick={scrollToTop}
      >
        <Icon glyph="arrowUp" size={22} color="#fff" />
      </button>

      <FloatingTabs
        tabs={[
          { key: "subs", label: t.subs, glyph: "bell" },
          { key: "list", label: t.list, glyph: "grid" },
          { key: "fav", label: t.fav, glyph: "star" },
        ]}
        tab={tab}
        progress={progress}
        onSelect={setTab}
      />

      {menuOpen && <MenuSheet onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
