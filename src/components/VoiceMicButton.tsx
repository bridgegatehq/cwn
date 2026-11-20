import { useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { LANGUAGES } from '../data/i18n';
import { useApp } from '../context/AppContext';

interface VoiceMicButtonProps {
  onTranscript: (text: string) => void;
  fieldLabel: string;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export function VoiceMicButton({ onTranscript, fieldLabel }: VoiceMicButtonProps) {
  const { lang } = useApp();
  const [listening, setListening] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);

  const toggleDictation = () => {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const RecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!RecognitionCtor) {
      setStatusMsg('Voice dictation is not supported in this browser. You can type directly or use Chrome/Edge voice input.');
      return;
    }

    if (listening && recRef.current) {
      recRef.current.stop();
      setListening(false);
      setStatusMsg(null);
      return;
    }

    try {
      const rec = new RecognitionCtor();
      const langMeta = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
      rec.lang = langMeta.bcp47;
      rec.interimResults = false;
      rec.continuous = false;

      rec.onresult = (event) => {
        const transcriptParts: string[] = [];
        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item && item[0]) {
            transcriptParts.push(item[0].transcript);
          }
        }
        const combined = transcriptParts.join(' ').trim();
        if (combined) {
          onTranscript(combined);
          setStatusMsg('Voice transcribed into field.');
        }
      };

      rec.onerror = (event) => {
        setListening(false);
        setStatusMsg(
          event.error === 'not-allowed'
            ? 'Microphone permission was declined. Enable microphone access or continue typing.'
            : 'Could not capture audio clearly. Try again or type directly.'
        );
      };

      rec.onend = () => {
        setListening(false);
      };

      recRef.current = rec;
      setStatusMsg('Listening now — speak clearly, or press Stop to cancel.');
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
      setStatusMsg('Voice input is unavailable right now. Please type into the field.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--sp-4)' }}>
      <button
        type="button"
        onClick={toggleDictation}
        className={listening ? 'btn btn-danger btn-sm' : 'btn btn-secondary btn-sm'}
        aria-pressed={listening}
        aria-label={listening ? `Cancel voice input for ${fieldLabel}` : `Speak into ${fieldLabel}`}
        title={listening ? 'Stop voice capture' : `Dictate ${fieldLabel}`}
      >
        {listening ? <Square size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
        <span>{listening ? 'Stop' : 'Speak'}</span>
      </button>
      {statusMsg && (
        <span className="field-hint" role="status" aria-live="polite" style={{ maxWidth: '240px', textAlign: 'right' }}>
          {statusMsg}
        </span>
      )}
    </div>
  );
}
