import { useEffect } from 'react';
import { Smartphone, X, Shield, Radio, MapPin, Lock, BellRing, FileText, Mic } from 'lucide-react';
import { useApp, type MobileOnlyFeature } from '../context/AppContext';
import { Link } from 'react-router-dom';

const FEATURE_INFO: Record<
  MobileOnlyFeature,
  { title: string; explanation: string; webAlternative: string; icon: typeof Radio }
> = {
  live_streaming: {
    title: 'Live incident video streaming',
    explanation:
      'Continuous encrypted video streaming with real-time geostamp sealing requires native camera hardware controls and low-signal buffering on the Civic Watch Nigeria mobile app.',
    webAlternative: 'On the web, you can file a written or voice-dictated report right now and attach recorded video files.',
    icon: Radio,
  },
  background_location: {
    title: 'Background location broadcasting',
    explanation:
      'Sharing live movement updates with a trusted contact while travelling through checkpoints requires background OS permissions only available in our native iOS and Android apps.',
    webAlternative: 'On the web, one-tap GPS geostamping works whenever you submit an incident report.',
    icon: MapPin,
  },
  sos_panic: {
    title: 'SOS safety routing',
    explanation:
      'Discreet hardware-button SOS triggers and silent trusted-contact alerts require native mobile operating system integration.',
    webAlternative: 'If you are in immediate physical danger right now, move to physical safety first and contact local emergency services.',
    icon: Shield,
  },
  offline_vault: {
    title: 'Offline encrypted evidence vault',
    explanation:
      'Sealing photos and audio inside a PIN-locked hardware enclave before mobile data is available is built into the Civic Watch Nigeria mobile app.',
    webAlternative: 'When connected on web, uploaded evidence is immediately timestamp-sealed into private server storage.',
    icon: Lock,
  },
  push_alerts: {
    title: 'Instant push broadcast alerts',
    explanation:
      'Zero-delay lock-screen alerts for urgent state or LGA safety notices run through native mobile push channels.',
    webAlternative: 'On the web, active alerts appear at the top of Home and Notifications, or via weekly WhatsApp digests.',
    icon: BellRing,
  },
  offline_drafts: {
    title: 'Zero-signal field draft queue',
    explanation:
      'Capturing multi-file media drafts across days without mobile network coverage and auto-syncing on reconnect is handled by the mobile app.',
    webAlternative: 'Cached public rights guides and recent cases remain readable offline in your browser.',
    icon: FileText,
  },
  voice_first_app: {
    title: 'Full voice-first mobile reporting',
    explanation:
      'Our mobile app lets you record a single continuous voice note offline, transcribe it locally, and auto-structure answers into all report fields.',
    webAlternative: 'On the web, use the microphone button beside Incident Title, Description, and Address to dictate directly.',
    icon: Mic,
  },
};

export function MobileAppGateModal() {
  const { t, activeAppGate, closeAppGate } = useApp();

  useEffect(() => {
    if (!activeAppGate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAppGate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeAppGate, closeAppGate]);

  if (!activeAppGate) return null;
  const info = FEATURE_INFO[activeAppGate];
  const Icon = info.icon;

  return (
    <div className="backdrop" role="dialog" aria-modal="true" aria-labelledby="app-gate-title">
      <div className="modal-panel">
        <div className="row-between">
          <span className="badge badge-primary">
            <Smartphone size={14} aria-hidden="true" />
            <span>{t.appCapability}</span>
          </span>
          <button type="button" className="btn-icon" onClick={closeAppGate} aria-label={t.closeMenu}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="stack-12">
          <div className="row-wrap">
            <Icon size={24} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <h2 id="app-gate-title">{info.title}</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-14)' }}>{info.explanation}</p>
        </div>

        <div className="card-subtle stack-16" style={{ alignItems: 'center', textAlign: 'center' }}>
          {/* Clean embedded deterministic SVG QR code for continuing on phone */}
          <svg
            width="132"
            height="132"
            viewBox="0 0 132 132"
            role="img"
            aria-label="QR code to open Civic Watch Nigeria mobile app download page"
            style={{
              background: 'var(--qr-surface)',
              padding: 'var(--sp-8)',
              borderRadius: 'var(--radius-btn)',
              border: '1px solid var(--border)',
            }}
          >
            <rect width="132" height="132" fill="var(--qr-surface)" />
            <rect x="12" y="12" width="32" height="32" fill="none" stroke="var(--qr-ink)" strokeWidth="6" />
            <rect x="22" y="22" width="12" height="12" fill="var(--qr-ink)" />
            <rect x="88" y="12" width="32" height="32" fill="none" stroke="var(--qr-ink)" strokeWidth="6" />
            <rect x="98" y="22" width="12" height="12" fill="var(--qr-ink)" />
            <rect x="12" y="88" width="32" height="32" fill="none" stroke="var(--qr-ink)" strokeWidth="6" />
            <rect x="22" y="98" width="12" height="12" fill="var(--qr-ink)" />
            <rect x="54" y="16" width="8" height="8" fill="var(--qr-ink)" />
            <rect x="68" y="24" width="8" height="16" fill="var(--qr-ink)" />
            <rect x="54" y="48" width="16" height="8" fill="var(--primary)" />
            <rect x="76" y="54" width="8" height="18" fill="var(--qr-ink)" />
            <rect x="16" y="56" width="20" height="8" fill="var(--qr-ink)" />
            <rect x="48" y="68" width="14" height="14" fill="var(--qr-ink)" />
            <rect x="92" y="56" width="24" height="8" fill="var(--qr-ink)" />
            <rect x="88" y="76" width="12" height="12" fill="var(--primary)" />
            <rect x="106" y="88" width="12" height="24" fill="var(--qr-ink)" />
            <rect x="56" y="96" width="22" height="8" fill="var(--qr-ink)" />
            <rect x="76" y="108" width="18" height="10" fill="var(--qr-ink)" />
          </svg>
          <p className="field-hint">{t.appQrHint}</p>

          <div className="grid-2" style={{ width: '100%' }}>
            <a
              href="#app-store-preview"
              onClick={(e) => {
                e.preventDefault();
                closeAppGate();
              }}
              className="btn btn-primary"
              aria-label="Download Civic Watch Nigeria on the Apple App Store"
            >
              <Smartphone size={18} aria-hidden="true" />
              <span>App Store</span>
            </a>
            <a
              href="#google-play-preview"
              onClick={(e) => {
                e.preventDefault();
                closeAppGate();
              }}
              className="btn btn-secondary"
              aria-label="Get Civic Watch Nigeria on Google Play"
            >
              <Smartphone size={18} aria-hidden="true" />
              <span>Google Play</span>
            </a>
          </div>
        </div>

        <div className="card-tint stack-8">
          <p style={{ fontSize: 'var(--text-13)', fontWeight: 600 }}>{t.appAvailableNow}</p>
          <p style={{ fontSize: 'var(--text-13)', color: 'var(--text-secondary)' }}>{info.webAlternative}</p>
          <div>
            <Link to="/report" onClick={closeAppGate} className="btn btn-secondary btn-sm">
              {t.useWebReport}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
