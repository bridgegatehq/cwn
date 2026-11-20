import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Equal, Flame, Grid3x3, Hash, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NIGERIA_STATES } from '../data/nigeriaData';
import { PlatformGlyph, PLATFORM_LABELS, PLATFORM_ORDER } from '../components/PlatformGlyph';
import { Sparkline } from '../components/Sparkline';

interface TrendTopic {
  id: number;
  slug: string;
  title: string;
  hashtag: string;
  category: string;
  summary: string;
  mentions: { h24: number; d7: number; d30: number };
  windowMentions: number;
  changePct: number;
  momentum: string;
  states: string[];
  platformMix: Record<string, number>;
  series: number[];
  topVoices: string[];
  relatedCaseRef: string | null;
  relatedPetitionId: number | null;
  isSample: boolean;
  updatedAt: string;
}

interface TrendingResponse {
  window: string;
  topics: TrendTopic[];
  platformMix: Array<{ platform: string; mentions: number; sharePct: number }>;
  rankedHashtags: Array<{ hashtag: string; mentions: number; momentum: string; changePct: number }>;
  matrix: Array<{ slug: string; hashtag: string; cells: Array<{ platform: string; mentions: number }> }>;
  topVoices: Array<{ handle: string; platform: string; mentions: number }>;
  summary: {
    rising: number;
    steady: number;
    cooling: number;
    totalMentions: number;
    topics: number;
    statesCovered: number;
  };
  categories: string[];
  sampleDataNotice: string;
}

function momentumMeta(momentum: string, t: ReturnType<typeof useApp>['t']) {
  if (momentum === 'rising') {
    return {
      label: t.trendMomentumRising,
      badge: 'badge badge-success',
      icon: <ArrowUpRight size={13} aria-hidden="true" />,
      tone: 'primary' as const,
    };
  }
  if (momentum === 'cooling') {
    return {
      label: t.trendMomentumCooling,
      badge: 'badge badge-warning',
      icon: <ArrowDownRight size={13} aria-hidden="true" />,
      tone: 'warning' as const,
    };
  }
  return {
    label: t.trendMomentumSteady,
    badge: 'badge badge-info',
    icon: <Equal size={13} aria-hidden="true" />,
    tone: 'info' as const,
  };
}

