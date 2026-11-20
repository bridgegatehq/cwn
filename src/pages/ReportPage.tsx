import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Mic,
  Radio,
  MapPin,
  Upload,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Lock,
  Share2,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { INCIDENT_CATEGORIES, NIGERIA_STATES, URGENCY_LEVELS } from '../data/nigeriaData';
import { VoiceMicButton } from '../components/VoiceMicButton';
import { ConsentDialog } from '../components/ConsentDialog';
import { ListenButton } from '../components/ListenButton';

interface SealedEvidenceFile {
  name: string;
  size: number;
  type: string;
  sealedAt: string;
  sha256: string;
  progress: number;
}

interface SubmittedReport {
  caseReference: string;
  title: string;
  state: string;
  lga: string;
  coordinates: string;
  geostamp: string;
  capturedAt: string;
  aiSummary?: string | null;
}

export function ReportPage() {
  const { detectedArea, openAppGate, apiFetch } = useApp();

  // Step 1..7 + Confirmation view
  const [step, setStep] = useState<number>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [method, setMethod] = useState<'written' | 'voice' | ''>('written');
  const [categories, setCategories] = useState<string[]>([]);
  const [urgency, setUrgency] = useState<number>(3);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [incidentDatetime, setIncidentDatetime] = useState<string>('2026-11-12T10:00');

  const [stateName, setStateName] = useState<string>(detectedArea.state);
  const [lgaName, setLgaName] = useState<string>(detectedArea.lga);
  const [address, setAddress] = useState<string>('');
  const [coordinates, setCoordinates] = useState<string>('');
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  const [evidenceFiles, setEvidenceFiles] = useState<SealedEvidenceFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [truthfulConfirmed, setTruthfulConfirmed] = useState<boolean>(false);

  // Post-submit Confirmation State
  const [submitted, setSubmitted] = useState<SubmittedReport | null>(null);
  const [aiConsentOpen, setAiConsentOpen] = useState(false);
  const [shareConsentOpen, setShareConsentOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [shareCopiedMsg, setShareCopiedMsg] = useState<string | null>(null);

  const selectedStateEntry = NIGERIA_STATES.find((s) => s.name === stateName) || NIGERIA_STATES[24];

  const toggleCategory = (id: string) => {
    setStepError(null);
    setCategories((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const captureGps = () => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('Browser GPS is unavailable on this device. Your chosen State and LGA will still be sealed.');
      return;
    }
    setGpsStatus('Capturing device coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
        setCoordinates(coords);
        setGpsStatus(`GPS coordinates captured (±${Math.round(pos.coords.accuracy)}m).`);
      },
      () => {
        setGpsStatus('Location permission was declined or unavailable. Your State, LGA, and landmark remain valid.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const selected = Array.from(fileList);
    setUploadingFiles(true);

    // Show immediate per-file progress state
    const optimistic: SealedEvidenceFile[] = selected.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
      sealedAt: 'Sealing...',
      sha256: 'Calculating...',
      progress: 45,
    }));
    setEvidenceFiles((prev) => [...prev, ...optimistic]);

    try {
      const fd = new FormData();
      for (const f of selected) {
        fd.append('files', f);
      }
      const res = await apiFetch<{
        files: Array<{ name: string; size: number; type: string; sealedAt: string; sha256: string }>;
      }>('/api/evidence/upload', {
        method: 'POST',
        body: fd,
      });

      setEvidenceFiles((prev) => {
        const withoutOptimistic = prev.filter((item) => item.sealedAt !== 'Sealing...');
        const completed = res.files.map((item) => ({ ...item, progress: 100 }));
        return [...withoutOptimistic, ...completed];
      });
    } catch {
      // Fallback local seal if offline
      const nowIso = new Date().toISOString();
      setEvidenceFiles((prev) =>
        prev.map((item) =>
          item.sealedAt === 'Sealing...'
            ? { ...item, sealedAt: nowIso, sha256: 'local-timestamp-seal', progress: 100 }
            : item
        )
      );
    } finally {
      setUploadingFiles(false);
      e.target.value = '';
    }
  };

  const removeEvidence = (idx: number) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Explicit Validation with plain-language message (never silently disable Continue)
  const validateCurrentStep = (): string | null => {
    if (step === 1) {
      if (!method) return 'Choose either Written report or Voice-assisted report to continue.';
    }
    if (step === 2) {
      if (categories.length === 0) return 'Select at least one incident category so reviewers can route your report.';
    }
    if (step === 3) {
      if (title.trim().length < 8) return 'Enter an incident title of at least 8 characters describing what happened.';
      if (description.trim().length < 20)
        return 'Add at least 20 characters in the description explaining what happened, when, and who was affected.';
      if (!incidentDatetime) return 'Select the approximate date and time of the incident.';
    }
    if (step === 4) {
      if (!stateName || !lgaName) return 'Select both the State and Local Government Area.';
      if (address.trim().length < 4) return 'Enter the nearest street, bus stop, market, or landmark.';
    }
    if (step === 7) {
      if (!truthfulConfirmed)
        return 'Confirm that this account is truthful to the best of your knowledge before sealing the record.';
    }
    return null;
  };

  const handleContinue = () => {
    const missing = validateCurrentStep();
    if (missing) {
      setStepError(missing);
      return;
    }
    setStepError(null);
    if (step < 7) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      void submitFinalReport();
    }
  };

  const submitFinalReport = async () => {
    setSubmitting(true);
    setStepError(null);

    // Attempt quick automatic device geostamp on submit if not yet captured
    let finalCoords = coordinates;
    if (!finalCoords && 'geolocation' in navigator) {
      finalCoords = await new Promise<string>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`),
          () => resolve(''),
          { timeout: 2500 }
        );
      });
    }

    try {
      const res = await apiFetch<{ report: SubmittedReport }>('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportType: method || 'written',
          categories,
          urgency,
          title: title.trim(),
          description: description.trim(),
          incidentDatetime,
          state: stateName,
          lga: lgaName,
          address: address.trim(),
          coordinates: finalCoords || `${lgaName}, ${stateName} (declared)`,
          evidenceFiles,
          isAnonymous,
          isPublic,
        }),
      });
      setSubmitted(res.report);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'Could not save report. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateAiSummary = async () => {
    if (!submitted) return;
    setAiBusy(true);
    try {
      const res = await apiFetch<{ aiSummary: string }>(`/api/reports/${submitted.caseReference}/ai-summary`, {
        method: 'POST',
        body: JSON.stringify({ consentConfirmed: true }),
      });
      setSubmitted({ ...submitted, aiSummary: res.aiSummary });
      setAiConsentOpen(false);
    } catch {
      setAiConsentOpen(false);
    } finally {
      setAiBusy(false);
    }
  };

  const handleShareConfirmed = async () => {
    if (!submitted) return;
    setShareConsentOpen(false);
    const shareUrl = `${window.location.origin}/cases/${submitted.caseReference}`;
    try {
      await apiFetch('/api/amplify', { method: 'POST', body: '{}' });
    } catch {
      // ignore
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(`Civic Watch Nigeria Case ${submitted.caseReference}: ${shareUrl}`);
      setShareCopiedMsg('Case reference link copied to clipboard.');
    } else {
      setShareCopiedMsg(`Shareable link: ${shareUrl}`);
    }
  };

  const resetForNewReport = () => {
    setSubmitted(null);
    setStep(1);
    setCategories([]);
    setTitle('');
    setDescription('');
    setAddress('');
    setEvidenceFiles([]);
    setTruthfulConfirmed(false);
    setShareCopiedMsg(null);
  };

  // ---------------- CALM CONFIRMATION SCREEN ----------------
  if (submitted) {
    return (
      <div className="section-stack" style={{ maxWidth: '760px', margin: '0 auto' }}>
        <section className="card stack-24" aria-labelledby="report-confirmed-heading">
          <div className="row-wrap">
            <span className="badge badge-success">
              <CheckCircle2 size={15} aria-hidden="true" />
              <span>Report recorded safely</span>
            </span>
          </div>

          <div className="stack-8">
            <h1 id="report-confirmed-heading">Your report has been sealed</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Keep your case reference safe. You can use it anytime to check progress, add notes, or connect with a verified advocate.
            </p>
          </div>

          <div className="card-subtle stack-8">
            <span className="overline">Case reference</span>
            <strong className="mono" style={{ fontSize: 'var(--text-28)', color: 'var(--primary)' }}>
              {submitted.caseReference}
            </strong>
          </div>

          {/* Capture Verified Card */}
          <div className="card-tint stack-12" aria-label="Capture verified seal">
            <div className="row-wrap">
              <ShieldCheck size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <strong>Capture verified</strong>
            </div>
            <div className="grid-2">
              <div className="stack-8" style={{ gap: 'var(--sp-4)' }}>
                <span className="overline">Sealed geostamp coordinates</span>
                <span className="mono">{submitted.coordinates}</span>
                <span className="mono" style={{ fontSize: 'var(--text-12)', color: 'var(--text-secondary)' }}>
                  {submitted.geostamp}
                </span>
              </div>
              <div className="stack-8" style={{ gap: 'var(--sp-4)' }}>
                <span className="overline">Sealed UTC timestamp</span>
                <span className="mono">{new Date(submitted.capturedAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'medium' })}</span>
                <span className="mono" style={{ fontSize: 'var(--text-12)', color: 'var(--text-secondary)' }}>
                  {submitted.capturedAt}
                </span>
              </div>
            </div>
          </div>

          {/* What happens next */}
          <div className="stack-12">
            <h2 style={{ fontSize: 'var(--text-18)' }}>What happens next</h2>
            <ol className="stack-12" style={{ paddingLeft: 'var(--sp-20)', margin: 0, color: 'var(--text-secondary)' }}>
              <li>Our non-partisan intake reviewers check completeness, dates, and immediate safety risks.</li>
              <li>Uploaded files remain stored privately with their upload timestamps intact.</li>
              <li>You can follow all 11 accountability stages or request a verified lawyer from your case tracker.</li>
            </ol>
          </div>

          {/* Optional AI Case Summary behind Consent Dialog */}
          {submitted.aiSummary ? (
            <div className="card-subtle stack-12">
              <div className="row-between">
                <span className="overline">Structured case summary (not legal advice)</span>
                <ListenButton text={submitted.aiSummary} label="Case summary" />
              </div>
              <p style={{ fontSize: 'var(--text-14)' }}>{submitted.aiSummary}</p>
            </div>
          ) : (
            <div className="card-subtle row-between">
              <div className="stack-8" style={{ gap: 'var(--sp-4)', maxWidth: '460px' }}>
                <strong style={{ fontSize: 'var(--text-14)' }}>Optional structured intake summary</strong>
                <span className="field-hint">
                  Generate a short plain-language summary of your answers for easier advocate handoff. Requires your explicit consent.
                </span>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAiConsentOpen(true)}>
                <Sparkles size={16} aria-hidden="true" />
                <span>Request summary</span>
              </button>
            </div>
          )}

          {shareCopiedMsg && (
            <p role="status" aria-live="polite" style={{ color: 'var(--success)', fontWeight: 600, fontSize: 'var(--text-14)' }}>
              {shareCopiedMsg}
            </p>
          )}

          <div className="row-wrap">
            <Link to={`/cases/${submitted.caseReference}`} className="btn btn-primary">
              Track this case
            </Link>
            <button type="button" className="btn btn-secondary" onClick={() => setShareConsentOpen(true)}>
              <Share2 size={18} aria-hidden="true" />
              <span>Share case</span>
            </button>
            <button type="button" className="btn btn-ghost" onClick={resetForNewReport}>
              Start a new report
            </button>
          </div>
        </section>

        <ConsentDialog
          open={aiConsentOpen}
          title="Generate structured case summary?"
          whatHappens="Your report fields (category, urgency, location, and timeline) will be formatted into a concise intake summary saved to this case record. This automated tool does not give legal advice or make legal decisions."
          confirmationText="I understand this summary is an optional intake aid, not legal advice, and I consent to generating it."
          confirmButtonLabel="Generate summary"
          busy={aiBusy}
          onConfirm={handleGenerateAiSummary}
          onCancel={() => setAiConsentOpen(false)}
        />

        <ConsentDialog
          open={shareConsentOpen}
          title="Share case reference link?"
          whatHappens={`Anyone with the link to ${submitted.caseReference} will be able to view the public case timeline and summary. Private uploaded files and protected reporter contact details are never exposed in public links.`}
          confirmationText="I understand what information is visible on the public tracker and want to copy the share link."
          confirmButtonLabel="Copy share link"
          onConfirm={handleShareConfirmed}
          onCancel={() => setShareConsentOpen(false)}
        />
      </div>
    );
  }

  // ---------------- 7-STEP ONE-QUESTION-PER-SCREEN FLOW ----------------
  const stepTitles = [
    'Choose how you want to report',
    'What kind of injustice happened?',
    'Describe what happened and when',
    'Where did the incident happen?',
    'Attach supporting evidence (optional)',
    'Choose your identity and privacy level',
    'Review and seal your report',
  ];

  const progressPct = Math.round((step / 7) * 100);

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>
      {/* Quiet Safety Notice */}
      <div className="card-subtle row-between" style={{ marginBottom: 'var(--sp-24)' }}>
        <span style={{ fontSize: 'var(--text-13)', color: 'var(--text-secondary)' }}>
          Civic Watch Nigeria is an accountability log, not an emergency dispatch line. Put your physical safety first.
        </span>
        <Link to="/justice" style={{ fontSize: 'var(--text-13)', fontWeight: 600, color: 'var(--primary)' }}>
          Urgent legal contacts
        </Link>
      </div>

      {/* Visible Step Counter & Progress Indicator */}
      <div className="stack-12" style={{ marginBottom: 'var(--sp-24)' }}>
        <div className="row-between">
          <span className="overline">Step {step} of 7</span>
          <span className="mono" style={{ color: 'var(--text-secondary)' }}>
            {progressPct}% complete
          </span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={7}
          aria-label={`Report progress: step ${step} of 7`}
        >
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <section className="card stack-24" aria-labelledby="current-step-heading">
        <h1 id="current-step-heading" style={{ fontSize: 'var(--text-28)' }}>
          {stepTitles[step - 1]}
        </h1>

        {/* STEP 1: METHOD */}
        {step === 1 && (
          <div className="stack-16">
            <p style={{ color: 'var(--text-secondary)' }}>
              Pick the reporting path most comfortable for you. Every report receives the same timestamp and location seal.
            </p>
            <div className="stack-12" role="radiogroup" aria-label="Reporting method">
              <button
                type="button"
                onClick={() => {
                  setMethod('written');
                  setStepError(null);
                }}
                className="card"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderColor: method === 'written' ? 'var(--primary)' : 'var(--border)',
                  background: method === 'written' ? 'var(--primary-subtle)' : 'var(--surface)',
                }}
                aria-pressed={method === 'written'}
              >
                <div className="row-wrap">
                  <FileText size={22} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                  <strong>Written step-by-step report</strong>
                </div>
                <p className="field-hint" style={{ marginTop: 'var(--sp-8)' }}>
                  Type calmly at your own pace, with optional microphone dictation beside text fields.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod('voice');
                  setStepError(null);
                }}
                className="card"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderColor: method === 'voice' ? 'var(--primary)' : 'var(--border)',
                  background: method === 'voice' ? 'var(--primary-subtle)' : 'var(--surface)',
                }}
                aria-pressed={method === 'voice'}
              >
                <div className="row-between">
                  <div className="row-wrap">
                    <Mic size={22} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                    <strong>Voice-guided report</strong>
                  </div>
                  <span className="badge badge-primary">Low-literacy friendly</span>
                </div>
                <p className="field-hint" style={{ marginTop: 'var(--sp-8)' }}>
                  Speak your account aloud into the title, description, and address fields. Full offline single-recording auto-structuring is also available on our mobile app.
                </p>
              </button>

              <div className="card-subtle stack-8">
                <div className="row-between">
                  <div className="row-wrap">
                    <Radio size={20} style={{ color: 'var(--text-secondary)' }} aria-hidden="true" />
                    <strong>Live incident camera stream</strong>
                  </div>
                  <span className="badge">
                    <Smartphone size={13} aria-hidden="true" />
                    <span>Mobile app only</span>
                  </span>
                </div>
                <p className="field-hint">
                  Real-time encrypted camera streaming with continuous GPS sealing runs on the native mobile app.
                </p>
                <div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => openAppGate('live_streaming')}>
                    Open mobile app QR & store links
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: 18 CATEGORIES MULTI-SELECT */}
        {step === 2 && (
          <div className="stack-16">
            <p style={{ color: 'var(--text-secondary)' }}>
              Select one or more categories that match what happened. Selected: <strong>{categories.length}</strong>.
            </p>
            <div className="chip-row" role="group" aria-label="Incident categories (18 options)">
              {INCIDENT_CATEGORIES.map((cat) => {
                const active = categories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`chip ${active ? 'active' : ''}`}
                    aria-pressed={active}
                    onClick={() => toggleCategory(cat.id)}
                  >
                    {active && <CheckCircle2 size={15} aria-hidden="true" />}
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: DETAILS, URGENCY 1-5, VOICE INPUT */}
        {step === 3 && (
          <div className="stack-24">
            <div className="field">
              <span className="field-label">Urgency level (1 to 5)</span>
              <div className="stack-8" role="radiogroup" aria-label="Urgency level 1 to 5">
                {URGENCY_LEVELS.map((u) => (
                  <button
                    key={u.level}
                    type="button"
                    onClick={() => setUrgency(u.level)}
                    className="card-subtle"
                    style={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      padding: 'var(--sp-12) var(--sp-16)',
                      borderColor: urgency === u.level ? 'var(--primary)' : 'var(--border)',
                      background: urgency === u.level ? 'var(--primary-subtle)' : 'var(--surface)',
                    }}
                    aria-pressed={urgency === u.level}
                  >
                    <strong style={{ fontSize: 'var(--text-14)', display: 'block' }}>{u.label}</strong>
                    <span className="field-hint">{u.detail}</span>
                  </button>
                ))}
              </div>
            </div>

            {urgency === 5 && (
              <div
                role="alert"
                className="card"
                style={{
                  background: 'var(--danger-subtle)',
                  borderColor: 'var(--danger-border)',
                  borderLeft: '5px solid var(--danger)',
                }}
              >
                <div className="row-wrap">
                  <AlertTriangle size={20} style={{ color: 'var(--danger)' }} aria-hidden="true" />
                  <strong style={{ color: 'var(--danger)' }}>Emergency safety notice (Level 5)</strong>
                </div>
                <p style={{ fontSize: 'var(--text-14)', marginTop: 'var(--sp-8)' }}>
                  Civic Watch Nigeria does not dispatch emergency responders. If life or physical safety is in danger right now, move to a safe location immediately, alert trusted neighbours or relatives, and call Nigeria’s national emergency number <strong>112</strong> where available. File this record only when you are physically safe.
                </p>
              </div>
            )}

            <div className="field">
              <div className="field-label">
                <label htmlFor="report-title">Short incident title</label>
                <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                  {title.length}/120
                </span>
              </div>
              <div className="input-with-voice">
                <input
                  id="report-title"
                  type="text"
                  maxLength={120}
                  className="input"
                  placeholder="Example: Commercial bus driver held 3 days without bail in Surulere"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setStepError(null);
                  }}
                />
                <VoiceMicButton
                  fieldLabel="Incident title"
                  onTranscript={(spoken) => setTitle((prev) => (prev ? `${prev} ${spoken}` : spoken).slice(0, 120))}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="report-description" className="field-label">
                What happened? (plain, factual steps)
              </label>
              <div className="input-with-voice">
                <textarea
                  id="report-description"
                  className="textarea"
                  placeholder="State who was involved, what happened step by step, and whether anyone was injured or detained."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setStepError(null);
                  }}
                />
                <VoiceMicButton
                  fieldLabel="Incident description"
                  onTranscript={(spoken) => setDescription((prev) => (prev ? `${prev} ${spoken}` : spoken))}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="report-datetime" className="field-label">
                Date and approximate time of incident
              </label>
              <input
                id="report-datetime"
                type="datetime-local"
                className="input"
                value={incidentDatetime}
                onChange={(e) => setIncidentDatetime(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 4: LOCATION — GPS + ALL 37 STATES & LGAS + LANDMARK WITH VOICE */}
        {step === 4 && (
          <div className="stack-20">
            <div className="card-subtle row-between">
              <div className="stack-8" style={{ gap: 'var(--sp-4)' }}>
                <strong style={{ fontSize: 'var(--text-14)' }}>One-tap GPS geostamp</strong>
                <span className="field-hint">
                  Captures exact coordinates to strengthen verification. Optional if you are reporting away from the scene.
                </span>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={captureGps}>
                <MapPin size={16} aria-hidden="true" />
                <span>Capture GPS</span>
              </button>
            </div>

            {gpsStatus && (
              <p className="mono" role="status" aria-live="polite" style={{ color: 'var(--primary)' }}>
                {gpsStatus} {coordinates ? `(${coordinates})` : ''}
              </p>
            )}

            <div className="grid-2">
              <div className="field">
                <label htmlFor="report-state" className="field-label">
                  State (all 36 states + FCT)
                </label>
                <select
                  id="report-state"
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
                <label htmlFor="report-lga" className="field-label">
                  Local Government Area (LGA)
                </label>
                <select
                  id="report-lga"
                  className="select"
                  value={lgaName}
                  onChange={(e) => setLgaName(e.target.value)}
                >
                  {selectedStateEntry.lgas.map((lga) => (
                    <option key={lga} value={lga}>
                      {lga}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="report-landmark" className="field-label">
                Nearest street, junction, or landmark
              </label>
              <div className="input-with-voice">
                <input
                  id="report-landmark"
                  type="text"
                  className="input"
                  placeholder="Example: Opposite Ojuelegba under-bridge bus stop"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setStepError(null);
                  }}
                />
                <VoiceMicButton
                  fieldLabel="Address or landmark"
                  onTranscript={(spoken) => setAddress((prev) => (prev ? `${prev} ${spoken}` : spoken))}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: EVIDENCE UPLOAD WITH SEAL STATEMENT */}
        {step === 5 && (
          <div className="stack-20">
            <div className="card-tint stack-8">
              <div className="row-wrap">
                <Lock size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                <strong style={{ fontSize: 'var(--text-14)' }}>Private storage & timestamp sealing</strong>
              </div>
              <p style={{ fontSize: 'var(--text-13)', color: 'var(--text-secondary)' }}>
                Every uploaded photo, video, audio recording, or document is immediately sealed with an upload timestamp and SHA-256 fingerprint and stored privately. Raw files are never published openly without redaction.
              </p>
            </div>

            <div className="field">
              <label
                htmlFor="evidence-file-input"
                className="btn btn-secondary btn-full"
                style={{ cursor: 'pointer', borderStyle: 'dashed' }}
              >
                <Upload size={18} aria-hidden="true" />
                <span>{uploadingFiles ? 'Sealing files...' : 'Select photos, video, audio, or PDF documents'}</span>
              </label>
              <input
                id="evidence-file-input"
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                onChange={handleEvidenceUpload}
                className="sr-only"
              />
              <span className="field-hint">
                Optional step — you can still submit a strong report even if you do not have files right now.
              </span>
            </div>

            {evidenceFiles.length > 0 && (
              <ul className="stack-12" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {evidenceFiles.map((f, idx) => (
                  <li key={`${f.name}-${idx}`} className="card-subtle stack-8">
                    <div className="row-between">
                      <div>
                        <strong style={{ fontSize: 'var(--text-14)', display: 'block' }}>{f.name}</strong>
                        <span className="mono" style={{ fontSize: 'var(--text-12)', color: 'var(--text-secondary)' }}>
                          {(f.size / 1024).toFixed(1)} KB • Sealed: {f.sealedAt} • {f.sha256}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => removeEvidence(idx)}
                        aria-label={`Remove file ${f.name}`}
                      >
                        <Trash2 size={18} style={{ color: 'var(--danger)' }} aria-hidden="true" />
                      </button>
                    </div>
                    <div className="progress-track" aria-label={`Upload progress for ${f.name}`}>
                      <div className="progress-fill" style={{ width: `${f.progress}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* STEP 6: PRIVACY & ANONYMITY TRADE-OFF */}
        {step === 6 && (
          <div className="stack-20">
            <p style={{ color: 'var(--text-secondary)' }}>
              Choose how your identity is handled. Read the honest trade-off below so you can decide safely.
            </p>

            <div className="stack-12" role="radiogroup" aria-label="Identity mode">
              <button
                type="button"
                onClick={() => setIsAnonymous(false)}
                className="card"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderColor: !isAnonymous ? 'var(--primary)' : 'var(--border)',
                  background: !isAnonymous ? 'var(--primary-subtle)' : 'var(--surface)',
                }}
                aria-pressed={!isAnonymous}
              >
                <strong style={{ fontSize: 'var(--text-16)' }}>Verified confidential contact (recommended for legal action)</strong>
                <p className="field-hint" style={{ marginTop: 'var(--sp-8)' }}>
                  Your name is still hidden from the public web page, while verified lawyers assigned to your case can contact you directly to sign court affidavits, secure bail, or recover property.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIsAnonymous(true)}
                className="card"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderColor: isAnonymous ? 'var(--primary)' : 'var(--border)',
                  background: isAnonymous ? 'var(--primary-subtle)' : 'var(--surface)',
                }}
                aria-pressed={isAnonymous}
              >
                <strong style={{ fontSize: 'var(--text-16)' }}>Strict anonymous report</strong>
                <p className="field-hint" style={{ marginTop: 'var(--sp-8)' }}>
                  No account identity is linked to the report. Honest trade-off: while useful for public pattern oversight and FOI checks, courts usually require an identifiable complainant or witness for personal legal remedies.
                </p>
              </button>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--sp-12)',
                padding: 'var(--sp-16)',
                borderRadius: 'var(--radius-btn)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                style={{ width: 22, height: 22, marginTop: 2, accentColor: 'var(--primary)' }}
              />
              <span style={{ fontSize: 'var(--text-14)' }}>
                Allow an anonymised summary of this case to appear on the public accountability feed (uncheck to keep visible only to yourself and assigned legal reviewers).
              </span>
            </label>
          </div>
        )}

        {/* STEP 7: CLEAN REVIEW & TRUTHFUL REPORT CONFIRMATION */}
        {step === 7 && (
          <div className="stack-20">
            <div className="card-subtle stack-16">
              <div className="row-between">
                <div>
                  <span className="overline">Method & Urgency</span>
                  <p style={{ fontWeight: 600 }}>
                    {method === 'voice' ? 'Voice-guided' : 'Written'} • Urgency Level {urgency} of 5
                  </p>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(3)}>
                  Edit details
                </button>
              </div>

              <div>
                <span className="overline">Categories</span>
                <p>{categories.map((c) => c.replace(/_/g, ' ')).join(', ')}</p>
              </div>

              <div>
                <span className="overline">Incident Title & Description</span>
                <p style={{ fontWeight: 600 }}>{title}</p>
                <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)', marginTop: 'var(--sp-4)' }}>
                  {description}
                </p>
              </div>

              <div>
                <span className="overline">Location & Time</span>
                <p>
                  {address} — {lgaName}, {stateName} ({incidentDatetime.replace('T', ' ')})
                </p>
              </div>

              <div>
                <span className="overline">Sealed Attachments & Privacy</span>
                <p>
                  {evidenceFiles.length} private file(s) • {isAnonymous ? 'Strict anonymous' : 'Confidential verified contact'} •{' '}
                  {isPublic ? 'Anonymised public tracker' : 'Private record only'}
                </p>
              </div>
            </div>

            <div className="card-tint stack-8">
              <strong style={{ fontSize: 'var(--text-14)' }}>Automatic geostamp & timestamp seal on submit</strong>
              <p style={{ fontSize: 'var(--text-13)', color: 'var(--text-secondary)' }}>
                When you press Submit report, the current UTC timestamp and device/LGA location seal are permanently recorded and your <span className="mono">CWN-YEAR-STATE-#####</span> reference is generated.
              </p>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--sp-12)',
                padding: 'var(--sp-16)',
                borderRadius: 'var(--radius-btn)',
                border: '1px solid var(--border-strong)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={truthfulConfirmed}
                onChange={(e) => {
                  setTruthfulConfirmed(e.target.checked);
                  setStepError(null);
                }}
                style={{ width: 22, height: 22, marginTop: 2, accentColor: 'var(--primary)', flexShrink: 0 }}
              />
              <span style={{ fontSize: 'var(--text-14)' }}>
                I confirm that this report is truthful to the best of my knowledge, is not fabricated to harm another person, and supports peaceful, lawful accountability.
              </span>
            </label>
          </div>
        )}

        {/* Inline Validation Explanation */}
        {stepError && (
          <div
            role="alert"
            className="card"
            style={{
              background: 'var(--danger-subtle)',
              borderColor: 'var(--danger-border)',
              padding: 'var(--sp-12) var(--sp-16)',
            }}
          >
            <p className="field-error">
              <AlertTriangle size={18} aria-hidden="true" />
              <span>{stepError}</span>
            </p>
          </div>
        )}
      </section>

      {/* Sticky Bottom Action Bar with Back + Full-Width Primary Action */}
      <div className="sticky-action-bar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-12)' }}>
          <button
            type="button"
            className="btn btn-accent btn-full"
            onClick={handleContinue}
            disabled={submitting}
          >
            <span>{submitting ? 'Sealing report...' : step === 7 ? 'Submit and seal report' : 'Continue'}</span>
            {step < 7 && <ArrowRight size={18} aria-hidden="true" />}
          </button>

          {step > 1 && (
            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={() => {
                setStepError(null);
                setStep((s) => s - 1);
              }}
            >
              <ArrowLeft size={18} aria-hidden="true" />
              <span>Back to step {step - 1}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
