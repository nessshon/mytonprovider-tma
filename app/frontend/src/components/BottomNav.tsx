import { tick } from "@/lib/telegram";
import { Icon } from "@/components/Icon/Icon";
import type { GlyphName } from "@/components/Icon/glyphs";
import { useT } from "@/i18n";
import { type Tab, useCatalogQuery } from "@/stores/catalogQuery";
import styles from "./BottomNav.module.css";

interface TabDef {
  key: Tab;
  labelKey: "list" | "subs" | "fav";
  on: GlyphName;
  off: GlyphName;
  fill: boolean;
}

const TABS: TabDef[] = [
  { key: "list", labelKey: "list", on: "grid", off: "grid", fill: true },
  { key: "subs", labelKey: "subs", on: "bellSolid", off: "bell", fill: false },
  { key: "fav", labelKey: "fav", on: "star", off: "star", fill: true },
];

export function BottomNav() {
  const t = useT();
  const tab = useCatalogQuery((state) => state.tab);
  const setTab = useCatalogQuery((state) => state.setTab);

  return (
    <nav className={styles.nav}>
      {TABS.map((def) => {
        const active = tab === def.key;
        return (
          <button
            key={def.key}
            type="button"
            className={styles.tab}
            style={{ color: active ? "var(--ts-accent)" : "var(--ts-hint)" }}
            onClick={() => {
              if (tab !== def.key) tick();
              setTab(def.key);
            }}
          >
            <Icon glyph={active ? def.on : def.off} size={26} filled={active && def.fill} />
            <span className={styles.label}>{t[def.labelKey]}</span>
          </button>
        );
      })}
    </nav>
  );
}
