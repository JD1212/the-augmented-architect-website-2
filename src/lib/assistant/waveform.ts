/** Presentation-only signal processing. No recording, transmission or playback. */
export function microphoneLevel(samples: Float32Array) {
  let energy = 0;
  for (const sample of samples) energy += sample * sample;
  const rms = Math.sqrt(energy / Math.max(1, samples.length));
  return Math.min(1, Math.max(0, (rms - .006) * 8));
}
export function waveformBars(level: number, time: number, reducedMotion: boolean, count = 25) {
  return Array.from({ length: count }, (_, i) => {
    // The idle ripple is always small; only actual amplitude can make tall bars.
    const baseline = 3 + (reducedMotion ? 0 : .65 * Math.sin(time * 3 + i * .65));
    const profile = .45 + .55 * Math.pow(Math.sin((i + 1) / (count + 1) * Math.PI), 2);
    return baseline + 25 * Math.min(1, Math.max(0, level)) * profile;
  });
}

/** Independent visual meter. SpeechRecognition keeps owning transcription. */
export function createMicrophoneMeter(environment: {
  capture: () => Promise<MediaStream>; Context: new () => AudioContext;
}) {
  let stopped = false, stream: MediaStream | undefined, context: AudioContext | undefined;
  let source: MediaStreamAudioSourceNode | undefined, analyser: AnalyserNode | undefined;
  const samples = new Float32Array(256);
  function dispose() {
    stopped = true;
    source?.disconnect(); source = undefined;
    analyser?.disconnect(); analyser = undefined;
    stream?.getTracks().forEach(track => track.stop()); stream = undefined;
    if (context) { void context.close().catch(() => {}); context = undefined; }
  }
  return {
    async start() {
      try {
        const captured = await environment.capture();
        if (stopped) { captured.getTracks().forEach(track => track.stop()); return; }
        stream = captured; context = new environment.Context();
        analyser = context.createAnalyser(); analyser.fftSize = samples.length;
        source = context.createMediaStreamSource(stream); source.connect(analyser);
        // Deliberately never connect to destination: no audible microphone feedback.
        void context.resume().catch(() => {});
      } catch { dispose(); } // A visual-meter failure must not affect dictation.
    },
    level() { if (!analyser || context?.state !== 'running') return 0; analyser.getFloatTimeDomainData(samples); return microphoneLevel(samples); },
    dispose,
  };
}
