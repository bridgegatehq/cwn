import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale, ShieldAlert, Send, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { VoiceMicButton } from '../components/VoiceMicButton';
import { ListenButton } from '../components/ListenButton';

interface ChatTurn {
  role: 'citizen' | 'assistant';
  text: string;
  handoff?: { route: string; label: string };
}

export function AssistantPage() {
  const { t, apiFetch } = useApp();
  const [consentGiven, setConsentGiven] = useState(false);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: 'assistant',
      text: 'Welcome. I am a plain-language civic helper. I can explain general constitutional rights from our Knowledge Centre, walk through how report sealing works, or look up a CWN-YEAR-STATE-##### case status. I never give legal advice — for personal legal guidance, please connect with a real human advocate.',
      handoff: { route: '/justice', label: 'Find a verified human lawyer or advocate' },
    },
  ]);

  const askQuestion = async (promptText?: string) => {
    const q = (promptText ?? question).trim();
    if (!q || !consentGiven) return;
    setQuestion('');
    setTurns((prev) => [...prev, { role: 'citizen', text: q }]);
    setBusy(true);

    try {
      const res = await apiFetch<{
        reply: string;
        handoff: { route: string; label: string };
      }>('/api/assistant', {
        method: 'POST',
        body: JSON.stringify({ question: q, consentConfirmed: true }),
      });
      setTurns((prev) => [
        ...prev,
        { role: 'assistant', text: res.reply, handoff: res.handoff },
      ]);
    } catch (err) {
      setTurns((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            err instanceof Error
              ? err.message
              : 'Assistant is temporarily offline. You can read cached rights guides in the Knowledge Centre.',
          handoff: { route: '/knowledge', label: 'Open cached Knowledge Centre' },
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const quickPrompts = [
    'What are my rights during a police stop or detention?',
    'Check status of CWN-2026-LA-10482',
    'How do I file a Freedom of Information request?',
    'What is the difference between anonymous and verified reporting?',
  ];

  return (
    <div className="section-stack" style={{ maxWidth: '780px', margin: '0 auto' }}>
      <section className="stack-16">
        <span className="overline">Civic orientation helper</span>
        <h1>{t.assistant}</h1>
        <div
          className="card"
          style={{
            background: 'var(--warning-subtle)',
            borderColor: 'var(--warning-border)',
            borderLeft: '5px solid var(--warning-badge)',
          }}
        >
          <div className="row-wrap">
            <ShieldAlert size={20} style={{ color: 'var(--warning)' }} aria-hidden="true" />
            <strong style={{ fontSize: 'var(--text-14)' }}>
              Plain notice: General civic information only — never legal advice
            </strong>
          </div>
          <p style={{ fontSize: 'var(--text-14)', marginTop: 'var(--sp-8)', color: 'var(--text)' }}>
            This helper summarises public Nigerian laws (such as Section 35 of the 1999 Constitution and the FOI Act 2011) and checks case stage codes. It cannot assess legal strategy or act as your lawyer. Every answer includes a direct handoff to a verified human advocate.
          </p>
        </div>
      </section>

      {!consentGiven ? (
        <section className="card stack-16">
          <h2>Confirm before using the assistant</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-14)' }}>
            Before sending a question, confirm that you understand this helper provides general civic orientation only and is not a substitute for a qualified legal practitioner.
          </p>
          <div className="row-wrap">
            <button type="button" className="btn btn-primary" onClick={() => setConsentGiven(true)}>
              I understand — open civic assistant
            </button>
            <Link to="/justice" className="btn btn-secondary">
              <Scale size={18} aria-hidden="true" />
              <span>Skip assistant & speak to a real advocate</span>
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="chip-row" aria-label="Common questions">
            {quickPrompts.map((qp) => (
              <button
                key={qp}
                type="button"
                className="chip"
                onClick={() => void askQuestion(qp)}
                disabled={busy}
              >
                {qp}
              </button>
            ))}
          </div>

          <section className="card stack-16" aria-live="polite">
            {turns.map((turn, idx) => (
              <div
                key={idx}
                className={turn.role === 'assistant' ? 'card-subtle stack-12' : 'card-tint stack-8'}
              >
                <div className="row-between">
                  <span className="overline">
                    {turn.role === 'assistant' ? 'Civic helper (non-legal)' : 'Your question'}
                  </span>
                  {turn.role === 'assistant' && <ListenButton text={turn.text} label="Assistant answer" />}
                </div>
                <p style={{ fontSize: 'var(--text-16)' }}>{turn.text}</p>
                {turn.handoff && (
                  <div>
                    <Link to={turn.handoff.route} className="btn btn-secondary btn-sm">
                      <Scale size={15} aria-hidden="true" />
                      <span>{turn.handoff.label}</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </section>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void askQuestion();
            }}
            className="card stack-12"
          >
            <label htmlFor="assistant-question" className="field-label">
              Ask about constitutional rights, reporting privacy, or a CWN case reference
            </label>
            <div className="input-with-voice">
              <input
                id="assistant-question"
                className="input"
                placeholder="Type your question or paste CWN-2026-LA-10482..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <VoiceMicButton
                fieldLabel="Assistant question"
                onTranscript={(spoken) => setQuestion(spoken)}
              />
            </div>
            <div className="row-between">
              <Link to="/justice" className="btn btn-ghost btn-sm">
                Hand off directly to a human lawyer
              </Link>
              <button type="submit" className="btn btn-primary" disabled={busy || !question.trim()}>
                <Send size={16} aria-hidden="true" />
                <span>{busy ? 'Checking...' : 'Ask question'}</span>
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
