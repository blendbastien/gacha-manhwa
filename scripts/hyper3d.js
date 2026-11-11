/* Gacha Manhwa — « Hyperligne » en 3D (three.js, WebGL) : ouverture de la synthèse.
 * Un train stellaire à sustentation (coque vernie bleu nuit, liserés or, anneau d'énergie, fenêtres chaudes,
 * propulseurs) surgit de la droite sur une voie suspendue dans l'espace et file vers la gauche ; la caméra fait
 * un panoramique filé puis se cale à son flanc. Le décor défile alors de gauche à droite de plus en plus vite :
 * étoiles étirées, portiques hexagonaux qui balaient la coque de lumière, piliers de la voie, planète au loin.
 * Puis le couloir prend la couleur du meilleur rang et la comète de ce rang fond sur l'écran (impact à 4050 ms).
 * Rendu : reflets d'un environnement néon, bloom, vignettage, aberration chromatique liée à la vitesse, grain.
 * Repli 2D (hyper.js) si WebGL est indisponible ou désactivé. */
import { MOD, asset, absUrl, img } from "./data.js";

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = k => { k = clamp(k); return k * k * (3 - 2 * k); };
const RAINBOW = ["#ff4d6d", "#ffb347", "#fff46b", "#5dff9c", "#4fc3ff", "#b46bff"];
/* Ouverture longue (1.10) : l'animation est écrite sur une échelle « d'origine » (HY3, ~5 s) et rejouée sur une
 * échelle réelle bien plus longue, calée sur la musique d'appel : montée 0–4,5 s, plein régime jusqu'à ~9 s,
 * accalmie (la porte s'allume, suspense) puis grand coup vers 11 s = ouverture de la porte.
 * introMap(high) → points [réel, origine] ; warp(rt) donne le temps d'origine, real(o) l'inverse. */
export function introMap(high = true) { const I = high ? 10950 : 11100; return [[0, 0], [2000, 1000], [7000, 2450], [8900, 3350], [9900, 3500], [I - 700, 3550], [I - 400, 3700], [I, 4050], [I + 1450, 5000]]; }
const lerpMap = (m, x, a, b) => { if (x <= m[0][a]) return m[0][b] + (x - m[0][a]); for (let i = 1; i < m.length; i++) if (x <= m[i][a]) { const p = m[i - 1], q = m[i]; return p[b] + (q[b] - p[b]) * (x - p[a]) / (q[a] - p[a]); } const l = m[m.length - 1]; return l[b] + (x - l[a]); };
export const warpT = (m, rt) => lerpMap(m, rt, 0, 1);
export const realT = (m, o) => lerpMap(m, o, 1, 0);
export const HY3 = { fk0: 3500, fk: 3570, lock0: 650, lock1: 1450, accel: 1000, lane: 2400, brake0: 2450, brake1: 3350, glow: 3350, snap: 3368, seam: 3550, open0: 3700, impact: 4050, end: 5000 };
/* ── ciel d'une galaxie et planète, partagés par l'ouverture et l'aperçu de l'éditeur ── */
const C3 = (T, hex, def) => new T.Color(hex || def);
export const SKY_VS = "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }";
export function skyUniforms(T, gal, hint) { return { uShift: { value: 0 }, uWarp: { value: 0 }, uTint: { value: hint.clone() }, uA: { value: C3(T, gal?.a, "#5d3895") }, uB: { value: C3(T, gal?.b, "#21659e") }, uC: { value: C3(T, gal?.c, "#ad458b") }, uBand: { value: C3(T, gal?.band, "#6f6995") }, uStars: { value: Number(gal?.stars ?? 1) } }; }
export const SKY_FS = () => `uniform float uShift; uniform float uWarp; uniform vec3 uTint; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uBand; uniform float uStars; varying vec3 vD; ${NOISE}
  void main(){ vec3 d = normalize(vD); vec3 p = d*2.4 + vec3(uShift,0.0,0.0);
    float a = fbm(p*1.25), b = fbm(p*2.6 + vec3(4.2,1.3,2.0)), c = fbm(p*6.0 + vec3(1.7,8.1,3.3));
    vec3 col = vec3(0.003,0.004,0.014);
    col += uA*pow(smoothstep(0.42,0.95,a),1.7);
    col += uB*pow(smoothstep(0.48,0.98,b),1.9);
    col += uC*pow(smoothstep(0.6,1.0,a*b*1.7),2.6)*0.7;
    float band = exp(-pow(d.y*4.6 + (a-0.5)*2.4, 2.0)); col += uBand*band*(0.45+0.8*c) - vec3(0.05)*band*smoothstep(0.55,0.8,c);
    col = mix(col, col*0.55 + uTint*(a*0.16+0.012), uWarp*0.7);
    float st = pow(h3(floor(d*800.0)), 90.0)*1.1 + pow(h3(floor(d*1700.0)+3.1), 140.0)*0.8; col += vec3(st)*(0.6+0.6*band)*uStars;
    gl_FragColor = vec4(col,1.0); }`;
const PL_VS = "varying vec3 vN; varying vec3 vP; varying vec3 vV; varying vec2 vU; void main(){ vU = uv; vN = normalize(normalMatrix*normal); vP = position; vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }";
/** planète (groupe : sphère, atmosphère, anneau, lune) d'après sa fiche de l'Univers. kit = { T, mat, geo } ; lightU = { uL } ; tex = { ice, img } */
export function buildPlanetGroup(kit, P, lightU, tex = {}) {
  const { T, mat, geo } = kit; P = P || {}; const g = new T.Group(); const R = 260;
  const kind = Number(P.kind ?? 0); const map = P.img ? tex.img : kind === 5 ? tex.ice : null;
  const U = (r) => ({ uL: lightU.uL, uC1: { value: C3(T, P.c1, "#385986") }, uC2: { value: C3(T, P.c2, "#769ece") }, uC3: { value: C3(T, P.c3, "#ad95c4") }, uAtm: { value: C3(T, P.atm, "#89d3ff") }, uKind: { value: kind === 5 && !map ? 1 : kind }, uClouds: { value: Number(P.clouds) || 0 }, uR: { value: r }, uMap: { value: map || null }, uHasMap: { value: map ? 1 : 0 }, uT: lightU.uT || { value: 0 } });
  const surf = r => mat(new T.ShaderMaterial({ uniforms: U(r), vertexShader: PL_VS,
    fragmentShader: `uniform vec3 uL; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uAtm; uniform float uKind; uniform float uClouds; uniform float uR; uniform sampler2D uMap; uniform float uHasMap; uniform float uT; varying vec3 vN; varying vec3 vP; varying vec3 vV; varying vec2 vU; ${NOISE}
      void main(){ vec3 n = normalize(vN); vec3 q = vP/uR; float lat = q.y; vec3 base; vec3 emi = vec3(0.0);
        if (uHasMap > 0.5) { base = texture2D(uMap, vU).rgb; float d = fbm(q*9.0), d2 = fbm(q*34.0); base = pow(base, vec3(1.8))*(0.55 + 0.45*d + 0.2*d2); if (uKind > 4.5) base *= vec3(0.62,0.78,1.0); }
        else if (uKind < 0.5) { float bands = fbm(vec3(lat*9.0, lat*3.0, 0.0) + vec3(fbm(q*3.1)*1.8)); base = mix(uC1, uC2, bands); base = mix(base, uC3, smoothstep(0.62,0.8,bands)*0.6); }
        else if (uKind < 1.5) { float h = fbm(q*2.2) + 0.45*fbm(q*5.5) - 0.22; float land = smoothstep(0.47,0.53,h); base = mix(mix(uC1, uC2, smoothstep(0.15,0.5,h)), uC3*(0.65 + 0.6*fbm(q*9.0)), land); base = mix(base, vec3(0.9,0.94,1.0), smoothstep(0.78,0.92,abs(lat))); }
        else if (uKind < 2.5) { float h = fbm(q*3.0); float v = fbm(q*5.0 + vec3(h*2.0)); float cr = 1.0 - smoothstep(0.0, 0.045, abs(v - 0.5)); base = mix(uC1, uC2, h); emi = uC3*cr*(0.8 + 0.6*fbm(q*14.0)); }
        else if (uKind < 3.5) { float h = fbm(q*4.0); float c1 = n3(q*7.0), c2 = n3(q*15.0 + 3.0); float rim = smoothstep(0.66,0.7,c1) - smoothstep(0.7,0.78,c1) + 0.6*(smoothstep(0.7,0.73,c2) - smoothstep(0.73,0.8,c2)); float pit = smoothstep(0.7,0.8,c1)*0.35; base = mix(uC1, uC2, h)*(1.0 - pit) + uC3*rim*0.35; }
        else { vec3 cell = floor(q*7.0); float hc = h3(cell); vec3 f = fract(q*7.0); float edge = 1.0 - smoothstep(0.0, 0.06, min(min(min(f.x,1.0-f.x), min(f.y,1.0-f.y)), min(f.z,1.0-f.z))); base = mix(uC1, uC2, hc); emi = uC3*edge*0.35 + uC3*pow(h3(cell+7.1), 30.0)*1.5; }
        float cl = smoothstep(0.55, 0.78, fbm(q*3.4 + vec3(uT*0.00002, 0.0, 0.0)))*uClouds; base = mix(base, vec3(0.95), cl*0.85);
        float l = max(0.0, dot(n, uL)); float term = smoothstep(-0.05, 0.35, dot(n, uL)); float fr = pow(1.0 - max(0.0, dot(n, vV)), 3.0);
        vec3 col = base*(0.03 + 1.1*l) + uAtm*fr*(0.25 + 1.2*term)*0.8 + emi*(0.55 + 0.6*(1.0 - l));
        gl_FragColor = vec4(col, 1.0); }` }));
  const big = new T.Mesh(geo(new T.SphereGeometry(R, 128, 96)), surf(R)); g.add(big);
  const halo = new T.Mesh(geo(new T.SphereGeometry(R * 1.035, 96, 64)), mat(new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.BackSide, uniforms: { uL: lightU.uL, uAtm: { value: C3(T, P.atm, "#89d3ff") } },
    vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }",
    fragmentShader: "uniform vec3 uL; uniform vec3 uAtm; varying vec3 vN; varying vec3 vV; void main(){ vec3 n = normalize(vN); float rim = pow(1.0 - abs(dot(n, vV)), 4.0); float lit = smoothstep(-0.3, 0.5, dot(-n, uL)); gl_FragColor = vec4(uAtm*rim*(0.12+0.7*lit), 1.0); }" })));
  g.add(halo);
  if (P.ring) { const rc = C3(T, P.ringColor, "#e1daf9");
    const ring = new T.Mesh(geo(new T.RingGeometry(330, 520, 160, 1)), mat(new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: { uRc: { value: rc } },
      vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: `uniform vec3 uRc; varying vec3 vP; ${NOISE} void main(){ float r = (length(vP.xy)-330.0)/190.0; float b = n3(vec3(r*40.0,0.0,0.0))*0.6 + n3(vec3(r*120.0,1.0,0.0))*0.4; float a = smoothstep(0.0,0.08,r)*smoothstep(1.0,0.85,r)*(0.25 + 0.6*b);
        gl_FragColor = vec4(uRc*a*0.55, a*0.75); }` })));
    ring.rotation.set(1.25, 0.15, 0.35); g.add(ring); }
  if (P.moon) { const mP = { kind: 3, c1: "#3a3a40", c2: "#8a8a92", c3: "#c8c8d0", atm: "#6a7080" }; const mU = { uL: lightU.uL, uC1: { value: C3(T, mP.c1) }, uC2: { value: C3(T, mP.c2) }, uC3: { value: C3(T, mP.c3) }, uAtm: { value: C3(T, mP.atm) }, uKind: { value: kind === 5 && map ? 5 : 3 }, uClouds: { value: 0 }, uR: { value: 30 }, uMap: { value: kind === 5 ? map : null }, uHasMap: { value: kind === 5 && map ? 1 : 0 }, uT: { value: 0 } };
    const mm = surf(30); mm.uniforms = mU; const moon = new T.Mesh(geo(new T.SphereGeometry(30, 64, 48)), mm); moon.position.set(125, -88, 360); moon.rotation.y = 2.1; g.add(moon); }
  const sz = Math.max(0.4, Math.min(2, Number(P.size) || 1)); g.scale.setScalar(sz);
  return g;
}

let LIB = null;
export const loadThree = () => (LIB ||= import("../vendor/three-bundle.js").catch(e => { LIB = null; throw e; }));
/* tram 3D du pack (3d/tram.glb + éclairage 3d/night.hdr) : chargé une seule fois par session puis cloné à chaque synthèse.
 * Absent ou en erreur → null, et l'intro garde le train photo ou dessiné. */
let TRAM = null;
export const loadTram = () => (TRAM ||= (async () => {
  if (game.settings.get(MOD, "tram3d") === false) { TRAM = null; return null; }
  const u = asset("t3Tram"); if (!u) return null;
  const T = await loadThree(); const { GLTFLoader, MeshoptDecoder, RGBELoader } = await import("../vendor/three-gltf.js");
  const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
  const [gl, hdr] = await Promise.all([ld.loadAsync(absUrl(u)), (async () => { const h = asset("t3Hdri"); if (!h) return null; try { const t = await new RGBELoader().loadAsync(absUrl(h)); t.mapping = T.EquirectangularReflectionMapping; return t; } catch (e) { return null; } })()]);
  return { scene: gl.scene, hdr };
})().catch(e => { console.warn(MOD, "tram 3D indisponible, train de repli", e); return null; }));
const VS_UV = "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }";
const NOISE = `float h3(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
  float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a*n3(p); p *= 2.03; a *= 0.5; } return s; }`;

