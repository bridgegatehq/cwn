import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Clock, FileText, ArrowRight, Scale } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CASE_STAGES } from '../data/nigeriaData';
import type { Advocate } from './JusticePage';

interface AdvocatePortalData {
  advocate: Advocate;
  assignedCases: Array<{
    id: number;
    caseReference: string;
    title: string;
    summary: string;
    state: string;
    lga: string;
    status: string;
    urgency: number;
  }>;
  consultations: Array<{
    id: number;
    requester_name: string;
    report_reference?: string | null;
    contact_value: string;
    summary: string;
    status: string;
    created_at: string;
  }>;
}

export function AdvocatePortalPage() {
  const { t, apiFetch } = useApp();
  const [data, setData] = useState<AdvocatePortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingDossier, setEditingDossier] = useState(false);

  // Editable registration dossier fields
  const [primaryPracticeArea, setPrimaryPracticeArea] = useState('');
  const [coreStrengthsText, setCoreStrengthsText] = useState('');
  const [courtsText, setCourtsText] = useState('');
  const [educationQualifications, setEducationQualifications] = useState('');
  const [feeArrangement, setFeeArrangement] = useState('');
  const [turnaroundCommitment, setTurnaroundCommitment] = useState('');
  const [hoursInput, setHoursInput] = useState('');
  const [bioInput, setBioInput] = useState('');

  const [selectedCaseId, setSelectedCaseId] = useState<number>(1);
  const [noteText, setNoteText] = useState('');
  const [nextStage, setNextStage] = useState('advocacy_active');
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadPortal = () => {
    setLoading(true);
    apiFetch<AdvocatePortalData>('/api/advocate-portal')
      .then((res) => {
        setData(res);
        setPrimaryPracticeArea(res.advocate.primaryPracticeArea);
        setCoreStrengthsText(res.advocate.coreStrengths.join('\n'));
        setCourtsText(res.advocate.courtsOfPractice.join(', '));
        setEducationQualifications(res.advocate.educationQualifications);
        setFeeArrangement(res.advocate.feeArrangement);
        setTurnaroundCommitment(res.advocate.turnaroundCommitment);
        setHoursInput(res.advocate.availabilityHours);
        setBioInput(res.advocate.bio);
        if (res.assignedCases[0]) {
          setSelectedCaseId(res.assignedCases[0].id);
          setNextStage(res.assignedCases[0].status);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPortal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleAvailability = async () => {
    if (!data) return;
    const nextAvail = !data.advocate.available;
    await apiFetch(`/api/advocate-portal/${data.advocate.id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ available: nextAvail, availabilityHours: hoursInput }),
    });
    setData({
      ...data,
      advocate: { ...data.advocate, available: nextAvail, availabilityHours: hoursInput },
    });
    setFeedback(`Intake availability updated to ${nextAvail ? 'Open for new cases' : 'At capacity'}.`);
  };

  const saveProfileDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    const res = await apiFetch<{ advocate: Advocate; message: string }>(
      `/api/advocate-portal/${data.advocate.id}/profile`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          primaryPracticeArea,
          coreStrengths: coreStrengthsText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          courtsOfPractice: courtsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          educationQualifications,
          feeArrangement,
          turnaroundCommitment,
          availabilityHours: hoursInput,
          bio: bioInput,
        }),
      }
    );
    setData({ ...data, advocate: res.advocate });
    setEditingDossier(false);
    setFeedback(res.message);
  };

  const submitCaseNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !noteText.trim()) return;
    await apiFetch('/api/advocate-portal/case-note', {
      method: 'POST',
      body: JSON.stringify({
        reportId: selectedCaseId,
        authorName: data.advocate.name,
        note: noteText.trim(),
        nextStatus: nextStage,
      }),
    });
    setNoteText('');
    setFeedback('Legal case note and stage update recorded on the file.');
    loadPortal();
  };

  return (
    <div className="section-stack">
      <section className="stack-16">
        <span className="overline">Verified legal & paralegal workspace</span>
        <h1>{t.advocatePortal}</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '740px' }}>
          Manage your public practice strengths, toggle availability, log legal case notes, and respond to citizen consultation requests.
        </p>
      </section>

      {feedback && (
        <div className="card-tint row-between" role="status" aria-live="polite">
          <strong style={{ fontSize: 'var(--text-14)' }}>{feedback}</strong>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFeedback(null)}>
            Dismiss
          </button>
        </div>
      )}

      {loading || !data ? (
        <div className="skeleton">
          <div className="skeleton-line" style={{ width: '45%' }} />
          <div className="skeleton-line" style={{ width: '80%' }} />
        </div>
      ) : (
        <>
          {/* Advocate Dossier & Availability Toggle */}
          <section className="card stack-20" aria-labelledby="adv-profile-heading">
            <div className="row-between">
              <div className="row-wrap" style={{ gap: 'var(--sp-16)' }}>
                {(data.advocate.photo.startsWith('/') || data.advocate.photo.startsWith('http')) && (
                  <img
                    src={data.advocate.photo}
                    alt={`Portrait of ${data.advocate.name}`}
                    className="avatar-portrait-lg"
                  />
                )}
                <div className="stack-8" style={{ gap: 'var(--sp-4)' }}>
                  <div className="row-wrap">
                    <span className="badge badge-primary">
                      <Scale size={13} aria-hidden="true" />
                      <span>{data.advocate.primaryPracticeArea}</span>
                    </span>
                    {data.advocate.verified && (
                      <span className="badge badge-success">
                        <ShieldCheck size={13} aria-hidden="true" />
                        <span>Verified Bar / Paralegal Roll</span>
                      </span>
                    )}
                  </div>
                  <h2 id="adv-profile-heading">{data.advocate.name}</h2>
                  <span className="field-hint">
                    {data.advocate.organisation} • {data.advocate.barNumber || 'Trained Advocate'}
                  </span>
                </div>
              </div>

              <div className="row-wrap">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEditingDossier((v) => !v)}
                >
                  {editingDossier ? 'Cancel edit' : 'Edit public dossier'}
                </button>
                <button
                  type="button"
                  className={data.advocate.available ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                  onClick={toggleAvailability}
                  aria-pressed={data.advocate.available}
                >
                  {data.advocate.available ? (
                    <>
                      <CheckCircle2 size={16} aria-hidden="true" />
                      <span>Available for intake</span>
                    </>
                  ) : (
                    <>
                      <Clock size={16} aria-hidden="true" />
                      <span>At capacity</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {editingDossier ? (
              <form onSubmit={saveProfileDossier} className="card-subtle stack-16">
                <h3>Update tailored public profile</h3>
                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="edit-practice" className="field-label">
                      Primary legal discipline
                    </label>
                    <input
                      id="edit-practice"
                      className="input"
                      value={primaryPracticeArea}
                      onChange={(e) => setPrimaryPracticeArea(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="edit-edu" className="field-label">
                      Qualifications
                    </label>
                    <input
                      id="edit-edu"
                      className="input"
                      value={educationQualifications}
                      onChange={(e) => setEducationQualifications(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="edit-strengths" className="field-label">
                    Core strengths (one per line)
                  </label>
                  <textarea
                    id="edit-strengths"
                    className="textarea"
                    value={coreStrengthsText}
                    onChange={(e) => setCoreStrengthsText(e.target.value)}
                  />
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="edit-courts" className="field-label">
                      Courts of practice (comma-separated)
                    </label>
                    <input
                      id="edit-courts"
                      className="input"
                      value={courtsText}
                      onChange={(e) => setCourtsText(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="edit-fee" className="field-label">
                      Fee / pro bono terms
                    </label>
                    <input
                      id="edit-fee"
                      className="input"
                      value={feeArrangement}
                      onChange={(e) => setFeeArrangement(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="edit-turnaround" className="field-label">
                      Turnaround commitment
                    </label>
                    <input
                      id="edit-turnaround"
                      className="input"
                      value={turnaroundCommitment}
                      onChange={(e) => setTurnaroundCommitment(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="edit-hours" className="field-label">
                      Availability hours
                    </label>
                    <input
                      id="edit-hours"
                      className="input"
                      value={hoursInput}
                      onChange={(e) => setHoursInput(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="edit-bio" className="field-label">
                    Public bio
                  </label>
                  <textarea
                    id="edit-bio"
                    className="textarea"
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                  />
                </div>

                <div>
                  <button type="submit" className="btn btn-primary">
                    Save public legal profile
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid-2">
                <div className="card-subtle stack-8">
                  <span className="overline">Core strengths displayed to citizens</span>
                  <ul style={{ margin: 0, paddingLeft: 'var(--sp-20)', fontSize: 'var(--text-13)' }}>
                    {data.advocate.coreStrengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="card-subtle stack-8">
                  <span className="overline">Courts, fees & response window</span>
                  <p style={{ fontSize: 'var(--text-13)' }}>{data.advocate.courtsOfPractice.join(' • ')}</p>
                  <p style={{ fontSize: 'var(--text-13)', fontWeight: 600 }}>{data.advocate.feeArrangement}</p>
                  <span className="field-hint">{data.advocate.turnaroundCommitment}</span>
                </div>
              </div>
            )}
          </section>

          {/* Assigned Cases & Case Notes Form */}
          <div className="grid-2">
            <section className="card stack-16" aria-labelledby="assigned-cases-heading">
              <h2 id="assigned-cases-heading">Assigned cases ({data.assignedCases.length})</h2>
              {data.assignedCases.length === 0 ? (
                <p className="field-hint">No cases assigned yet.</p>
              ) : (
                data.assignedCases.map((c) => (
                  <div key={c.caseReference} className="card-subtle stack-8">
                    <div className="row-between">
                      <span className="mono badge">{c.caseReference}</span>
                      <span className="badge badge-primary">
                        Stage: {c.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <strong>{c.title}</strong>
                    <p className="field-hint">
                      {c.lga}, {c.state} • Urgency {c.urgency}/5
                    </p>
                    <div>
                      <Link to={`/cases/${c.caseReference}`} className="btn btn-secondary btn-sm">
                        <span>Open full file</span>
                        <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </section>

            <section className="card stack-16" aria-labelledby="add-case-note-heading">
              <div className="row-wrap">
                <FileText size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                <h2 id="add-case-note-heading">Record legal note & update stage</h2>
              </div>

              <form onSubmit={submitCaseNote} className="stack-16">
                <div className="field">
                  <label htmlFor="note-case-select" className="field-label">
                    Assigned case
                  </label>
                  <select
                    id="note-case-select"
                    className="select"
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(Number(e.target.value))}
                  >
                    {data.assignedCases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.caseReference} — {c.title.slice(0, 42)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="note-stage-select" className="field-label">
                    Transition 11-stage status
                  </label>
                  <select
                    id="note-stage-select"
                    className="select"
                    value={nextStage}
                    onChange={(e) => setNextStage(e.target.value)}
                  >
                    {CASE_STAGES.map((st) => (
                      <option key={st.key} value={st.key}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="advocate-note-body" className="field-label">
                    Case note
                  </label>
                  <textarea
                    id="advocate-note-body"
                    className="textarea"
                    placeholder="Example: Served administrative bail letter on Divisional Crime Officer; awaiting response within 24 hours."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={data.assignedCases.length === 0}>
                  Save case note
                </button>
              </form>
            </section>
          </div>

          {/* Incoming Consultation Requests */}
          <section className="card stack-16" aria-labelledby="consult-queue-heading">
            <h2 id="consult-queue-heading">Consultation requests ({data.consultations.length})</h2>
            {data.consultations.length === 0 ? (
              <p className="field-hint">No new consultation requests waiting right now.</p>
            ) : (
              <div className="grid-2">
                {data.consultations.map((req) => (
                  <div key={req.id} className="card-subtle stack-8">
                    <div className="row-between">
                      <strong>{req.requester_name}</strong>
                      <span className="badge badge-info">{req.status}</span>
                    </div>
                    <p style={{ fontSize: 'var(--text-14)' }}>{req.summary}</p>
                    <span className="mono" style={{ fontSize: 'var(--text-12)', color: 'var(--text-secondary)' }}>
                      Contact: {req.contact_value} {req.report_reference ? `• Ref: ${req.report_reference}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
