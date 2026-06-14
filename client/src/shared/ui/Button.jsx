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
