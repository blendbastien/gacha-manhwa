/* Gacha Manhwa — « Hyperligne » : l'ouverture de la synthèse.
 * Tout défile de gauche à droite de plus en plus vite : étoiles étirées, nébuleuses, rails de lumière,
 * un train stellaire qui passe en trombe, des portes de lumière qui stroboscopent, puis la comète dont
 * la couleur annonce le meilleur rang et qui frappe le centre. Entièrement dessiné (canvas, mélange additif),
 * piloté par le temps de la scène pour rester calé sur les sons (montée 400 ms, portail 2550, comète 3550, impact 4050). */
import { warpT } from "./hyper3d.js";
const RAINBOW = ["#ff4d6d", "#ffb347", "#fff46b", "#5dff9c", "#4fc3ff", "#b46bff"];
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const rnd = (a, b) => a + Math.random() * (b - a);
const smooth = k => k * k * (3 - 2 * k);
function rgb(hex) { const h = String(hex || "#ffffff").replace("#", ""); const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h.slice(0, 6), 16) || 0xffffff; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (a, b, k) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * k));
const GLOW = new Map();
function glow(hex) { let c = GLOW.get(hex); if (c) return c; c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); const col = rgb(hex); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.18, rgba(col, 0.9)); r.addColorStop(0.45, rgba(col, 0.28)); r.addColorStop(1, rgba(col, 0)); g.fillStyle = r; g.fillRect(0, 0, 128, 128); GLOW.set(hex, c); return c; }

/* moments clés (ms depuis l'origine de la scène) */
export const HY = { rails: 250, accel: 600, train0: 1150, lane: 2400, comet: 3550, impact: 4050, end: 5000 };

