import { useEffect, useRef, useState } from 'react';
import Svg, { Circle, Line } from 'react-native-svg';

const BAR_COUNT  = 64;
const MIN_BAR    = 2;
const MAX_BAR    = 22;
const BAR_WIDTH  = 1.8;

interface Props {
  size?:   number;
  radius?: number;
  color?:  string;
  speed?:  number;
}

export function AudioSpectrum({ size = 250, radius = 98, color = '#a78bfa', speed = 1 }: Props) {
  const [, forceUpdate] = useState(0);
  const timeRef  = useRef(0);
  const frameRef = useRef<number | null>(null);
  const lastRef  = useRef(0);

  useEffect(() => {
    const INTERVAL = 1000 / 30; // 30 fps

    const loop = (ts: number) => {
      if (ts - lastRef.current >= INTERVAL) {
        timeRef.current += 0.048 * speed;
        forceUpdate(n => n + 1);
        lastRef.current = ts;
      }
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [speed]);

  const t  = timeRef.current;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <Svg width={size} height={size}>
      {/* Cercle de base */}
      <Circle
        cx={cx} cy={cy} r={radius}
        stroke={color}
        strokeWidth={0.8}
        fill="none"
        opacity={0.2}
      />

      {/* Barres */}
      {Array.from({ length: BAR_COUNT }, (_, i) => {
        const phase = (i / BAR_COUNT) * Math.PI * 2;
        const angle = phase - Math.PI / 2;

        // 3 ondes sinusoïdales décalées = effet organique
        const wave =
          Math.sin(t * 1.3 + phase) * 0.45 +
          Math.sin(t * 2.5 + phase * 2.1) * 0.30 +
          Math.sin(t * 0.7 + phase * 0.85) * 0.25;

        const norm   = (wave + 1) / 2;               // 0 → 1
        const barLen = MIN_BAR + norm * (MAX_BAR - MIN_BAR);
        const opacity = 0.35 + norm * 0.55;

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        return (
          <Line
            key={i}
            x1={cx + radius * cos}
            y1={cy + radius * sin}
            x2={cx + (radius + barLen) * cos}
            y2={cy + (radius + barLen) * sin}
            stroke={color}
            strokeWidth={BAR_WIDTH}
            strokeLinecap="round"
            opacity={opacity}
          />
        );
      })}
    </Svg>
  );
}
