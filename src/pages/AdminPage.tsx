import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Info,
  BellRing,
  Flag,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CASE_STAGES, NIGERIA_STATES } from '../data/nigeriaData';

interface AdminOverview {
  metrics: {
    totalReports: number;
    pendingReview: number;
    verifiedAdvocates: number;
    flaggedPosts: number;
    activeAlerts: number;
  };
  reports: Array<{
    id: number;
    caseReference: string;
    title: string;
    state: string;
    lga: string;
    urgency: number;
    status: string;
    assignedLawyerName?: string | null;
  }>;
  advocates: Array<{
    id: number;
    name: string;
    organisation: string;
    state: string;
    verified: number;
    available: number;
  }>;
  petitions: Array<{
    id: number;
    title: string;
    currentSignatures: number;
    targetSignatures: number;
    status: string;
  }>;
  flaggedPosts: Array<{
    id: number;
    author_name: string;
    content: string;
    state: string;
    created_at: string;
  }>;
  alerts: Array<{
    id: number;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'urgent';
    scope: 'national' | 'state' | 'lga';
    target_state?: string | null;
    target_lga?: string | null;
    active: number;
  }>;
  settings: Record<string, string>;
}

type AdminTab = 'triage' | 'advocates' | 'petitions' | 'moderation' | 'broadcasts' | 'settings';

