import { useEffect, useRef, useState } from 'react';
import { fetchAudioObjectUrl } from '../../../shared/services/api';
import useAudioRecorder from '../hooks/useAudioRecorder';
import './chatWindow.css';

const fmtTime = (ts) =>
    ts
        ? new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
        : '';

const fmtDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
};

const CwIcon = ({ name, alt }) => <img src={`/images/${name}.png`} alt={alt} className="cw-icon" />;


function AudioMessage({ src, token }) {
    const [objUrl, setObjUrl] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let created = null;
        const load = async () => {
            try {
                const u = await fetchAudioObjectUrl(src, token);
                if (cancelled) { URL.revokeObjectURL(u); return; }
                created = u;
                setObjUrl(u);
            } catch {
                if (!cancelled) setFailed(true);
            }
        };
        load();
        return () => {
            cancelled = true;
            if (created) URL.revokeObjectURL(created);
        };
    }, [src, token]);

    if (failed) return <span className="cw-bubble">לא ניתן לטעון את ההקלטה</span>;
    if (!objUrl) return <span className="cw-bubble cw-audio-loading">טוען הקלטה…</span>;
    return <audio className="cw-audio" src={objUrl} controls preload="none" />;
}

export default function ChatWindow({ recipientName, messages, connected, error, token, onSend, onClose }) {
    const [text, setText] = useState('');
    const listRef = useRef(null);

    const { recState, seconds, recError, startRecording, stopRecording, cancelRecording }
        = useAudioRecorder({ token, onSend });

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages]);

    function handleSubmit(e) {
        e.preventDefault();
        const t = text.trim();
        if (!t || !connected) return;
        onSend(t, 'text');
        setText('');
    }

    return (
        <div className="cw" dir="rtl" role="dialog" aria-label={`צ'ט עם ${recipientName}`}>
            <div className="cw-head">
                <div className="cw-head-info">
                    <span className="cw-name">{recipientName}</span>
                    <span className={`cw-dot ${connected ? 'on' : 'off'}`} />
                    <span className="cw-status-lbl">{connected ? 'מחובר' : 'מתחבר…'}</span>
                </div>
                <button className="cw-close" onClick={onClose} aria-label="סגור צ'ט">✕</button>
            </div>

            <div className="cw-msgs" ref={listRef}>
                {messages.length === 0 && (
                    <p className="cw-empty">שלחו הודעה ל{recipientName} לתיאום האיסוף</p>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`cw-msg ${m.isMine ? 'mine' : 'theirs'}`}>
                        {m.type === 'audio'
                            ? <AudioMessage src={m.text} token={token} />
                            : <span className="cw-bubble">{m.text}</span>}
                        <span className="cw-time">{fmtTime(m.timestamp)}</span>
                    </div>
                ))}
            </div>

            {(error || recError) && <p className="cw-err">{error || recError}</p>}

            {recState === 'recording' ? (
                <div className="cw-form cw-rec">
                    <button className="cw-rec-cancel" type="button" onClick={cancelRecording} aria-label="בטל הקלטה">✕</button>
                    <span className="cw-rec-live">
                        <span className="cw-rec-dot" />
                        מקליט… {fmtDuration(seconds)}
                    </span>
                    <button className="cw-send" type="button" onClick={stopRecording}><CwIcon name="send" alt="שלח" /></button>
                </div>
            ) : recState === 'uploading' ? (
                <div className="cw-form cw-rec">
                    <span className="cw-rec-live">מעלה הקלטה…</span>
                </div>
            ) : (
                <form className="cw-form" onSubmit={handleSubmit}>
                    <input
                        className="cw-input"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="כתבו הודעה…"
                        disabled={!connected}
                        autoFocus
                    />
                    <button
                        className="cw-mic"
                        type="button"
                        onClick={startRecording}
                        disabled={!connected}
                        aria-label="הקלטת הודעה קולית"
                        title="הקלטת הודעה קולית"
                    >
                        <CwIcon name="record" alt="הקלטה" />
                    </button>
                    <button className="cw-send" type="submit" disabled={!connected || !text.trim()}>
                        <CwIcon name="send" alt="שלח" />
                    </button>
                </form>
            )}
        </div>
    );
}
