// Display helpers shared by the Astro pages.

export const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
export const signed = (n) => (n > 0 ? '+' : '') + Math.round(n);
export const signedMoney = (n) => (n < 0 ? '-$' : '+$') + Math.abs(Math.round(n)).toLocaleString('en-US');
export const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-06-23" -> "Jun 23" (timezone-safe, no Date parsing drift). */
export function shortDate(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

/** Map a player/tier color name to its ramp hexes for inline styling. */
export const RAMP = {
  green: { fill: '#15a04e', soft: 'rgba(21,160,78,0.14)', ink: '#ffffff', mid: '#0c7a3a' },
  red: { fill: '#e0413e', soft: 'rgba(224,65,62,0.14)', ink: '#ffffff', mid: '#b32b29' },
  blue: { fill: '#3b6fe0', soft: 'rgba(59,111,224,0.14)', ink: '#ffffff', mid: '#2a52ad' },
  amber: { fill: '#f2a51c', soft: 'rgba(242,165,28,0.16)', ink: '#4a3500', mid: '#d98e00' },
  teal: { fill: '#12a594', soft: 'rgba(18,165,148,0.14)', ink: '#ffffff', mid: '#0c7a6e' },
  coral: { fill: '#f2683c', soft: 'rgba(242,104,60,0.14)', ink: '#ffffff', mid: '#c44a23' },
  purple: { fill: '#7c5cff', soft: 'rgba(124,92,255,0.14)', ink: '#ffffff', mid: '#5a3fd6' },
  gray: { fill: '#98a0ab', soft: 'rgba(152,160,171,0.16)', ink: '#ffffff', mid: '#6c7480' },
};
export const ramp = (c) => RAMP[c] || RAMP.gray;
