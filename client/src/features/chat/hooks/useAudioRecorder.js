import { useEffect, useRef, useState } from 'react';
import { uploadAudio } from '../../../shared/services/api';


function pickMimeType() {
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    return candidates.find((c) => MediaRecorder.isTypeSupported(c)) || '';
}

export default function useAudioRecorder({ token, onSend }) {
    const [recState, setRecState] = useState('idle');
    const [seconds, setSeconds] = useState(0);
    const [recError, setRecError] = useState(null);

    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);
    const timerRef = useRef(null);
    const cancelledRef = useRef(false);

    useEffect(() => () => stopTracks(), []);

    function stopTracks() {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    }

    const isRecorderActive = () => recorderRef.current && recorderRef.current.state !== 'inactive';

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
        if (isRecorderActive()) {
            recorderRef.current.stop(); // fires onstop → upload
        }
    }

    function cancelRecording() {
        cancelledRef.current = true;
        if (isRecorderActive()) {
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

    return { recState, seconds, recError, startRecording, stopRecording, cancelRecording };
}
