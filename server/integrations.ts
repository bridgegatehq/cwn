import express from 'express';
import crypto from 'node:crypto';
import * as webpushModule from 'web-push';

const webpush = ((webpushModule as unknown as { default?: typeof webpushModule }).default ??
  webpushModule) as typeof webpushModule;
import { db as databaseConnection } from './db.js';

/**
 * Read through to the live connection on each use. Node hands back the same instance;
 * the browser build swaps in its IndexedDB-backed connection during boot.
 */
const db = new Proxy({} as typeof databaseConnection, {
  get(_target, property) {
    const target = databaseConnection as unknown as Record<string | symbol, unknown>;
    const value = target[property];
    return typeof value === 'function' ? value.bind(databaseConnection) : value;
  },
});

/**
 * Optional provider credentials. When a credential is absent the endpoint still
 * answers honestly: it reports `configured: false` and serves clearly-labelled
 * sample data instead of pretending a live third-party connection exists.
 */
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || '';
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
const WHATSAPP_CHANNEL_URL = process.env.WHATSAPP_CHANNEL_URL || '';

export const PLATFORMS = [
  'x',
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'telegram',
  'whatsapp',
  'threads',
] as const;

export type Platform = (typeof PLATFORMS)[number];

export const PUSH_TOPICS = [
  'case_updates',
  'safety_alerts',
  'petitions',
  'community',
  'weekly_digest',
] as const;

export const BOT_TOPICS = [
  'safety_alerts',
  'case_updates',
  'petitions',
  'community',
  'trending',
  'rights_guides',
] as const;

interface SettingRow {
  value: string;
}

function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM platform_settings WHERE key = ?').get(key) as SettingRow | undefined;
  return row ? row.value : null;
}

