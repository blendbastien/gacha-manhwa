/* Gacha Manhwa — point d'entrée : réglages, relais MJ, onglet du Menu Manhwa, bouton de scène, API. */
import { MOD, CAT, absUrl, img, SHOP_GREETING, TICKETS, applyAssetVars, resolveAssets, gi, esc, setting, banners, newBanner, bannerLive, newShop, shopCfg, walletOf, fragName, catDB, rankColor, timeLeft, DEFAULT_FRAG, loadHdIcons, loadVis } from "./data.js";
import { initSocket, onGm, gmDo } from "./engine.js";
import { WarpApp, HistoryApp, demoMenu, bgOf, thumbOf } from "./warp.js";
import { Scene, demoShow } from "./scene.js";
import { ShopApp } from "./shop.js";
import "./lobby.js";
import { applyVolumes } from "./audio.js";
import { DiagApp } from "./diag.js";
import { EditorApp } from "./editor.js";

class EditorMenu extends foundry.applications.api.ApplicationV2 { async render() { EditorApp.open(); return this; } }
class WarpMenu extends foundry.applications.api.ApplicationV2 { async render() { WarpApp.open(); return this; } }

Hooks.once("init", () => {
  const W = (k, type, def, extra = {}) => game.settings.register(MOD, k, { scope: "world", config: false, type, default: def, ...extra });
  W("banners", Array, []); W("shop", Object, {}); W("history", Object, {});
  W("universe", Object, {}); W("trainSkin", String, "auto"); W("tramColors", Object, {}); W("fragNames", Object, {}); W("fragValues", Object, DEFAULT_FRAG); W("seeded", Boolean, false);
  W("climax", Object, {}); W("migV", Number, 0); W("catalogueUsers", Object, { all: true, ids: [] }, { onChange: () => refreshMenu() });
  game.settings.register(MOD, "menuIcons", { name: "Icônes du pack dans le Menu Manhwa", hint: "Remplace les icônes des onglets du Menu par celles du pack d'images (si le pack est présent).", scope: "world", config: true, type: Boolean, default: true, onChange: () => refreshMenu() });
  game.settings.registerMenu(MOD, "openMenu", { name: "Appel des Étoiles", label: "Ouvrir", hint: "Ouvre le Synthétiseur (page des bannières).", icon: "fa-solid fa-wand-magic-sparkles", type: WarpMenu, restricted: false });
  game.settings.registerMenu(MOD, "editorMenu", { name: "Éditeur des bannières", label: "Éditer", hint: "Créer et régler les bannières, leurs images, leurs lots, leurs taux, la pitié, les fragments et le dossier des sons et vidéos.", icon: "fa-solid fa-pen-ruler", type: EditorMenu, restricted: true });
  game.settings.register(MOD, "assetPath", { name: "Dossier du pack d'assets", hint: "Dossier de ta bibliothèque de fichiers qui contient snd/, vid/ et img/ (sons, vidéos et images).", scope: "world", config: true, type: String, default: "gacha-manhwa-assets", filePicker: "folder", onChange: () => { resolveAssets(true); applyAssetVars(); } });
  game.settings.register(MOD, "lobbyOn", { name: "Salle de Synthèse (lobby)", hint: "Avant une synthèse, le lanceur attend que les autres joueurs rejoignent pour regarder.", scope: "world", config: true, type: Boolean, default: true });
  game.settings.register(MOD, "lobbyTimeout", { name: "Lancement automatique du lobby (secondes)", hint: "La synthèse part toute seule après ce délai. 0 = le lanceur décide.", scope: "world", config: true, type: Number, range: { min: 0, max: 180, step: 5 }, default: 30 });
  game.settings.register(MOD, "lobbyAccept", { name: "Spectateurs de mes synthèses", hint: "Qui peut rejoindre ta Salle de Synthèse.", scope: "client", config: true, type: String, choices: { all: "Tout le monde, automatiquement", friends: "Mon groupe et mes amis seulement", manual: "Je valide chaque spectateur", solo: "Personne (synthétiser seul)" }, default: "all" });
  game.settings.register(MOD, "goldKey", { name: "Ressource payée (Gold)", hint: "Clé ou nom de la ressource de la fiche Manhwa utilisée pour payer. Vide = Gold.", scope: "world", config: true, type: String, default: "" });
  game.settings.register(MOD, "chat", { name: "Message dans le chat à chaque synthèse", scope: "world", config: true, type: Boolean, default: true });
  game.settings.registerMenu(MOD, "diag", { name: "Diagnostic", label: "Lancer le diagnostic", hint: "Vérifie le pack (sons, vidéos, images, 3D), la 3D, le son, le MJ et les versions. À lancer par un joueur chez qui « ça ne marche pas ».", icon: "fa-solid fa-stethoscope", type: DiagApp, restricted: false });
  game.settings.register(MOD, "fakeRate", { name: "Fausse alerte de rareté (%)", hint: "Sur un tirage S, SS ou SSS : chance que la porte s'allume d'abord à la couleur d'un rang plus bas, grésille, puis bascule sur la vraie couleur (version 3D).", scope: "world", config: true, type: Number, range: { min: 0, max: 100, step: 5 }, default: 30 });
  game.settings.register(MOD, "announceRate", { name: "Seuil de la grande annonce (%)", hint: "Un objet dont le rang a un taux inférieur ou égal déclenche une annonce au centre de l'écran (module Notifications Manhwa).", scope: "world", config: true, type: Number, default: 0.5 });
  game.settings.register(MOD, "historyMax", { name: "Synthèses gardées par joueur", scope: "world", config: true, type: Number, default: 300 });
  game.settings.register(MOD, "watch", { name: "Synthèses des autres joueurs", hint: "Quand un autre joueur prépare une synthèse : rejoindre sa Salle de Synthèse pour regarder.", scope: "client", config: true, type: String, choices: { ask: "Me proposer de rejoindre", always: "Rejoindre automatiquement", never: "Ne rien afficher" }, default: "ask" });
  game.settings.register(MOD, "anim3d", { name: "Ouverture en 3D (Hyperligne)", hint: "Décocher si l'ordinateur peine : une version 2D plus légère est utilisée.", scope: "client", config: true, type: Boolean, default: true });
  game.settings.register(MOD, "hdIcons", { name: "Icônes haute définition", hint: "Icônes du Catalogue agrandies par IA (dossier catalogue-icones/armure2-hd-x4 de la bibliothèque). « Non » garde les icônes d’origine.", scope: "world", config: true, type: Number, choices: { 0: "Non", 2: "×2", 3: "×3", 4: "×4" }, default: 4, onChange: () => loadHdIcons() });
  game.settings.register(MOD, "tram3d", { name: "Tram détaillé dans l'ouverture 3D", hint: "Le vrai tram du pack (modèle 3D, environ 6 Mo, chargé une fois par session). Décocher sur un ordinateur modeste : le train dessiné reprend sa place.", scope: "client", config: true, type: Boolean, default: true });
  game.settings.register(MOD, "musicVol", { name: "Volume de la musique", scope: "client", config: true, type: Number, range: { min: 0, max: 100, step: 5 }, default: 60, onChange: () => applyVolumes() });
  game.settings.register(MOD, "sfxVol", { name: "Volume des effets", scope: "client", config: true, type: Number, range: { min: 0, max: 100, step: 5 }, default: 85, onChange: () => applyVolumes() });
  game.settings.register(MOD, "muted", { scope: "client", config: false, type: Boolean, default: false });

  /* trois onglets dans le Menu de la fiche Manhwa : Appel des Étoiles, Boutique stellaire, Catalogue (ils ouvrent aussi leur fenêtre) */
  const act = (app, a, el) => { if (a === "gOpen") WarpApp.open({ banner: el.dataset.id, actor: app.actor?.id }); if (a === "gShop") ShopApp.open(app.actor?.id); if (a === "gHist") HistoryApp.open(); if (a === "gCat") openCatalogue(); };
  /* la fenêtre ouverte depuis le Menu prend sa place (Manhwa Sheet ≥ 1.18 ajoute le bouton « ‹ Menu ») */
  const place = (w, pos) => whenRendered(w).then(() => { if (pos) w.setPosition(fitPos(pos)); return w; });
  const openWarp = ({ actor, pos } = {}) => place(WarpApp.open({ actor: actor?.id }), pos);
  const openShop = ({ actor, pos } = {}) => place(ShopApp.open(actor?.id), pos);
  const openCat = async ({ pos } = {}) => { const api = game.modules.get(CAT)?.api; if (!api?.open) { ui.notifications.warn("Le module Catalogue n'est pas activé."); return null; } const r = await api.open(); const w = (r && typeof r.render === "function" ? r : null) || foundry.applications.instances.get("lh-catalogue") || [...foundry.applications.instances.values()].find(a => a.options?.classes?.includes("bq-frame")); return w ? place(w, pos) : null; };   /* 1.19 : la fenêtre rendue par api.open() (avant : pas encore enregistrée → le Menu se rouvrait derrière) */
  const tabImg = k => () => setting("menuIcons") && document.body.classList.contains("gm-img") ? absUrl(img(k)) : "";
  globalThis.MANHWA?.registerMenuTab?.({ key: "gacha", group: "orbis", name: "Appel des Étoiles", icon: "fa-wand-magic-sparkles", color: "#f5c518", img: tabImg("embWarp"), act, open: openWarp,
    render: app => { const L = banners().filter(b => bannerLive(b)); return `<div class="gm-tab"><div class="hero"><button data-mact="gOpen" class="big warp">${gi("fa-wand-magic-sparkles", "embWarp", "bigic")}<b>Ouvrir le Synthétiseur</b><small>${L.length} bannière(s) ouverte(s)</small></button><button data-mact="gHist" class="big hist">${gi("fa-clock-rotate-left", "icHistory", "bigic")}<b>Historique</b><small>Les synthèses de chacun</small></button></div>
      <div class="list">${L.map(b => `<a data-mact="gOpen" data-id="${b.id}" style="--b1:${esc(b.color)};--b2:${esc(b.color2)};--img:${thumbOf(b)}"><span>${esc(b.tag)}</span><b>${esc(b.name)}</b>${b.end ? `<em>${esc(timeLeft(b))}</em>` : ""}</a>`).join("") || '<p class="none">Aucune bannière ouverte pour le moment.</p>'}</div></div>`; } });
  globalThis.MANHWA?.registerMenuTab?.({ key: "gshop", group: "orbis", name: "Boutique stellaire", icon: "fa-store", color: "#e9cf8e", img: tabImg("icShop"), act, open: openShop,
    render: app => { const cfg = shopCfg(); const w = walletOf(app.actor); return `<div class="gm-tab"><div class="hero"><button data-mact="gShop" class="big shop">${gi("fa-store", "embExchange", "bigic")}<b>Ouvrir la Boutique stellaire</b><small>${esc(fragName("stellar"))} : ${w.stellar} · ${esc(fragName("astral"))} : ${w.astral}</small></button></div>
      <p class="gm-quote">${esc(SHOP_GREETING)}</p>
      <div class="list">${cfg.sections.map(sc => `<a data-mact="gShop" style="--b1:#3a2a14;--b2:#1a1208;--img:none"><span><i class="fa-solid ${esc(sc.icon || "fa-star")}"></i></span><b>${esc(sc.name)}</b><em>${(sc.offers || []).length} offre(s)</em></a>`).join("")}</div></div>`; } });
  globalThis.MANHWA?.registerMenuTab?.({ key: "gcat", group: "orbis", name: "Boutique", icon: "fa-store", color: "#9fd2ff", img: tabImg("icBook"), act, open: openCat,
    visible: u => { const c = setting("catalogueUsers") || {}; return u.isGM || c.all !== false || (c.ids || []).includes(u.id); },
    render: () => game.modules.get(CAT)?.active ? `<div class="gm-tab"><div class="hero"><button data-mact="gCat" class="big cat">${gi("fa-book-open", "icBook", "bigic")}<b>Ouvrir la Boutique</b><small>Les rayons du Système</small></button></div></div>` : '<p class="none">Le module Catalogue n\'est pas activé.</p>' });
});

