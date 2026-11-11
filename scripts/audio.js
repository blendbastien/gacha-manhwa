/* Gacha Manhwa — sons en Web Audio : fichiers décodés à l'avance, lancés à l'échantillon près sur l'horloge audio
 * (plus de retard au démarrage ni de décalage par rapport aux images). */
import { MOD, setting, asset, absUrl, resolveAssets } from "./data.js";

const BUF = new Map(); /* clé → Promise<AudioBuffer|null> */
let ctx = null, master = null, gMusic = null, gSfx = null;
export function ac() {
  if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); master = ctx.createGain(); gMusic = ctx.createGain(); gSfx = ctx.createGain(); gMusic.connect(master); gSfx.connect(master); master.connect(ctx.destination); applyVolumes(); }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}
/* 1.11 : tout le gacha joué nettement moins fort (les curseurs restent de 0 à 100 %) */
const MUSIC_K = 0.45, SFX_K = 0.4;
export function applyVolumes() { if (!ctx) return; const m = game.settings.get(MOD, "muted"); master.gain.value = m ? 0 : 1; gMusic.gain.value = (Number(setting("musicVol")) || 0) / 100 * MUSIC_K; gSfx.gain.value = (Number(setting("sfxVol")) || 0) / 100 * SFX_K; }
export const now = () => (ac()?.currentTime ?? 0);
/** délai entre le moment où un son est programmé et celui où il sort des haut-parleurs (casque Bluetooth : jusqu'à 0,3 s) */
export const outLatency = () => { const c = ac(); return c ? Math.min(0.4, (c.outputLatency || 0) + (c.baseLatency || 0)) : 0; };
export function load(key) {
  if (BUF.has(key)) return BUF.get(key); const src = asset(key); if (!src || !ac()) { BUF.set(key, Promise.resolve(null)); return BUF.get(key); }
  const p = resolveAssets().then(() => fetch(absUrl(asset(key)))).then(r => r.ok ? r.arrayBuffer() : null).then(ab => ab ? new Promise((res) => ctx.decodeAudioData(ab, res, () => res(null))) : null).catch(() => null);
  BUF.set(key, p); return p;
}
export const loadAll = (keys, timeout = 6000) => Promise.race([Promise.all(keys.map(load)), new Promise(r => setTimeout(r, timeout))]);
/** précharge tous les sons du module (appelé à l'ouverture de la page d'invocation) */
export function warm() { for (const k of ["callSR", "callSSR", "rise", "meteor", "portal", "flip", "revCommon", "revRare", "revVrare", "revEpic", "revS", "revSS", "revSSS", "dupBasic", "dupRare", "pay", "coin", "cardWhoosh", "shimmer", "trainPass", "trainBrake", "doorOpen", "doorLight"]) load(k); }

/* musiques d'appel : après l'intro intense (0–13 s) vient une longue partie douce qui se répète toutes les ~25 s.
 * On boucle sur deux de ces périodes (mesurées à l'échantillon, corrélation 0,998) : la musique ne revient jamais au début intense. */