function setSetting(key: string, value: string) {
  db.prepare(
    `INSERT INTO platform_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

// ---------------------------------------------------------------------------
// Web Push (VAPID)
// ---------------------------------------------------------------------------

let vapidPublicKey = '';
let vapidReady = false;

function initialiseVapid() {
  try {
    let publicKey = getSetting('vapid_public_key');
    let privateKey = getSetting('vapid_private_key');
    if (!publicKey || !privateKey) {
      const keys = webpush.generateVAPIDKeys();
      publicKey = keys.publicKey;
      privateKey = keys.privateKey;
      setSetting('vapid_public_key', publicKey);
      setSetting('vapid_private_key', privateKey);
    }
    const subject = getSetting('vapid_subject') || 'mailto:civic-desk@civicwatch.sample.ng';
    if (!getSetting('vapid_subject')) setSetting('vapid_subject', subject);
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidPublicKey = publicKey;
    vapidReady = true;
  } catch (error) {
    // Not fatal: push config reports ready=false and the UI uses the in-app fallback.
    // This also covers the browser build before its database connection exists.
    vapidReady = false;
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Web push VAPID initialisation deferred:', error instanceof Error ? error.message : error);
    }
  }
}

/**
 * Node calls this at import time. The browser build defers it: its database
 * connection only exists after boot, so it calls ensureVapidReady() instead.
 */
export function ensureVapidReady() {
  if (vapidReady) return;
  try {
    initialiseVapid();
  } catch (error) {
    // Reported without breaking the page; push config simply reports not-ready.
    console.warn('Web push keys are not ready yet:', error instanceof Error ? error.message : error);
  }
}

ensureVapidReady();

interface PushSubscriptionRow {
  id: number;
  user_id: number | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  state: string;
  lga: string;
  topics: string;
  status: string;
  created_at: string;
  last_success_at: string | null;
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function logDelivery(
  subscriptionId: number | null,
  topic: string,
  title: string,
  body: string,
  deepLink: string,
  status: string,
  detail: string
) {
  db.prepare(
    `INSERT INTO push_delivery_log (subscription_id, topic, title, body, deep_link, status, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(subscriptionId, topic, title, body, deepLink, status, detail, new Date().toISOString());
}

/**
 * Sends a push to every active subscription whose chosen topics and area match.
 * Falls back to writing an in-app notification so the alert is never silently lost.
 */
export async function dispatchPush(input: {
  topic: string;
  title: string;
  body: string;
  deepLink?: string;
  state?: string | null;
  lga?: string | null;
  scope?: 'national' | 'state' | 'lga';
}) {
  const deepLink = input.deepLink || '/notifications';
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO notifications (user_id, category, title, body, deep_link, is_read, created_at)
     VALUES (null, 'alert', ?, ?, ?, 0, ?)`
  ).run(input.title, input.body, deepLink, now);

  let rows = db
    .prepare(`SELECT * FROM push_subscriptions WHERE status = 'active'`)
    .all() as PushSubscriptionRow[];

  if (input.scope && input.scope !== 'national' && input.state) {
    rows = rows.filter((row) => row.state === input.state);
    if (input.scope === 'lga' && input.lga) {
      rows = rows.filter((row) => row.lga === input.lga);
    }
  }

  let delivered = 0;
  let failed = 0;

  for (const row of rows) {
    const topics = parseJson<string[]>(row.topics, []);
    if (topics.length > 0 && !topics.includes(input.topic)) continue;

    if (!vapidReady) {
      logDelivery(row.id, input.topic, input.title, input.body, deepLink, 'failed', 'vapid_keys_unavailable');
      failed += 1;
      continue;
    }

    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        JSON.stringify({
          title: input.title,
          body: input.body,
          deepLink,
          topic: input.topic,
          area: `${row.lga}, ${row.state}`,
        }),
        { TTL: 60 * 60 * 6 }
      );
      delivered += 1;
      db.prepare('UPDATE push_subscriptions SET last_success_at = ? WHERE id = ?').run(now, row.id);
      logDelivery(row.id, input.topic, input.title, input.body, deepLink, 'delivered', 'ok');
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : 'unknown_push_error';
      const expired =
        typeof error === 'object' && error !== null && 'statusCode' in error
          ? Number((error as { statusCode?: number }).statusCode) === 404 ||
            Number((error as { statusCode?: number }).statusCode) === 410
          : false;
      if (expired) {
        db.prepare(`UPDATE push_subscriptions SET status = 'expired' WHERE id = ?`).run(row.id);
      }
      logDelivery(row.id, input.topic, input.title, input.body, deepLink, 'failed', message);
    }
  }

  return { matched: rows.length, delivered, failed, inAppNotification: true };
}

// ---------------------------------------------------------------------------
// Social listening feed
// ---------------------------------------------------------------------------

interface SocialPostRow {
  id: number;
  platform: string;
  author_name: string;
  author_handle: string;
  author_followers: number;
  body: string;
  topic_tags: string;
  state: string | null;
  lga: string | null;
  source_url: string;
  media_kind: string;
  reply_count: number;
  repost_count: number;
  like_count: number;
  view_count: number;
  language: string;
  is_verified_source: number;
  related_case_ref: string | null;
  is_sample: number;
  posted_at: string;
}

function shapePost(row: SocialPostRow) {
  return {
    id: row.id,
    platform: row.platform,
    authorName: row.author_name,
    authorHandle: row.author_handle,
    authorFollowers: row.author_followers,
    body: row.body,
    topicTags: parseJson<string[]>(row.topic_tags, []),
    state: row.state,
    lga: row.lga,
    sourceUrl: row.source_url,
    mediaKind: row.media_kind,
    replies: row.reply_count,
    reposts: row.repost_count,
    likes: row.like_count,
    views: row.view_count,
    language: row.language,
    verifiedSource: Boolean(row.is_verified_source),
    relatedCaseRef: row.related_case_ref,
    isSample: Boolean(row.is_sample),
    postedAt: row.posted_at,
  };
}

/**
 * Live X (Twitter) recent-search provider. Only runs when X_BEARER_TOKEN is
 * present, and any provider failure degrades to the labelled sample stream.
 */
async function fetchXLive(state: string | null) {
  const query = state
    ? `(#CivicWatch OR #FOI OR #KnowYourRights OR Nigeria civic) (${state}) -is:retweet lang:en`
    : `(#CivicWatch OR #FOI OR #KnowYourRights OR #Accountability) Nigeria -is:retweet lang:en`;

  const url = new URL('https://api.x.com/2/tweets/search/recent');
  url.searchParams.set('query', query);
  url.searchParams.set('max_results', '20');
  url.searchParams.set('tweet.fields', 'created_at,public_metrics,lang,author_id');
  url.searchParams.set('expansions', 'author_id');
  url.searchParams.set('user.fields', 'name,username,public_metrics,verified');

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${X_BEARER_TOKEN}` },
  });
  if (!response.ok) {
    throw new Error(`x_provider_status_${response.status}`);
  }
  const payload = (await response.json()) as {
    data?: Array<{
      id: string;
      text: string;
      created_at: string;
      lang?: string;
      public_metrics?: { reply_count: number; retweet_count: number; like_count: number; impression_count: number };
      author_id?: string;
    }>;
    includes?: {
      users?: Array<{
        id: string;
        name: string;
        username: string;
        verified?: boolean;
        public_metrics?: { followers_count: number };
      }>;
    };
  };

  const users = new Map((payload.includes?.users || []).map((u) => [u.id, u]));
  return (payload.data || []).map((tweet) => {
    const user = tweet.author_id ? users.get(tweet.author_id) : undefined;
    return {
      id: Number(tweet.id.slice(-9)) || 0,
      platform: 'x',
      authorName: user?.name || 'X account',
      authorHandle: `@${user?.username || 'unknown'}`,
      authorFollowers: user?.public_metrics?.followers_count || 0,
      body: tweet.text,
      topicTags: (tweet.text.match(/#[\p{L}\p{N}_]+/gu) || []).slice(0, 4),
      state,
      lga: null,
      sourceUrl: `https://x.com/${user?.username || 'i'}/status/${tweet.id}`,
      mediaKind: 'none',
      replies: tweet.public_metrics?.reply_count || 0,
      reposts: tweet.public_metrics?.retweet_count || 0,
      likes: tweet.public_metrics?.like_count || 0,
      views: tweet.public_metrics?.impression_count || 0,
      language: tweet.lang || 'en',
      verifiedSource: Boolean(user?.verified),
      relatedCaseRef: null,
      isSample: false,
      postedAt: tweet.created_at,
    };
  });
}

// ---------------------------------------------------------------------------
// Trending computation
// ---------------------------------------------------------------------------

interface TrendRow {
  id: number;
  slug: string;
  title: string;
  hashtag: string;
  category: string;
  summary: string;
  mentions_24h: number;
  mentions_7d: number;
  mentions_30d: number;
  change_pct: number;
  momentum: string;
  states: string;
  platform_mix: string;
  series: string;
  top_voices: string;
  related_case_ref: string | null;
  related_petition_id: number | null;
  is_sample: number;
  updated_at: string;
}

function momentumLabel(changePct: number) {
  if (changePct >= 15) return 'rising';
  if (changePct <= -8) return 'cooling';
  return 'steady';
}

// ---------------------------------------------------------------------------
// Messenger digest builder
// ---------------------------------------------------------------------------

interface AlertRow {
  title: string;
  message: string;
  severity: string;
  scope: string;
  target_state: string | null;
  target_lga: string | null;
}

interface CaseRow {
  case_reference: string;
  title: string;
  status: string;
  state: string;
  lga: string;
}

interface PetitionRow {
  id: number;
  title: string;
  current_signatures: number;
  target_signatures: number;
  deadline: string;
}