/* icônes du pack pour les onglets du Menu (les onglets du système compris) ; le MJ peut toujours mettre sa propre image dans les réglages du Menu */
const MENU_IMG = { gacha: "embWarp", trade: "icTrade", guild: "icGuild", places: "icStars", notes: "icNotes", settings: "icSettings", gshop: "icShop", gcat: "icBook", news: "icAnnounce", letters: "icHistory", friends: "embFriend", mail: "icChat", party: "embGroup", quests: "icExchange" };
function refreshMenu() { for (const [k, key] of Object.entries(MENU_IMG)) globalThis.MANHWA?.setMenuTabImage?.(k, () => setting("menuIcons") && document.body.classList.contains("gm-img") && img(key) ? absUrl(img(key)) : ""); }

/* cliquer sur l'onglet Invocation / Échange du Menu ouvre directement la fenêtre */
Hooks.on("renderMenuApp", app => { if (globalThis.MANHWA?.attachBack) return; /* Manhwa Sheet ≥ 1.18 : géré par le Menu */ const t = app.tab; if ((t === "gacha" || t === "gshop" || t === "gcat") && app._gmLast !== t) { if (t === "gacha") WarpApp.open({ actor: app.actor?.id }); else if (t === "gshop") ShopApp.open(app.actor?.id); else openCatalogue(); } app._gmLast = t; });
function openCatalogue() { const api = game.modules.get(CAT)?.api; if (!api?.open) return ui.notifications.warn("Le module Catalogue n'est pas activé."); api.open(); }

