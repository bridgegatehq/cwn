interface SealGraphicLabels {
  badge: string;
  step1: string;
  step1Sub: string;
  step2: string;
  step2Sub: string;
  step3: string;
  step3Sub: string;
}

interface SealGraphicProps {
  className?: string;
  labels: SealGraphicLabels;
}

/**
 * Clean, token-colored vector graphic illustrating timestamp + geostamp + SHA-256 evidence sealing
 * across Nigeria's 6 geopolitical zones. Uses CSS custom properties exclusively (zero hardcoded hex).
 */
export function CivicEvidenceSealGraphic({ className, labels }: SealGraphicProps) {
  return (
    <svg
      viewBox="0 0 360 156"
      role="img"
      aria-label="Illustration showing timestamped report verification, SHA-256 seal, and legal review"
      className={className}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      {/* Subtle Grid Card Surface */}
      <rect
        x="2"
        y="2"
        width="356"
        height="152"
        rx="14"
        fill="var(--surface)"
        stroke="var(--border)"
        strokeWidth="2"
      />

      {/* Connector Line */}
      <line
        x1="68"
        y1="72"
        x2="292"
        y2="72"
        stroke="var(--primary-border)"
        strokeWidth="3"
        strokeDasharray="5 4"
      />

      {/* Step 1 Node: Citizen Report + Geostamp */}
      <g transform="translate(64, 72)">
        <circle r="28" fill="var(--primary-subtle)" stroke="var(--primary)" strokeWidth="2" />
        <path
          d="M-6 -8 H6 L10 -4 V10 H-6 Z"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <line x1="-2" y1="-1" x2="6" y2="-1" stroke="var(--primary)" strokeWidth="2" />
        <line x1="-2" y1="4" x2="4" y2="4" stroke="var(--primary)" strokeWidth="2" />
      </g>
      <text
        x="64"
        y="122"
        textAnchor="middle"
        fill="var(--text)"
        fontSize="11"
        fontWeight="700"
        fontFamily="var(--font-sans)"
      >
        {labels.step1}
      </text>
      <text
        x="64"
        y="137"
        textAnchor="middle"
        fill="var(--text-secondary)"
        fontSize="10"
        fontFamily="var(--font-mono)"
      >
        {labels.step1Sub}
      </text>

      {/* Step 2 Node: Cryptographic SHA-256 Seal */}
      <g transform="translate(180, 72)">
        <circle r="30" fill="var(--accent)" stroke="var(--primary)" strokeWidth="2" />
        <path
          d="M0 -13 L11 -8 V1 C11 8 6 13 0 15 C-6 13 -11 8 -11 1 V-8 Z"
          fill="var(--primary)"
        />
        <path
          d="M-4 1 L-1 4 L5 -3"
          fill="none"
          stroke="var(--text-on-primary)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <text
        x="180"
        y="122"
        textAnchor="middle"
        fill="var(--text)"
        fontSize="11"
        fontWeight="700"
        fontFamily="var(--font-sans)"
      >
        {labels.step2}
      </text>
      <text
        x="180"
        y="137"
        textAnchor="middle"
        fill="var(--text-secondary)"
        fontSize="10"
        fontFamily="var(--font-mono)"
      >
        {labels.step2Sub}
      </text>

      {/* Step 3 Node: Verified Legal Counsel */}
      <g transform="translate(296, 72)">
        <circle r="28" fill="var(--primary-subtle)" stroke="var(--primary)" strokeWidth="2" />
        <line x1="0" y1="-11" x2="0" y2="10" stroke="var(--primary)" strokeWidth="2" />
        <line x1="-11" y1="-6" x2="11" y2="-6" stroke="var(--primary)" strokeWidth="2" />
        <path d="M-11 -6 L-14 2 H-8 Z" fill="var(--primary)" />
        <path d="M11 -6 L8 2 H14 Z" fill="var(--primary)" />
        <line x1="-7" y1="10" x2="7" y2="10" stroke="var(--primary)" strokeWidth="2" />
      </g>
      <text
        x="296"
        y="122"
        textAnchor="middle"
        fill="var(--text)"
        fontSize="11"
        fontWeight="700"
        fontFamily="var(--font-sans)"
      >
        {labels.step3}
      </text>
      <text
        x="296"
        y="137"
        textAnchor="middle"
        fill="var(--text-secondary)"
        fontSize="10"
        fontFamily="var(--font-mono)"
      >
        {labels.step3Sub}
      </text>

      {/* Top Header Label inside SVG */}
      <text
        x="20"
        y="24"
        fill="var(--primary)"
        fontSize="10"
        fontWeight="700"
        letterSpacing="0.8"
        fontFamily="var(--font-sans)"
      >
        {labels.badge}
      </text>
    </svg>
  );
}

interface TopicGraphicProps {
  category: string;
}

/**
 * Tailored editorial header graphic for Knowledge Centre cards so every topic has a crisp visual identity
 * while remaining ultra-fast and accessible on mobile networks.
 */
