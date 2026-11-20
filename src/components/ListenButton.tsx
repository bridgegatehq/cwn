import { useEffect, useState } from 'react';
import { Volume2, Square } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { LANGUAGES } from '../data/i18n';
import { useApp } from '../context/AppContext';

interface ListenButtonProps {
  text: string;
  label?: string;
}

export function ListenButton({ text, label }: ListenButtonProps) {
  const { lang, t } = useApp();
  const location = useLocation();
  const [speaking, setSpeaking] = useState(false);
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);

  // Cancel speech on route navigation or unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setSpeaking(false);
    };
  }, [location.pathname]);

  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setFallbackNote('Read-aloud is not supported in this browser.');
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langMeta = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice =
      voices.find((v) => v.lang.toLowerCase().startsWith(langMeta.code)) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(langMeta.bcp47.toLowerCase()));

    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
      setFallbackNote(null);
    } else {
      const englishVoice = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
      if (englishVoice) utterance.voice = englishVoice;
      utterance.lang = 'en-NG';
      if (lang !== 'en' && lang !== 'pcm') {
        setFallbackNote(`Device lacks a ${langMeta.nativeName} voice; reading with English voice.`);
      } else {
        setFallbackNote(null);
      }
    }

    utterance.rate = 0.96;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <button
        type="button"
        onClick={toggleSpeech}
        className={speaking ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
        aria-pressed={speaking}
        aria-label={speaking ? t.stopListening : `${t.listen}${label ? `: ${label}` : ''}`}
      >
        {speaking ? <Square size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
        <span>{speaking ? t.stopListening : t.listen}</span>
      </button>
      {fallbackNote && (
        <span className="field-hint" role="status" aria-live="polite">
          {fallbackNote}
        </span>
      )}
    </div>
  );
}
