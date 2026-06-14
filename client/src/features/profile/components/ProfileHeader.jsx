import AvatarEditor from './AvatarEditor';

export default function ProfileHeader({ name, initial, memberSince, area, email, avatar }) {
  return (
    <div className="prof-head">
      <AvatarEditor name={name} initial={initial} avatar={avatar} />

      <div className="prof-id">
        <div className="prof-name-row">
          <span className="prof-name">{name}</span>
          <span className="prof-verified">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l2.4 1.8 3 .1 1 2.8 2.4 1.7-.9 2.9.9 2.9-2.4 1.7-1 2.8-3 .1L12 23l-2.4-1.8-3-.1-1-2.8L3.2 16.6l.9-2.9-.9-2.9L5.6 9l1-2.8 3-.1z"/><path d="M16.5 9.5 11 15l-2.8-2.8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            מאומת
          </span>
        </div>
        <div className="prof-loc">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>{area || 'הוסיפו את השכונה שלכם'}</span>
        </div>
        <div className="prof-meta">
          {memberSince && (
            <span className="mi">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="1"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              חבר/ה מאז {memberSince}
            </span>
          )}
          <span className="mi">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 21l1.9-4.1A8.38 8.38 0 1 1 21 11.5z"/></svg>
            {email}
          </span>
        </div>
      </div>
    </div>
  );
}
