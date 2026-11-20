import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  FilePlus2,
  Scale,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Info,
  ArrowRight,
  Rss,
  Flame,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BroadcastAlertBanner, type BroadcastAlertItem } from '../components/BroadcastAlertBanner';
import { CivicEvidenceSealGraphic } from '../components/CivicGraphics';
import { PlatformGlyph, PLATFORM_ORDER } from '../components/PlatformGlyph';
import { PushNotificationCard } from '../components/PushNotificationCard';
import { NIGERIA_STATES } from '../data/nigeriaData';

interface HomeSummary {
  alerts: BroadcastAlertItem[];
  stats: {
    publicReportsTracked: number;
    verifiedAdvocatesAvailable: number;
    activePeacefulPetitions: number;
  };
  recentCases: Array<{
    id: number;
    caseReference: string;
    title: string;
    summary: string;
    state: string;
    lga: string;
    status: string;
    urgency: number;
    isVerified: boolean;
    isSample: boolean;
    createdAt: string;
  }>;
  weeklyDigest: {
    edition: string;
    headline: string;
    paragraphs: string[];
    trendingHashtags: string[];
  };
}

export function HomePage() {
  const { user, t, detectedArea, setDetectedArea, apiFetch } = useApp();
  const [data, setData] = useState<HomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [digestExpanded, setDigestExpanded] = useState(false);
  const [areaEditOpen, setAreaEditOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  const [waPhone, setWaPhone] = useState('');
  const [waState, setWaState] = useState(detectedArea.state);
  const [waLga, setWaLga] = useState(detectedArea.lga);
  const [waMsg, setWaMsg] = useState<string | null>(null);
  const [waErr, setWaErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch<HomeSummary>('/api/home-summary')
      .then((res) => {
        if (active) setData(res);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiFetch]);

  const currentStateEntry = NIGERIA_STATES.find((s) => s.name === waState) || NIGERIA_STATES[24];
  const areaStateEntry = NIGERIA_STATES.find((s) => s.name === detectedArea.state) || NIGERIA_STATES[24];

  const handleWhatsappSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaErr(null);
    setWaMsg(null);
    if (!waPhone.trim() || waPhone.trim().length < 8) {
      setWaErr(t.invalidPhone);
      return;
    }
    try {
      const res = await apiFetch<{ message: string }>('/api/whatsapp-subscribe', {
        method: 'POST',
        body: JSON.stringify({ phoneLabel: waPhone.trim(), state: waState, lga: waLga }),
      });
      setWaMsg(res.message);
      setWaPhone('');
    } catch (err) {
      setWaErr(err instanceof Error ? err.message : 'Could not save subscription.');
    }
  };

  return (
    <div className="section-stack">
      {/* Mobile-first visual workspace hero */}
      <section className="media-card" aria-labelledby="home-hero-heading">
        <div className="media-frame" style={{ maxHeight: 230 }}>
          <img
            src="/images/hero-civic-townhall.jpg"
            alt="Community legal practitioner and Nigerian citizens in a calm town hall consultation"
          />
        </div>

        <div className="media-card-body stack-20">
          <div className="row-between">
            <button
              type="button"
              className="badge"
              onClick={() => setAreaEditOpen((v) => !v)}
              style={{ cursor: 'pointer', minHeight: 40 }}
              aria-expanded={areaEditOpen}
            >
              <MapPin size={14} aria-hidden="true" />
              <span>
                {detectedArea.lga}, {detectedArea.state} ({t.changeArea})
              </span>
            </button>

            <span className="overline">
              {user ? `${user.fullName}` : t.publicWorkspace}
            </span>
          </div>

          {areaEditOpen && (
            <div className="card-subtle grid-2">
              <div className="field">
                <label htmlFor="home-area-state" className="field-label">
                  {t.yourState}
                </label>
                <select
                  id="home-area-state"
                  className="select"
                  value={detectedArea.state}
                  onChange={(e) => {
                    const st = NIGERIA_STATES.find((s) => s.name === e.target.value) || NIGERIA_STATES[0];
                    setDetectedArea({ state: st.name, lga: st.lgas[0] });
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
                <label htmlFor="home-area-lga" className="field-label">
                  {t.localGovernment}
                </label>
                <select
                  id="home-area-lga"
                  className="select"
                  value={detectedArea.lga}
                  onChange={(e) => setDetectedArea({ state: detectedArea.state, lga: e.target.value })}
                >
                  {areaStateEntry.lgas.map((lga) => (
                    <option key={lga} value={lga}>
                      {lga}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="stack-12">
            <h1 id="home-hero-heading">{t.heroGreeting}</h1>
            <p style={{ fontSize: 'var(--text-16)', color: 'var(--text-secondary)', maxWidth: '680px' }}>
              {t.heroSubtitle}
            </p>
          </div>

          <div className="row-wrap hero-actions-mobile" style={{ gap: 'var(--sp-12)' }}>
            <Link to="/report" className="btn btn-accent">
              <FilePlus2 size={20} aria-hidden="true" />
              <span>{t.reportIncident}</span>
            </Link>
            <Link to="/justice" className="btn btn-secondary">
              <Scale size={18} aria-hidden="true" />
              <span>{t.legalHelp}</span>
            </Link>
          </div>
        </div>
      </section>

      {data && data.alerts.length > 0 && <BroadcastAlertBanner alerts={data.alerts} />}

      {/* Civic snapshot */}
      <section className="stack-20" aria-label={t.dashboard}>
        {loading || !data ? (
          <div className="grid-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="skeleton">
                <div className="skeleton-line" style={{ width: '40%' }} />
                <div className="skeleton-line" style={{ width: '75%', height: 24 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid-3">
            <div className="card stack-8" style={{ borderTop: '4px solid var(--primary)' }}>
              <span className="overline">{t.casesTracked}</span>
              <strong style={{ fontSize: 'var(--text-36)', lineHeight: 1.1 }}>
                {data.stats.publicReportsTracked}
              </strong>
              <span className="field-hint">{t.casesTrackedHint}</span>
            </div>
            <div className="card stack-8" style={{ borderTop: '4px solid var(--info)' }}>
              <span className="overline">{t.verifiedAdvocates}</span>
              <strong style={{ fontSize: 'var(--text-36)', lineHeight: 1.1 }}>
                {data.stats.verifiedAdvocatesAvailable}
              </strong>
              <span className="field-hint">{t.verifiedAdvocatesHint}</span>
            </div>
            <div className="card stack-8" style={{ borderTop: '4px solid var(--success)' }}>
              <span className="overline">{t.peacefulPetitions}</span>
              <strong style={{ fontSize: 'var(--text-36)', lineHeight: 1.1 }}>
                {data.stats.activePeacefulPetitions}
              </strong>
              <span className="field-hint">{t.peacefulPetitionsHint}</span>
            </div>
          </div>
        )}

        <CivicEvidenceSealGraphic
          labels={{
            badge: t.evBadge,
            step1: t.evStep1,
            step1Sub: t.evStep1Sub,
            step2: t.evStep2,
            step2Sub: t.evStep2Sub,
            step3: t.evStep3,
            step3Sub: t.evStep3Sub,
          }}
        />
      </section>

      {/* Photographic action cards */}
      <section className="stack-20" aria-labelledby="visual-pathways-heading">
        <div className="stack-8">
          <span className="overline">{t.coreWorkspaces}</span>
          <h2 id="visual-pathways-heading">{t.chooseToday}</h2>
        </div>

        <div className="grid-3">
          <article className="media-card">
            <div className="media-frame">
              <img src="/images/pillar-evidence-seal.jpg" alt="Field documentation of local infrastructure" loading="lazy" />
            </div>
            <div className="media-card-body">
              <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                <FilePlus2 size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                <h3>{t.docTitle}</h3>
              </div>
              <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{t.docBody}</p>
              <div style={{ marginTop: 'auto' }}>
                <Link to="/report" className="btn btn-secondary btn-sm btn-full">
                  {t.docCta}
                </Link>
              </div>
            </div>
          </article>

          <article className="media-card">
            <div className="media-frame">
              <img
                src="/images/pillar-legal-chambers.jpg"
                alt="Verified Nigerian lawyers reviewing civic case briefs"
                loading="lazy"
              />
            </div>
            <div className="media-card-body">
              <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                <Scale size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                <h3>{t.counselTitle}</h3>
              </div>
              <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{t.counselBody}</p>
              <div style={{ marginTop: 'auto' }}>
                <Link to="/justice" className="btn btn-secondary btn-sm btn-full">
                  {t.counselCta}
                </Link>
              </div>
            </div>
          </article>

          <article className="media-card">
            <div className="media-frame">
              <img
                src="/images/pillar-rights-reading.jpg"
                alt="Citizens reading and listening to plain-language Nigerian legal guides"
                loading="lazy"
              />
            </div>
            <div className="media-card-body">
              <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                <BookOpen size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                <h3>{t.rightsTitle}</h3>
              </div>
              <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{t.rightsBody}</p>
              <div style={{ marginTop: 'auto' }}>
                <Link to="/knowledge" className="btn btn-secondary btn-sm btn-full">
                  {t.rightsCta}
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* Social listening and messenger entry points */}
      <section className="stack-20" aria-labelledby="social-heading">
        <div className="stack-8">
          <span className="overline">{t.liveTitle}</span>
          <h2 id="social-heading">{t.trendTitle}</h2>
        </div>

        <div className="grid-2">
          <article className="card stack-12">
            <div className="row-wrap">
              <Rss size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <h3 style={{ fontSize: 'var(--text-16)' }}>{t.hubCardLiveTitle}</h3>
            </div>
            <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{t.hubCardLiveBody}</p>
            <div className="row-wrap" style={{ gap: 'var(--sp-4)' }}>
              {PLATFORM_ORDER.map((key) => (
                <span key={key} style={{ color: 'var(--primary)' }} aria-hidden="true">
                  <PlatformGlyph platform={key} size={14} />
                </span>
              ))}
            </div>
            <Link to="/live-feed" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>
              <span>{t.liveTitle}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </article>

          <article className="card stack-12">
            <div className="row-wrap">
              <Flame size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <h3 style={{ fontSize: 'var(--text-16)' }}>{t.hubCardTrendTitle}</h3>
            </div>
            <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{t.hubCardTrendBody}</p>
            <Link to="/trending" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>
              <span>{t.trendTitle}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </article>
        </div>

        <PushNotificationCard compact />
      </section>

      {/* About this platform — short, self-contained section */}
      <section className="card stack-20" aria-labelledby="home-about-heading">
        <div className="row-wrap">
          <Info size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
          <span className="overline">{t.aboutOverline}</span>
        </div>

        <div className="stack-12">
          <h2 id="home-about-heading">{t.aboutHeading}</h2>
          <p style={{ fontSize: 'var(--text-16)', color: 'var(--text-secondary)', maxWidth: '760px' }}>
            {t.aboutBody1}
          </p>
          <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)', maxWidth: '760px' }}>
            {t.aboutBody2}
          </p>
        </div>

        <ul className="stack-8" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {t.aboutBullets.map((bullet) => (
            <li key={bullet} className="row-wrap" style={{ gap: 'var(--sp-8)', alignItems: 'flex-start' }}>
              <CheckCircle2
                size={16}
                style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 3 }}
                aria-hidden="true"
              />
              <span style={{ fontSize: 'var(--text-14)' }}>{bullet}</span>
            </li>
          ))}
        </ul>

        <div>
          <Link to="/about" className="btn btn-secondary btn-sm">
            <span>{t.aboutCta}</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Recent documented cases */}
      <section className="stack-20" aria-labelledby="recent-cases-heading">
        <div className="stack-8">
          <span className="overline">{t.publicLog}</span>
          <h2 id="recent-cases-heading">{t.recentCases}</h2>
        </div>

        {loading || !data ? (
          <div className="grid-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="skeleton">
                <div className="skeleton-line" style={{ width: '35%' }} />
                <div className="skeleton-line" style={{ width: '85%' }} />
                <div className="skeleton-line" style={{ width: '65%' }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid-2">
            {data.recentCases.map((c) => (
              <article key={c.caseReference} className="card stack-16">
                <div className="row-between">
                  <span className="mono badge">{c.caseReference}</span>
                  <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                    {c.isSample && <span className="badge">{t.sample}</span>}
                    {c.isVerified ? (
                      <span className="badge badge-success">
                        <CheckCircle2 size={13} aria-hidden="true" />
                        <span>{t.verified}</span>
                      </span>
                    ) : (
                      <span className="badge badge-info">
                        <Clock size={13} aria-hidden="true" />
                        <span>{c.status.replace(/_/g, ' ')}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="stack-8">
                  <h3>{c.title}</h3>
                  <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{c.summary}</p>
                </div>

                <div className="row-between" style={{ marginTop: 'auto', paddingTop: 'var(--sp-8)' }}>
                  <span className="field-hint">
                    <MapPin size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} aria-hidden="true" />
                    {c.lga}, {c.state}
                  </span>
                  <Link to={`/cases/${c.caseReference}`} className="btn btn-secondary btn-sm">
                    {t.trackProgress}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Weekly digest */}
      {data && (
        <section className="card stack-20" aria-labelledby="weekly-digest-heading">
          <div className="stack-8">
            <span className="overline">{data.weeklyDigest.edition}</span>
            <h2 id="weekly-digest-heading">{t.weeklyDigest}</h2>
          </div>

          <p style={{ fontSize: 'var(--text-16)', fontWeight: 500 }}>{data.weeklyDigest.headline}</p>

          {digestExpanded && (
            <div className="stack-16">
              {data.weeklyDigest.paragraphs.map((p, idx) => (
                <p key={idx} style={{ color: 'var(--text-secondary)' }}>
                  {p}
                </p>
              ))}
            </div>
          )}

          <div className="row-between">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setDigestExpanded((v) => !v)}
              aria-expanded={digestExpanded}
            >
              {digestExpanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
              <span>{digestExpanded ? t.collapseDigest : t.readFullDigest}</span>
            </button>

            <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
              {data.weeklyDigest.trendingHashtags.slice(0, 3).map((tag) => (
                <span key={tag} className="mono badge">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Low-data WhatsApp digest */}
      <section className="card stack-16" aria-labelledby="whatsapp-digest-heading">
        <div className="row-between">
          <div className="stack-8" style={{ gap: 'var(--sp-4)' }}>
            <h2 id="whatsapp-digest-heading" style={{ fontSize: 'var(--text-18)' }}>
              {t.whatsappTitle}
            </h2>
            <p className="field-hint">{t.whatsappBody}</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setWhatsappOpen((v) => !v)}
            aria-expanded={whatsappOpen}
          >
            {whatsappOpen ? t.closeForm : t.subscribe}
          </button>
        </div>

        {whatsappOpen && (
          <form onSubmit={handleWhatsappSubmit} className="stack-16" style={{ paddingTop: 'var(--sp-8)' }} noValidate>
            <div className="grid-3">
              <div className="field">
                <label htmlFor="wa-phone" className="field-label">
                  {t.whatsappNumber}
                </label>
                <input
                  id="wa-phone"
                  type="tel"
                  className="input"
                  placeholder="+234 803 000 0000"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="wa-state" className="field-label">
                  {t.yourState}
                </label>
                <select
                  id="wa-state"
                  className="select"
                  value={waState}
                  onChange={(e) => {
                    const st = NIGERIA_STATES.find((s) => s.name === e.target.value) || NIGERIA_STATES[0];
                    setWaState(st.name);
                    setWaLga(st.lgas[0]);
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
                <label htmlFor="wa-lga" className="field-label">
                  {t.localGovernment}
                </label>
                <select
                  id="wa-lga"
                  className="select"
                  value={waLga}
                  onChange={(e) => setWaLga(e.target.value)}
                >
                  {currentStateEntry.lgas.map((lga) => (
                    <option key={lga} value={lga}>
                      {lga}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {waErr && (
              <p className="field-error" role="alert">
                {waErr}
              </p>
            )}
            {waMsg && (
              <p
                style={{ color: 'var(--success)', fontWeight: 600, fontSize: 'var(--text-14)' }}
                role="status"
                aria-live="polite"
              >
                {waMsg}
              </p>
            )}

            <div>
              <button type="submit" className="btn btn-primary btn-sm">
                {t.confirmSubscription}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
