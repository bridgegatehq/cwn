import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Check,
  Clock,
  CircleDot,
  MapPin,
  ShieldCheck,
  Share2,
  Sparkles,
  Scale,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CASE_STAGES } from '../data/nigeriaData';
import { ListenButton } from '../components/ListenButton';
import { ConsentDialog } from '../components/ConsentDialog';

interface CaseDetail {
  id: number;
  caseReference: string;
  title: string;
  summary: string;
  description: string;
  category: string[];
  urgency: number;
  incidentDatetime: string;
  state: string;
  lga: string;
  address: string;
  coordinates: string;
  geostamp: string;
  capturedAt: string;
  evidenceUrls: Array<{ name: string; sealedAt: string; sha256: string }>;
  status: string;
  isAnonymous: boolean;
  isVerified: boolean;
  aiSummary?: string | null;
  assignedLawyerName?: string | null;
  reportType: string;
  isSample: boolean;
}

interface CaseNote {
  id: number;
  author_name: string;
  author_role: string;
  note: string;
  created_at: string;
}

export function CaseDetailPage() {
  const { ref = '' } = useParams<{ ref: string }>();
  const { apiFetch } = useApp();
  const [report, setReport] = useState<CaseDetail | null>(null);
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiConsentOpen, setAiConsentOpen] = useState(false);
  const [shareConsentOpen, setShareConsentOpen] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<{ report: CaseDetail; notes: CaseNote[] }>(`/api/reports/${ref}`)
      .then((res) => {
        setReport(res.report);
        setNotes(res.notes);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Case not found.'))
      .finally(() => setLoading(false));
  }, [ref, apiFetch]);

  const generateAiSummary = async () => {
    if (!report) return;
    const res = await apiFetch<{ aiSummary: string }>(`/api/reports/${report.caseReference}/ai-summary`, {
      method: 'POST',
      body: JSON.stringify({ consentConfirmed: true }),
    });
    setReport({ ...report, aiSummary: res.aiSummary });
    setAiConsentOpen(false);
  };

  const copyShareLink = async () => {
    setShareConsentOpen(false);
    const url = window.location.href;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
    }
    setShareMsg('Public case tracker link copied.');
  };

  if (loading) {
    return (
      <div className="section-stack">
        <div className="skeleton">
          <div className="skeleton-line" style={{ width: '30%' }} />
          <div className="skeleton-line" style={{ width: '80%', height: 28 }} />
          <div className="skeleton-line" style={{ width: '65%' }} />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="card stack-16">
        <h1>Case record unavailable</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{error || 'Could not load this case.'}</p>
        <div>
          <Link to="/justice" className="btn btn-secondary">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back to Justice & Cases</span>
          </Link>
        </div>
      </div>
    );
  }

  const currentStageIndex = Math.max(
    0,
    CASE_STAGES.findIndex((s) => s.key === report.status)
  );
  const currentStageMeta = CASE_STAGES[currentStageIndex] || CASE_STAGES[0];

  return (
    <div className="section-stack">
      <div>
        <Link to="/justice" className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to cases & advocates</span>
        </Link>
      </div>

      {/* Case Header Card */}
      <section className="card stack-20" aria-labelledby="case-title-heading">
        <div className="row-between">
          <div className="row-wrap">
            <span className="mono badge">{report.caseReference}</span>
            {report.isSample && <span className="badge">Sample record</span>}
            <span className="badge badge-primary">
              Stage {currentStageIndex + 1} of 11: {currentStageMeta.label}
            </span>
          </div>
          <ListenButton
            text={`Case ${report.caseReference}. ${report.title}. Current stage: ${currentStageMeta.label}. ${currentStageMeta.description}. ${report.description}`}
            label="Case summary and current stage"
          />
        </div>

        <h1 id="case-title-heading">{report.title}</h1>

        <p style={{ fontSize: 'var(--text-16)', color: 'var(--text-secondary)' }}>{report.description}</p>

        <div className="grid-2">
          <div className="card-subtle stack-8">
            <span className="overline">Location & Incident Time</span>
            <p style={{ fontWeight: 600 }}>
              <MapPin size={15} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} aria-hidden="true" />
              {report.address} ({report.lga}, {report.state})
            </p>
            <span className="mono" style={{ color: 'var(--text-secondary)' }}>
              Incident: {report.incidentDatetime.replace('T', ' ')} • Urgency {report.urgency}/5
            </span>
          </div>

          <div className="card-tint stack-8">
            <div className="row-wrap">
              <ShieldCheck size={16} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <span className="overline" style={{ color: 'var(--primary)' }}>
                Sealed capture record
              </span>
            </div>
            <span className="mono">{report.coordinates}</span>
            <span className="mono" style={{ fontSize: 'var(--text-12)', color: 'var(--text-secondary)' }}>
              {report.geostamp} • Captured {report.capturedAt}
            </span>
          </div>
        </div>

        {report.aiSummary ? (
          <div className="card-subtle stack-8">
            <div className="row-between">
              <span className="overline">Structured intake summary (not legal advice)</span>
              <ListenButton text={report.aiSummary} label="Structured intake summary" />
            </div>
            <p style={{ fontSize: 'var(--text-14)' }}>{report.aiSummary}</p>
          </div>
        ) : null}

        {shareMsg && (
          <p role="status" aria-live="polite" style={{ color: 'var(--success)', fontWeight: 600 }}>
            {shareMsg}
          </p>
        )}

        <div className="row-wrap">
          <Link to="/justice" className="btn btn-primary btn-sm">
            <Scale size={16} aria-hidden="true" />
            <span>{report.assignedLawyerName ? `Assigned: ${report.assignedLawyerName}` : 'Request a lawyer'}</span>
          </Link>
          {!report.aiSummary && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAiConsentOpen(true)}>
              <Sparkles size={16} aria-hidden="true" />
              <span>Generate structured summary</span>
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShareConsentOpen(true)}>
            <Share2 size={16} aria-hidden="true" />
            <span>Share tracker</span>
          </button>
        </div>
      </section>

      {/* Current Stage Plain-Language Highlight */}
      <section className="card-tint stack-12" aria-labelledby="current-stage-explainer">
        <span className="overline">Current stage explained plainly</span>
        <h2 id="current-stage-explainer" style={{ fontSize: 'var(--text-22)' }}>
          {currentStageMeta.label}
        </h2>
        <p style={{ fontSize: 'var(--text-16)' }}>{currentStageMeta.description}</p>
        <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>
          <strong>What comes next:</strong> {currentStageMeta.nextStep}
        </p>
      </section>

      {/* 11-Stage Vertical Accountability Timeline */}
      <section className="card stack-24" aria-labelledby="eleven-stage-heading">
        <div className="stack-8">
          <span className="overline">Accountability lifecycle</span>
          <h2 id="eleven-stage-heading">11-stage case progress tracker</h2>
        </div>

        <ol className="timeline-list">
          {CASE_STAGES.map((stage, idx) => {
            const stateClass =
              idx < currentStageIndex ? 'completed' : idx === currentStageIndex ? 'current' : 'upcoming';
            const statusText =
              idx < currentStageIndex ? 'Completed' : idx === currentStageIndex ? 'Current stage' : 'Upcoming';

            return (
              <li key={stage.key} className={`timeline-step ${stateClass}`}>
                <div className="timeline-connector" aria-hidden="true" />
                <div className="timeline-marker" aria-hidden="true">
                  {idx < currentStageIndex ? (
                    <Check size={18} />
                  ) : idx === currentStageIndex ? (
                    <CircleDot size={18} />
                  ) : (
                    <Clock size={16} />
                  )}
                </div>
                <div className="stack-8" style={{ gap: 'var(--sp-4)' }}>
                  <div className="row-wrap">
                    <strong style={{ fontSize: 'var(--text-16)' }}>
                      {idx + 1}. {stage.label}
                    </strong>
                    <span
                      className={
                        idx < currentStageIndex
                          ? 'badge badge-success'
                          : idx === currentStageIndex
                            ? 'badge badge-primary'
                            : 'badge'
                      }
                    >
                      {statusText}
                    </span>
                  </div>
                  <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{stage.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Sealed Private Evidence Metadata & Case Log Notes */}
      <div className="grid-2">
        <section className="card stack-16" aria-labelledby="evidence-seal-heading">
          <div className="row-wrap">
            <Lock size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <h2 id="evidence-seal-heading" style={{ fontSize: 'var(--text-18)' }}>
              Sealed evidence vault ({report.evidenceUrls.length})
            </h2>
          </div>
          {report.evidenceUrls.length === 0 ? (
            <p className="field-hint">No external media files attached; written/voice geostamp is sealed.</p>
          ) : (
            <ul className="stack-12" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {report.evidenceUrls.map((ev, i) => (
                <li key={i} className="card-subtle stack-8" style={{ gap: 'var(--sp-4)' }}>
                  <strong style={{ fontSize: 'var(--text-14)' }}>{ev.name}</strong>
                  <span className="mono" style={{ fontSize: 'var(--text-12)', color: 'var(--text-secondary)' }}>
                    Sealed: {ev.sealedAt} • {ev.sha256}
                  </span>
                  <span className="field-hint">Stored privately — accessible only to reporter and assigned advocate</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card stack-16" aria-labelledby="case-notes-heading">
          <h2 id="case-notes-heading" style={{ fontSize: 'var(--text-18)' }}>
            Verification & advocate notes ({notes.length})
          </h2>
          {notes.length === 0 ? (
            <p className="field-hint">Notes will appear here as intake reviewers and lawyers update the file.</p>
          ) : (
            <ul className="stack-12" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {notes.map((n) => (
                <li key={n.id} className="card-subtle stack-8" style={{ gap: 'var(--sp-4)' }}>
                  <div className="row-between">
                    <strong style={{ fontSize: 'var(--text-14)' }}>{n.author_name}</strong>
                    <span className="badge">{n.author_role}</span>
                  </div>
                  <p style={{ fontSize: 'var(--text-14)' }}>{n.note}</p>
                  <span className="mono" style={{ fontSize: 'var(--text-12)', color: 'var(--text-secondary)' }}>
                    {new Date(n.created_at).toLocaleString('en-NG')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ConsentDialog
        open={aiConsentOpen}
        title="Generate structured summary?"
        whatHappens="Creates a concise, non-legal summary of the timeline, location, and urgency on this case to assist human review."
        confirmationText="I understand this automated summary is not legal advice and I consent to generating it."
        confirmButtonLabel="Generate summary"
        onConfirm={generateAiSummary}
        onCancel={() => setAiConsentOpen(false)}
      />

      <ConsentDialog
        open={shareConsentOpen}
        title="Share public case tracker?"
        whatHappens="Copies the link to this 11-stage case timeline. Private evidence files remain protected."
        confirmationText="I confirm I want to share this case reference peacefully and accurately."
        confirmButtonLabel="Copy link"
        onConfirm={copyShareLink}
        onCancel={() => setShareConsentOpen(false)}
      />
    </div>
  );
}
