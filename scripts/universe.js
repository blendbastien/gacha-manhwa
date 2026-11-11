/* Gacha Manhwa — Univers : galaxies (ciel) et planètes (une par bannière), habillages du train (saisons, événements).
 * La saison et l'événement viennent de Manhwa Sheet (MANHWA.season) : tout est relié (Catalogue, gacha). */
import { MOD } from "./data.js";

/* ── galaxies : couleurs de la nébuleuse, bande lactée, densité d'étoiles, reflet des bords métalliques ── */
export const GALAXY_PRESETS = {
  astrale: { name: "Voie astrale", a: "#5d3895", b: "#21659e", c: "#ad458b", band: "#6f6995", stars: 1, metal: "#bcefff" },
  pourpre: { name: "Nébuleuse pourpre", a: "#8a1f6e", b: "#4b1d8f", c: "#d0365e", band: "#6a3a6a", stars: 0.9, metal: "#ff8ae0" },
  aurore: { name: "Aurore verte", a: "#167a66", b: "#1d6e9e", c: "#4f9e3a", band: "#3f7a6c", stars: 1, metal: "#7dffcf" },
  abime: { name: "Abîme", a: "#1c1a2e", b: "#14243a", c: "#3a1630", band: "#2a2a3a", stars: 0.45, metal: "#9aa8c8" },
  or: { name: "Or céleste", a: "#8a6418", b: "#4a3270", c: "#b8742a", band: "#8a7650", stars: 1.1, metal: "#ffd36b" },
  givre: { name: "Givre", a: "#2a6e9e", b: "#1f4a8a", c: "#8ab8e0", band: "#6f8fb5", stars: 1.25, metal: "#cff4ff" }
};
/* ── planètes : type de surface (0 bandes gazeuses, 1 océans et continents, 2 fissures de lave, 3 roche cratérisée, 4 cristal, 5 glace du pack) ── */
export const PLANET_PRESETS = {
  glacia: { label: "Glacia (glace, lune)", kind: 5, c1: "#2a5a8a", c2: "#a0ddff", c3: "#e8f6ff", atm: "#a0ddff", ring: false, ringColor: "#e1daf9", moon: true, clouds: 0.2 },
  geante: { label: "Géante bleue à anneau", kind: 0, c1: "#385986", c2: "#769ece", c3: "#ad95c4", atm: "#89d3ff", ring: true, ringColor: "#e1daf9", moon: false, clouds: 0 },
  volcan: { label: "Volcanique", kind: 2, c1: "#1e100c", c2: "#4a2216", c3: "#ff6a1a", atm: "#ff8a4a", ring: false, ringColor: "#ffb07a", moon: false, clouds: 0 },
  desert: { label: "Désertique", kind: 0, c1: "#8a4a1a", c2: "#d99a4a", c3: "#f2d09a", atm: "#ffc07a", ring: false, ringColor: "#f2d09a", moon: true, clouds: 0 },
  ocean: { label: "Océanique", kind: 1, c1: "#0a2a6a", c2: "#2a74c8", c3: "#5a8a4a", atm: "#7fc8ff", ring: false, ringColor: "#cfe8ff", moon: true, clouds: 0.75 },
  jungle: { label: "Jungle", kind: 1, c1: "#0c3a44", c2: "#1d6e5a", c3: "#3f8a2a", atm: "#9fffc8", ring: false, ringColor: "#cfffe0", moon: false, clouds: 0.55 },
  cristal: { label: "Cristal", kind: 4, c1: "#2a0a5a", c2: "#8a4aff", c3: "#ffc0ff", atm: "#c38bff", ring: true, ringColor: "#e2b8ff", moon: false, clouds: 0 },
  aurum: { label: "Géante d'or à anneau", kind: 0, c1: "#5a3a0c", c2: "#c99a3a", c3: "#fff0b0", atm: "#ffe08a", ring: true, ringColor: "#ffe08a", moon: false, clouds: 0 },
  morte: { label: "Lune morte", kind: 3, c1: "#2a2a2e", c2: "#6a6a70", c3: "#b0b0b8", atm: "#8a9ab8", ring: false, ringColor: "#b0b0b8", moon: false, clouds: 0 },
  abysse: { label: "Abyssale", kind: 2, c1: "#050208", c2: "#160814", c3: "#ff1a3a", atm: "#ff3a6a", ring: false, ringColor: "#ff6a8a", moon: true, clouds: 0 }
};
const G = (id, preset, name) => ({ id, name: name || GALAXY_PRESETS[preset].name, preset, ...GALAXY_PRESETS[preset] });
const P = (id, name, preset, galaxy, extra = {}) => { const { label, ...p } = PLANET_PRESETS[preset]; return { id, name, preset, galaxy, size: 1, img: "", ...p, ...extra }; };
export const DEFAULT_UNIVERSE = {
  galaxies: [G("g-astrale", "astrale"), G("g-pourpre", "pourpre"), G("g-aurore", "aurore"), G("g-abime", "abime"), G("g-or", "or"), G("g-givre", "givre")],
  planets: [P("p-glacia", "Glacia", "glacia", "g-astrale"), P("p-azur", "Azurion", "geante", "g-astrale"), P("p-pyros", "Pyros", "volcan", "g-pourpre"), P("p-sahrim", "Sahrim", "desert", "g-or"),
    P("p-thalassa", "Thalassa", "ocean", "g-aurore"), P("p-sylvara", "Sylvara", "jungle", "g-aurore"), P("p-amethys", "Améthys", "cristal", "g-pourpre"), P("p-aurum", "Aurum", "aurum", "g-or"),
    P("p-necra", "Nécra", "morte", "g-abime"), P("p-umbra", "Umbra", "abysse", "g-abime")]
};
export function universe() { let u = null; try { u = game.settings.get(MOD, "universe"); } catch (e) {} if (!u?.galaxies?.length || !u?.planets?.length) u = foundry.utils.deepClone(DEFAULT_UNIVERSE); return u; }
export const planetById = (id, u = universe()) => u.planets.find(p => p.id === id) || u.planets[0];
export const galaxyOf = (p, u = universe()) => u.galaxies.find(g => g.id === p?.galaxy) || u.galaxies[0];