export function KnowledgeTopicGraphic({ category }: TopicGraphicProps) {
  const cat = category.toLowerCase();
  const isPolice = cat.includes('police') || cat.includes('detention');
  const isProperty = cat.includes('property') || cat.includes('civil');
  const isFamily = cat.includes('family') || cat.includes('human');
  const isAccountability = cat.includes('accountability') || cat.includes('participation');

  return (
    <svg
      viewBox="0 0 320 92"
      aria-hidden="true"
      style={{ width: '100%', height: 'auto', display: 'block', background: 'var(--surface-tint)' }}
    >
      {/* Subtle architectural pattern */}
      <circle cx="284" cy="18" r="46" fill="var(--primary-subtle)" />
      <circle cx="250" cy="78" r="32" fill="var(--accent-subtle)" />

      {/* Left Focal Emblem */}
      <rect
        x="20"
        y="18"
        width="56"
        height="56"
        rx="14"
        fill="var(--surface)"
        stroke="var(--primary-border)"
        strokeWidth="2"
      />

      {isPolice ? (
        <g transform="translate(48, 46)">
          <path
            d="M0 -15 L13 -9 V2 C13 10 7 15 0 18 C-7 15 -13 10 -13 2 V-9 Z"
            fill="var(--primary-subtle)"
            stroke="var(--primary)"
            strokeWidth="2.2"
          />
          <circle cx="0" cy="0" r="5" fill="none" stroke="var(--primary)" strokeWidth="2" />
          <line x1="0" y1="-3" x2="0" y2="0" stroke="var(--primary)" strokeWidth="2" />
          <line x1="0" y1="0" x2="2.5" y2="2" stroke="var(--primary)" strokeWidth="2" />
        </g>
      ) : isProperty ? (
        <g transform="translate(48, 48)">
          <path
            d="M-15 -2 L0 -15 L15 -2 V14 H-15 Z"
            fill="var(--primary-subtle)"
            stroke="var(--primary)"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <rect x="-4" y="3" width="8" height="11" fill="var(--primary)" />
        </g>
      ) : isFamily ? (
        <g transform="translate(48, 46)">
          <circle cx="-6" cy="-6" r="5" fill="none" stroke="var(--primary)" strokeWidth="2.2" />
          <circle cx="7" cy="-4" r="4" fill="none" stroke="var(--primary)" strokeWidth="2.2" />
          <path
            d="M-15 12 C-15 5 -11 2 -6 2 C-1 2 3 5 3 12"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M1 12 C1 7 4 4 8 4 C12 4 15 7 15 12"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>
      ) : isAccountability ? (
        <g transform="translate(48, 46)">
          <rect
            x="-12"
            y="-14"
            width="24"
            height="28"
            rx="3"
            fill="var(--primary-subtle)"
            stroke="var(--primary)"
            strokeWidth="2.2"
          />
          <line x1="-6" y1="-6" x2="6" y2="-6" stroke="var(--primary)" strokeWidth="2" />
          <line x1="-6" y1="0" x2="6" y2="0" stroke="var(--primary)" strokeWidth="2" />
          <line x1="-6" y1="6" x2="2" y2="6" stroke="var(--primary)" strokeWidth="2" />
        </g>
      ) : (
        <g transform="translate(48, 46)">
          <circle r="14" fill="var(--primary-subtle)" stroke="var(--primary)" strokeWidth="2.2" />
          <line x1="0" y1="-7" x2="0" y2="7" stroke="var(--primary)" strokeWidth="2.4" />
          <line x1="-7" y1="0" x2="7" y2="0" stroke="var(--primary)" strokeWidth="2.4" />
        </g>
      )}

      {/* Statutory Reference Strip */}
      <rect
        x="92"
        y="30"
        width="148"
        height="10"
        rx="5"
        fill="var(--primary-border)"
        opacity="0.55"
      />
      <rect
        x="92"
        y="48"
        width="104"
        height="8"
        rx="4"
        fill="var(--border-strong)"
        opacity="0.55"
      />
    </svg>
  );
}

interface ProgressRingProps {
  percent: number;
  label: string;
}

/**
 * Compact radial progress graphic for mobile-first petition & civic milestone cards.
 */
export function CivicProgressGraphic({ percent, label }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <svg
      width="58"
      height="58"
      viewBox="0 0 58 58"
      role="img"
      aria-label={`${label}: ${clamped}%`}
      style={{ flexShrink: 0 }}
    >
      <circle
        cx="29"
        cy="29"
        r={radius}
        fill="var(--surface)"
        stroke="var(--border)"
        strokeWidth="5"
      />
      <circle
        cx="29"
        cy="29"
        r={radius}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 29 29)"
      />
      <text
        x="29"
        y="33"
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill="var(--text)"
        fontFamily="var(--font-sans)"
      >
        {clamped}%
      </text>
    </svg>
  );
}
