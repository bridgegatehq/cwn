import { useCallback, useEffect, useState } from 'react';
import { BellRing, CheckCircle2, Send, ShieldCheck, Smartphone, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ConsentDialog } from './ConsentDialog';
import {
  getBrowserSubscription,
  getPushSupport,
  notificationPermission,
  registerServiceWorker,
  serialiseSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  type PushConfig,
} from '../lib/push';

interface DeliveryRow {
  id: number;
  topic: string;
  title: string;
  body: string;
  status: string;
  detail: string | null;
  createdAt: string;
}

const TOPIC_KEYS = ['safety_alerts', 'case_updates', 'petitions', 'community', 'weekly_digest'] as const;

export function PushNotificationCard({ compact = false }: { compact?: boolean }) {
  const { t, detectedArea, apiFetch } = useApp();
  const support = getPushSupport();
  const permission = notificationPermission();

  const [config, setConfig] = useState<PushConfig | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [topics, setTopics] = useState<string[]>([...TOPIC_KEYS]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);

  const loadServerState = useCallback(
    async (activeEndpoint: string) => {
      try {
        const res = await apiFetch<{
          subscribed: boolean;
          subscription: { topics: string[] } | null;
        }>(`/api/push/state?endpoint=${encodeURIComponent(activeEndpoint)}`);
        setSubscribed(res.subscribed);
        if (res.subscription?.topics?.length) setTopics(res.subscription.topics);
      } catch {
        setSubscribed(false);
      }
    },
    [apiFetch]
  );

  const loadDeliveries = useCallback(async () => {
    try {
      const res = await apiFetch<{ deliveries: DeliveryRow[] }>('/api/push/deliveries');
      setDeliveries(res.deliveries.slice(0, 4));
    } catch {
      setDeliveries([]);
    }
  }, [apiFetch]);

  useEffect(() => {
    apiFetch<PushConfig>('/api/push/config')
      .then(setConfig)
      .catch(() => setConfig(null));

    if (support.canSubscribe) {
      void registerServiceWorker();
      void getBrowserSubscription().then((existing) => {
        if (existing) {
          setEndpoint(existing.endpoint);
          void loadServerState(existing.endpoint);
        }
      });
    }
    void loadDeliveries();
  }, [apiFetch, loadDeliveries, loadServerState, support.canSubscribe]);

  const topicLabel = (topic: string) =>
    ({
      safety_alerts: t.pushTopicSafety,
      case_updates: t.pushTopicCases,
      petitions: t.pushTopicPetitions,
      community: t.pushTopicCommunity,
      weekly_digest: t.pushTopicDigest,
    })[topic] || topic;

  const enablePush = async () => {
    setConsentOpen(false);
    setBusy(true);
    setError(null);
    setMessage(null);

    if (!config?.vapidPublicKey) {
      setBusy(false);
      setError(t.pushServerNotReady);
      return;
    }

    const { subscription, error: subscribeError } = await subscribeToPush(config.vapidPublicKey);
    if (!subscription) {
      setBusy(false);
      setError(subscribeError || t.pushEnableFailed);
      // Still record an in-app alert so the citizen is not left without coverage.
      await apiFetch('/api/push/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          title: t.pushFallbackTitle,
          body: t.pushFallbackBody,
          topic: 'safety_alerts',
          scope: 'state',
          state: detectedArea.state,
          lga: detectedArea.lga,
        }),
      }).catch(() => {});
      void loadDeliveries();
      return;
    }

    const serialised = serialiseSubscription(subscription);
    if (!serialised) {
      setBusy(false);
      setError(t.pushEnableFailed);
      return;
    }

    try {
      await apiFetch('/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          subscription: serialised,
          state: detectedArea.state,
          lga: detectedArea.lga,
          topics,
        }),
      });
      setEndpoint(serialised.endpoint);
      setSubscribed(true);
      setMessage(t.pushEnabledMessage);
      void loadDeliveries();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.pushEnableFailed);
    } finally {
      setBusy(false);
    }
  };

  const saveTopics = async (next: string[]) => {
    setTopics(next);
    if (!endpoint || !subscribed) return;
    try {
      await apiFetch('/api/push/subscription', {
        method: 'PATCH',
        body: JSON.stringify({
          endpoint,
          topics: next,
          state: detectedArea.state,
          lga: detectedArea.lga,
        }),
      });
      setMessage(t.pushTopicsSaved);
    } catch {
      setError(t.pushEnableFailed);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);

    if (endpoint && subscribed) {
      try {
        await apiFetch('/api/push/test', { method: 'POST', body: JSON.stringify({ endpoint }) });
        setMessage(t.pushTestSent);
        void loadDeliveries();
        setBusy(false);
        return;
      } catch {
        // fall through to the in-app fallback below
      }
    }

    try {
      await apiFetch('/api/push/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          title: t.pushFallbackTitle,
          body: t.pushFallbackBody,
          topic: 'safety_alerts',
          scope: 'state',
          state: detectedArea.state,
          lga: detectedArea.lga,
        }),
      });
      setMessage(t.pushInboxOnlyMessage);
      void loadDeliveries();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.pushEnableFailed);
    } finally {
      setBusy(false);
    }
  };

  const disablePush = async () => {
    setBusy(true);
    const active = endpoint || (await getBrowserSubscription())?.endpoint || null;
    const removed = await unsubscribeFromPush();
    const target = active || removed;
    if (target) {
      try {
        await apiFetch(`/api/push/unsubscribe?endpoint=${encodeURIComponent(target)}`, { method: 'DELETE' });
      } catch {
        // ignore
      }
    }
    setSubscribed(false);
    setEndpoint(null);
    setMessage(t.pushDisabledMessage);
    setBusy(false);
  };

  const statusTone = subscribed ? 'badge badge-success' : support.canSubscribe ? 'badge badge-info' : 'badge';

  return (
    <section className="card stack-16" aria-labelledby="push-card-heading">
      <div className="row-between">
        <div className="row-wrap">
          <BellRing size={20} style={{ color: 'var(--primary)' }} aria-hidden="true" />
          <div>
            <h2 id="push-card-heading" style={{ fontSize: 'var(--text-18)' }}>
              {t.pushTitle}
            </h2>
            <p className="field-hint">{t.pushSubtitle}</p>
          </div>
        </div>
        <span className={statusTone}>
          <Smartphone size={13} aria-hidden="true" />
          <span>
            {subscribed
              ? t.pushStatusOn
              : support.canSubscribe
                ? permission === 'denied'
                  ? t.pushStatusBlocked
                  : t.pushStatusOff
                : t.pushStatusInAppOnly}
          </span>
        </span>
      </div>

      <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{t.pushBody}</p>

      {config && !config.sampleMode && (
        <p className="field-hint">{t.pushDeploymentNote}</p>
      )}

      <div className="card-subtle stack-8">
        <span className="overline">
          {detectedArea.lga}, {detectedArea.state}
        </span>
        <span style={{ fontSize: 'var(--text-13)', color: 'var(--text-secondary)' }}>{t.pushAreaNote}</span>
      </div>

      {!compact && (
        <div className="stack-8">
          <span className="field-label">{t.pushTopicsLabel}</span>
          <div className="stack-8">
            {TOPIC_KEYS.map((topic) => {
              const active = topics.includes(topic);
              return (
                <label
                  key={topic}
                  className="card-subtle"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--sp-12)',
                    cursor: 'pointer',
                    padding: 'var(--sp-12) var(--sp-16)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) =>
                      void saveTopics(
                        e.target.checked ? [...topics, topic] : topics.filter((value) => value !== topic)
                      )
                    }
                    style={{ width: 22, height: 22, marginTop: 2, accentColor: 'var(--primary)' }}
                  />
                  <span className="stack-8" style={{ gap: 'var(--sp-4)' }}>
                    <strong style={{ fontSize: 'var(--text-14)' }}>{topicLabel(topic)}</strong>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {!support.canSubscribe && (
        <div className="card-tint stack-8">
          <div className="row-wrap">
            <ShieldCheck size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <strong style={{ fontSize: 'var(--text-14)' }}>{t.pushInAppOnlyTitle}</strong>
          </div>
          <p style={{ fontSize: 'var(--text-13)', color: 'var(--text-secondary)' }}>{support.reason}</p>
        </div>
      )}

      {message && (
        <p role="status" aria-live="polite" style={{ color: 'var(--success)', fontWeight: 600, fontSize: 'var(--text-14)' }}>
          {message}
        </p>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      <div className="row-wrap">
        {!subscribed && support.canSubscribe && (
          <button type="button" className="btn btn-primary" onClick={() => setConsentOpen(true)} disabled={busy}>
            <BellRing size={16} aria-hidden="true" />
            <span>{t.pushEnable}</span>
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={() => void sendTest()} disabled={busy}>
          <Send size={16} aria-hidden="true" />
          <span>{t.pushSendTest}</span>
        </button>
        {subscribed && (
          <button type="button" className="btn btn-ghost" onClick={() => void disablePush()} disabled={busy}>
            <XCircle size={16} aria-hidden="true" />
            <span>{t.pushDisable}</span>
          </button>
        )}
      </div>

      {!compact && deliveries.length > 0 && (
        <div className="stack-8">
          <span className="overline">{t.pushRecentDeliveries}</span>
          <ul className="stack-8" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {deliveries.map((row) => (
              <li key={row.id} className="card-subtle stack-8" style={{ gap: 'var(--sp-4)' }}>
                <div className="row-between">
                  <strong style={{ fontSize: 'var(--text-13)' }}>{row.title}</strong>
                  <span className={row.status === 'delivered' ? 'badge badge-success' : 'badge badge-warning'}>
                    {row.status === 'delivered' ? t.pushDelivered : t.pushDegraded}
                  </span>
                </div>
                <span className="mono" style={{ fontSize: 'var(--text-12)', color: 'var(--text-secondary)' }}>
                  {new Date(row.createdAt).toLocaleString('en-NG')} • {row.topic.replace(/_/g, ' ')}
                </span>
                {row.detail && row.status !== 'delivered' && (
                  <span className="field-hint">{row.detail.replace(/_/g, ' ')}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && subscribed && (
        <p className="field-hint">
          <CheckCircle2 size={13} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} aria-hidden="true" />
          {t.pushOnNote}
        </p>
      )}

      <ConsentDialog
        open={consentOpen}
        title={t.pushConsentTitle}
        whatHappens={t.pushConsentBody}
        confirmationText={t.pushConsentConfirm}
        confirmButtonLabel={t.pushConsentButton}
        busy={busy}
        onConfirm={() => void enablePush()}
        onCancel={() => setConsentOpen(false)}
      />
    </section>
  );
}