function glowTex(T) {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.1, "rgba(255,255,255,0.9)"); r.addColorStop(0.3, "rgba(255,255,255,0.28)"); r.addColorStop(0.6, "rgba(255,255,255,0.06)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 256, 256); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}

/** livrée du tram : matériaux clonés (le modèle source est partagé), reflets adoucis, carrosserie teintée, vitres teintées, givre */
export function dressTram(T, root, sk, env, disp) {
  const own = new Map(), hullC = new T.Color(sk?.hull || "#ffffff"), hullK = Math.min(1, Math.max(0, Number(sk?.hullK) || 0)), frost = Math.min(1, Math.max(0, Number(sk?.frost) || 0)), glassC = sk?.glass ? new T.Color(sk.glass) : null;
  const dress = mt0 => { if (own.has(mt0)) return own.get(mt0); const base = mt0.userData.sbmBase || mt0; const mt = base.clone(); mt.userData.sbmBase = base; disp.push(mt); own.set(mt0, mt); mt.envMap = env;
    if (mt.transparent) { mt.envMapIntensity = 0.6; mt.roughness = Math.max(mt.roughness, 0.3); mt.metalness = 0.05; if (glassC) mt.color.copy(glassC); }
    else { mt.envMapIntensity = 0.55; mt.roughness = Math.max(mt.roughness, 0.3); mt.color.lerp(hullC, hullK); if (frost) { mt.color.lerp(new T.Color("#eef7ff"), frost * 0.5); mt.roughness = Math.min(1, mt.roughness + frost * 0.35); } }
    mt.needsUpdate = true; return mt; };
  root.traverse(o => { if (!o.isMesh) return; o.material = Array.isArray(o.material) ? o.material.map(dress) : dress(o.material); });
  return own;
}
/** liserés aux couleurs de l'habillage : ligne de ceinture et ligne de toit, des deux côtés (repère du parent : train le long de X) */
export function addTramTrim(T, parent, sk, { x0, x1, yBelt, yRoof, z }, disp) {
  const trim = new T.Color(sk?.trim || "#ffffff"), k = sk?.trim ? 1 : 0.35, w = x1 - x0;
  const m = new T.MeshBasicMaterial({ color: trim.clone().multiplyScalar(1.4 * k), transparent: true, opacity: 0.9, depthWrite: false }); disp.push(m);
  for (const zz of [z, -z]) for (const [y, h] of [[yBelt, 0.05], [yRoof, 0.03]]) { const g = new T.PlaneGeometry(w, h); disp.push(g); const st = new T.Mesh(g, m); st.position.set((x0 + x1) / 2, y, zz); if (zz < 0) st.rotation.y = Math.PI; parent.add(st); }
  return m;
}

export class Hyper3D {
  static async create(cv, opts) {
    try { const T = await loadThree(); const gl = cv.getContext("webgl2", { antialias: false, powerPreference: "high-performance" }); if (!gl) return null;
      /* textures du pack (train photo-réaliste, planète) : facultatives, sinon tout est dessiné */
      const tl = new T.TextureLoader(); const ld = k => new Promise(res => { const u = asset(k); if (!u) return res(null); tl.load(absUrl(u), t => { t.colorSpace = k === "t3TrainColor" || k === "t3Planet" ? T.SRGBColorSpace : T.NoColorSpace; t.anisotropy = 8; res(t); }, undefined, () => res(null)); });
      const keys = ["t3TrainColor", "t3TrainIllum", "t3TrainRefl", "t3Planet"]; const pImg = opts?.look?.planet?.img;
      const ldUrl = u => new Promise(res => { tl.load(absUrl(u), t => { t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, () => res(null)); });
      const tramP = Promise.race([loadTram(), new Promise(r => setTimeout(() => r(null), 4500))]);
      const got = await Promise.race([Promise.all([...keys.map(ld), pImg ? ldUrl(pImg) : Promise.resolve(null)]), new Promise(r => setTimeout(() => r([]), 5000))]);
      const tex = {}; keys.forEach((k, i) => { if (got[i]) tex[k] = got[i]; }); if (got[keys.length]) tex.planetImg = got[keys.length];
      const tram = await tramP;
      const h = new Hyper3D(T, cv, gl, { ...opts, tex, tram });
      /* 1.23 : shaders compilés et textures envoyées pendant l'écran de chargement (avant, c'était au lancement : gros à-coup) */
      try { await Promise.race([h.r.compileAsync?.(h.scene, h.cam), new Promise(r => setTimeout(r, 2500))]); h.r.render(h.scene, h.cam); } catch (e) { /* pas grave : compilé au premier rendu */ }
      return h; }
    catch (e) { console.warn(MOD, "Hyperligne 3D indisponible, repli 2D", e); return null; }
  }
  constructor(T, cv, gl, { hint = "#9fd2ff", tier = "low", tex = {}, real = null, map = null, look = null, tram = null } = {}) {
    this.tramSrc = tram;
    this.look = look || {}; this.gal = this.look.galaxy || null; this.pl = this.look.planet || null; this.skin = this.look.skin || null;
    this.metalC = new T.Color(this.gal?.metal || "#bcefff"); this.illumC = new T.Color(this.skin?.lights || "#bcf5ff");
    this.map = map; this.real = real; this._fkDone = false; this.T = T; this.cv = cv; this.tier = tier; this.tex = tex; this.rb = tier === "SSS"; this.hint = new T.Color(hint); this.disp = [...Object.values(tex)];
    const r = this.r = new T.WebGLRenderer({ canvas: cv, context: gl, antialias: false });
    r.setPixelRatio(Math.min(1.25, devicePixelRatio || 1)); r.setSize(innerWidth, innerHeight, false); r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 0; r.outputColorSpace = T.SRGBColorSpace;
    const s = this.scene = new T.Scene(); s.background = new T.Color("#010207");
    this.cam = new T.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 5000); this.cam.position.set(0, 1.7, 14);
    this.env = this.buildEnv(); s.environment = this.env;
    const key = new T.DirectionalLight("#a9c8ff", 1.4); key.position.set(-8, 12, 9); s.add(key);
    const rim = new T.DirectionalLight("#ffc890", 1.1); rim.position.set(14, 3, -12); s.add(rim); s.add(new T.HemisphereLight("#2a3a7a", "#05060c", 0.45));
    this.under = new T.PointLight("#6fd8ff", 40, 26, 1.6); s.add(this.under);
    this.flashA = new T.PointLight("#7fdcff", 0, 22, 1.4); this.flashB = new T.PointLight("#7fdcff", 0, 22, 1.4); s.add(this.flashA, this.flashB);
    this.glow = glowTex(T); this.disp.push(this.glow);
    this.build();
    const comp = this.comp = new T.EffectComposer(r); comp.addPass(new T.RenderPass(s, this.cam));
    this.bloom = new T.UnrealBloomPass(new T.Vector2(innerWidth, innerHeight), 0.62, 0.5, 0.9); comp.addPass(this.bloom);
    this.post = new T.ShaderPass({ uniforms: { tDiffuse: { value: null }, uCA: { value: 0 }, uVig: { value: 1 }, uT: { value: 0 }, uFlash: { value: 0 }, uRad: { value: 0 }, uHit: { value: 0 }, uHitC: { value: new T.Color(1, 1, 1) } }, vertexShader: VS_UV,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uCA; uniform float uVig; uniform float uT; uniform float uFlash; uniform float uRad; uniform float uHit; uniform vec3 uHitC; varying vec2 vU;
        float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uT)*43758.5453); }
        vec3 samp(vec2 uv, vec2 o){ return vec3(texture2D(tDiffuse, uv + o).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - o).b); }
        void main(){ vec2 c = vU - 0.5; float d = length(c); vec2 o = c * uCA * d;
          vec3 col = samp(vU, o);
          /* flou radial du « coup sec » vers la porte : la caméra fond sur elle */
          if (uRad > 0.001) { vec3 acc = col; for (int i = 1; i < 12; i++) { float k = float(i) / 11.0; acc += samp(vU - c * uRad * k, o); } col = acc / 12.0; }
          col *= mix(1.0, smoothstep(0.86, 0.22, d), uVig); col += (rnd(vU*vec2(1920.0,1080.0)) - 0.5) * 0.018; col += vec3(uFlash); col += uHitC * uHit * (0.6 + 0.4 * smoothstep(0.7, 0.0, d));
          gl_FragColor = vec4(col, 1.0); }` });
    comp.addPass(this.post); comp.addPass(new T.OutputPass());
    this._r = () => this.resize(); addEventListener("resize", this._r);
    this.tx = 62; this.prevCamX = 0; this.last = null;
  }
  resize() { const w = innerWidth, h = innerHeight; this.r.setSize(w, h, false); this.comp.setSize(w, h); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }
  mat(m) { this.disp.push(m); return m; }
  geo(g) { this.disp.push(g); return g; }
  sm(fs, uniforms = {}, extra = {}) { return this.mat(new this.T.ShaderMaterial({ uniforms, vertexShader: VS_UV, fragmentShader: fs, transparent: true, depthWrite: false, blending: this.T.AdditiveBlending, side: this.T.DoubleSide, ...extra })); }

  /* environnement de reflets : bandes de néon sur fond bleu nuit, pour que la coque vernie brille */
  buildEnv() {
    const T = this.T, es = new T.Scene(); const sph = new T.Mesh(new T.SphereGeometry(10, 64, 32), new T.ShaderMaterial({ side: T.BackSide,
      vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: `varying vec3 vD; void main(){ float y = vD.y; vec3 c = mix(vec3(0.01,0.012,0.03), vec3(0.05,0.07,0.16), smoothstep(-0.4,0.8,y));
        c += vec3(0.25,0.85,1.3)*exp(-pow((y-0.32)*22.0,2.0))*1.4; c += vec3(1.4,0.95,0.45)*exp(-pow((y+0.06)*30.0,2.0))*0.9;
        c += vec3(0.9,0.3,1.1)*exp(-pow((y-0.62)*18.0,2.0))*0.6; c += vec3(1.0)*pow(max(0.0,y),12.0)*2.0; gl_FragColor = vec4(c,1.0); }` }));
    es.add(sph); const pm = new T.PMREMGenerator(this.r); const tex = pm.fromScene(es, 0.03).texture; pm.dispose(); sph.geometry.dispose(); sph.material.dispose(); return tex;
  }

  build() {
    const T = this.T, s = this.scene;
    /* ciel : nébuleuse + voie lactée + petites étoiles, suit la caméra (parallaxe lente) */
    this.skyU = skyUniforms(T, this.gal, this.hint);
    const sky = new T.Mesh(this.geo(new T.SphereGeometry(2400, 48, 24)), this.mat(new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, uniforms: this.skyU, vertexShader: SKY_VS, fragmentShader: SKY_FS() })));
    sky.frustumCulled = false; s.add(sky); this.sky = sky;

    /* planète de la bannière (Univers) : surface, atmosphère, anneau, lune */
    this.planetU = { uL: { value: new T.Vector3(-0.6, 0.45, 0.65).normalize() }, uT: { value: 0 } };
    this.planet = new T.Group(); this.planet.rotation.z = -0.25; s.add(this.planet);
    const pl0 = this.pl || { kind: this.tex.t3Planet ? 5 : 0, c1: "#385986", c2: "#769ece", c3: "#ad95c4", atm: this.tex.t3Planet ? "#a0ddff" : "#89d3ff", ring: !this.tex.t3Planet, moon: !!this.tex.t3Planet };
    this.planet.add(buildPlanetGroup({ T, mat: m => this.mat(m), geo: g => this.geo(g) }, pl0, this.planetU, { ice: this.tex.t3Planet, img: this.tex.planetImg }));

    /* étoiles étirées : plans lointains + poussière proche (premier plan) */
    const N = 1800; this.stars = new Float32Array(N * 4); const pos = new Float32Array(N * 6), col = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) { const near = i < 240; const z = near ? 3 + Math.random() * 8 : -(18 + Math.pow(Math.random(), 0.7) * 560); const spanY = near ? 10 : 40 + (-z) * 0.55;
      this.stars.set([(Math.random() - 0.5) * 700, (Math.random() - 0.38) * spanY, z, 0], i * 4);
      const w = Math.random() < 0.14 ? [1, 0.8, 0.58] : Math.random() < 0.5 ? [0.7, 0.84, 1] : [0.92, 0.95, 1]; const br = near ? 0.75 : (Math.random() < 0.06 ? 1.35 : 0.35 + Math.random() * 0.55);
      col.set([0, 0, 0, w[0] * br, w[1] * br, w[2] * br], i * 6); }
    const sg = this.geo(new T.BufferGeometry()); sg.setAttribute("position", new T.BufferAttribute(pos, 3)); sg.setAttribute("color", new T.BufferAttribute(col, 3));
    this.starLines = new T.LineSegments(sg, this.mat(new T.LineBasicMaterial({ vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false })));
    this.starLines.frustumCulled = false; s.add(this.starLines); this.starBase = col.slice();

    /* voie suspendue : poutre sombre, liserés lumineux, rails à traverses (shader) */
    const metal = this.metal = this.mat(new T.MeshPhysicalMaterial({ color: new T.Color("#1a2240").lerp(this.metalC, 0.12), metalness: 0.95, roughness: 0.22, clearcoat: 0.6, envMapIntensity: 1.8 }));
    this.guide = new T.Group(); s.add(this.guide);
    const girder = new T.Mesh(this.geo(new T.BoxGeometry(1200, 0.85, 1.9)), metal); girder.position.y = -1.15; this.guide.add(girder);
    this.edgeM = this.mat(new T.MeshBasicMaterial({ color: this.metalC.clone().multiplyScalar(1.7) }));
    for (const z of [0.97, -0.97]) { const e = new T.Mesh(this.geo(new T.BoxGeometry(1200, 0.05, 0.05)), this.edgeM); e.position.set(0, -0.78, z); this.guide.add(e); const e2 = e.clone(); e2.position.y = -1.5; this.guide.add(e2); }
    this.railU = { uX: { value: 0 }, uCol: { value: this.metalC.clone() }, uGlow: { value: 0 } };
    const rail = new T.Mesh(this.geo(new T.PlaneGeometry(1200, 1.9)), this.mat(new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: this.railU,
      vertexShader: "varying vec2 vU; varying float vX; void main(){ vU = uv; vec4 w = modelMatrix*vec4(position,1.0); vX = w.x; gl_Position = projectionMatrix*viewMatrix*w; }",
      fragmentShader: `uniform float uX; uniform vec3 uCol; uniform float uGlow; varying vec2 vU; varying float vX;
        void main(){ float z = vU.y; float r = exp(-pow((z-0.28)*40.0,2.0)) + exp(-pow((z-0.72)*40.0,2.0)); float core = exp(-pow((z-0.28)*160.0,2.0)) + exp(-pow((z-0.72)*160.0,2.0));
          float sl = smoothstep(0.88,0.92,fract(vX*0.5)) * smoothstep(0.18,0.26,z) * smoothstep(0.82,0.74,z);
          float fade = exp(-abs(vX-uX)*0.005); vec3 c = uCol*(r*0.9 + sl*0.25) + vec3(1.0)*core*1.2; gl_FragColor = vec4(c*uGlow*fade, 1.0); }` })));
    rail.rotation.x = -Math.PI / 2; rail.position.y = -0.72; this.guide.add(rail); this.rail = rail;
    /* piliers de la voie, qui plongent dans le vide */
    this.pN = 9; this.pSp = 34;
    this.pillars = new T.InstancedMesh(this.geo(new T.CylinderGeometry(0.35, 0.6, 80, 10)), metal, this.pN); this.pillarLights = new T.InstancedMesh(this.geo(new T.TorusGeometry(0.62, 0.05, 6, 24)), this.edgeM, this.pN * 3);
    for (const m of [this.pillars, this.pillarLights]) { m.frustumCulled = false; s.add(m); }

    /* portiques hexagonaux : cadre sombre + liseré lumineux, ils balaient la coque de lumière au passage */
    const hex = (R) => { const sh = new T.Shape(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const x = Math.cos(a) * R, y = Math.sin(a) * R; i ? sh.lineTo(x, y) : sh.moveTo(x, y); } sh.closePath(); return sh; };
    const frame = hex(6.4); frame.holes.push(new T.Path(hex(5.8).getPoints().reverse()));
    const fg = this.geo(new T.ExtrudeGeometry(frame, { depth: 0.7, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 })); fg.translate(0, 0, -0.35);
    const lineShape = hex(5.83); lineShape.holes.push(new T.Path(hex(5.72).getPoints().reverse())); const lg = this.geo(new T.ShapeGeometry(lineShape));
    this.gN = 9; this.gSp = 30; this.stripM = this.mat(new T.MeshBasicMaterial({ color: this.metalC.clone().multiplyScalar(1.6), side: T.DoubleSide }));
    this.frames = new T.InstancedMesh(fg, metal, this.gN); this.frameLines = new T.InstancedMesh(lg, this.stripM, this.gN * 2);
    for (const m of [this.frames, this.frameLines]) { m.frustumCulled = false; m.visible = false; s.add(m); }
    /* anneaux d'énergie du couloir (couleur du rang) */
    this.ringM = this.mat(new T.MeshBasicMaterial({ color: (this.rb ? new T.Color("#ffffff") : this.hint.clone()).multiplyScalar(1.8), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
    this.rings = new T.InstancedMesh(this.geo(new T.TorusGeometry(5.0, 0.07, 8, 120)), this.ringM, 10); this.rings.frustumCulled = false; s.add(this.rings); this.rSp = 30;

    if (this.tramSrc) this.buildModelTrain(this.tramSrc); else if (this.tex.t3TrainColor) this.buildPhotoTrain(); else this.buildTrain();
    this.buildComet();
    this.buildDoor(); this.buildDoorPlus(); this.buildSparks(); this.buildSeasonFx();
  }

  buildTrain() {
    const T = this.T, tr = this.train = new T.Group(); this.scene.add(tr);
    const sk = this.skin; const hull = this.mat(new T.MeshPhysicalMaterial({ color: new T.Color("#16224f").lerp(new T.Color(sk?.hull || "#16224f"), (Number(sk?.hullK) || 0) * 1.4), metalness: 0.78, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 2.1, sheen: 0.4, sheenColor: new T.Color("#6f9cff") }));
    const roof = this.mat(new T.MeshPhysicalMaterial({ color: new T.Color("#0b1129").lerp(new T.Color("#e8f4ff"), Number(sk?.frost) || 0), metalness: 0.9, roughness: 0.3, clearcoat: 0.6, envMapIntensity: 1.6 }));
    const dark = this.mat(new T.MeshStandardMaterial({ color: "#05070f", metalness: 0.8, roughness: 0.45 }));
    const gold = this.mat(new T.MeshBasicMaterial({ color: new T.Color(sk?.trim || "#ffd88a").multiplyScalar(1.5) }));
    const goldMetal = this.mat(new T.MeshPhysicalMaterial({ color: new T.Color(sk?.trim || "#d9a95a"), metalness: 1, roughness: 0.25, clearcoat: 0.5, envMapIntensity: 2 }));
    const cyan = this.mat(new T.MeshBasicMaterial({ color: new T.Color("#7fe2ff").multiplyScalar(2.2) }));
    /* fenêtres : vitrage chaud en dégradé, montants fins, stores */
    const winM = this.sm(`varying vec2 vU; uniform float uN; void main(){ float x = fract(vU.x*uN); float pane = smoothstep(0.0,0.06,x)*smoothstep(1.0,0.94,x)*smoothstep(0.0,0.1,vU.y)*smoothstep(1.0,0.86,vU.y);
        vec3 c = mix(vec3(1.0,0.55,0.22), vec3(1.0,0.9,0.7), smoothstep(0.0,0.9,vU.y)); c *= 0.85 + 0.15*step(0.5, fract(vU.y*7.0)); float inner = 0.75 + 0.25*sin(vU.x*37.0);
        gl_FragColor = vec4(c*pane*1.25*inner, 1.0); }`, { uN: { value: 6 } }, { blending: T.NormalBlending, transparent: false, depthWrite: true });
    const cabM = this.sm(`varying vec2 vU; void main(){ vec3 c = mix(vec3(0.004,0.01,0.03), vec3(0.03,0.08,0.16), pow(vU.y,1.2)); c += vec3(0.45,0.75,1.0)*exp(-pow((vU.y-0.82)*22.0,2.0))*0.28; c += vec3(0.6,0.85,1.0)*exp(-pow((vU.x-vU.y*0.6-0.25)*14.0,2.0))*0.12; gl_FragColor = vec4(c,1.0); }`, {}, { blending: T.NormalBlending, transparent: false, depthWrite: true });
    const D = 2.3, H = 2.5, ext = { depth: D, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.24, bevelSegments: 6, curveSegments: 24 };
    const zf = D / 2 + 0.31;
    const body = (shape, x0, m = hull) => { const g = new T.ExtrudeGeometry(shape, ext); g.translate(0, 0, -D / 2); const me = new T.Mesh(this.geo(g), m); me.position.x = x0; tr.add(me); return me; };
    const both = (mk) => { for (const sgn of [1, -1]) { const m = mk(); m.position.z = sgn * (zf + 0.012); if (sgn < 0) { m.rotation.y = Math.PI; } tr.add(m); } };
    const strip = (x0, x1, y, h, m) => both(() => { const p = new T.Mesh(this.geo(new T.PlaneGeometry(x1 - x0, h)), m); p.position.set((x0 + x1) / 2, y, 0); return p; });
    /* locomotive : nez long et effilé vers -X */
    const L = 13.5, ls = new T.Shape(); ls.moveTo(0, 0); ls.lineTo(0, H); ls.lineTo(-4.6, H); ls.bezierCurveTo(-8.8, H - 0.02, -11.2, 1.55, -L, 0.48); ls.quadraticCurveTo(-L - 0.18, 0.05, -L + 0.5, 0); ls.lineTo(0, 0);
    body(ls, 0);
    const cab = new T.Shape(); cab.moveTo(-4.3, H - 0.42); cab.bezierCurveTo(-7.9, H - 0.46, -9.6, 1.8, -10.6, 1.15); cab.lineTo(-6.2, 1.12); cab.lineTo(-4.3, 1.12); cab.closePath();
    both(() => { const m = new T.Mesh(this.geo(new T.ShapeGeometry(cab)), cabM); return m; });
    /* chevrons or sur le nez + liseré de taille */
    for (const [x, y] of [[-11.6, 0.55], [-10.8, 0.62], [-10.0, 0.7]]) both(() => { const m = new T.Mesh(this.geo(new T.PlaneGeometry(0.5, 0.06)), gold); m.position.set(x, y, 0); m.rotation.z = 0.5; return m; });
    strip(-11.2, -0.1, 0.84, 0.08, gold); strip(-9.0, -0.1, 0.66, 0.025, gold);
    /* anneau d'énergie sur la locomotive */
    const coreRing = new T.Mesh(this.geo(new T.BoxGeometry(0.12, H + 0.62, D + 0.7)), this.mat(new T.MeshBasicMaterial({ color: this.illumC.clone() }))); coreRing.position.set(-2.2, H / 2, 0); tr.add(coreRing); this.coreRing = coreRing;
    const coreGlow = new T.Sprite(this.mat(new T.SpriteMaterial({ map: this.glow, color: new T.Color("#7fe2ff").multiplyScalar(1.4), blending: T.AdditiveBlending, depthWrite: false, transparent: true }))); coreGlow.scale.set(3.6, 3.6, 1); coreGlow.material.opacity = 0.6; coreGlow.position.set(-2.2, H / 2, zf); tr.add(coreGlow);
    /* aileron de toit */
    const fin = new T.Shape(); fin.moveTo(0, 0); fin.lineTo(-2.8, 0); fin.quadraticCurveTo(-0.6, 0.15, 0, 0.75); fin.closePath(); const fg = new T.ExtrudeGeometry(fin, { depth: 0.18, bevelEnabled: false }); fg.translate(-0.4, H + 0.25, -0.09); tr.add(new T.Mesh(this.geo(fg), goldMetal));
    /* voitures */
    const CW = 9.6, GAP = 0.6, NC = 5; this.L = L; this.chaseOff = 3.5; this.trainLen = L + NC * (CW + GAP); this.door = { x: GAP + CW * 0.5, y: 1.0, w: 1.05, h: 2.0, z: zf + 0.03, panel: true };
    this.bogies = []; for (let i = 0; i < NC; i++) this.bogies.push(GAP + i * (CW + GAP) + 1.9, GAP + i * (CW + GAP) + CW - 1.9); this.bogies.push(-L + 3, -3); this.bogieY = -0.45;
    const carShape = () => { const cs = new T.Shape(), rr = 0.7; cs.moveTo(rr, 0); cs.lineTo(CW - rr, 0); cs.quadraticCurveTo(CW, 0, CW, rr); cs.lineTo(CW, H - rr); cs.quadraticCurveTo(CW, H, CW - rr, H); cs.lineTo(rr, H); cs.quadraticCurveTo(0, H, 0, H - rr); cs.lineTo(0, rr); cs.quadraticCurveTo(0, 0, rr, 0); return cs; };
    for (let i = 0; i < NC; i++) {
      const x0 = GAP + i * (CW + GAP); body(carShape(), x0);
      const rb = new T.Mesh(this.geo(new T.BoxGeometry(CW - 1.4, 0.12, D + 0.2)), roof); rb.position.set(x0 + CW / 2, H + 0.27, 0); tr.add(rb);
      both(() => { const w = new T.Mesh(this.geo(new T.PlaneGeometry(CW - 1.6, 0.78)), winM); w.position.set(x0 + CW / 2, 1.58, 0); return w; });
      strip(x0 + 0.35, x0 + CW - 0.35, 0.84, 0.08, gold); strip(x0 + 0.35, x0 + CW - 0.35, 2.2, 0.022, gold);
      const con = new T.Mesh(this.geo(new T.BoxGeometry(GAP + 0.4, H * 0.72, D * 0.82)), dark); con.position.set(x0 - GAP / 2, H * 0.48, 0); tr.add(con);
      for (const bx of [x0 + 1.9, x0 + CW - 1.9]) { const bg = new T.Mesh(this.geo(new T.BoxGeometry(2.6, 0.45, D + 0.3)), dark); bg.position.set(bx, -0.22, 0); tr.add(bg); }
    }
    /* propulseurs de sustentation : points bleus sous la caisse */
    this.thr = []; for (let x = -L + 2; x < this.trainLen - L - 1; x += 1.6) { const sp = new T.Sprite(this.mat(new T.SpriteMaterial({ map: this.glow, color: new T.Color("#6fd8ff").multiplyScalar(1.2), blending: T.AdditiveBlending, depthWrite: false, transparent: true }))); sp.scale.set(1.3, 0.6, 1); sp.position.set(x, -0.42, zf * 0.5); tr.add(sp); this.thr.push(sp); }
    const ug = new T.Mesh(this.geo(new T.BoxGeometry(this.trainLen - 1.5, 0.04, D + 0.45)), this.mat(new T.MeshBasicMaterial({ color: new T.Color("#7fe2ff").multiplyScalar(1.3) }))); ug.position.set(-L + this.trainLen / 2 + 0.3, -0.46, 0); tr.add(ug);
    /* phares + faisceau doux */
    for (const dz of [0.55, -0.55]) { const hl = new T.Sprite(this.mat(new T.SpriteMaterial({ map: this.glow, color: new T.Color("#e6f6ff").multiplyScalar(2), blending: T.AdditiveBlending, depthWrite: false, transparent: true }))); hl.scale.set(3.4, 3.4, 1); hl.position.set(-L + 0.25, 0.6, dz * zf); tr.add(hl); }
        /* feux arrière + sillage */
    const back = this.trainLen - L + 0.2; for (const dz of [0.55, -0.55]) { const tl = new T.Sprite(this.mat(new T.SpriteMaterial({ map: this.glow, color: new T.Color("#ff4d63").multiplyScalar(1.5), blending: T.AdditiveBlending, depthWrite: false, transparent: true }))); tl.scale.set(1.6, 1.6, 1); tl.position.set(back, 1.0, dz * zf); tr.add(tl); }
    const wake = new T.Mesh(this.geo(new T.PlaneGeometry(70, 2.6)), this.sm("varying vec2 vU; void main(){ float a = pow(1.0 - vU.x, 2.4) * pow(1.0 - abs(vU.y-0.5)*2.0, 1.8) * 0.55; gl_FragColor = vec4(mix(vec3(0.45,0.85,1.0), vec3(1.0,0.75,0.45), vU.x)*a, 1.0); }"));
    wake.position.set(back + 35, 1.1, 0); tr.add(wake); this.wake = wake;
    tr.position.set(62, 0, 0);
  }

  /* train du pack : rendu photo-réaliste vu de profil (passes couleur, éclairage néon, reflets), découpé en locomotive + voitures */
  buildPhotoTrain() {
    const T = this.T, tr = this.train = new T.Group(); this.scene.add(tr); const tx = this.tex;
    const PW = 1867, PH = 184, SPLIT = 1101, H = 3.15, k = H / PH; const LW = SPLIT * k, CWp = (PW - SPLIT) * k, NC = 4;
    this.L = LW; this.chaseOff = LW * 0.62; this.trainLen = LW + NC * CWp; this.coreRing = null; this.thr = [];
    this.door = { x: (1314.5 - SPLIT) * k, y: -0.78 + (184 - 112.5) * k, w: 50 * k, h: 106 * k, z: 0.03, panel: false };
    this.bogies = [-LW + 3.2, -1.6]; for (let i = 0; i < NC; i++) this.bogies.push(i * CWp + 1.3, i * CWp + CWp - 1.3); this.bogieY = -0.72;
    const sk = this.skin; this.photoU = { uIllum: { value: this.illumC.clone() }, uSweepX: { value: -1e5 }, uFlash: { value: 0 }, uSpeed: { value: 0 },
      uHull: { value: new T.Color(sk?.hull || "#ffffff") }, uHullK: { value: Number(sk?.hullK) || 0 }, uFrost: { value: Number(sk?.frost) || 0 }, uRefl: { value: new T.Color(1, 1, 1).lerp(this.metalC, 0.55) }, uTrim: { value: new T.Color(sk?.trim || "#ffd88a") }, uTrimK: { value: sk ? 0.55 : 0 } };
    const mk = (u0, u1, w, x0) => { const m = new T.Mesh(this.geo(new T.PlaneGeometry(w, H)), this.mat(new T.ShaderMaterial({ transparent: true, depthWrite: true,
      uniforms: { uC: { value: tx.t3TrainColor }, uI: { value: tx.t3TrainIllum || null }, uRf: { value: tx.t3TrainRefl || null }, uU0: { value: u0 }, uU1: { value: u1 }, uHasI: { value: tx.t3TrainIllum ? 1 : 0 }, uHasR: { value: tx.t3TrainRefl ? 1 : 0 }, ...this.photoU },
      vertexShader: "varying vec2 vU; varying float vX; void main(){ vU = uv; vX = (modelMatrix*vec4(position,1.0)).x; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: `uniform sampler2D uC; uniform sampler2D uI; uniform sampler2D uRf; uniform float uU0; uniform float uU1; uniform float uHasI; uniform float uHasR; uniform vec3 uIllum; uniform float uSweepX; uniform float uFlash; uniform float uSpeed; uniform vec3 uHull; uniform float uHullK; uniform float uFrost; uniform vec3 uRefl; uniform vec3 uTrim; uniform float uTrimK; varying vec2 vU; varying float vX;
        void main(){ vec2 uv = vec2(mix(uU0, uU1, vU.x), vU.y); vec4 c = texture2D(uC, uv); if (c.a < 0.35) discard;
          vec3 col = pow(c.rgb, vec3(1.15)) * (0.62 + uFlash*0.5); float lum0 = dot(col, vec3(0.3,0.59,0.11));
          col = mix(col, lum0*uHull*1.9, uHullK);
          float gold = smoothstep(0.08, 0.3, c.r - c.b) * smoothstep(0.15, 0.5, lum0); col = mix(col, lum0*uTrim*2.2, gold*uTrimK);
          col = mix(col, vec3(0.86,0.94,1.0)*(0.35 + 0.65*lum0) + vec3(0.06), uFrost*smoothstep(0.74, 0.98, vU.y)*0.85);
          if (uHasR > 0.5) { vec3 rf = texture2D(uRf, uv).rgb; float sw = exp(-pow((vX - uSweepX)/3.2, 2.0)); col += rf * uRefl * (0.08 + sw*1.5 + uFlash*0.6); }
          if (uHasI > 0.5) { vec3 il = texture2D(uI, uv).rgb; float lum = max(il.r, max(il.g, il.b)); col += mix(il, vec3(lum)*uIllum, 0.85) * (1.0 + uSpeed*0.5); }
          gl_FragColor = vec4(col, c.a); }` })));
      m.position.set(x0 + w / 2, -0.78 + H / 2, 0); tr.add(m); return m; };
    mk(0, SPLIT / PW, LW, -LW);
    for (let i = 0; i < NC; i++) mk(SPLIT / PW, 1, CWp, i * CWp);
    /* sous la caisse : lueur de sustentation ; phare au nez ; feux arrière ; sillage */
    const ug = new T.Mesh(this.geo(new T.PlaneGeometry(this.trainLen - 2, 0.5)), this.sm("varying vec2 vU; void main(){ float a = pow(1.0 - abs(vU.y-0.5)*2.0, 2.0) * smoothstep(0.0,0.03,vU.x) * smoothstep(1.0,0.97,vU.x) * 0.8; gl_FragColor = vec4(vec3(0.45,0.88,1.0)*a, 1.0); }"));
    ug.position.set(-LW + this.trainLen / 2, -0.85, 0.05); tr.add(ug);
    const hl = new T.Sprite(this.mat(new T.SpriteMaterial({ map: this.glow, color: new T.Color("#e6f6ff").multiplyScalar(1.6), blending: T.AdditiveBlending, depthWrite: false, transparent: true }))); hl.scale.set(3, 3, 1); hl.position.set(-LW + 0.35, -0.05, 0.2); tr.add(hl);
    const back = this.trainLen - LW; const tl = new T.Sprite(this.mat(new T.SpriteMaterial({ map: this.glow, color: new T.Color("#ff4d63").multiplyScalar(1.3), blending: T.AdditiveBlending, depthWrite: false, transparent: true }))); tl.scale.set(1.5, 1.5, 1); tl.position.set(back - 0.2, 0.6, 0.2); tr.add(tl);
    const wake = new T.Mesh(this.geo(new T.PlaneGeometry(70, 2.6)), this.sm("varying vec2 vU; void main(){ float a = pow(1.0 - vU.x, 2.4) * pow(1.0 - abs(vU.y-0.5)*2.0, 1.8) * 0.5; gl_FragColor = vec4(mix(vec3(0.45,0.85,1.0), vec3(0.8,0.95,1.0), vU.x)*a, 1.0); }"));
    wake.position.set(back + 35, 0.8, -0.1); tr.add(wake); this.wake = wake;
    tr.position.set(62, 0, 0);
  }

  /* tram du pack (modèle 3D) : deux voitures, 32 vrais battants ; on ouvre une porte de la première voiture côté caméra.
   * Repère du modèle : longueur sur Z (nez de la voiture 1 vers +Z), flanc des portes 01-08 vers +X → tourné de -90° : nez vers -X, portes face caméra. */
  buildModelTrain(src) {
    const T = this.T, tr = this.train = new T.Group(); this.scene.add(tr);
    const S = 0.8, Z0 = -0.6, Y0 = -0.8; /* échelle (porte ≈ 1,9), origine à l'attelage, roues posées sur la voie */
    const m = src.scene.clone(true); m.rotation.y = -Math.PI / 2; m.scale.setScalar(S); m.position.set(Z0 * S, Y0, 0); tr.add(m); this.model = m;
    const X = z => -(z - Z0) * S, Y = y => y * S + Y0;
    if (src.hdr) { const pm = new T.PMREMGenerator(this.r); this.tramEnv = pm.fromEquirectangular(src.hdr).texture; pm.dispose(); this.disp.push(this.tramEnv); }
    /* matériaux : copies propres à cette intro (le modèle source est partagé entre les synthèses), reflets adoucis,
     * et livrée : carrosserie teintée (habillage de saison / événement ou couleurs personnalisées), vitres teintées, givre */
    const env = this.tramEnv || this.env, sk = this.skin || {}; dressTram(T, m, sk, env, this.disp);
    tr.updateMatrixWorld(true);
    /* train « sans fin » : la voiture 2 perd son nez arrière (plan de coupe qui suit le train) et se répète derrière,
     * attelage compris → on ne voit jamais le bout à droite. Copies sans le flanc caché ni le dessous lourd. */
    const CUT = -16.8, P = 16.71, NC = 4; this.r.localClippingEnabled = true; this.cuts = [];
    const parts2 = [], conn = []; m.traverse(o => { if (!o.isMesh) return; if (/^tram_02_/.test(o.name)) parts2.push(o); else if (/^tram_connector/.test(o.name)) conn.push(o); });
    const clipSet = () => { const pl = new T.Plane(new T.Vector3(-1, 0, 0), 0), cache = new Map(); return { pl, mat: mt => { if (!cache.has(mt)) { const c = mt.clone(); c.clippingPlanes = [pl]; c.envMap = env; this.disp.push(c); cache.set(mt, c); } return cache.get(mt); } }; };
    const c0 = clipSet(); for (const o of parts2) o.material = c0.mat(o.material); this.cuts.push({ pl: c0.pl, x: X(CUT) });
    const mInv = new T.Matrix4().copy(m.matrixWorld).invert(), skip = /air_reservoir|body_suspension|front_glass|_lights$|door_0[1-8]$|door_window_0[1-8]$|door_inner_window_0[1-8]$/;
    const rel = parts2.filter(o => !skip.test(o.name)).concat(conn).map(o => [o, new T.Matrix4().multiplyMatrices(mInv, o.matrixWorld)]);
    for (let k = 1; k <= NC; k++) { const cs = clipSet(), sh = new T.Matrix4().makeTranslation(0, 0, -k * P);
      for (const [o, M] of rel) { const c = o.clone(false); c.matrixAutoUpdate = false; c.matrix.multiplyMatrices(sh, M); if (/^tram_02_/.test(o.name)) c.material = cs.mat(o.material); m.add(c); }
      this.cuts.push({ pl: cs.pl, x: X(CUT - k * P) }); }
    m.updateMatrixWorld(true); this.tailZ = CUT - NC * P;
    this.L = X(18.01) * -1; this.chaseOff = this.L * 0.55; this.trainLen = this.L + X(this.tailZ); this.coreRing = null; this.thr = [];
    this.bogies = [3.5, 15.8, -4.7, ...Array.from({ length: NC }, (_, k) => -4.7 - (k + 1) * P)].map(X); this.bogieY = -0.72;
    /* battants de la porte 05/06 (milieu de la voiture 1) : porte + vitre + contre-vitre, glissés vers l'extérieur puis le long de la caisse */
    const by = n => m.getObjectByName(n);
    const box = new T.Box3(); const leaves = [];
    for (const [i, side] of [["05", -1], ["06", 1]]) { const parts = ["tram_01_door_", "tram_01_door_window_", "tram_01_door_inner_window_"].map(p => by(p + i)).filter(Boolean); if (!parts.length) continue; for (const o of parts) box.expandByObject(o); leaves.push({ parts, side }); }
    if (box.isEmpty()) box.set(new T.Vector3(X(6.84), Y(1.01), 1.06), new T.Vector3(X(4.86), Y(3.4), 1.21));
    const c = box.getCenter(new T.Vector3()), sz = box.getSize(new T.Vector3());
    this.door = { x: c.x, y: c.y, w: sz.x, h: sz.y, z: box.max.z + 0.01, panel: false, model: true };
    const toLocal = (o, v) => { const inv = new T.Matrix4().copy(o.parent.matrixWorld).invert(); const p0 = new T.Vector3().setFromMatrixPosition(o.matrixWorld); return p0.clone().add(v).applyMatrix4(inv).sub(p0.clone().applyMatrix4(inv)); };
    this.mLeaves = leaves.flatMap(({ parts, side }) => parts.map(o => ({ o, base: o.position.clone(), out: toLocal(o, new T.Vector3(0, 0, 0.075)), slide: toLocal(o, new T.Vector3(side * sz.x * 0.49, 0, 0)) })));
    /* fond noir derrière l'embrasure (l'intérieur du modèle est vide) : la lumière du rang y est peinte par le cadre */
    const occ = new T.Mesh(this.geo(new T.PlaneGeometry(sz.x * 1.02, sz.y)), this.mat(new T.MeshBasicMaterial({ color: "#000000" }))); occ.position.set(c.x, c.y, 0.98); tr.add(occ);
    /* intérieur éclairé derrière les vitres (bandeaux qui prennent la couleur du rang et pulsent au freinage) */
    this.cabinBase = new T.Color(sk.lights || "#ffe2b8"); this.headBase = new T.Color(sk.lights ? sk.lights : "#e6f6ff").lerp(new T.Color("#ffffff"), 0.35); this.cabinU = { uCol: { value: this.cabinBase.clone() }, uK: { value: 0.55 }, uT: { value: 0 } };
    for (const [z0, z1] of [[0.1, 16.5], [this.tailZ + 1, -1.3]]) { const x0 = X(z1), x1 = X(z0), w = x1 - x0;
      const p = new T.Mesh(this.geo(new T.PlaneGeometry(w, Y(3.45) - Y(1.82))), this.mat(new T.ShaderMaterial({ uniforms: { ...this.cabinU, uW: { value: w } }, vertexShader: VS_UV,
        fragmentShader: `uniform vec3 uCol; uniform float uK; uniform float uT; uniform float uW; varying vec2 vU;
          void main(){ float x = vU.x*uW; float ceil = exp(-pow((vU.y-0.86)*9.0,2.0)); float bay = 0.55 + 0.45*smoothstep(0.0,0.25,abs(fract(x/1.55)-0.5));
            float seat = smoothstep(0.32,0.30,vU.y)*step(0.35,fract(x/0.78)); vec3 c = uCol*(0.18 + 0.9*ceil)*bay - vec3(0.12)*seat;
            gl_FragColor = vec4(max(c,0.0)*uK, 1.0); }` })));
      p.position.set(x0 + w / 2, (Y(3.45) + Y(1.82)) / 2, 0.7); tr.add(p); }
    /* liserés aux couleurs de l'habillage (ligne de ceinture et ligne de toit, des deux côtés) ; discrets sans habillage */
    this.trimM = addTramTrim(T, tr, sk, { x0: -this.L + 0.6, x1: X(this.tailZ) - 0.3, yBelt: Y(1.0), yRoof: Y(3.47), z: 1.215 }, this.disp);
    /* phares (nez à -X) et feux arrière, lueur de sustentation, sillage */
    this.heads = [0.5, -0.5].map(dz => { const hl = new T.Sprite(this.mat(new T.SpriteMaterial({ map: this.glow, color: new T.Color("#e6f6ff").multiplyScalar(2), blending: T.AdditiveBlending, depthWrite: false, transparent: true }))); hl.scale.set(2.6, 2.6, 1); hl.position.set(-this.L + 0.15, Y(1.32), dz); tr.add(hl); return hl; });
    const back = X(this.tailZ); for (const dz of [0.5, -0.5]) { const tl = new T.Sprite(this.mat(new T.SpriteMaterial({ map: this.glow, color: new T.Color("#ff4d63").multiplyScalar(1.4), blending: T.AdditiveBlending, depthWrite: false, transparent: true }))); tl.scale.set(1.5, 1.5, 1); tl.position.set(back - 0.1, Y(1.32), dz); tr.add(tl); }
    const ug = new T.Mesh(this.geo(new T.PlaneGeometry(this.trainLen - 2, 0.5)), this.sm("varying vec2 vU; void main(){ float a = pow(1.0 - abs(vU.y-0.5)*2.0, 2.0) * smoothstep(0.0,0.03,vU.x) * smoothstep(1.0,0.97,vU.x) * 0.7; gl_FragColor = vec4(vec3(0.45,0.88,1.0)*a, 1.0); }"));
    ug.rotation.x = -Math.PI / 2; ug.position.set(-this.L + this.trainLen / 2, Y(0.12), 0); tr.add(ug);
    const wake = new T.Mesh(this.geo(new T.PlaneGeometry(70, 2.6)), this.sm("varying vec2 vU; void main(){ float a = pow(1.0 - vU.x, 2.4) * pow(1.0 - abs(vU.y-0.5)*2.0, 1.8) * 0.5; gl_FragColor = vec4(mix(vec3(0.45,0.85,1.0), vec3(0.8,0.95,1.0), vU.x)*a, 1.0); }"));
    wake.position.set(back + 35, Y(2.2), -0.1); tr.add(wake); this.wake = wake;
    this.under.intensity = 12; /* la coque blanche brûle sous la lueur de la voie réglée pour le train sombre */
    tr.position.set(62, 0, 0);
  }
  /** battants du tram : sortie (plug) puis coulissement ; k = avancement 0..1 de l'ouverture */
  modelLeavesAt(k) { const ko = smooth(k / 0.22), ks = smooth((k - 0.14) / 0.86); for (const l of this.mLeaves || []) l.o.position.copy(l.base).addScaledVector(l.out, ko).addScaledVector(l.slide, ks); return ks; }

  /* porte du premier wagon : liseré lumineux, fente, ouverture sur la couleur du rang, rayons */
  buildDoor() {
    const T = this.T, d = this.door, tr = this.train; const col = this.rb ? new T.Color("#ffffff") : this.hint.clone();
    this.doorU = { uGlow: { value: 0 }, uSeam: { value: 0 }, uOpen: { value: 0 }, uGap: { value: 0 }, uCol: { value: col }, uT: { value: 0 }, uRb: { value: this.rb ? 1 : 0 } };
    if (d.panel) { const pan = new T.Mesh(this.geo(new T.PlaneGeometry(d.w, d.h)), this.mat(new T.MeshPhysicalMaterial({ color: "#0d1430", metalness: 0.9, roughness: 0.3, clearcoat: 1 }))); pan.position.set(d.x, d.y, d.z - 0.01); tr.add(pan); }
    const pad = 0.45, frame = new T.Mesh(this.geo(new T.PlaneGeometry(d.w + pad * 2, d.h + pad * 2)), this.sm(`uniform float uGlow; uniform float uSeam; uniform float uOpen; uniform float uGap; uniform vec3 uCol; uniform float uT; uniform float uRb; varying vec2 vU;
        vec3 hue(float h){ return clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0); }
        void main(){ vec2 p = vU - 0.5; vec2 hs = vec2(${(d.w / (d.w + pad * 2) / 2).toFixed(4)}, ${(d.h / (d.h + pad * 2) / 2).toFixed(4)});
          vec2 q = abs(p) - hs; float outside = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
          float edge = exp(-pow(outside*28.0, 2.0)) + exp(-abs(outside)*9.0)*0.35*smoothstep(0.5, 0.3, max(abs(p.x), abs(p.y)));
          vec3 c = uRb > 0.5 ? mix(uCol, hue(fract(atan(p.y,p.x)/6.2832 + uT*0.2)), 0.6) : uCol;
          float inside = step(max(q.x, q.y), 0.0);
          float gap = uGap * hs.x; float inGap = inside * step(abs(p.x), gap);
          float seam = inside * exp(-pow((abs(p.x) - gap)/0.006, 2.0)) * uSeam;
          float per = (atan(p.y*hs.x, p.x*hs.y) / 6.2832) + 0.5; float chase = step(0.55, fract(per*16.0 - uT*2.2)) * exp(-pow(outside*40.0, 2.0)) * step(-0.004, outside);
          /* intérieur de la porte : couloir de lumière qui recule (rectangles concentriques), faisceaux, cœur blanc */
          vec2 u = p / hs; float rr = max(abs(u.x)*0.78, abs(u.y)); float tun = pow(fract(log2(rr + 0.035)*2.4 - uT*1.25), 5.0);
          float core = exp(-dot(u*vec2(1.7,0.85), u*vec2(1.7,0.85))*2.6); float shafts = pow(0.5 + 0.5*sin(atan(u.y, u.x)*9.0 + uT*0.7), 8.0)*(1.0 - min(rr, 1.0));
          vec3 inner = c*(0.14 + 0.72*tun*(1.0 - core) + 0.4*shafts) + vec3(1.0)*core*(0.12 + 0.55*uOpen*uOpen) + c*core*0.45;
          vec3 col = c * edge * uGlow * (1.2 + 0.3*sin(uT*18.0)) + c * chase * uGlow * 2.2 + (c*1.9 + vec3(0.12)) * seam*1.6 + inner * inGap * (0.6 + 0.9*uOpen*uOpen);
          gl_FragColor = vec4(col, 1.0); }`, this.doorU));
    frame.position.set(d.x, d.y, d.z + 0.02); tr.add(frame);
    /* rayons de lumière qui jaillissent de la porte */
    const rays = new T.Mesh(this.geo(new T.PlaneGeometry(26, 26)), this.sm(`uniform float uOpen; uniform vec3 uCol; uniform float uT; uniform float uRb; varying vec2 vU;
        vec3 hue(float h){ return clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0); }
        void main(){ vec2 p = (vU - 0.5) * vec2(1.0, 1.35); float r = length(p); float a = atan(p.y, p.x);
          float ray = pow(0.5 + 0.5*sin(a*14.0 + uT*1.5), 6.0) * 0.7 + pow(0.5 + 0.5*sin(a*31.0 - uT*2.3), 10.0) * 0.5;
          float core = exp(-r*9.0) * 1.2; float fall = exp(-r*3.2);
          vec3 c = uRb > 0.5 ? mix(vec3(1.0), hue(fract(a/6.2832 + uT*0.15)), 0.7) : uCol;
          vec3 col = (c * (ray*fall*1.4 + core*1.2) + vec3(1.0)*core*0.15) * pow(uOpen, 1.6); gl_FragColor = vec4(col, 1.0); }`, this.doorU));
    rays.position.set(d.x, d.y, d.z + 0.6); tr.add(rays); this.rays = rays;
    this.doorLight = new T.PointLight(col, 0, 30, 1.4); this.doorLight.position.set(d.x, d.y, 2.5); tr.add(this.doorLight);
  }
  /** change la couleur du rang à chaud (fausse alerte → vrai rang) sur tout ce qui la porte */
  setTint(hex, tier) {
    const T = this.T; this.tier = tier; this.rb = tier === "SSS"; this.hint.set(hex); const col = this.rb ? new T.Color("#ffffff") : this.hint.clone();
    this.doorU.uCol.value.copy(col); this.doorU.uRb.value = this.rb ? 1 : 0; this.ringM?.color.copy(col).multiplyScalar(1.8); this.archM?.color.copy(col).multiplyScalar(2.2);
    this.moteM?.color.copy(col).multiplyScalar(1.6); this.doorLight?.color.copy(col); this.skyU?.uTint.value.copy(this.hint);
  }
  /* porte, version soignée : deux battants métalliques qui coulissent, chenillard lumineux, emblème holographique
   * au-dessus, vapeur à l'ouverture, poussières dans le faisceau, reflet anamorphique, arche de gare à la couleur du rang */
  buildDoorPlus() {
    const T = this.T, d = this.door, tr = this.train, col = this.rb ? new T.Color("#ffffff") : this.hint.clone(); const du = this.doorU;
    /* battants */
    const leafFS = `uniform float uGlow; uniform float uOpen; uniform float uSeam; uniform vec3 uCol; uniform float uT; uniform float uSide; uniform float uOff; varying vec2 vU;
      void main(){ vec2 u = vU; if (uSide > 0.0 ? u.x > 1.0 - uOff : u.x < uOff) discard; float rib = smoothstep(0.0,0.04,abs(fract(u.y*9.0)-0.5)-0.42); float bev = smoothstep(0.0,0.06,u.x)*smoothstep(0.0,0.06,1.0-u.x)*smoothstep(0.0,0.03,u.y)*smoothstep(0.0,0.03,1.0-u.y);
        vec3 base = mix(vec3(0.02,0.03,0.06), vec3(0.16,0.19,0.25), 0.3 + 0.5*u.y + 0.03*sin(u.x*40.0+u.y*3.0)); base *= 0.6 + 0.4*bev; base += vec3(0.05)*rib;
        float inner = uSide > 0.0 ? u.x : 1.0 - u.x; /* bord intérieur (côté fente) */
        float glyph = step(0.92, fract(u.y*14.0 + floor(inner*3.0)*0.37)) * step(inner, 0.35) * step(0.15, u.y) * step(u.y, 0.85);
        float led = exp(-pow((u.y-0.82)*40.0,2.0)) * exp(-pow((inner-0.18)*30.0,2.0));
        vec3 c = base + uCol*(glyph*1.6*uGlow + led*(0.6 + 1.4*uGlow)*(0.7+0.3*sin(uT*12.0))) + uCol*pow(inner < 0.05 ? 1.0 : 0.0, 1.0)*uGlow*1.2;
        /* lumière qui filtre par la fente avant l'ouverture : elle lèche le bord des battants */
        c += (uCol*1.4 + vec3(0.15)) * exp(-inner*15.0) * (0.22*uGlow + 1.5*uSeam) * (0.85 + 0.15*sin(uT*9.0 + u.y*20.0));
        gl_FragColor = vec4(c, 1.0); }`;
    this.leaves = [-1, 1].map(side => { const m = new T.Mesh(this.geo(new T.PlaneGeometry(d.w / 2, d.h)), this.mat(new T.ShaderMaterial({ uniforms: { ...du, uSide: { value: side }, uOff: { value: 0 } }, vertexShader: VS_UV, fragmentShader: leafFS })));
      m.position.set(d.x + side * d.w / 4, d.y, d.z + 0.012); tr.add(m); m.userData.side = side; return m; });
    /* emblème holographique au-dessus de la porte (image du pack si présente) + anneau de runes */
    const emb = new T.Group(); emb.position.set(d.x, d.y + d.h / 2 + (d.model ? 0.34 : 0.55), d.z + 0.15); if (d.model) emb.scale.setScalar(0.85); tr.add(emb); this.emb = emb;
    this.runeU = { uT: du.uT, uGlow: du.uGlow, uCol: du.uCol };
    const ring = new T.Mesh(this.geo(new T.PlaneGeometry(1.15, 1.15)), this.sm(`uniform float uT; uniform float uGlow; uniform vec3 uCol; varying vec2 vU; void main(){ vec2 p = vU - 0.5; float r = length(p); float a = atan(p.y,p.x);
        float band = smoothstep(0.03,0.0,abs(r-0.4)) + smoothstep(0.02,0.0,abs(r-0.31))*0.7; float runes = step(0.55, fract(a*8.0/6.2832*3.0 + uT*0.4)) * smoothstep(0.03,0.0,abs(r-0.355));
        float tick = step(0.9, fract(a*24.0/6.2832 - uT*0.8)) * smoothstep(0.02,0.0,abs(r-0.45));
        gl_FragColor = vec4(uCol*(band*1.3 + runes*1.8 + tick*1.2)*uGlow, 1.0); }`, this.runeU)); emb.add(ring);
    const eu = img("embWarp"); if (eu) new T.TextureLoader().load(absUrl(eu), tex => { tex.colorSpace = T.SRGBColorSpace; this.disp.push(tex); const sp = new T.Mesh(this.geo(new T.PlaneGeometry(0.55, 0.55)), this.mat(new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 }))); sp.position.z = 0.01; emb.add(sp); this.embSprite = sp; }, undefined, () => {});
    /* vapeur à l'ouverture */
    this.puffs = Array.from({ length: 34 }, (_, i) => { const sp = new T.Sprite(this.mat(new T.SpriteMaterial({ map: this.glow, color: new T.Color(0.75, 0.82, 0.95), transparent: true, depthWrite: false, opacity: 0 })));
      const side = i % 2 ? 1 : -1; sp.userData = { x0: d.x + side * (d.w / 2) * (0.6 + Math.random() * 0.5), y0: d.y - d.h / 2 + Math.random() * d.h * 0.9, vx: side * (0.0008 + Math.random() * 0.0016), vy: 0.0003 + Math.random() * 0.0008, vz: 0.0015 + Math.random() * 0.002, del: Math.random() * 260, life: 900 + Math.random() * 900 };
      sp.visible = false; tr.add(sp); return sp; });
    /* poussières dans le faisceau */
    const NM = 180, mg = this.geo(new T.BufferGeometry()); const mp = new Float32Array(NM * 3); this.motes = []; for (let i = 0; i < NM; i++) { const m = { x: d.x + (Math.random() - 0.5) * 5, y: d.y + (Math.random() - 0.5) * 3.2, z: d.z + 0.3 + Math.random() * 4.5, s: Math.random() * 6.28 }; this.motes.push(m); }
    mg.setAttribute("position", new T.BufferAttribute(mp, 3)); this.moteM = this.mat(new T.PointsMaterial({ map: this.glow, size: 0.07, color: col.clone().multiplyScalar(1.6), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 }));
    this.motePts = new T.Points(mg, this.moteM); this.motePts.frustumCulled = false; tr.add(this.motePts);
    /* reflet anamorphique (trait horizontal) */
    this.streak = new T.Mesh(this.geo(new T.PlaneGeometry(1, 1)), this.sm(`uniform vec3 uCol; uniform float uOpen; varying vec2 vU; void main(){ float x = abs(vU.x-0.5)*2.0, y = abs(vU.y-0.5)*2.0; float a = pow(1.0-x, 2.2) * exp(-y*y*30.0); gl_FragColor = vec4(mix(uCol, vec3(1.0), 0.35)*a*uOpen*1.6, 1.0); }`, du));
    this.streak.frustumCulled = false; this.scene.add(this.streak); this.streak.visible = false;
    /* arche de gare : grand portique hexagonal à la couleur du rang, posé à la porte quand le train s'arrête */
    const arch = this.arch = new T.Group(); this.scene.add(arch); arch.visible = false;
    arch.add(new T.Mesh(this.frames.geometry, this.metal)); this.archM = this.mat(new T.MeshBasicMaterial({ color: col.clone().multiplyScalar(2.2), side: T.DoubleSide, transparent: true, opacity: 0 }));
    for (const off of [0.36, -0.36]) { const l = new T.Mesh(this.frameLines.geometry, this.archM); l.position.x = off; arch.add(l); }
    arch.rotation.y = Math.PI / 2;
  }
  updateDoorPlus(t, camX, g, sm, op, cam) {
    const T = this.T, d = this.door;
    for (const lf of this.leaves) { if (d.model) { lf.visible = false; continue; } const side = lf.userData.side; const o = Math.min(1, op * 1.02); lf.position.x = d.x + side * (d.w / 4 + (d.w / 2) * o); lf.material.uniforms.uOff.value = o; lf.visible = o < 0.995; }
    this.emb.visible = g > 0.001; this.emb.scale.setScalar(0.85 + 0.15 * g + 0.04 * Math.sin(t / 160)); this.emb.children[0].rotation.z = t * 0.0006; if (this.embSprite) this.embSprite.material.opacity = g * (0.85 + 0.15 * Math.sin(t / 120));
    for (const p of this.puffs) { const u = p.userData, age = t - HY3.open0 - u.del; if (age < 0 || age > u.life) { p.visible = false; continue; } const k = age / u.life; p.visible = true;
      p.position.set(u.x0 + u.vx * age, u.y0 + u.vy * age, d.z + 0.15 + u.vz * age); const sc = 0.5 + 2.6 * k; p.scale.set(sc, sc, 1); p.material.opacity = 0.32 * Math.sin(Math.PI * Math.min(1, k * 1.4)) * (1 - k); }
    if (op > 0.001) { const a = this.motePts.geometry.attributes.position.array; this.motes.forEach((m, i) => { a[i * 3] = m.x + Math.sin(t / 900 + m.s) * 0.25; a[i * 3 + 1] = m.y + Math.sin(t / 1300 + m.s * 2) * 0.2 + ((t / 4000 + m.s) % 1) * 0.3; a[i * 3 + 2] = m.z; }); this.motePts.geometry.attributes.position.needsUpdate = true; }
    this.moteM.opacity = op * 0.9;
    this.streak.visible = op > 0.01; if (this.streak.visible) { const w = new T.Vector3(d.x, d.y, d.z + 0.5).applyMatrix4(this.train.matrixWorld); this.streak.position.copy(w); this.streak.quaternion.copy(cam.quaternion); this.streak.scale.set(6 + 30 * op, 0.22 + 0.25 * op, 1); }
    /* arche de gare */
    const ak = smooth((t - 3150) / 450); this.arch.visible = ak > 0.001; if (this.arch.visible) { if (this._archX == null || t < 3200) this._archX = this.train.position.x + d.x; this.arch.position.set(this._archX, 1.0, 0); this.archM.opacity = ak * (0.85 + 0.15 * Math.sin(t / 110)); this.arch.scale.setScalar(1 + 0.04 * (1 - ak)); }
  }
  /* gerbes d'étincelles du freinage (segments additifs) + lueur des patins */
  buildSparks() {
    const T = this.T, N = this.spN = 1400; this.sp = new Float32Array(N * 8); /* x y z vx vy vz age life */ for (let i = 0; i < N; i++) this.sp[i * 8 + 7] = -1;
    const g = this.geo(new T.BufferGeometry()); g.setAttribute("position", new T.BufferAttribute(new Float32Array(N * 6), 3)); g.setAttribute("color", new T.BufferAttribute(new Float32Array(N * 6), 3));
    this.sparks = new T.LineSegments(g, this.mat(new T.LineBasicMaterial({ vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false }))); this.sparks.frustumCulled = false; this.scene.add(this.sparks);
    const pg = this.geo(new T.BufferGeometry()); pg.setAttribute("position", new T.BufferAttribute(new Float32Array(N * 3), 3)); pg.setAttribute("color", new T.BufferAttribute(new Float32Array(N * 3), 3));
    this.sparkPts = new T.Points(pg, this.mat(new T.PointsMaterial({ map: this.glow, size: 0.3, sizeAttenuation: true, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false }))); this.sparkPts.frustumCulled = false; this.scene.add(this.sparkPts);
    this.hot = this.bogies.map(bx => { const sp = new T.Sprite(this.mat(new T.SpriteMaterial({ map: this.glow, color: new T.Color(2.2, 1.0, 0.35), blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }))); sp.scale.set(3.2, 1.6, 1); sp.position.set(bx, this.bogieY + 0.05, 0.45); this.train.add(sp); return sp; });
    this.sparkL = new T.PointLight("#ff9a3c", 0, 16, 1.6); this.scene.add(this.sparkL); this.spawnAcc = 0;
  }

  buildComet() {
    const T = this.T, g = this.comet = new T.Group(); g.visible = false; this.scene.add(g);
    const c = this.rb ? new T.Color("#ffffff") : this.hint.clone();
    this.cHead = new T.Sprite(this.mat(new T.SpriteMaterial({ map: this.glow, color: c.clone().multiplyScalar(2.6), blending: T.AdditiveBlending, depthWrite: false, transparent: true }))); g.add(this.cHead);
    this.cCore = new T.Sprite(this.mat(new T.SpriteMaterial({ map: this.glow, color: new T.Color(3.5, 3.5, 3.5), blending: T.AdditiveBlending, depthWrite: false, transparent: true }))); g.add(this.cCore);
    const cols = this.rb ? RAINBOW.map(h => new T.Color(h)) : Array(6).fill(0).map(() => c.clone());
    this.cTrail = new T.Mesh(this.geo(new T.PlaneGeometry(1, 1)), this.sm(`uniform vec3 uC[6]; varying vec2 vU; void main(){ float x = vU.x; float w = 1.0 - abs(vU.y-0.5)*2.0; float a = pow(x, 1.6) * pow(w, 1.3 + (1.0-x)*3.0);
        float f = x*5.0; int i = int(floor(f)); vec3 c = uC[5]; for (int k = 0; k < 5; k++) { if (k == i) c = mix(uC[k], uC[k+1], fract(f)); }
        vec3 col = mix(c, vec3(1.0), pow(x, 6.0)*0.8) * 1.8; gl_FragColor = vec4(col*a, 1.0); }`, { uC: { value: cols } }));
    this.cTrail.frustumCulled = false; this.cTrail.visible = false; this.scene.add(this.cTrail);
  }

  /* habillage : pétales, feuilles, neige, braises, confettis… qui volent autour du quai (couleurs de la saison ou de l'événement) */
  buildSeasonFx() {
    const T = this.T, sk = this.skin; this.sfx = null; if (!sk?.fx) return;
    const kind = sk.fx, glowy = ["motes", "dust", "sparks", "embers", "lights", "lanterns"].includes(kind);
    const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); g.translate(32, 32); g.fillStyle = "#fff"; g.strokeStyle = "#fff";
    const blob = (r0 = 1, r1 = 0) => { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 30); gr.addColorStop(0, `rgba(255,255,255,${r0})`); gr.addColorStop(0.35, "rgba(255,255,255,0.55)"); gr.addColorStop(1, `rgba(255,255,255,${r1})`); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 30, 0, 6.283); g.fill(); };
    if (kind === "petals") { g.beginPath(); g.moveTo(0, -26); g.bezierCurveTo(20, -14, 18, 16, 0, 26); g.bezierCurveTo(-18, 16, -20, -14, 0, -26); g.fill(); g.globalCompositeOperation = "destination-out"; g.beginPath(); g.arc(0, -27, 6, 0, 6.283); g.fill(); }
    else if (kind === "leaves") { g.beginPath(); g.moveTo(0, -28); g.quadraticCurveTo(24, -6, 0, 28); g.quadraticCurveTo(-24, -6, 0, -28); g.fill(); g.globalCompositeOperation = "destination-out"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -22); g.lineTo(0, 24); g.stroke(); }
    else if (kind === "snow") { blob(1, 0); g.lineWidth = 2.2; for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 22); g.stroke(); } }
    else if (kind === "confetti") { g.fillRect(-9, -15, 18, 30); }
    else if (kind === "bubbles") { g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 24, 0, 6.283); g.stroke(); g.globalAlpha = 0.6; g.beginPath(); g.arc(-9, -9, 5, 0, 6.283); g.fill(); }
    else if (kind === "hearts") { g.beginPath(); g.moveTo(0, 22); g.bezierCurveTo(-30, 0, -14, -26, 0, -10); g.bezierCurveTo(14, -26, 30, 0, 0, 22); g.fill(); }
    else if (kind === "rain") { const gr = g.createLinearGradient(0, -30, 0, 30); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(255,255,255,0.9)"); g.fillStyle = gr; g.fillRect(-1.5, -30, 3, 60); }
    else if (kind === "lanterns") { blob(0.9, 0); g.fillStyle = "#fff"; g.beginPath(); g.roundRect?.(-10, -13, 20, 26, 6); g.fill(); }
    else blob(1, 0);
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; this.disp.push(tex);
    const N = kind === "rain" ? 420 : kind === "lanterns" ? 60 : 240; const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), rot = new Float32Array(N), V = new Float32Array(N * 4);
    const pal = (sk.colors?.length ? sk.colors : ["#ffffff"]).map(h => new T.Color(h));
    const sizeOf = { petals: 0.22, leaves: 0.3, snow: 0.16, confetti: 0.16, bubbles: 0.26, hearts: 0.24, rain: 0.5, lanterns: 0.7, embers: 0.12, sparks: 0.12, motes: 0.1, dust: 0.1, lights: 0.4 }[kind] || 0.15;
    const fall = { petals: -0.0011, leaves: -0.0016, snow: -0.0012, confetti: -0.0018, bubbles: 0.0007, hearts: 0.0005, rain: -0.03, lanterns: 0.00045, embers: 0.0009, sparks: 0.0003, motes: 0.00012, dust: 0.0002, lights: 0 }[kind] ?? -0.001;
    for (let i = 0; i < N; i++) { pos.set([(Math.random() - 0.5) * 70, -2.5 + Math.random() * 12, -7 + Math.random() * 18], i * 3); const cc = pal[i % pal.length]; col.set([cc.r, cc.g, cc.b], i * 3); size[i] = sizeOf * (0.6 + Math.random() * 0.8); rot[i] = Math.random() * 6.283;
      V.set([fall * (0.7 + Math.random() * 0.6), (Math.random() - 0.5) * 0.004, Math.random() * 6.283, 0.6 + Math.random() * 1.6], i * 4); }
    const geo = this.geo(new T.BufferGeometry()); geo.setAttribute("position", new T.BufferAttribute(pos, 3)); geo.setAttribute("aCol", new T.BufferAttribute(col, 3)); geo.setAttribute("aSize", new T.BufferAttribute(size, 1)); geo.setAttribute("aRot", new T.BufferAttribute(rot, 1));
    const U = { uMap: { value: tex }, uOp: { value: 0 }, uScale: { value: 600 } };
    const m = this.mat(new T.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: glowy ? T.AdditiveBlending : T.NormalBlending,
      vertexShader: "attribute vec3 aCol; attribute float aSize; attribute float aRot; varying vec3 vC; varying float vR; uniform float uScale; void main(){ vC = aCol; vR = aRot; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = clamp(aSize*uScale/max(0.5,-mv.z), 1.0, 96.0); gl_Position = projectionMatrix*mv; }",
      fragmentShader: `uniform sampler2D uMap; uniform float uOp; varying vec3 vC; varying float vR; void main(){ vec2 p = gl_PointCoord - 0.5; float c = cos(vR), s = sin(vR); p = mat2(c,-s,s,c)*p; vec4 t = texture2D(uMap, p + 0.5); if (t.a < 0.02) discard; gl_FragColor = vec4(vC*t.rgb*${glowy ? "1.8" : "0.9"}, t.a*uOp); }` }));
    const pts = new T.Points(geo, m); pts.frustumCulled = false; this.scene.add(pts); this.sfx = { pts, U, V, N, kind, fall };
  }
  updateSeasonFx(t, dt, camX, op) {
    const f = this.sfx; if (!f) return; const pos = f.pts.geometry.attributes.position.array, rot = f.pts.geometry.attributes.aRot.array, V = f.V; const sway = ["petals", "leaves", "hearts", "confetti", "snow"].includes(f.kind);
    f.U.uScale.value = innerHeight / (2 * Math.tan((this.cam.fov * Math.PI / 180) / 2)); f.U.uOp.value = smooth(t / 700) * (1 - op) * (f.kind === "rain" ? 0.55 : 0.9);
    for (let i = 0; i < f.N; i++) { const o = i * 3, v = i * 4; let x = pos[o], y = pos[o + 1];
      y += V[v] * dt; x += (V[v + 1] + (sway ? Math.sin(t * 0.0018 * V[v + 3] + V[v + 2]) * 0.0016 : 0)) * dt; if (f.kind === "rain") x -= 0.004 * dt;
      if (y < -3) y += 15; else if (y > 12) y -= 15; if (x - camX > 35) x -= 70; else if (x - camX < -35) x += 70;
      pos[o] = x; pos[o + 1] = y; if (f.kind !== "rain") rot[i] += (sway ? 0.0022 : 0.0006) * V[v + 3] * dt * (i % 2 ? 1 : -1); }
    f.pts.geometry.attributes.position.needsUpdate = true; f.pts.geometry.attributes.aRot.needsUpdate = true;
  }

  /* vitesse du train (unités / ms) */
  speed(t) { const vmax = 1.15; if (t < HY3.accel) return 0.17; if (t < HY3.brake0) { const k = clamp((t - HY3.accel) / (HY3.brake0 - HY3.accel - 250)); return 0.17 + (vmax - 0.17) * k * k; }
    if (t < HY3.brake1) { const k = (t - HY3.brake0) / (HY3.brake1 - HY3.brake0); return vmax * Math.pow(1 - smooth(k), 1.15); } return 0; }

  start(t0p) { this.t0p = t0p; this.on = true; const loop = now => { if (!this.on) return; try { this.frame(now); } catch (e) { console.error(MOD, e); this.on = false; return; } this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
  stop() { this.on = false; cancelAnimationFrame(this.raf); }
  destroy() { this.stop(); removeEventListener("resize", this._r); for (const d of this.disp) { try { d.dispose(); } catch (e) {} } try { this.bloom?.dispose?.(); this.comp?.dispose?.(); this.env?.dispose(); this.r.renderLists?.dispose?.(); this.r.dispose(); this.r.forceContextLoss(); } catch (e) {} this.disp = []; }

  frame(now, render = true) {
    const T = this.T, rt = now - this.t0p, t = this.map ? warpT(this.map, rt) : rt; const dt = this.last == null ? 16 : Math.min(50, now - this.last); this.last = now; if (rt < 0) { if (render) this.comp.render(); return; }
    const u = this.speed(t); this.tx -= u * dt; const tx = this.tx;
    /* caméra : fixe pendant le passage, puis panoramique filé jusqu'au flanc de la locomotive */
    const lock = this.door.model ? [120, 560] : [HY3.lock0, HY3.lock1], lk = smooth((t - lock[0]) / (lock[1] - lock[0])); /* tram plus court : la caméra le prend en chasse plus tôt */ const dk = smooth((t - 2350) / 1150); const chaseX = tx - this.chaseOff, doorX = tx + this.door.x; const camX = lk * ((1 - dk) * chaseX + dk * doorX);
    const dCam = this.prevCamX - camX; this.prevCamX = camX;
    const laneK = smooth((t - 1700) / 500) * (1 - smooth((t - 2650) / 550)); const bk = smooth((t - HY3.brake0) / 150) * (1 - smooth((t - HY3.brake1 + 180) / 220));
    const sh = (t > 1500 && t < HY3.brake0 ? Math.min(0.07, u * 0.04) : 0) + 0.11 * bk + (t > HY3.brake1 && t < HY3.brake1 + 300 ? 0.08 * (1 - (t - HY3.brake1) / 300) : 0);
    const cam = this.cam; cam.fov = 40 + 14 * laneK + 5 * smooth((t - 1200) / 1200) * (1 - dk) - 3 * dk; cam.updateProjectionMatrix();
    const ck0 = smooth((t - 900) / 1800); const push = smooth((t - HY3.open0 + 100) / 500); const cz = (15.5 - 2.2 * ck0) * (1 - dk) + (7.6 - 1.8 * push) * dk, cy = (2.3 - 0.35 * ck0) * (1 - dk) + (this.door.y + 0.3) * dk;
    /* approche de la porte « d'un coup sec » (comme HSR) : la caméra fond sur la porte et se cale à son pied, en contre-plongée */
    const D = this.door, su = clamp((t - HY3.snap) / 34), snapK = 1 - Math.pow(1 - su, 4), rush = t > HY3.snap ? Math.sin(Math.PI * su) : 0, hit = t > HY3.snap + 30 ? Math.exp(-(t - HY3.snap - 30) / 55) : 0;
    /* élan : juste avant le coup sec, la caméra recule et se resserre (≈ 150 ms réels), puis fond sur la porte en grand angle */
    const wind = smooth((t - HY3.snap + 24) / 24) * (1 - snapK); this._rush = rush; this._hit = hit;
    const bot = D.y - D.h / 2, top = D.y + D.h / 2, MD = !!D.model; const sx = doorX + 0.08, sy = MD ? bot - 0.42 + 0.2 * push : bot - 0.22 + 0.4 * push, sz = MD ? D.z + 2.35 - 0.85 * push : D.z + 3.6 - 1.8 * push;
    const px = camX + (sx - camX) * snapK, py = cy + (sy - cy) * snapK - 0.12 * wind, pz = cz + (sz - cz) * snapK + 1.3 * wind; const jit = sh + 0.16 * hit + 0.05 * rush;
    cam.position.set(px + (Math.random() - 0.5) * jit, py + (Math.random() - 0.5) * jit + 0.05 * hit * Math.sin((t - HY3.snap) / 9), pz);
    const lx0 = camX - (1.4 + 1.5 * laneK) * (1 - dk), ly0 = 0.75 * (1 - dk) + D.y * dk, ly1 = bot + D.h * (MD ? 0.58 + 0.05 * push : 0.7 + 0.05 * push); cam.lookAt(lx0 + (doorX - lx0) * snapK, ly0 + (ly1 - ly0) * snapK, D.z * snapK);
    cam.rotateZ((Math.sin(t / 650) * 0.006 * lk - 0.01 * laneK) * (1 - dk) + 0.012 * snapK); if (snapK > 0 || wind > 0) { cam.fov = cam.fov + (50 - cam.fov) * snapK - 6 * wind + 24 * rush - 6 * hit; cam.updateProjectionMatrix(); }
    /* train */
    const settle = t > HY3.brake1 ? 0.22 * Math.exp(-(t - HY3.brake1) / 170) * Math.sin((t - HY3.brake1) / 42) : 0; this.train.position.set(tx + settle, Math.sin(t / 240) * 0.04 * lk * (1 - dk), 0); this.train.rotation.z = -0.006 * bk; if (this.cuts) { const bx = this.train.position.x; for (const c of this.cuts) c.pl.constant = bx + c.x; } this.wake.scale.x = 0.05 + Math.min(1.8, u * 1.1); this.wake.visible = u > 0.05;
    const pulse = 0.75 + 0.25 * Math.sin(t / 90); if (this.coreRing) this.coreRing.material.color.copy(this.illumC).lerp(this.hint, laneK * 0.7).multiplyScalar(1.15 * pulse);
    for (let i = 0; i < this.thr.length; i++) this.thr[i].material.opacity = 0.65 + 0.35 * Math.sin(t / 45 + i * 1.7);
    this.under.position.set(tx + 10, -1.0, 1.2); this.under.color.setRGB(0.44, 0.85, 1).lerp(this.hint, laneK * 0.6);
    /* ciel + planète (parallaxe très lente : elle dérive vers la droite) */
    this.sky.position.copy(cam.position); this.skyU.uShift.value = camX * 0.0008; this.skyU.uWarp.value = laneK;
    this.planet.position.set(camX * 0.985 + 330 - (camX * 0.015 + 0), -170, -1300); this.planet.rotation.y = t * 0.00002; this.planetU.uT.value = rt;
    /* étoiles : le décor défile de gauche à droite */
    const P = this.starLines.geometry.attributes.position.array, C = this.starLines.geometry.attributes.color.array, S = this.stars, n = S.length / 4;
    const d16 = Math.abs(dCam) / Math.max(1, dt) * 16; const mixK = laneK * (this.rb ? 0.3 : 0.45); const hc = this.hint, B = this.starBase;
    for (let i = 0; i < n; i++) { const o = i * 4; let x = S[o] + dCam; if (x > 350) x -= 700; else if (x < -350) x += 700; S[o] = x; const y = S[o + 1], z = S[o + 2];
      const len = Math.min(140, 0.04 + d16 * 2.2); const p = i * 6; P[p] = camX + x - len; P[p + 1] = y; P[p + 2] = z; P[p + 3] = camX + x; P[p + 4] = y; P[p + 5] = z;
      if (mixK > 0) { C[p + 3] = B[p + 3] * (1 - mixK) + hc.r * mixK * 1.3; C[p + 4] = B[p + 4] * (1 - mixK) + hc.g * mixK * 1.3; C[p + 5] = B[p + 5] * (1 - mixK) + hc.b * mixK * 1.3; } }
    this.starLines.material.opacity = clamp(1.25 - u * 0.4, 0.42, 1); this.starLines.geometry.attributes.position.needsUpdate = true; if (mixK > 0) this.starLines.geometry.attributes.color.needsUpdate = true;
    /* voie et piliers */
    const railK = smooth(t / 500) * (t < HY3.impact + 200 ? 1 : clamp(1 - (t - HY3.impact - 200) / 500)); this.guide.position.x = camX; this.railU.uX.value = camX; this.railU.uGlow.value = railK * (0.55 + Math.min(0.8, u * 0.7));
    const lane = this.metalC.clone().lerp(this.hint, laneK * 0.85); this.railU.uCol.value.copy(lane); this.edgeM.color.copy(lane).multiplyScalar(1.3);
    /* piliers et portiques : ils défilent plus vite que le décor (décalage qui grandit avec la vitesse) pour ne pas masquer la planète longtemps */
    this.gOff = (this.gOff || 0) + u * dt * 0.85;
    { const M = new T.Matrix4(), sp = this.pSp, go = this.gOff, base = Math.floor((camX - 140 - go) / sp) * sp; for (let k = 0; k < this.pN; k++) { const x = base + k * sp + go; M.makeTranslation(x, -41.5, 0); this.pillars.setMatrixAt(k, M);
        for (let j = 0; j < 3; j++) { M.makeRotationX(Math.PI / 2).setPosition(x, -4 - j * 5, 0); this.pillarLights.setMatrixAt(k * 3 + j, M); } } this.pillars.instanceMatrix.needsUpdate = true; this.pillarLights.instanceMatrix.needsUpdate = true; }
    /* portiques hexagonaux (pendant la poursuite) + éclairs de lumière sur la coque */
    const gOn = t > 1250 && u > 0.12; this.frames.visible = this.frameLines.visible = gOn; this.flashA.intensity = this.flashB.intensity = 0;
    if (gOn) { const M = new T.Matrix4(), R = new T.Matrix4().makeRotationY(Math.PI / 2), sp = this.gSp, go = this.gOff, base = Math.floor((camX - 130 - go) / sp) * sp; let near = [];
      for (let k = 0; k < this.gN; k++) { const x = base + k * sp + 15 + go; M.makeTranslation(x, 1.0, 0).multiply(R); this.frames.setMatrixAt(k, M);
        for (const [j, off] of [[0, 0.36], [1, -0.36]]) { M.makeTranslation(x + off, 1.0, 0).multiply(R); this.frameLines.setMatrixAt(k * 2 + j, M); } near.push(x); }
      this.frames.instanceMatrix.needsUpdate = true; this.frameLines.instanceMatrix.needsUpdate = true; this.stripM.color.copy(lane).multiplyScalar(1.6);
      this._nearG = near.reduce((a, b) => Math.abs(b - camX + 3) < Math.abs(a - camX + 3) ? b : a, near[0]); near.sort((a, b) => Math.abs(a - tx + 4) - Math.abs(b - tx + 4)); const fl = [this.flashA, this.flashB];
      for (let i = 0; i < 2; i++) { const x = near[i]; const d = Math.abs(x - (tx + this.trainLen * 0.3)); fl[i].position.set(x, 4, 4.5); fl[i].color.copy(lane); fl[i].intensity = 45 * Math.exp(-Math.pow((x - camX) / 9, 2)); } }
    if (!gOn) this._nearG = -1e5;
    if (this.photoU) { const pu = this.photoU; pu.uIllum.value.copy(this.illumC).lerp(this.rb ? new T.Color(1, 1, 1) : this.hint, laneK); pu.uSpeed.value = Math.min(1, u); pu.uSweepX.value = this._nearG ?? -1e5;
      const ik0 = (t - HY3.impact) / 600; pu.uFlash.value = ik0 > 0 && ik0 < 1 ? 1 - ik0 : 0; }
    /* anneaux d'énergie du couloir */
    this.ringM.opacity = laneK; this.rings.visible = laneK > 0.01; if (this.rings.visible) { const M = new T.Matrix4(), R = new T.Matrix4().makeRotationY(Math.PI / 2), sp = this.rSp, base = Math.floor((camX - 150) / sp) * sp;
      for (let k = 0; k < 10; k++) { const sc = 1 + 0.05 * Math.sin(t / 80 + k); M.makeTranslation(base + k * sp, 1.0, 0).multiply(R).multiply(new T.Matrix4().makeScale(sc, sc, sc)); this.rings.setMatrixAt(k, M); } this.rings.instanceMatrix.needsUpdate = true; }
    /* comète du meilleur rang */
    const ck = -1; this.comet.visible = this.cTrail.visible = false;
    if (this.comet.visible) { const k = clamp(ck), e = Math.pow(k, 1.35); const a = new T.Vector3(camX - 15, 5.2, 1.5), b = new T.Vector3(camX - 2.2, 1.9, 4.5); const pos = a.clone().lerp(b, e); pos.y += Math.sin(k * Math.PI) * 1.2;
      this.comet.position.copy(pos); const sc = 4 + 5 * k; this.cHead.scale.set(sc, sc, 1); this.cCore.scale.set(sc * 0.3, sc * 0.3, 1);
      const dir = new T.Vector3(1, -0.13, 0.1).normalize(); const Lt = 26 + 30 * k; const mid = pos.clone().addScaledVector(dir, -Lt / 2); const zAx = cam.position.clone().sub(mid); zAx.addScaledVector(dir, -zAx.dot(dir)).normalize(); const yAx = new T.Vector3().crossVectors(zAx, dir);
      this.cTrail.position.copy(mid); this.cTrail.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(dir, yAx, zAx)); this.cTrail.scale.set(Lt, 1.3 + 1.6 * k, 1); }
    /* freinage : gerbes d'étincelles sous les patins, lueur orange, lumière qui vacille */
    { const SP = this.sp, N = this.spN; let si = this._si || 0; this.spawnAcc += bk * dt * 2.6;
      while (this.spawnAcc >= 1) { this.spawnAcc -= 1; const bx = this.bogies[(Math.random() * this.bogies.length) | 0]; const wx = this.train.position.x + bx + (Math.random() - 0.5) * 1.4; if (Math.abs(wx - camX) > 20) continue;
        const o = si * 8; SP[o] = wx; SP[o + 1] = this.bogieY + 0.12; SP[o + 2] = 1.0 + Math.random() * 0.7; SP[o + 3] = -u * 0.12 + (Math.random() - 0.1) * 0.03; SP[o + 4] = 0.004 + Math.random() * 0.022; SP[o + 5] = 0.002 + Math.random() * 0.016; SP[o + 6] = 0; SP[o + 7] = 220 + Math.random() * 520; si = (si + 1) % N; }
      this._si = si; const pos = this.sparks.geometry.attributes.position.array, col = this.sparks.geometry.attributes.color.array, hp = this.sparkPts.geometry.attributes.position.array, hc = this.sparkPts.geometry.attributes.color.array; const camVx = -dCam / Math.max(1, dt);
      for (let i = 0; i < N; i++) { const o = i * 8, p = i * 6; if (SP[o + 7] < 0 || (SP[o + 6] += dt) > SP[o + 7]) { SP[o + 7] = -1; pos.fill(0, p, p + 6); col.fill(0, p, p + 6); hc.fill(0, i * 3, i * 3 + 3); continue; }
        SP[o + 4] -= 0.000032 * dt; SP[o] += SP[o + 3] * dt; SP[o + 1] += SP[o + 4] * dt; SP[o + 2] += SP[o + 5] * dt; if (SP[o + 1] < -0.7 && SP[o + 2] < 1.0) { SP[o + 1] = -0.7; SP[o + 4] *= -0.35; }
        const k = SP[o + 6] / SP[o + 7], f = 1 - k, rv = SP[o + 3] - camVx;
        pos[p] = SP[o] - rv * 40; pos[p + 1] = SP[o + 1] - SP[o + 4] * 40; pos[p + 2] = SP[o + 2] - SP[o + 5] * 40; hp[i * 3] = SP[o]; hp[i * 3 + 1] = SP[o + 1]; hp[i * 3 + 2] = SP[o + 2]; hc[i * 3] = 2.4 * f; hc[i * 3 + 1] = 1.5 * f * f; hc[i * 3 + 2] = 0.55 * f * f; pos[p + 3] = SP[o]; pos[p + 4] = SP[o + 1]; pos[p + 5] = SP[o + 2];
        col[p] = 1.2 * f * 0.4; col[p + 1] = 0.35 * f * 0.4; col[p + 2] = 0.05 * f * 0.4; col[p + 3] = 3.2 * f; col[p + 4] = 2.0 * f * f; col[p + 5] = 0.8 * f * f; }
      this.sparks.geometry.attributes.position.needsUpdate = true; this.sparks.geometry.attributes.color.needsUpdate = true; this.sparkPts.geometry.attributes.position.needsUpdate = true; this.sparkPts.geometry.attributes.color.needsUpdate = true;
      for (const h of this.hot) h.material.opacity = bk * (0.55 + 0.45 * Math.random());
      this.sparkL.position.set(camX + (Math.random() - 0.5) * 6, this.bogieY + 0.3, 2); this.sparkL.intensity = 38 * bk * (0.6 + 0.4 * Math.random()); }
    /* la porte : liseré à la couleur du rang, fente de lumière, ouverture qui inonde l'écran */
    if (this.real && !this._fkDone && t >= HY3.fk) { this._fkDone = true; this._fkRt = rt; this.setTint(this.real.hint, this.real.tier); }
    { const du = this.doorU, fkK = this.real && t > HY3.fk0 && t < HY3.fk ? (Math.sin(rt * 0.045) + Math.sin(rt * 0.13) > 0.4 ? 0.1 + 0.25 * Math.random() : 0.95) : 1, g = smooth((t - HY3.glow) / 250) * fkK * (this.real && t >= HY3.fk ? 1 + 1.4 * Math.max(0, 1 - (rt - this._fkRt) / 450) : 1), sm = smooth((t - HY3.seam) / 220), op = smooth((t - HY3.open0) / (HY3.impact - HY3.open0)); const gD = Math.max(g, 0.32 * smooth((t - 2500) / 700) * fkK); /* la porte choisie s'éclaire dès le ralentissement : on sait où la caméra va */ du.uGlow.value = gD; du.uSeam.value = sm; du.uOpen.value = op; du.uGap.value = this.door.model ? this.modelLeavesAt(smooth((t - HY3.open0 + 150) / 300)) : op; du.uT.value = rt / 1000;
      this.rays.scale.setScalar(0.25 + 1.1 * op); this.rays.visible = op > 0.001; this.doorLight.intensity = this.door.model ? 3 * g + 45 * op : 12 * g + 70 * op; this.train.updateMatrixWorld(); this.updateDoorPlus(t, camX, gD, sm, op, cam);
      if (g > 0) this.under.color.lerp(this.rb ? new T.Color(1, 1, 1) : this.hint, g * 0.6);
      /* tram : intérieur et phares prennent la couleur du rang (couloir, freinage, porte) et pulsent pendant le freinage */
      if (this.cabinU) { const tint = this.rb ? new T.Color(1, 1, 1) : this.hint, pk = Math.min(0.85, Math.max(laneK, bk, g)), pulse = 0.5 + 0.5 * Math.sin(rt / 55);
        this.cabinU.uCol.value.copy(this.cabinBase).lerp(tint, pk); this.cabinU.uK.value = 0.55 + 0.3 * laneK + 0.5 * bk * pulse + 0.25 * g;
        for (const h of this.heads) h.material.color.copy(this.headBase).lerp(tint, pk).multiplyScalar(2 + 1.4 * bk * pulse); } }
    if (this.photoU) this.photoU.uIllum.value.lerp(this.rb ? new T.Color(1, 1, 1) : this.hint, smooth((t - HY3.glow) / 300));
    this.updateSeasonFx(rt, dt, camX, smooth((t - HY3.open0) / (HY3.impact - HY3.open0)));

    const ik = (t - HY3.impact) / 650; let ex = smooth(t / 420) * 0.95; if (ik > 0) ex += 0.4 * Math.pow(Math.max(0, 1 - ik), 2); this.r.toneMappingExposure = ex;
    this.bloom.strength = 0.55 + laneK * 0.12 + (ik > 0 && ik < 1 ? (1 - ik) * 0.25 : 0) + 0.6 * (this._hit || 0);
    const pu = this.post.uniforms; pu.uCA.value = 0.0012 + Math.min(0.008, u * 0.0035) + laneK * 0.003; pu.uT.value = (t % 1000) / 1000; const fkF = this.real && this._fkDone ? 0.08 * Math.pow(Math.max(0, 1 - (rt - this._fkRt) / 380), 2) : 0; pu.uFlash.value = (ik > 0 && ik < 1 ? Math.pow(1 - ik, 3) * 0.12 : 0) + fkF;
    /* impact du coup sec : flou radial, aberration, éclair à la couleur du rang */
    { const rs = this._rush || 0, hi = this._hit || 0; pu.uRad.value = 0.12 * rs + 0.022 * hi * hi; pu.uCA.value += 0.02 * rs + 0.01 * hi; pu.uHit.value = 0.2 * Math.pow(hi, 2); pu.uHitC.value.copy(this.rb ? new T.Color(1, 1, 1) : this.hint); }
    if (render) this.comp.render();
  }
}

/* ── aperçu de l'éditeur : la planète d'une bannière qui tourne sur le ciel de sa galaxie ── */
export class PlanetPreview {
  static async create(cv, look) { try { const T = await loadThree(); return new PlanetPreview(T, cv, look); } catch (e) { console.warn(MOD, "aperçu 3D indisponible", e); return null; } }
  constructor(T, cv, look) {
    this.T = T; this.cv = cv; this.disp = []; this.tex = {};
    const r = this.r = new T.WebGLRenderer({ canvas: cv, antialias: true }); r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1; r.outputColorSpace = T.SRGBColorSpace;
    this.scene = new T.Scene(); this.cam = new T.PerspectiveCamera(40, 16 / 9, 1, 6000); this.cam.position.set(0, 0, 0); this.cam.lookAt(0, 0, -1);
    this.lightU = { uL: { value: new T.Vector3(-0.6, 0.45, 0.65).normalize() }, uT: { value: 0 } };
    this.size(); this._ro = new ResizeObserver(() => this.size()); this._ro.observe(cv);
    this.set(look);   /* image fixe (1.17.1) : rendue une fois par réglage, pas de boucle d'animation dans l'éditeur */
  }
  size() { const w = Math.max(10, this.cv.clientWidth), h = Math.max(10, this.cv.clientHeight); this.r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); this.render(); }
  render() { if (!this._q) this._q = requestAnimationFrame(() => { this._q = null; if (this.planet) this.frame(4200); }); }
  async loadTex(url, key) { if (!url) return null; if (this.tex[key]?.url === url) return this.tex[key].t; const t = await new Promise(res => new this.T.TextureLoader().load(absUrl(url), x => { x.colorSpace = this.T.SRGBColorSpace; res(x); }, undefined, () => res(null))); if (t) { this.disp.push(t); this.tex[key] = { url, t }; } return t; }
  async set(look) {
    const T = this.T; const tok = this._tok = {}; const p = look?.planet || {}; const g = look?.galaxy || {};
    const ice = Number(p.kind) === 5 ? await this.loadTex(asset("t3Planet"), "ice") : null; const img = p.img ? await this.loadTex(p.img, "img") : null; if (tok !== this._tok) return;
    for (const o of [this.sky, this.planet]) if (o) this.scene.remove(o);
    const kit = { T, mat: m => (this.disp.push(m), m), geo: x => (this.disp.push(x), x) };
    this.skyU = skyUniforms(T, g, new T.Color("#9fd2ff")); this.sky = new T.Mesh(kit.geo(new T.SphereGeometry(2400, 48, 24)), kit.mat(new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, uniforms: this.skyU, vertexShader: SKY_VS, fragmentShader: SKY_FS() }))); this.scene.add(this.sky);
    this.planet = new T.Group(); this.planet.rotation.z = -0.25; this.planet.add(buildPlanetGroup(kit, p, this.lightU, { ice, img })); this.planet.position.set(110, -30, -880); this.scene.add(this.planet); this.render();
  }
  frame(t) { if (this.planet) this.planet.rotation.y = t * 0.00012; this.lightU.uT.value = t * 20; if (this.skyU) this.skyU.uShift.value = t * 0.000004; this.r.render(this.scene, this.cam); }
  destroy() { this.on = false; cancelAnimationFrame(this._q); this._ro?.disconnect(); for (const d of this.disp) { try { d.dispose(); } catch (e) {} } try { this.r.dispose(); this.r.forceContextLoss(); } catch (e) {} }
}

/* ── aperçu de l'éditeur : le tram avec sa livrée (image fixe, rendue à chaque changement de couleur) ── */
export class TrainPreview {
  static async create(cv, skin) { try { const T = await loadThree(); const src = await loadTram(); if (!src) return null; return new TrainPreview(T, cv, src, skin); } catch (e) { console.warn(MOD, "aperçu du tram indisponible", e); return null; } }
  constructor(T, cv, src, skin) {
    this.T = T; this.cv = cv; this.src = src; this.disp = []; this.own = [];
    const r = this.r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); r.setPixelRatio(Math.min(1.5, devicePixelRatio || 1)); r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.outputColorSpace = T.SRGBColorSpace;
    const s = this.scene = new T.Scene(); s.background = new T.Color("#070b16");
    if (src.hdr) { const pm = new T.PMREMGenerator(r); this.env = pm.fromEquirectangular(src.hdr).texture; pm.dispose(); this.disp.push(this.env); }
    s.add(new T.HemisphereLight("#8fa8ff", "#06080f", 0.9)); const key = new T.DirectionalLight("#ffffff", 1.6); key.position.set(-6, 9, 8); s.add(key);
    /* le modèle : nez vers -X comme dans l'intro ; on cadre la première voiture de trois quarts */
    const m = this.model = src.scene.clone(true); m.rotation.y = -Math.PI / 2; m.scale.setScalar(0.8); m.position.set(0.48, -0.8, 0); s.add(m);
    for (const n of m.children.slice()) if (/^tram_02_|^tram_railing/.test(n.name)) n.visible = false;
    this.trimG = new T.Group(); s.add(this.trimG);
    this.cam = new T.PerspectiveCamera(32, 16 / 9, 0.1, 200); this.cam.position.set(-13.5, 3.2, 11.5); this.cam.lookAt(-6.5, 1.0, 0);
    this.size(); this._ro = new ResizeObserver(() => this.size()); this._ro.observe(cv); this.set(skin);
  }
  size() { const w = Math.max(10, this.cv.clientWidth), h = Math.max(10, this.cv.clientHeight); this.r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); this.render(); }
  set(skin) { const T = this.T; for (const d of this.own) { try { d.dispose(); } catch (e) {} } this.own = [];
    dressTram(T, this.model, skin || {}, this.env || null, this.own);
    this.trimG.clear(); addTramTrim(T, this.trimG, skin || {}, { x0: -14.3, x1: 0.3, yBelt: 0.0, yRoof: 1.976, z: 1.215 }, this.own);
    this.render(); }
  render() { if (!this._q) this._q = requestAnimationFrame(() => { this._q = null; this.r.render(this.scene, this.cam); }); }
  destroy() { cancelAnimationFrame(this._q); this._ro?.disconnect(); for (const d of [...this.disp, ...this.own]) { try { d.dispose(); } catch (e) {} } try { this.r.dispose(); this.r.forceContextLoss(); } catch (e) {} }
}
