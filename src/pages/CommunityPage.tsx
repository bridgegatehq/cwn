import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Pin,
  HeartHandshake,
  Eye,
  Share2,
  MessageSquare,
  Flag,
  Mic,
  Image as ImageIcon,
  FileText,
  Send,
  ArrowRight,
  Flame,
  Rss,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LANGUAGES } from '../data/i18n';
import { VoiceMicButton } from '../components/VoiceMicButton';
import { ListenButton } from '../components/ListenButton';
import { PlatformGlyph, PLATFORM_ORDER } from '../components/PlatformGlyph';

interface PostReply {
  id: number;
  author_name: string;
  content: string;
  created_at: string;
}

interface CommunityPost {
  id: number;
  content: string;
  scope: 'lga' | 'state' | 'national';
  state: string;
  lga: string;
  language: string;
  content_type: 'text' | 'voice' | 'image';
  attachments: Array<{ kind?: string; label?: string; durationSec?: number }>;
  solidarity_count: number;
  witnessed_count: number;
  amplify_count: number;
  reply_count: number;
  moderation_status: string;
  isPinned: boolean;
  author_name: string;
  author_badge: string;
  related_case_reference?: string | null;
  isSample: boolean;
  created_at: string;
  replies: PostReply[];
}

export function CommunityPage() {
  const { t, user, detectedArea, apiFetch } = useApp();
  const [scope, setScope] = useState<'national' | 'state' | 'lga'>('national');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'latest' | 'active'>('latest');
  const [languageFilter, setLanguageFilter] = useState('all');

  // Composer state
  const [content, setContent] = useState('');
  const [postScope, setPostScope] = useState<'national' | 'state' | 'lga'>('lga');
  const [postLang, setPostLang] = useState('English');
  const [contentType, setContentType] = useState<'text' | 'voice' | 'image'>('text');
  const [relatedCaseRef, setRelatedCaseRef] = useState('');
  const [composerError, setComposerError] = useState<string | null>(null);
  const [composerSuccess, setComposerSuccess] = useState<string | null>(null);

  // Reply state
  const [openRepliesId, setOpenRepliesId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [flaggedNotice, setFlaggedNotice] = useState<string | null>(null);

  const loadPosts = () => {
    setLoading(true);
    const params = new URLSearchParams({
      scope,
      state: detectedArea.state,
      lga: detectedArea.lga,
    });
    apiFetch<{ posts: CommunityPost[] }>(`/api/posts?${params.toString()}`)
      .then((res) => setPosts(res.posts))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, detectedArea.state, detectedArea.lga]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setComposerError(null);
    setComposerSuccess(null);
    if (content.trim().length < 8) {
      setComposerError(t.hubPublishError);
      return;
    }
    try {
      await apiFetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          content: content.trim(),
          scope: postScope,
          state: detectedArea.state,
          lga: detectedArea.lga,
          language: postLang,
          contentType,
          authorName: user?.fullName || 'Citizen contributor',
          relatedCaseReference: relatedCaseRef.trim() || null,
        }),
      });
      setContent('');
      setRelatedCaseRef('');
      setComposerSuccess(t.hubPublished);
      loadPosts();
    } catch (err) {
      setComposerError(err instanceof Error ? err.message : t.hubPublishError);
    }
  };

  const reactToPost = async (postId: number, reaction: 'solidarity' | 'witnessed' | 'amplify') => {
    const updated = await apiFetch<{
      solidarity_count: number;
      witnessed_count: number;
      amplify_count: number;
    }>(`/api/posts/${postId}/react`, {
      method: 'POST',
      body: JSON.stringify({ reaction }),
    });
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...updated } : p)));
  };

  const submitReply = async (postId: number) => {
    const txt = (replyText[postId] || '').trim();
    if (!txt) return;
    const res = await apiFetch<{ replies: PostReply[] }>(`/api/posts/${postId}/replies`, {
      method: 'POST',
      body: JSON.stringify({
        content: txt,
        authorName: user?.fullName || 'Citizen contributor',
      }),
    });
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, replies: res.replies, reply_count: res.replies.length } : p))
    );
    setReplyText((prev) => ({ ...prev, [postId]: '' }));
  };

  const flagPost = async (postId: number) => {
    await apiFetch(`/api/posts/${postId}/flag`, { method: 'POST', body: '{}' });
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setFlaggedNotice(t.hubFlagged);
  };

  const visiblePosts = [...posts]
    .filter((post) => languageFilter === 'all' || post.language === languageFilter)
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (sort === 'active') {
        const scoreA = a.solidarity_count + a.witnessed_count + a.amplify_count + a.reply_count;
        const scoreB = b.solidarity_count + b.witnessed_count + b.amplify_count + b.reply_count;
        return scoreB - scoreA;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="section-stack">
      {/* Hub header */}
      <section className="card stack-16" aria-labelledby="hub-heading">
        <div className="row-between">
          <div className="stack-8">
            <span className="overline">
              {detectedArea.lga}, {detectedArea.state}
            </span>
            <div className="row-wrap">
              <Users size={22} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <h1 id="hub-heading">{t.hubTitle}</h1>
            </div>
          </div>
          <span className="badge badge-primary">
            <ShieldCheck size={13} aria-hidden="true" />
            <span>{t.hubModerated}</span>
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '760px' }}>{t.hubSubtitle}</p>
      </section>

      {/* Three hub destinations */}
      <div className="grid-3">
        <article className="card stack-12">
          <div className="row-wrap">
            <MessageSquare size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <h2 style={{ fontSize: 'var(--text-16)' }}>{t.hubCardFeedTitle}</h2>
          </div>
          <p className="field-hint" style={{ flexGrow: 1 }}>
            {t.hubCardFeedBody}
          </p>
          <span className="badge" style={{ alignSelf: 'flex-start' }}>
            {posts.length} {t.hubCardFeedTitle.split(' ')[0].toLowerCase()}
          </span>
        </article>

        <article className="card stack-12">
          <div className="row-wrap">
            <Rss size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <h2 style={{ fontSize: 'var(--text-16)' }}>{t.hubCardLiveTitle}</h2>
          </div>
          <p className="field-hint" style={{ flexGrow: 1 }}>
            {t.hubCardLiveBody}
          </p>
          <div className="row-wrap" style={{ gap: 'var(--sp-4)' }}>
            {PLATFORM_ORDER.map((key) => (
              <span key={key} style={{ color: 'var(--primary)' }} aria-hidden="true">
                <PlatformGlyph platform={key} size={14} />
              </span>
            ))}
          </div>
          <Link to="/live-feed" className="btn btn-secondary btn-sm">
            <span>{t.hubCardLiveTitle}</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </article>

        <article className="card stack-12">
          <div className="row-wrap">
            <Flame size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <h2 style={{ fontSize: 'var(--text-16)' }}>{t.hubCardTrendTitle}</h2>
          </div>
          <p className="field-hint" style={{ flexGrow: 1 }}>
            {t.hubCardTrendBody}
          </p>
          <Link to="/trending" className="btn btn-secondary btn-sm">
            <span>{t.hubCardTrendTitle}</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </article>
      </div>

      {/* Composer */}
      <section className="card stack-20" aria-labelledby="community-composer-heading">
        <h2 id="community-composer-heading" style={{ fontSize: 'var(--text-18)' }}>
          {t.hubComposerTitle}
        </h2>
        <form onSubmit={handlePublish} className="stack-16" noValidate>
          <div className="grid-3">
            <div className="field">
              <label htmlFor="post-scope" className="field-label">
                {t.hubScope}
              </label>
              <select
                id="post-scope"
                className="select"
                value={postScope}
                onChange={(e) => setPostScope(e.target.value as 'lga' | 'state' | 'national')}
              >
                <option value="lga">
                  {t.hubScopeLga} ({detectedArea.lga})
                </option>
                <option value="state">
                  {t.hubScopeState} ({detectedArea.state})
                </option>
                <option value="national">{t.hubScopeNational}</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="post-lang" className="field-label">
                {t.hubLanguage}
              </label>
              <select
                id="post-lang"
                className="select"
                value={postLang}
                onChange={(e) => setPostLang(e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.englishName}>
                    {l.nativeName}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="post-type" className="field-label">
                {t.hubFormat}
              </label>
              <select
                id="post-type"
                className="select"
                value={contentType}
                onChange={(e) => setContentType(e.target.value as 'text' | 'voice' | 'image')}
              >
                <option value="text">{t.hubFormatText}</option>
                <option value="voice">{t.hubFormatVoice}</option>
                <option value="image">{t.hubFormatImage}</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="community-post-body" className="field-label">
              {t.hubComposerTitle}
            </label>
            <div className="input-with-voice">
              <textarea
                id="community-post-body"
                className="textarea"
                placeholder={t.hubPlaceholder}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <VoiceMicButton
                fieldLabel={t.hubComposerTitle}
                onTranscript={(spoken) => setContent((prev) => (prev ? `${prev} ${spoken}` : spoken))}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="post-case-ref" className="field-label">
              {t.hubCaseOptional}
            </label>
            <input
              id="post-case-ref"
              className="input mono"
              placeholder="CWN-2026-LA-10482"
              value={relatedCaseRef}
              onChange={(e) => setRelatedCaseRef(e.target.value)}
            />
          </div>

          {composerError && (
            <p className="field-error" role="alert">
              {composerError}
            </p>
          )}
          {composerSuccess && (
            <p role="status" aria-live="polite" style={{ color: 'var(--success)', fontWeight: 600 }}>
              {composerSuccess}
            </p>
          )}

          <div>
            <button type="submit" className="btn btn-primary">
              <Send size={16} aria-hidden="true" />
              <span>{t.hubPublish}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Scope, sort and language filters */}
      <div className="stack-12">
        <div className="chip-row" role="group" aria-label={t.hubScope}>
          <button
            type="button"
            className={`chip ${scope === 'national' ? 'active' : ''}`}
            aria-pressed={scope === 'national'}
            onClick={() => setScope('national')}
          >
            {t.hubScopeNational}
          </button>
          <button
            type="button"
            className={`chip ${scope === 'state' ? 'active' : ''}`}
            aria-pressed={scope === 'state'}
            onClick={() => setScope('state')}
          >
            {t.hubScopeState}
          </button>
          <button
            type="button"
            className={`chip ${scope === 'lga' ? 'active' : ''}`}
            aria-pressed={scope === 'lga'}
            onClick={() => setScope('lga')}
          >
            {t.hubScopeLga}
          </button>
        </div>

        <div className="grid-2">
          <div className="chip-row" role="group" aria-label={t.hubSortActive}>
            <button
              type="button"
              className={`chip ${sort === 'latest' ? 'active' : ''}`}
              aria-pressed={sort === 'latest'}
              onClick={() => setSort('latest')}
            >
              {t.hubSortLatest}
            </button>
            <button
              type="button"
              className={`chip ${sort === 'active' ? 'active' : ''}`}
              aria-pressed={sort === 'active'}
              onClick={() => setSort('active')}
            >
              {t.hubSortActive}
            </button>
          </div>

          <div className="field">
            <label htmlFor="hub-language-filter" className="field-label">
              {t.hubLanguage}
            </label>
            <select
              id="hub-language-filter"
              className="select"
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
            >
              <option value="all">{t.all}</option>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.englishName}>
                  {l.nativeName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {flaggedNotice && (
        <div className="card-subtle" role="status" aria-live="polite">
          <p style={{ fontSize: 'var(--text-14)' }}>{flaggedNotice}</p>
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="stack-16">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton">
              <div className="skeleton-line" style={{ width: '40%' }} />
              <div className="skeleton-line" style={{ width: '90%' }} />
              <div className="skeleton-line" style={{ width: '60%' }} />
            </div>
          ))}
        </div>
      ) : visiblePosts.length === 0 ? (
        <section className="card stack-12">
          <h2 style={{ fontSize: 'var(--text-18)' }}>{t.hubEmpty}</h2>
          <p className="field-hint">{t.hubGuidelinesBody}</p>
        </section>
      ) : (
        <div className="stack-16">
          {visiblePosts.map((post) => {
            const TypeIcon =
              post.content_type === 'voice' ? Mic : post.content_type === 'image' ? ImageIcon : FileText;
            const repliesOpen = openRepliesId === post.id;

            return (
              <article key={post.id} className="card stack-16">
                <div className="row-between">
                  <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                    <strong>{post.author_name}</strong>
                    <span className="badge">{post.author_badge}</span>
                    {post.isPinned && (
                      <span className="badge badge-primary">
                        <Pin size={12} aria-hidden="true" />
                        <span>{t.hubPinned}</span>
                      </span>
                    )}
                    <span className="badge badge-info">
                      <TypeIcon size={12} aria-hidden="true" />
                      <span>{post.language}</span>
                    </span>
                    <span className="badge">
                      {post.lga}, {post.state}
                    </span>
                  </div>
                  <ListenButton text={post.content} label={post.author_name} />
                </div>

                <p style={{ fontSize: 'var(--text-16)' }}>{post.content}</p>

                {post.attachments.length > 0 && (
                  <div className="card-subtle">
                    {post.attachments.map((att, idx) => (
                      <span key={idx} className="field-hint">
                        {att.kind === 'voice_transcript'
                          ? `${t.hubFormatVoice} (${att.durationSec || 25}s)`
                          : att.label || t.hubFormatImage}
                      </span>
                    ))}
                  </div>
                )}

                {post.related_case_reference && (
                  <div>
                    <Link
                      to={`/cases/${post.related_case_reference}`}
                      className="mono badge badge-primary"
                      style={{ textDecoration: 'none' }}
                    >
                      {t.hubCaseOptional.split('(')[0].trim()}: {post.related_case_reference}
                    </Link>
                  </div>
                )}

                <div
                  className="row-between"
                  style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--sp-12)' }}
                >
                  <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => reactToPost(post.id, 'solidarity')}
                    >
                      <HeartHandshake size={16} aria-hidden="true" />
                      <span>
                        {t.hubSolidarity} ({post.solidarity_count})
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => reactToPost(post.id, 'witnessed')}
                    >
                      <Eye size={16} aria-hidden="true" />
                      <span>
                        {t.hubWitnessed} ({post.witnessed_count})
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => reactToPost(post.id, 'amplify')}
                    >
                      <Share2 size={16} aria-hidden="true" />
                      <span>
                        {t.hubAmplify} ({post.amplify_count})
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setOpenRepliesId(repliesOpen ? null : post.id)}
                      aria-expanded={repliesOpen}
                    >
                      <MessageSquare size={16} aria-hidden="true" />
                      <span>
                        {t.hubReplies} ({post.reply_count})
                      </span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => flagPost(post.id)}
                    aria-label={`${t.hubFlag}: ${post.author_name}`}
                  >
                    <Flag size={15} aria-hidden="true" />
                    <span>{t.hubFlag}</span>
                  </button>
                </div>

                {repliesOpen && (
                  <div className="card-subtle stack-12">
                    {post.replies.map((rep) => (
                      <div key={rep.id} className="stack-8" style={{ gap: 'var(--sp-4)' }}>
                        <strong style={{ fontSize: 'var(--text-13)' }}>{rep.author_name}</strong>
                        <p style={{ fontSize: 'var(--text-14)' }}>{rep.content}</p>
                      </div>
                    ))}
                    <div className="row-wrap">
                      <label htmlFor={`reply-input-${post.id}`} className="sr-only">
                        {t.hubReplyPlaceholder}
                      </label>
                      <input
                        id={`reply-input-${post.id}`}
                        className="input"
                        style={{ flex: 1 }}
                        placeholder={t.hubReplyPlaceholder}
                        value={replyText[post.id] || ''}
                        onChange={(e) => setReplyText((prev) => ({ ...prev, [post.id]: e.target.value }))}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => submitReply(post.id)}
                      >
                        {t.hubReplies.slice(0, -1)}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Guidelines */}
      <section className="card-subtle stack-8">
        <span className="overline">{t.hubGuidelinesTitle}</span>
        <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{t.hubGuidelinesBody}</p>
      </section>
    </div>
  );
}