Hooks.on("getSceneControlButtons", controls => {
  try { const tools = controls.tokens?.tools ?? controls.find?.(c => c.name === "token")?.tools; const tool = { name: "gacha", title: "Synthétiseur — Appel des Étoiles", icon: "fa-solid fa-wand-magic-sparkles", button: true, order: 50, visible: true, onChange: () => WarpApp.open(), onClick: () => WarpApp.open() };
    if (Array.isArray(tools)) tools.push(tool); else if (tools) tools.gacha = tool; } catch (e) { console.warn(MOD, e); }
});

onGm("clearHistory", async ({ user }, userId) => { if (!game.users.get(userId)?.isGM) return { ok: false, msg: "Réservé au MJ." }; const h = foundry.utils.deepClone(setting("history") || {}); delete h[user]; await game.settings.set(MOD, "history", h); return { ok: true }; });

Hooks.once("ready", async () => {
  loadHdIcons(); await loadVis();
  initSocket(); applyAssetVars(); refreshMenu(); setTimeout(refreshMenu, 2500);
  game.modules.get(MOD).api = { resetLimits: async () => { if (!game.user.isGM) return 0; const L = game.actors.filter(a => a.type === "character" && a.flags?.[MOD]?.boughtP); for (const a of L) await a.update({ [`flags.${MOD}.-=boughtP`]: null }); return L.length; }, open: WarpApp.open, shop: ShopApp.open, history: HistoryApp.open, editor: EditorApp.open, demo: t => Scene.play(demoShow(t || "SSS"), {}), pull: (banner, actorId, n = 1, pay = "gold") => gmDo("pull", { banner, actor: game.actors.get(actorId)?.uuid, count: n, pay }).then(s => s && Scene.play(s, {})) };
  if (game.user.isGM && game.users.activeGM?.id === game.user.id && !setting("seeded")) await seed();
  if (game.user.isGM && game.users.activeGM?.id === game.user.id) await migrate();
});

