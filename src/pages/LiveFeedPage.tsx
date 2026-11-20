import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Music2,
  RefreshCw,
  Rss,
  Video,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NIGERIA_STATES } from '../data/nigeriaData';
import { PlatformGlyph, PLATFORM_LABELS, PLATFORM_ORDER } from '../components/PlatformGlyph';
import { ListenButton } from '../components/ListenButton';

interface SocialPost {
  id: number;
  platform: string;
  authorName: string;
  authorHandle: string;
  authorFollowers: number;
  body: string;
  topicTags: string[];
  state: string | null;
  lga: string | null;
  sourceUrl: string;
  mediaKind: string;
  replies: number;
  reposts: number;
  likes: number;
  views: number;
  language: string;
  verifiedSource: boolean;
  relatedCaseRef: string | null;
  isSample: boolean;
  postedAt: string;
}

interface FeedResponse {
  posts: SocialPost[];
  platformCounts: Record<string, number>;
  liveProvider: { platform: string; configured: boolean; liveItems: number; error: string | null };
  sampleDataNotice: string;
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(diffMs / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10}k`;
  return String(value);
}

export function LiveFeedPage() {
  const { t, detectedArea, apiFetch } = useApp();
  const [platform, setPlatform] = useState('all');
  const [state, setState] = useState(detectedArea.state);
  const [data, setData] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ platform, state, limit: '40' });
      const res = await apiFetch<FeedResponse>(`/api/social/feed?${params.toString()}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, platform, state]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const counts = data?.platformCounts || {};
  const hasSample = useMemo(() => (data?.posts || []).some((post) => post.isSample), [data]);

  const copyLink = async (post: SocialPost) => {
    try {
      await navigator.clipboard.writeText(post.sourceUrl);
      setCopiedId(post.id);
      window.setTimeout(() => setCopiedId(null), 2500);
    } catch {
      setCopiedId(null);
    }
  };

  const mediaIcon = (kind: string) => {
    if (kind === 'video') return <Video size={13} aria-hidden="true" />;
    if (kind === 'image') return <ImageIcon size={13} aria-hidden="true" />;
    if (kind === 'audio') return <Music2 size={13} aria-hidden="true" />;
    return <FileText size={13} aria-hidden="true" />;
  };

  return (
    <div className="section-stack">
      <section className="card stack-16" aria-labelledby="live-heading">
        <div className="row-between">
          <div className="stack-8">
            <span className="overline">{t.livePlatformFilter}</span>
            <div className="row-wrap">
              <Rss size={22} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <h1 id="live-heading">{t.liveTitle}</h1>
            </div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void loadFeed()} disabled={loading}>
            <RefreshCw size={16} aria-hidden="true" />
            <span>{t.liveRefresh}</span>
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', maxWidth: '760px' }}>{t.liveSubtitle}</p>

        <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
          <span className={data?.liveProvider.configured ? 'badge badge-success' : 'badge badge-info'}>
            <CheckCircle2 size={13} aria-hidden="true" />
            <span>{data?.liveProvider.configured ? t.liveLiveBadge : t.liveSampleBadge}</span>
          </span>
          {hasSample && <span className="badge">{t.sample}</span>}
        </div>

        <p style={{ fontSize: 'var(--text-13)', color: 'var(--text-secondary)' }}>
          {data?.liveProvider.configured ? t.liveProviderReady : t.liveProviderSample}
        </p>
      </section>

      {/* Platform tabs */}
      <div className="chip-row" role="group" aria-label={t.livePlatformFilter}>
        <button
          type="button"
          className={`chip ${platform === 'all' ? 'active' : ''}`}
          aria-pressed={platform === 'all'}
          onClick={() => setPlatform('all')}
        >
          {t.trendAllPlatforms}
        </button>
        {PLATFORM_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            className={`chip ${platform === key ? 'active' : ''}`}
            aria-pressed={platform === key}
            onClick={() => setPlatform(key)}
          >
            <PlatformGlyph platform={key} size={15} />
            <span>{PLATFORM_LABELS[key]}</span>
            <span className="mono" style={{ opacity: 0.7 }}>
              {counts[key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="live-state-filter" className="field-label">
            {t.liveStateFilter}
          </label>
          <select
            id="live-state-filter"
            className="select"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            <option value="">{t.liveAllStates}</option>
            {NIGERIA_STATES.map((entry) => (
              <option key={entry.code} value={entry.name}>
                {entry.name}
              </option>
            ))}
          </select>
        </div>

        <div className="card-subtle stack-8" style={{ justifyContent: 'center' }}>
          <span className="overline">{t.liveMetricsNote}</span>
          <span style={{ fontSize: 'var(--text-13)', color: 'var(--text-secondary)' }}>
            {data?.sampleDataNotice}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="stack-16">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton">
              <div className="skeleton-line" style={{ width: '32%' }} />
              <div className="skeleton-line" style={{ width: '88%' }} />
              <div className="skeleton-line" style={{ width: '64%' }} />
            </div>
          ))}
        </div>
      ) : !data || data.posts.length === 0 ? (
        <section className="card stack-12">
          <h2 style={{ fontSize: 'var(--text-18)' }}>{t.liveEmpty}</h2>
          <Link to="/community" className="btn btn-secondary btn-sm">
            <span>{t.liveViewCommunity}</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <div className="stack-16">
          {data.posts.map((post) => (
            <article key={`${post.platform}-${post.id}`} className="card stack-12">
              <div className="row-between">
                <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--surface-subtle)',
                      color: 'var(--primary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    <PlatformGlyph platform={post.platform} size={18} />
                  </span>
                  <div className="stack-8" style={{ gap: 'var(--sp-4)' }}>
                    <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                      <strong style={{ fontSize: 'var(--text-14)' }}>{post.authorName}</strong>
                      {post.verifiedSource && (
                        <span className="badge badge-success">
                          <CheckCircle2 size={12} aria-hidden="true" />
                          <span>{t.liveSourceVerified}</span>
                        </span>
                      )}
                    </div>
                    <span className="mono" style={{ fontSize: 'var(--text-12)', color: 'var(--text-secondary)' }}>
                      {post.authorHandle} • {PLATFORM_LABELS[post.platform] || post.platform} • {relativeTime(post.postedAt)}
                    </span>
                  </div>
                </div>
                <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                  {post.isSample && <span className="badge">{t.sample}</span>}
                  {post.state && (
                    <span className="badge">
                      {post.lga ? `${post.lga}, ` : ''}
                      {post.state}
                    </span>
                  )}
                </div>
              </div>

              <p style={{ fontSize: 'var(--text-16)' }}>{post.body}</p>

              <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                {post.topicTags.map((tag) => (
                  <span key={tag} className="mono badge">
                    {tag}
                  </span>
                ))}
                {post.mediaKind !== 'none' && (
                  <span className="badge">
                    {mediaIcon(post.mediaKind)}
                    <span>{post.mediaKind}</span>
                  </span>
                )}
                <span className="badge">{post.language}</span>
              </div>

              {post.relatedCaseRef && (
                <Link
                  to={`/cases/${post.relatedCaseRef}`}
                  className="mono badge badge-primary"
                  style={{ textDecoration: 'none', alignSelf: 'flex-start' }}
                >
                  {t.liveRelatedCase}: {post.relatedCaseRef}
                </Link>
              )}

              <div
                className="row-between"
                style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--sp-12)' }}
              >
                <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                  <span className="mono" style={{ fontSize: 'var(--text-12)', color: 'var(--text-secondary)' }}>
                    {compact(post.replies)} replies • {compact(post.reposts)} reposts • {compact(post.likes)} likes
                    {post.views > 0 ? ` • ${compact(post.views)} views` : ''}
                  </span>
                  <ListenButton text={`${post.authorName}. ${post.body}`} label={post.authorHandle} />
                </div>

                <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => void copyLink(post)}
                    aria-label={`${t.liveCopyLink}: ${post.authorHandle}`}
                  >
                    <Copy size={15} aria-hidden="true" />
                    <span>{copiedId === post.id ? t.liveCopied : t.liveCopyLink}</span>
                  </button>
                  <a
                    className="btn btn-secondary btn-sm"
                    href={post.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    <ExternalLink size={15} aria-hidden="true" />
                    <span>{t.liveOpenOriginal}</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="card-subtle row-between">
        <span style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{t.trendSampleNote}</span>
        <div className="row-wrap">
          <Link to="/trending" className="btn btn-secondary btn-sm">
            <span>{t.liveViewTrending}</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
          <Link to="/community" className="btn btn-ghost btn-sm">
            <span>{t.liveViewCommunity}</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
