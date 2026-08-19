import { Icon } from "@/components/Icon/Icon";
import type { GlyphName } from "@/components/Icon/glyphs";
import { cx } from "@/lib/cx";
import type { ReactNode } from "react";
import styles from "./Field.module.css";

interface FieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  glyph?: GlyphName;
  password?: boolean;
  invalid?: boolean;
  enterKeyHint?: "search" | "done";
  onEnter?: () => void;
  trailing?: ReactNode;
  className?: string;
}

export function Field({
  value,
  onChange,
  placeholder,
  glyph,
  password,
  invalid,
  enterKeyHint,
  onEnter,
  trailing,
  className,
}: FieldProps) {
  return (
    <div className={cx(styles.field, invalid && styles.invalid, className)}>
      {glyph && <Icon glyph={glyph} size={16} color="var(--ts-hint)" />}
      <input
        className={styles.input}
        type={password ? "password" : "text"}
        value={value}
        placeholder={placeholder}
        enterKeyHint={enterKeyHint}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={
          onEnter &&
          ((event) => {
            if (event.key === "Enter") onEnter();
          })
        }
      />
      {trailing}
    </div>
  );
}
