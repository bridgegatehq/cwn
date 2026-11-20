import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageCircle,
  Play,
  Plus,
  Send,
  Trash2,
  Pause,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NIGERIA_STATES } from '../data/nigeriaData';
import { ConsentDialog } from '../components/ConsentDialog';
import { PlatformGlyph } from '../components/PlatformGlyph';

interface BotConfig {
  telegram: { configured: boolean; username: string | null; deepLink: string | null };
  whatsapp: { configured: boolean; businessNumber: string | null; channelUrl: string | null };
  topics: string[];
  frequencies: string[];
}

interface Subscription {
  id: number;
  channel: 'whatsapp' | 'telegram';
  handle: string;
  verified: boolean;
  state: string;
  lga: string;
  topics: string[];
  frequency: string;
  status: string;
  createdAt: string;
  lastSentAt: string | null;
}

interface Digest {
  id: number;
  headline: string;
  body: string;
  itemCount: number;
  status: string;
  providerResponse?: string | null;
  createdAt: string;
}

const STORAGE_KEY = 'cwn_bot_subscription_ids';

function readStoredIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as number[]).filter((id) => Number.isFinite(id)) : [];
  } catch {
    return [];
  }
}

function storeId(id: number) {
  const current = readStoredIds();
  if (!current.includes(id)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, id]));
  }
}

function forgetId(id: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(readStoredIds().filter((value) => value !== id)));
}