export function TrendingPage() {
  const { t, detectedArea, apiFetch } = useApp();
  const [windowKey, setWindowKey] = useState('7d');
  const [platform, setPlatform] = useState('all');
  const [category, setCategory] = useState('all');
  const [state, setState] = useState('');
  const [data, setData] = useState<TrendingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ window: windowKey, platform, category });
      if (state) params.set('state', state);
      const res = await apiFetch<TrendingResponse>(`/api/trending?${params.toString()}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, windowKey, platform, category, state]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = data?.summary;

  return (
    <div className="section-stack">
      <section className="card stack-16" aria-labelledby="trending-heading">
        <div className="row-between">
          <div className="stack-8">
            <span className="overline">{t.trendPlatformMix}</span>
            <div className="row-wrap">
              <Flame size={22} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <h1 id="trending-heading">{t.trendTitle}</h1>
            </div>
          </div>
          <span className="badge">{t.sample}</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '760px' }}>{t.trendSubtitle}</p>

        {summary && (
          <div className="grid-3">
            <div className="card-subtle stack-8">
              <span className="overline">{t.trendTopicsLabel}</span>
              <strong style={{ fontSize: 'var(--text-28)' }}>{summary.topics}</strong>
              <span className="field-hint">
                {summary.rising} {t.trendMomentumRising} • {summary.steady} {t.trendMomentumSteady} • {summary.cooling}{' '}
                {t.trendMomentumCooling}
              </span>
            </div>
            <div className="card-subtle stack-8">
              <span className="overline">{t.trendMentions}</span>
              <strong style={{ fontSize: 'var(--text-28)' }}>{summary.totalMentions.toLocaleString()}</strong>
              <span className="field-hint">
                {windowKey === '24h' ? t.trendWindow24 : windowKey === '30d' ? t.trendWindow30 : t.trendWindow7}
              </span>
            </div>
            <div className="card-subtle stack-8">
              <span className="overline">{t.trendStatesLabel}</span>
              <strong style={{ fontSize: 'var(--text-28)' }}>{summary.statesCovered}</strong>
              <span className="field-hint">{detectedArea.state} • {t.trendAllPlatforms}</span>
            </div>
          </div>
        )}

        <p style={{ fontSize: 'var(--text-13)', color: 'var(--text-secondary)' }}>{data?.sampleDataNotice}</p>
      </section>

      {/* Window selector */}
      <div className="chip-row" role="group" aria-label={t.trendWindow7}>
        {[
          { key: '24h', label: t.trendWindow24 },
          { key: '7d', label: t.trendWindow7 },
          { key: '30d', label: t.trendWindow30 },
        ].map((option) => (
          <button
            key={option.key}
            type="button"
            className={`chip ${windowKey === option.key ? 'active' : ''}`}
            aria-pressed={windowKey === option.key}
            onClick={() => setWindowKey(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Platform selector */}
      <div className="chip-row" role="group" aria-label={t.trendAllPlatforms}>
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
          </button>
        ))}
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="trend-category" className="field-label">
            {t.trendCategory}
          </label>
          <select
            id="trend-category"
            className="select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">{t.trendAllCategories}</option>
            {(data?.categories || []).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="trend-state" className="field-label">
            {t.liveStateFilter}
          </label>
          <select id="trend-state" className="select" value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">{t.liveAllStates}</option>
            {NIGERIA_STATES.map((entry) => (
              <option key={entry.code} value={entry.name}>
                {entry.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton">
              <div className="skeleton-line" style={{ width: '42%' }} />
              <div className="skeleton-line" style={{ width: '84%' }} />
              <div className="skeleton-line" style={{ width: '58%' }} />
            </div>
          ))}
        </div>
      ) : !data || data.topics.length === 0 ? (
        <section className="card stack-12">
          <h2 style={{ fontSize: 'var(--text-18)' }}>{t.trendEmpty}</h2>
          <Link to="/live-feed" className="btn btn-secondary btn-sm">
            <span>{t.trendViewFeed}</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <>
          {/* Ranked topics */}
          <section className="stack-16" aria-labelledby="ranked-topics-heading">
            <div className="stack-8">
              <span className="overline">{t.trendTopicsLabel}</span>
              <h2 id="ranked-topics-heading">{t.trendMentions}</h2>
            </div>

            <ol className="stack-12" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {data.topics.map((topic, index) => {
                const meta = momentumMeta(topic.momentum, t);
                const mixTotal = Object.values(topic.platformMix).reduce((sum, n) => sum + n, 0) || 1;

                return (
                  <li key={topic.slug} className="card stack-16">
                    <div className="row-between">
                      <div className="row-wrap" style={{ gap: 'var(--sp-12)' }}>
                        <span
                          className="mono"
                          style={{
                            fontSize: 'var(--text-22)',
                            fontWeight: 700,
                            color: 'var(--text-secondary)',
                            minWidth: 34,
                          }}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="stack-8" style={{ gap: 'var(--sp-4)' }}>
                          <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                            <Hash size={15} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                            <strong style={{ fontSize: 'var(--text-16)' }}>{topic.hashtag}</strong>
                            <span className={meta.badge}>
                              {meta.icon}
                              <span>{meta.label}</span>
                            </span>
                            {topic.isSample && <span className="badge">{t.sample}</span>}
                          </div>
                          <span style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>
                            {topic.title} • {topic.category}
                          </span>
                        </div>
                      </div>

                      <div className="stack-8" style={{ alignItems: 'flex-end' }}>
                        <strong style={{ fontSize: 'var(--text-18)' }}>{topic.windowMentions.toLocaleString()}</strong>
                        <span className="field-hint">
                          {t.trendMentions} • {topic.changePct >= 0 ? '+' : ''}
                          {topic.changePct}%
                        </span>
                      </div>
                    </div>

                    <div className="row-between" style={{ alignItems: 'flex-end' }}>
                      <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)', maxWidth: '620px' }}>
                        {topic.summary}
                      </p>
                      <Sparkline
                        values={topic.series}
                        tone={meta.tone}
                        label={`${topic.hashtag}: ${topic.changePct}% ${meta.label}`}
                      />
                    </div>

                    {/* Per-platform breakdown */}
                    <div className="stack-8">
                      <span className="overline">{t.trendPlatformMix}</span>
                      <div className="stack-8">
                        {PLATFORM_ORDER.filter((key) => (topic.platformMix[key] || 0) > 0).map((key) => {
                          const value = topic.platformMix[key] || 0;
                          const pct = Math.round((value / mixTotal) * 100);
                          return (
                            <div key={key} className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                              <span
                                className="row-wrap"
                                style={{ gap: 'var(--sp-8)', minWidth: 118, fontSize: 'var(--text-13)' }}
                              >
                                <PlatformGlyph platform={key} size={14} />
                                <span>{PLATFORM_LABELS[key]}</span>
                              </span>
                              <div className="progress-track" style={{ flex: 1 }} aria-hidden="true">
                                <div className="progress-fill" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="mono" style={{ fontSize: 'var(--text-12)', minWidth: 76, textAlign: 'right' }}>
                                {value.toLocaleString()} ({pct}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="row-between">
                      <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                        {topic.topVoices.slice(0, 3).map((voice) => (
                          <span key={voice} className="mono badge">
                            {voice}
                          </span>
                        ))}
                        {topic.states.slice(0, 3).map((entry) => (
                          <span key={entry} className="badge badge-info">
                            {entry}
                          </span>
                        ))}
                      </div>
                      <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                        {topic.relatedCaseRef && (
                          <Link to={`/cases/${topic.relatedCaseRef}`} className="btn btn-ghost btn-sm">
                            <span>{t.trendRelatedCase}</span>
                            <ArrowRight size={14} aria-hidden="true" />
                          </Link>
                        )}
                        {topic.relatedPetitionId && (
                          <Link to={`/petitions/${topic.relatedPetitionId}`} className="btn btn-secondary btn-sm">
                            <span>{t.trendOpenPetition}</span>
                            <ArrowRight size={14} aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Platform mix */}
          <section className="card stack-16" aria-labelledby="platform-mix-heading">
            <div className="row-wrap">
              <Grid3x3 size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <h2 id="platform-mix-heading" style={{ fontSize: 'var(--text-18)' }}>
                {t.trendPlatformMix}
              </h2>
            </div>
            <ul className="stack-8" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {data.platformMix.map((row) => (
                <li key={row.platform} className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                  <span className="row-wrap" style={{ gap: 'var(--sp-8)', minWidth: 124, fontSize: 'var(--text-13)' }}>
                    <PlatformGlyph platform={row.platform} size={15} />
                    <span>{PLATFORM_LABELS[row.platform]}</span>
                  </span>
                  <div className="progress-track" style={{ flex: 1 }} aria-hidden="true">
                    <div className="progress-fill" style={{ width: `${row.sharePct}%` }} />
                  </div>
                  <span className="mono" style={{ fontSize: 'var(--text-12)', minWidth: 92, textAlign: 'right' }}>
                    {row.sharePct}% • {row.mentions.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Topic by platform matrix */}
          <section className="card stack-16" aria-labelledby="matrix-heading">
            <div className="row-wrap">
              <Grid3x3 size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <h2 id="matrix-heading" style={{ fontSize: 'var(--text-18)' }}>
                {t.trendMatrix}
              </h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
                <caption className="sr-only">{t.trendMatrix}</caption>
                <thead>
                  <tr>
                    <th
                      scope="col"
                      style={{
                        textAlign: 'left',
                        padding: 'var(--sp-8)',
                        fontSize: 'var(--text-12)',
                        color: 'var(--text-secondary)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {t.trendTopicsLabel}
                    </th>
                    {PLATFORM_ORDER.map((key) => (
                      <th
                        key={key}
                        scope="col"
                        style={{
                          padding: 'var(--sp-8)',
                          borderBottom: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <PlatformGlyph platform={key} size={14} />
                          <span className="sr-only">{PLATFORM_LABELS[key]}</span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.matrix.map((row) => (
                    <tr key={row.slug}>
                      <th
                        scope="row"
                        className="mono"
                        style={{
                          textAlign: 'left',
                          padding: 'var(--sp-8)',
                          fontSize: 'var(--text-12)',
                          borderBottom: '1px solid var(--border)',
                          fontWeight: 600,
                        }}
                      >
                        {row.hashtag}
                      </th>
                      {row.cells.map((cell) => (
                        <td
                          key={cell.platform}
                          className="mono"
                          style={{
                            padding: 'var(--sp-8)',
                            fontSize: 'var(--text-12)',
                            textAlign: 'center',
                            borderBottom: '1px solid var(--border)',
                            color: cell.mentions > 0 ? 'var(--text)' : 'var(--text-secondary)',
                          }}
                        >
                          {cell.mentions > 0 ? cell.mentions : '–'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Top voices */}
          <section className="card stack-16" aria-labelledby="voices-heading">
            <div className="row-wrap">
              <Users size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <h2 id="voices-heading" style={{ fontSize: 'var(--text-18)' }}>
                {t.trendTopVoices}
              </h2>
            </div>
            <div className="grid-2">
              {data.topVoices.map((voice) => (
                <div key={voice.handle} className="card-subtle row-between">
                  <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
                    <PlatformGlyph platform={voice.platform} size={16} />
                    <strong className="mono" style={{ fontSize: 'var(--text-13)' }}>
                      {voice.handle}
                    </strong>
                  </div>
                  <span className="field-hint">
                    {voice.mentions.toLocaleString()} {t.trendMentions}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="card-subtle row-between">
        <span style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{t.liveMetricsNote}</span>
        <div className="row-wrap">
          <Link to="/live-feed" className="btn btn-secondary btn-sm">
            <span>{t.trendViewFeed}</span>
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
