import Modal from './Modal';
import '../item/LoanRequestModal.css'; // reuse the shared .modal-overlay / .modal-box shell
import './ConfirmDialog.css';

/* ── ConfirmDialog ─────────────────────────────────────────────────────────
   Small, reusable confirmation modal. Generic on purpose (title/message/labels)
   so any destructive action can reuse it. Shows an inline error (e.g. a server
   rejection) without closing, and disables both buttons while `busy`.          */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'אישור',
  busyLabel,
  cancelLabel = 'ביטול',
  danger = false,
  busy = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      onClose={busy ? undefined : onCancel}
      closeOnBackdrop={!busy}
      className="modal-box confirm-box"
      role="alertdialog"
    >
        <div className="confirm-body">
          {danger && (
            <span className="confirm-ic" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </span>
          )}

          <h2 className="confirm-title">{title}</h2>
          <p className="confirm-text">{message}</p>

          {error && <p className="confirm-error">{error}</p>}

          <div className="confirm-actions">
            <button type="button" className="confirm-cancel" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </button>
            <button
              type="button"
              className={danger ? 'confirm-go danger' : 'confirm-go'}
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? (busyLabel || confirmLabel) : confirmLabel}
            </button>
          </div>
        </div>
    </Modal>
  );
}
