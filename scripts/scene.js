/* Gacha Manhwa — scène cinématique partagée : charge, météore, portail, révélations (une mise en scène par palier), résultats.
 * Sons en Web Audio, programmés sur l'horloge audio : ils tombent pile sur les instants clés (pics mesurés dans les fichiers) :
 * Rise culmine à 6,65 s, le portail claque à 1,5 s, l'orchestre S frappe à 2,65 s, SS à 0,8 s puis 3,9 s,
 * la fanfare SSS à 0,5 / 1,75 / 2,6 / 2,95 / 3,5 s. Les images sont calées sur la même origine. */
import { MOD, esc, absUrl, gi, setting, asset, prefetchVideos, videoUrl, climaxOf, rankColor, rarColor, tierOf, tierRank, fragName, fragFor, HINT, fakeTier, bannerById, rankList, rankIdx, catDB, itemPic, catIconPath } from "./data.js";
import { lookFor } from "./universe.js";
import { ac, now, loadAll, Voice, toggleMute, outLatency, volPop } from "./audio.js";
import { medal } from "./lobby.js";
import { Hyper, HY } from "./hyper.js";
import { Hyper3D, HY3, introMap, realT } from "./hyper3d.js";

const FILTER = {
  portal: { low: "hue-rotate(25deg)", mid: "hue-rotate(95deg) saturate(1.25)", S: "hue-rotate(220deg) saturate(1.5) brightness(1.1)", SS: "hue-rotate(185deg) saturate(1.7)", SSS: "saturate(0) brightness(1.7)" },
  burst: { low: "hue-rotate(160deg) saturate(1.3)", mid: "hue-rotate(230deg) saturate(1.4)", S: "saturate(1.2)", SS: "hue-rotate(-32deg) saturate(1.7)", SSS: "saturate(.35) brightness(1.5)" },
  beam: { low: "none", mid: "hue-rotate(45deg) saturate(1.2)", S: "sepia(1) saturate(3.5) hue-rotate(-8deg) brightness(1.1)", SS: "sepia(1) saturate(5) hue-rotate(-38deg)", SSS: "brightness(1.35)" },
  ring: { low: "none", mid: "hue-rotate(40deg)", S: "hue-rotate(-15deg) saturate(1.3)", SS: "hue-rotate(-35deg) saturate(1.5)", SSS: "saturate(.4) brightness(1.4)" }
};
const STARS = { low: 3, mid: 4, S: 5, SS: 5, SSS: 5 };
const RAINBOW = ["#ff4d6d", "#ffb347", "#fff46b", "#5dff9c", "#4fc3ff", "#b46bff"];
function revealSound(x) { const t = x.tier; if (t === "S") return "revS"; if (t === "SS") return "revSS"; if (t === "SSS") return "revSSS"; const r = String(x.rar || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); if (!r || /ordinaire|^commun/.test(r) || r.includes("peu commun")) return "revCommon"; if (r === "rare") return "revRare"; if (r.includes("tres rare")) return "revVrare"; return "revEpic"; }
const SCENE_SND = ["rankUp", "callSR", "callSSR", "rise", "meteor", "portal", "flip", "revCommon", "revRare", "revVrare", "revEpic", "revS", "revSS", "revSSS", "dupBasic", "dupRare", "cardWhoosh", "shimmer", "trainPass", "trainBrake", "doorOpen", "doorLight"];

/* ── particules (canvas) : lueurs pré-rendues par couleur, mélange additif ── */
const SPR = new Map();
function sprite(color) { let c = SPR.get(color); if (c) return c; c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "#ffffff"); r.addColorStop(0.18, color); r.addColorStop(0.5, color + "55"); r.addColorStop(1, "transparent"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); SPR.set(color, c); return c; }
const ASPR = new Map();
function ambSprite(kind, color) { const key = kind + color; let c = ASPR.get(key); if (c) return c; c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); g.translate(32, 32); g.fillStyle = color; g.strokeStyle = color; g.lineCap = "round";
  if (kind === "snow") { g.shadowColor = color; g.shadowBlur = 6; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 24); g.moveTo(0, 13); g.lineTo(7, 19); g.moveTo(0, 13); g.lineTo(-7, 19); g.stroke(); } g.beginPath(); g.arc(0, 0, 3.5, 0, 6.283); g.fill(); }
  else if (kind === "petals") { g.beginPath(); g.moveTo(0, -24); g.bezierCurveTo(18, -12, 16, 14, 0, 24); g.bezierCurveTo(-16, 14, -18, -12, 0, -24); g.fill(); }
  else if (kind === "leaves") { g.beginPath(); g.moveTo(0, -26); g.quadraticCurveTo(22, -6, 0, 26); g.quadraticCurveTo(-22, -6, 0, -26); g.fill(); g.globalCompositeOperation = "destination-out"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -20); g.lineTo(0, 22); g.stroke(); }
  else if (kind === "hearts") { g.beginPath(); g.moveTo(0, 20); g.bezierCurveTo(-28, 0, -13, -24, 0, -9); g.bezierCurveTo(13, -24, 28, 0, 0, 20); g.fill(); }
  else if (kind === "confetti") { g.fillRect(-8, -14, 16, 28); }
  else if (kind === "rain") { g.fillRect(-1.5, -26, 3, 52); }
  else { const r = g.createRadialGradient(0, 0, 0, 0, 0, 28); r.addColorStop(0, "#ffffff"); r.addColorStop(0.25, color); r.addColorStop(1, "transparent"); g.fillStyle = r; g.beginPath(); g.arc(0, 0, 28, 0, 6.283); g.fill(); }
  ASPR.set(key, c); return c; }