export function AdminPage() {
  const { t, apiFetch, refreshUnreadCount } = useApp();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>('triage');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Broadcast Alert Composer State
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<'info' | 'warning' | 'urgent'>('info');
  const [alertScope, setAlertScope] = useState<'national' | 'state' | 'lga'>('national');
  const [alertState, setAlertState] = useState('Lagos');
  const [alertLga, setAlertLga] = useState('Ikeja');
  const [alertErr, setAlertErr] = useState<string | null>(null);

  const loadAdmin = () => {
    setLoading(true);
    apiFetch<AdminOverview>('/api/admin/overview')
      .then((res) => setData(res))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateReportStage = async (id: number, status: string, assignedAdvocateId?: number) => {
    await apiFetch(`/api/admin/reports/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, assignedAdvocateId }),
    });
    setStatusMsg('Report stage updated and logged.');
    loadAdmin();
  };

  const toggleAdvocateVerification = async (id: number, verified: boolean) => {
    await apiFetch(`/api/admin/advocates/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ verified }),
    });
    setStatusMsg('Advocate verification state updated.');
    loadAdmin();
  };

  const updatePetitionStatus = async (id: number, status: string) => {
    await apiFetch(`/api/admin/petitions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setStatusMsg(`Petition marked as ${status}.`);
    loadAdmin();
  };

  const moderatePost = async (id: number, moderationStatus: 'approved' | 'hidden') => {
    await apiFetch(`/api/admin/posts/${id}/moderate`, {
      method: 'PATCH',
      body: JSON.stringify({ moderationStatus }),
    });
    setStatusMsg(`Flagged item ${moderationStatus}.`);
    loadAdmin();
  };

  const publishBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertErr(null);
    if (!alertTitle.trim() || !alertMessage.trim()) {
      setAlertErr('Enter both a clear alert title and plain-language safety or civic message.');
      return;
    }
    await apiFetch('/api/admin/alerts', {
      method: 'POST',
      body: JSON.stringify({
        title: alertTitle.trim(),
        message: alertMessage.trim(),
        severity: alertSeverity,
        scope: alertScope,
        targetState: alertScope !== 'national' ? alertState : null,
        targetLga: alertScope === 'lga' ? alertLga : null,
      }),
    });
    setAlertTitle('');
    setAlertMessage('');
    setStatusMsg('Broadcast alert published to Home and Notifications.');
    void refreshUnreadCount();
    loadAdmin();
  };

  const toggleAlertActive = async (id: number, active: boolean) => {
    await apiFetch(`/api/admin/alerts/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
    loadAdmin();
  };

  const toggleSetting = async (key: string, nextVal: string) => {
    await apiFetch('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ [key]: nextVal }),
    });
    setStatusMsg('Platform setting saved.');
    loadAdmin();
  };

  const stateEntry = NIGERIA_STATES.find((s) => s.name === alertState) || NIGERIA_STATES[24];

  return (
    <div className="section-stack">
      <section className="stack-16">
        <div className="row-wrap">
          <Sliders size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
          <span className="overline">Non-partisan operations & oversight</span>
        </div>
        <h1>{t.adminCentre}</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '760px' }}>
          Triage citizen reports across the 11 stages, verify legal advocates, review flagged community content, manage petitions, and publish scoped broadcast alerts.
        </p>
      </section>

      {statusMsg && (
        <div className="card-tint row-between" role="status" aria-live="polite">
          <div className="row-wrap">
            <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <strong style={{ fontSize: 'var(--text-14)' }}>{statusMsg}</strong>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStatusMsg(null)}>
            Dismiss
          </button>
        </div>
      )}

      {loading || !data ? (
        <div className="grid-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton">
              <div className="skeleton-line" style={{ width: '45%' }} />
              <div className="skeleton-line" style={{ width: '75%', height: 28 }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Overview Metrics */}
          <section className="grid-3" aria-label="Admin overview metrics">
            <div className="card stack-8">
              <span className="overline">Total reports</span>
              <strong style={{ fontSize: 'var(--text-28)' }}>{data.metrics.totalReports}</strong>
              <span className="field-hint">{data.metrics.pendingReview} awaiting initial triage</span>
            </div>
            <div className="card stack-8">
              <span className="overline">Verified advocates</span>
              <strong style={{ fontSize: 'var(--text-28)' }}>{data.metrics.verifiedAdvocates}</strong>
              <span className="field-hint">Bar / paralegal credentials checked</span>
            </div>
            <div className="card stack-8">
              <span className="overline">Moderation & alerts</span>
              <strong style={{ fontSize: 'var(--text-28)' }}>
                {data.metrics.flaggedPosts} flagged • {data.metrics.activeAlerts} active alerts
              </strong>
              <span className="field-hint">Colour-independent severity labels</span>
            </div>
          </section>

          {/* Admin Section Tabs */}
          <section className="card stack-24">
            <div className="tabs-bar" role="tablist" aria-label="Admin centre tools">
              {[
                { id: 'triage', label: 'Report triage' },
                { id: 'broadcasts', label: 'Broadcast alerts' },
                { id: 'advocates', label: 'Advocate verification' },
                { id: 'moderation', label: `Flagged posts (${data.flaggedPosts.length})` },
                { id: 'petitions', label: 'Petitions' },
                { id: 'settings', label: 'Platform settings' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className="tab-btn"
                  onClick={() => setTab(item.id as AdminTab)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* 1. REPORT TRIAGE */}
            {tab === 'triage' && (
              <div role="tabpanel" className="stack-16">
                <h2>Report triage & 11-stage transitions</h2>
                {data.reports.map((r) => (
                  <div key={r.id} className="card-subtle stack-12">
                    <div className="row-between">
                      <div className="row-wrap">
                        <Link to={`/cases/${r.caseReference}`} className="mono badge" style={{ textDecoration: 'none' }}>
                          {r.caseReference}
                        </Link>
                        <span className="badge">Urgency {r.urgency}/5</span>
                        <span className="badge badge-info">
                          {r.lga}, {r.state}
                        </span>
                      </div>
                      <span className="badge badge-primary">
                        Current: {r.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <strong>{r.title}</strong>
                    <div className="grid-2">
                      <div className="field">
                        <label htmlFor={`stage-select-${r.id}`} className="field-label">
                          Transition stage
                        </label>
                        <select
                          id={`stage-select-${r.id}`}
                          className="select"
                          value={r.status}
                          onChange={(e) => updateReportStage(r.id, e.target.value)}
                        >
                          {CASE_STAGES.map((st) => (
                            <option key={st.key} value={st.key}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor={`assign-adv-${r.id}`} className="field-label">
                          Assign verified advocate
                        </label>
                        <select
                          id={`assign-adv-${r.id}`}
                          className="select"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              updateReportStage(r.id, 'lawyer_assigned', Number(e.target.value));
                            }
                          }}
                        >
                          <option value="">
                            {r.assignedLawyerName ? `Assigned: ${r.assignedLawyerName}` : 'Select advocate...'}
                          </option>
                          {data.advocates.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.state})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. BROADCAST ALERTS COMPOSER & LIST */}
            {tab === 'broadcasts' && (
              <div role="tabpanel" className="stack-24">
                <div className="stack-8">
                  <div className="row-wrap">
                    <BellRing size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                    <h2>Compose civic broadcast alert</h2>
                  </div>
                  <p className="field-hint">
                    Active alerts appear immediately as dismissible, colour-independent banners on Home and Notifications.
                  </p>
                </div>

                <form onSubmit={publishBroadcast} className="card-subtle stack-16" noValidate>
                  <div className="grid-3">
                    <div className="field">
                      <label htmlFor="bc-severity" className="field-label">
                        Severity level
                      </label>
                      <select
                        id="bc-severity"
                        className="select"
                        value={alertSeverity}
                        onChange={(e) => setAlertSeverity(e.target.value as 'info' | 'warning' | 'urgent')}
                      >
                        <option value="info">Info — Civic notice</option>
                        <option value="warning">Warning — Heightened caution</option>
                        <option value="urgent">Urgent — Safety alert</option>
                      </select>
                    </div>

                    <div className="field">
                      <label htmlFor="bc-scope" className="field-label">
                        Geographic scope
                      </label>
                      <select
                        id="bc-scope"
                        className="select"
                        value={alertScope}
                        onChange={(e) => setAlertScope(e.target.value as 'national' | 'state' | 'lga')}
                      >
                        <option value="national">National</option>
                        <option value="state">Single State</option>
                        <option value="lga">Specific LGA</option>
                      </select>
                    </div>

                    {alertScope !== 'national' && (
                      <div className="field">
                        <label htmlFor="bc-state" className="field-label">
                          Target State
                        </label>
                        <select
                          id="bc-state"
                          className="select"
                          value={alertState}
                          onChange={(e) => {
                            const st = NIGERIA_STATES.find((s) => s.name === e.target.value) || NIGERIA_STATES[0];
                            setAlertState(st.name);
                            setAlertLga(st.lgas[0]);
                          }}
                        >
                          {NIGERIA_STATES.map((s) => (
                            <option key={s.code} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {alertScope === 'lga' && (
                    <div className="field">
                      <label htmlFor="bc-lga" className="field-label">
                        Target LGA
                      </label>
                      <select
                        id="bc-lga"
                        className="select"
                        value={alertLga}
                        onChange={(e) => setAlertLga(e.target.value)}
                      >
                        {stateEntry.lgas.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="field">
                    <label htmlFor="bc-title" className="field-label">
                      Alert headline
                    </label>
                    <input
                      id="bc-title"
                      className="input"
                      placeholder="Example: Roadway diversion and commuter ID checks in Ikeja"
                      value={alertTitle}
                      onChange={(e) => setAlertTitle(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="bc-msg" className="field-label">
                      Plain-language guidance
                    </label>
                    <textarea
                      id="bc-msg"
                      className="textarea"
                      placeholder="Write calm, verified instructions without sensational language."
                      value={alertMessage}
                      onChange={(e) => setAlertMessage(e.target.value)}
                    />
                  </div>

                  {alertErr && (
                    <p className="field-error" role="alert">
                      {alertErr}
                    </p>
                  )}

                  <div>
                    <button type="submit" className="btn btn-primary">
                      Publish broadcast alert
                    </button>
                  </div>
                </form>

                <div className="stack-12">
                  <h3>Existing broadcast alerts</h3>
                  {data.alerts.map((a) => {
                    const Icon =
                      a.severity === 'urgent' ? ShieldAlert : a.severity === 'warning' ? AlertTriangle : Info;
                    return (
                      <div key={a.id} className="card-subtle row-between">
                        <div className="stack-8" style={{ gap: 'var(--sp-4)', maxWidth: '640px' }}>
                          <div className="row-wrap">
                            <span
                              className={
                                a.severity === 'urgent'
                                  ? 'badge badge-danger'
                                  : a.severity === 'warning'
                                    ? 'badge badge-warning'
                                    : 'badge badge-info'
                              }
                            >
                              <Icon size={13} aria-hidden="true" />
                              <span>{a.severity.toUpperCase()}</span>
                            </span>
                            <span className="badge">
                              {a.scope === 'national' ? 'National' : a.target_state}
                            </span>
                          </div>
                          <strong>{a.title}</strong>
                          <p className="field-hint">{a.message}</p>
                        </div>
                        <button
                          type="button"
                          className={a.active ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
                          onClick={() => toggleAlertActive(a.id, !a.active)}
                        >
                          {a.active ? 'Deactivate' : 'Re-activate'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. ADVOCATE VERIFICATION */}
            {tab === 'advocates' && (
              <div role="tabpanel" className="stack-16">
                <h2>Advocate Bar & paralegal verification</h2>
                {data.advocates.map((adv) => (
                  <div key={adv.id} className="card-subtle row-between">
                    <div>
                      <strong>{adv.name}</strong>
                      <p className="field-hint">
                        {adv.organisation} • {adv.state}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={adv.verified ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
                      onClick={() => toggleAdvocateVerification(adv.id, !adv.verified)}
                    >
                      {adv.verified ? 'Verified (click to revoke)' : 'Verify credentials'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 4. FLAGGED CONTENT MODERATION */}
            {tab === 'moderation' && (
              <div role="tabpanel" className="stack-16">
                <div className="row-wrap">
                  <Flag size={18} style={{ color: 'var(--warning)' }} aria-hidden="true" />
                  <h2>Flagged community posts queue</h2>
                </div>
                {data.flaggedPosts.length === 0 ? (
                  <p className="field-hint">Moderation queue is clear. All flagged items have been reviewed.</p>
                ) : (
                  data.flaggedPosts.map((fp) => (
                    <div key={fp.id} className="card-subtle stack-12">
                      <div className="row-between">
                        <strong>{fp.author_name}</strong>
                        <span className="badge badge-warning">Held for review</span>
                      </div>
                      <p>{fp.content}</p>
                      <div className="row-wrap">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => moderatePost(fp.id, 'approved')}
                        >
                          Approve to feed
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => moderatePost(fp.id, 'hidden')}
                        >
                          Remove unverified claim
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 5. PETITIONS MANAGEMENT */}
            {tab === 'petitions' && (
              <div role="tabpanel" className="stack-16">
                <h2>Petition status management</h2>
                {data.petitions.map((p) => (
                  <div key={p.id} className="card-subtle row-between">
                    <div className="stack-8" style={{ gap: 'var(--sp-4)' }}>
                      <strong>{p.title}</strong>
                      <span className="field-hint">
                        {p.currentSignatures} / {p.targetSignatures} signatures • Status: {p.status}
                      </span>
                    </div>
                    <div className="row-wrap">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          updatePetitionStatus(p.id, p.status === 'active' ? 'delivered_to_committee' : 'active')
                        }
                      >
                        {p.status === 'active' ? 'Mark delivered to committee' : 'Re-open active'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 6. PLATFORM SETTINGS */}
            {tab === 'settings' && (
              <div role="tabpanel" className="stack-16">
                <h2>Platform safety & bandwidth settings</h2>
                <div className="stack-12">
                  <div className="card-subtle row-between">
                    <div>
                      <strong>Anonymous citizen reporting</strong>
                      <p className="field-hint">Allow strict anonymous reports alongside verified contact reports.</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        toggleSetting(
                          'anonymous_reporting_enabled',
                          data.settings.anonymous_reporting_enabled === 'true' ? 'false' : 'true'
                        )
                      }
                    >
                      {data.settings.anonymous_reporting_enabled === 'true' ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  <div className="card-subtle row-between">
                    <div>
                      <strong>Restrained rights assistant</strong>
                      <p className="field-hint">Non-legal constitutional literacy helper behind explicit consent.</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        toggleSetting(
                          'ai_assistant_enabled',
                          data.settings.ai_assistant_enabled === 'true' ? 'false' : 'true'
                        )
                      }
                    >
                      {data.settings.ai_assistant_enabled === 'true' ? 'Enabled' : 'Paused'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
