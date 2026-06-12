import { useEffect, useRef, useState } from 'react';
import { getChatHistory, saveMessage } from '../../../shared/services/api';

const CHAT_URL = 'ws://localhost:8080';
const MAX_RECONNECT_ATTEMPTS = 10;

export default function useWebSocketChat(token, chatWithUserId) {
    const socketRef = useRef(null);

    const chatWithRef = useRef(chatWithUserId);
    useEffect(() => { chatWithRef.current = chatWithUserId; }, [chatWithUserId]);

    const [messages, setMessages] = useState([]);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!token) return;

        let closedByUs = false;
        let reconnectTimer = null;
        let attempts = 0;

        function connect() {
            const socket = new WebSocket(`${CHAT_URL}?token=${encodeURIComponent(token)}`);
            socketRef.current = socket;

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
                    default:
                        break;
                }
            };

            socket.onerror = () => {
                if (!isCurrent()) return;
                setError("לא ניתן להתחבר לשרת הצ'ט");
            };

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

    useEffect(() => {
        if (!token || !chatWithUserId) { setMessages([]); return; }

        let cancelled = false;
        const loadHistory = async () => {
            try {
                const { messages: history } = await getChatHistory(chatWithUserId, token);
                if (cancelled) return;
                setMessages(history.map(m => ({
                    text: m.text,
                    type: m.type || 'text',
                    timestamp: m.createdAt,
                    isMine: String(m.sender) !== String(chatWithUserId),
                })));
            } catch {
                if (!cancelled) setError("לא ניתן לטעון את היסטוריית הצ'אט");
            }
        };
        loadHistory();

        return () => { cancelled = true; };
    }, [token, chatWithUserId]);

    function sendMessage(text, type = 'text') {
        const socket = socketRef.current;
        const to = chatWithUserId;
        if (!to) return false;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            setError("לא מחובר לשרת הצ'ט");
            return false;
        }

        socket.send(JSON.stringify({ to, text, type }));
        setMessages(prev => [...prev, { text, type, timestamp: new Date().toISOString(), isMine: true }]);
        saveMessage({ recipient: to, text, type }, token)
            .catch(() => setError('ההודעה נשלחה אך לא נשמרה בהיסטוריה'));

        return true;
    }

    return { messages, connected, error, sendMessage };
}
