import { useState } from 'react';
import { ShieldCheck, Lock, Scale, HeartHandshake, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ListenButton } from '../components/ListenButton';

export function AboutPage() {
  const { t, apiFetch } = useApp();
  const [donorName, setDonorName] = useState('');
  const [amountNgn, setAmountNgn] = useState<number>(2500);
  const [frequency, setFrequency] = useState<'one-time' | 'monthly'>('one-time');
  const [purpose, setPurpose] = useState('Multilingual rights audio & translation');
  const [donError, setDonError] = useState<string | null>(null);
  const [donReceipt, setDonReceipt] = useState<{ reference: string; message: string } | null>(null);

  const missionSpeech =
    'Civic Watch Nigeria is an independent, non-partisan, and strictly non-violent public accountability platform. We never endorse political parties, candidates, or public institutions. Every citizen report is sealed with a timestamp, stored with strict privacy controls, and reviewed by trained humans before escalation.';

  const submitDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    setDonError(null);
    if (!amountNgn || amountNgn < 500) {
      setDonError('Minimum contribution pledge is NGN 500.');
      return;
    }
    try {
      const res = await apiFetch<{ reference: string; message: string }>('/api/donations', {
        method: 'POST',
        body: JSON.stringify({
          donorName: donorName.trim() || 'Anonymous Citizen Supporter',
          amountNgn,
          frequency,
          purpose,
        }),
      });
      setDonReceipt(res);
    } catch (err) {
      setDonError(err instanceof Error ? err.message : 'Could not record pledge.');
    }
  };

  return (
    <div className="section-stack">
      <section className="card stack-20" aria-labelledby="about-mission-heading">
        <div className="row-between">
          <span className="badge badge-primary">
            <ShieldCheck size={14} aria-hidden="true" />
            <span>{t.missionCharter}</span>
          </span>
          <ListenButton text={missionSpeech} label="About Civic Watch Nigeria" />
        </div>

        <h1 id="about-mission-heading">{t.aboutPageTitle}</h1>
        <p style={{ fontSize: 'var(--text-18)', color: 'var(--text-secondary)', maxWidth: '760px' }}>
          {t.aboutPageIntro}
        </p>

        <div className="grid-3">
          <div className="card-subtle stack-8">
            <ShieldCheck size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <h3>{t.pillar1Title}</h3>
            <p className="field-hint">{t.pillar1Body}</p>
          </div>

          <div className="card-subtle stack-8">
            <Lock size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <h3>{t.pillar2Title}</h3>
            <p className="field-hint">{t.pillar2Body}</p>
          </div>

          <div className="card-subtle stack-8">
            <Scale size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <h3>{t.pillar3Title}</h3>
            <p className="field-hint">{t.pillar3Body}</p>
          </div>
        </div>
      </section>

      {/* How Reports Are Handled */}
      <section className="card stack-20" aria-labelledby="how-handled-heading">
        <h2 id="how-handled-heading">{t.howHandled}</h2>
        <ol className="stack-12" style={{ margin: 0, paddingLeft: 'var(--sp-20)' }}>
          <li>
            <strong>Automatic capture seal:</strong> Upon submission, your report receives a UTC timestamp, geostamp seal, and a unique <span className="mono">CWN-YEAR-STATE-#####</span> reference.
          </li>
          <li>
            <strong>Human intake review:</strong> Trained reviewers check dates, landmarks, and safety urgency before marking a public summary as verified.
          </li>
          <li>
            <strong>Advocate matching:</strong> Where legal representation or Freedom of Information follow-up is appropriate, verified advocates review the file and log transparent notes across our 11-stage tracker.
          </li>
        </ol>

      </section>

      {/* Clearly Separated Donation Path */}
      <section
        id="donate"
        className="card stack-24"
        style={{ borderTop: '4px solid var(--primary)' }}
        aria-labelledby="donate-heading"
      >
        <div className="stack-8">
          <div className="row-wrap">
            <HeartHandshake size={22} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <span className="overline">{t.aboutDonate}</span>
          </div>
          <h2 id="donate-heading">{t.donateHeading}</h2>
          <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)', maxWidth: '720px' }}>
            {t.donateIntro}
          </p>
        </div>

        {donReceipt ? (
          <div className="card-tint stack-12" role="status" aria-live="polite">
            <div className="row-wrap">
              <CheckCircle2 size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <strong>Contribution pledge recorded ({donReceipt.reference})</strong>
            </div>
            <p style={{ fontSize: 'var(--text-14)' }}>{donReceipt.message}</p>
            <div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDonReceipt(null)}>
                Record another pledge
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submitDonation} className="stack-16" noValidate>
            <div className="stack-8">
              <span className="field-label">Select contribution amount (NGN)</span>
              <div className="chip-row">
                {[1000, 2500, 5000, 15000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`chip ${amountNgn === preset ? 'active' : ''}`}
                    aria-pressed={amountNgn === preset}
                    onClick={() => setAmountNgn(preset)}
                  >
                    NGN {preset.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid-3">
              <div className="field">
                <label htmlFor="don-custom" className="field-label">
                  Amount (NGN)
                </label>
                <input
                  id="don-custom"
                  type="number"
                  min={500}
                  step={500}
                  className="input"
                  value={amountNgn}
                  onChange={(e) => setAmountNgn(Number(e.target.value))}
                />
              </div>

              <div className="field">
                <label htmlFor="don-freq" className="field-label">
                  Frequency
                </label>
                <select
                  id="don-freq"
                  className="select"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as 'one-time' | 'monthly')}
                >
                  <option value="one-time">One-time citizen gift</option>
                  <option value="monthly">Monthly sustainer</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="don-purpose" className="field-label">
                  Direct toward
                </label>
                <select
                  id="don-purpose"
                  className="select"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                >
                  <option value="Multilingual rights audio & translation">
                    Multilingual rights audio & translation
                  </option>
                  <option value="Rural FOI & paralegal clinics">Rural FOI & paralegal clinics</option>
                  <option value="Private evidence storage infrastructure">
                    Private evidence storage infrastructure
                  </option>
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="don-name" className="field-label">
                Name for receipt (leave blank to remain anonymous)
              </label>
              <input
                id="don-name"
                className="input"
                placeholder="Optional supporter name"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
              />
            </div>

            {donError && (
              <p className="field-error" role="alert">
                {donError}
              </p>
            )}

            <div>
              <button type="submit" className="btn btn-primary">
                Record support pledge (demo checkout)
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
