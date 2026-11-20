import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Clock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Landmark,
  AlertTriangle,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ListenButton } from '../components/ListenButton';
import { KnowledgeTopicGraphic } from '../components/CivicGraphics';

interface GuideItem {
  id: number;
  slug: string;
  title: string;
  category: string;
  readingMinutes: number;
  summary: string;
  body: string[];
  keyPoints: string[];
  statutoryCitations: string[];
  practicalSteps: string[];
  whatNotToDo: string[];
  faqs: Array<{ q: string; a: string }>;
  relatedSlugs: string[];
  updatedAt: string;
}

export function KnowledgePage() {
  const { t, apiFetch } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSlug = searchParams.get('guide');

  const [guides, setGuides] = useState<GuideItem[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (searchQ.trim()) params.set('q', searchQ.trim());

    apiFetch<{ guides: GuideItem[] }>(`/api/knowledge?${params.toString()}`)
      .then((res) => setGuides(res.guides))
      .finally(() => setLoading(false));
  }, [apiFetch, category, searchQ]);

  const activeGuide = selectedSlug ? guides.find((g) => g.slug === selectedSlug) : null;

  const categories = [
    'all',
    'Police & detention',
    'Civil & property rights',
    'Family & human rights',
    'Healthcare, school & civil life',
    'Public accountability',
    'Reporting & safety',
    'Civic participation',
  ];

  // ---------------- FOCUSED SINGLE-TOPIC READER VIEW ----------------
  if (activeGuide) {
    const related = guides.filter((g) => activeGuide.relatedSlugs.includes(g.slug));
    const fullReadAloud = [
      activeGuide.title,
      activeGuide.summary,
      'Key takeaways:',
      activeGuide.keyPoints.join('. '),
      activeGuide.body.join(' '),
      activeGuide.practicalSteps.length > 0
        ? `Practical steps to take: ${activeGuide.practicalSteps.join('. ')}`
        : '',
    ].join('. ');

    return (
      <div className="section-stack" style={{ maxWidth: '820px', margin: '0 auto' }}>
        <div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setSearchParams({})}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back to all topics</span>
          </button>
        </div>

        <article className="media-card">
          <div style={{ borderBottom: '1px solid var(--border)' }}>
            <KnowledgeTopicGraphic category={activeGuide.category} />
          </div>

          <div className="media-card-body stack-32">
            <div className="row-between">
              <div className="row-wrap">
                <span className="badge badge-primary">{activeGuide.category}</span>
                <span className="badge">
                  <Clock size={13} aria-hidden="true" />
                  <span>{activeGuide.readingMinutes} min read</span>
                </span>
              </div>
              <ListenButton text={fullReadAloud} label={activeGuide.title} />
            </div>

            <div className="stack-16">
              <h1>{activeGuide.title}</h1>
              <p style={{ fontSize: 'var(--text-18)', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                {activeGuide.summary}
              </p>
            </div>

            {/* Key Takeaways */}
            <div className="card-tint stack-12">
              <span className="overline" style={{ color: 'var(--primary)' }}>
                Core rights summary
              </span>
              <ul className="stack-8" style={{ margin: 0, paddingLeft: 'var(--sp-20)' }}>
                {activeGuide.keyPoints.map((pt, i) => (
                  <li key={i} style={{ fontSize: 'var(--text-14)', fontWeight: 500 }}>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>

            {/* Detailed Plain-Language Explanation */}
            <div className="stack-20">
              <h2 style={{ fontSize: 'var(--text-22)' }}>What Nigerian law says in plain words</h2>
              {activeGuide.body.map((paragraph, i) => (
                <p key={i} style={{ fontSize: 'var(--text-16)', lineHeight: 1.75 }}>
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Nigerian Statutory & Constitutional Citations */}
            {activeGuide.statutoryCitations.length > 0 && (
              <div className="card-subtle stack-12">
                <div className="row-wrap">
                  <Landmark size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                  <h3 style={{ fontSize: 'var(--text-16)' }}>Statutory & constitutional authorities</h3>
                </div>
                <ul className="stack-8" style={{ margin: 0, paddingLeft: 'var(--sp-20)', fontSize: 'var(--text-14)' }}>
                  {activeGuide.statutoryCitations.map((cit, i) => (
                    <li key={i}>{cit}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Practical Step-by-Step Checklist + What Not To Do */}
            {(activeGuide.practicalSteps.length > 0 || activeGuide.whatNotToDo.length > 0) && (
              <div className="grid-2">
                {activeGuide.practicalSteps.length > 0 && (
                  <div className="card-subtle stack-12">
                    <div className="row-wrap">
                      <CheckCircle2 size={18} style={{ color: 'var(--success)' }} aria-hidden="true" />
                      <h3 style={{ fontSize: 'var(--text-16)' }}>Practical steps to take</h3>
                    </div>
                    <ol className="stack-8" style={{ margin: 0, paddingLeft: 'var(--sp-20)', fontSize: 'var(--text-14)' }}>
                      {activeGuide.practicalSteps.map((st, i) => (
                        <li key={i}>{st}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {activeGuide.whatNotToDo.length > 0 && (
                  <div className="card-subtle stack-12">
                    <div className="row-wrap">
                      <AlertTriangle size={18} style={{ color: 'var(--warning)' }} aria-hidden="true" />
                      <h3 style={{ fontSize: 'var(--text-16)' }}>Mistakes to avoid</h3>
                    </div>
                    <ul className="stack-8" style={{ margin: 0, paddingLeft: 'var(--sp-20)', fontSize: 'var(--text-14)' }}>
                      {activeGuide.whatNotToDo.map((dont, i) => (
                        <li key={i}>{dont}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Common Citizen Questions (FAQs) */}
            {activeGuide.faqs.length > 0 && (
              <div className="stack-16">
                <div className="row-wrap">
                  <HelpCircle size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                  <h2 style={{ fontSize: 'var(--text-22)' }}>Common citizen questions</h2>
                </div>
                <div className="stack-12">
                  {activeGuide.faqs.map((faq, i) => (
                    <div key={i} className="card-subtle stack-8">
                      <strong style={{ fontSize: 'var(--text-16)' }}>{faq.q}</strong>
                      <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="field-hint">
              Last reviewed {activeGuide.updatedAt}. Plain-language civic education only — never a substitute for personal representation by a qualified lawyer.
            </p>
          </div>
        </article>

        {/* Quiet In-Topic Related Guides */}
        {related.length > 0 && (
          <section className="stack-16" aria-labelledby="related-guides-heading">
            <h2 id="related-guides-heading" style={{ fontSize: 'var(--text-18)' }}>
              Related topics in the Knowledge Centre
            </h2>
            <div className="grid-2">
              {related.map((rel) => (
                <div key={rel.slug} className="media-card">
                  <div style={{ borderBottom: '1px solid var(--border)' }}>
                    <KnowledgeTopicGraphic category={rel.category} />
                  </div>
                  <div className="media-card-body stack-12">
                    <span className="badge">{rel.category}</span>
                    <h3 style={{ fontSize: 'var(--text-16)' }}>{rel.title}</h3>
                    <p className="field-hint">{rel.summary}</p>
                    <div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSearchParams({ guide: rel.slug })}
                      >
                        <span>Open topic</span>
                        <ArrowRight size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ---------------- KNOWLEDGE CENTRE DIRECTORY ----------------
  return (
    <div className="section-stack">
      {/* Editorial Header Card */}
      <section className="media-card" aria-labelledby="knowledge-hero-heading">
        <div className="media-frame" style={{ maxHeight: 210 }}>
          <img
            src="/images/pillar-rights-reading.jpg"
            alt="Two Nigerian citizens reading a constitutional rights handbook and listening on earphones"
          />
          <span className="media-caption-chip">
            <BookOpen size={14} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <span>7 Nigerian statutory & practical guides</span>
          </span>
        </div>

        <div className="media-card-body stack-12">
          <span className="overline">Constitutional, civil & human rights library</span>
          <h1 id="knowledge-hero-heading">{t.knowRights}</h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '720px' }}>
            In-depth, plain-language guides covering police stops, tenancy & land rights, emergency healthcare, school levies, gender protection orders, and Freedom of Information requests — with exact Nigerian statutory citations and audio read-aloud.
          </p>
        </div>
      </section>

      {/* Mobile-First Swipeable Filter Bar */}
      <section className="card stack-20" aria-label="Search and filter rights topics">
        <div className="field">
          <label htmlFor="knowledge-search" className="field-label">
            Search topics, laws, or everyday situations
          </label>
          <div style={{ position: 'relative' }}>
            <Search
              size={18}
              aria-hidden="true"
              style={{ position: 'absolute', left: 14, top: 15, color: 'var(--text-secondary)' }}
            />
            <input
              id="knowledge-search"
              type="search"
              className="input"
              style={{ paddingLeft: 42 }}
              placeholder="Search bail, eviction, hospital, VAPP, FOI Act, Section 35..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
          </div>
        </div>

        <div className="stack-8">
          <span className="field-label">Swipe or tap a topic category</span>
          <div className="mobile-snap-row" role="group" aria-label="Filter topics by category">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`chip ${category === cat ? 'active' : ''}`}
                aria-pressed={category === cat}
                onClick={() => setCategory(cat)}
              >
                {cat === 'all' ? 'All topics' : cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton">
              <div className="skeleton-line" style={{ width: '35%' }} />
              <div className="skeleton-line" style={{ width: '85%' }} />
              <div className="skeleton-line" style={{ width: '65%' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid-2">
          {guides.map((g) => (
            <article key={g.slug} className="media-card">
              <div style={{ borderBottom: '1px solid var(--border)' }}>
                <KnowledgeTopicGraphic category={g.category} />
              </div>

              <div className="media-card-body">
                <div className="row-between">
                  <span className="badge badge-primary">{g.category}</span>
                  <span className="field-hint">{g.readingMinutes} min read</span>
                </div>

                <div className="stack-8">
                  <h2 style={{ fontSize: 'var(--text-22)' }}>{g.title}</h2>
                  <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-secondary)' }}>{g.summary}</p>
                </div>

                {g.statutoryCitations.length > 0 && (
                  <div className="card-subtle stack-8" style={{ padding: 'var(--sp-12) var(--sp-16)' }}>
                    <span className="overline">Key statute covered</span>
                    <span style={{ fontSize: 'var(--text-13)' }}>{g.statutoryCitations[0]}</span>
                  </div>
                )}

                <ul className="stack-8" style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                  {g.keyPoints.slice(0, 2).map((pt, idx) => (
                    <li key={idx} className="row-wrap" style={{ fontSize: 'var(--text-13)', gap: 'var(--sp-8)' }}>
                      <CheckCircle2 size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} aria-hidden="true" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>

                <div className="row-wrap" style={{ marginTop: 'auto', paddingTop: 'var(--sp-8)' }}>
                  <ListenButton text={`${g.title}. ${g.summary} ${g.body.join(' ')}`} label={g.title} />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setSearchParams({ guide: g.slug })}
                  >
                    <span>Read complete guide</span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