class FX {
  constructor(cv) { this.cv = cv; this.c = cv.getContext("2d"); this.P = []; this.on = true; this.size(); this._r = () => this.size(); addEventListener("resize", this._r); const loop = t => { if (!this.on) return; this.step(t); this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
  size() { const d = Math.min(1.5, devicePixelRatio || 1); this.W = innerWidth; this.H = innerHeight; this.cv.width = this.W * d; this.cv.height = this.H * d; this.c.setTransform(d, 0, 0, d, 0, 0); }
  destroy() { this.on = false; cancelAnimationFrame(this.raf); removeEventListener("resize", this._r); }
  get cx() { return this.W / 2; } get cy() { return this.H * 0.46; } get R() { return Math.hypot(this.W, this.H) / 2; }
  dot(x, y, s, color, a = 1) { this.c.globalAlpha = a; const sp = sprite(color); this.c.drawImage(sp, x - s, y - s, s * 2, s * 2); }
  converge(color, n = 140, dur = 3400) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, r = this.R * (0.4 + Math.random() * 0.5); this.P.push({ k: "cv", a, r0: r, t: -Math.random() * dur * 0.6, d: dur * (0.45 + Math.random() * 0.55), c: color, s: 3 + Math.random() * 6, sp: 0.6 + Math.random() * 0.8 }); } }
  meteor(color, dur = 520, rainbow = false) { this.P.push({ k: "mt", t: 0, d: dur, c: color, rb: rainbow, x0: this.W * 1.08, y0: -this.H * 0.12, x1: this.cx, y1: this.cy }); }
  wave(color, d = 900, w = 6, max = 1.1) { this.P.push({ k: "wv", t: 0, d, c: color, w, max }); }
  burst(color, n = 120, speed = 9, life = 1400, colors) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = speed * (0.3 + Math.random()); this.P.push({ k: "bs", x: this.cx, y: this.cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, d: life * (0.5 + Math.random() * 0.6), c: colors ? colors[i % colors.length] : color, s: 3 + Math.random() * 7 }); } }
  embers(color, n = 80, dur = 4000) { for (let i = 0; i < n; i++) this.P.push({ k: "em", x: Math.random() * this.W, y: this.H * (0.7 + Math.random() * 0.5), vy: -(0.5 + Math.random() * 1.6), vx: (Math.random() - 0.5) * 0.5, t: -Math.random() * dur * 0.5, d: dur, c: color, s: 4 + Math.random() * 9 }); }
  /** éclats de lumière : rayons effilés qui jaillissent du centre (remplace les fissures) */
  shards(color, n = 14, d = 1100, colors) { for (let i = 0; i < n; i++) this.P.push({ k: "sh", a: (i / n) * 6.283 + Math.random() * 0.3, w: 0.012 + Math.random() * 0.03, len: this.R * (0.55 + Math.random() * 0.5), t: -Math.random() * 120, d: d * (0.7 + Math.random() * 0.5), c: colors ? colors[i % colors.length] : color }); }
  star(color, d = 2000) { this.P.push({ k: "st", t: 0, d, c: color }); }
  /** traits de lumière nets qui jaillissent du centre en accélérant (remplace la vidéo d'explosion floue) */
  streaks(color, n = 110, life = 1200, colors) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283; this.P.push({ k: "rs", a, r0: 10 + Math.random() * 70, v: 0.35 + Math.random() * 0.9, t: -Math.random() * 140, d: life * (0.55 + Math.random() * 0.6), c: colors ? colors[i % colors.length] : color, w: 0.8 + Math.random() * 1.8 }); } }
  /** ambiance de saison sur l'écran des cartes : flocons, pétales, feuilles… nets, peu nombreux, qui évitent le centre */
  ambient(kind, colors = ["#ffffff"], n = 42) { this.A = []; this.ak = kind; for (let i = 0; i < n; i++) this.A.push(this.ambOne(colors, true)); this.acol = colors; }
  ambOne(colors, any) { const sz = 5 + Math.random() * 9; return { x: Math.random() * this.W, y: any ? Math.random() * this.H : -20, vx: (Math.random() - 0.5) * 0.25, vy: 0.25 + Math.random() * 0.55, s: sz, r: Math.random() * 6.283, vr: (Math.random() - 0.5) * 0.02, ph: Math.random() * 6.283, c: colors[(Math.random() * colors.length) | 0] }; }
  clear() { this.P = []; }
  step(t) {
    const c = this.c, dt = Math.min(50, t - (this.last || t)); this.last = t; c.clearRect(0, 0, this.W, this.H); c.globalCompositeOperation = "lighter";
    for (let i = this.P.length - 1; i >= 0; i--) {
      const p = this.P[i]; p.t += dt; if (p.t < 0) continue; const k = Math.min(1, p.t / p.d); if (p.t > p.d) { this.P.splice(i, 1); continue; }
      if (p.k === "cv") { const e = Math.pow(k, 1.6); const r = p.r0 * (1 - e); const ang = p.a + e * p.sp; for (let j = 0; j < 4; j++) { const rr = r + j * 10 * (1 + e * 3); this.dot(this.cx + Math.cos(ang - j * 0.012) * rr, this.cy + Math.sin(ang - j * 0.012) * rr, p.s * (1 - j * 0.2), p.c, Math.min(1, k * 3) * (1 - j * 0.25) * (1 - e * 0.4)); } }
      else if (p.k === "mt") { const e = 1 - Math.pow(1 - k, 3); const x = p.x0 + (p.x1 - p.x0) * e, y = p.y0 + (p.y1 - p.y0) * e; const tx = x - (p.x1 - p.x0) * 0.34, ty = y - (p.y1 - p.y0) * 0.34; const g = c.createLinearGradient(tx, ty, x, y);
        if (p.rb) { RAINBOW.forEach((col, j) => g.addColorStop(j / 6, col + (j ? "cc" : "00"))); g.addColorStop(1, "#ffffff"); } else { g.addColorStop(0, "transparent"); g.addColorStop(0.7, p.c); g.addColorStop(1, "#ffffff"); }
        c.strokeStyle = g; c.lineCap = "round"; c.lineWidth = 22; c.globalAlpha = 0.25; c.beginPath(); c.moveTo(tx, ty); c.lineTo(x, y); c.stroke(); c.lineWidth = 5; c.globalAlpha = 1; c.stroke(); this.dot(x, y, 60, p.rb ? "#ffffff" : p.c, 1); this.dot(x, y, 24, "#ffffff", 1); }
      else if (p.k === "wv") { const R = this.R * p.max * (1 - Math.pow(1 - k, 3)); c.strokeStyle = p.c; c.globalAlpha = (1 - k) * 0.18; c.lineWidth = p.w * 7 * (1 - k * 0.5); c.beginPath(); c.arc(this.cx, this.cy, R, 0, 6.283); c.stroke(); c.globalAlpha = (1 - k) * 0.9; c.lineWidth = Math.max(1, p.w * (1 - k)); c.stroke(); }
      else if (p.k === "bs") { p.x += p.vx * dt / 16; p.y += p.vy * dt / 16; p.vx *= 0.972; p.vy = p.vy * 0.972 + 0.025; this.dot(p.x, p.y, p.s * (1 - k * 0.6), p.c, 1 - k); }
      else if (p.k === "em") { p.x += p.vx * dt / 16 + Math.sin((p.t + i * 70) / 420) * 0.35; p.y += p.vy * dt / 16; this.dot(p.x, p.y, p.s, p.c, Math.sin(k * Math.PI) * 0.85); }
      else if (p.k === "sh") { const grow = Math.min(1, k * 2.4), fade = 1 - Math.max(0, (k - 0.35) / 0.65); const L = p.len * (0.3 + 0.7 * grow); const a1 = p.a - p.w, a2 = p.a + p.w; const g = c.createLinearGradient(this.cx, this.cy, this.cx + Math.cos(p.a) * L, this.cy + Math.sin(p.a) * L); g.addColorStop(0, "#ffffff"); g.addColorStop(0.25, p.c); g.addColorStop(1, "transparent");
        c.fillStyle = g; c.globalAlpha = fade; c.beginPath(); c.moveTo(this.cx + Math.cos(p.a + 1.5708) * 3, this.cy + Math.sin(p.a + 1.5708) * 3); c.lineTo(this.cx + Math.cos(a1) * L, this.cy + Math.sin(a1) * L); c.lineTo(this.cx + Math.cos(a2) * L, this.cy + Math.sin(a2) * L); c.lineTo(this.cx + Math.cos(p.a - 1.5708) * 3, this.cy + Math.sin(p.a - 1.5708) * 3); c.closePath(); c.fill(); }
      else if (p.k === "rs") { const e = Math.pow(k, 1.7); const r = p.r0 + this.R * 1.15 * e; const L = 12 + 160 * e * p.v; const x1 = this.cx + Math.cos(p.a) * r, y1 = this.cy + Math.sin(p.a) * r, x0 = this.cx + Math.cos(p.a) * Math.max(0, r - L), y0 = this.cy + Math.sin(p.a) * Math.max(0, r - L);
        const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, "transparent"); g.addColorStop(0.7, p.c); g.addColorStop(1, "#ffffff"); c.strokeStyle = g; c.lineCap = "round"; c.lineWidth = p.w * (1 + e); c.globalAlpha = Math.min(1, k * 6) * (1 - Math.pow(k, 3)); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
      else if (p.k === "st") { const pulse = 0.6 + 0.4 * Math.sin(p.t / 90); const R = 8 + 26 * pulse * Math.min(1, k * 4); this.dot(this.cx, this.cy, R * 3.2, p.c, 1); this.dot(this.cx, this.cy, R, "#ffffff", 1); c.globalAlpha = 0.7 * pulse; const g = c.createLinearGradient(this.cx - R * 7, 0, this.cx + R * 7, 0); g.addColorStop(0, "transparent"); g.addColorStop(0.5, "#ffffff"); g.addColorStop(1, "transparent"); c.fillStyle = g; c.fillRect(this.cx - R * 7, this.cy - 1, R * 14, 2); const g2 = c.createLinearGradient(0, this.cy - R * 5, 0, this.cy + R * 5); g2.addColorStop(0, "transparent"); g2.addColorStop(0.5, "#ffffff"); g2.addColorStop(1, "transparent"); c.fillStyle = g2; c.fillRect(this.cx - 1, this.cy - R * 5, 2, R * 10); }
    }
    c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
    if (this.A?.length) { const glowy = !["petals", "leaves", "hearts", "confetti"].includes(this.ak); c.globalCompositeOperation = glowy ? "lighter" : "source-over"; const k = dt / 16, rx = Math.min(this.W, this.H) * 0.34;
      for (let i = 0; i < this.A.length; i++) { const a = this.A[i]; a.x += (a.vx + Math.sin(t / 900 + a.ph) * 0.35) * k; a.y += a.vy * k * (this.ak === "rain" ? 9 : 1); a.r += a.vr * k;
        if (a.y > this.H + 20 || a.x < -30 || a.x > this.W + 30) { this.A[i] = this.ambOne(this.acol, false); continue; }
        const dx = (a.x - this.cx) / rx, dy = (a.y - this.cy) / (rx * 1.25), d = Math.hypot(dx, dy); const fade = Math.max(0, Math.min(1, (d - 0.75) / 0.5));
        if (fade <= 0.01) continue; c.globalAlpha = 0.75 * fade; c.save(); c.translate(a.x, a.y); c.rotate(a.r); const sp = ambSprite(this.ak, a.c); c.drawImage(sp, -a.s, -a.s, a.s * 2, a.s * 2); c.restore(); }
      c.globalAlpha = 1; c.globalCompositeOperation = "source-over"; }
  }
}