export function MessengerUpdatesPage() {
  const { t, user, detectedArea, apiFetch } = useApp();
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [channel, setChannel] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [handle, setHandle] = useState('');
  const [stateName, setStateName] = useState(detectedArea.state);
  const [lgaName, setLgaName] = useState(detectedArea.lga);
  const [topics, setTopics] = useState<string[]>([
    'safety_alerts',
    'case_updates',
    'petitions',
    'community',
    'trending',
    'rights_guides',
  ]);
  const [frequency, setFrequency] = useState('daily');
  const [consentOpen, setConsentOpen] = useState(false);

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [digests, setDigests] = useState<Record<number, Digest>>({});
  const [preview, setPreview] = useState<Digest | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const stateEntry = NIGERIA_STATES.find((entry) => entry.name === stateName) || NIGERIA_STATES[24];

  const topicLabels: Record<string, string> = {
    safety_alerts: t.pushTopicSafety,
    case_updates: t.pushTopicCases,
    petitions: t.pushTopicPetitions,
    community: t.pushTopicCommunity,
    trending: t.trendMentions,
    rights_guides: t.knowRights,
  };

  const loadSubscriptions = useCallback(async () => {
    try {
      const ids = readStoredIds();
      const query = user ? '' : `?ids=${ids.join(',')}`;
      const res = await apiFetch<{ subscriptions: Subscription[] }>(`/api/bot/subscriptions${query}`);
      setSubscriptions(res.subscriptions);
      res.subscriptions.forEach((sub) => {
        void apiFetch<{ digests: Digest[] }>(`/api/bot/digests?subscriptionId=${sub.id}`)
          .then((digestRes) => {
            if (digestRes.digests[0]) {
              setDigests((prev) => ({ ...prev, [sub.id]: digestRes.digests[0] }));
            }
          })
          .catch(() => {});
      });
    } catch {
      setSubscriptions([]);
    }
  }, [apiFetch, user]);

  useEffect(() => {
    apiFetch<BotConfig>('/api/bot/config')
      .then(setConfig)
      .catch(() => setConfig(null));
    void loadSubscriptions();
  }, [apiFetch, loadSubscriptions]);

  const loadPreview = async () => {
    try {
      const res = await apiFetch<{ headline: string; body: string; itemCount: number }>(
        `/api/bot/digest-preview?state=${encodeURIComponent(stateName)}&lga=${encodeURIComponent(lgaName)}&topics=${topics.join(',')}`
      );
      setPreview({
        id: 0,
        headline: res.headline,
        body: res.body,
        itemCount: res.itemCount,
        status: 'preview',
        createdAt: new Date().toISOString(),
      });
      setCopied(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.botNotConfigured);
    }
  };

  const createSubscription = async () => {
    setConsentOpen(false);
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch<{ subscription: Subscription; digest: Digest }>('/api/bot/subscribe', {
        method: 'POST',
        body: JSON.stringify({ channel, handle: handle.trim(), state: stateName, lga: lgaName, topics, frequency }),
      });
      storeId(res.subscription.id);
      setDigests((prev) => ({ ...prev, [res.subscription.id]: res.digest }));
      setPreview(res.digest);
      setMessage(t.botSaved);
      setHandle('');
      await loadSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.botNotConfigured);
    } finally {
      setBusy(false);
    }
  };

  const sendDigest = async (subscription: Subscription) => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ digest: Digest }>(`/api/bot/subscriptions/${subscription.id}/send`, {
        method: 'POST',
        body: '{}',
      });
      setDigests((prev) => ({ ...prev, [subscription.id]: res.digest }));
      setPreview(res.digest);
      setMessage(res.digest.status === 'sent' ? t.botSent : t.botQueued);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.botNotConfigured);
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (subscription: Subscription) => {
    const nextStatus = subscription.status === 'active' ? 'paused' : 'active';
    await apiFetch(`/api/bot/subscriptions/${subscription.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
    await loadSubscriptions();
  };

  const removeSubscription = async (subscription: Subscription) => {
    await apiFetch(`/api/bot/subscriptions/${subscription.id}`, { method: 'DELETE' });
    forgetId(subscription.id);
    await loadSubscriptions();
  };

  const copyDigest = async (body: string) => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="section-stack">
      <section className="card stack-16" aria-labelledby="bot-heading">
        <div className="row-between">
          <div className="stack-8">
            <span className="overline">{t.botAreaLabel}</span>
            <div className="row-wrap">
              <MessageCircle size={22} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <h1 id="bot-heading">{t.botTitle}</h1>
            </div>
          </div>
          <span className="badge">{t.sample}</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '760px' }}>{t.botSubtitle}</p>
        <p style={{ fontSize: 'var(--text-13)', color: 'var(--text-secondary)' }}>{t.botHandleNote}</p>
      </section>

      <div className="grid-2">
        <button
          type="button"
          className={channel === 'whatsapp' ? 'card-tint stack-12' : 'card-subtle stack-12'}
          style={{ textAlign: 'left', cursor: 'pointer', border: channel === 'whatsapp' ? '2px solid var(--primary)' : '1px solid var(--border)' }}
          aria-pressed={channel === 'whatsapp'}
          onClick={() => setChannel('whatsapp')}
        >
          <div className="row-wrap">
            <PlatformGlyph platform="whatsapp" size={20} />
            <strong>{t.botWhatsapp}</strong>
            {config?.whatsapp.configured ? (
              <span className="badge badge-success">{t.botConfigured}</span>
            ) : (
              <span className="badge">{t.botNotConfigured}</span>
            )}
          </div>
          <span className="field-hint">{t.botHandleWhatsapp}</span>
        </button>

        <button
          type="button"
          className={channel === 'telegram' ? 'card-tint stack-12' : 'card-subtle stack-12'}
          style={{ textAlign: 'left', cursor: 'pointer', border: channel === 'telegram' ? '2px solid var(--primary)' : '1px solid var(--border)' }}
          aria-pressed={channel === 'telegram'}
          onClick={() => setChannel('telegram')}
        >
          <div className="row-wrap">
            <PlatformGlyph platform="telegram" size={20} />
            <strong>{t.botTelegram}</strong>
            {config?.telegram.configured ? (
              <span className="badge badge-success">{t.botConfigured}</span>
            ) : (
              <span className="badge">{t.botNotConfigured}</span>
            )}
          </div>
          <span className="field-hint">{t.botHandleTelegram}</span>
        </button>
      </div>

      {channel === 'telegram' && config?.telegram.deepLink && (
        <a
          className="btn btn-secondary btn-sm"
          href={config.telegram.deepLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{ alignSelf: 'flex-start' }}
        >
          <ExternalLink size={15} aria-hidden="true" />
          <span>{t.botDeepLink}</span>
        </a>
      )}

      <section className="card stack-20" aria-labelledby="bot-form-heading">
        <h2 id="bot-form-heading" style={{ fontSize: 'var(--text-18)' }}>
          {t.botAreaLabel}
        </h2>

        <form
          className="stack-16"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (handle.trim().length < 5) {
              setError(channel === 'whatsapp' ? t.invalidPhone : t.botHandleTelegram);
              return;
            }
            setConsentOpen(true);
          }}
        >
          <div className="grid-2">
            <div className="field">
              <label htmlFor="bot-handle" className="field-label">
                {channel === 'whatsapp' ? t.botHandleWhatsapp : t.botHandleTelegram}
              </label>
              <input
                id="bot-handle"
                className="input mono"
                placeholder={channel === 'whatsapp' ? t.botPlaceholderWhatsapp : t.botPlaceholderTelegram}
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="bot-frequency" className="field-label">
                {t.botFrequency}
              </label>
              <select
                id="bot-frequency"
                className="select"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option value="instant">{t.botFreqInstant}</option>
                <option value="daily">{t.botFreqDaily}</option>
                <option value="weekly">{t.botFreqWeekly}</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="bot-state" className="field-label">
                {t.yourState}
              </label>
              <select
                id="bot-state"
                className="select"
                value={stateName}
                onChange={(e) => {
                  const entry = NIGERIA_STATES.find((item) => item.name === e.target.value) || NIGERIA_STATES[0];
                  setStateName(entry.name);
                  setLgaName(entry.lgas[0]);
                }}
              >
                {NIGERIA_STATES.map((entry) => (
                  <option key={entry.code} value={entry.name}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="bot-lga" className="field-label">
                {t.localGovernment}
              </label>
              <select
                id="bot-lga"
                className="select"
                value={lgaName}
                onChange={(e) => setLgaName(e.target.value)}
              >
                {stateEntry.lgas.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="stack-8">
            <span className="field-label">{t.botTopics}</span>
            <div className="chip-row">
              {Object.keys(topicLabels).map((key) => {
                const active = topics.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`chip ${active ? 'active' : ''}`}
                    aria-pressed={active}
                    onClick={() =>
                      setTopics((prev) => (active ? prev.filter((value) => value !== key) : [...prev, key]))
                    }
                  >
                    {active && <CheckCircle2 size={14} aria-hidden="true" />}
                    <span>{topicLabels[key]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p role="status" aria-live="polite" style={{ color: 'var(--success)', fontWeight: 600, fontSize: 'var(--text-14)' }}>
              {message}
            </p>
          )}

          <div className="row-wrap">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              <Plus size={16} aria-hidden="true" />
              <span>{busy ? t.botCreating : t.botCreate}</span>
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => void loadPreview()}>
              <Play size={16} aria-hidden="true" />
              <span>{t.botPreview}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Digest preview */}
      {preview && (
        <section className="card stack-12" aria-labelledby="bot-preview-heading">
          <div className="row-between">
            <div className="stack-8" style={{ gap: 'var(--sp-4)' }}>
              <span className="overline">{t.botPreviewTitle}</span>
              <h2 id="bot-preview-heading" style={{ fontSize: 'var(--text-18)' }}>
                {preview.headline}
              </h2>
            </div>
            <span className={preview.status === 'sent' ? 'badge badge-success' : 'badge badge-info'}>
              {preview.status === 'sent' ? t.botSent : preview.status === 'queued' ? t.botQueued : t.botPreviewTitle}
            </span>
          </div>

          <pre
            className="mono"
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 'var(--text-13)',
              lineHeight: 1.6,
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card)',
              padding: 'var(--sp-16)',
              margin: 0,
              maxHeight: 420,
              overflow: 'auto',
            }}
          >
            {preview.body}
          </pre>

          <p className="field-hint">{t.botSampleNote}</p>

          <div className="row-wrap">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void copyDigest(preview.body)}>
              <Copy size={15} aria-hidden="true" />
              <span>{copied ? t.botCopied : t.botCopy}</span>
            </button>
            {preview.providerResponse && (
              <span className="mono badge">{preview.providerResponse.replace(/_/g, ' ')}</span>
            )}
          </div>
        </section>
      )}

      {/* Existing subscriptions */}
      <section className="card stack-16" aria-labelledby="bot-subs-heading">
        <h2 id="bot-subs-heading" style={{ fontSize: 'var(--text-18)' }}>
          {t.botSubscriptions}
        </h2>

        {subscriptions.length === 0 ? (
          <p className="field-hint">{t.botNoSubs}</p>
        ) : (
          <div className="stack-12">
            {subscriptions.map((subscription) => {
              const digest = digests[subscription.id];
              return (
                <article key={subscription.id} className="card-subtle stack-12">
                  <div className="row-between">
                    <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                      <PlatformGlyph platform={subscription.channel} size={18} />
                      <strong className="mono" style={{ fontSize: 'var(--text-14)' }}>
                        {subscription.handle}
                      </strong>
                      <span className={subscription.status === 'active' ? 'badge badge-success' : 'badge badge-warning'}>
                        {subscription.status === 'active' ? t.botActive : t.botPaused}
                      </span>
                      <span className="badge">
                        {subscription.lga}, {subscription.state}
                      </span>
                      <span className="badge">
                        {subscription.frequency === 'instant'
                          ? t.botFreqInstant
                          : subscription.frequency === 'weekly'
                            ? t.botFreqWeekly
                            : t.botFreqDaily}
                      </span>
                    </div>

                    <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => void sendDigest(subscription)}
                        disabled={busy}
                      >
                        <Send size={15} aria-hidden="true" />
                        <span>{t.botSendNow}</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => void toggleStatus(subscription)}
                      >
                        <Pause size={15} aria-hidden="true" />
                        <span>{subscription.status === 'active' ? t.botPause : t.botResume}</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => void removeSubscription(subscription)}
                        aria-label={`${t.botDelete} ${subscription.handle}`}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        <span>{t.botDelete}</span>
                      </button>
                    </div>
                  </div>

                  <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                    {subscription.topics.map((topic) => (
                      <span key={topic} className="badge">
                        {topicLabels[topic] || topic.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>

                  {digest && (
                    <div className="stack-8">
                      <span className="overline">
                        {digest.headline} • {new Date(digest.createdAt).toLocaleString('en-NG')}
                      </span>
                      <span className="field-hint">
                        {digest.itemCount} items • {digest.status === 'sent' ? t.botSent : t.botQueued}
                      </span>
                      <div>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreview(digest)}>
                          <span>{t.botPreviewTitle}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <ConsentDialog
        open={consentOpen}
        title={t.botConsentTitle}
        whatHappens={t.botConsentBody}
        confirmationText={t.botConsentConfirm}
        confirmButtonLabel={t.botConsentButton}
        busy={busy}
        onConfirm={() => void createSubscription()}
        onCancel={() => setConsentOpen(false)}
      />
    </div>
  );
}
