/* ── Button ────────────────────────────────────────────────────────────────
   Thin wrapper over the `.btn` utility family. Centralises the loading pattern
   that was repeated on every form: disable the button and swap its label while
   a request is in flight. `variant` maps to a `.btn-*` class; extra classes
   (e.g. `on-light`) go through `className`. */
export default function Button({
  variant = 'accent',
  type = 'button',
  loading = false,
  busyLabel,
  disabled = false,
  className = '',
  children,
  ...rest
}) {
  const classes = ['btn', variant && `btn-${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {loading ? (busyLabel ?? children) : children}
    </button>
  );
}
