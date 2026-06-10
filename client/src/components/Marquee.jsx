import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './Marquee.module.css';

/* ── Marquee ────────────────────────────────────────────────────────────────
   Seamless, gap-free infinite auto-scroller — guaranteed no jump at the loop.

   Structure (the key to zero seam jump):
     .track  → has EXACTLY two children, no gap/padding between them
       .half → identical content, width W
       .half → identical content, width W
   translateX(-50%) therefore moves the track by exactly W (one half), landing
   the second half precisely where the first began. Because the two halves are
   byte-identical and flush, the wrap-around is mathematically seamless — it does
   not depend on margin/max-content quirks.

   Spacing: items inside a half use flex `gap`; each half adds a trailing
   `padding-inline-end` equal to the gap, so the space at the seam matches the
   space between items. Padding is always part of the box width, so the halves
   stay exactly equal.

   No-gap fill: the items are repeated inside each half until one half is wider
   than the viewport (measured at runtime, re-measured on resize), so a half can
   never run out before its twin scrolls in.

   Props:
     items, renderItem, speed (px/s), gap (px), reverse, pauseOnHover,
     className, ariaLabel                                                        */
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
  const [repeat, setRepeat] = useState(2);     // copies of `items` inside one half
  const [duration, setDuration] = useState(20); // seconds for one -50% cycle

  const measure = useCallback(() => {
    const vp = viewportRef.current;
    const half = halfRef.current;
    if (!vp || !half || items.length === 0) return;

    const halfW = half.getBoundingClientRect().width;
    if (!halfW) return;

    const oneRep = halfW / repeat; // approx width of `items` rendered once
    if (!oneRep) return;

    // one half must be at least as wide as the viewport, +1 rep of slack
    const needed = Math.max(2, Math.ceil(vp.offsetWidth / oneRep) + 1);
    if (needed !== repeat) {
      setRepeat(needed); // re-render → measure runs again, then settles
      return;
    }

    // -50% moves the track by exactly one half-width; keep px/sec constant
    setDuration(halfW / Math.max(1, speed));
  }, [items.length, repeat, speed]);

  useEffect(() => {
    // measure after layout (avoids a wrong first measurement); re-measure on resize
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    if (viewportRef.current) ro.observe(viewportRef.current);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [measure]);

  if (items.length === 0) return null;

  const halfStyle = { gap: `${gap}px`, paddingInlineEnd: `${gap}px` };

  // one half = `repeat` copies of the items
  const buildHalf = (real) =>
    Array.from({ length: repeat }).flatMap((_, r) =>
      items.map((item, i) => (
        <div
          className={styles.cell}
          key={`${r}-${i}`}
          // expose only the very first copy to assistive tech; the rest are decorative
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
          animationDirection: reverse ? 'reverse' : 'normal',
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
