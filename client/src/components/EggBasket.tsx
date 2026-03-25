import { useMemo } from "react";

interface EggBasketProps {
  current: number;
  className?: string;
}

// Pre-defined egg positions inside the basket — layered from bottom up
const EGG_SLOTS: [number, number][] = [
  // Row 1 (bottom) — 5 eggs
  [62, 175], [85, 178], [108, 176], [131, 178], [152, 175],
  // Row 2 — 4 eggs
  [72, 158], [97, 155], [121, 155], [143, 158],
  // Row 3 — 4 eggs
  [63, 140], [88, 137], [112, 137], [140, 140],
  // Row 4 — 3 eggs
  [78, 120], [105, 118], [132, 120],
  // Row 5 — 3 eggs
  [70, 102], [100, 100], [130, 102],
  // Row 6 — 2 eggs
  [88, 85], [118, 85],
  // Row 7 — 2 eggs
  [80, 68], [125, 68],
  // Bonus top — 1 egg
  [103, 52],
];

const EGG_COLORS = [
  "#F5E6D3", "#EDD9C4", "#F2DCC9", "#E8D4BD",
  "#F0E2D0", "#E5CEAF", "#F7EAD9", "#ECDCC7",
];

export function EggBasket({ current, className = "" }: EggBasketProps) {
  // Scale: each slot represents ~a chunk of eggs. Cap visual at full basket.
  // Show at least 1 egg if current > 0; scale so basket fills around 200+ eggs
  const eggsToShow = useMemo(() => {
    if (current <= 0) return 0;
    // Log scale so it fills nicely: basket looks full around 300-500 eggs
    const ratio = Math.min(current / 300, 1);
    // At least 1 if any eggs, at most all slots
    return Math.max(1, Math.round(ratio * EGG_SLOTS.length));
  }, [current]);

  const eggDetails = useMemo(() => {
    return EGG_SLOTS.map((pos, i) => ({
      cx: pos[0],
      cy: pos[1],
      rotation: ((i * 37 + 11) % 30) - 15,
      color: EGG_COLORS[i % EGG_COLORS.length],
      rx: 9 + (i % 3),
      ry: 11 + (i % 2),
    }));
  }, []);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        viewBox="0 0 220 230"
        className="w-full max-w-[260px] h-auto"
        aria-label={`Egg basket: ${current} eggs`}
      >
        {/* Basket back */}
        <path
          d="M40,90 Q40,50 110,45 Q180,50 180,90 L175,190 Q175,210 110,215 Q45,210 45,190 Z"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
          opacity="0.5"
        />

        {/* Horizontal weave */}
        {[105, 125, 145, 165, 185].map((y, i) => {
          const shrink = (y - 90) * 0.12;
          return (
            <line key={`h-${i}`} x1={48 + shrink} y1={y} x2={172 - shrink} y2={y}
              stroke="hsl(var(--border))" strokeWidth="1.2" opacity="0.6" />
          );
        })}

        {/* Vertical weave */}
        {[65, 85, 110, 135, 155].map((x, i) => (
          <line key={`v-${i}`} x1={x} y1={92} x2={x + (x > 110 ? 2 : -2)} y2={195}
            stroke="hsl(var(--border))" strokeWidth="1.2" opacity="0.4" />
        ))}

        {/* Eggs */}
        {eggDetails.slice(0, eggsToShow).map((egg, i) => (
          <g key={i} transform={`rotate(${egg.rotation}, ${egg.cx}, ${egg.cy})`}>
            <ellipse cx={egg.cx} cy={egg.cy} rx={egg.rx} ry={egg.ry}
              fill={egg.color} stroke="#D4C4A8" strokeWidth="0.8">
              <animate attributeName="opacity" from="0" to="1" dur="0.4s"
                begin={`${i * 0.05}s`} fill="freeze" />
            </ellipse>
            <ellipse cx={egg.cx - 2} cy={egg.cy - 3} rx={egg.rx * 0.4} ry={egg.ry * 0.35}
              fill="white" opacity="0.35" />
          </g>
        ))}

        {/* Basket rim */}
        <path d="M38,90 Q38,78 110,73 Q182,78 182,90"
          fill="none" stroke="hsl(var(--foreground))" strokeWidth="3" opacity="0.25" strokeLinecap="round" />

        {/* Handle */}
        <path d="M55,88 Q55,20 110,15 Q165,20 165,88"
          fill="none" stroke="hsl(var(--foreground))" strokeWidth="4" opacity="0.2" strokeLinecap="round" />
        <path d="M55,88 Q55,20 110,15 Q165,20 165,88"
          fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" opacity="0.15" strokeLinecap="round" strokeDasharray="6 4" />
      </svg>

      {/* Just the count */}
      <div className="text-center mt-1">
        <p className="text-3xl font-bold tabular-nums">{current}</p>
        <p className="text-xs text-muted-foreground">
          eggs in {new Date().getFullYear()} {current > 100 ? "🔥" : current > 0 ? "🥚" : ""}
        </p>
      </div>
    </div>
  );
}
