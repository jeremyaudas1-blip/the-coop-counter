import { useMemo } from "react";

interface EggBasketProps {
  current: number;
  goal: number;
  className?: string;
}

// Pre-defined egg positions inside the basket — layered from bottom up
// Each position is [cx, cy] relative to a 200x220 viewBox
const EGG_SLOTS: [number, number][] = [
  // Row 1 (bottom) — 5 eggs
  [62, 175], [85, 178], [108, 176], [131, 178], [152, 175],
  // Row 2 — 4 eggs (nestled between row 1)
  [72, 158], [97, 155], [121, 155], [143, 158],
  // Row 3 — 4 eggs
  [63, 140], [88, 137], [112, 137], [140, 140],
  // Row 4 — 3 eggs
  [78, 120], [105, 118], [132, 120],
  // Row 5 — 3 eggs
  [70, 102], [100, 100], [130, 102],
  // Row 6 — 2 eggs (near the top)
  [88, 85], [118, 85],
  // Row 7 (overflowing!) — 2 eggs
  [80, 68], [125, 68],
  // Bonus top — 1 egg
  [103, 52],
];

const EGG_COLORS = [
  "#F5E6D3", // cream
  "#EDD9C4", // warm beige
  "#F2DCC9", // light peach
  "#E8D4BD", // sand
  "#F0E2D0", // eggshell
  "#E5CEAF", // tan
  "#F7EAD9", // pale cream
  "#ECDCC7", // light khaki
];

export function EggBasket({ current, goal, className = "" }: EggBasketProps) {
  const fillPercent = goal > 0 ? Math.min(current / goal, 1) : 0;
  const eggsToShow = Math.round(fillPercent * EGG_SLOTS.length);

  // Deterministic "randomized" rotations for visual variety
  const eggDetails = useMemo(() => {
    return EGG_SLOTS.map((pos, i) => ({
      cx: pos[0],
      cy: pos[1],
      rotation: ((i * 37 + 11) % 30) - 15, // -15 to +15 degrees
      color: EGG_COLORS[i % EGG_COLORS.length],
      rx: 9 + (i % 3), // slight size variation
      ry: 11 + (i % 2),
    }));
  }, []);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        viewBox="0 0 220 230"
        className="w-full max-w-[260px] h-auto"
        aria-label={`Egg basket: ${current} of ${goal} eggs`}
      >
        {/* Basket back weave */}
        <path
          d="M40,90 Q40,50 110,45 Q180,50 180,90 L175,190 Q175,210 110,215 Q45,210 45,190 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
          opacity="0.5"
        />

        {/* Basket weave pattern — horizontal lines */}
        {[105, 125, 145, 165, 185].map((y, i) => {
          const shrink = (y - 90) * 0.12;
          return (
            <line
              key={`h-${i}`}
              x1={48 + shrink}
              y1={y}
              x2={172 - shrink}
              y2={y}
              stroke="hsl(var(--border))"
              strokeWidth="1.2"
              opacity="0.6"
            />
          );
        })}

        {/* Basket weave pattern — vertical curves */}
        {[65, 85, 110, 135, 155].map((x, i) => (
          <line
            key={`v-${i}`}
            x1={x}
            y1={92}
            x2={x + (x > 110 ? 2 : -2)}
            y2={195}
            stroke="hsl(var(--border))"
            strokeWidth="1.2"
            opacity="0.4"
          />
        ))}

        {/* Eggs — render from bottom up, only the filled ones */}
        {eggDetails.slice(0, eggsToShow).map((egg, i) => (
          <g key={i} transform={`rotate(${egg.rotation}, ${egg.cx}, ${egg.cy})`}>
            <ellipse
              cx={egg.cx}
              cy={egg.cy}
              rx={egg.rx}
              ry={egg.ry}
              fill={egg.color}
              stroke="#D4C4A8"
              strokeWidth="0.8"
            >
              {/* Subtle entrance animation */}
              <animate
                attributeName="opacity"
                from="0"
                to="1"
                dur="0.4s"
                begin={`${i * 0.05}s`}
                fill="freeze"
              />
            </ellipse>
            {/* Egg highlight */}
            <ellipse
              cx={egg.cx - 2}
              cy={egg.cy - 3}
              rx={egg.rx * 0.4}
              ry={egg.ry * 0.35}
              fill="white"
              opacity="0.35"
            />
          </g>
        ))}

        {/* Basket front rim */}
        <path
          d="M38,90 Q38,78 110,73 Q182,78 182,90"
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth="3"
          opacity="0.25"
          strokeLinecap="round"
        />

        {/* Basket handle */}
        <path
          d="M55,88 Q55,20 110,15 Q165,20 165,88"
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth="4"
          opacity="0.2"
          strokeLinecap="round"
        />
        <path
          d="M55,88 Q55,20 110,15 Q165,20 165,88"
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth="2"
          opacity="0.15"
          strokeLinecap="round"
          strokeDasharray="6 4"
        />
      </svg>

      {/* Count display */}
      <div className="text-center mt-2">
        <p className="text-3xl font-bold tabular-nums">{current}</p>
        <p className="text-xs text-muted-foreground">
          of {goal} egg goal {fillPercent >= 1 ? "🎉" : ""}
        </p>
        {/* Progress bar */}
        <div className="w-40 h-2 bg-muted rounded-full mt-2 mx-auto overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(fillPercent * 100, 100)}%`,
              backgroundColor: fillPercent >= 1 ? "hsl(var(--chart-3))" : "hsl(var(--primary))",
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1 tabular-nums">
          {Math.round(fillPercent * 100)}% there
        </p>
      </div>
    </div>
  );
}
