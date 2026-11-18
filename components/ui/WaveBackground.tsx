import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');
const SAMPLES = 40;

interface Line {
  baseY:       number;
  bow:         number;   // px, >0 = curves down, <0 = curves up
  color:       string;
  opacity:     number;
  strokeWidth: number;
  phase:       number;
}

function buildPath(line: Line): string {
  let d = '';
  for (let i = 0; i <= SAMPLES; i++) {
    const xRat = i / SAMPLES;
    const x    = xRat * W;
    const y    = line.baseY
      + line.bow  * Math.sin(Math.PI * xRat)
      + line.bow  * 0.18 * Math.sin(2 * Math.PI * xRat * 1.6 + line.phase);
    d += i === 0 ? `M ${x.toFixed(1)},${y.toFixed(1)}` : ` L ${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d;
}

// ── Groupe haut : bleu → doré, courbes vers le bas ──────────────────
const TOP: Line[] = Array.from({ length: 12 }, (_, i) => {
  const t       = i / 11;
  const isBright = i === 3 || i === 4;
  return {
    baseY:       H * (0.015 + t * 0.27),
    bow:         H * (0.20  - t * 0.16),
    color:       i < 4 ? '#00b4d8' : i < 8 ? '#f59e0b' : '#a78bfa',
    opacity:     isBright ? 0.55 : 0.06 + t * 0.16,
    strokeWidth: isBright ? 1.4  : 0.5 + t * 0.4,
    phase:       i * 0.44,
  };
});

// ── Groupe bas : violet → rose fluo, courbes vers le haut ────────────
const BOT: Line[] = Array.from({ length: 12 }, (_, i) => {
  const t       = i / 11;
  const isBright = i === 7 || i === 8;
  return {
    baseY:       H * (0.715 + t * 0.27),
    bow:         -H * (0.04 + t * 0.16),
    color:       i < 3 ? '#a78bfa' : '#f472b6',
    opacity:     isBright ? 0.50 : 0.16 - t * 0.10,
    strokeWidth: isBright ? 1.4  : 0.5 + (1 - t) * 0.4,
    phase:       i * 0.40 + Math.PI * 0.65,
  };
});

// Lignes lumineuses : halo + filet (dessinées deux fois pour l'effet glow)
const BRIGHT_GLOW: { line: Line; glow: boolean }[] = [
  ...TOP.filter(l => l.opacity > 0.8).flatMap(l => [
    { line: { ...l, strokeWidth: l.strokeWidth + 5, opacity: 0.06 }, glow: true },
    { line: l, glow: false },
  ]),
  ...BOT.filter(l => l.opacity > 0.75).flatMap(l => [
    { line: { ...l, strokeWidth: l.strokeWidth + 5, opacity: 0.06 }, glow: true },
    { line: l, glow: false },
  ]),
];

const NORMAL_LINES = [
  ...TOP.filter(l => l.opacity <= 0.8),
  ...BOT.filter(l => l.opacity <= 0.75),
];

// Pré-calcul statique (aucun re-render nécessaire)
const NORMAL_PATHS  = NORMAL_LINES.map(buildPath);
const BRIGHT_PATHS  = BRIGHT_GLOW.map(({ line }) => buildPath(line));

export function WaveBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={W} height={H}>
        {/* Lignes normales */}
        {NORMAL_LINES.map((line, i) => (
          <Path
            key={`n${i}`}
            d={NORMAL_PATHS[i]}
            stroke={line.color}
            strokeWidth={line.strokeWidth}
            strokeLinecap="round"
            fill="none"
            opacity={line.opacity}
          />
        ))}
        {/* Lignes lumineuses (halo + filet) */}
        {BRIGHT_GLOW.map(({ line }, i) => (
          <Path
            key={`b${i}`}
            d={BRIGHT_PATHS[i]}
            stroke={line.color}
            strokeWidth={line.strokeWidth}
            strokeLinecap="round"
            fill="none"
            opacity={line.opacity}
          />
        ))}
      </Svg>
    </View>
  );
}
