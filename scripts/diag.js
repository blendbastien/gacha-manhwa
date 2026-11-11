/* Gacha Manhwa — diagnostic : vérifie en un clic ce qui fait souvent « que ça ne marche pas » chez un joueur
 * (pack introuvable, fichiers manquants, 3D indisponible, son bloqué, MJ absent, versions). */
import { MOD, CAT, esc, setting, ASSETS, asset, absUrl, resolveAssets } from "./data.js";
import { ac, load, outLatency } from "./audio.js";
const { ApplicationV2 } = foundry.applications.api;

const OK = "ok", WARN = "warn", KO = "ko";
async function head(u) { try { const r = await fetch(absUrl(u), { method: "HEAD", cache: "no-store" }); return r.ok; } catch (e) { return false; } }
async function pool(list, n, fn) { const out = new Array(list.length); let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < list.length) { const k = i++; out[k] = await fn(list[k]); } })); return out; }

export async function runDiag() {
  const R = []; const add = (s, t, d = "") => R.push({ s, t, d });
  /* versions */
  const sys = game.system; const need = game.modules.get(MOD)?.relationships?.systems?.first?.()?.compatibility?.minimum || "1.16.0";
  add(sys.id === "manhwa-sheet" ? (foundry.utils.isNewerVersion(need, sys.version) ? WARN : OK) : KO, "Système", `${sys.title || sys.id} ${sys.version}${sys.id === "manhwa-sheet" && foundry.utils.isNewerVersion(need, sys.version) ? ` — ${need} minimum conseillé` : ""}`);
  add(OK, "Foundry / module", `Foundry ${game.version} · Appel des Étoiles ${game.modules.get(MOD)?.version}`);
  const cat = game.modules.get(CAT); add(cat?.active ? OK : KO, "Catalogue", cat?.active ? `actif (${cat.version})` : "module Catalogue inactif : les bannières n'ont plus d'objets");
  /* MJ */
  const gm = game.users.activeGM ?? game.users.find(u => u.isGM && u.active); add(gm ? OK : WARN, "MJ connecté", gm ? gm.name : "aucun : les synthèses et achats passent par le MJ");
  /* pack */
  const base = String(setting("assetPath") || ""); await resolveAssets(true);
  if (!base) add(KO, "Pack d'assets", "aucun dossier réglé");
  else {
    const keys = Object.keys(ASSETS); const res = await pool(keys, 8, async k => [k, await head(asset(k))]); const miss = res.filter(x => !x[1]).map(x => ASSETS[x[0]]);
    const grp = p => miss.filter(m => m.startsWith(p)).length; const tot = p => Object.values(ASSETS).filter(v => v.startsWith(p)).length;
    add(miss.length === keys.length ? KO : miss.length ? WARN : OK, "Pack d'assets", `« ${esc(base)} » : ${keys.length - miss.length} / ${keys.length} fichiers trouvés`);
    for (const [p, n] of [["snd/", "Sons"], ["vid/", "Vidéos"], ["img/", "Images"], ["3d/", "3D (tram, train, planète, éclairage)"]]) { const m = grp(p); add(m ? (m === tot(p) ? KO : WARN) : OK, n, m ? `${m} manquant(s) : ${miss.filter(x => x.startsWith(p)).slice(0, 8).map(esc).join(", ")}${m > 8 ? "…" : ""}` : `${tot(p)} / ${tot(p)}`); }
  }
  /* 3D */
  const on3d = setting("anim3d") !== false; let gl2 = false; try { gl2 = !!document.createElement("canvas").getContext("webgl2"); } catch (e) {}
  let three = false; if (gl2) { try { await (await import("./hyper3d.js")).loadThree(); three = true; } catch (e) {} }
  add(!on3d ? WARN : gl2 && three ? OK : KO, "Animation 3D", !on3d ? "désactivée dans les réglages (version 2D)" : !gl2 ? "WebGL 2 indisponible : la version 2D sera jouée (accélération matérielle du navigateur ?)" : three ? "WebGL 2 et three.js prêts" : "three.js n'a pas pu se charger");
  if (on3d && gl2 && three) { const tOn = setting("tram3d") !== false; let ok = false, t0 = performance.now(); if (tOn) { try { ok = !!(await (await import("./hyper3d.js")).loadTram()); } catch (e) {} }
    add(!tOn ? WARN : ok ? OK : WARN, "Tram 3D", !tOn ? "désactivé dans les réglages (train dessiné)" : ok ? `chargé (${Math.round(performance.now() - t0)} ms)` : "introuvable dans le pack (3d/tram.glb) : le train de repli est utilisé"); }
  /* son */
  const c = ac(); const buf = c ? await load("flip") : null; const m = game.settings.get(MOD, "muted");
  add(!c ? KO : !buf ? WARN : m ? WARN : OK, "Son", !c ? "Web Audio indisponible" : !buf ? "impossible de décoder un son du pack" : `${m ? "coupé (bouton son) · " : ""}musique ${setting("musicVol")} % · effets ${setting("sfxVol")} % · état ${c.state}`);
  const lat = Math.round(outLatency() * 1000); add(lat > 150 ? WARN : OK, "Latence audio", `${lat} ms${lat > 150 ? " (casque Bluetooth ? compensée automatiquement)" : ""}`);
  /* écran */
  const ui = (() => { try { return game.settings.get("core", "uiConfig")?.uiScale; } catch (e) { return null; } })();
  const small = innerWidth < 1280 || innerHeight < 700; add(small ? WARN : OK, "Écran", `${innerWidth} × ${innerHeight} px · zoom ${Math.round(devicePixelRatio * 100)} %${ui ? ` · échelle de l'interface ${ui}` : ""}${small ? " — petit espace : les fenêtres se compactent" : ""}`);
  return R;
}

export class DiagApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = { id: "gm-diag", classes: ["gm-app", "gm-diag"], window: { title: "Appel des Étoiles — diagnostic", icon: "fa-solid fa-stethoscope", resizable: true }, position: { width: 620, height: 560 } };
  constructor(o) { super(o); this.res = null; }
  async _renderHTML() {
    if (!this.res) { runDiag().then(r => { this.res = r; this.render(); }); return `<div class="gd"><p class="wait"><i class="fa-solid fa-spinner fa-spin"></i> Vérification en cours…</p></div>`; }
    const ic = { ok: "fa-circle-check", warn: "fa-triangle-exclamation", ko: "fa-circle-xmark" };
    const ko = this.res.filter(r => r.s === KO).length, wa = this.res.filter(r => r.s === WARN).length;
    return `<div class="gd"><p class="sum ${ko ? "ko" : wa ? "warn" : "ok"}">${ko ? `${ko} problème(s) bloquant(s)` : wa ? `${wa} point(s) à surveiller` : "Tout est en ordre."}</p>
      <ul>${this.res.map(r => `<li class="${r.s}"><i class="fa-solid ${ic[r.s]}"></i><b>${esc(r.t)}</b><span>${r.d}</span></li>`).join("")}</ul>
      <footer><button data-a="again"><i class="fa-solid fa-rotate"></i> Relancer</button><button data-a="copy"><i class="fa-solid fa-copy"></i> Copier le rapport</button></footer></div>`;
  }
  _replaceHTML(html, c) { c.innerHTML = html; c.querySelectorAll("[data-a]").forEach(b => b.addEventListener("click", async () => {
    if (b.dataset.a === "again") { this.res = null; return this.render(); }
    if (b.dataset.a === "copy") { const t = this.res.map(r => `[${r.s.toUpperCase()}] ${r.t} : ${r.d.replace(/<[^>]+>/g, "")}`).join("\n"); try { await navigator.clipboard.writeText(t); ui.notifications.info("Rapport copié."); } catch (e) { ui.notifications.warn("Copie impossible."); } }
  })); }
}
