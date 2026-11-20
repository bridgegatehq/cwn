/**
 * Monochrome, token-driven platform glyphs. Drawn as simple geometry so the
 * interface never depends on external brand assets or hardcoded brand colours.
 */

export type PlatformKey =
  | 'x'
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'telegram'
  | 'whatsapp'
  | 'threads';

interface GlyphProps {
  platform: string;
  size?: number;
}

export function PlatformGlyph({ platform, size = 18 }: GlyphProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: 'false' as const,
  };

  switch (platform) {
    case 'x':
      return (
        <svg {...common}>
          <path d="M5 5l14 14" />
          <path d="M19 5L5 19" />
        </svg>
      );
    case 'facebook':
      return (
        <svg {...common}>
          <path d="M15 4h-2a4 4 0 0 0-4 4v12" />
          <path d="M7 12h7" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="5" />
          <circle cx="12" cy="12" r="3.6" />
          <circle cx="16.6" cy="7.4" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg {...common}>
          <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" />
          <path d="M14 6.5c1.2 1.6 2.6 2.4 4.5 2.6" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="3.5" />
          <path d="M11 10l4 2-4 2z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'telegram':
      return (
        <svg {...common}>
          <path d="M21 5L3.5 11.5l5 1.8L11 20l3-4.2 4.5 3z" />
          <path d="M8.5 13.3L18 6" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg {...common}>
          <path d="M20 11.6a8 8 0 0 1-11.9 7L4 20l1.4-4A8 8 0 1 1 20 11.6z" />
          <path d="M9 9.5c0 3 2.2 5.2 5.2 5.4" />
        </svg>
      );
    case 'threads':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7.6" />
          <path d="M9.4 12c0-2 1.4-3.4 3.4-3.4 2.4 0 3.4 1.8 3.4 4.2 0 2.6-1.4 4-3.4 4-2 0-3.4-1.4-3.4-3.4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
  }
}

export const PLATFORM_LABELS: Record<string, string> = {
  all: 'All platforms',
  x: 'X',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  threads: 'Threads',
};

export const PLATFORM_ORDER: PlatformKey[] = [
  'x',
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'telegram',
  'whatsapp',
  'threads',
];
