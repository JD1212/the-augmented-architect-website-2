'use client';
import { useEffect, useRef } from 'react';
import { createMicrophoneMeter, waveformBars } from '@/lib/assistant/waveform';
import styles from './assistant.module.css';

/** A visual overlay only. The controlled draft and speech recognizer stay intact. */
export function ListeningWaveform({ listening, reducedMotion }: { listening: boolean; reducedMotion: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current, drawing = element?.getContext('2d');
    if (!element || !drawing) return;
    const Context = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const meter = listening && !reducedMotion && Context && navigator.mediaDevices?.getUserMedia ? createMicrophoneMeter({ capture: () => navigator.mediaDevices.getUserMedia({ audio: true }), Context }) : undefined;
    if (meter) void meter.start();
    let frame = 0, last = -Infinity, level = 0;
    const color = getComputedStyle(element).color;
    function draw(now: number) {
      if (!reducedMotion) frame = requestAnimationFrame(draw);
      if (now - last < 30) return;
      last = now;
      const rect = element!.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * ratio)), height = Math.max(1, Math.round(rect.height * ratio));
      if (element!.width !== width || element!.height !== height) { element!.width = width; element!.height = height; }
      const actual = reducedMotion ? 0 : meter?.level() ?? 0;
      level = reducedMotion ? 0 : level + (actual - level) * (actual > level ? .4 : .18);
      drawing!.setTransform(ratio, 0, 0, ratio, 0, 0); drawing!.clearRect(0, 0, rect.width, rect.height);
      drawing!.fillStyle = color;
      const bars = waveformBars(level, now / 1000, reducedMotion), gap = Math.min(7, rect.width / bars.length), barWidth = Math.max(2, Math.min(3, gap * .5));
      const left = (rect.width - gap * (bars.length - 1) - barWidth) / 2;
      bars.forEach((bar, i) => { drawing!.beginPath(); drawing!.roundRect(left + i * gap, (rect.height - bar) / 2, barWidth, bar, barWidth / 2); drawing!.fill(); });
    }
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); meter?.dispose(); };
  }, [listening, reducedMotion]);
  return <canvas ref={canvas} className={styles.waveform} aria-hidden="true" data-scout-waveform />;
}
