import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ArrowRight, Smartphone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BroadcastAlertBanner, type BroadcastAlertItem } from '../components/BroadcastAlertBanner';
import { PushNotificationCard } from '../components/PushNotificationCard';

interface NotificationItem {
  id: number;
  category: 'case' | 'petition' | 'alert' | 'community' | 'system';
  title: string;
  body: string;
  deep_link: string;
  is_read: number;
  created_at: string;
}

export function NotificationsPage() {
  const { t, apiFetch, refreshUnreadCount, openAppGate } = useApp();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [alerts, setAlerts] = useState<BroadcastAlertItem[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const loadNotifications = () => {
    setLoading(true);
    apiFetch<{ notifications: NotificationItem[]; alerts: BroadcastAlertItem[] }>('/api/notifications')
      .then((res) => {
        setNotifications(res.notifications);
        setAlerts(res.alerts);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markOneRead = async (id: number) => {
    await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH', body: '{}' });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    void refreshUnreadCount();
  };

  const markAllRead = async () => {
    await apiFetch('/api/notifications/read-all', { method: 'POST', body: '{}' });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    void refreshUnreadCount();
  };

  const visible = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'all') return true;
    return n.category === filter;
  });

  return (
    <div className="section-stack">
      <section className="row-between">
        <div className="stack-8">
          <span className="overline">{t.caseUpdates}</span>
          <h1>{t.notifications}</h1>
        </div>
        <div className="row-wrap">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => openAppGate('push_alerts')}>
            <Smartphone size={16} aria-hidden="true" />
            <span>Lock-screen push (App)</span>
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={markAllRead}>
            <CheckCheck size={16} aria-hidden="true" />
            <span>{t.markAllRead}</span>
          </button>
        </div>
      </section>

      {alerts.length > 0 && <BroadcastAlertBanner alerts={alerts} />}

      <PushNotificationCard />

      <div className="chip-row" role="group" aria-label="Filter notifications">
        {[
          { id: 'all', label: t.all },
          { id: 'unread', label: t.unreadOnly },
          { id: 'case', label: 'Cases' },
          { id: 'alert', label: 'Safety alerts' },
          { id: 'petition', label: 'Petitions' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            className={`chip ${filter === f.id ? 'active' : ''}`}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="stack-12">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton">
              <div className="skeleton-line" style={{ width: '40%' }} />
              <div className="skeleton-line" style={{ width: '80%' }} />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="card stack-12">
          <div className="row-wrap">
            <Bell size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <h3>{t.noNotifications}</h3>
          </div>
          <p className="field-hint">Updates on your reports, petitions, and civic alerts will appear here.</p>
        </div>
      ) : (
        <div className="stack-12">
          {visible.map((item) => (
            <article
              key={item.id}
              className="card stack-12"
              style={{
                borderLeft: item.is_read ? '1px solid var(--border)' : '5px solid var(--primary)',
              }}
            >
              <div className="row-between">
                <div className="row-wrap">
                  <span className={item.is_read ? 'badge' : 'badge badge-primary'}>
                    {item.is_read ? 'Read' : 'Unread'} • {item.category}
                  </span>
                  <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(item.created_at).toLocaleString('en-NG')}
                  </span>
                </div>
                {!item.is_read && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => markOneRead(item.id)}
                  >
                    Mark read
                  </button>
                )}
              </div>

              <h3 style={{ fontSize: 'var(--text-16)' }}>{item.title}</h3>
              <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{item.body}</p>

              <div>
                <Link
                  to={item.deep_link}
                  onClick={() => {
                    if (!item.is_read) void markOneRead(item.id);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <span>{t.openRecord}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
