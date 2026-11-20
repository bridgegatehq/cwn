import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, Megaphone, Users, Share2, LogIn, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface DashboardResponse {
  authenticated: boolean;
  stats: {
    reportsFiled: number;
    petitionsSigned: number;
    campaignsJoined: number;
    amplifiedCount: number;
  };
  standing: string;
  reports: Array<{
    caseReference: string;
    title: string;
    status: string;
    state: string;
    lga: string;
  }>;
}

export function DashboardPage() {
  const { t, user, apiFetch } = useApp();
  const [summary, setSummary] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<DashboardResponse>('/api/my-civic-summary')
      .then((res) => setSummary(res))
      .finally(() => setLoading(false));
  }, [apiFetch, user]);

  return (
    <div className="section-stack">
      <section className="stack-16">
        <span className="overline">Real database counts</span>
        <h1>{t.dashboard}</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '720px' }}>
          Honest personal accountability metrics calculated directly from your reports, petition signatures, joined campaigns, and peaceful shares.
        </p>
      </section>

      {loading || !summary ? (
        <div className="grid-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton">
              <div className="skeleton-line" style={{ width: '40%' }} />
              <div className="skeleton-line" style={{ width: '65%', height: 28 }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <section className="card-tint stack-12" aria-labelledby="standing-heading">
            <div className="row-wrap">
              <ShieldCheck size={22} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <span className="overline" style={{ color: 'var(--primary)' }}>
                Current civic standing
              </span>
            </div>
            <h2 id="standing-heading">{summary.standing}</h2>
            {!summary.authenticated && (
              <div style={{ marginTop: 'var(--sp-4)' }}>
                <Link to="/auth" className="btn btn-primary btn-sm">
                  <LogIn size={16} aria-hidden="true" />
                  <span>Sign in or test with sample citizen account</span>
                </Link>
              </div>
            )}
          </section>

          <section className="grid-2" aria-label="Personal civic counts">
            <div className="card stack-8">
              <div className="row-wrap">
                <FileText size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                <span className="overline">Reports filed</span>
              </div>
              <strong style={{ fontSize: 'var(--text-36)' }}>{summary.stats.reportsFiled}</strong>
              <span className="field-hint">Sealed incident records linked to your account</span>
            </div>

            <div className="card stack-8">
              <div className="row-wrap">
                <Megaphone size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                <span className="overline">Petitions signed</span>
              </div>
              <strong style={{ fontSize: 'var(--text-36)' }}>{summary.stats.petitionsSigned}</strong>
              <span className="field-hint">Non-partisan legislative signatures</span>
            </div>

            <div className="card stack-8">
              <div className="row-wrap">
                <Users size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                <span className="overline">Campaigns joined</span>
              </div>
              <strong style={{ fontSize: 'var(--text-36)' }}>{summary.stats.campaignsJoined}</strong>
              <span className="field-hint">Local literacy & oversight drives</span>
            </div>

            <div className="card stack-8">
              <div className="row-wrap">
                <Share2 size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                <span className="overline">Cases & petitions amplified</span>
              </div>
              <strong style={{ fontSize: 'var(--text-36)' }}>{summary.stats.amplifiedCount}</strong>
              <span className="field-hint">Verified shares and community amplifications</span>
            </div>
          </section>

          <section className="card stack-16" aria-labelledby="my-reports-heading">
            <div className="row-between">
              <h2 id="my-reports-heading">Your filed reports ({summary.reports.length})</h2>
              <Link to="/report" className="btn btn-secondary btn-sm">
                File a report
              </Link>
            </div>

            {summary.reports.length === 0 ? (
              <p className="field-hint">
                No personal reports linked yet. Reports you submit while signed in appear here automatically.
              </p>
            ) : (
              <div className="stack-12">
                {summary.reports.map((r) => (
                  <div key={r.caseReference} className="card-subtle row-between">
                    <div className="stack-8" style={{ gap: 'var(--sp-4)' }}>
                      <span className="mono badge">{r.caseReference}</span>
                      <strong>{r.title}</strong>
                      <span className="field-hint">
                        {r.lga}, {r.state} • Stage: {r.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <Link to={`/cases/${r.caseReference}`} className="btn btn-secondary btn-sm">
                      <span>Track</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
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
