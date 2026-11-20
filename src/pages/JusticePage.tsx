import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Scale,
  CheckCircle2,
  Clock,
  MapPin,
  Star,
  X,
  ShieldCheck,
  Briefcase,
  GraduationCap,
  Landmark,
  FileCheck2,
  UserPlus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NIGERIA_STATES } from '../data/nigeriaData';
import { ListenButton } from '../components/ListenButton';

export interface Advocate {
  id: number;
  name: string;
  photo: string;
  type: 'lawyer' | 'trained_advocate';
  primaryPracticeArea: string;
  coreStrengths: string[];
  yearsExperience: number;
  courtsOfPractice: string[];
  educationQualifications: string;
  feeArrangement: string;
  caseTypesAccepted: string[];
  turnaroundCommitment: string;
  notableRepresentations: string;
  consultationModes: string[];
  specialisations: string[];
  languages: string[];
  state: string;
  lga: string;
  barNumber?: string | null;
  organisation: string;
  verified: boolean;
  available: boolean;
  rating: number;
  casesHandled: number;
  bio: string;
  availabilityHours: string;
  isSample: boolean;
}

interface ReportSummary {
  caseReference: string;
  title: string;
  state: string;
  lga: string;
  status: string;
  urgency: number;
  assignedLawyerName?: string | null;
}

const PRACTICE_PILLARS = [
  { id: '', label: 'All practice strengths' },
  { id: 'Criminal', label: 'Criminal law & detention' },
  { id: 'Civil', label: 'Civil, land & family law' },
  { id: 'Human Rights', label: 'Human rights & liberty' },
  { id: 'Constitutional', label: 'Constitutional & media law' },
  { id: 'Administrative', label: 'Administrative & FOI law' },
  { id: 'Education', label: 'Education & humanitarian' },
];

function AdvocateAvatar({ photo, name, large = false }: { photo: string; name: string; large?: boolean }) {
  const isImageUrl = photo.startsWith('/') || photo.startsWith('http') || photo.startsWith('data:');
  if (isImageUrl) {
    return (
      <img
        src={photo}
        alt={`Portrait of ${name}`}
        className={large ? 'avatar-portrait-lg' : 'avatar-portrait'}
        loading="lazy"
      />
    );
  }
  return (
    <div
      className="avatar-initials"
      style={large ? { width: 80, height: 80, fontSize: 'var(--text-22)' } : undefined}
      aria-hidden="true"
    >
      {photo}
    </div>
  );
}