export function buildDigest(input: {
  state: string;
  lga: string;
  topics?: string[];
}) {
  const topics = input.topics && input.topics.length > 0 ? input.topics : [...BOT_TOPICS];
  const wants = (topic: string) => topics.includes(topic);

  const alerts = wants('safety_alerts')
    ? (db
        .prepare(
          `SELECT title, message, severity, scope, target_state, target_lga
           FROM broadcast_alerts
           WHERE active = 1
             AND (scope = 'national' OR target_state = ? OR (scope = 'lga' AND target_lga = ?))
           ORDER BY CASE severity WHEN 'urgent' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, created_at DESC
           LIMIT 2`
        )
        .all(input.state, input.lga) as AlertRow[])
    : [];

  const cases = wants('case_updates')
    ? (db
        .prepare(
          `SELECT case_reference, title, status, state, lga
           FROM reports
           WHERE state = ? AND is_public = 1
           ORDER BY created_at DESC
           LIMIT 3`
        )
        .all(input.state) as CaseRow[])
    : [];

  const petitions = wants('petitions')
    ? (db
        .prepare(
          `SELECT id, title, current_signatures, target_signatures, deadline
           FROM petitions
           WHERE status = 'active'
           ORDER BY deadline ASC
           LIMIT 2`
        )
        .all() as PetitionRow[])
    : [];

  const trends = wants('trending')
    ? (db
        .prepare(
          `SELECT hashtag, title, mentions_24h, change_pct FROM trending_topics
           ORDER BY mentions_24h DESC LIMIT 2`
        )
        .all() as Array<{ hashtag: string; title: string; mentions_24h: number; change_pct: number }>)
    : [];

  const guides = wants('rights_guides')
    ? (db
        .prepare('SELECT title, summary FROM knowledge_guides ORDER BY updated_at DESC LIMIT 2')
        .all() as Array<{ title: string; summary: string }>)
    : [];

  const lines: string[] = [];
  const headline = `${input.lga}, ${input.state} civic digest`;

  lines.push(`Civic Watch Nigeria — ${headline}`);
  lines.push('Sample demonstration digest built from this preview workspace.');
  lines.push('');

  if (alerts.length > 0) {
    lines.push('Safety and civic alerts');
    alerts.forEach((alert) => {
      const scopeLabel = alert.scope === 'national' ? 'National' : alert.target_lga ? `${alert.target_lga}, ${alert.target_state}` : alert.target_state;
      lines.push(`- [${alert.severity.toUpperCase()} | ${scopeLabel}] ${alert.title}`);
      lines.push(`  ${alert.message}`);
    });
    lines.push('');
  }

  if (cases.length > 0) {
    lines.push(`Recent cases tracked in ${input.state}`);
    cases.forEach((c) => {
      lines.push(`- ${c.case_reference}: ${c.title} (stage: ${c.status.replace(/_/g, ' ')})`);
    });
    lines.push('');
  }

  if (petitions.length > 0) {
    lines.push('Open peaceful petitions');
    petitions.forEach((p) => {
      lines.push(
        `- ${p.title} — ${p.current_signatures}/${p.target_signatures} signatures, closes ${p.deadline}`
      );
    });
    lines.push('');
  }

  if (trends.length > 0) {
    lines.push('Trending across social platforms (sample counts)');
    trends.forEach((t) => {
      const direction = t.change_pct >= 0 ? `+${t.change_pct}%` : `${t.change_pct}%`;
      lines.push(`- ${t.hashtag} — ${t.mentions_24h} mentions in 24h (${direction})`);
    });
    lines.push('');
  }

  if (guides.length > 0) {
    lines.push('Rights guides to read');
    guides.forEach((g) => lines.push(`- ${g.title}`));
    lines.push('');
  }

  lines.push('Reply STOP to pause updates. Every item links back to a sealed public record.');

  const itemCount = alerts.length + cases.length + petitions.length + trends.length + guides.length;

  return { headline, body: lines.join('\n'), itemCount };
}

async function deliverTelegram(handle: string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    return { status: 'queued' as const, detail: 'telegram_credentials_not_configured' };
  }
  const chatId = handle.replace(/^@/, '');
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!response.ok || !payload.ok) {
    return { status: 'failed' as const, detail: payload.description || `telegram_status_${response.status}` };
  }
  return { status: 'sent' as const, detail: 'telegram_delivered' };
}

async function deliverWhatsApp(handle: string, text: string) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    return { status: 'queued' as const, detail: 'whatsapp_credentials_not_configured' };
  }
  const response = await fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: handle.replace(/[^\d]/g, ''),
      type: 'text',
      text: { preview_url: false, body: text },
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!response.ok) {
    return { status: 'failed' as const, detail: payload.error?.message || `whatsapp_status_${response.status}` };
  }
  return { status: 'sent' as const, detail: 'whatsapp_delivered' };
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

interface UserContext {
  id: number;
  state: string;
  lga: string;
}

