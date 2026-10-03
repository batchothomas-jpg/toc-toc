export type Cue =
  | "card"
  | "pair"
  | "power"
  | "toc"
  | "win"
  | "quick"
  | "tick"
  | "penalty";

let context: AudioContext | null = null;
let effects: GainNode | null = null;
let music: GainNode | null = null;
let musicStarted = false;
function audio() {
  if (context) return context;
  const Audio =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof window.AudioContext })
      .webkitAudioContext;
  if (!Audio) return null;
  context = new Audio();
  effects = context.createGain();
  effects.gain.value = 0.7;
  effects.connect(context.destination);
  music = context.createGain();
  music.gain.value = 0;
  music.connect(context.destination);
  return context;
}
export function setEffectsVolume(volume: number) {
  if (!audio() || !effects) return;
  effects.gain.setTargetAtTime(
    Math.max(0, Math.min(1, volume)),
    context!.currentTime,
    0.04,
  );
}
export function setMusicVolume(volume: number) {
  const ctx = audio();
  if (!ctx || !music) return;
  music.gain.setTargetAtTime(
    Math.max(0, Math.min(0.16, volume * 0.16)),
    ctx.currentTime,
    0.3,
  );
  if (volume > 0 && !musicStarted) {
    musicStarted = true;
    const notes = [110, 164.81, 220];
    notes.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const voice = ctx.createGain();
      oscillator.type = index === 0 ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      voice.gain.value = index === 0 ? 0.34 : 0.12;
      oscillator.connect(voice);
      voice.connect(music!);
      oscillator.start();
    });
  }
  if (ctx.state === "suspended") void ctx.resume();
}
export function playCue(cue: Cue) {
  try {
    const ctx = audio();
    if (!ctx || !effects) return;
    const now = ctx.currentTime;
    const tones =
      cue === "toc"
        ? [392, 523, 659]
        : cue === "win"
          ? [523, 659, 784]
          : cue === "power"
            ? [587, 440]
            : cue === "pair"
              ? [440, 660]
              : cue === "quick"
                ? [659, 880, 1174]
                : cue === "tick"
                  ? [1244]
                : cue === "penalty"
                  ? [220, 164]
                  : [330];
    tones.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + index * 0.085;
      oscillator.type = cue === "penalty" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(
        cue === "toc"
          ? 0.08
          : cue === "quick"
            ? 0.035
            : cue === "tick"
              ? 0.022
            : cue === "penalty"
              ? 0.055
              : 0.045,
        start + 0.018,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        start + (cue === "tick" ? 0.085 : 0.18),
      );
      oscillator.connect(gain);
      gain.connect(effects!);
      oscillator.start(start);
      oscillator.stop(start + (cue === "tick" ? 0.09 : 0.19));
    });
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* Audio is optional; gameplay remains silent-safe. */
  }
}
