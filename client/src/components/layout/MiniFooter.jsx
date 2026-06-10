/* ── MiniFooter ────────────────────────────────────────────────────────────
   The slim dark footer shared by the inner pages (search, item, profile,
   checkout, admin). The markup + `.mini-footer` styles were duplicated in each
   page; this renders it once. `note` is the tagline after "ביחד ·" — defaults
   to the public-facing one, overridden to "לוח ניהול" on the admin dashboard. */
export default function MiniFooter({ note = 'שיתוף שכונתי' }) {
  return (
    <footer className="mini-footer">
      <div className="wrap">
        <img className="mf-logo" src="/images/logo-light.png" alt="Click & Pick" />
        <span>© {new Date().getFullYear()} ביחד · {note}</span>
      </div>
    </footer>
  );
}
