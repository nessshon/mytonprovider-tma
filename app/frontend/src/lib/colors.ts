export const SC = {
  gray: "#8e8e93",
  green: "#2ec06c",
  yellow: "#e0a000",
  orange: "#ff8c1a",
  red: "#ff3b30",
} as const;

export type StatusTone = keyof typeof SC;

export const ACCENT = "#0098ea";

export function tint(hex: string, alpha: number): string {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}
