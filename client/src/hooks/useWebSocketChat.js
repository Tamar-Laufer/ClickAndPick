import { useCallback, useEffect, useRef, useState } from 'react';
import { getChatHistory, saveMessage } from '../services/api';

// שירות הזמן-אמת ב-C++ (Crow) מאזין ל-WebSocket גולמי על פורט 8080.
// הטוקן עובר ב-query string כי כך main.cpp קורא אותו ב-onaccept (req.url_params.get("token")).
const CHAT_URL = 'ws://localhost:8080';
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * צ'אט זמן-אמת עם שמירה ב-MongoDB.
 *  - חיבור ה-WebSocket גלובלי ויציב: הוא תלוי רק ב-token (השרת ממפה חיבור למשתמש),
 *    ולכן לא מתנתק/מתחבר מחדש בכל מעבר בין שיחות.
 *  - `messages` מתוחם לשיחה הנוכחית (chatWithUserId): בכל החלפה נטענת ההיסטוריה
 *    מ-Node ומאכלסת את ה-state, ולאחר מכן הודעות חיות נצברות מעליה.
 *  - כל פריט ב-messages הוא { text, timestamp, isMine } — מוכן לרינדור ע"י ChatWindow.
 */
export function useWebSocketChat(token, chatWithUserId) {
    const socketRef = useRef(null);

    // ה-WS גלובלי, אבל ה-onmessage שלו צריך לדעת מהי השיחה הפעילה כרגע בלי
    // להיבנות מחדש (אחרת היינו מנתקים את החיבור) — לכן דרך ref.
    const chatWithRef = useRef(chatWithUserId);
    useEffect(() => { chatWithRef.current = chatWithUserId; }, [chatWithUserId]);

    const [messages, setMessages] = useState([]);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);

    // ── חיבור WebSocket גלובלי (פעם אחת לכל token; יציב במעבר בין שיחות) ──
    useEffect(() => {
        if (!token) return;

        let closedByUs = false;
        let reconnectTimer = null;
        let attempts = 0;

        function connect() {
            const socket = new WebSocket(`${CHAT_URL}?token=${encodeURIComponent(token)}`);
            socketRef.current = socket;

            // ב-StrictMode (פיתוח) נוצר socket זמני שנסגר מיד; ה-onclose המאוחר שלו
            // היה מוחק מ-socketRef את ה-socket החדש והתקין — לכן מתעלמים ממוחלף.
            const isCurrent = () => socketRef.current === socket;

            socket.onopen = () => {
                if (!isCurrent()) return;
                attempts = 0;
                setConnected(true);
                setError(null);
            };

            socket.onmessage = (event) => {
                if (!isCurrent()) return;
                let frame;
                try {
                    frame = JSON.parse(event.data);
                } catch {
                    return;
                }

                switch (frame.type) {
                    case 'message':
                        // מצרפים רק אם ההודעה הנכנסת שייכת לשיחה הפתוחה כרגע.
                        if (String(frame.from) === String(chatWithRef.current)) {
                            setMessages(prev => [...prev, { text: frame.text, type: frame.msgType || 'text', timestamp: frame.timestamp, isMine: false }]);
                        }
                        break;
                    case 'undelivered':
                        setError("הנמען אינו מחובר — ההודעה נשמרה ותופיע אצלו בכניסה הבאה לצ'אט");
                        break;
                    case 'error':
                        setError(frame.message ?? 'Chat error');
                        break;
                    // 'connected' — אישור פתיחה, כבר טופל ב-onopen
                    default:
                        break;
                }
            };

            socket.onerror = () => {
                if (!isCurrent()) return;
                setError("לא ניתן להתחבר לשרת הצ'ט");
            };

            // WebSocket נייטיב לא מתחבר מחדש מעצמו — מימוש backoff ידני.
            socket.onclose = () => {
                if (!isCurrent()) return;
                socketRef.current = null;
                setConnected(false);
                if (closedByUs || attempts >= MAX_RECONNECT_ATTEMPTS) return;
                attempts += 1;
                reconnectTimer = setTimeout(connect, Math.min(1000 * attempts, 5000));
            };
        }

        connect();

        return () => {
            closedByUs = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            socketRef.current?.close();
            socketRef.current = null;
        };
    }, [token]);

    // ── טעינת היסטוריה בכל החלפת שיחה ──
    // ממפה את צורת ה-DB ({ sender, createdAt }) לצורת ה-UI ({ isMine, timestamp }).
    // בשיחה דו-צדדית השולח הוא אני או הנמען, לכן sender שאינו chatWithUserId הוא שלי.
    useEffect(() => {
        if (!token || !chatWithUserId) { setMessages([]); return; }

        let cancelled = false;
        getChatHistory(chatWithUserId, token)
            .then(({ messages: history }) => {
                if (cancelled) return;
                setMessages(history.map(m => ({
                    text: m.text,
                    type: m.type || 'text',
                    timestamp: m.createdAt,
                    isMine: String(m.sender) !== String(chatWithUserId),
                })));
            })
            .catch(() => { if (!cancelled) setError("לא ניתן לטעון את היסטוריית הצ'אט"); });

        return () => { cancelled = true; };
    }, [token, chatWithUserId]);

    // ── שליחה: דואל-רייט — WS לזמן-אמת + POST ל-Mongo לשמירה קבועה ──
    const sendMessage = useCallback((text, type = 'text') => {
        const socket = socketRef.current;
        const to = chatWithUserId;
        if (!to) return false;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            setError("לא מחובר לשרת הצ'ט");
            return false;
        }

        // 1) משלוח מיידי דרך שירות ה-C++ (הפורמט ש-main.cpp מצפה לו: { to, text }).
        socket.send(JSON.stringify({ to, text, type }));

        // 2) הצגה אופטימית — שרת ה-C++ לא מחזיר עותק לשולח.
        setMessages(prev => [...prev, { text, type, timestamp: new Date().toISOString(), isMine: true }]);

        // 3) שמירה ב-Mongo ברקע; כשל בשמירה לא מבטל את ההצגה/המשלוח החי.
        saveMessage({ recipient: to, text, type }, token)
            .catch(() => setError('ההודעה נשלחה אך לא נשמרה בהיסטוריה'));

        return true;
    }, [token, chatWithUserId]);

    const clearMessages = useCallback(() => setMessages([]), []);

    return { messages, connected, error, sendMessage, clearMessages };
}