/* première ouverture : deux bannières d'exemple et une boutique vide */
async function seed() {
  const db = catDB(); const items = db?.items || [];
  const pick = (r, n) => items.filter(e => e.rang === r && e.t !== "vehicle").slice(0, n).map(e => e.id);
  const std = newBanner({ name: "Appel au Créateur", tag: "Synthèse permanente", sub: "Disponible en permanence", tickets: [{ ref: "gm-orbis", pulls: 1 }], kind: "standard", group: "standard", color: "#5b7cff", color2: "#9fd2ff", lore: "Le Système ouvre un passage vers ses réserves. Tout ce que la boutique contient peut répondre à l'appel." });
  const lim = newBanner({ name: "Éclat Souverain", tickets: [{ ref: "gm-orbis-p", pulls: 1 }], tag: "Synthèse limitée", sub: "Exemple : remplace les images et les objets à l'affiche", kind: "limited", group: "limited", color: "#b8862a", color2: "#ffd77a", featured: [...pick("SSS", 1), ...pick("S", 2)], lore: "Un astre s'aligne : ses reliques répondent plus souvent à l'appel." });
  await game.settings.set(MOD, "banners", [std, lim]);
  if (!setting("shop")?.sections?.length) await game.settings.set(MOD, "shop", newShop());
  await game.settings.set(MOD, "seeded", true);
}

