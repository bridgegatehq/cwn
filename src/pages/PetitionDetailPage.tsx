import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Share2,
  Copy,
  Calendar,
  Landmark,
  FileCheck2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NIGERIA_STATES } from '../data/nigeriaData';
import { ListenButton } from '../components/ListenButton';
import { ConsentDialog } from '../components/ConsentDialog';

interface PetitionDetail {
  id: number;
  title: string;
  summary: string;
  description: string;
  demands: string[];
  evidenceItems: Array<{ title: string; detail: string }>;
  mediaUpdates: Array<{ date: string; title: string; body: string }>;
  publicInsight: string;
  category: string;
  targetSignatures: number;
  currentSignatures: number;
  deadline: string;
  relatedReportRef?: string | null;
  hashtag: string;
  legislativeTargets: string[];
  isSample: boolean;
}

type TabKey = 'case' | 'demands' | 'evidence' | 'media' | 'insight' | 'kit';

export function PetitionDetailPage() {
  const { id = '1' } = useParams<{ id: string }>();
  const { user, detectedArea, apiFetch } = useApp();
  const [petition, setPetition] = useState<PetitionDetail | null>(null);
  const [recentSigners, setRecentSigners] = useState<Array<{ signer_name: string; state: string; lga: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('case');

  // Sign & Share Consent State
  const [signerName, setSignerName] = useState(user?.fullName || '');
  const [signerState, setSignerState] = useState(detectedArea.state);
  const [signerLga, setSignerLga] = useState(detectedArea.lga);
  const [signError, setSignError] = useState<string | null>(null);
  const [signConsentOpen, setSignConsentOpen] = useState(false);
  const [shareConsentOpen, setShareConsentOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<{
      petition: PetitionDetail;
      recentSignatures: Array<{ signer_name: string; state: string; lga: string }>;
    }>(`/api/petitions/${id}`)
      .then((res) => {
        setPetition(res.petition);
        setRecentSigners(res.recentSignatures);
      })
      .finally(() => setLoading(false));
  }, [id, apiFetch]);

  if (loading || !petition) {
    return (
      <div className="skeleton">
        <div className="skeleton-line" style={{ width: '35%' }} />
        <div className="skeleton-line" style={{ width: '85%', height: 28 }} />
        <div className="skeleton-line" style={{ width: '65%' }} />
      </div>
    );
  }

  const pct = Math.min(100, Math.round((petition.currentSignatures / petition.targetSignatures) * 100));
  const stateEntry = NIGERIA_STATES.find((s) => s.name === signerState) || NIGERIA_STATES[24];

  const initiateSign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim()) {
      setSignError('Enter your full name before confirming your signature.');
      return;
    }
    setSignError(null);
    setSignConsentOpen(true);
  };

  const confirmSign = async () => {
    const res = await apiFetch<{ petition: PetitionDetail }>(`/api/petitions/${petition.id}/sign`, {
      method: 'POST',
      body: JSON.stringify({
        signerName: signerName.trim(),
        state: signerState,
        lga: signerLga,
        consentConfirmed: true,
      }),
    });
    setPetition(res.petition);
    setRecentSigners((prev) => [{ signer_name: signerName.trim(), state: signerState, lga: signerLga }, ...prev]);
    setSignConsentOpen(false);
    setFeedbackMsg('Thank you. Your verified signature has been added.');
  };

  const shareText = `${petition.title} (${petition.hashtag}) — Read the statutory basis and sign peacefully on Civic Watch Nigeria: ${window.location.href}`;

  const confirmShare = async () => {
    setShareConsentOpen(false);
    try {
      await apiFetch('/api/amplify', { method: 'POST', body: '{}' });
    } catch {
      // ignore
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
    }
    setFeedbackMsg('Non-partisan petition kit text copied to clipboard.');
  };

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'case', label: 'The case' },
    { key: 'demands', label: 'Demands' },
    { key: 'evidence', label: 'Evidence' },
    { key: 'media', label: 'Media updates' },
    { key: 'insight', label: 'Public insight' },
    { key: 'kit', label: 'Shareable content kit' },
  ];

  return (
    <div className="section-stack">
      <div>
        <Link to="/mobilise" className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to Mobilise</span>
        </Link>
      </div>

      {/* Petition Overview Header */}
      <section className="card stack-20" aria-labelledby="petition-detail-title">
        <div className="row-between">
          <div className="row-wrap">
            <span className="badge badge-primary">{petition.category}</span>
            <span className="mono badge">{petition.hashtag}</span>
            {petition.isSample && <span className="badge">Sample petition</span>}
          </div>
          <ListenButton
            text={`${petition.title}. ${petition.description}. Demands: ${petition.demands.join('. ')}`}
            label={petition.title}
          />
        </div>

        <h1 id="petition-detail-title">{petition.title}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-16)' }}>{petition.summary}</p>

        {/* Progress Bar */}
        <div className="stack-8">
          <div className="row-between">
            <strong style={{ fontSize: 'var(--text-22)' }}>
              {petition.currentSignatures.toLocaleString()} signatures
            </strong>
            <span style={{ color: 'var(--text-secondary)' }}>
              Target: {petition.targetSignatures.toLocaleString()} ({pct}%)
            </span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={petition.currentSignatures}
            aria-valuemin={0}
            aria-valuemax={petition.targetSignatures}
            aria-label="Petition signature progress"
          >
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Legislative Targets, Deadline, Related Case */}
        <div className="grid-3">
          <div className="card-subtle stack-8">
            <div className="row-wrap">
              <Landmark size={16} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <span className="overline">Legislative & oversight targets</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 'var(--sp-16)', fontSize: 'var(--text-13)' }}>
              {petition.legislativeTargets.map((target) => (
                <li key={target}>{target}</li>
              ))}
            </ul>
          </div>

          <div className="card-subtle stack-8">
            <div className="row-wrap">
              <Calendar size={16} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <span className="overline">Submission deadline</span>
            </div>
            <strong className="mono">{petition.deadline}</strong>
          </div>

          <div className="card-subtle stack-8">
            <div className="row-wrap">
              <FileCheck2 size={16} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <span className="overline">Related documented case</span>
            </div>
            {petition.relatedReportRef ? (
              <Link
                to={`/cases/${petition.relatedReportRef}`}
                className="mono"
                style={{ color: 'var(--primary)', fontWeight: 600 }}
              >
                {petition.relatedReportRef}
              </Link>
            ) : (
              <span className="field-hint">General statutory compliance petition</span>
            )}
          </div>
        </div>
      </section>

      {/* Six-Tab Detail Surface */}
      <section className="card stack-24">
        <div className="tabs-bar" role="tablist" aria-label="Petition detail sections">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className="tab-btn"
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'case' && (
          <div role="tabpanel" className="stack-16">
            <h2>Background & statutory basis</h2>
            <p style={{ fontSize: 'var(--text-16)' }}>{petition.description}</p>
          </div>
        )}

        {activeTab === 'demands' && (
          <div role="tabpanel" className="stack-16">
            <h2>Constructive institutional demands</h2>
            <ol className="stack-12" style={{ paddingLeft: 'var(--sp-20)', margin: 0 }}>
              {petition.demands.map((d, i) => (
                <li key={i} style={{ fontSize: 'var(--text-16)' }}>
                  {d}
                </li>
              ))}
            </ol>
          </div>
        )}

        {activeTab === 'evidence' && (
          <div role="tabpanel" className="stack-16">
            <h2>Supporting statutory & case references</h2>
            <div className="stack-12">
              {petition.evidenceItems.map((ev, i) => (
                <div key={i} className="card-subtle stack-8">
                  <strong>{ev.title}</strong>
                  <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{ev.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div role="tabpanel" className="stack-16">
            <h2>Verified progress & oversight updates</h2>
            <div className="stack-12">
              {petition.mediaUpdates.map((upd, i) => (
                <div key={i} className="card-subtle stack-8">
                  <span className="mono badge">{upd.date}</span>
                  <strong>{upd.title}</strong>
                  <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{upd.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'insight' && (
          <div role="tabpanel" className="stack-16">
            <h2>Public insight & recent signers</h2>
            <p style={{ fontSize: 'var(--text-16)' }}>{petition.publicInsight}</p>
            {recentSigners.length > 0 && (
              <div className="stack-8">
                <span className="overline">Recent verified signers</span>
                <div className="chip-row">
                  {recentSigners.map((s, idx) => (
                    <span key={idx} className="badge">
                      {s.signer_name} ({s.lga}, {s.state})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'kit' && (
          <div role="tabpanel" className="stack-16">
            <h2>Shareable non-partisan content kit</h2>
            <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>
              Use calm, accurate wording when sharing on WhatsApp, radio call-ins, or community boards. Avoid partisan attacks or unverified claims.
            </p>
            <div className="card-subtle stack-12">
              <span className="overline">Ready-to-share message</span>
              <p className="mono" style={{ fontSize: 'var(--text-13)' }}>
                {shareText}
              </p>
              <div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShareConsentOpen(true)}>
                  <Copy size={16} aria-hidden="true" />
                  <span>Copy message kit</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Sign and Share Form Behind Consent Dialogs */}
      <section className="card stack-20" aria-labelledby="sign-this-petition-heading">
        <div className="row-between">
          <h2 id="sign-this-petition-heading">Sign or share this petition</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShareConsentOpen(true)}>
            <Share2 size={16} aria-hidden="true" />
            <span>Share petition</span>
          </button>
        </div>

        {feedbackMsg && (
          <div className="card-tint row-wrap" role="status" aria-live="polite">
            <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <strong style={{ fontSize: 'var(--text-14)' }}>{feedbackMsg}</strong>
          </div>
        )}

        <form onSubmit={initiateSign} className="stack-16" noValidate>
          <div className="grid-3">
            <div className="field">
              <label htmlFor="pet-signer-name" className="field-label">
                Full name
              </label>
              <input
                id="pet-signer-name"
                className="input"
                placeholder="Enter your full name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="pet-signer-state" className="field-label">
                State
              </label>
              <select
                id="pet-signer-state"
                className="select"
                value={signerState}
                onChange={(e) => {
                  const st = NIGERIA_STATES.find((s) => s.name === e.target.value) || NIGERIA_STATES[0];
                  setSignerState(st.name);
                  setSignerLga(st.lgas[0]);
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
              <label htmlFor="pet-signer-lga" className="field-label">
                LGA
              </label>
              <select
                id="pet-signer-lga"
                className="select"
                value={signerLga}
                onChange={(e) => setSignerLga(e.target.value)}
              >
                {stateEntry.lgas.map((lga) => (
                  <option key={lga} value={lga}>
                    {lga}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {signError && (
            <p className="field-error" role="alert">
              {signError}
            </p>
          )}

          <div>
            <button type="submit" className="btn btn-primary">
              Review consent & sign petition
            </button>
          </div>
        </form>
      </section>

      <ConsentDialog
        open={signConsentOpen}
        title="Confirm non-partisan petition signature"
        whatHappens={`Your name (${signerName}), State (${signerState}), and LGA (${signerLga}) will be recorded on the formal petition roll addressed to ${petition.legislativeTargets.join(', ')}.`}
        confirmationText="I confirm that I am signing peacefully in my personal civic capacity, with no partisan affiliation."
        confirmButtonLabel="Confirm signature"
        onConfirm={confirmSign}
        onCancel={() => setSignConsentOpen(false)}
      />

      <ConsentDialog
        open={shareConsentOpen}
        title="Share petition peacefully"
        whatHappens="Copies the factual summary, hashtag, and link to your clipboard so you can share it accurately without sensational edits."
        confirmationText="I agree to share this petition peacefully and without adding unverified accusations."
        confirmButtonLabel="Copy share kit"
        onConfirm={confirmShare}
        onCancel={() => setShareConsentOpen(false)}
      />
    </div>
  );
}
