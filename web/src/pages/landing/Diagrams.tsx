/*
 * Capability diagrams. Zone: src/pages/landing/**.
 *
 * Four pieces of line art, one per capability, drawn in currentColor at 1px so
 * they read as engineering marks rather than illustration. They are static on
 * purpose: the reference animates its diagrams, and this design spends its
 * whole motion budget on the hero.
 */

const BOX = "0 0 200 160";

/** 01. Payments accumulating into a file the underwriter reads. */
export function RevenueArt() {
  return (
    <svg viewBox={BOX} fill="none" stroke="currentColor" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
        <rect
          key={i}
          x={14 + i * 6}
          y={120 - (8 + ((i * 37) % 60))}
          width="3"
          height={8 + ((i * 37) % 60)}
          strokeWidth="1"
          opacity={0.35 + (i % 4) * 0.12}
        />
      ))}
      <line x1="10" y1="120" x2="190" y2="120" strokeWidth="1" opacity="0.4" />
      <rect x="110" y="34" width="72" height="66" strokeWidth="1" />
      <line x1="120" y1="52" x2="172" y2="52" strokeWidth="1" opacity="0.45" />
      <line x1="120" y1="64" x2="164" y2="64" strokeWidth="1" opacity="0.45" />
      <line x1="120" y1="76" x2="172" y2="76" strokeWidth="1" opacity="0.45" />
      <line x1="120" y1="88" x2="150" y2="88" strokeWidth="1" opacity="0.45" />
      <line x1="96" y1="112" x2="110" y2="90" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

/** 02. One payment arriving at a router and leaving as two. */
export function SplitArt() {
  return (
    <svg viewBox={BOX} fill="none" stroke="currentColor" aria-hidden="true">
      <line x1="8" y1="80" x2="86" y2="80" strokeWidth="1" />
      <circle cx="8" cy="80" r="3" fill="currentColor" stroke="none" />
      <rect x="86" y="66" width="28" height="28" strokeWidth="1" transform="rotate(45 100 80)" />
      <line x1="114" y1="80" x2="150" y2="40" strokeWidth="1" />
      <line x1="114" y1="80" x2="150" y2="120" strokeWidth="1" />
      <circle cx="158" cy="36" r="6" strokeWidth="1" />
      <circle cx="158" cy="124" r="10" strokeWidth="1" />
      <text x="168" y="40" fontSize="9" fontFamily="monospace" fill="currentColor" stroke="none" opacity="0.7">
        20
      </text>
      <text x="174" y="128" fontSize="9" fontFamily="monospace" fill="currentColor" stroke="none" opacity="0.7">
        80
      </text>
    </svg>
  );
}

/** 03. A watcher over a scored roster. */
export function UnderwriterArt() {
  return (
    <svg viewBox={BOX} fill="none" stroke="currentColor" aria-hidden="true">
      <line x1="100" y1="14" x2="100" y2="46" strokeWidth="1" />
      <line x1="84" y1="30" x2="116" y2="30" strokeWidth="1" />
      <circle cx="100" cy="30" r="14" strokeWidth="1" opacity="0.5" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <line x1="100" y1="46" x2={46 + i * 54} y2={78} strokeWidth="1" opacity="0.4" />
          <rect x={26 + i * 54} y="80" width="40" height="46" strokeWidth="1" />
          <line
            x1={30 + i * 54}
            y1="118"
            x2={30 + i * 54 + [30, 20, 34][i]}
            y2="118"
            strokeWidth="2"
          />
          <text
            x={30 + i * 54}
            y="98"
            fontSize="10"
            fontFamily="monospace"
            fill="currentColor"
            stroke="none"
            opacity="0.7"
          >
            {["742", "268", "911"][i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** 04. Deposits into a vault, share price stepping up. */
export function VaultArt() {
  return (
    <svg viewBox={BOX} fill="none" stroke="currentColor" aria-hidden="true">
      <circle cx="62" cy="80" r="34" strokeWidth="1" />
      <circle cx="62" cy="80" r="22" strokeWidth="1" opacity="0.45" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x="10" y={44 + i * 22} width="6" height="6" strokeWidth="1" opacity="0.6" />
      ))}
      <line x1="20" y1="80" x2="28" y2="80" strokeWidth="1" opacity="0.5" />
      <polyline points="112,116 130,104 148,96 166,78 184,58" strokeWidth="1" />
      <circle cx="184" cy="58" r="2.5" fill="currentColor" stroke="none" />
      <line x1="108" y1="126" x2="190" y2="126" strokeWidth="1" opacity="0.35" />
      <line x1="108" y1="126" x2="108" y2="48" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}
