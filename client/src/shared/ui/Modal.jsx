import { useEffect } from 'react';
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