export class Hyper {
  constructor(cv, { hint = "#9fd2ff", tier = "low", map = null } = {}) {
    this.map = map;
    this.cv = cv; this.c = cv.getContext("2d"); this.hint = rgb(hint); this.hintHex = hint; this.tier = tier; this.rainbow = tier === "SSS";
    this.dist = 0; this.last = null; this.on = false; this.size(); this._r = () => { this.size(); this.build(); }; addEventListener("resize", this._r); this.build();
  }
  size() { const d = Math.min(1.5, devicePixelRatio || 1); this.W = innerWidth; this.H = innerHeight; this.cv.width = Math.round(this.W * d); this.cv.height = Math.round(this.H * d); this.c.setTransform(d, 0, 0, d, 0, 0); this.rail = this.H * 0.67; this.cy = this.H * 0.46; }
  build() {
    const W = this.W, H = this.H;
    /* étoiles : profondeur z (parallaxe), quelques-unes chaudes */
    this.stars = Array.from({ length: Math.round(W * H / 2600) }, () => ({ x: Math.random() * W * 1.4 - W * 0.2, y: Math.random() * H, z: Math.pow(Math.random(), 1.8) * 0.9 + 0.1, w: Math.random() < 0.12 }));
    /* nébuleuse : bande pré-rendue deux fois plus large que l'écran, qui boucle */
    const nb = this.neb = document.createElement("canvas"); nb.width = Math.round(W * 2); nb.height = Math.round(H); const g = nb.getContext("2d");
    const cols = ["#2a3cff", "#7a2cff", "#00b3ff", "#ff3fa6", "#1b6dff", "#5a1fb8"];
    for (let i = 0; i < 26; i++) { const x = Math.random() * nb.width, y = H * (0.15 + Math.random() * 0.75), r = rnd(H * 0.12, H * 0.42); const rg = g.createRadialGradient(x, y, 0, x, y, r); const c = rgb(cols[i % cols.length]); rg.addColorStop(0, rgba(c, rnd(0.10, 0.22))); rg.addColorStop(1, rgba(c, 0)); g.fillStyle = rg; g.beginPath(); g.ellipse(x, y, r * 1.8, r * 0.7, 0, 0, Math.PI * 2); g.fill(); }
    /* le train : pré-rendu une fois (locomotive + voitures), on ne fait que le déplacer */
    this.train = this.buildTrain();
  }
  buildTrain() {
    const S = this.ts = clamp(this.H / 800, 0.7, 1.6) * 1.55;
    const carW = 330 * S, carH = 74 * S, gap = 14 * S, cars = 5, noseW = 170 * S, pad = 40 * S; const Wt = cars * (carW + gap) + noseW + pad * 2, Ht = carH + 70;
    const cv = document.createElement("canvas"); cv.width = Math.ceil(Wt); cv.height = Math.ceil(Ht + 40 * S); const g = cv.getContext("2d"); const top = 20 * S, bot = top + carH;
    const body = (x, w) => { const gr = g.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, "#8aa2e6"); gr.addColorStop(0.08, "#3d5196"); gr.addColorStop(0.3, "#1d2a5a"); gr.addColorStop(0.75, "#0d1430"); gr.addColorStop(1, "#04060e"); g.fillStyle = gr; g.beginPath(); g.roundRect(x, top, w, carH, [18 * S, 18 * S, 6 * S, 6 * S]); g.fill();
      g.save(); g.clip(); const rf = g.createLinearGradient(x, 0, x + w, 0); rf.addColorStop(0, "rgba(255,255,255,0)"); rf.addColorStop(0.45, "rgba(190,215,255,0.16)"); rf.addColorStop(0.55, "rgba(190,215,255,0.05)"); rf.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = rf; g.fillRect(x, top, w, carH); g.restore();
      g.strokeStyle = "#b9c9ff99"; g.lineWidth = 1.4 * S; g.beginPath(); g.moveTo(x + 14 * S, top + 1.5 * S); g.lineTo(x + w - 14 * S, top + 1.5 * S); g.stroke(); };
    const trim = (x, w) => { g.fillStyle = "#ffe3a0"; g.fillRect(x + 6 * S, top + carH * 0.66, w - 12 * S, 3 * S); g.fillStyle = "#e9cf8e"; g.fillRect(x + 6 * S, top + carH * 0.66 + 5 * S, w - 12 * S, 1 * S); g.fillStyle = "#e9cf8e66"; g.fillRect(x + 6 * S, top + 9 * S, w - 12 * S, 1 * S); };
    const windows = (x, w) => { const n = 6, ww = (w - 40 * S) / n; for (let i = 0; i < n; i++) { const wx = x + 20 * S + i * ww + 5 * S, wy = top + 17 * S, wwid = ww - 10 * S, wh = 24 * S; g.save(); g.shadowColor = "#ffc46a"; g.shadowBlur = 14 * S; const lg = g.createLinearGradient(0, wy, 0, wy + wh); lg.addColorStop(0, "#fff6da"); lg.addColorStop(0.6, "#ffd28a"); lg.addColorStop(1, "#ff9e4a"); g.fillStyle = lg; g.beginPath(); g.roundRect(wx, wy, wwid, wh, 5 * S); g.fill(); g.restore(); g.fillStyle = "rgba(40,30,60,0.35)"; g.fillRect(wx + wwid * 0.62, wy + 3 * S, 2 * S, wh - 6 * S); } };
    let x = pad;
    for (let i = 0; i < cars; i++) { body(x, carW); windows(x, carW); trim(x, carW); g.fillStyle = "#05070f"; g.fillRect(x + carW, top + 14 * S, gap, carH - 28 * S); x += carW + gap; }
    /* locomotive : nez effilé vers la droite (sens de la marche) */
    const gr = g.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, "#4a5c92"); gr.addColorStop(0.25, "#1f2a52"); gr.addColorStop(1, "#05070f"); g.fillStyle = gr;
    g.beginPath(); g.moveTo(x, top + 18 * S); g.quadraticCurveTo(x, top, x + 18 * S, top); g.lineTo(x + noseW * 0.35, top); g.bezierCurveTo(x + noseW * 0.85, top + 4 * S, x + noseW, bot - 26 * S, x + noseW, bot - 8 * S); g.lineTo(x + noseW, bot); g.lineTo(x, bot); g.closePath(); g.fill(); g.strokeStyle = "#b9c9ff88"; g.lineWidth = 1.4 * S; g.stroke();
    const cab = g.createLinearGradient(x + 40 * S, top + 14 * S, x + 120 * S, top + 40 * S); cab.addColorStop(0, "#cfeaffee"); cab.addColorStop(1, "#2a5aa8bb"); g.fillStyle = cab; g.beginPath(); g.moveTo(x + 30 * S, top + 16 * S); g.lineTo(x + noseW * 0.5, top + 16 * S); g.quadraticCurveTo(x + noseW * 0.82, top + 22 * S, x + noseW * 0.86, top + 40 * S); g.lineTo(x + 30 * S, top + 40 * S); g.closePath(); g.fill();
    g.fillStyle = "#ffe3a0"; g.fillRect(x, top + carH * 0.66, noseW * 0.92, 3 * S);
    /* lueur sous caisse */
    const ug = g.createLinearGradient(0, bot, 0, bot + 34 * S); ug.addColorStop(0, "#9fe6ffee"); ug.addColorStop(0.3, "#7fd8ff66"); ug.addColorStop(1, "#7fd8ff00"); g.fillStyle = ug; g.fillRect(pad, bot, x + noseW - pad, 34 * S);
    return { cv, W: Wt, H: Ht, top, bot, head: x + noseW, pad, carH };
  }
  /* vitesse de défilement (px/ms) selon le temps de la scène */
  speed(t) {
    if (t < HY.accel) return 0.04 + 0.06 * (t / HY.accel);
    if (t < HY.lane) { const k = (t - HY.accel) / (HY.lane - HY.accel); return 0.1 + 7.4 * Math.pow(k, 2.3); }
    if (t < HY.impact) { const k = (t - HY.lane) / (HY.impact - HY.lane); return 7.5 + 5 * k; }
    const k = clamp((t - HY.impact) / 1100); return 12.5 * Math.pow(1 - k, 3) + 0.05;
  }
  start(t0p) { this.t0p = t0p; this.on = true; const loop = now => { if (!this.on) return; this.frame(now); this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
  stop() { this.on = false; cancelAnimationFrame(this.raf); }
  destroy() { this.stop(); removeEventListener("resize", this._r); }
  frame(now) {
    const rt = now - this.t0p, t = this.map ? warpT(this.map, rt) : rt; const dt = this.last == null ? 16 : Math.min(50, now - this.last); this.last = now; if (rt < 0) return;
    const c = this.c, W = this.W, H = this.H, v = this.speed(t); this.dist += v * dt;
    const laneK = smooth(clamp((t - HY.lane + 400) / 900)) * (t < HY.impact ? 1 : clamp(1 - (t - HY.impact) / 700));
    const hint = this.hint; const base = mix([3, 5, 14], mix([4, 6, 18], hint, 0.12), laneK);
    /* tremblement de caméra à pleine vitesse */
    const sh = t > 1300 && t < HY.impact ? Math.min(2.2, v * 0.22) : 0; c.save(); if (sh) c.translate(rnd(-sh, sh), rnd(-sh, sh) * 0.6);
    /* fond */
    const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, rgba(base, 1)); bg.addColorStop(0.5, rgba(mix(base, [14, 18, 46], 0.6), 1)); bg.addColorStop(1, "rgb(2,3,8)"); c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; c.fillStyle = bg; c.fillRect(-10, -10, W + 20, H + 20);
    c.globalCompositeOperation = "lighter";
    /* nébuleuse : parallaxe lente, étirée par la vitesse (fantômes) */
    const nb = this.neb, nx = (this.dist * 0.08) % nb.width; const ghosts = v > 2 ? 3 : 1;
    for (let j = 0; j < ghosts; j++) { c.globalAlpha = (j ? 0.3 : 0.85) * (0.55 + 0.45 * clamp(t / 900)) * (1 - 0.65 * laneK); const ox = ((nx - j * v * 6) % nb.width + nb.width) % nb.width; for (const k of [-1, 0]) c.drawImage(nb, ox + k * nb.width, 0); }
    if (laneK > 0) { const rg = c.createRadialGradient(W / 2, this.cy, 0, W / 2, this.cy, W * 0.7); rg.addColorStop(0, rgba(hint, 0.13 * laneK)); rg.addColorStop(1, rgba(hint, 0)); c.globalAlpha = 1; c.fillStyle = rg; c.fillRect(0, 0, W, H); }
    /* étoiles étirées */
    const starCol = mix([190, 215, 255], mix(hint, [255, 255, 255], 0.25), laneK * 0.75), warm = [255, 214, 160];
    c.lineCap = "round";
    for (const s of this.stars) {
      s.x += v * s.z * dt; const len = Math.min(W * 0.95, 1.5 + v * s.z * 34); if (s.x - len > W) { s.x = -rnd(0, W * 0.25); s.y = Math.random() * H; }
      const col = s.w ? warm : starCol; const a = (0.25 + s.z * 0.75) * clamp(t / 500);
      c.strokeStyle = rgba(col, a * 0.28); c.lineWidth = 0.6 + s.z * 1.8; c.beginPath(); c.moveTo(s.x - len, s.y); c.lineTo(s.x, s.y); c.stroke();
      c.strokeStyle = rgba(col, a); c.lineWidth = 0.4 + s.z * 1.2; c.beginPath(); c.moveTo(s.x - len * 0.35, s.y); c.lineTo(s.x, s.y); c.stroke();
    }
    /* portes de lumière (hyperligne) : barres verticales qui défilent et stroboscopent */
    if (laneK > 0.01) { const sp = 760, off = this.dist % sp; for (let x = off - sp; x < W + sp; x += sp) { const w = Math.min(70, 4 + v * 4); const gr = c.createLinearGradient(x - w, 0, x, 0); gr.addColorStop(0, rgba(hint, 0)); gr.addColorStop(1, rgba(hint, 0.2 * laneK)); c.globalAlpha = 1; c.fillStyle = gr; c.fillRect(x - w, 0, w, H); const vg = c.createLinearGradient(0, 0, 0, H); vg.addColorStop(0, rgba([255, 255, 255], 0)); vg.addColorStop(0.5, rgba([255, 255, 255], 0.55 * laneK)); vg.addColorStop(1, rgba([255, 255, 255], 0)); c.fillStyle = vg; c.fillRect(x - 1.2, 0, 1.2, H); } }
    /* rails de lumière */
    const railA = clamp((t - HY.rails) / 500) * (t < HY.impact + 300 ? 1 : clamp(1 - (t - HY.impact - 300) / 600)); if (railA > 0) {
      const ry = this.rail, rc = mix([120, 220, 255], hint, laneK), gl = 0.35 + clamp(v / 8) * 0.65;
      for (const [dy, w, a] of [[0, 2.2, 1], [14, 1.2, 0.55]]) { c.globalAlpha = railA * a; c.fillStyle = rgba(rc, 0.18 * gl); c.fillRect(0, ry + dy - 7, W, 14); c.fillStyle = rgba(rc, 0.9 * gl); c.fillRect(0, ry + dy - w / 2, W, w); }
      const step = 70, so = this.dist % step, tl = Math.min(step - 4, 3 + v * 9); c.globalAlpha = railA * 0.8; c.fillStyle = rgba(rc, 0.55); for (let x = so - step; x < W + step; x += step) c.fillRect(x - tl, ry + 3, tl, 8);
    }
    /* le train stellaire passe en trombe */
    const T = this.train, tt = t - HY.train0; if (tt > 0 && tt < 1100) {
      const vt = 6.2, head = -60 + tt * vt + Math.pow(tt / 1000, 2) * 900; const x = head - T.head; const y = this.rail - T.bot + 2;
      if (x < W && x + T.W > 0) {
        c.globalCompositeOperation = "source-over";
        for (let j = 4; j >= 1; j--) { c.globalAlpha = 0.09 * (5 - j) / 4; c.drawImage(T.cv, x - j * vt * 7, y); }
        c.globalAlpha = 1; c.drawImage(T.cv, x, y);
        c.globalCompositeOperation = "lighter";
        /* traînées des fenêtres et du phare */
        /* traînée lumineuse derrière le dernier wagon */
        const ty0 = y + T.top + T.carH * 0.45, tlen = Math.min(900, 120 + vt * 120); const tg = c.createLinearGradient(x + T.pad - tlen, 0, x + T.pad + 40, 0); tg.addColorStop(0, "rgba(255,200,130,0)"); tg.addColorStop(1, "rgba(255,214,150,0.5)");
        c.globalAlpha = 1; c.fillStyle = tg; c.beginPath(); c.moveTo(x + T.pad + 40, ty0 - T.carH * 0.32); c.lineTo(x + T.pad - tlen, ty0 - 2); c.lineTo(x + T.pad - tlen, ty0 + 2); c.lineTo(x + T.pad + 40, ty0 + T.carH * 0.32); c.closePath(); c.fill();
        const hx = x + T.head - 6 * this.ts, hy = y + T.bot - 14 * this.ts; c.globalAlpha = 1; c.drawImage(glow("#bfe6ff"), hx - 70, hy - 70, 140, 140);
        const beam = c.createLinearGradient(hx, 0, hx + 700, 0); beam.addColorStop(0, "rgba(200,235,255,0.55)"); beam.addColorStop(1, "rgba(200,235,255,0)"); c.fillStyle = beam; c.beginPath(); c.moveTo(hx, hy - 4); c.lineTo(hx + 700, hy - 70); c.lineTo(hx + 700, hy + 60); c.lineTo(hx, hy + 4); c.closePath(); c.fill();
      }
    }
    /* la comète : couleur du meilleur rang, de la gauche vers le centre */
    const ck = (t - HY.comet) / (HY.impact - HY.comet); if (ck > -0.05 && ck < 1.02) {
      const k = clamp(ck), e = Math.pow(k, 2.2); const x0 = -W * 0.18, y0 = H * 0.24, x1 = W / 2, y1 = this.cy; const x = x0 + (x1 - x0) * e, y = y0 + (y1 - y0) * e + Math.sin(k * Math.PI) * -H * 0.04;
      const L = W * (0.35 + 0.35 * k); const ang = Math.atan2(y1 - y0, x1 - x0); const tx = x - Math.cos(ang) * L, ty = y - Math.sin(ang) * L;
      const tg = c.createLinearGradient(tx, ty, x, y); if (this.rainbow) { RAINBOW.forEach((col, j) => tg.addColorStop(j / RAINBOW.length, rgba(rgb(col), j ? 0.8 : 0))); tg.addColorStop(1, "rgba(255,255,255,1)"); } else { tg.addColorStop(0, rgba(hint, 0)); tg.addColorStop(0.7, rgba(hint, 0.85)); tg.addColorStop(1, "rgba(255,255,255,1)"); }
      c.globalAlpha = 1; c.strokeStyle = tg; c.lineCap = "round"; for (const [lw, a] of [[46, 0.18], [18, 0.5], [5, 1]]) { c.globalAlpha = a; c.lineWidth = lw * (0.6 + 0.6 * k); c.beginPath(); c.moveTo(tx, ty); c.lineTo(x, y); c.stroke(); }
      c.globalAlpha = 1; const gs = 90 + 160 * k; c.drawImage(glow(this.rainbow ? "#ffffff" : this.hintHex), x - gs, y - gs, gs * 2, gs * 2); c.drawImage(glow("#ffffff"), x - gs * 0.35, y - gs * 0.35, gs * 0.7, gs * 0.7);
      for (let i = 0; i < 4; i++) { const d = Math.random() * L * 0.6, sx = x - Math.cos(ang) * d + rnd(-10, 10), sy = y - Math.sin(ang) * d + rnd(-10, 10); c.globalAlpha = 0.8; c.drawImage(glow(this.rainbow ? RAINBOW[i % 6] : this.hintHex), sx - 8, sy - 8, 16, 16); }
    }
    /* impact : blanc qui envahit puis retombe */
    const ik = (t - HY.impact) / 650; if (ik > 0 && ik < 1) { const r = c.createRadialGradient(W / 2, this.cy, 0, W / 2, this.cy, Math.hypot(W, H) * (0.2 + ik)); r.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - ik)})`); r.addColorStop(0.4, rgba(this.rainbow ? [255, 240, 200] : hint, 0.45 * (1 - ik))); r.addColorStop(1, "rgba(0,0,0,0)"); c.globalAlpha = 1; c.fillStyle = r; c.fillRect(0, 0, W, H); }
    /* bandes cinéma */
    c.restore(); c.globalCompositeOperation = "source-over"; const bar = H * 0.075 * clamp(t / 500) * (t < HY.impact ? 1 : clamp(1 - (t - HY.impact) / 600)); if (bar > 0.5) { c.globalAlpha = 1; c.fillStyle = "#000"; c.fillRect(0, 0, W, bar); c.fillRect(0, H - bar, W, bar); }
    c.globalAlpha = 1;
  }
}
