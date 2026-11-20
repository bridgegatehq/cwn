import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, FilePlus2, LogIn, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ActivityItem {
  id: number;
  category: 'report' | 'petition' | 'campaign' | 'community' | 'consultation';
  title: string;
  detail: string;
  link: string;
  created_at: string;
}

export function TimelinePage() {
  const { t, user, apiFetch } = useApp();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<{ activities: ActivityItem[] }>('/api/my-civic-summary')
      .then((res) => setActivities(res.activities))
      .finally(() => setLoading(false));
  }, [apiFetch, user]);

  const categories = [
    { id: 'all', label: t.allActivity },
    { id: 'report', label: 'Reports' },
    { id: 'petition', label: 'Petitions' },
    { id: 'campaign', label: 'Campaigns' },
    { id: 'community', label: 'Community' },
    { id: 'consultation', label: 'Consultations' },
  ];

  const visible = filter === 'all' ? activities : activities.filter((a) => a.category === filter);

  return (
    <div className="section-stack">
      <section className="stack-16">
        <span className="overline">{t.personalLog}</span>
        <h1>{t.myTimeline}</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '720px' }}>{t.timelineIntro}</p>
      </section>

      <div className="chip-row" role="group" aria-label="Filter timeline by category">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip ${filter === c.id ? 'active' : ''}`}
            aria-pressed={filter === c.id}
            onClick={() => setFilter(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="stack-16">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton">
              <div className="skeleton-line" style={{ width: '30%' }} />
              <div className="skeleton-line" style={{ width: '75%' }} />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <section className="card stack-16">
          <div className="row-wrap">
            <Clock size={22} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <h2 style={{ fontSize: 'var(--text-22)' }}>
              {user ? t.noActivity : t.signInToSave}
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '620px' }}>
            {user
              ? 'When you file a report, sign a peaceful petition, or request a lawyer, each step appears here in reverse chronological order.'
              : 'You can browse public cases and file reports without an account. Signing in links your reports, signatures, and advocate updates to your personal timeline.'}
          </p>
          <div className="row-wrap">
            {!user && (
              <Link to="/auth" className="btn btn-primary">
                <LogIn size={18} aria-hidden="true" />
                <span>Sign in or try sample citizen account</span>
              </Link>
            )}
            <Link to="/report" className="btn btn-secondary">
              <FilePlus2 size={18} aria-hidden="true" />
              <span>File an incident report</span>
            </Link>
          </div>
        </section>
      ) : (
        <ol className="timeline-list">
          {visible.map((item) => (
            <li key={item.id} className="timeline-step completed">
              <div className="timeline-connector" aria-hidden="true" />
              <div className="timeline-marker" aria-hidden="true">
                <Clock size={16} />
              </div>
              <div className="card stack-12">
                <div className="row-between">
                  <span className="badge badge-primary">{item.category}</span>
                  <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(item.created_at).toLocaleString('en-NG')}
                  </span>
                </div>
                <h3 style={{ fontSize: 'var(--text-16)' }}>{item.title}</h3>
                <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{item.detail}</p>
                <div>
                  <Link to={item.link} className="btn btn-secondary btn-sm">
                    <span>Open record</span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