/* ── habillages du train ── */
export const SEASON_SKINS = {
  spring: { name: "Printemps", lights: "#ffb3de", trim: "#ffd36b", hull: "#ffe6f2", hullK: 0.12, frost: 0, fx: "petals", colors: ["#ffc0dd", "#ffd6ea", "#ff8ac0", "#ffffff"] },
  summer: { name: "Été", lights: "#ffd06b", trim: "#ff9a3c", hull: "#fff0c8", hullK: 0.1, frost: 0, fx: "motes", colors: ["#ffe08a", "#ffd06b", "#fff6d8"] },
  autumn: { name: "Automne", lights: "#ffb347", trim: "#d0682a", hull: "#ffcf9a", hullK: 0.14, frost: 0, fx: "leaves", colors: ["#e8a03a", "#c8582a", "#f0c060", "#9a4a1a"] },
  winter: { name: "Hiver", lights: "#bfefff", trim: "#e6f8ff", hull: "#dff2ff", hullK: 0.08, frost: 0.3, fx: "snow", colors: ["#ffffff", "#e6f8ff", "#bfe8ff"] }
};
/** habillage à utiliser : réglage de la bannière, sinon réglage général (« auto » = saison et événement de Manhwa Sheet) */
export function trainSkin(b) {
  let mode = b?.skin || ""; if (!mode) { try { mode = game.settings.get(MOD, "trainSkin") || "auto"; } catch (e) { mode = "auto"; } }
  if (mode === "classic") return null;
  const ms = (() => { try { return globalThis.MANHWA?.season?.() || null; } catch (e) { return null; } })(); const evs = globalThis.MANHWA?.seasonEvents || {};
  const fromEvent = ev => ev ? { key: ev.key, name: ev.name, lights: ev.colors[0], trim: ev.colors[1] || ev.colors[0], hull: "#ffffff", hullK: 0, frost: ev.fx === "snow" ? 0.35 : 0, fx: ev.fx, colors: ev.colors } : null;
  if (mode === "auto") { if (!ms) return null; return fromEvent(ms.eventInfo) || { key: ms.key, ...SEASON_SKINS[ms.key] }; }
  if (SEASON_SKINS[mode]) return { key: mode, ...SEASON_SKINS[mode] };
  return fromEvent(evs[mode]) || null;
}
/** couleurs du tram (réglage général « tramColors ») : suivre l'habillage, ou couleurs personnalisées qui remplacent celles de l'habillage */
export const TRAM_COLOR_DEFAULTS = { mode: "skin", hull: "#ffffff", hullK: 0, trim: "#ffd88a", lights: "#ffe2b8", glass: "#0a0d14", frost: 0 };
export function tramColors() { let c = {}; try { c = game.settings.get(MOD, "tramColors") || {}; } catch (e) {} return { ...TRAM_COLOR_DEFAULTS, ...c }; }
function withTramColors(skin) { const c = tramColors(); if (c.mode !== "custom") return skin;
  return { ...(skin || { key: "custom", name: "Personnalisé" }), hull: c.hull, hullK: Number(c.hullK) || 0, trim: c.trim, lights: c.lights, glass: c.glass, frost: Number(c.frost) || 0 }; }
/** tout ce que la 3D doit savoir pour une bannière */
export function lookFor(b) {
  const u = universe(); const p = planetById(b?.planet, u); const g = galaxyOf(p, u);
  return { planet: p, galaxy: g, skin: withTramColors(trainSkin(b)) };
}
/** choix proposés pour l'habillage (réglage général ou bannière) */
export function skinChoices() {
  const evs = Object.values(globalThis.MANHWA?.seasonEvents || {});
  return [["auto", "Automatique (saison et événement de Manhwa Sheet)"], ["classic", "Classique (sans habillage)"], ...Object.entries(SEASON_SKINS).map(([k, s]) => [k, `Saison : ${s.name}`]), ...evs.map(e => [e.key, `Événement : ${e.name}`])];
}
