"use client";

/**
 * Timbre de recordatorio sintetizado con Web Audio API — sin archivo de
 * audio externo que alojar. Dos notas ascendentes (do-mi, tipo "carillón"
 * suave) con envolvente de ataque/decaimiento para que no suene brusco.
 */

let ctx: AudioContext | null = null;
let unlocked = false;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

/**
 * Los navegadores bloquean AudioContext hasta el primer gesto del usuario.
 * Se llama una vez desde AppShell ante cualquier click/tecla para "desbloquear"
 * el audio, mucho antes de que aparezca el primer recordatorio.
 */
export function desbloquearAudio() {
  if (unlocked) return;
  const c = getContext();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  unlocked = true;
}

function tono(c: AudioContext, freq: number, inicio: number, duracion: number, volumen: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(c.destination);

  const t0 = c.currentTime + inicio;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volumen, t0 + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duracion);

  osc.start(t0);
  osc.stop(t0 + duracion + 0.05);
}

/** Una "campanada": fundamental + una quinta arriba ligeramente más suave, para que suene a campanilla y no a tono plano de sintetizador. */
function campanada(c: AudioContext, freq: number, inicio: number, duracion: number, volumen: number) {
  tono(c, freq, inicio, duracion, volumen);
  tono(c, freq * 1.5, inicio, duracion * 0.7, volumen * 0.35);
}

export function reproducirTimbreRecordatorio() {
  const c = getContext();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  // Timbre tipo "ding-dong" de puerta: Mi5 → Do5, la segunda campanada
  // más grave y con decaimiento más largo, como una campanilla real.
  campanada(c, 659.25, 0, 0.55, 0.16);
  campanada(c, 523.25, 0.38, 0.85, 0.16);
}
