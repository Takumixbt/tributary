/*
 * Section diagrams. Zone: src/pages/landing/**.
 *
 * These are the reference's four marks, restyled with our content: a 200x160
 * viewBox, currentColor, 1 to 1.5px strokes, mono captions at 8 to 10px, and a
 * single slow SMIL loop each. Same markup shape, same restraint, so the rows
 * read as the same component the reference uses.
 *
 * Every number that appears inside them is a real one.
 */

const BOX = "0 0 200 160";

/** 01. Payments arriving, one bar each, becoming the file we underwrite. */
export function RevenueArt() {
  const bars = [18, 34, 26, 52, 44, 68, 60, 86, 78, 104];
  return (
    <svg viewBox={BOX} aria-hidden="true">
      {bars.map((height, i) => (
        <rect
          key={i}
          x={18 + i * 17}
          y={128 - height}
          width="9"
          height={height}
          fill="currentColor"
          opacity={0.16 + i * 0.06}
        >
          <animate
            attributeName="height"
            values={`0;${height}`}
            dur="1s"
            begin={`${i * 0.08}s`}
            fill="freeze"
          />
          <animate
            attributeName="y"
            values={`128;${128 - height}`}
            dur="1s"
            begin={`${i * 0.08}s`}
            fill="freeze"
          />
        </rect>
      ))}
      <line x1="12" y1="128" x2="188" y2="128" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <text
        x="12"
        y="146"
        fontSize="8"
        fontFamily="monospace"
        fill="currentColor"
        opacity="0.6"
      >
        PAYMENTS IN
      </text>
      <text
        x="188"
        y="146"
        textAnchor="end"
        fontSize="8"
        fontFamily="monospace"
        fill="currentColor"
        opacity="0.6"
      >
        CREDIT FILE
      </text>
    </svg>
  );
}

/** 02. One payment in, two payments out, split inside the contract. */
export function SplitArt() {
  const boxes = [
    { x: 12, label: "PAID" },
    { x: 74, label: "SPLIT" },
    { x: 136, label: "LOAN" },
  ];
  return (
    <svg viewBox={BOX} aria-hidden="true">
      {boxes.map((box, i) => (
        <g key={box.label}>
          <rect
            x={box.x}
            y="52"
            width="52"
            height="52"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <animate
              attributeName="opacity"
              values="0.4;1;0.4"
              dur="3s"
              begin={`${i}s`}
              repeatCount="indefinite"
            />
          </rect>
          <text
            x={box.x + 26}
            y="82"
            textAnchor="middle"
            fontSize="8"
            fontFamily="monospace"
            fill="currentColor"
            opacity="0.7"
          >
            {box.label}
          </text>
          {i < boxes.length - 1 ? (
            <line
              x1={box.x + 52}
              y1="78"
              x2={box.x + 62}
              y2="78"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="3 2"
            >
              <animate attributeName="stroke-dashoffset" values="0;-5" dur="0.6s" repeatCount="indefinite" />
            </line>
          ) : null}
        </g>
      ))}
      <text
        x="100"
        y="30"
        textAnchor="middle"
        fontSize="9"
        fontFamily="monospace"
        fill="currentColor"
        opacity="0.5"
      >
        20 to the loan
      </text>
      <text
        x="100"
        y="132"
        textAnchor="middle"
        fontSize="9"
        fontFamily="monospace"
        fill="currentColor"
        opacity="0.5"
      >
        80 to the agent
      </text>
      <line x1="40" y1="120" x2="160" y2="120" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}

/** 03. The score under continuous review. 268 is the real posted score. */
export function UnderwriterArt() {
  const satellites = [
    { cx: 150, cy: 80, begin: "0s" },
    { cx: 100, cy: 130, begin: "0.5s" },
    { cx: 50, cy: 80, begin: "1s" },
    { cx: 100, cy: 30, begin: "1.5s" },
  ];
  return (
    <svg viewBox={BOX} aria-hidden="true">
      <circle
        cx="100"
        cy="80"
        r="50"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 100 80"
          to="360 100 80"
          dur="20s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="100" cy="80" r="30" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="360 100 80"
          to="0 100 80"
          dur="12s"
          repeatCount="indefinite"
        />
      </circle>
      {satellites.map((dot) => (
        <circle
          key={dot.begin}
          cx={dot.cx}
          cy={dot.cy}
          r="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <animate
            attributeName="opacity"
            values="1;0.3;1"
            dur="2s"
            begin={dot.begin}
            repeatCount="indefinite"
          />
        </circle>
      ))}
      <text
        x="100"
        y="84"
        textAnchor="middle"
        fontSize="16"
        fontFamily="monospace"
        fill="currentColor"
        opacity="0.85"
      >
        268
      </text>
    </svg>
  );
}

/** 04. Where a lender's deposit sits, and what comes back. */
export function VaultArt() {
  const rows = [
    { label: "DEPOSIT", y: 24, width: 140, begin: "0s" },
    { label: "ON LOAN", y: 56, width: 96, begin: "0.3s" },
    { label: "INTEREST", y: 88, width: 44, begin: "0.6s" },
  ];
  return (
    <svg viewBox={BOX} aria-hidden="true">
      {rows.map((row) => (
        <g key={row.label}>
          <rect
            x="18"
            y={row.y}
            width="140"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.3"
          />
          <rect x="18" y={row.y} width="0" height="24" fill="currentColor" opacity="0.15">
            <animate
              attributeName="width"
              values={`0;${row.width}`}
              dur="1.5s"
              begin={row.begin}
              fill="freeze"
            />
          </rect>
          <text
            x="26"
            y={row.y + 16}
            fontSize="9"
            fontFamily="monospace"
            fill="currentColor"
            opacity="0.8"
          >
            {row.label}
          </text>
          <circle cx="172" cy={row.y + 12} r="3" fill="currentColor" opacity="0.6">
            <animate
              attributeName="opacity"
              values="0.6;1;0.6"
              dur="1.5s"
              begin={row.begin}
              repeatCount="indefinite"
            />
          </circle>
        </g>
      ))}
      <line x1="18" y1="126" x2="182" y2="126" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <text
        x="18"
        y="144"
        fontSize="8"
        fontFamily="monospace"
        fill="currentColor"
        opacity="0.6"
      >
        NO TOKEN REWARDS
      </text>
    </svg>
  );
}
