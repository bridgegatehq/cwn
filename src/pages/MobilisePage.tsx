import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Megaphone,
  Search,
  Users,
  Calendar,
  HandHeart,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NIGERIA_STATES } from '../data/nigeriaData';
import { VoiceMicButton } from '../components/VoiceMicButton';
import { ListenButton } from '../components/ListenButton';
import { ConsentDialog } from '../components/ConsentDialog';
import { CivicProgressGraphic } from '../components/CivicGraphics';

interface PetitionItem {
  id: number;
  title: string;
  summary: string;
  description: string;
  category: string;
  targetSignatures: number;
  currentSignatures: number;
  deadline: string;
  hashtag: string;
  relatedReportRef?: string | null;
  isSample: boolean;
}

interface CampaignItem {
  id: number;
  title: string;
  summary: string;
  state: string;
  category: string;
  participants_count: number;
  organizer_type: string;
}

interface TownHallItem {
  id: number;
  title: string;
  summary: string;
  event_date: string;
  state: string;
  lga: string;
  format: string;
  rsvp_count: number;
}

interface VolunteerRole {
  id: number;
  title: string;
  commitment: string;
  skills: string;
  scope: string;
  description: string;
}

export function MobilisePage() {
  const { t, user, detectedArea, apiFetch } = useApp();
  const [petitions, setPetitions] = useState<PetitionItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [townHalls, setTownHalls] = useState<TownHallItem[]>([]);
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [loading, setLoading] = useState(true);

  const [petitionSearch, setPetitionSearch] = useState('');
  const [signingPetition, setSigningPetition] = useState<PetitionItem | null>(null);
  const [signerName, setSignerName] = useState(user?.fullName || '');
  const [signerState, setSignerState] = useState(detectedArea.state);
  const [signerLga, setSignerLga] = useState(detectedArea.lga);
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  // Volunteer Form State
  const [selectedRoleId, setSelectedRoleId] = useState<number>(1);
  const [volName, setVolName] = useState(user?.fullName || '');
  const [volEmail, setVolEmail] = useState(user?.email || '');
  const [volState, setVolState] = useState(detectedArea.state);
  const [volLangs, setVolLangs] = useState('English, Nigerian Pidgin');
  const [volMotivation, setVolMotivation] = useState('');
  const [volError, setVolError] = useState<string | null>(null);
  const [volSuccess, setVolSuccess] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    apiFetch<{
      petitions: PetitionItem[];
      campaigns: CampaignItem[];
      townHalls: TownHallItem[];
      volunteerRoles: VolunteerRole[];
    }>('/api/mobilise')
      .then((res) => {
        setPetitions(res.petitions);
        setCampaigns(res.campaigns);
        setTownHalls(res.townHalls);
        setRoles(res.volunteerRoles);
        if (res.volunteerRoles[0]) setSelectedRoleId(res.volunteerRoles[0].id);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPetitions = petitions.filter((p) => {
    if (!petitionSearch.trim()) return true;
    const q = petitionSearch.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.hashtag.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  const confirmSignPetition = async () => {
    if (!signingPetition) return;
    const finalName = signerName.trim() || user?.fullName || 'Verified Citizen Signer';
    const res = await apiFetch<{ petition: PetitionItem }>(`/api/petitions/${signingPetition.id}/sign`, {
      method: 'POST',
      body: JSON.stringify({
        signerName: finalName,
        state: signerState,
        lga: signerLga,
        consentConfirmed: true,
      }),
    });
    setPetitions((prev) => prev.map((p) => (p.id === res.petition.id ? res.petition : p)));
    setSigningPetition(null);
    setActionBanner(`Your signature was recorded on "${res.petition.title}".`);
  };

  const joinCampaign = async (c: CampaignItem) => {
    await apiFetch(`/api/campaigns/${c.id}/join`, {
      method: 'POST',
      body: JSON.stringify({ memberName: user?.fullName || 'Citizen Volunteer' }),
    });
    setCampaigns((prev) =>
      prev.map((item) =>
        item.id === c.id ? { ...item, participants_count: item.participants_count + 1 } : item
      )
    );
    setActionBanner(`Joined peaceful campaign: ${c.title}`);
  };

  const rsvpTownHall = async (th: TownHallItem) => {
    await apiFetch(`/api/town-halls/${th.id}/rsvp`, {
      method: 'POST',
      body: JSON.stringify({ attendeeName: user?.fullName || 'Citizen Attendee' }),
    });
    setTownHalls((prev) =>
      prev.map((item) => (item.id === th.id ? { ...item, rsvp_count: item.rsvp_count + 1 } : item))
    );
    setActionBanner(`RSVP confirmed for "${th.title}".`);
  };

  const submitVolunteerForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setVolError(null);
    setVolSuccess(null);
    if (!volName.trim() || !volEmail.trim() || volMotivation.trim().length < 12) {
      setVolError('Enter your name, email address, and a short note explaining how you would like to help.');
      return;
    }
    try {
      const res = await apiFetch<{ message: string }>('/api/volunteers/apply', {
        method: 'POST',
        body: JSON.stringify({
          roleId: selectedRoleId,
          applicantName: volName.trim(),
          email: volEmail.trim(),
          state: volState,
          languages: volLangs,
          motivation: volMotivation.trim(),
        }),
      });
      setVolSuccess(res.message);
      setVolMotivation('');
    } catch (err) {
      setVolError(err instanceof Error ? err.message : 'Could not submit volunteer form.');
    }
  };

  const stateEntry = NIGERIA_STATES.find((s) => s.name === signerState) || NIGERIA_STATES[24];

  return (
    <div className="section-stack">
      <section className="media-card" aria-labelledby="mobilise-hero-heading">
        <div className="media-frame" style={{ maxHeight: 210 }}>
          <img
            src="/images/hero-civic-townhall.jpg"
            alt="Nigerian community elders, citizens, and legal practitioners in a peaceful civic hall dialogue"
          />
        </div>

        <div className="media-card-body stack-12">
          <span className="overline">Constructive citizen participation</span>
          <h1 id="mobilise-hero-heading">{t.mobilise}</h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '760px' }}>
            Sign legislative petitions, join local civic literacy drives, RSVP to community town halls, or volunteer skills.
          </p>
        </div>
      </section>

      {actionBanner && (
        <div className="card-tint row-between" role="status" aria-live="polite">
          <div className="row-wrap">
            <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <strong style={{ fontSize: 'var(--text-14)' }}>{actionBanner}</strong>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setActionBanner(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* 1. PETITIONS SECTION (with voice search) */}
      <section className="stack-20" aria-labelledby="petitions-section-heading">
        <div className="row-between">
          <div className="row-wrap">
            <Megaphone size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <h2 id="petitions-section-heading">Public accountability petitions</h2>
          </div>
        </div>

        <div className="card stack-12">
          <label htmlFor="petition-search-input" className="field-label">
            Search petitions by topic, state, or hashtag
          </label>
          <div className="input-with-voice">
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={18}
                aria-hidden="true"
                style={{ position: 'absolute', left: 14, top: 15, color: 'var(--text-secondary)' }}
              />
              <input
                id="petition-search-input"
                type="search"
                className="input"
                style={{ paddingLeft: 42 }}
                placeholder="Search detention audits, clinic water, FOI..."
                value={petitionSearch}
                onChange={(e) => setPetitionSearch(e.target.value)}
              />
            </div>
            <VoiceMicButton
              fieldLabel="Petition search"
              onTranscript={(spoken) => setPetitionSearch(spoken)}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid-2">
            {[1, 2].map((n) => (
              <div key={n} className="skeleton">
                <div className="skeleton-line" style={{ width: '40%' }} />
                <div className="skeleton-line" style={{ width: '90%' }} />
                <div className="skeleton-line" style={{ width: '70%' }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid-2">
            {filteredPetitions.map((p) => {
              const pct = Math.min(100, Math.round((p.currentSignatures / p.targetSignatures) * 100));
              return (
                <article key={p.id} className="media-card">
                  <div className="graphic-header-band">
                    <span className="badge badge-primary">{p.category}</span>
                    <span className="mono badge">{p.hashtag}</span>
                  </div>

                  <div className="media-card-body">
                    <div className="row-between" style={{ alignItems: 'flex-start', gap: 'var(--sp-16)' }}>
                      <div className="stack-8" style={{ flex: 1 }}>
                        <h3>{p.title}</h3>
                        <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>
                          {p.summary}
                        </p>
                      </div>
                      <CivicProgressGraphic percent={pct} label={`Progress for ${p.title}`} />
                    </div>

                    <div className="stack-8">
                      <div className="row-between" style={{ fontSize: 'var(--text-13)' }}>
                        <strong>{p.currentSignatures.toLocaleString()} signatures</strong>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          Goal: {p.targetSignatures.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div
                        className="progress-track"
                        role="progressbar"
                        aria-valuenow={p.currentSignatures}
                        aria-valuemin={0}
                        aria-valuemax={p.targetSignatures}
                        aria-label={`Signature progress for ${p.title}`}
                      >
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="row-wrap" style={{ marginTop: 'auto', paddingTop: 'var(--sp-8)' }}>
                      <ListenButton text={`${p.title}. ${p.description}`} label={p.title} />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setSigningPetition(p)}
                      >
                        Sign petition
                      </button>
                      <Link to={`/petitions/${p.id}`} className="btn btn-secondary btn-sm">
                        <span>Open 6-tab detail</span>
                        <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. CAMPAIGNS SECTION */}
      <section className="stack-20" aria-labelledby="campaigns-heading">
        <div className="row-wrap">
          <Users size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
          <h2 id="campaigns-heading">Peaceful citizen campaigns</h2>
        </div>

        <div className="grid-3">
          {campaigns.map((c) => (
            <article key={c.id} className="card stack-16">
              <div className="row-between">
                <span className="badge">{c.state}</span>
                <span className="badge badge-info">{c.category}</span>
              </div>
              <h3 style={{ fontSize: 'var(--text-16)' }}>{c.title}</h3>
              <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{c.summary}</p>
              <div className="row-between" style={{ marginTop: 'auto', paddingTop: 'var(--sp-8)' }}>
                <span className="field-hint">{c.participants_count} participants</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => joinCampaign(c)}>
                  Join campaign
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 3. TOWN HALLS SECTION */}
      <section className="stack-20" aria-labelledby="townhalls-heading">
        <div className="row-wrap">
          <Calendar size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
          <h2 id="townhalls-heading">Community town halls & FOI clinics</h2>
        </div>

        <div className="grid-2">
          {townHalls.map((th) => (
            <article key={th.id} className="card stack-16">
              <div className="row-between">
                <span className="badge badge-primary">{th.format}</span>
                <span className="mono badge">{th.event_date}</span>
              </div>
              <h3>{th.title}</h3>
              <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{th.summary}</p>
              <div className="row-between">
                <span className="field-hint">
                  {th.lga}, {th.state} • {th.rsvp_count} RSVPs
                </span>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => rsvpTownHall(th)}>
                  RSVP to attend
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 4. VOLUNTEER ROLES & APPLICATION FORM */}
      <section className="card stack-24" aria-labelledby="volunteer-heading">
        <div className="stack-8">
          <div className="row-wrap">
            <HandHeart size={22} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <h2 id="volunteer-heading">Volunteer roles & application</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-14)' }}>
            Contribute translation, community paralegal monitoring, or pro bono legal intake review.
          </p>
        </div>

        <div className="grid-3">
          {roles.map((r) => (
            <div
              key={r.id}
              className="card-subtle stack-8"
              style={{
                borderColor: selectedRoleId === r.id ? 'var(--primary)' : 'var(--border)',
              }}
            >
              <span className="badge">{r.commitment}</span>
              <strong style={{ fontSize: 'var(--text-16)' }}>{r.title}</strong>
              <p className="field-hint">{r.description}</p>
              <button
                type="button"
                className={selectedRoleId === r.id ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                onClick={() => setSelectedRoleId(r.id)}
              >
                {selectedRoleId === r.id ? 'Selected below' : 'Apply for this role'}
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={submitVolunteerForm} className="card-subtle stack-16" noValidate>
          <h3>Submit volunteer application</h3>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="vol-role" className="field-label">
                Selected role
              </label>
              <select
                id="vol-role"
                className="select"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(Number(e.target.value))}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="vol-name" className="field-label">
                Full name
              </label>
              <input
                id="vol-name"
                className="input"
                value={volName}
                onChange={(e) => setVolName(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="vol-email" className="field-label">
                Email address
              </label>
              <input
                id="vol-email"
                type="email"
                className="input"
                value={volEmail}
                onChange={(e) => setVolEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="vol-state" className="field-label">
                State
              </label>
              <select
                id="vol-state"
                className="select"
                value={volState}
                onChange={(e) => setVolState(e.target.value)}
              >
                {NIGERIA_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="vol-langs" className="field-label">
              Languages spoken
            </label>
            <input
              id="vol-langs"
              className="input"
              value={volLangs}
              onChange={(e) => setVolLangs(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="vol-motivation" className="field-label">
              Relevant experience & availability
            </label>
            <textarea
              id="vol-motivation"
              className="textarea"
              placeholder="Tell us briefly about your background and commitment to non-partisan civic work."
              value={volMotivation}
              onChange={(e) => setVolMotivation(e.target.value)}
            />
          </div>

          {volError && (
            <p className="field-error" role="alert">
              {volError}
            </p>
          )}
          {volSuccess && (
            <p role="status" aria-live="polite" style={{ color: 'var(--success)', fontWeight: 600 }}>
              {volSuccess}
            </p>
          )}

          <div>
            <button type="submit" className="btn btn-primary">
              Save volunteer application
            </button>
          </div>
        </form>
      </section>

      {/* Sign Petition Modal + Non-partisan Consent */}
      {signingPetition && (
        <div className="backdrop" role="dialog" aria-modal="true" aria-labelledby="quick-sign-heading">
          <div className="modal-panel">
            <h2 id="quick-sign-heading" style={{ fontSize: 'var(--text-22)' }}>
              Signer details before consent
            </h2>
            <div className="field">
              <label htmlFor="quick-signer-name" className="field-label">
                Your full name
              </label>
              <input
                id="quick-signer-name"
                className="input"
                placeholder="Enter your name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="quick-signer-state" className="field-label">
                  State
                </label>
                <select
                  id="quick-signer-state"
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
                <label htmlFor="quick-signer-lga" className="field-label">
                  LGA
                </label>
                <select
                  id="quick-signer-lga"
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
            <ConsentDialog
              open={true}
              title={`Sign "${signingPetition.title}"`}
              whatHappens={`Your name (${signerName || 'Citizen Signer'}), state (${signerState}), and LGA (${signerLga}) will be added to the non-partisan legislative petition roll.`}
              confirmationText="I confirm I am signing peacefully as an individual citizen, without partisan endorsement."
              confirmButtonLabel="Confirm and add signature"
              onConfirm={confirmSignPetition}
              onCancel={() => setSigningPetition(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
