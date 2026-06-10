import { useEffect } from 'react';

/* ── Modal ─────────────────────────────────────────────────────────────────
   Generic modal shell shared by every dialog. Owns the behaviour that used to
   be copy-pasted into each modal: the full-screen overlay, backdrop-click to
   close, Esc-to-close, the click-through guard on the box, and the RTL + a11y
   attributes. Class names are passed in so each modal keeps its own box styling
   (e.g. ReviewModal's `.rv-*`), and `showClose` renders the standard ✕ button. */
export default function Modal({
  onClose,
  closeOnBackdrop = true,
  showClose = false,
  overlayClassName = 'modal-overlay',
  className = 'modal-box',
  role = 'dialog',
  children,
}) {
  useEffect(() => {
    if (!onClose) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className={overlayClassName}
      onClick={closeOnBackdrop && onClose ? onClose : undefined}
    >
      <div
        className={className}
        dir="rtl"
        role={role}
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {showClose && onClose && (
          <button type="button" className="modal-close" onClick={onClose} aria-label="סגור">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
