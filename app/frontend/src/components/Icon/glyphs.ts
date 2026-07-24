export interface Glyph {
  s?: number;
  fill?: "fill";
  vb?: string;
  inner: string;
}

export const GLYPHS = {
  reload: { s: 1.7, inner: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>' },
  gear: {
    s: 1.7,
    inner:
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  },
  search: { s: 2, inner: '<circle cx="11" cy="11" r="7"/><line x1="16.65" y1="16.65" x2="21" y2="21"/>' },
  close: { s: 3, inner: '<path d="M6 6l12 12M18 6L6 18"/>' },
  bell: {
    s: 1.7,
    inner:
      '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  },
  bellOff: {
    s: 1.7,
    inner:
      '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="3" y1="3" x2="21" y2="21"/>',
  },
  bellSolid: {
    fill: "fill",
    inner:
      '<path d="M12 2.6a6.4 6.4 0 0 0-6.4 6.4c0 6.1-2.6 7.8-2.6 7.8h18s-2.6-1.7-2.6-7.8A6.4 6.4 0 0 0 12 2.6z"/><path d="M10.1 20.4a2.2 2.2 0 0 0 3.8 0z"/>',
  },
  sliders: {
    s: 1.8,
    vb: "0 0 22 22",
    inner:
      '<line x1="3" y1="7" x2="13" y2="7"/><line x1="3" y1="15" x2="9" y2="15"/><circle cx="16" cy="7" r="2.4"/><circle cx="12" cy="15" r="2.4"/><line x1="18" y1="7" x2="19" y2="7"/><line x1="14" y1="15" x2="19" y2="15"/>',
  },
  chevronDown: { s: 2.6, inner: '<path d="M6 9l6 6 6-6"/>' },
  plus: { s: 2.2, inner: '<path d="M12 5v14M5 12h14"/>' },
  arrowUpRight: { s: 2.2, inner: '<path d="M7 17L17 7M9 7h8v8"/>' },
  chat: { s: 2, inner: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
  arrowUp: { s: 2.4, inner: '<path d="M12 19V5M5 12l7-7 7 7"/>' },
  arrowLeft: { s: 2.1, inner: '<line x1="20" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>' },
  star: {
    s: 1.7,
    inner:
      '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  },
  grid: {
    s: 1.7,
    inner:
      '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  },
  clock: { s: 2, inner: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },
  cpu: {
    s: 2,
    inner:
      '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>',
  },
  bars: {
    s: 2,
    inner:
      '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  },
  globe: {
    s: 2,
    inner:
      '<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/>',
  },
  server: {
    s: 2,
    inner:
      '<rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><line x1="7" y1="7.5" x2="7.01" y2="7.5"/><line x1="7" y1="16.5" x2="7.01" y2="16.5"/>',
  },
  calendar: {
    s: 2,
    inner:
      '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  },
  history: { s: 2, inner: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>' },
  logout: {
    s: 2.1,
    inner:
      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  },
  info: {
    s: 2,
    inner:
      '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  },
  lock: { s: 2, inner: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>' },
  eye: { s: 2, inner: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>' },
  check: { s: 2.6, inner: '<path d="M5 13l4 4L19 7"/>' },
  copy: {
    s: 2,
    inner: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  },
  telegram: {
    fill: "fill",
    inner:
      '<path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>',
  },
} satisfies Record<string, Glyph>;

export type GlyphName = keyof typeof GLYPHS;
