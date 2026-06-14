import './Loader.css';

export default function Loader({ label = 'טוען…', className = '' }) {
  return (
    <div className={`loader ${className}`.trim()} role="status" aria-live="polite">
      <span className="loader-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
