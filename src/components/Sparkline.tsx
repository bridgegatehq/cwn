interface SparklineProps {
  values: number[];
  label: string;
  width?: number;
  height?: number;
  tone?: 'primary' | 'warning' | 'danger' | 'info';
}

const TONE_VAR: Record<string, string> = {
  primary: 'var(--primary)',
  warning: 'var(--warning-badge)',
  danger: 'var(--danger)',
  info: 'var(--info)',
};

/** Token-only trend line. The colour is decorative; the label carries the meaning. */
export function Sparkline({ values, label, width = 132, height = 40, tone = 'primary' }: SparklineProps) {
  if (values.length < 2) {
    return (
      <svg width={width} height={height} role="img" aria-label={label}>
        <line
          x1="2"
          y1={height - 4}
          x2={width - 2}
          y2={height - 4}
          stroke="var(--border-strong)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
      </svg>
    );
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const stepX = (width - 6) / (values.length - 1);
  const points = values.map((value, index) => {
    const x = 3 + index * stepX;
    const y = height - 6 - ((value - min) / span) * (height - 12);
    return [x, y] as const;
  });

  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${(width - 3).toFixed(1)} ${height - 2} L3 ${height - 2} Z`;
  const stroke = TONE_VAR[tone] || TONE_VAR.primary;

  return (
    <svg width={width} height={height} role="img" aria-label={label}>
      <path d={area} fill={stroke} opacity="0.12" />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0].toFixed(1)} cy={points[points.length - 1][1].toFixed(1)} r="2.6" fill={stroke} />
    </svg>
  );
}
