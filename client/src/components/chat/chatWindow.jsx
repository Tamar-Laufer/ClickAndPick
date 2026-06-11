import { useEffect, useRef, useState } from 'react';
import { uploadAudio, fetchAudioObjectUrl } from '../../services/api';
import './ChatWindow.css';

const fmtTime = (ts) =>
    ts
        ? new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
        : '';

const fmtDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
};

// Pick a container the browser's MediaRecorder actually supports (Chrome → webm,
// Safari → mp4). Empty string lets the browser choose its default.
function pickMimeType() {
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    return candidates.find((c) => MediaRecorder.isTypeSupported(c)) || '';
}

/**
 * Plays a private voice note. The audio folder isn't served statically and the
 * streaming route needs a bearer token, so a plain <audio src={protectedUrl}>
 * would 401 (the element can't send Authorization). Instead we fetch the blob
 * with the token and play it through a short-lived object URL.
 */
function AudioMessage({ src, token }) {
    const [objUrl, setObjUrl] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let created = null;
        fetchAudioObjectUrl(src, token)
            .then((u) => {
                if (cancelled) { URL.revokeObjectURL(u); return; }
                created = u;
                setObjUrl(u);
            })
            .catch(() => { if (!cancelled) setFailed(true); });
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
    // 'idle' | 'recording' | 'uploading'
    const [recState, setRecState] = useState('idle');
    const [seconds, setSeconds] = useState(0);
    const [recError, setRecError] = useState(null);

    const listRef = useRef(null);
    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);
    const timerRef = useRef(null);
    const cancelledRef = useRef(false);

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages]);

    // release the mic if the window unmounts mid-recording
    useEffect(() => () => stopTracks(), []);

    function stopTracks() {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    }

    function handleSubmit(e) {
        e.preventDefault();
        const t = text.trim();
        if (!t || !connected) return;
        onSend(t, 'text');
        setText('');
    }

    async function startRecording() {
        setRecError(null);
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            setRecError('הדפדפן אינו תומך בהקלטת קול');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const mimeType = pickMimeType();
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            recorderRef.current = recorder;
            chunksRef.current = [];
            cancelledRef.current = false;

            recorder.ondataavailable = (ev) => {
                if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
            };
            recorder.onstop = () => {
                stopTracks();
                if (cancelledRef.current) { setRecState('idle'); setSeconds(0); return; }
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
                setSeconds(0);
                uploadAndSend(blob);
            };

            recorder.start();
            setRecState('recording');
            setSeconds(0);
            timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
        } catch {
            stopTracks();
            setRecError('לא ניתן לגשת למיקרופון');
            setRecState('idle');
        }
    }

    function stopRecording() {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop(); // fires onstop → upload
        }
    }

    function cancelRecording() {
        cancelledRef.current = true;
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
        } else {
            stopTracks();
            setRecState('idle');
            setSeconds(0);
        }
    }

    async function uploadAndSend(blob) {
        setRecState('uploading');
        try {
            const url = await uploadAudio(blob, token);
            onSend(url, 'audio');
            setRecState('idle');
        } catch (err) {
            setRecError(err.message || 'שגיאה בהעלאת ההקלטה');
            setRecState('idle');
        }
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
                    <button className="cw-send" type="button" onClick={stopRecording}><img src="/images/send.png" alt="שלח" className="cw-icon" /></button>
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
                        <img src="/images/record.png" alt="הקלטה" className="cw-icon" />
                    </button>
                    <button className="cw-send" type="submit" disabled={!connected || !text.trim()}>
                        <img src="/images/send.png" alt="שלח" className="cw-icon" />
                    </button>
                </form>
            )}
        </div>
    );
}
