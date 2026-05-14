import React from 'react';

/**
 * Custom XAxis tick die zowel het jaar als de leeftijd toont:
 *   2041
 *   54j
 *
 * birthYear wordt meegegeven als prop zodat dit per gebruiker kan verschillen.
 */
export default function JaarTick({ x, y, payload, birthYear = 1990 }) {
  if (!payload?.value) return null;
  const jaar = parseInt(payload.value, 10);
  if (isNaN(jaar)) return null;
  const leeftijd = jaar - birthYear;

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle"
        style={{ fontFamily:'DM Mono, monospace', fontSize:10, fill:'var(--ink-muted)' }}>
        {jaar}
      </text>
      <text x={0} y={0} dy={23} textAnchor="middle"
        style={{ fontFamily:'DM Mono, monospace', fontSize:9, fill:'var(--gold-dim)', fontWeight:600 }}>
        {leeftijd}j
      </text>
    </g>
  );
}
