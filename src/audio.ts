type Cue = "card" | "pair" | "power" | "toc" | "win";
export function playCue(cue: Cue) {
  try {
    const Audio =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof window.AudioContext })
        .webkitAudioContext;
    if (!Audio) return;
    const context = new Audio();
    const now = context.currentTime;
    const tones =
      cue === "toc"
        ? [392, 523, 659]
        : cue === "win"
          ? [523, 659, 784]
          : cue === "power"
            ? [587, 440]
            : cue === "pair"
              ? [440, 660]
              : [330];
    tones.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + index * 0.085;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(
        cue === "toc" ? 0.08 : 0.045,
        start + 0.018,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.19);
    });
    window.setTimeout(() => void context.close(), 650);
  } catch {
    /* Audio is an optional enhancement; gameplay remains silent-safe. */
  }
}
