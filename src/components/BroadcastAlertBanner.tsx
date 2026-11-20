import { useState } from 'react';
import { Info, AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { ListenButton } from './ListenButton';

export interface BroadcastAlertItem {
  id: number;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'urgent';
  scope: 'national' | 'state' | 'lga';
  target_state?: string | null;
  target_lga?: string | null;
  is_sample?: number;
}

export function BroadcastAlertBanner({ alerts }: { alerts: BroadcastAlertItem[] }) {
  const [dismissedIds, setDismissedIds] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cwn_dismissed_alerts') || '[]') as number[];
    } catch {
      return [];
    }
  });

  const visible = alerts.filter((a) => !dismissedIds.includes(a.id));
  if (visible.length === 0) return null;

  const dismiss = (id: number) => {
    const next = [...dismissedIds, id];
    setDismissedIds(next);
    localStorage.setItem('cwn_dismissed_alerts', JSON.stringify(next));
  };

  return (
    <section aria-label="Active civic broadcast alerts" className="stack-12">
      {visible.map((alert) => {
        const isUrgent = alert.severity === 'urgent';
        const isWarning = alert.severity === 'warning';
        const Icon = isUrgent ? ShieldAlert : isWarning ? AlertTriangle : Info;
        const badgeClass = isUrgent ? 'badge badge-danger' : isWarning ? 'badge badge-warning' : 'badge badge-info';
        const severityLabel = isUrgent ? 'Urgent safety alert' : isWarning ? 'Warning notice' : 'Civic information';
        const scopeLabel =
          alert.scope === 'national'
            ? 'National'
            : alert.target_lga
              ? `${alert.target_lga}, ${alert.target_state}`
              : alert.target_state || 'State';

        return (
          <div
            key={alert.id}
            className="card"
            style={{
              borderLeft: `5px solid ${
                isUrgent ? 'var(--danger)' : isWarning ? 'var(--warning-badge)' : 'var(--info)'
              }`,
            }}
          >
            <div className="row-between">
              <div className="row-wrap">
                <span className={badgeClass}>
                  <Icon size={14} aria-hidden="true" />
                  <span>{severityLabel}</span>
                </span>
                <span className="badge">{scopeLabel}</span>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => dismiss(alert.id)}
                aria-label={`Dismiss alert: ${alert.title}`}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="stack-8" style={{ marginTop: 'var(--sp-12)' }}>
              <h3 style={{ fontSize: 'var(--text-16)' }}>{alert.title}</h3>
              <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{alert.message}</p>
              <div style={{ marginTop: 'var(--sp-4)' }}>
                <ListenButton text={`${severityLabel}. ${alert.title}. ${alert.message}`} label={alert.title} />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
