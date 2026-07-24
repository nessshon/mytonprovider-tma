import { Icon } from "@/components/Icon/Icon";
import type { GlyphName } from "@/components/Icon/glyphs";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  glyph: GlyphName;
  title: string;
  desc?: string;
  iconColor?: string;
}

export function EmptyState({ glyph, title, desc, iconColor = "var(--ts-accent)" }: EmptyStateProps) {
  return (
    <div className={styles.root}>
      <Icon glyph={glyph} size={42} color={iconColor} />
      <div className={styles.title}>{title}</div>
      {desc ? <div className={styles.desc}>{desc}</div> : null}
    </div>
  );
}