export function JusticePage() {
  const { t, user, apiFetch } = useApp();
  const [advocates, setAdvocates] = useState<Advocate[]>([]);
  const [activeCases, setActiveCases] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQ, setSearchQ] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [practiceFilter, setPracticeFilter] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [showCasesSection, setShowCasesSection] = useState(false);

  // Profile & Consultation Modal State
  const [selectedAdvocate, setSelectedAdvocate] = useState<Advocate | null>(null);
  const [consultMode, setConsultMode] = useState(false);
  const [requesterName, setRequesterName] = useState(user?.fullName || '');
  const [contactValue, setContactValue] = useState(user?.email || '');
  const [preferredMode, setPreferredMode] = useState('Phone call');
  const [caseRefInput, setCaseRefInput] = useState('');
  const [consultSummary, setConsultSummary] = useState('');
  const [consultError, setConsultError] = useState<string | null>(null);
  const [consultSuccess, setConsultSuccess] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQ.trim()) params.set('q', searchQ.trim());
    if (stateFilter) params.set('state', stateFilter);
    if (practiceFilter) params.set('practiceArea', practiceFilter);
    if (availableOnly) params.set('availableOnly', 'true');

    setLoading(true);
    Promise.all([
      apiFetch<{ advocates: Advocate[] }>(`/api/advocates?${params.toString()}`),
      apiFetch<{ reports: ReportSummary[] }>('/api/reports'),
    ])
      .then(([advRes, repRes]) => {
        setAdvocates(advRes.advocates);
        setActiveCases(repRes.reports.slice(0, 4));
      })
      .finally(() => setLoading(false));
  }, [apiFetch, searchQ, stateFilter, practiceFilter, availableOnly]);

  const openAdvocateProfile = (adv: Advocate, startInConsult = false) => {
    setSelectedAdvocate(adv);
    setConsultMode(startInConsult);
    setConsultSuccess(null);
    setConsultError(null);
    if (adv.consultationModes[0]) {
      setPreferredMode(adv.consultationModes[0]);
    }
  };

  const submitConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdvocate) return;
    setConsultError(null);
    if (!requesterName.trim() || !contactValue.trim() || consultSummary.trim().length < 12) {
      setConsultError(
        'Enter your name, safe phone or email, and at least one clear sentence describing the legal issue.'
      );
      return;
    }
    try {
      const res = await apiFetch<{ message: string }>('/api/consultations', {
        method: 'POST',
        body: JSON.stringify({
          advocateId: selectedAdvocate.id,
          reportReference: caseRefInput.trim() || null,
          requesterName: requesterName.trim(),
          contactMethod: preferredMode,
          contactValue: contactValue.trim(),
          summary: consultSummary.trim(),
        }),
      });
      setConsultSuccess(res.message);
      setConsultSummary('');
    } catch (err) {
      setConsultError(err instanceof Error ? err.message : 'Could not submit request.');
    }
  };

  return (
    <div className="section-stack">
      {/* Editorial Legal Chambers Header Card */}
      <section className="media-card" aria-labelledby="justice-hero-heading">
        <div className="media-frame" style={{ maxHeight: 210 }}>
          <img
            src="/images/pillar-legal-chambers.jpg"
            alt="Nigerian barristers reviewing constitutional law reports and civic case files"
          />
          <span className="media-caption-chip">
            <Scale size={14} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <span>Verified Supreme Court Roll & paralegal directory</span>
          </span>
        </div>

        <div className="media-card-body stack-16">
          <div className="row-between">
            <span className="overline">Tailored legal representatives</span>
            <Link to="/auth?register=advocate" className="btn btn-secondary btn-sm">
              <UserPlus size={16} aria-hidden="true" />
              <span>Register legal profile</span>
            </Link>
          </div>
          <h1 id="justice-hero-heading">{t.legalHelp}</h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '720px' }}>
            Filter verified Nigerian lawyers and trained paralegals by their core legal discipline — Criminal Law, Civil & Property Law, Human Rights, Constitutional Litigation, or FOI Advocacy. Tap any portrait card to inspect their complete registration dossier.
          </p>
        </div>
      </section>

      {/* Mobile-First Swipeable Practice Pills + Search & State Filter */}
      <section className="card stack-20" aria-label="Filter legal representatives">
        <div className="stack-8">
          <span className="field-label">Swipe or tap a core legal strength</span>
          <div className="mobile-snap-row" role="group" aria-label="Filter by legal practice area">
            {PRACTICE_PILLARS.map((pillar) => (
              <button
                key={pillar.label}
                type="button"
                className={`chip ${practiceFilter === pillar.id ? 'active' : ''}`}
                aria-pressed={practiceFilter === pillar.id}
                onClick={() => setPracticeFilter(pillar.id)}
              >
                {pillar.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="adv-search" className="field-label">
              Search name, court, or strength
            </label>
            <div style={{ position: 'relative' }}>
              <Search
                size={18}
                aria-hidden="true"
                style={{ position: 'absolute', left: 14, top: 15, color: 'var(--text-secondary)' }}
              />
              <input
                id="adv-search"
                type="search"
                className="input"
                style={{ paddingLeft: 42 }}
                placeholder="e.g. bail, tenancy, Kano, criminal..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="adv-state" className="field-label">
              State
            </label>
            <select
              id="adv-state"
              className="select"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
            >
              <option value="">All 36 states & FCT</option>
              {NIGERIA_STATES.map((s) => (
                <option key={s.code} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <button
            type="button"
            className={`chip ${availableOnly ? 'active' : ''}`}
            aria-pressed={availableOnly}
            onClick={() => setAvailableOnly((v) => !v)}
          >
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>Open for immediate intake only</span>
          </button>
        </div>
      </section>

      {/* Portrait Legal Representative Cards */}
      <section className="stack-20" aria-labelledby="advocate-directory-heading">
        <h2 id="advocate-directory-heading">Legal representatives ({advocates.length})</h2>

        {loading ? (
          <div className="grid-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="skeleton">
                <div className="skeleton-line" style={{ width: '50%' }} />
                <div className="skeleton-line" style={{ width: '80%' }} />
                <div className="skeleton-line" style={{ width: '60%' }} />
              </div>
            ))}
          </div>
        ) : advocates.length === 0 ? (
          <div className="card stack-16">
            <h3>No representatives match those filters</h3>
            <p className="field-hint">
              Reset the practice area or state filter to view representatives who handle remote intake across Nigeria.
            </p>
            <div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSearchQ('');
                  setStateFilter('');
                  setPracticeFilter('');
                  setAvailableOnly(false);
                }}
              >
                Reset filters
              </button>
            </div>
          </div>
        ) : (
          <div className="grid-2">
            {advocates.map((adv) => (
              <article key={adv.id} className="media-card">
                {/* Tinted Discipline Header Band */}
                <div className="graphic-header-band">
                  <span className="badge badge-primary">
                    <Scale size={13} aria-hidden="true" />
                    <span>{adv.primaryPracticeArea}</span>
                  </span>
                  <span className="badge">{adv.yearsExperience} yrs standing</span>
                </div>

                <div className="media-card-body">
                  {/* Portrait + Name & Chambers */}
                  <div className="row-wrap" style={{ alignItems: 'center', gap: 'var(--sp-16)' }}>
                    <AdvocateAvatar photo={adv.photo} name={adv.name} />
                    <div className="stack-8" style={{ gap: 'var(--sp-4)', flex: 1, minWidth: 180 }}>
                      <h3 style={{ fontSize: 'var(--text-18)' }}>{adv.name}</h3>
                      <span className="field-hint">{adv.organisation}</span>
                      <div className="row-wrap" style={{ gap: 'var(--sp-8)', marginTop: 2 }}>
                        {adv.verified ? (
                          <span className="badge badge-success">
                            <ShieldCheck size={12} aria-hidden="true" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="badge badge-warning">
                            <Clock size={12} aria-hidden="true" />
                            <span>Pending</span>
                          </span>
                        )}
                        {adv.available ? (
                          <span className="badge badge-info">Open now</span>
                        ) : (
                          <span className="badge">At capacity</span>
                        )}
                        <span className="badge">
                          <Star size={12} aria-hidden="true" />
                          <span>{adv.rating.toFixed(1)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Core Strengths List */}
                  <div className="card-subtle stack-8">
                    <span className="overline">Core strengths</span>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: 'var(--sp-20)',
                        fontSize: 'var(--text-13)',
                        color: 'var(--text)',
                      }}
                    >
                      {(adv.coreStrengths.length > 0 ? adv.coreStrengths : adv.specialisations)
                        .slice(0, 3)
                        .map((strength) => (
                          <li key={strength} style={{ marginBottom: 4 }}>
                            {strength}
                          </li>
                        ))}
                    </ul>
                  </div>

                  <div className="stack-12" style={{ marginTop: 'auto' }}>
                    <span className="field-hint">
                      <MapPin
                        size={14}
                        style={{ verticalAlign: 'text-bottom', marginRight: 4 }}
                        aria-hidden="true"
                      />
                      {adv.lga}, {adv.state} • {adv.feeArrangement}
                    </span>

                    <div className="grid-2" style={{ gap: 'var(--sp-12)' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm btn-full"
                        onClick={() => openAdvocateProfile(adv, false)}
                      >
                        View full profile
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm btn-full"
                        onClick={() => openAdvocateProfile(adv, true)}
                      >
                        Request consultation
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Quiet Collapsible Active Cases Reference */}
      <section className="card stack-16" aria-labelledby="active-cases-disclosure">
        <div className="row-between">
          <div>
            <h2 id="active-cases-disclosure" style={{ fontSize: 'var(--text-18)' }}>
              Track an existing public case ({activeCases.length})
            </h2>
            <p className="field-hint">
              Expand only if you want to check the 11-stage timeline on a documented case.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowCasesSection((v) => !v)}
            aria-expanded={showCasesSection}
          >
            {showCasesSection ? 'Hide cases' : 'Show active cases'}
          </button>
        </div>

        {showCasesSection && (
          <div className="grid-2" style={{ paddingTop: 'var(--sp-8)' }}>
            {activeCases.map((c) => (
              <div key={c.caseReference} className="card-subtle stack-8">
                <div className="row-between">
                  <span className="mono badge">{c.caseReference}</span>
                  <span className="badge badge-info">{c.status.replace(/_/g, ' ')}</span>
                </div>
                <strong style={{ fontSize: 'var(--text-14)' }}>{c.title}</strong>
                <span className="field-hint">
                  {c.lga}, {c.state} {c.assignedLawyerName ? `• ${c.assignedLawyerName}` : ''}
                </span>
                <div>
                  <Link to={`/cases/${c.caseReference}`} className="btn btn-secondary btn-sm">
                    Open 11-stage timeline
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Comprehensive Tailored Legal Representative Profile & Consultation Modal */}
      {selectedAdvocate && (
        <div
          className="backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="advocate-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedAdvocate(null);
          }}
        >
          <div className="modal-panel" style={{ maxWidth: '680px' }}>
            <div className="row-between" style={{ alignItems: 'flex-start' }}>
              <div className="row-wrap" style={{ gap: 'var(--sp-16)' }}>
                <AdvocateAvatar photo={selectedAdvocate.photo} name={selectedAdvocate.name} large />
                <div className="stack-8" style={{ gap: 'var(--sp-4)' }}>
                  <span className="badge badge-primary">{selectedAdvocate.primaryPracticeArea}</span>
                  <h2 id="advocate-modal-title" style={{ fontSize: 'var(--text-22)' }}>
                    {consultMode ? `Consult ${selectedAdvocate.name}` : selectedAdvocate.name}
                  </h2>
                  <span className="field-hint">{selectedAdvocate.organisation}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setSelectedAdvocate(null)}
                aria-label="Close profile dialog"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {!consultMode ? (
              <div className="stack-20">
                <div className="row-between">
                  <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                    <span className="badge">
                      {selectedAdvocate.type === 'lawyer' ? 'Legal Practitioner' : 'Trained Civic Paralegal'}
                    </span>
                    {selectedAdvocate.barNumber && (
                      <span className="mono badge">SCN Roll: {selectedAdvocate.barNumber}</span>
                    )}
                    <span className="badge">{selectedAdvocate.yearsExperience} years standing</span>
                  </div>
                  <ListenButton
                    text={`${selectedAdvocate.name}, ${selectedAdvocate.primaryPracticeArea}. ${selectedAdvocate.bio}. Core strengths: ${selectedAdvocate.coreStrengths.join(', ')}. Fee terms: ${selectedAdvocate.feeArrangement}.`}
                    label={`Profile of ${selectedAdvocate.name}`}
                  />
                </div>

                <p style={{ fontSize: 'var(--text-16)', lineHeight: 1.65 }}>{selectedAdvocate.bio}</p>

                <div className="card-tint stack-12">
                  <div className="row-wrap">
                    <Briefcase size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                    <strong>Tailored core strengths & legal focus</strong>
                  </div>
                  <ul className="stack-8" style={{ margin: 0, paddingLeft: 'var(--sp-20)', fontSize: 'var(--text-14)' }}>
                    {(selectedAdvocate.coreStrengths.length > 0
                      ? selectedAdvocate.coreStrengths
                      : selectedAdvocate.specialisations
                    ).map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="grid-2">
                  <div className="card-subtle stack-8">
                    <div className="row-wrap">
                      <Landmark size={16} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                      <span className="overline">Courts & registries of practice</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 'var(--sp-16)', fontSize: 'var(--text-13)' }}>
                      {selectedAdvocate.courtsOfPractice.map((court) => (
                        <li key={court}>{court}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="card-subtle stack-8">
                    <div className="row-wrap">
                      <GraduationCap size={16} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                      <span className="overline">Qualifications & Bar call</span>
                    </div>
                    <p style={{ fontSize: 'var(--text-13)' }}>
                      {selectedAdvocate.educationQualifications || 'Verified Nigerian Legal Qualification'}
                    </p>
                    <span className="field-hint">{selectedAdvocate.organisation}</span>
                  </div>
                </div>

                <div className="card-subtle stack-12">
                  <div className="row-wrap">
                    <FileCheck2 size={16} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                    <span className="overline">Specific briefs accepted & fee terms</span>
                  </div>
                  {selectedAdvocate.caseTypesAccepted.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: 'var(--sp-20)', fontSize: 'var(--text-13)' }}>
                      {selectedAdvocate.caseTypesAccepted.map((ct) => (
                        <li key={ct}>{ct}</li>
                      ))}
                    </ul>
                  )}
                  <p style={{ fontSize: 'var(--text-13)', fontWeight: 600, color: 'var(--primary)' }}>
                    Fee & pro bono structure: {selectedAdvocate.feeArrangement}
                  </p>
                  <p className="field-hint">
                    Response turnaround: {selectedAdvocate.turnaroundCommitment} • Hours:{' '}
                    {selectedAdvocate.availabilityHours}
                  </p>
                </div>

                {selectedAdvocate.notableRepresentations && (
                  <div className="card-subtle stack-8">
                    <span className="overline">Track record & intake notes</span>
                    <p style={{ fontSize: 'var(--text-13)', color: 'var(--text-secondary)' }}>
                      {selectedAdvocate.notableRepresentations}
                    </p>
                  </div>
                )}

                <div className="stack-8">
                  <span className="overline">Languages & consultation channels</span>
                  <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                    {selectedAdvocate.languages.map((langName) => (
                      <span key={langName} className="badge badge-info">
                        {langName}
                      </span>
                    ))}
                    {selectedAdvocate.consultationModes.map((mode) => (
                      <span key={mode} className="badge">
                        {mode}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="row-between hero-actions-mobile" style={{ justifyContent: 'flex-end', paddingTop: 'var(--sp-8)' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedAdvocate(null)}>
                    Close
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => setConsultMode(true)}>
                    Request consultation with {selectedAdvocate.name.split(' ')[0]}
                  </button>
                </div>
              </div>
            ) : consultSuccess ? (
              <div className="stack-16">
                <div className="card-tint stack-8">
                  <strong style={{ color: 'var(--primary)' }}>Consultation request recorded</strong>
                  <p style={{ fontSize: 'var(--text-14)' }}>{consultSuccess}</p>
                </div>
                <button type="button" className="btn btn-primary" onClick={() => setSelectedAdvocate(null)}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submitConsultation} className="stack-16" noValidate>
                <p className="field-hint">
                  Your note goes privately to {selectedAdvocate.name} ({selectedAdvocate.turnaroundCommitment}).
                </p>

                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="consult-name" className="field-label">
                      Your name or safe alias
                    </label>
                    <input
                      id="consult-name"
                      className="input"
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="consult-mode" className="field-label">
                      Preferred consultation channel
                    </label>
                    <select
                      id="consult-mode"
                      className="select"
                      value={preferredMode}
                      onChange={(e) => setPreferredMode(e.target.value)}
                    >
                      {selectedAdvocate.consultationModes.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="consult-contact" className="field-label">
                      Safe phone number or email
                    </label>
                    <input
                      id="consult-contact"
                      className="input"
                      placeholder="+234 ... or email"
                      value={contactValue}
                      onChange={(e) => setContactValue(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="consult-ref" className="field-label">
                      Case reference (optional)
                    </label>
                    <input
                      id="consult-ref"
                      className="input mono"
                      placeholder="CWN-2026-LA-10482"
                      value={caseRefInput}
                      onChange={(e) => setCaseRefInput(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="consult-summary" className="field-label">
                    Brief factual summary of the issue
                  </label>
                  <textarea
                    id="consult-summary"
                    className="textarea"
                    placeholder="State what happened, where, when, and what urgent legal step is needed."
                    value={consultSummary}
                    onChange={(e) => setConsultSummary(e.target.value)}
                  />
                </div>

                {consultError && (
                  <p className="field-error" role="alert">
                    {consultError}
                  </p>
                )}

                <div className="row-between hero-actions-mobile" style={{ justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setConsultMode(false)}>
                    Back to profile
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Send consultation request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
