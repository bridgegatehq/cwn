import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';

interface ConsentDialogProps {
  open: boolean;
  title: string;
  whatHappens: string;
  confirmationText: string;
  confirmButtonLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ConsentDialog({
  open,
  title,
  whatHappens,
  confirmationText,
  confirmButtonLabel,
  onConfirm,
  onCancel,
  busy = false,
}: ConsentDialogProps) {
  const [checked, setChecked] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setChecked(false);
      closeBtnRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="backdrop" role="dialog" aria-modal="true" aria-labelledby="consent-dialog-title">
      <div className="modal-panel">
        <div className="row-between">
          <div className="row-wrap">
            <ShieldCheck size={22} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <h2 id="consent-dialog-title" style={{ fontSize: 'var(--text-22)' }}>
              {title}
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="btn-icon"
            onClick={onCancel}
            aria-label="Close consent dialog"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="card-subtle stack-12">
          <p className="overline">What will happen</p>
          <p style={{ fontSize: 'var(--text-14)', color: 'var(--text)' }}>{whatHappens}</p>
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--sp-12)',
            cursor: 'pointer',
            padding: 'var(--sp-12)',
            borderRadius: 'var(--radius-btn)',
            border: '1px solid var(--border-strong)',
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            style={{ width: 22, height: 22, marginTop: 2, accentColor: 'var(--primary)', flexShrink: 0 }}
          />
          <span style={{ fontSize: 'var(--text-14)', color: 'var(--text)' }}>{confirmationText}</span>
        </label>

        {!checked && (
          <p className="field-hint" role="status">
            Tick the confirmation box above to enable "{confirmButtonLabel}".
          </p>
        )}

        <div className="row-between" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!checked || busy}
            onClick={onConfirm}
          >
            {busy ? 'Processing...' : confirmButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
