import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  Smartphone,
  HeartHandshake,
  LogOut,
  LogIn,
  Sun,
  Moon,
  Lock,
} from 'lucide-react';
import { useApp, type UserProfile } from '../context/AppContext';
import { LANGUAGES, type LangCode } from '../data/i18n';
import { NIGERIA_STATES } from '../data/nigeriaData';
import { ConsentDialog } from '../components/ConsentDialog';

export function ProfilePage() {
  const {
    t,
    user,
    setSession,
    lang,
    setLang,
    theme,
    setThemeExplicit,
    openAppGate,
    apiFetch,
  } = useApp();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [stateName, setStateName] = useState(user?.state || 'Lagos');
  const [lgaName, setLgaName] = useState(user?.lga || 'Ikeja');
  const [mfaEnabled, setMfaEnabled] = useState(Boolean(user?.mfaEnabled));
  const [whatsappOptIn, setWhatsappOptIn] = useState(Boolean(user?.whatsappOptIn));
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [signOutConfirm, setSignOutConfirm] = useState(false);

  const [civicStats, setCivicStats] = useState<{
    reportsFiled: number;
    petitionsSigned: number;
    campaignsJoined: number;
    amplifiedCount: number;
  }>({ reportsFiled: 0, petitionsSigned: 0, campaignsJoined: 0, amplifiedCount: 0 });

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setStateName(user.state);
      setLgaName(user.lga);
      setMfaEnabled(user.mfaEnabled);
      setWhatsappOptIn(user.whatsappOptIn);
    }
    apiFetch<{
      stats: {
        reportsFiled: number;
        petitionsSigned: number;
        campaignsJoined: number;
        amplifiedCount: number;
      };
    }>('/api/my-civic-summary')
      .then((res) => setCivicStats(res.stats))
      .catch(() => {});
  }, [user, apiFetch]);

  const stateEntry = NIGERIA_STATES.find((s) => s.name === stateName) || NIGERIA_STATES[24];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const res = await apiFetch<{ user: UserProfile; mfaSetupCode?: string | null }>(
      '/api/auth/preferences',
      {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: fullName.trim(),
          state: stateName,
          lga: lgaName,
          mfaEnabled,
          preferredLang: lang,
          whatsappOptIn,
        }),
      }
    );
    const currentToken = localStorage.getItem('cwn_token');
    setSession(currentToken, res.user);
    setSavedMsg(
      res.mfaSetupCode
        ? `Preferences saved. Multi-factor security is active (authenticator code: ${res.mfaSetupCode}).`
        : 'Profile, privacy, and notification preferences saved.'
    );
  };

  const confirmSignOut = () => {
    setSignOutConfirm(false);
    setSession(null, null);
    navigate('/');
  };

  return (
    <div className="section-stack">
      <section className="stack-16">
        <span className="overline">{t.accountPrefs}</span>
        <h1>{t.profile}</h1>
      </section>

      {!user ? (
        <section className="card stack-16">
          <div className="row-wrap">
            <User size={22} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <h2>You are browsing without an account</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '640px' }}>
            Public content, rights guides, and anonymous reporting never force sign-up. Sign in or create an account if you want multi-device case tracking, verified advocate follow-up, and multi-factor security.
          </p>
          <div>
            <Link to="/auth" className="btn btn-primary">
              <LogIn size={18} aria-hidden="true" />
              <span>Sign in or create account</span>
            </Link>
          </div>
        </section>
      ) : (
        <form onSubmit={handleSaveProfile} className="card stack-24" noValidate>
          <div className="row-between">
            <div>
              <h2>{user.fullName}</h2>
              <span className="field-hint">
                {user.email} • Role: {user.role}
              </span>
            </div>
            <span className="badge badge-success">
              <ShieldCheck size={14} aria-hidden="true" />
              <span>Email verified</span>
            </span>
          </div>

          <div className="grid-3">
            <div className="card-subtle stack-8">
              <span className="overline">Reports</span>
              <strong style={{ fontSize: 'var(--text-22)' }}>{civicStats.reportsFiled}</strong>
            </div>
            <div className="card-subtle stack-8">
              <span className="overline">Signatures</span>
              <strong style={{ fontSize: 'var(--text-22)' }}>{civicStats.petitionsSigned}</strong>
            </div>
            <div className="card-subtle stack-8">
              <span className="overline">Amplified</span>
              <strong style={{ fontSize: 'var(--text-22)' }}>{civicStats.amplifiedCount}</strong>
            </div>
          </div>

          <div className="grid-3">
            <div className="field">
              <label htmlFor="prof-name" className="field-label">
                Display name
              </label>
              <input
                id="prof-name"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="prof-state" className="field-label">
                Home State
              </label>
              <select
                id="prof-state"
                className="select"
                value={stateName}
                onChange={(e) => {
                  const st = NIGERIA_STATES.find((s) => s.name === e.target.value) || NIGERIA_STATES[0];
                  setStateName(st.name);
                  setLgaName(st.lgas[0]);
                }}
              >
                {NIGERIA_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="prof-lga" className="field-label">
                Home LGA
              </label>
              <select
                id="prof-lga"
                className="select"
                value={lgaName}
                onChange={(e) => setLgaName(e.target.value)}
              >
                {stateEntry.lgas.map((lga) => (
                  <option key={lga} value={lga}>
                    {lga}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="stack-12">
            <h3>Security & notification controls</h3>

            <label
              className="card-subtle"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-12)', cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={mfaEnabled}
                onChange={(e) => setMfaEnabled(e.target.checked)}
                style={{ width: 22, height: 22, accentColor: 'var(--primary)' }}
              />
              <div>
                <strong style={{ fontSize: 'var(--text-14)', display: 'block' }}>
                  <Lock size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} aria-hidden="true" />
                  Require 6-digit multi-factor code on sign-in
                </strong>
                <span className="field-hint">
                  Protects sensitive legal notes if someone obtains your password.
                </span>
              </div>
            </label>

            <label
              className="card-subtle"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-12)', cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={whatsappOptIn}
                onChange={(e) => setWhatsappOptIn(e.target.checked)}
                style={{ width: 22, height: 22, accentColor: 'var(--primary)' }}
              />
              <div>
                <strong style={{ fontSize: 'var(--text-14)', display: 'block' }}>
                  Weekly low-bandwidth WhatsApp case digest
                </strong>
                <span className="field-hint">Receive calm updates for {lgaName}, {stateName}.</span>
              </div>
            </label>
          </div>

          {savedMsg && (
            <p role="status" aria-live="polite" style={{ color: 'var(--success)', fontWeight: 600 }}>
              {savedMsg}
            </p>
          )}

          <div className="row-between">
            <button type="submit" className="btn btn-primary">
              {t.saveSettings}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSignOutConfirm(true)}
            >
              <LogOut size={18} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </form>
      )}

      {/* Language, Theme & Accessibility Preferences (Available whether signed in or not) */}
      <section className="card stack-20" aria-labelledby="accessibility-prefs-heading">
        <h2 id="accessibility-prefs-heading">{t.languageThemeA11y}</h2>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="prof-lang-select" className="field-label">
              {t.interfaceLanguage}
            </label>
            <select
              id="prof-lang-select"
              className="select"
              value={lang}
              onChange={(e) => setLang(e.target.value as LangCode)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName} ({l.englishName})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <span className="field-label">{t.displayTheme}</span>
            <div className="row-wrap">
              <button
                type="button"
                className={theme === 'light' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                onClick={() => setThemeExplicit('light')}
              >
                <Sun size={16} aria-hidden="true" />
                <span>{t.lightMode}</span>
              </button>
              <button
                type="button"
                className={theme === 'dark' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                onClick={() => setThemeExplicit('dark')}
              >
                <Moon size={16} aria-hidden="true" />
                <span>{t.darkMode}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Mobile App & Donation Entries */}
      <div className="grid-2">
        <section className="card stack-12">
          <div className="row-wrap">
            <Smartphone size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <h3>Civic Watch Nigeria mobile app</h3>
          </div>
          <p className="field-hint">Optional iOS and Android companion app.</p>
          <div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => openAppGate('offline_vault')}
            >
              Download the app
            </button>
          </div>
        </section>

        <section className="card stack-12">
          <div className="row-wrap">
            <HeartHandshake size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <h3>Sustain independent civic work</h3>
          </div>
          <p className="field-hint">Support citizen translation, rural FOI clinics and free legal intake.</p>
          <div>
            <Link to="/about#donate" className="btn btn-secondary btn-sm">
              About & support
            </Link>
          </div>
        </section>
      </div>

      <ConsentDialog
        open={signOutConfirm}
        title="Sign out of this device?"
        whatHappens="Clears your session token from this browser. Your saved reports and timeline remain safely stored in your account."
        confirmationText="Confirm sign out from this browser."
        confirmButtonLabel="Sign out"
        onConfirm={confirmSignOut}
        onCancel={() => setSignOutConfirm(false)}
      />
    </div>
  );
}