/* 1.3 : nouveau vocabulaire (Appel des Étoiles, Synthèse, Boutique stellaire), bannière permanente renommée, tickets d'Orbis Astra */
async function migrate() {
  if ((setting("migV") || 0) >= 130) return;
  try {
    const L = foundry.utils.deepClone(banners()); let ch = false;
    for (const b of L) {
      if (b.name === "Appel des Étoiles" && b.kind !== "limited") { b.name = "Appel au Créateur"; ch = true; }
      const t = { "Invocation permanente": "Synthèse permanente", "Invocation limitée": "Synthèse limitée", "Invocation": "Synthèse" }[b.tag]; if (t) { b.tag = t; ch = true; }
      if (!(b.tickets || []).length) { b.tickets = [{ ref: b.kind === "limited" ? "gm-orbis-p" : "gm-orbis", pulls: 1 }]; ch = true; }
    }
    if (ch) await game.settings.set(MOD, "banners", L);
    const shop = foundry.utils.deepClone(setting("shop") || {});
    if (shop.sections?.length && !shop.sections.some(sc => (sc.offers || []).some(o => TICKETS[o.id]))) {
      const st = shop.sections.find(sc => sc.id === "stellar") || shop.sections[0], as = shop.sections.find(sc => sc.id === "astral") || st;
      (st.offers ||= []).unshift({ key: foundry.utils.randomID(), id: "gm-orbis", price: 20, limit: 5 }); (as.offers ||= []).unshift({ key: foundry.utils.randomID(), id: "gm-orbis-p", price: 20, limit: 5 });
      await game.settings.set(MOD, "shop", shop);
    }
    const SYS = "manhwa-sheet"; if (game.settings.settings.has(`${SYS}.menuCfg`)) { const raw = foundry.utils.deepClone(game.settings.get(SYS, "menuCfg") || {}); let mc = false;
      for (const t of raw.tabs || []) { const n = { gacha: { Invocation: "Appel des Étoiles" }, gshop: { "Échange": "Boutique stellaire" } }[t.key]?.[t.name]; if (n) { t.name = n; mc = true; } }
      if (mc) await game.settings.set(SYS, "menuCfg", raw); }
    await game.settings.set(MOD, "migV", 130);
  } catch (e) { console.error(MOD, "migration", e); }
}

/** attend qu'une fenêtre soit affichée */
export function whenRendered(w) { return new Promise(res => { let n = 0; const tick = () => { if (w?.rendered && w.element) return res(w); if (++n > 80) return res(w); setTimeout(tick, 50); }; tick(); }); }
/** même place que la fenêtre précédente, mais assez grande pour la page et jamais hors de l'écran */
export function fitPos(p) { const W = innerWidth, H = innerHeight; const w = Math.min(W - 16, Math.max(960, p.width || 0)), h = Math.min(H - 16, Math.max(620, p.height || 0)); return { width: w, height: h, left: Math.max(0, Math.min(p.left ?? 0, W - w)), top: Math.max(0, Math.min(p.top ?? 0, H - h)) }; }

/* 1.19 : lumière des boutons 3D iso — le reflet suit la souris */
const ISO_SEL = ".gm-warp .gw-bar .pull, .gm-warp .gw-bar .paym button, .gm-warp .gw-top .tb, .gm-shop .gs-main .tabs button, .gm-shop .gs-main .wal button, .gm-dialog footer button";
let _isoLast = null;
document.addEventListener("pointermove", ev => { const b = ev.target?.closest?.(ISO_SEL); if (_isoLast && _isoLast !== b) { _isoLast.style.removeProperty("--mx"); _isoLast.style.removeProperty("--my"); } _isoLast = b; if (!b) return;
  const r = b.getBoundingClientRect(); if (!r.width) return; b.style.setProperty("--mx", `${Math.round((ev.clientX - r.left) / r.width * 100)}%`); b.style.setProperty("--my", `${Math.round((ev.clientY - r.top) / r.height * 100)}%`); }, { passive: true });

/* 1.19.2 : l'onglet « Catalogue » du Menu s'appelle maintenant « Boutique » (renomme aussi un réglage du Menu déjà enregistré) */
Hooks.once("ready", async () => { if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return; try {
  const raw = game.settings.get("manhwa-sheet", "menuCfg"); const t = raw?.tabs?.find?.(x => x.key === "gcat"); if (t && t.name === "Catalogue") { t.name = "Boutique"; t.icon = "fa-store"; await game.settings.set("manhwa-sheet", "menuCfg", raw); }
} catch (e) { /* pas de Manhwa Sheet */ } });
