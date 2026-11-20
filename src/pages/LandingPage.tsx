import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  Smartphone,
  Monitor,
  Globe,
  Sun,
  Moon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LANGUAGES, type LangCode } from '../data/i18n';

export function LandingPage() {
  const { t, lang, setLang, theme, toggleTheme, editionMode, setEditionMode } = useApp();
  const navigate = useNavigate();

  const launchMobileEdition = () => {
    setEditionMode('mobile');
    navigate('/home');
  };

  const launchWebDashboard = () => {
    setEditionMode('web');
    navigate('/home');
  };

  return (
    <div className="landing-shell">
      <a href="#landing-main" className="skip-link">
        {t.skipToContent}
      </a>

      {/* Clean, mobile-first header */}
      <header className="landing-header">
        <div className="container row-between">
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--sp-12)',
              textDecoration: 'none',
              color: 'var(--text)',
              minHeight: '48px',
            }}
          >
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--primary)',
                color: 'var(--text-on-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <ShieldCheck size={22} />
            </span>
            <strong style={{ fontSize: 'var(--text-16)', letterSpacing: '-0.01em' }}>{t.brandName}</strong>
          </Link>

          <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
            <button
              type="button"
              className={editionMode === 'web' ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'}
              onClick={launchWebDashboard}
              title={t.webApp}
            >
              <Monitor size={16} aria-hidden="true" />
              <span>{t.webApp}</span>
            </button>
            <button
              type="button"
              className={editionMode === 'mobile' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
              onClick={launchMobileEdition}
              title={t.mobileApp}
            >
              <Smartphone size={16} aria-hidden="true" />
              <span>{t.mobileApp}</span>
            </button>

            <div style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
              <Globe
                size={16}
                aria-hidden="true"
                style={{ position: 'absolute', left: 12, pointerEvents: 'none', color: 'var(--text-secondary)' }}
              />
              <label htmlFor="landing-lang-select" className="sr-only">
                {t.selectLanguage}
              </label>
              <select
                id="landing-lang-select"
                value={lang}
                onChange={(e) => setLang(e.target.value as LangCode)}
                className="select"
                style={{
                  minHeight: 48,
                  paddingLeft: 36,
                  paddingRight: 'var(--sp-12)',
                  width: 'auto',
                  fontSize: 'var(--text-13)',
                }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn-icon"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? t.switchToDark : t.switchToLight}
            >
              {theme === 'light' ? <Moon size={20} aria-hidden="true" /> : <Sun size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      <main id="landing-main">
        <section className="landing-hero" aria-labelledby="landing-hero-title">
          <div className="container landing-split">
            <div className="stack-24">
              <div className="stack-16">
                <h1 id="landing-hero-title" className="hero-statement">
                  {t.heroGreeting}
                </h1>
                <p
                  style={{
                    fontSize: 'var(--text-18)',
                    color: 'var(--text-secondary)',
                    maxWidth: '620px',
                    lineHeight: 1.65,
                  }}
                >
                  {t.heroSubtitle}
                </p>
              </div>

              <div className="row-wrap hero-actions-mobile" style={{ gap: 'var(--sp-12)', paddingTop: 'var(--sp-4)' }}>
                <button
                  type="button"
                  onClick={launchWebDashboard}
                  className="btn btn-accent"
                  style={{ padding: 'var(--sp-16) var(--sp-24)', fontSize: 'var(--text-16)' }}
                >
                  <span>{t.enterDashboard}</span>
                  <ArrowRight size={20} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={launchMobileEdition}
                  className="btn btn-secondary"
                  style={{ padding: 'var(--sp-16) var(--sp-24)' }}
                >
                  <Smartphone size={18} aria-hidden="true" />
                  <span>{t.openMobileApp}</span>
                </button>
              </div>

              {/* Language strip — a working control, not a marketing line */}
              <div className="stack-8" style={{ paddingTop: 'var(--sp-8)' }}>
                <span className="overline">{t.availableLanguages}</span>
                <div className="mobile-snap-row" role="group" aria-label={t.selectLanguage}>
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      className={`chip ${lang === l.code ? 'active' : ''}`}
                      aria-pressed={lang === l.code}
                      onClick={() => setLang(l.code as LangCode)}
                    >
                      {l.nativeName}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="stack-16">
              <figure className="media-frame-hero" style={{ margin: 0 }}>
                <img
                  src="/images/hero-civic-townhall.jpg"
                  alt="Nigerian legal practitioner and community elders holding a peaceful civic consultation in a sunlit community hall"
                  loading="eager"
                />
              </figure>
            </div>
          </div>
        </section>

        {/* Three photographic pillar cards */}
        <section style={{ padding: 'var(--sp-48) var(--sp-20) var(--sp-64)' }} aria-label={t.howItWorks}>
          <div className="container stack-32">
            <div className="stack-12" style={{ maxWidth: '640px' }}>
              <span className="overline">{t.howItWorks}</span>
              <h2>{t.howHeading}</h2>
              <p style={{ color: 'var(--text-secondary)' }}>{t.howBody}</p>
            </div>

            <div className="grid-3">
              <article className="media-card">
                <div className="media-frame">
                  <img
                    src="/images/pillar-evidence-seal.jpg"
                    alt="Community field paralegal documenting local infrastructure with a smartphone and field notebook"
                    loading="lazy"
                  />
                </div>
                <div className="media-card-body">
                  <h3>{t.card1Title}</h3>
                  <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{t.card1Body}</p>
                </div>
              </article>

              <article className="media-card">
                <div className="media-frame">
                  <img
                    src="/images/pillar-legal-chambers.jpg"
                    alt="Nigerian female barrister and legal colleague reviewing law reports and a civic case file in Abuja"
                    loading="lazy"
                  />
                </div>
                <div className="media-card-body">
                  <h3>{t.card2Title}</h3>
                  <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{t.card2Body}</p>
                </div>
              </article>

              <article className="media-card">
                <div className="media-frame">
                  <img
                    src="/images/pillar-rights-reading.jpg"
                    alt="Two young Nigerian citizens reading a constitutional rights guide and listening to audio read-aloud"
                    loading="lazy"
                  />
                </div>
                <div className="media-card-body">
                  <h3>{t.card3Title}</h3>
                  <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{t.card3Body}</p>
                </div>
              </article>
            </div>

            <div className="row-wrap" style={{ justifyContent: 'flex-end' }}>
              <Link to="/auth?register=advocate" className="btn btn-secondary btn-sm">
                {t.advocateRegister}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
