/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#F4F7F2',
    tint: '#B7F34A',

    // Core surfaces
    background: '#090B0D',
    foreground: '#F4F7F2',

    // Cards / elevated surfaces
    card: '#11161A',
    cardForeground: '#F4F7F2',

    // Primary action color (buttons, links, active states)
    primary: '#B7F34A',
    primaryForeground: '#0B1008',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#1A2223',
    secondaryForeground: '#DCE7DC',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#162021',
    mutedForeground: '#84938C',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#20301B',
    accentForeground: '#DDFBA5',

    // Destructive actions (delete, error states)
    destructive: '#F05B69',
    destructiveForeground: '#FFF6F6',

    // Borders and input outlines
    border: '#263133',
    input: '#263133',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
