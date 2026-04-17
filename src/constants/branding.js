/**
 * Central brand constants — Service Compression palette.
 *
 * Source of truth is `src/index.css` @theme tokens. This module mirrors
 * them as JS literals for places that need inline style objects or
 * programmatic color access (chart palettes, SVG stroke values, etc.).
 *
 * If you add a new token, add it to BOTH places to keep them in sync.
 */
export const COLORS = {
  // Primary SC palette
  red:           '#D32028',
  redDark:       '#B01A20',
  redDeep:       '#8A1519',

  navy:          '#05233E',
  navyLight:     '#0F3C64',
  navyMuted:     '#293C5B',
  navyDeep:      '#03172A',

  cyan:          '#49D0E2',

  // Neutrals
  white:         '#FFFFFF',
  offwhite:      '#EDEDED',
  lightBg:       '#F2F2F2',
  gray100:       '#D0D0D0',
  gray200:       '#C1C1C1',
  gray500:       '#474444',
  ink:           '#212121',

  // Functional
  link:          '#1863DC',
  success:       '#008000',
  green:         '#22c55e',
  yellow:        '#eab308',
  blue:          '#3b82f6',
  orange:        '#f97316',

  // ── Backwards-compatible aliases (legacy code still imports these) ─
  dark:          '#05233E',
  darker:        '#03172A',
  charcoal:      '#0F3C64',
  charcoalLight: '#293C5B',
  gray:          '#A7B3C4',
  light:         '#FFFFFF',
}

export const FONTS = {
  heading: "'Montserrat', system-ui, -apple-system, sans-serif",
  body:    "'Montserrat', system-ui, -apple-system, sans-serif",
}

export const TYPOGRAPHY = {
  // Exact values from the SC brand extraction — keep non-rounded for
  // fidelity with the live site.
  size: {
    eyebrow: 11,
    label:   12,
    caption: 13.497,
    body:    16,
    bodyLg:  17.178,
    lead:    19.632,
    h4:      20,
    h3:      24,
    h2:      33.129,
    h1:      34.356,
    hero:    41.718,
  },
  tracking: {
    label:    2,      // px — uppercase labels
    subhead:  0.6,
    headline: -0.5,
  },
  weight: {
    light:     300,
    regular:   400,
    medium:    500,
    semibold:  600,
    bold:      700,
    extrabold: 800,
  },
}
