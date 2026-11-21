import clsx from 'clsx';

/** Pip positions in a unit square for each die face. */
const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [
    [0.27, 0.27],
    [0.73, 0.73],
  ],
  3: [
    [0.25, 0.25],
    [0.5, 0.5],
    [0.75, 0.75],
  ],
  4: [
    [0.27, 0.27],
    [0.73, 0.27],
    [0.27, 0.73],
    [0.73, 0.73],
  ],
  5: [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.5, 0.5],
    [0.25, 0.75],
    [0.75, 0.75],
  ],
  6: [
    [0.27, 0.22],
    [0.73, 0.22],
    [0.27, 0.5],
    [0.73, 0.5],
    [0.27, 0.78],
    [0.73, 0.78],
  ],
};

function Pips({ value, matrix }: { value: number; matrix: string }) {
  return (
    <g transform={`matrix(${matrix})`}>
      {(PIPS[value] ?? PIPS[1]).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={value === 1 ? 0.15 : 0.1} fill={value === 1 ? '#E01E45' : '#121A3D'} />
      ))}
    </g>
  );
}

/** Isometric die (three visible faces) in SVG. */
export function IsoDie({ size, faces = [1, 3, 5], className }: { size: number; faces?: [number, number, number]; className?: string }) {
  return (
    <svg viewBox="-2 -2 64 64" width={size} height={size} className={className} aria-hidden>
      <g strokeLinejoin="round" strokeWidth={3}>
        <polygon points="4,15 30,30 30,60 4,45" fill="#E4E8FA" stroke="#E4E8FA" />
        <polygon points="30,30 56,15 56,45 30,60" fill="#AEB6DE" stroke="#AEB6DE" />
        <polygon points="30,0 56,15 30,30 4,15" fill="#FFFFFF" stroke="#FFFFFF" />
      </g>
      <Pips value={faces[0]} matrix="26,-15,26,15,4,15" />
      <Pips value={faces[1]} matrix="26,15,0,30,4,15" />
      <Pips value={faces[2]} matrix="26,-15,0,30,30,30" />
    </svg>
  );
}

/** Flat, glossy die face (HTML) — for illustrations. */
export function FlatDie({ value, size = 56, className }: { value: number; size?: number; className?: string }) {
  return (
    <div
      className={clsx('relative rounded-[22%] bg-gradient-to-b from-white to-ink-200', className)}
      style={{
        width: size,
        height: size,
        boxShadow: `0 ${size / 12}px 0 #8C96C9, 0 ${size / 5}px ${size / 3}px -${size / 8}px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.9)`,
      }}
      role="img"
      aria-label={`Dadu ${value}`}
    >
      {(PIPS[value] ?? PIPS[1]).map(([x, y], i) => (
        <span
          key={i}
          className={clsx('absolute rounded-full', value === 1 ? 'bg-merah-600' : 'bg-ink-900')}
          style={{
            width: size * (value === 1 ? 0.26 : 0.17),
            height: size * (value === 1 ? 0.26 : 0.17),
            left: `${x * 100}%`,
            top: `${y * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
}
