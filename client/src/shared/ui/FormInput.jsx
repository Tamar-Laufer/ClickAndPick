export default function FormInput({ label, name, type = 'text', ...rest }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input name={name} type={type} {...rest} />
    </div>
  );
}
