import { useMemo } from "react";

interface MonthData {
  month: string;
  eggs: number;
}

interface EggStackChartProps {
  data: MonthData[];
}

const EGG_COLORS = [
  "#F5E6D3", "#EDD9C4", "#F2DCC9", "#E8D4BD",
  "#F0E2D0", "#E5CEAF", "#F7EAD9", "#ECDCC7",
];

function SingleEgg({ cx, cy, size = 1, colorIndex = 0, rotation = 0 }: {
  cx: number; cy: number; size?: number; colorIndex?: number; rotation?: number;
}) {
  const rx = 7 * size;
  const ry = 8.5 * size;
  const color = EGG_COLORS[colorIndex % EGG_COLORS.length];
  return (
    <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={color} stroke="#D4C4A8" strokeWidth="0.6" />
      <ellipse cx={cx - 1.5 * size} cy={cy - 2 * size} rx={rx * 0.35} ry={ry * 0.3} fill="white" opacity="0.35" />
    </g>
  );
}

export function EggStackChart({ data }: EggStackChartProps) {
  const maxEggs = useMemo(() => Math.max(...data.map(d => d.eggs), 1), [data]);

  // Chart dimensions
  const chartWidth = 560;
  const chartHeight = 220;
  const bottomY = chartHeight - 24; // room for month labels
  const topY = 8;
  const availableHeight = bottomY - topY;
  const colWidth = chartWidth / 12;

  // For each month, compute how many egg sprites to draw and their positions
  const columns = useMemo(() => {
    return data.map((d, monthIdx) => {
      const centerX = colWidth * monthIdx + colWidth / 2;
      if (d.eggs === 0) return { month: d.month, eggs: d.eggs, centerX, eggPositions: [] };

      // Scale: max eggs gets full height. Each egg sprite is ~17px tall.
      const eggSpriteH = 17;
      const scaledHeight = (d.eggs / maxEggs) * availableHeight;
      const eggCount = Math.max(1, Math.round(scaledHeight / eggSpriteH));

      const positions: { cx: number; cy: number; rotation: number; colorIdx: number }[] = [];
      for (let i = 0; i < eggCount; i++) {
        // Stack from bottom up
        const cy = bottomY - 10 - i * (eggSpriteH - 1);
        // Slight horizontal jitter for a natural pile look
        const jitter = ((i * 7 + monthIdx * 13) % 7) - 3;
        const cx = centerX + jitter;
        const rotation = ((i * 23 + monthIdx * 11) % 16) - 8;
        positions.push({ cx, cy, rotation, colorIdx: (i + monthIdx) });
      }

      return { month: d.month, eggs: d.eggs, centerX, eggPositions: positions };
    });
  }, [data, maxEggs, colWidth, availableHeight, bottomY]);

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* Subtle baseline */}
      <line x1="0" y1={bottomY} x2={chartWidth} y2={bottomY}
        stroke="hsl(var(--border))" strokeWidth="1" opacity="0.5" />

      {/* Egg stacks */}
      {columns.map((col, i) => (
        <g key={i}>
          {col.eggPositions.map((pos, j) => (
            <SingleEgg
              key={j}
              cx={pos.cx}
              cy={pos.cy}
              colorIndex={pos.colorIdx}
              rotation={pos.rotation}
              size={0.85}
            />
          ))}

          {/* Egg count on top of stack */}
          {col.eggs > 0 && (
            <text
              x={col.centerX}
              y={col.eggPositions.length > 0 ? col.eggPositions[col.eggPositions.length - 1].cy - 14 : bottomY - 16}
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize="10"
              fontWeight="600"
              opacity="0.7"
            >
              {col.eggs}
            </text>
          )}

          {/* Month label */}
          <text
            x={col.centerX}
            y={chartHeight - 4}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize="11"
          >
            {col.month}
          </text>
        </g>
      ))}
    </svg>
  );
}