export function registerIntegrationRoutes(
  app: express.Express,
  helpers: { getOptionalUser: (req: express.Request) => UserContext | null }
) {
  const { getOptionalUser } = helpers;

  // ---------- Push notifications ----------

  app.get('/api/push/config', (_req, res) => {
    res.json({
      vapidPublicKey: vapidPublicKey || null,
      pushReady: vapidReady,
      topics: PUSH_TOPICS,
      sampleMode: false,
    });
  });

  app.post('/api/push/subscribe', (req, res) => {
    const { subscription, state, lga, topics } = req.body as {
      subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      state?: string;
      lga?: string;
      topics?: string[];
    };

    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      res.status(400).json({ error: 'A complete browser push subscription is required.' });
      return;
    }
    if (!state || !lga) {
      res.status(400).json({ error: 'Choose the state and Local Government Area for your alerts.' });
      return;
    }

    const user = getOptionalUser(req);
    const cleanTopics = Array.isArray(topics)
      ? topics.filter((t) => (PUSH_TOPICS as readonly string[]).includes(t))
      : [...PUSH_TOPICS];

    const existing = db
      .prepare('SELECT id FROM push_subscriptions WHERE endpoint = ?')
      .get(subscription.endpoint) as { id: number } | undefined;

    const now = new Date().toISOString();

    if (existing) {
      db.prepare(
        `UPDATE push_subscriptions
         SET user_id = ?, p256dh = ?, auth = ?, state = ?, lga = ?, topics = ?, status = 'active', user_agent = ?
         WHERE id = ?`
      ).run(
        user?.id ?? null,
        subscription.keys.p256dh,
        subscription.keys.auth,
        state,
        lga,
        JSON.stringify(cleanTopics),
        String(req.headers['user-agent'] || '').slice(0, 240),
        existing.id
      );
    } else {
      db.prepare(
        `INSERT INTO push_subscriptions
           (user_id, endpoint, p256dh, auth, state, lga, topics, user_agent, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
      ).run(
        user?.id ?? null,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
        state,
        lga,
        JSON.stringify(cleanTopics),
        String(req.headers['user-agent'] || '').slice(0, 240),
        now
      );
    }

    const row = db
      .prepare('SELECT * FROM push_subscriptions WHERE endpoint = ?')
      .get(subscription.endpoint) as PushSubscriptionRow;

    res.status(201).json({
      subscription: {
        id: row.id,
        state: row.state,
        lga: row.lga,
        topics: parseJson<string[]>(row.topics, []),
        status: row.status,
        createdAt: row.created_at,
        lastSuccessAt: row.last_success_at,
      },
      message: 'Push alerts saved for your area.',
    });
  });

  app.delete('/api/push/unsubscribe', (req, res) => {
    const endpoint = String(req.query.endpoint || (req.body as { endpoint?: string })?.endpoint || '');
    if (!endpoint) {
      res.status(400).json({ error: 'Provide the subscription endpoint to remove.' });
      return;
    }
    db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
    res.json({ ok: true, message: 'Push alerts removed from this device.' });
  });

  app.get('/api/push/state', (req, res) => {
    const endpoint = String(req.query.endpoint || '');
    if (!endpoint) {
      const totals = db
        .prepare(
          `SELECT
             (SELECT COUNT(*) FROM push_subscriptions WHERE status = 'active') AS active,
             (SELECT COUNT(*) FROM push_delivery_log) AS deliveries,
             (SELECT COUNT(*) FROM push_delivery_log WHERE status = 'delivered') AS delivered`
        )
        .get() as { active: number; deliveries: number; delivered: number };
      res.json({ totals, pushReady: vapidReady });
      return;
    }
    const row = db
      .prepare('SELECT * FROM push_subscriptions WHERE endpoint = ?')
      .get(endpoint) as PushSubscriptionRow | undefined;

    res.json({
      subscribed: Boolean(row && row.status === 'active'),
      subscription: row
        ? {
            id: row.id,
            state: row.state,
            lga: row.lga,
            topics: parseJson<string[]>(row.topics, []),
            status: row.status,
            createdAt: row.created_at,
            lastSuccessAt: row.last_success_at,
          }
        : null,
      pushReady: vapidReady,
    });
  });

  app.patch('/api/push/subscription', (req, res) => {
    const { endpoint, topics, state, lga } = req.body as {
      endpoint?: string;
      topics?: string[];
      state?: string;
      lga?: string;
    };
    if (!endpoint) {
      res.status(400).json({ error: 'Provide the subscription endpoint.' });
      return;
    }
    const row = db
      .prepare('SELECT * FROM push_subscriptions WHERE endpoint = ?')
      .get(endpoint) as PushSubscriptionRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'No push subscription found for this device.' });
      return;
    }
    const cleanTopics = Array.isArray(topics)
      ? topics.filter((t) => (PUSH_TOPICS as readonly string[]).includes(t))
      : parseJson<string[]>(row.topics, []);
    db.prepare('UPDATE push_subscriptions SET topics = ?, state = ?, lga = ? WHERE id = ?').run(
      JSON.stringify(cleanTopics),
      state || row.state,
      lga || row.lga,
      row.id
    );
    res.json({ ok: true, topics: cleanTopics });
  });

  app.post('/api/push/test', async (req, res) => {
    const { endpoint, topic = 'safety_alerts' } = req.body as { endpoint?: string; topic?: string };
    if (!endpoint) {
      res.status(400).json({ error: 'Provide the subscription endpoint.' });
      return;
    }
    const row = db
      .prepare('SELECT * FROM push_subscriptions WHERE endpoint = ?')
      .get(endpoint) as PushSubscriptionRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Subscribe this device to push alerts first.' });
      return;
    }

    const title = 'Test civic alert';
    const body = `Push alerts are working for ${row.lga}, ${row.state}. You will only receive the topics you selected.`;
    const deepLink = '/notifications';

    if (!vapidReady) {
      logDelivery(row.id, topic, title, body, deepLink, 'failed', 'vapid_keys_unavailable');
      res.status(503).json({ error: 'Push keys are not ready on the server yet. Try again shortly.' });
      return;
    }

    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        JSON.stringify({ title, body, deepLink, topic, area: `${row.lga}, ${row.state}` }),
        { TTL: 600 }
      );
      logDelivery(row.id, topic, title, body, deepLink, 'delivered', 'ok');
      db.prepare('UPDATE push_subscriptions SET last_success_at = ? WHERE id = ?').run(
        new Date().toISOString(),
        row.id
      );
      res.json({ delivered: true, title, body });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_push_error';
      logDelivery(row.id, topic, title, body, deepLink, 'failed', message);
      res.status(502).json({
        delivered: false,
        error:
          'The browser push service rejected this test message. The alert was still saved to your in-app notifications.',
      });
    }
  });

  app.post('/api/push/broadcast', async (req, res) => {
    const { title, body, topic = 'safety_alerts', scope = 'national', state = null, lga = null } = req.body as {
      title?: string;
      body?: string;
      topic?: string;
      scope?: 'national' | 'state' | 'lga';
      state?: string | null;
      lga?: string | null;
    };
    if (!title || !body) {
      res.status(400).json({ error: 'Provide a title and a plain-language body.' });
      return;
    }
    const result = await dispatchPush({ topic, title, body, scope, state, lga, deepLink: '/notifications' });
    res.status(201).json(result);
  });

  app.get('/api/push/deliveries', (_req, res) => {
    const rows = db
      .prepare('SELECT * FROM push_delivery_log ORDER BY created_at DESC LIMIT 25')
      .all() as Array<{
      id: number;
      topic: string;
      title: string;
      body: string;
      status: string;
      detail: string | null;
      created_at: string;
    }>;
    res.json({
      deliveries: rows.map((r) => ({
        id: r.id,
        topic: r.topic,
        title: r.title,
        body: r.body,
        status: r.status,
        detail: r.detail,
        createdAt: r.created_at,
      })),
    });
  });

  // ---------- Cross-platform social listening ----------

  app.get('/api/social/status', (_req, res) => {
    res.json({
      providers: {
        x: { configured: Boolean(X_BEARER_TOKEN), mode: X_BEARER_TOKEN ? 'live' : 'sample' },
        facebook: { configured: false, mode: 'sample' },
        instagram: { configured: false, mode: 'sample' },
        tiktok: { configured: false, mode: 'sample' },
        youtube: { configured: false, mode: 'sample' },
        telegram: { configured: Boolean(TELEGRAM_BOT_TOKEN), mode: TELEGRAM_BOT_TOKEN ? 'live_bot' : 'sample' },
        whatsapp: { configured: Boolean(WHATSAPP_TOKEN), mode: WHATSAPP_TOKEN ? 'live_api' : 'sample' },
        threads: { configured: false, mode: 'sample' },
      },
      platforms: PLATFORMS,
      sampleDataNotice: 'Every seeded social item is labelled Sample until a provider credential is configured.',
    });
  });

  app.get('/api/social/feed', async (req, res) => {
    const platform = String(req.query.platform || 'all');
    const state = req.query.state ? String(req.query.state) : null;
    const topic = req.query.topic ? String(req.query.topic) : null;
    const limit = Math.min(Number(req.query.limit || 30), 60);

    let liveError: string | null = null;
    let livePosts: ReturnType<typeof shapePost>[] = [];

    if (platform === 'x' && X_BEARER_TOKEN) {
      try {
        livePosts = await fetchXLive(state);
      } catch (error) {
        liveError = error instanceof Error ? error.message : 'x_provider_error';
      }
    }

    const clauses: string[] = [];
    const params: Array<string | number> = [];
    if (platform !== 'all' && livePosts.length === 0) {
      clauses.push('platform = ?');
      params.push(platform);
    }
    if (state) {
      clauses.push('(state = ? OR state IS NULL)');
      params.push(state);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    params.push(limit);

    const rows = db
      .prepare(`SELECT * FROM social_posts ${where} ORDER BY posted_at DESC LIMIT ?`)
      .all(...params) as SocialPostRow[];

    let shaped = livePosts.length > 0 ? livePosts : rows.map(shapePost);

    if (topic) {
      const needle = topic.toLowerCase();
      shaped = shaped.filter(
        (post) =>
          post.body.toLowerCase().includes(needle) ||
          post.topicTags.some((tag) => tag.toLowerCase().includes(needle))
      );
    }

    const counts = db
      .prepare('SELECT platform, COUNT(*) AS c FROM social_posts GROUP BY platform')
      .all() as Array<{ platform: string; c: number }>;

    res.json({
      posts: shaped,
      platformCounts: Object.fromEntries(counts.map((c) => [c.platform, c.c])),
      liveProvider: {
        platform: 'x',
        configured: Boolean(X_BEARER_TOKEN),
        liveItems: livePosts.length,
        error: liveError,
      },
      sampleDataNotice: 'Seeded social items are sample records, not verified third-party claims.',
    });
  });

  // ---------- Expanded trending across every platform ----------

  app.get('/api/trending', (req, res) => {
    const windowKey = String(req.query.window || '7d');
    const platform = String(req.query.platform || 'all');
    const category = String(req.query.category || 'all');
    const state = req.query.state ? String(req.query.state) : null;

    let rows = db.prepare('SELECT * FROM trending_topics').all() as TrendRow[];

    if (category !== 'all') {
      rows = rows.filter((r) => r.category.toLowerCase() === category.toLowerCase());
    }
    if (state) {
      rows = rows.filter((r) => {
        const states = parseJson<string[]>(r.states, []);
        return states.length === 0 || states.includes(state);
      });
    }

    const windowField =
      windowKey === '24h' ? 'mentions_24h' : windowKey === '30d' ? 'mentions_30d' : 'mentions_7d';

    const shaped = rows
      .map((row) => {
        const mix = parseJson<Record<string, number>>(row.platform_mix, {});
        const filteredMix =
          platform === 'all'
            ? mix
            : Object.fromEntries(Object.entries(mix).filter(([key]) => key === platform));
        const platformMentions = Object.values(filteredMix).reduce((sum, n) => sum + n, 0);

        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          hashtag: row.hashtag,
          category: row.category,
          summary: row.summary,
          mentions: {
            h24: row.mentions_24h,
            d7: row.mentions_7d,
            d30: row.mentions_30d,
          },
          windowMentions: platform === 'all' ? row[windowField] : platformMentions,
          changePct: row.change_pct,
          momentum: momentumLabel(row.change_pct),
          states: parseJson<string[]>(row.states, []),
          platformMix: filteredMix,
          series: parseJson<number[]>(row.series, []),
          topVoices: parseJson<string[]>(row.top_voices, []),
          relatedCaseRef: row.related_case_ref,
          relatedPetitionId: row.related_petition_id,
          isSample: Boolean(row.is_sample),
          updatedAt: row.updated_at,
        };
      })
      .filter((row) => platform === 'all' || row.windowMentions > 0)
      .sort((a, b) => b.windowMentions - a.windowMentions);

    const platformTotals = Object.fromEntries(
      PLATFORMS.map((p) => [
        p,
        rows.reduce((sum, row) => sum + (parseJson<Record<string, number>>(row.platform_mix, {})[p] || 0), 0),
      ])
    );

    const totalMentions = Object.values(platformTotals).reduce((sum, n) => sum + n, 0);

    const platformMix = PLATFORMS.map((p) => ({
      platform: p,
      mentions: platformTotals[p],
      sharePct: totalMentions > 0 ? Math.round((platformTotals[p] / totalMentions) * 100) : 0,
    })).sort((a, b) => b.mentions - a.mentions);

    const rankedHashtags = shaped.slice(0, 8).map((row) => ({
      hashtag: row.hashtag,
      mentions: row.windowMentions,
      momentum: row.momentum,
      changePct: row.changePct,
    }));

    const matrix = shaped.slice(0, 6).map((row) => ({
      slug: row.slug,
      hashtag: row.hashtag,
      cells: PLATFORMS.map((p) => ({ platform: p, mentions: row.platformMix[p] || 0 })),
    }));

    const voices = new Map<string, { handle: string; platform: string; mentions: number }>();
    shaped.forEach((row) => {
      row.topVoices.forEach((handle, index) => {
        const platformForKey = PLATFORMS[index % PLATFORMS.length];
        const existing = voices.get(handle);
        const weight = Math.max(1, Math.round(row.windowMentions / (index + 2)));
        if (existing) {
          existing.mentions += weight;
        } else {
          voices.set(handle, { handle, platform: platformForKey, mentions: weight });
        }
      });
    });

    const summary = {
      rising: shaped.filter((r) => r.momentum === 'rising').length,
      steady: shaped.filter((r) => r.momentum === 'steady').length,
      cooling: shaped.filter((r) => r.momentum === 'cooling').length,
      totalMentions,
      topics: shaped.length,
      statesCovered: Array.from(new Set(shaped.flatMap((r) => r.states))).length,
    };

    res.json({
      window: windowKey,
      platform,
      category,
      state,
      topics: shaped,
      platformMix,
      rankedHashtags,
      matrix,
      topVoices: Array.from(voices.values())
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 8),
      summary,
      platforms: PLATFORMS,
      categories: Array.from(new Set(rows.map((r) => r.category))).sort(),
      statesCovered: Array.from(new Set(rows.flatMap((r) => parseJson<string[]>(r.states, [])))).sort(),
      sampleDataNotice:
        'Mention counts are generated sample figures for this preview workspace, not measured platform totals.',
    });
  });

  // ---------- WhatsApp and Telegram bot subscriptions ----------

  app.get('/api/bot/config', (_req, res) => {
    res.json({
      telegram: {
        configured: Boolean(TELEGRAM_BOT_TOKEN),
        username: TELEGRAM_BOT_USERNAME || null,
        deepLink: TELEGRAM_BOT_USERNAME ? `https://t.me/${TELEGRAM_BOT_USERNAME.replace(/^@/, '')}` : null,
        webhookSecretConfigured: Boolean(TELEGRAM_WEBHOOK_SECRET),
      },
      whatsapp: {
        configured: Boolean(WHATSAPP_TOKEN && WHATSAPP_PHONE_ID),
        businessNumber: process.env.WHATSAPP_BUSINESS_NUMBER || null,
        channelUrl: WHATSAPP_CHANNEL_URL || null,
      },
      topics: BOT_TOPICS,
      frequencies: ['instant', 'daily', 'weekly'],
    });
  });

  app.post('/api/bot/subscribe', (req, res) => {
    const { channel, handle, state, lga, topics, frequency = 'daily' } = req.body as {
      channel?: 'whatsapp' | 'telegram';
      handle?: string;
      state?: string;
      lga?: string;
      topics?: string[];
      frequency?: 'instant' | 'daily' | 'weekly';
    };

    if (channel !== 'whatsapp' && channel !== 'telegram') {
      res.status(400).json({ error: 'Choose WhatsApp or Telegram for your updates.' });
      return;
    }
    if (!handle || String(handle).trim().length < 5) {
      res.status(400).json({
        error:
          channel === 'whatsapp'
            ? 'Enter a complete WhatsApp number, for example +234 803 000 0000.'
            : 'Enter your Telegram username or chat ID, for example @citizen_lagos.',
      });
      return;
    }
    if (!state || !lga) {
      res.status(400).json({ error: 'Choose the state and Local Government Area for your updates.' });
      return;
    }

    const cleanTopics = Array.isArray(topics)
      ? topics.filter((t) => (BOT_TOPICS as readonly string[]).includes(t))
      : [...BOT_TOPICS];

    const user = getOptionalUser(req);
    const now = new Date().toISOString();

    const existing = db
      .prepare('SELECT id FROM bot_subscriptions WHERE channel = ? AND handle = ?')
      .get(channel, String(handle).trim()) as { id: number } | undefined;

    let subscriptionId: number;

    if (existing) {
      db.prepare(
        `UPDATE bot_subscriptions
         SET user_id = ?, state = ?, lga = ?, topics = ?, frequency = ?, status = 'active'
         WHERE id = ?`
      ).run(user?.id ?? null, state, lga, JSON.stringify(cleanTopics), frequency, existing.id);
      subscriptionId = existing.id;
    } else {
      const info = db
        .prepare(
          `INSERT INTO bot_subscriptions
             (user_id, channel, handle, verified, state, lga, topics, frequency, status, created_at)
           VALUES (?, ?, ?, 0, ?, ?, ?, ?, 'active', ?)`
        )
        .run(
          user?.id ?? null,
          channel,
          String(handle).trim(),
          state,
          lga,
          JSON.stringify(cleanTopics),
          frequency,
          now
        );
      subscriptionId = Number(info.lastInsertRowid);
    }

    // Queue the first digest immediately so the subscriber can see exactly what will arrive.
    const digest = buildDigest({ state, lga, topics: cleanTopics });
    const info = db
      .prepare(
        `INSERT INTO bot_digests
           (subscription_id, channel, state, lga, headline, body, item_count, status, provider_response, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', 'awaiting_provider_delivery', ?)`
      )
      .run(subscriptionId, channel, state, lga, digest.headline, digest.body, digest.itemCount, now);

    res.status(201).json({
      subscription: {
        id: subscriptionId,
        channel,
        handle: String(handle).trim(),
        state,
        lga,
        topics: cleanTopics,
        frequency,
        status: 'active',
        verified: false,
      },
      digest: {
        id: Number(info.lastInsertRowid),
        headline: digest.headline,
        body: digest.body,
        itemCount: digest.itemCount,
        status: 'queued',
      },
      message:
        channel === 'whatsapp'
          ? 'WhatsApp updates saved. The first digest is queued for your area.'
          : 'Telegram updates saved. The first digest is queued for your area.',
    });
  });

  app.get('/api/bot/subscriptions', (req, res) => {
    const user = getOptionalUser(req);
    const clauses: string[] = [];
    const params: Array<string | number> = [];
    const ids = String(req.query.ids || '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (user) {
      clauses.push('user_id = ?');
      params.push(user.id);
    } else if (req.query.handle) {
      clauses.push('handle = ?');
      params.push(String(req.query.handle));
    } else if (ids.length > 0) {
      // Anonymous visitors keep their own subscription ids in local storage.
      clauses.push(`id IN (${ids.map(() => '?').join(',')})`);
      params.push(...ids);
    } else {
      res.json({ subscriptions: [] });
      return;
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db
      .prepare(`SELECT * FROM bot_subscriptions ${where} ORDER BY created_at DESC`)
      .all(...params) as Array<{
      id: number;
      channel: string;
      handle: string;
      verified: number;
      state: string;
      lga: string;
      topics: string;
      frequency: string;
      status: string;
      created_at: string;
      last_sent_at: string | null;
    }>;

    res.json({
      subscriptions: rows.map((row) => ({
        id: row.id,
        channel: row.channel,
        handle: row.handle,
        verified: Boolean(row.verified),
        state: row.state,
        lga: row.lga,
        topics: parseJson<string[]>(row.topics, []),
        frequency: row.frequency,
        status: row.status,
        createdAt: row.created_at,
        lastSentAt: row.last_sent_at,
      })),
    });
  });

  app.patch('/api/bot/subscriptions/:id', (req, res) => {
    const id = Number(req.params.id);
    const { state, lga, topics, frequency, status } = req.body as {
      state?: string;
      lga?: string;
      topics?: string[];
      frequency?: string;
      status?: 'active' | 'paused';
    };
    const row = db.prepare('SELECT * FROM bot_subscriptions WHERE id = ?').get(id) as
      | { id: number; topics: string }
      | undefined;
    if (!row) {
      res.status(404).json({ error: 'Subscription not found.' });
      return;
    }
    const cleanTopics = Array.isArray(topics)
      ? topics.filter((t) => (BOT_TOPICS as readonly string[]).includes(t))
      : parseJson<string[]>(row.topics, []);
    db.prepare(
      `UPDATE bot_subscriptions
       SET state = COALESCE(?, state), lga = COALESCE(?, lga), topics = ?, frequency = COALESCE(?, frequency), status = COALESCE(?, status)
       WHERE id = ?`
    ).run(state ?? null, lga ?? null, JSON.stringify(cleanTopics), frequency ?? null, status ?? null, id);

    res.json({ ok: true, topics: cleanTopics, status: status || 'unchanged' });
  });

  app.delete('/api/bot/subscriptions/:id', (req, res) => {
    db.prepare('DELETE FROM bot_subscriptions WHERE id = ?').run(Number(req.params.id));
    res.json({ ok: true, message: 'Updates stopped for this messenger subscription.' });
  });

  app.get('/api/bot/digest-preview', (req, res) => {
    const state = String(req.query.state || 'Lagos');
    const lga = String(req.query.lga || 'Ikeja');
    const topics = String(req.query.topics || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const digest = buildDigest({ state, lga, topics });
    res.json({ state, lga, ...digest });
  });

  app.get('/api/bot/digests', (req, res) => {
    const subscriptionId = req.query.subscriptionId ? Number(req.query.subscriptionId) : null;
    const rows = subscriptionId
      ? (db
          .prepare('SELECT * FROM bot_digests WHERE subscription_id = ? ORDER BY created_at DESC LIMIT 10')
          .all(subscriptionId) as Array<Record<string, unknown>>)
      : (db.prepare('SELECT * FROM bot_digests ORDER BY created_at DESC LIMIT 10').all() as Array<
          Record<string, unknown>
        >);

    res.json({
      digests: rows.map((r) => ({
        id: r.id,
        channel: r.channel,
        state: r.state,
        lga: r.lga,
        headline: r.headline,
        body: r.body,
        itemCount: r.item_count,
        status: r.status,
        providerResponse: r.provider_response,
        createdAt: r.created_at,
      })),
    });
  });

  app.post('/api/bot/subscriptions/:id/send', async (req, res) => {
    const id = Number(req.params.id);
    const row = db.prepare('SELECT * FROM bot_subscriptions WHERE id = ?').get(id) as
      | {
          id: number;
          channel: string;
          handle: string;
          state: string;
          lga: string;
          topics: string;
          status: string;
        }
      | undefined;

    if (!row) {
      res.status(404).json({ error: 'Subscription not found.' });
      return;
    }

    const digest = buildDigest({
      state: row.state,
      lga: row.lga,
      topics: parseJson<string[]>(row.topics, []),
    });

    const result =
      row.channel === 'telegram'
        ? await deliverTelegram(row.handle, digest.body)
        : await deliverWhatsApp(row.handle, digest.body);

    const now = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO bot_digests
           (subscription_id, channel, state, lga, headline, body, item_count, status, provider_response, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        row.id,
        row.channel,
        row.state,
        row.lga,
        digest.headline,
        digest.body,
        digest.itemCount,
        result.status,
        result.detail,
        now
      );

    if (result.status === 'sent') {
      db.prepare('UPDATE bot_subscriptions SET last_sent_at = ?, verified = 1 WHERE id = ?').run(now, row.id);
    }

    db.prepare(
      `INSERT INTO notifications (user_id, category, title, body, deep_link, is_read, created_at)
       VALUES (null, 'system', ?, ?, '/messenger-updates', 0, ?)`
    ).run(`${row.channel === 'telegram' ? 'Telegram' : 'WhatsApp'} digest prepared`, digest.headline, now);

    res.json({
      digest: {
        id: Number(info.lastInsertRowid),
        headline: digest.headline,
        body: digest.body,
        itemCount: digest.itemCount,
        status: result.status,
        providerResponse: result.detail,
        createdAt: now,
      },
    });
  });

  // Telegram webhook: /start, /state <state>, /stop
  app.post('/api/bot/telegram/webhook', (req, res) => {
    if (TELEGRAM_WEBHOOK_SECRET) {
      const provided = req.headers['x-telegram-bot-api-secret-token'];
      if (provided !== TELEGRAM_WEBHOOK_SECRET) {
        res.status(401).json({ error: 'Invalid webhook secret.' });
        return;
      }
    }

    const update = req.body as {
      message?: { text?: string; chat?: { id?: number | string; username?: string } };
    };
    const text = (update.message?.text || '').trim();
    const chatId = update.message?.chat?.id ? String(update.message.chat.id) : null;
    const username = update.message?.chat?.username ? `@${update.message.chat.username}` : null;
    const handle = username || (chatId ? `chat:${chatId}` : null);

    if (!handle) {
      res.json({ ok: true, ignored: true });
      return;
    }

    if (text.startsWith('/start')) {
      const existing = db
        .prepare(`SELECT id FROM bot_subscriptions WHERE channel = 'telegram' AND handle = ?`)
        .get(handle) as { id: number } | undefined;
      if (!existing) {
        const defaults = buildDigest({ state: 'Lagos', lga: 'Ikeja' });
        db.prepare(
          `INSERT INTO bot_subscriptions
             (user_id, channel, handle, verified, state, lga, topics, frequency, status, created_at)
           VALUES (null, 'telegram', ?, 1, 'Lagos', 'Ikeja', ?, 'daily', 'active', ?)`
        ).run(handle, JSON.stringify([...BOT_TOPICS]), new Date().toISOString());
        db.prepare(
          `INSERT INTO bot_digests
             (subscription_id, channel, state, lga, headline, body, item_count, status, provider_response, created_at)
           VALUES ((SELECT id FROM bot_subscriptions WHERE channel='telegram' AND handle=?), 'telegram', 'Lagos', 'Ikeja', ?, ?, ?, 'queued', 'telegram_start', ?)`
        ).run(
          handle,
          defaults.headline,
          `${defaults.body}\n\nSend /state <your state> to switch area, or /stop to pause.`,
          defaults.itemCount,
          new Date().toISOString()
        );
      }
      res.json({ ok: true, action: 'subscribed', handle });
      return;
    }

    if (text.startsWith('/state')) {
      const requested = text.replace('/state', '').trim();
      if (!requested) {
        res.json({ ok: true, action: 'state_required' });
        return;
      }
      db.prepare(`UPDATE bot_subscriptions SET state = ?, lga = COALESCE(lga, ?) WHERE channel = 'telegram' AND handle = ?`).run(
        requested,
        requested,
        handle
      );
      res.json({ ok: true, action: 'state_updated', state: requested });
      return;
    }

    if (text.startsWith('/stop')) {
      db.prepare(`UPDATE bot_subscriptions SET status = 'paused' WHERE channel = 'telegram' AND handle = ?`).run(handle);
      res.json({ ok: true, action: 'paused' });
      return;
    }

    res.json({ ok: true, action: 'noop' });
  });

  // Self-check endpoint used by the interface to describe integration readiness honestly.
  app.get('/api/integrations/status', (_req, res) => {
    const pushSubs = db
      .prepare(`SELECT COUNT(*) AS c FROM push_subscriptions WHERE status = 'active'`)
      .get() as { c: number };
    res.json({
      push: {
        ready: vapidReady,
        activeSubscriptions: pushSubs.c,
        transport: 'Web Push (VAPID, service worker)',
      },
      social: {
        x: Boolean(X_BEARER_TOKEN),
        note: 'Only X has a live provider hook; all other platforms use labelled sample records.',
      },
      bot: {
        telegram: Boolean(TELEGRAM_BOT_TOKEN),
        whatsapp: Boolean(WHATSAPP_TOKEN && WHATSAPP_PHONE_ID),
      },
      generatedAt: new Date().toISOString(),
      nonce: crypto.randomBytes(4).toString('hex'),
    });
  });
}

export const integrationConfig = {
  telegramConfigured: Boolean(TELEGRAM_BOT_TOKEN),
  xConfigured: Boolean(X_BEARER_TOKEN),
  whatsappConfigured: Boolean(WHATSAPP_TOKEN && WHATSAPP_PHONE_ID),
};
