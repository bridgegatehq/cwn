import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function CookieConsentBanner() {
  const { t } = useApp();
  const [choice, setChoice] = useState<string | null>(() => localStorage.getItem('cwn_cookie_consent'));

  if (choice) return null;

  const saveChoice = (val: 'essential_only' | 'essential_and_civic_metrics') => {
    localStorage.setItem('cwn_cookie_consent', val);
    localStorage.setItem('cwn_cookie_consent_at', new Date().toISOString());
    setChoice(val);
  };

  return (
    <aside
      aria-label={t.privacyTitle}
      style={{
        position: 'fixed',
        bottom: 'var(--sp-16)',
        left: 'var(--sp-16)',
        right: 'var(--sp-16)',
        maxWidth: '680px',
        margin: '0 auto',
        zIndex: 190,
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--sp-20)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div className="stack-12">
        <div className="row-wrap">
          <ShieldCheck size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
          <strong style={{ fontSize: 'var(--text-16)' }}>{t.privacyTitle}</strong>
        </div>
        <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{t.privacyBody}</p>
        <div className="row-wrap" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => saveChoice('essential_only')}>
            {t.essentialOnly}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => saveChoice('essential_and_civic_metrics')}>
            {t.allowCounts}
          </button>
        </div>
      </div>
    </aside>
  );
}
