import { useEffect, useRef, useState } from 'react';
import styles from './Marquee.module.css';

export default function Marquee({
  items = [],
  renderItem = (item) => item,
  speed = 40,
  gap = 20,
  reverse = false,
  pauseOnHover = true,
  className = '',
  ariaLabel,
}) {
  const viewportRef = useRef(null);
  const halfRef = useRef(null);
  const [repeat, setRepeat] = useState(2);    
  const [duration, setDuration] = useState(20); 
  useEffect(() => {
    const measure = () => {
      const vp = viewportRef.current;
      const half = halfRef.current;
      if (!vp || !half || items.length === 0) return;

      const halfW = half.getBoundingClientRect().width;
      if (!halfW) return;

      const oneRep = halfW / repeat; 
      if (!oneRep) return;

      const needed = Math.max(2, Math.ceil(vp.offsetWidth / oneRep) + 1);
      if (needed !== repeat) {
        setRepeat(needed); 
        return;
      }

      setDuration(halfW / Math.max(1, speed));
    };

    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    if (viewportRef.current) ro.observe(viewportRef.current);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [items.length, repeat, speed]);

  if (items.length === 0) return null;

  const halfStyle = { gap: `${gap}px`, paddingInlineEnd: `${gap}px` };

  const buildHalf = (real) =>
    Array.from({ length: repeat }).flatMap((_, r) =>
      items.map((item, i) => (
        <div
          className={styles.cell}
          key={`${r}-${i}`}
          aria-hidden={real && r === 0 ? undefined : 'true'}
        >
          {renderItem(item, i)}
        </div>
      )),
    );

  return (
    <div
      ref={viewportRef}
      className={`${styles.viewport} ${className}`.trim()}
      data-pause={pauseOnHover ? 'true' : 'false'}
      role="marquee"
      aria-label={ariaLabel}
    >
      <div
        className={styles.track}
        style={{
          '--marquee-duration': `${duration}s`,
          '--marquee-dir': reverse ? 'reverse' : 'normal',
        }}
      >
        <div className={styles.half} ref={halfRef} style={halfStyle}>
          {buildHalf(true)}
        </div>
        <div className={styles.half} style={halfStyle} aria-hidden="true">
          {buildHalf(false)}
        </div>
      </div>
    </div>
  );
}
