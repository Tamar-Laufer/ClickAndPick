/* ── FormInput ─────────────────────────────────────────────────────────────
   A single labelled field using the shared `.field` wrapper (label + input).
   Forwards every standard input prop (value, onChange, required, type, …). */
export default function FormInput({ label, name, type = 'text', ...rest }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input name={name} type={type} {...rest} />
    </div>
  );
}
