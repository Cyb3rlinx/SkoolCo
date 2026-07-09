import { cn } from "@/lib/frontend/utils";

/** Maps a series onto SVG points within the given box (padding included). */
function toPoints(data: number[], width: number, height: number, pad = 2): [number, number][] {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = (width - pad * 2) / (data.length - 1);
  return data.map((v, i) => [
    pad + i * stepX,
    pad + (1 - (v - min) / range) * (height - pad * 2),
  ]);
}

/** Violet line sparkline with optional soft gradient fill. Pure SVG, no deps. */
export function Sparkline({
  data,
  width = 96,
  height = 32,
  filled = false,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  filled?: boolean;
  className?: string;
}) {
  const pts = toPoints(data, width, height);
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pts[0][0]},${height} ${line} ${pts[pts.length - 1][0]},${height}`;
  const gradId = `spark-${data.join("-")}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label="Tendencia de votos"
    >
      {filled && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6D3DFF" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#6D3DFF" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polygon points={area} fill={`url(#${gradId})`} />
        </>
      )}
      <polyline
        points={line}
        fill="none"
        stroke="#5B2CFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Violet mini bar chart (community momentum). Pure SVG, no deps. */
export function MiniBars({
  data,
  width = 120,
  height = 44,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const max = Math.max(...data);
  const gap = 3;
  const barW = (width - gap * (data.length - 1)) / data.length;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} role="img" aria-label="Votos por día">
      {data.map((v, i) => {
        const h = Math.max(3, (v / max) * height);
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={height - h}
            width={barW}
            height={h}
            rx={1.5}
            fill={i === data.length - 1 ? "#5B2CFF" : "#C9B8FF"}
          />
        );
      })}
    </svg>
  );
}
