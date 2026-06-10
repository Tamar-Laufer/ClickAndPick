import './Loader.css';

/* ── Loader ────────────────────────────────────────────────────────────────
   Consistent inline loading state (spinner + label). Renders inside the
   caller's own container class so existing page layout/spacing is preserved. */
export default function Loader({ label = 'טוען…', className = '' }) {
  return (
    <div className={`loader ${className}`.trim()} role="status" aria-live="polite">
      <span className="loader-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