/* insigne de rang : hexagone biseauté (CSS, net à tous les zooms), lettres ajustées à leur nombre */
export const rankEmblem = (r, cls = "") => { const t = String(r ?? ""); return `<span class="gm-rank n${Math.min(4, t.length || 1)} ${cls}" style="--rc:${rankColor(r)}"><i class="bev"></i><i class="core"></i><i class="gl"></i><small>RANG</small><b>${esc(t)}</b></span>`; };
/* carte : cadre ornementé (coins filigranés), illustration, plaque du nom */
const CORNER = `<svg viewBox="0 0 40 40"><path d="M2 38V12Q2 2 12 2h26" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 38V16q0-8 8-8h22" fill="none" stroke="currentColor" stroke-width=".8" opacity=".7"/><path d="M12 2l3 3-3 3-3-3z" fill="currentColor"/><circle cx="2" cy="38" r="2" fill="currentColor"/></svg>`;
/* anneau de runes et de graduations derrière la carte (remplace la vidéo d'anneau) */
const RUNES = (() => { let t = ""; for (let i = 0; i < 120; i++) { const a = i * 3 * Math.PI / 180, l = i % 10 === 0 ? 3.4 : i % 2 ? 1.1 : 1.8, R = 47.5; t += `<line x1="${(50 + Math.cos(a) * R).toFixed(2)}" y1="${(50 + Math.sin(a) * R).toFixed(2)}" x2="${(50 + Math.cos(a) * (R - l)).toFixed(2)}" y2="${(50 + Math.sin(a) * (R - l)).toFixed(2)}"/>`; }
  const glyphs = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ".repeat(3);
  return `<svg viewBox="0 0 100 100"><g class="r1"><circle cx="50" cy="50" r="48.6"/><circle cx="50" cy="50" r="43.2" class="thin"/>${t}</g><g class="r2"><path id="gmRuneP" d="M50,50 m-39,0 a39,39 0 1,1 78,0 a39,39 0 1,1 -78,0" fill="none"/><text><textPath href="#gmRuneP">${glyphs}</textPath></text><circle cx="50" cy="50" r="35" class="thin"/></g></svg>`; })();
const HOLO_FROM = () => { const L = rankList(); const i = L.indexOf("A"); return i >= 0 ? i : Math.max(0, L.length - 4); };
export function cardHTML(x) {
  const rc = rankColor(x.r), rr = rarColor(x.rar); const holo = rankIdx(x.r) >= HOLO_FROM();
  const art = x.pic ? `<img class="pic" src="${esc(x.pic)}" alt="" draggable="false">` : `<i class="ico" style="--ico:url('${esc(x.icon)}')"></i>`;
  return `<div class="card3d t-${x.tier}${holo ? " holo" : ""}${x.pic ? " haspic" : ""}" style="--rc:${rc};--rr:${rr}"><div class="runes">${RUNES}</div><div class="tilt"><div class="flip">
    <div class="face back"><div class="rings"><i></i><i></i><i></i></div><div class="emb"><i class="fa-solid fa-wand-magic-sparkles"></i></div><div class="sysw">SYSTÈME</div>${["tl", "tr", "bl", "br"].map(k => `<span class="cn ${k}">${CORNER}</span>`).join("")}<i class="bsheen"></i></div>
    <div class="face front"><div class="art"><i class="glow"></i><i class="cons"></i>${art}<i class="floor"></i></div>
      <div class="rank">${rankEmblem(x.r)}</div>
      ${x.dup ? `<div class="rib dup">${x.frag ? `+${x.frag.n} <i class="fr ${x.frag.c}"></i>` : "×2"}</div>` : `<div class="rib new">NOUVEAU</div>`}
      <div class="plate"><i class="horn"></i><div class="stars">${"✦".repeat(STARS[x.tier] || 3)}</div><div class="nm">${esc(x.n)}</div><div class="rar"><span>${esc(x.rar || "")}</span>${x.feat ? '<span class="feat">À L\'AFFICHE</span>' : ""}</div>${x.desc ? `<p class="desc">${esc(x.desc)}</p>` : ""}${x.dup && x.frag ? `<div class="dupl">Déjà possédé · converti en ${esc(fragName(x.frag.c))}</div>` : ""}</div>
      ${["tl", "tr", "bl", "br"].map(k => `<span class="cn ${k}">${CORNER}</span>`).join("")}<i class="frm"></i><i class="shine"></i><i class="holo-l"></i></div></div></div></div>`;
}

/* ── la scène ── */
export class Scene {
  static current = null;
  static play(show, opts = {}) { ac(); Scene.current?.destroy(); const s = new Scene(show, opts); Scene.current = s; s.start(); return s; }
  constructor(show, { observer = false, onAgain = null, startAt = null, members = [], onStart = null } = {}) { this.startAt = startAt; this.members = members || []; this.onStart = onStart; this.show = show; this.observer = observer; this.onAgain = onAgain; this.T = []; this.v = new Voice(); this.i = -1; this.res = show.results || []; this.best = show.best || "low"; try { this.bnr = bannerById(show.banner?.id) || show.banner || {}; this.look = lookFor(this.bnr); } catch (e) { this.bnr = show.banner || {}; this.look = null; } }
  /* origine commune images / sons */
  base(lead = 0.08) { this.t0a = now() + lead; this.t0p = performance.now() + (lead + outLatency()) * 1000; } /* l'image attend que le son sorte vraiment des haut-parleurs */
  at(ms, fn) { this.T.push(setTimeout(() => { try { fn(); } catch (e) { console.error(MOD, e); } }, Math.max(0, this.t0p + ms - performance.now()))); }
  snd(key, ms, o = {}) { return this.v.play(key, { ...o, when: this.t0a + ms / 1000 }); }
  clearT() { for (const t of this.T) clearTimeout(t); this.T = []; }
  hint() { return HINT[this.best] || HINT.low; }
  vid(cls, key, loop) { const v = this.el.querySelector(`video.${cls}`); const src = videoUrl(key); if (!src) { v.remove(); return null; } v.src = src; v.loop = !!loop; v.muted = true; v.playsInline = true; v.preload = "auto"; return v; }
  vplay(v, { from = 0 } = {}) { if (!v) return; clearTimeout(v._pk); try { if (Math.abs(v.currentTime - from) > 0.04) v.currentTime = from; } catch (e) {} v.play().catch(() => {}); }
  /** garde une vidéo « garée » à son point de départ : la prochaine lecture démarre sans recherche (≈ 100 ms gagnées) */
  park(v, from) { if (!v) return; const go = () => { try { v.pause(); v.currentTime = from; } catch (e) {} }; v.addEventListener("loadeddata", go, { once: true }); v.addEventListener("ended", go); if (v.readyState >= 2) go(); }

