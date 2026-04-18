export const canSpeak = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && !!window.speechSynthesis;

export const safeCancel = (): void => {
  if (canSpeak()) window.speechSynthesis.cancel();
};

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
}

export const safeSpeak = (text: string, opts: SpeakOptions = {}): void => {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = opts.lang ?? 'ar-SA';
  u.rate = opts.rate ?? 0.8;
  u.pitch = opts.pitch ?? 1.0;
  u.volume = opts.volume ?? 1.0;
  if (opts.onEnd) u.onend = opts.onEnd;
  window.speechSynthesis.speak(u);
};
