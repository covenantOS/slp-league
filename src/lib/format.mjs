// Display helpers shared by pages and the Slack script.

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
  blue: { fill: '#85B7EB', soft: '#B5D4F4', ink: '#042C53', mid: '#378ADD' },
  teal: { fill: '#5DCAA5', soft: '#9FE1CB', ink: '#04342C', mid: '#1D9E75' },
  coral: { fill: '#F0997B', soft: '#F5C4B3', ink: '#4A1B0C', mid: '#D85A30' },
  amber: { fill: '#EF9F27', soft: '#FAC775', ink: '#412402', mid: '#BA7517' },
  purple: { fill: '#7F77DD', soft: '#CECBF6', ink: '#26215C', mid: '#534AB7' },
  gray: { fill: '#B4B2A9', soft: '#D3D1C7', ink: '#2C2C2A', mid: '#888780' },
};
export const ramp = (c) => RAMP[c] || RAMP.gray;