const LOOPS = { callSR: [20, 70.9333], callSSR: [20, 70.6] };
const SOFT_FROM = 13.5;
/** un groupe de sons qu'on peut couper d'un coup (une scène) */
export class Voice {
  constructor() { this.live = new Set(); this.music = null; }
  /** joue `key` dans `delay` secondes (horloge audio), à partir de `at` secondes du fichier */
  async play(key, { delay = 0, at = 0, vol = 1, when = null } = {}) {
    const c = ac(); if (!c) return null; const buf = await load(key); if (!buf) return null;
    const s = c.createBufferSource(); s.buffer = buf; const g = c.createGain(); g.gain.value = vol; s.connect(g).connect(gSfx);
    const t = when ?? (c.currentTime + delay); const late = Math.max(0, c.currentTime - t); /* en retard : on saute ce qui aurait déjà dû être entendu, pour rester calé sur l'image */
    if (at + late >= buf.duration - 0.01) return null; s.start(Math.max(c.currentTime, t), at + late); this.live.add(s); s.onended = () => this.live.delete(s); return s;
  }
  stopFx() { for (const s of this.live) { try { s.stop(); } catch (e) {} } this.live.clear(); }
  async startMusic(key, vol = 1, { when = null, fadeIn = 0.9, offset = 0 } = {}) {
    this.stopMusic(0); const c = ac(); if (!c) return; const buf = await load(key); if (!buf) return;
    const s = c.createBufferSource(); s.buffer = buf; s.loop = true; const lp = LOOPS[key]; if (lp && buf.duration > lp[1]) { s.loopStart = lp[0]; s.loopEnd = lp[1]; }
    const g = c.createGain(); const t = Math.max(c.currentTime, when ?? c.currentTime); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + fadeIn); s.connect(g).connect(gMusic); s.start(t, offset);
    this.music = { s, g, key, t0: t - offset }; this.mvol = vol;
  }
  /** position de lecture dans le fichier (secondes), boucle comprise */
  musicPos() { const m = this.music; if (!m || !ctx) return 0; let p = ctx.currentTime - m.t0; const lp = LOOPS[m.key]; if (lp && p > lp[1]) p = lp[0] + (p - lp[0]) % (lp[1] - lp[0]); return p; }
  /** écran de fin : on garde la partie douce de la musique (jamais le retour au début intense) ; si on y est encore, fondu enchaîné vers la partie douce */
  async soften(vol = 0.4) {
    const m = this.music; if (!m || !ctx) return; const lp = LOOPS[m.key];
    if (!lp || this.musicPos() >= SOFT_FROM) return this.fade(vol, 1.0);
    this.music = null; const t = ctx.currentTime; m.g.gain.cancelScheduledValues(t); m.g.gain.setValueAtTime(m.g.gain.value, t); m.g.gain.linearRampToValueAtTime(0, t + 1.4); try { m.s.stop(t + 1.5); } catch (e) {}
    await this.startMusic(m.key, vol, { offset: lp[0], fadeIn: 1.8 });
  }
  fade(to, sec = 0.6, delay = 0) { const m = this.music; if (!m || !ctx) return; const t = ctx.currentTime + delay; m.g.gain.cancelScheduledValues(t); m.g.gain.setValueAtTime(m.g.gain.value, t); m.g.gain.linearRampToValueAtTime(to, t + sec); }
  stopMusic(sec = 0.7) { const m = this.music; if (!m) return; this.music = null; if (!ctx || !sec) { try { m.s.stop(); } catch (e) {} return; } const t = ctx.currentTime; m.g.gain.cancelScheduledValues(t); m.g.gain.setValueAtTime(m.g.gain.value, t); m.g.gain.linearRampToValueAtTime(0, t + sec); try { m.s.stop(t + sec + 0.05); } catch (e) {} }
}
export function toggleMute() { const m = !game.settings.get(MOD, "muted"); game.settings.set(MOD, "muted", m); if (ctx) master.gain.value = m ? 0 : 1; return m; }
export function playOnce(key, vol = 1) { new Voice().play(key, { vol }); }


/** petit panneau de volume (musique / effets / tout couper), ouvert depuis la page ou la scène */
export function volPop(anchor) {
  const old = document.querySelector(".gm-volpop"); if (old) { old.remove(); if (old._a === anchor) return; }
  const v = k => Number(game.settings.get(MOD, k)) || 0, m = game.settings.get(MOD, "muted");
  const p = document.createElement("div"); p.className = "gm-volpop"; p._a = anchor;
  p.innerHTML = `<label><i class="fa-solid fa-music"></i><span>Musique</span><input type="range" min="0" max="100" step="5" data-k="musicVol" value="${v("musicVol")}"><b>${v("musicVol")}</b></label>
    <label><i class="fa-solid fa-wand-sparkles"></i><span>Effets</span><input type="range" min="0" max="100" step="5" data-k="sfxVol" value="${v("sfxVol")}"><b>${v("sfxVol")}</b></label>
    <label class="m"><input type="checkbox" data-k="muted"${m ? " checked" : ""}><span>Tout couper</span></label>`;
  document.body.appendChild(p); const r = anchor.getBoundingClientRect(); p.style.top = Math.min(window.innerHeight - p.offsetHeight - 8, r.bottom + 6) + "px"; p.style.left = Math.max(8, Math.min(window.innerWidth - p.offsetWidth - 8, r.right - p.offsetWidth)) + "px";
  p.querySelectorAll("input[type=range]").forEach(i => i.addEventListener("input", () => { i.nextElementSibling.textContent = i.value; game.settings.set(MOD, i.dataset.k, Number(i.value)); }));
  p.querySelector("[data-k=muted]").addEventListener("change", ev => { if (ev.target.checked !== game.settings.get(MOD, "muted")) toggleMute(); });
  const off = ev => { if (!p.contains(ev.target) && ev.target !== anchor && !anchor.contains(ev.target)) { p.remove(); document.removeEventListener("pointerdown", off, true); } }; document.addEventListener("pointerdown", off, true);
}
