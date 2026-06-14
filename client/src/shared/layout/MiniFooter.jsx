export default function MiniFooter({ note = 'השאלה שיתופית' }) {
  return (
    <footer className="mini-footer">
      <div className="wrap">
        <img className="mf-logo" src="/images/logo-light.png" alt="Click & Pick" />
        <span>© {new Date().getFullYear()} Click&Pick · {note}</span>
      </div>
    </footer>
  );
}