  async start() {
    const s = this.show; const b = s.banner || {};
    const el = this.el = document.createElement("div"); el.id = "gm-scene"; el.className = `t-${this.best} ${this.observer ? "obs" : ""}`;
    el.style.setProperty("--hc", this.hint()); el.style.setProperty("--b1", b.color || "#6f8cff"); el.style.setProperty("--b2", b.color2 || "#f5c518");
    const muted = game.settings.get(MOD, "muted");
    el.innerHTML = `<video class="v-meteor"></video><div class="sky"></div><canvas class="hy"></canvas><canvas class="hy3"></canvas><video class="v-ring"></video><video class="v-portal"></video><canvas class="fx"></canvas><video class="v-burst"></video><video class="v-rings"></video><video class="v-smoke"></video><video class="v-glitter"></video><video class="v-rays"></video><div class="rays"></div><div class="stage"></div><video class="v-beam"></video><video class="v-flare"></video><video class="v-dust"></video><div class="flash"></div><div class="slash"></div><div class="vign"></div><div class="results"></div>
      <header class="hud"><div class="who"><i class="fa-solid fa-wand-magic-sparkles"></i><span>${this.observer ? `Synthèse de <b>${esc(s.actor?.name)}</b>` : `<b>${esc(s.actor?.name)}</b>`}</span><em>${esc(b.name)}</em></div><div class="btns"><button data-a="vol" title="Volume (musique / effets)"><i class="fa-solid fa-sliders"></i></button><button data-a="mute" title="Son">${muted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>'}</button><button data-a="skip" class="skip">${gi("fa-forward", "icSkip", "sk")}<span>PASSER</span></button></div></header>
      <div class="watchers">${(this.members || []).map(m => medal(m, { small: true })).join("")}</div><div class="tap">Cliquer pour continuer</div><div class="load"><i></i>Ouverture du portail…</div>`;
    document.body.appendChild(el);
    /* 1.23 : la scène Foundry est entièrement cachée pendant la synthèse → on arrête son rendu (gros gain de fluidité), il reprend à la fermeture */
    try { if (canvas?.ready && canvas.app?.ticker?.started) { canvas.app.ticker.stop(); this._tickStop = true; } } catch (e) { /* rien */ } document.body.classList.add("gm-playing");
    this.fx = new FX(el.querySelector("canvas.fx"));
    /* sons décodés et vidéos chargées en mémoire AVANT de commencer : sinon les images arrivent après le son */
    await Promise.all([loadAll(SCENE_SND, 9000), Promise.race([prefetchVideos(), new Promise(r => setTimeout(r, 9000))])]); if (!this.el) return;
    this.vMeteor = this.vid("v-meteor", "vMeteor", true); this.vRing = this.vid("v-ring", "vRing", true); this.vPortal = this.vid("v-portal", "vPortal", true); this.vBurst = this.vid("v-burst", "vBurst", false); this.vBeam = this.vid("v-beam", "vBeam", false); this.vRings = this.vid("v-rings", "vRings", false); this.vSmoke = this.vid("v-smoke", "vSmoke", false); this.vGlitter = this.vid("v-glitter", "vGlitter", true); this.vRays = this.vid("v-rays", "vRays", true); this.vFlare = this.vid("v-flare", "vFlare", false); this.vDust = this.vid("v-dust", "vDust", true);
    this.park(this.vBeam, 4); this.park(this.vFlare, 0.2); this.park(this.vBurst, 0); this.park(this.vRings, 0); this.park(this.vSmoke, 0);
    const t = this.best; if (this.vPortal) this.vPortal.style.filter = FILTER.portal[t]; if (this.vRing) this.vRing.style.filter = FILTER.ring.low; if (this.vBeam) this.vBeam.style.filter = FILTER.beam[t]; if (this.vBurst) this.vBurst.style.filter = FILTER.burst[t];
    /* carte révélée : légère inclinaison 3D et reflet holographique qui suivent la souris */
    el.addEventListener("pointermove", ev => { const c = el.querySelector(".stage .card3d.flipped"); if (!c || this.phase !== "reveal") return; const r = c.getBoundingClientRect(); const px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
      const on = px > -0.35 && px < 1.35 && py > -0.25 && py < 1.25; const cx = Math.max(0, Math.min(1, px)), cy = Math.max(0, Math.min(1, py));
      c.style.setProperty("--rx", on ? `${((cx - 0.5) * 16).toFixed(2)}deg` : "0deg"); c.style.setProperty("--ry", on ? `${((0.5 - cy) * 12).toFixed(2)}deg` : "0deg"); c.style.setProperty("--mx", `${(cx * 100).toFixed(1)}%`); c.style.setProperty("--my", `${(cy * 100).toFixed(1)}%`); c.classList.toggle("hov", on); });
    el.addEventListener("pointerleave", () => { const c = el.querySelector(".stage .card3d"); if (!c) return; c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); c.classList.remove("hov"); });
    el.addEventListener("click", ev => { const a = ev.target.closest("[data-a]")?.dataset.a; if (a) return this.act(a, ev); if (this.phase === "intro" || this.phase === "reveal") this.step(); });
    this._key = ev => { if (ev.key === "Escape") { ev.stopPropagation(); this.phase === "results" ? this.destroy() : this.skip(); } else if ((ev.key === " " || ev.key === "Enter" || ev.key === "ArrowRight") && (this.phase === "intro" || this.phase === "reveal") && !ev.target.closest?.("button,input,textarea,select")) { ev.preventDefault(); ev.stopPropagation(); this.step(); }
      else if ((ev.key === " " || ev.key === "Enter") && ev.target.closest?.("button") && !this.el?.contains(ev.target)) { ev.preventDefault(); ev.stopPropagation(); } };   /* un bouton resté focalisé derrière la scène (Synthétiser ×10…) ne doit pas être « cliqué » au clavier */ document.addEventListener("keydown", this._key, true);
    /* Hyperligne 3D (repli 2D si WebGL indisponible ou désactivé) */
    if (game.settings.get(MOD, "anim3d") !== false) this.hy3 = await Promise.race([Hyper3D.create(el.querySelector("canvas.hy3"), { hint: this.show.fake ? HINT[this.show.fake] : this.hint(), tier: this.show.fake || this.best, real: this.show.fake ? { hint: this.hint(), tier: this.best } : null, map: introMap(tierRank(this.best) >= 2), look: this.look }), new Promise(r => setTimeout(() => r(null), 7000))]);
    if (!this.el) { this.hy3?.destroy(); return; }
    await this.ready([this.vMeteor, this.vRing, this.vPortal, this.vBurst, this.vBeam, this.vRings, this.vFlare, this.vSmoke, this.vGlitter, this.vRays, this.vDust].filter(Boolean), 4000);
    if (this.startAt) { const wait = this.startAt - game.time.serverTime; if (wait > 0) await new Promise(r => setTimeout(r, Math.min(wait, 5000))); }
    if (!this.el) return; el.classList.add("on"); el.querySelector(".load")?.remove(); try { this.onStart?.(); } catch (e) {} this.intro();
  }
  ready(media, timeout) { return Promise.race([Promise.all(media.map(m => new Promise(r => { if (m.readyState >= 3) return r(); const f = () => r(); m.addEventListener("canplaythrough", f, { once: true }); m.addEventListener("error", f, { once: true }); try { m.load(); } catch (e) { r(); } }))), new Promise(r => setTimeout(r, timeout))]); }

  intro() {
    const el = this.el, fx = this.fx, H = this.hint(), t = this.best, high = tierRank(t) >= 2;
    this.phase = "intro"; this.base(0.12); const M = introMap(high), R = o => realT(M, o);
    this.v.startMusic(high ? "callSSR" : "callSR", 0.6, { when: this.t0a, fadeIn: 1.4 });
    /* Hyperligne (longue, calée sur la musique) : montée, plein régime, freinage, porte qui s'allume dans l'accalmie, ouverture sur le grand coup */
    if (this.hy3) { this.hy = this.hy3; this.hy3 = null; el.querySelector("canvas.hy3").classList.add("act"); }
    else { this.hy = new Hyper(el.querySelector("canvas.hy"), { hint: H, tier: t, map: M }); el.querySelector("canvas.hy").classList.add("act"); }
    this.hy.start(this.t0p); el.classList.add("hy-on"); this.tapHint("Toucher l'écran : passer l'animation");
    this.trip(R);
    const is3d = !!this.hy.r;
    if (is3d) { this.snd("trainPass", R(180), { vol: 0.75 }); this.snd("trainBrake", R(HY3.brake0) - 40, { vol: 0.8 }); this.snd("doorLight", R(HY3.glow), { vol: 0.7 }); this.snd("cardWhoosh", R(HY3.snap - 20), { vol: 0.95 }); this.snd("doorOpen", R(HY3.open0), { vol: 0.85 }); if (this.hy.real) this.snd("rankUp", R(HY3.fk) - 140, { vol: 0.95 }); }
    this.snd("rise", R(400), { at: 3.0, vol: 0.8 });
    this.snd("portal", R(2550) - 1500, { vol: is3d ? 0.35 : 0.8 });
    this.snd("meteor", R(3550), { vol: 0.9 });
    this.at(R(HY.impact), () => {
      this.flash(is3d ? (t === "low" ? 0.2 : 0.35) : (t === "low" ? 0.6 : 0.9)); fx.wave(H, 1000, 8); if (high) { fx.wave("#ffffff", 1300, 3, 1.4); this.shake(t === "S" ? 1 : 2); }
      fx.streaks(H, high ? 150 : 90, high ? 1400 : 1100); fx.burst(H, high ? 200 : 110, high ? 12 : 8, 1500); this.vplay(this.vMeteor);
    });
    this.at(R(4450), () => el.classList.add("hy-out"));
    /* fondu au blanc à travers la porte (la première carte sort de cette lumière) */
    this.at(R(4450) - 200, () => { const f = el.querySelector(".flash"); if (!f) return; f.style.transition = "opacity 700ms ease-in"; f.style.opacity = 0.92; });
    this.at(R(HY.end), () => { this.phase = "reveal"; this._fromIntro = true; this.next(); });
  }
  /** panneau « Destination » du voyage (personnalisable par bannière) : départ ──► planète, galaxie en dessous */
  trip(R) {
    const tp = this.bnr?.trip || {}; if (tp.on === false) return; const p = this.look?.planet, g = this.look?.galaxy; const to = tp.to || p?.name; if (!to) return;
    const d = document.createElement("div"); d.className = "trip";
    d.innerHTML = `<small class="lb">${esc(tp.label || "Destination")}</small><div class="route"><span class="a">${tp.from ? esc(tp.from) : '<i class="fa-solid fa-train-subway"></i>'}</span><span class="line"><i class="dot"></i><i class="head"></i></span><span class="b">${esc(to)}</span></div>${g?.name && tp.galaxy !== false ? `<em class="gx"><i class="fa-solid fa-hurricane"></i> ${esc(g.name)}</em>` : ""}`;
    this.el.appendChild(d); this.at(R(180), () => d.classList.add("on")); this.at(R(1750), () => { d.classList.add("off"); setTimeout(() => d.remove(), 900); });
  }
  /** texte d'aide en bas de l'écran (passer, continuer) */
  tapHint(txt, on = true) { const t = this.el?.querySelector(".tap"); if (!t) return; t.textContent = txt; t.classList.toggle("on", on); }
  /** toucher l'écran / Espace / Entrée : une étape. Intro → première carte ; carte de haut rang pas encore retournée → la retourner tout de suite ; sinon → carte suivante */
  step() {
    if (this.phase === "intro") { this.el.querySelector(".trip")?.remove(); this.clearT(); this.v.stopFx(); this.el.classList.add("hy-out"); this.phase = "reveal"; this._fromIntro = true; return this.next(); }
    if (this.phase !== "reveal") return;
    const x = this.res[this.i]; if (x && !this.faceShown) return this.revealNow(x);   /* carte encore cachée : on la montre retournée */
    this.next({ instant: true });                                                       /* carte suivante : directement révélée (fin de son animation) */
  }
  /** on saute la montée et on montre la carte retournée, comme à la fin de son animation (S et plus : révélation pleine page) */
  revealNow(x) {
    this.clearT(); this.v.stopFx(); this.base(0.03); const el = this.el, card = el.querySelector(".stage .card3d"); if (!card) return this.next(); const fx = this.fx, rc = x.tier === "SSS" ? "#f5c518" : rankColor(x.r);
    if (tierRank(x.tier) < 2) { const mid = x.tier === "mid"; card.classList.remove("silhouette"); card.classList.add("show", "fast", "flipped", "sweep"); if (mid) el.classList.add("aura");
      this.snd("flip", 0, { vol: 0.7 }); this.snd(revealSound(x), 60, { vol: 0.7 }); fx.burst(rankColor(x.r), mid ? 70 : 30, mid ? 8 : 5, 1000); if (mid) fx.streaks(rankColor(x.r), 50, 900);
      this.faceShown = true; this.canNext = true; this.tapHint("Cliquer pour continuer"); this.at(mid ? 2200 : 1400, () => this.next()); return; }
    el.classList.remove("black"); el.classList.add("dark", "aura"); if (x.tier !== "S") el.classList.add("prism"); if (x.tier === "SSS") el.classList.add("rainbow"); el.querySelector(".slash")?.classList.remove("on");
    card.classList.remove("silhouette"); card.classList.add("show", "fast", "flipped", "slam", "sweep"); if (x.tier === "SS") card.classList.add("chroma"); if (x.tier === "SSS") card.classList.add("rainbow", "title", "glowback", "rainbowback");
    this.snd("flip", 0, { vol: 0.8 }); this.snd(revealSound(x), 0, { at: Math.max(0, climaxOf(x.tier) - 0.12), vol: 0.85 }); this.snd("shimmer", 200, { vol: 0.55 }); this.flash(0.5, 500);
    fx.burst(rc, 160, 12, 1500, x.tier === "SSS" ? [...RAINBOW, "#ffffff"] : undefined); fx.wave(rc, 1000, 6); this.v.fade(0.55, 0.8);
    this.faceShown = true; this.canNext = true; this.tapHint("Cliquer pour continuer");
    if (x.tier !== "S") this.splash(x, 900); this.at(x.tier === "S" ? 4500 : 7000, () => this.next());
  }
  /** vidéo d'effet : la montre (opacité o) et la lance depuis `from`, ou la cache */
  fx2(v, o, { from = 0, ms = 500 } = {}) { if (!v) return; if (o > 0) { this.vplay(v, { from }); } v.style.transition = `opacity ${ms}ms`; v.style.opacity = o; if (!o) { clearTimeout(v._pk); v._pk = setTimeout(() => { try { v.pause(); } catch (e) {} }, ms + 50); } }
  flareHit(o = 1) { const v = this.vFlare; if (!v) return; o *= 0.8; this.vplay(v, { from: 0.2 }); v.style.transition = "none"; v.style.opacity = o; void v.offsetWidth; v.style.transition = "opacity 2.2s ease-in"; v.style.opacity = 0; v._pk = setTimeout(() => { try { v.pause(); v.currentTime = 0.2; } catch (e) {} }, 2350); }
  flash(o = 0.9, ms = 520) { o *= 0.65; const f = this.el.querySelector(".flash"); f.style.transition = "none"; f.style.opacity = o; void f.offsetWidth; f.style.transition = `opacity ${ms}ms ease-out`; f.style.opacity = 0; }
  beam(o = 0.9, ms = 900) { const v = this.vBeam; if (!v) return this.flash(o, ms); o *= 0.75; this.vplay(v, { from: 4 }); v.style.transition = "none"; v.style.opacity = o; void v.offsetWidth; v.style.transition = `opacity ${ms}ms ease-in`; v.style.opacity = 0; v._pk = setTimeout(() => { try { v.pause(); v.currentTime = 4; } catch (e) {} }, ms + 120); }
  shake(lv = 1) { this.el.classList.remove("shake1", "shake2", "shake3"); void this.el.offsetWidth; this.el.classList.add(`shake${lv}`); }

  next({ instant = false } = {}) {
    this.clearT(); this.v.stopFx(); this.i++; const st = this.el.querySelector(".stage");
    if (this.hy) { const h = this.hy; this.hy = null; setTimeout(() => { h.destroy(); this.el?.classList.remove("hy-on", "hy-out"); }, 450); } /* l'Hyperligne finit de s'éteindre pendant la première révélation */
    this.el.querySelector(".splash")?.remove(); st.classList.remove("away");
    if (this.i >= this.res.length) return this.results();
    const x = this.res[this.i]; const t = x.tier; this.canNext = false; this.faceShown = false; this.tapHint("Toucher l'écran : passer", tierRank(t) >= 2); this.base(0.05);
    this.el.dataset.rt = t; this.el.style.setProperty("--rc", rankColor(x.r)); st.innerHTML = cardHTML(x) + `<div class="count">${this.i + 1} / ${this.res.length}</div>`;
    if (!this._amb) { this._amb = true; const sk = this.look?.skin; if (sk?.fx) this.fx.ambient(sk.fx, (sk.colors || ["#ffffff"]).slice(0, 4)); }
    if (this._fromIntro) { this._fromIntro = false; const f = this.el.querySelector(".flash"); if (f) { f.style.transition = "none"; f.style.opacity = 0.92; void f.offsetWidth; f.style.transition = "opacity 900ms ease-out"; f.style.opacity = 0; } }
    const card = st.querySelector(".card3d"); const rc = rankColor(x.r); const fx = this.fx; const el = this.el;
    el.classList.remove("dark", "black", "prism", "rainbow", "aura"); fx.clear(); for (const v of [this.vGlitter, this.vRays, this.vSmoke, this.vRings]) this.fx2(v, 0, { ms: 250 });
    if (instant) return this.revealNow(x);
    const done = (ms, auto) => { this.at(ms, () => { this.canNext = true; this.tapHint("Cliquer pour continuer"); }); if (auto) this.at(auto, () => this.next()); };
    /* retournement : la face apparaît à 42,6 % de l'animation (950 ms en commun, 700 ms pour les rangs S et plus) */
    const FACE_LOW = 405, FACE_HI = 298;
    const flipAt = (face, fast) => { const start = Math.max(0, face - (fast ? FACE_HI : FACE_LOW)); this.at(face, () => { this.faceShown = true; }); this.at(start, () => { card.classList.remove("silhouette"); if (fast) card.classList.add("fast"); card.classList.add("show", "flipped"); }); };
    if (t === "low" || t === "mid") {
      const face = 785; this.snd("cardWhoosh", 0, { vol: 0.55 }); this.at(0, () => card.classList.add("show")); flipAt(face, false);
      this.snd("flip", face - 150, { vol: 0.8 }); this.snd(revealSound(x), face - 70, { vol: 0.75 });
      this.at(face, () => { fx.burst(rc, t === "mid" ? 80 : 36, t === "mid" ? 8 : 5, 1100); if (t === "mid") { fx.wave(rc, 800, 4, 0.7); fx.streaks(rc, 60, 1000); el.classList.add("aura"); } card.classList.add("sweep"); });
      done(face + 250, face + (t === "mid" ? 2200 : 1300)); return;
    }
    if (t === "S") {
      const F = Math.round(climaxOf("S") * 1000);
      this.v.fade(0.2, 0.3); el.classList.add("dark"); fx.converge("#ffd77a", 140, Math.max(1500, F - 900));
      this.snd("revS", 0, { vol: 1 });
      this.at(440, () => { this.flash(0.22, 500); fx.wave("#ffd77a", 900, 3, 0.6); this.shake(1); });
      this.snd("cardWhoosh", Math.min(1250, F - 900), { vol: 0.6 }); this.at(Math.min(1250, F - 900), () => card.classList.add("show", "glowback"));
      if (2670 < F - 400) this.at(2670, () => { this.fx2(this.vGlitter, 0.45, { ms: 700 }); fx.wave("#ffd77a", 900, 4, 0.8); fx.shards("#ffd77a", 6, 700); this.shake(1); });
      flipAt(F, true);
      this.at(F, () => { this.flareHit(0.9); this.fx2(this.vGlitter, 0.7, { ms: 900 }); this.beam(0.85, 800); fx.streaks("#ffd77a", 140, 1300, ["#ffd77a", "#ffffff", "#ffb347"]); fx.burst("#ffd77a", 180, 12, 1700, ["#ffd77a", "#ffffff", "#ffb347"]); fx.shards("#ffd77a", 12, 1000); fx.wave("#ffd77a", 1100, 8); this.shake(1); el.classList.add("aura"); card.classList.add("slam"); });
      this.snd("shimmer", F + 880, { vol: 0.6 }); this.at(F + 900, () => { fx.embers("#ffd77a", 50, 3500); card.classList.add("sweep"); });
      this.at(F + 1800, () => this.v.fade(0.55, 1.2));
      done(F + 400, F + 3600); return;
    }
    if (t === "SS") {
      const F = Math.round(climaxOf("SS") * 1000);
      this.v.fade(0.1, 0.25); el.classList.add("black"); this.snd("revSS", 0, { vol: 1 });
      this.at(Math.min(800, F - 700), () => { this.beam(1, 600); fx.shards("#ff6a3c", 16, 1200, ["#ff5a36", "#ffb347", "#ffffff"]); this.shake(2); card.classList.add("show", "silhouette"); });
      this.at(Math.min(1100, F - 500), () => { el.classList.remove("black"); el.classList.add("dark", "prism"); fx.embers("#ff7a3c", 90, Math.max(2000, F - 1100)); this.fx2(this.vSmoke, 0.85, { ms: 600 }); });
      if (4000 < F - 500) this.at(4000, () => { fx.wave("#ff7a3c", 1000, 5, 0.9); fx.shards("#ff6a3c", 10, 900); this.shake(1); });
      if (5500 < F - 500) this.at(5500, () => { this.flash(0.3, 500); fx.wave("#ffb347", 900, 4, 0.8); });
      flipAt(F, true);
      this.at(F, () => { this.flareHit(1); this.fx2(this.vSmoke, 0, { ms: 900 }); this.fx2(this.vGlitter, 0.55, { ms: 900 }); this.flash(1, 650); fx.streaks("#ff7a3c", 160, 1400, ["#ff5a36", "#ffd77a", "#ffffff"]); fx.wave("#ff5a36", 1100, 10); fx.wave("#ffd77a", 1500, 4, 1.4); fx.burst("#ff7a3c", 220, 14, 1800, ["#ff5a36", "#ffd77a", "#ffffff"]); fx.shards("#ffd77a", 18, 1300); this.shake(3); card.classList.add("slam", "chroma"); el.classList.add("aura"); });
      this.snd("shimmer", F + 600, { vol: 0.6 }); this.at(F + 620, () => card.classList.add("sweep"));
      this.at(F + 1700, () => this.v.fade(0.55, 1.4));
      this.splash(x, F + 1500); done(F + 400, F + 6200); return;
    }
    /* SSS : silence et étoile, puis la musique ; son climax tombe sur le retournement */
    const D = 1800, F = D + Math.round(climaxOf("SSS") * 1000);
    this.v.fade(0, 0.3); el.classList.add("black"); fx.star("#f5c518", F - 300);
    this.snd("revSSS", D, { vol: 1 });
    this.at(D + 510, () => { el.querySelector(".slash").classList.add("on"); this.flash(0.4, 400); this.fx2(this.vSmoke, 0.7, { ms: 800 }); });
    if (D + 2008 < F - 600) this.at(D + 2008, () => { this.flareHit(1); this.beam(1, 900); el.classList.remove("black"); el.classList.add("dark", "prism", "rainbow"); this.shake(2); fx.shards("#ffffff", 22, 1400, RAINBOW); });
    this.at(Math.min(D + 2600, F - 700), () => { el.classList.remove("black"); el.classList.add("dark", "prism", "rainbow"); this.vplay(this.vPortal); el.classList.add("p-portal"); fx.wave("#ffffff", 900, 6, 0.9); card.classList.add("show", "glowback", "rainbowback"); });
    this.at(F - 610, () => { this.flash(0.35, 300); fx.wave("#ffffff", 700, 4, 0.8); });
    flipAt(F, true);
    this.at(F, () => { this.flareHit(1); this.fx2(this.vSmoke, 0, { ms: 600 }); this.fx2(this.vRays, 0.8, { ms: 1200 }); this.flash(1, 900); fx.streaks("#ffffff", 200, 1600, [...RAINBOW, "#ffffff", "#f5c518"]); fx.burst("#ffffff", 280, 16, 2200, [...RAINBOW, "#ffffff"]); fx.wave("#f5c518", 1400, 12, 1.5); fx.shards("#f5c518", 24, 1600, ["#f5c518", "#ffffff", "#fff46b"]); this.shake(3); card.classList.add("slam", "rainbow"); el.classList.add("aura"); el.querySelector(".slash").classList.remove("on"); });
    this.snd("shimmer", F + 570, { vol: 0.7 }); this.at(F + 590, () => { card.classList.add("sweep", "title"); fx.embers("#f5c518", 110, 5000); });
    this.at(F + 1900, () => this.v.fade(0.6, 1.8));
    this.splash(x, F + 1900); done(F + 700, F + 7200);
  }
  /** révélation pleine page (SS / SSS) : grande illustration, rang en grand qui s'imprime, nom, rareté, citation, tampon */
  splash(x, ms) {
    this.at(ms, () => { const el = this.el; if (!el) return; el.querySelector(".splash")?.remove(); const d = document.createElement("div"); d.className = `splash t-${x.tier}`; d.style.setProperty("--rc", rankColor(x.r));
      const sub = [x.rar, x.cat].filter(Boolean).map(esc).join(" · ");
      const art = x.pic ? `<img class="pic" src="${esc(x.pic)}" alt="" draggable="false">` : `<i class="ico" style="--ico:url('${esc(x.icon)}')"></i>`;
      d.innerHTML = `<div class="sp-bg"></div><div class="sp-streaks"><i></i><i></i><i></i><i></i><i></i></div><div class="sp-art"><div class="sp-halo"></div><div class="sp-rays"></div><div class="sp-ring"></div>${art}</div>
        <div class="sp-info"><div class="sp-rk">${rankEmblem(x.r, "big")}<span class="stars">${"✦".repeat(STARS[x.tier] || 5)}</span></div><h1 class="sp-nm">${esc(x.n)}</h1>${sub ? `<div class="sp-sub">${sub}</div>` : ""}${x.desc ? `<blockquote>${esc(x.desc)}</blockquote>` : ""}<em class="sp-stamp ${x.dup ? "dup" : "new"}">${x.dup ? (x.frag ? `Doublon · +${x.frag.n} ${esc(fragName(x.frag.c))}` : "Doublon") : "Nouvelle acquisition"}</em></div>`;
      el.appendChild(d); void d.offsetWidth; d.classList.add("on"); el.querySelector(".stage")?.classList.add("away");
      const c = x.tier === "SSS" ? "#ffffff" : rankColor(x.r), cols = x.tier === "SSS" ? [...RAINBOW, "#ffffff", "#f5c518"] : [c, "#ffffff", rankColor(x.r)];
      this.flash(0.9, 700); this.shake(x.tier === "SSS" ? 2 : 1); this.fx.streaks(c, 160, 1500, cols); this.fx.burst(c, 200, 13, 1800, cols); this.fx.wave(c, 1100, 7, 1.2);
      this.at(ms + 520, () => { this.snd("flip", 0, { vol: 0.5 }); this.shake(1); this.fx.wave(rankColor(x.r), 700, 4, 0.5); }); });
    this.snd("cardWhoosh", ms, { vol: 0.7 });
  }
  act(a, ev) { if (a === "vol") return volPop(ev?.target?.closest("[data-a]") || this.el.querySelector('[data-a="vol"]')); if (a === "skip") return this.phase === "results" ? this.destroy() : this.skip(); if (a === "mute") { const m = toggleMute(); this.el.querySelector('[data-a="mute"]').innerHTML = m ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>'; } if (a === "close") return this.destroy(); if (a === "pick") return this.pick(ev?.target?.closest("[data-i]")); if (a === "dcSel" || a === "dcAll") return this.deconAsk(a === "dcAll"); if (a === "dcNo") return this.el.querySelector(".dconf")?.remove(); if (a === "dcOk") return this.deconGo(); if (a === "again1" || a === "again10") { if (this._again) return; this._again = true; this.el?.querySelectorAll('[data-a^="again"]').forEach(b => b.disabled = true); const n = a === "again10" ? 10 : 1; const again = this.onAgain; this.onAgain = null; this.destroy(); again?.(n); } }
  skip() { this.el?.querySelector(".trip")?.remove(); this.hy?.destroy(); this.hy = null; this.el?.classList.remove("hy-on", "hy-out"); this.clearT(); this.v.stopFx(); this.fx.clear(); this.results(); }

  /** fin de la scène pour le joueur qui a tiré : l'annonce aux autres peut partir */
  releaseAnn() { if (this._annDone || this.observer || !this.show?.pid || this.show.pid === "demo") return; this._annDone = true; import("./engine.js").then(m => m.gmDo("annNow", { pid: this.show.pid })).catch(() => {}); }
  results() {
    this.releaseAnn(); this.clearT(); this.el.querySelector(".trip")?.remove(); this.phase = "results"; this.base(0.05); const el = this.el; el.classList.remove("p-charge", "ring-in", "dark", "black", "prism", "rainbow", "aura"); el.classList.add("p-results");
    for (const v of [this.vGlitter, this.vRays, this.vSmoke, this.vRings]) this.fx2(v, 0, { ms: 300 }); this.fx2(this.vDust, 0.55, { ms: 1200 });
    el.querySelector(".splash")?.remove(); el.querySelector(".stage").classList.remove("away"); el.querySelector(".stage").innerHTML = ""; el.querySelector(".tap").classList.remove("on");
    el.querySelector('[data-a="skip"]').innerHTML = '<i class="fa-solid fa-xmark"></i><span>FERMER</span>';
    const R = this.res; const order = R.map((x, i) => ({ x, i })).sort((a, b) => rankIdx(b.x.r) - rankIdx(a.x.r) || a.i - b.i); const per = R.length > 5 ? Math.ceil(R.length / 2) : R.length;
    const rows = []; for (let j = 0; j < order.length; j += per) rows.push(order.slice(j, j + per));
    const canDc = !this.observer && (!!this.show.actor?.uuid || this.show.pid === "demo"); const dcOk = x => canDc && (x.item || this.show.pid === "demo") && !x.decon && !x.frag;
    const tile = ({ x, i }, k) => `<div class="tile t-${x.tier}${dcOk(x) ? " dc" : ""}${x.dup ? " isdup" : ""}" data-i="${i}" ${dcOk(x) ? `data-a="pick" title="Sélectionner pour déconstruire"` : ""} style="--rc:${rankColor(x.r)};--d:${k * 70}ms"><span class="pickmk"><i class="fa-solid fa-check"></i></span><span class="cn tl">${CORNER}</span><span class="cn br">${CORNER}</span><div class="em"><div class="badge">${rankEmblem(x.r)}</div><div class="stars">${"✦".repeat(STARS[x.tier] || 3)}</div><div class="nm">${esc(x.n)}</div></div><div class="pic">${x.pic ? `<img src="${esc(x.pic)}" alt="" draggable="false">` : `<i class="ico" style="--ico:url('${esc(x.icon)}')"></i>`}</div>${x.dup ? `<span class="tg dup${x.frag ? " cv" : ""}"${x.frag ? ` data-c="${x.frag.c}" data-n="${x.frag.n}"` : ""}><b class="w">Doublon</b>${x.frag ? `<b class="f">+${x.frag.n} <i class="fr ${x.frag.c}"></i></b>` : ""}</span>` : '<span class="nw" title="Nouvel objet"></span>'}</div>`;
    let k = 0; const g = this.show.gain || {};
    const nNew = R.filter(x => !x.dup).length, nDup = R.length - nNew;
    el.querySelector(".results").innerHTML = `<div class="rhead"><i class="fa-solid fa-wand-magic-sparkles"></i> RÉSULTATS DE LA SYNTHÈSE</div>${R.length > 1 ? `<div class="rsum"><span class="new">${nNew} nouveau${nNew > 1 ? "x" : ""}</span><span>${nDup} doublon${nDup > 1 ? "s" : ""}</span></div>` : ""}<div class="grid n${R.length > 1 ? 10 : 1}">${rows.map(r => `<div class="row">${r.map(x => tile(x, k++)).join("")}</div>`).join("")}</div>
      <div class="rfoot">${g.stellar || g.astral ? `<div class="gain">${g.stellar ? `<span data-g="stellar"><i class="fr stellar"></i>+<b>${g.stellar}</b> ${esc(fragName("stellar"))}</span>` : ""}${g.astral ? `<span data-g="astral"><i class="fr astral"></i>+<b>${g.astral}</b> ${esc(fragName("astral"))}</span>` : ""}</div>` : ""}
      ${R.some(dcOk) ? `<div class="decon"><span class="dtxt"><i class="fa-solid fa-atom"></i> Clique sur une carte pour la choisir, puis déconstruis-la en ${esc(fragName("stellar"))} / ${esc(fragName("astral"))}.</span><button data-a="dcSel" disabled><i class="fa-solid fa-burst"></i> Déconstruire la sélection</button><button data-a="dcAll" class="dall"><i class="fa-solid fa-atom"></i> Tout déconstruire</button></div>` : ""}
      <div class="acts">${this.observer || !this.onAgain ? "" : `<button data-a="again1"><i class="fa-solid fa-wand-magic-sparkles"></i> Synthétiser ×1</button><button data-a="again10" class="gold"><i class="fa-solid fa-wand-magic-sparkles"></i> Synthétiser ×10</button>`}<button data-a="close">Fermer</button></div></div>`;
    this.fitResults(); if (!this._fitRO) { this._fitRO = () => this.fitResults(); window.addEventListener("resize", this._fitRO); }
    /* doublons : l'objet se change en fragments qui filent vers le compteur */
    const cv = [...el.querySelectorAll(".results .tg.cv")], acc = { stellar: 0, astral: 0 }, t0 = R.length * 70 + 650;
    cv.forEach((tg, j) => this.at(t0 + j * 260, () => { tg.classList.add("on"); const c = tg.dataset.c, n = Number(tg.dataset.n) || 0, dst = el.querySelector(`.rfoot .gain [data-g="${c}"]`); if (!dst) return;
      const a = tg.getBoundingClientRect(), b = dst.getBoundingClientRect(); for (let k = 0; k < Math.min(5, n); k++) { const f = document.createElement("i"); f.className = `fr ${c} gm-fly`; f.style.left = a.left + a.width / 2 + "px"; f.style.top = a.top + a.height / 2 + "px"; el.appendChild(f);
        f.animate([{ transform: "translate(-50%,-50%) scale(1.4)", opacity: 1 }, { transform: `translate(calc(-50% + ${(b.left + 22 - a.left - a.width / 2) * 0.5 + (k - 2) * 26}px), calc(-50% + ${(b.top - a.top) * 0.35 - 60}px)) scale(1.1)`, opacity: 1, offset: 0.45 }, { transform: `translate(calc(-50% + ${b.left + 22 - a.left - a.width / 2}px), calc(-50% + ${b.top + b.height / 2 - a.top - a.height / 2}px)) scale(.6)`, opacity: .2 }], { duration: 720 + k * 60, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" }).onfinish = () => f.remove(); }
      this.at(t0 + j * 260 + 700, () => { acc[c] += n; dst.classList.remove("bump"); void dst.offsetWidth; dst.classList.add("bump"); }); }));
    this.at(t0 + cv.length * 260 + 800, () => { for (const c of ["stellar", "astral"]) { const b = el.querySelector(`.rfoot .gain [data-g="${c}"] b`); if (b) b.textContent = g[c] || 0; } });
    for (let i = 0; i < R.length; i++) this.snd("flip", i * 70 + 60, { vol: 0.25 });
    if (g.stellar || g.astral) this.snd(g.astral ? "dupRare" : "dupBasic", R.length * 70 + 650 + 700, { vol: 0.8 });
    const bestTile = R.reduce((m, x) => tierRank(x.tier) > m ? tierRank(x.tier) : m, 0); if (bestTile >= 2) this.at(R.length * 70 + 200, () => this.fx.burst(this.hint(), 110, 9, 1400));
    this.v.soften(0.4);   /* partie douce de la musique, en boucle (jamais le retour au début intense) */
  }
  /* ── déconstruction des objets obtenus (en fragments) ── */
  pick(tile) { if (!tile || tile.classList.contains("gone")) return; tile.classList.toggle("sel"); this.dcBtn(); }
  dcBtn() { const n = this.el.querySelectorAll(".results .tile.sel").length; const b = this.el.querySelector('.results [data-a="dcSel"]'); if (b) { b.disabled = !n; b.innerHTML = `<i class="fa-solid fa-burst"></i> Déconstruire la sélection${n ? ` (${n})` : ""}`; } }
  deconAsk(all) {
    const el = this.el; const tiles = all ? [...el.querySelectorAll(".results .tile.dc:not(.gone)")] : [...el.querySelectorAll(".results .tile.sel:not(.gone)")]; if (!tiles.length) return;
    const xs = tiles.map(t => this.res[Number(t.dataset.i)]); this._dc = tiles; const g = { stellar: 0, astral: 0 }; for (const x of xs) { const f = fragFor(x.r); g[f.c] += f.n; }
    const high = xs.filter(x => tierRank(x.tier) >= 2);
    el.querySelector(".dconf")?.remove(); const d = document.createElement("div"); d.className = "dconf";
    d.innerHTML = `<div class="dbox${high.length ? " warn" : ""}"><h3><i class="fa-solid fa-atom"></i> ${all ? "Tout déconstruire" : "Déconstruire"}</h3><p>${xs.length} objet${xs.length > 1 ? "s" : ""} ${xs.length > 1 ? "seront transformés" : "sera transformé"} en poussière d'étoile :</p>
      <div class="dgain">${g.stellar ? `<span><i class="fr stellar"></i> +${g.stellar} ${esc(fragName("stellar"))}</span>` : ""}${g.astral ? `<span><i class="fr astral"></i> +${g.astral} ${esc(fragName("astral"))}</span>` : ""}</div>
      ${high.length ? `<div class="dwarn"><i class="fa-solid fa-triangle-exclamation"></i><div><b>Attention : ${high.length} objet${high.length > 1 ? "s" : ""} de rang S ou plus</b><span>${high.map(x => `${rankEmblem(x.r, "mini")} ${esc(x.n)}`).join("<br>")}</span></div></div>` : ""}
      <p class="dnote">L'objet disparaît de la fiche. Impossible d'annuler.</p><div class="dbt"><button data-a="dcNo">Annuler</button><button data-a="dcOk" class="${high.length ? "danger" : "gold"}"><i class="fa-solid fa-burst"></i> Déconstruire</button></div></div>`;
    el.querySelector(".results").appendChild(d);
  }
  async deconGo() {
    const el = this.el; const tiles = this._dc || []; el.querySelector(".dconf")?.remove(); if (!tiles.length) return; const xs = tiles.map(t => this.res[Number(t.dataset.i)]);
    let res; if (this.show.pid === "demo") { res = { gain: { stellar: 0, astral: 0 }, done: xs.map(x => { const f = fragFor(x.r); return { item: x.item || x.id, c: f.c, n: f.n }; }) }; for (const d of res.done) res.gain[d.c] += d.n; }
    else res = await (await import("./engine.js")).gmDo("decon", { actor: this.show.actor.uuid, items: xs.map(x => ({ item: x.item, stack: !!x.stack })) });
    if (!res || !this.el) return;
    const g = this.show.gain ||= { stellar: 0, astral: 0 }; let foot = el.querySelector(".rfoot .gain"); if (!foot) { foot = document.createElement("div"); foot.className = "gain"; el.querySelector(".rfoot").prepend(foot); }
    for (const c of ["stellar", "astral"]) if (res.gain[c] && !foot.querySelector(`[data-g="${c}"]`)) foot.insertAdjacentHTML("beforeend", `<span data-g="${c}"><i class="fr ${c}"></i>+<b>${g[c] || 0}</b> ${esc(fragName(c))}</span>`);
    tiles.forEach(t => t.classList.remove("sel")); const left = [...xs]; tiles.forEach((tile, j) => { const x = xs[j]; const d = res.done.find(z => z.item === (x.item || x.id) && left.includes(x)); if (!d) return; left.splice(left.indexOf(x), 1); x.decon = true;
      setTimeout(() => { if (!this.el) return; tile.classList.remove("sel", "dc"); tile.classList.add("gone"); tile.insertAdjacentHTML("beforeend", '<span class="dcl"><i class="fa-solid fa-atom"></i> Déconstruit</span>'); tile.removeAttribute("data-a"); const dst = foot.querySelector(`[data-g="${d.c}"]`); this.fly(tile, dst, d.c, d.n);
        setTimeout(() => { g[d.c] = (g[d.c] || 0) + d.n; const b = dst?.querySelector("b"); if (b) b.textContent = g[d.c]; dst?.classList.remove("bump"); void dst?.offsetWidth; dst?.classList.add("bump"); }, 700); }, j * 140); });
    this.snd("dupBasic", 200, { vol: 0.7 }); this._dc = null; this.dcBtn();
    if (!el.querySelector(".results .tile.dc")) el.querySelector(".results .decon")?.remove();
  }
  /** petites particules de fragments qui filent d'une carte vers le compteur */
  fly(from, dst, c, n) { if (!dst) return; const el = this.el; const a = from.getBoundingClientRect(), b = dst.getBoundingClientRect();
    for (let k = 0; k < Math.min(6, Math.max(2, n)); k++) { const f = document.createElement("i"); f.className = `fr ${c} gm-fly`; f.style.left = a.left + a.width / 2 + "px"; f.style.top = a.top + a.height / 2 + "px"; el.appendChild(f);
      f.animate([{ transform: "translate(-50%,-50%) scale(1.4)", opacity: 1 }, { transform: `translate(calc(-50% + ${(b.left + 22 - a.left - a.width / 2) * 0.5 + (k - 2) * 26}px), calc(-50% + ${(b.top - a.top) * 0.35 - 60}px)) scale(1.1)`, opacity: 1, offset: 0.45 }, { transform: `translate(calc(-50% + ${b.left + 22 - a.left - a.width / 2}px), calc(-50% + ${b.top + b.height / 2 - a.top - a.height / 2}px)) scale(.6)`, opacity: .2 }], { duration: 720 + k * 60, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" }).onfinish = () => f.remove(); } }
  /** la grille des résultats se réduit pour tenir dans l'écran (petites fenêtres, zoom Windows) */
  fitResults() { const el = this.el, g = el?.querySelector(".results .grid"); if (!g) return; g.style.scale = ""; g.style.translate = "";
    const top = Math.max(el.querySelector(".results .rhead")?.getBoundingClientRect().bottom || 0, el.querySelector(".results .rsum")?.getBoundingClientRect().bottom || 0) + 14, bot = (el.querySelector(".results .rfoot")?.getBoundingClientRect().top || window.innerHeight) - 14;
    const r = g.getBoundingClientRect(), k = Math.max(0.4, Math.min(1, (window.innerWidth - 40) / r.width, (bot - top) / r.height)); if (k < 1) g.style.scale = String(k);
    const r2 = g.getBoundingClientRect(), dy = (top + bot) / 2 - (r2.top + r2.bottom) / 2; if (Math.abs(dy) > 2) g.style.translate = `0 ${Math.round(dy)}px`; }
  destroy() { document.body.classList.remove("gm-playing"); try { if (this._tickStop) { this._tickStop = false; canvas?.app?.ticker?.start(); } } catch (e) { /* rien */ } this.releaseAnn(); if (this._fitRO) window.removeEventListener("resize", this._fitRO); this.hy?.destroy(); this.hy = null; this.hy3?.destroy(); this.hy3 = null; this.clearT(); this.v.stopFx(); this.v.stopMusic(0.6); this.fx?.destroy(); document.removeEventListener("keydown", this._key, true); const el = this.el; this.el = null; if (el) { el.classList.add("out"); setTimeout(() => el.remove(), 450); } if (Scene.current === this) Scene.current = null; Hooks.callAll("gachaSceneClosed", this.show); }
}

/* aperçu sans tirage réel (bouton MJ « Tester les animations ») */
export function demoShow(tier = "SSS", fake) {
  /* objets réels du Catalogue (avec leur illustration si le pack d'icônes est réglé), sinon objets fictifs */
  const items = catDB()?.items || []; const used = new Set();
  const real = (r) => { const L = items.filter(e => e.rang === r && !used.has(e.id)); const withPic = L.filter(e => itemPic(e)); const src = withPic.length ? withPic : L; if (!src.length) return null; const e = src[Math.floor(Math.random() * src.length)]; used.add(e.id); return e; };
  const sample = (r, tr, n, rar) => { const e = real(r); return { id: e?.id || "demo-" + r + n, n: e?.n || n, r, rar: e?.rar || rar, cat: e?.cat || "", tier: tr, icon: e ? catIconPath(e) : absUrl(`modules/last-horizon-catalogue/icons/${tr === "SSS" ? "crown" : tr === "SS" ? "sword" : tr === "S" ? "gem" : tr === "mid" ? "shield" : "box"}.svg`), pic: e ? itemPic(e) : "", desc: "Aperçu de la mise en scène — aucun objet n'est créé.", dup: false, feat: tr === tier && tier !== "low" }; };
  const res = [sample("F", "low", "Ration du voyageur", "Commun"), sample("E", "low", "Corde tressée", "Ordinaire"), sample("D", "low", "Lanterne de mineur", "Rare"), sample("B", "mid", "Lame d'acier bleu", "Très Rare"), sample("C", "low", "Potion de soin", "Commun+"), sample("A", "mid", "Cape d'ombre", "Épique"), sample("E", "low", "Boussole", "Commun"), sample("D", "low", "Gants de cuir", "Peu Commun"), sample("C", "low", "Bouclier rond", "Rare")];
  const top = { S: () => sample("S", "S", "Arc des Vents Lointains", "Légendaire"), SS: () => sample("SS", "SS", "Épée du Crépuscule Écarlate", "Mythique"), SSS: () => sample("SSS", "SSS", "Couronne du Souverain des Astres", "Artefact"), mid: () => sample("A", "mid", "Armure du Veilleur", "Épique"), low: () => sample("C", "low", "Dague effilée", "Rare") }[tier]();
  res.splice(6, 0, top); res[9].dup = true; res[9].frag = { c: "stellar", n: 3 };
  return { pid: "demo", user: game.user.id, actor: { name: game.user.character?.name || game.user.name }, banner: { name: "Aperçu des animations", color: "#6f8cff", color2: "#f5c518" }, results: res, gain: { stellar: 3, astral: 0 }, best: tier, fake: fake !== undefined ? fake : fakeTier(tier, (Number(setting("fakeRate")) || 0) / 100), n: 10 };
}
