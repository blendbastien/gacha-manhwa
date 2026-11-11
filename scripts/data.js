/* Gacha Manhwa — constantes, valeurs par défaut, accès aux données (réglages du monde, Catalogue, fiche). */
export const MOD = "gacha-manhwa";
export const CAT = "last-horizon-catalogue";
export const RANKS = ["F", "E", "D", "C", "B", "A", "S", "SS", "SSS"];
/* taux par défaut (1.15) : gacha difficile, les hauts rangs sont rarissimes */
export const DEFAULT_RATES = { F: 62, E: 25, D: 9, C: 3, B: 0.8, A: 0.15, S: 0.04, SS: 0.008, SSS: 0.002 };
/** préréglages de difficulté (onglet Taux de l'éditeur) : taux, garantie (pitié) et minimum sur 10 tirages */
export const RATE_PRESETS = {
  start: { name: "Départ (F, un peu de E)", hint: "Seulement du rang F, une faible chance de E, et un E garanti au 20e tirage.",
    rates: { F: 92, E: 8, D: 0, C: 0, B: 0, A: 0, S: 0, SS: 0, SSS: 0 }, pity: { on: true, rank: "E", soft: 14, hard: 20, step: 10 }, g10: { on: false, min: "E" } },
  hard: { name: "Standard difficile", hint: "Les rangs élevés sont rarissimes ; D garanti tous les 10 tirages, S garanti au 160e.",
    rates: { F: 62, E: 25, D: 9, C: 3, B: 0.8, A: 0.15, S: 0.04, SS: 0.008, SSS: 0.002 }, pity: { on: true, rank: "S", soft: 120, hard: 160, step: 4 }, g10: { on: true, min: "D" } },
  limited: { name: "Limitée", hint: "Un peu plus généreuse : C garanti tous les 10 tirages, S garanti au 90e.",
    rates: { F: 55, E: 28, D: 11, C: 4.5, B: 1.2, A: 0.25, S: 0.04, SS: 0.008, SSS: 0.002 }, pity: { on: true, rank: "S", soft: 74, hard: 90, step: 6 }, g10: { on: true, min: "C" } }
};
export const RANK_COLORS = { F: "#c8ced8", E: "#de8bb5", D: "#38bdf8", C: "#2dd4bf", B: "#a78bfa", A: "#4ade80", S: "#ffe9a8", SS: "#ff8a3c", SSS: "#f5c518" };
/* couleur annonciatrice (météore, portail) selon le meilleur palier obtenu */
export const HINT = { low: "#4fa8ff", mid: "#b46bff", S: "#ffc94a", SS: "#ff5a36", SSS: "#ffffff" };
export const FRAG_KINDS = ["stellar", "astral"];
export const DEFAULT_FRAG = { F: ["stellar", 1], E: ["stellar", 2], D: ["stellar", 3], C: ["stellar", 5], B: ["astral", 2], A: ["astral", 4], S: ["astral", 10], SS: ["astral", 25], SSS: ["astral", 60] };
export const ASSETS = {
  bgm: "snd/bgm.ogg", callSR: "snd/call_sr.ogg", callSSR: "snd/call_ssr.ogg", pay: "snd/pay_coins.ogg", coin: "snd/coin.ogg",
  rise: "snd/rise.ogg", meteor: "snd/meteor.ogg", portal: "snd/portal.ogg", flip: "snd/flip.ogg",
  revCommon: "snd/rev_common.ogg", revRare: "snd/rev_rare.ogg", revVrare: "snd/rev_vrare.ogg", revEpic: "snd/rev_epic.ogg",
  revS: "snd/rev_s.ogg", revSS: "snd/rev_ss.ogg", revSSS: "snd/rev_sss.ogg", dupBasic: "snd/dup_basic.ogg", dupRare: "snd/dup_rare.ogg",
  lobbyJoin: "snd/lobby_join.ogg", lobbyLeave: "snd/lobby_leave.ogg", countTick: "snd/count_tick.ogg", countGo: "snd/count_go.ogg", lobbyBgm: "snd/lobby_bgm.ogg",
  cardWhoosh: "snd/card_whoosh.ogg", shimmer: "snd/shimmer.ogg", trainPass: "snd/train_pass.ogg", trainBrake: "snd/train_brake.ogg", doorOpen: "snd/door_open.ogg", doorLight: "snd/door_light.ogg", rankUp: "snd/rank_up.ogg",
  vPortal: "vid/portal.webm", vRing: "vid/ring.webm", vBeam: "vid/beam.webm", vMeteor: "vid/meteor.webm", vBurst: "vid/burst.webm",
  vRings: "vid/rings.webm", vFlare: "vid/flare.webm", vSmoke: "vid/smoke.webm", vGlitter: "vid/glitter.webm", vDust: "vid/dust.webm", vRays: "vid/rays.webm",
  t3TrainColor: "3d/train_color.webp", t3TrainIllum: "3d/train_illum.webp", t3TrainRefl: "3d/train_refl.webp", t3Planet: "3d/planet_ice.webp",
  t3Tram: "3d/tram.glb", t3Hdri: "3d/night.hdr"
};
/* images du pack (img/) : exposées en variables CSS --gm-<clé> */
export const IMAGES = {
  cardBack: "card_back", frame: "frame", embWarp: "emb_warp", embExchange: "emb_exchange", embGroup: "emb_group", embFriend: "emb_friend", embComm: "emb_comm",
  coin: "coin", ticketStd: "ticket_std", ticketLim: "ticket_lim", fragS: "frag_stellar", fragA: "frag_astral",
  capBlue: "cap_blue", capGreen: "cap_green", plateGreen: "plate_green", platePurple: "plate_purple", plateOct: "plate_oct", btnGold: "btn_gold", btnGoldWave: "btn_gold_wave",
  bandGlow: "band_glow", bandStars: "band_stars", bandDark: "band_dark", horn1: "horn1", horn2: "horn2",
  bgBlue: "bg_blue", bgPurple: "bg_purple", bgGold: "bg_gold", bgRed: "bg_red", bgRainbow: "bg_rainbow",
  icInfo: "ic_info", icTicket: "ic_ticket", icHistory: "ic_history", icWatch: "ic_watch", icDemo: "ic_demo", icChat: "ic_chat", icEdit: "ic_edit", icShop: "ic_shop", icBook: "ic_book", icExchange: "ic_scroll", icGear: "ic_gear", icAnnounce: "ic_announce", icSkip: "ic_skip", icStars: "ic_stars", icTrade: "ic_trade", icGuild: "ic_guild", icTp: "ic_tp", icNotes: "ic_notes", icSettings: "ic_settings"
};
for (const [k, f] of Object.entries(IMAGES)) ASSETS["i_" + k] = `img/${f}.webp`;

/** chemin utilisable dans une variable CSS (résolue depuis la feuille de style) : rendu absolu */
export const absUrl = p => { p = String(p || ""); if (!p || /^(https?:|data:|blob:|\/)/.test(p)) return p; try { return foundry.utils.getRoute(p); } catch (e) { return "/" + p; } };
export const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
export const setting = k => game.settings.get(MOD, k);
export const uid = () => foundry.utils.randomID(12);
export const img = k => asset("i_" + k);
/* adresse réelle du pack : sur la Forge, les fichiers passent par une redirection (~1 s par requête) ; on la résout une fois */
export const ASSET_VER = "121";
let PREFIX = "", RESOLVING = null;
const assetBase = () => String(setting("assetPath") || "").replace(/\/+$/, "");
export const asset = k => { const base = assetBase(); if (!base || !ASSETS[k]) return ""; const u = PREFIX + `${base}/${ASSETS[k]}`; return k.startsWith("i_") ? `${u}?v=${ASSET_VER}` : u; };
export function resolveAssets(force = false) {
  if (force) { PREFIX = ""; RESOLVING = null; } if (RESOLVING) return RESOLVING;
  const base = assetBase(); if (!base || /^(https?:|blob:|data:)/.test(base)) return (RESOLVING = Promise.resolve());
  const rel = `${base}/${ASSETS.i_cardBack}`;
  RESOLVING = fetch(absUrl(rel), { method: "HEAD", cache: "no-store" }).then(r => { if (r.ok && r.redirected && r.url.split("?")[0].endsWith(rel)) PREFIX = r.url.split("?")[0].slice(0, -rel.length); }).catch(() => {});
  return RESOLVING;
}
/* vidéos de la scène gardées en mémoire (blob) : lecture et retour en arrière instantanés, plus aucun retard réseau */
const VBLOB = new Map(), VOK = new Map();
export function prefetchVideos(keys = ["vMeteor", "vRing", "vPortal", "vBurst", "vBeam", "vRings", "vFlare", "vSmoke", "vGlitter", "vDust", "vRays"]) {
  return Promise.all(keys.map(k => { if (!VBLOB.has(k)) VBLOB.set(k, resolveAssets().then(() => { const u = asset(k); return u ? fetch(absUrl(u)).then(r => r.ok ? r.blob() : null).then(b => { const o = b ? URL.createObjectURL(b) : null; if (o) VOK.set(k, o); return o; }) : null; }).catch(() => null)); return VBLOB.get(k); }));
}
/** adresse d'une vidéo : la copie en mémoire si elle est prête, sinon le fichier */
export const videoUrl = k => VOK.get(k) || (asset(k) ? absUrl(asset(k)) : "");

/* ── Catalogue ── */
export const catApi = () => game.modules.get(CAT)?.active ? game.modules.get(CAT).api : null;
/* 1.19 : la base du Catalogue est recopiée en entier à chaque getDB() (15 000 objets) ; on la garde tant que les modifications
 * du monde (réglage « delta ») ne changent pas, avec un index par identifiant et par catégorie → boutique et page d'invocation instantanées */
let _cdb = null, _cdbKey = null, _cdbIdx = null, _cdbIco = null;
const deltaKey = () => { try { return String(game.settings.get(CAT, "delta") || ""); } catch (e) { return ""; } };
export const catDB = () => { const k = deltaKey(); if (_cdb && k === _cdbKey) return _cdb;
  let db = null; try { db = catApi()?.getDB?.() || null; } catch (e) { db = null; }
  if (db) { _cdb = db; _cdbKey = k; _cdbIdx = null; _cdbIco = null; } return db; };
export const catDirty = () => { _cdb = null; _cdbIdx = null; _cdbIco = null; };
Hooks.on("updateSetting", st => { if (String(st?.key || "").startsWith(`${CAT}.`)) catDirty(); });
Hooks.on("createSetting", st => { if (String(st?.key || "").startsWith(`${CAT}.`)) catDirty(); });
const catIdx = () => { const db = catDB(); if (!db) return null; if (!_cdbIdx) { _cdbIdx = new Map(); for (const e of db.items || []) _cdbIdx.set(e.id, e); } return _cdbIdx; };
export function rankList() { const db = catDB(); const r = db?.ranks?.map(x => x.id); return r?.length ? r : RANKS; }
export function rankColor(r) { const db = catDB(); return db?.ranks?.find(x => x.id === r)?.color || RANK_COLORS[r] || "#c8ced8"; }
export function rarColor(n) { const db = catDB(); return db?.rars?.find(x => x.name === n)?.color || "#9ca3af"; }
export const rankIdx = r => { const i = rankList().indexOf(r); return i < 0 ? 0 : i; };
/** palier : low (F→C), mid (B, A), S, SS, SSS — calculé sur la position dans la liste des rangs */
export function tierOf(r) { const L = rankList(), n = L.length, i = L.indexOf(r); if (i < 0) return "low"; const fromTop = n - 1 - i; if (fromTop === 0) return "SSS"; if (fromTop === 1) return "SS"; if (fromTop === 2) return "S"; if (fromTop <= 4) return "mid"; return "low"; }
export const TIER_ORDER = ["low", "mid", "S", "SS", "SSS"];
export const tierRank = t => TIER_ORDER.indexOf(t);
/** fausse alerte : la porte s'allume d'un rang plus bas puis bascule sur le vrai (S, SS, SSS seulement) */
export function fakeTier(best, rate) { const r = tierRank(best); if (r < 2 || Math.random() >= rate) return null; const lo = r === 2 ? 1 : r - 1 - (Math.random() < 0.35 ? 1 : 0); return TIER_ORDER[Math.max(1, lo)]; }
/* ── tickets d'Orbis Astra : objets propres au module (pas besoin du Catalogue) ── */
export const TICKETS = {
  "gm-orbis": { id: "gm-orbis", n: "Ticket Orbis", t: "item", cat: "Ticket", rang: "B", rar: "Rare", imgKey: "ticketStd", virtual: true,
    desc: "Titre de passage émis par Orbis Astra. Permet une Synthèse sur les bannières permanentes du Synthétiseur.",
    lore: "Le métal reste tiède, comme s'il venait d'être frappé. Son sceau d'étoiles n'appartient à aucune forge connue : Orbis Astra ne signe pas autrement." },
  "gm-orbis-p": { id: "gm-orbis-p", n: "Ticket Orbis Premium", t: "item", cat: "Ticket", rang: "A", rar: "Épique", imgKey: "ticketLim", virtual: true,
    desc: "Titre de passage d'exception émis par Orbis Astra. Permet une Synthèse sur les bannières limitées du Synthétiseur.",
    lore: "Son sceau ne s'éveille qu'à l'alignement des astres. On dit qu'Orbis Astra ne l'émet que lorsqu'une étoile précise accepte de répondre à l'appel." }
};
/** climax des musiques de révélation (seconde dans le fichier) : la carte se retourne pile dessus */
export const DEFAULT_CLIMAX = { S: 3.56, SS: 6.93, SSS: 3.51 };
export const climaxOf = t => { const v = Number((setting("climax") || {})[t]); return Number.isFinite(v) && v > 0 ? v : DEFAULT_CLIMAX[t]; };
export const SHOP_GREETING = "Quelque chose, par-delà les étoiles, a dressé ces étals. Faute de mieux, on l'appelle l'entité stellaire : elle ne parle jamais, mais elle se souvient de chaque échange.";
/** image d'un ticket (chemin relatif du pack, valable pour une fiche d'objet) */
export const ticketImg = e => { const base = String(setting("assetPath") || "").replace(/\/+$/, ""); return e?.imgKey && base ? `${base}/img/${IMAGES[e.imgKey]}.webp` : "icons/svg/card-joker.svg"; };
/* 1.25 : cosmétiques de Manhwa Sheet (même liste que le Catalogue) : carte du joueur et téléphone. Identifiant « cs:card:sticker:beach-crab », « cs:phone:wall:rift »…
 * (les anciennes offres « ph:frame:gold » restent valables : téléphone). */
export const cosmetics = () => globalThis.MANHWA?.cosmetics?.list?.() || [];
export const phoneCosmetics = cosmetics;
export const cosGid = id => { id = String(id || ""); return id.startsWith("cs:") ? id.slice(3) : id.startsWith("ph:") ? `phone:${id.slice(3)}` : null; };
export function phoneItem(id) { const gid = cosGid(id); if (!gid) return null; const c = globalThis.MANHWA?.cosmetics?.get?.(gid); if (!c) return null;
  return { id, gid, n: c.name, t: "cosm", cat: c.family, sub: c.kindName, rang: c.rank, rar: c.rarName, desc: `${c.desc} Débloqué dès l'achat.`, lore: "", cosm: c, icon: c.icon, cimg: c.img, ccss: c.css, ccol: c.color, virtual: true }; }
export function itemById(id) { return TICKETS[id] || phoneItem(id) || catIdx()?.get(id) || null; }
export function catTypes() { const db = catDB(); return (db?.types || []).map(t => ({ id: t.id, name: t.name || t.id, color: t.color })); }
/** illustration d'un objet du Catalogue (image de l'objet lié ou pack d'icônes illustrées), sinon "" */
/* icônes haute définition (essai 1.16.2) : versions agrandies (×2, ×3, ×4) des icônes du Catalogue rangées dans
 * catalogue-icones/armure2-hd-x<N>/ avec une liste list.json ; réglage du monde « hdIcons » (0 = icônes d'origine). */
const HD = { n: 0, set: new Set(), base: "" };
export async function loadHdIcons() { HD.set = new Set(); HD.n = Number(game.settings.get(MOD, "hdIcons")) || 0; if (!HD.n) return;
  const base = `catalogue-icones/armure2-hd-x${HD.n}`; try { const r = await fetch(absUrl(`${base}/list.json`), { cache: "no-store" }); if (r.ok) { HD.set = new Set(await r.json()); HD.base = base; } } catch (e) {} }
const hdOf = p => { if (!HD.n || !HD.set.size || !p) return p; const m = String(p).match(/catalogue-icones\/armure2\/([^/?#]+)\.webp/); return m && HD.set.has(m[1]) ? `${HD.base}/${m[1]}.webp` : p; };
/* 1.21 — icônes 2D et fonds de carte du Catalogue (mêmes visuels partout dans la suite) */
let VIS = null; export const vis = () => VIS;
export async function loadVis() { try { VIS = (await catApi()?.visual?.()) || null; } catch (e) { VIS = null; } }
export const catBgOf = e => { try { return VIS && e && !e.virtual && !e.cosm ? VIS.catBg(e) : null; } catch (err) { return null; } };
export function itemPic(e) { if (!e || e.virtual || e.cosm) return ""; try { const v = VIS?.picOrIcon?.(e)?.pic; if (v) return v; } catch (err) {} try { if (e.img) return absUrl(hdOf(e.img)); const p = catApi()?.picOf?.(e.id); return p ? absUrl(hdOf(p)) : ""; } catch (err) { return ""; } }
/** garantie (pitié) d'une bannière : rang minimum garanti (par défaut le premier des trois rangs les plus hauts, soit S) */
export function pityIdx(b) { const L = rankList(); const i = b?.pity?.rank ? L.indexOf(b.pity.rank) : -1; return i >= 0 ? i : Math.max(0, L.length - 3); }
export const pityRank = b => rankList()[pityIdx(b)];
export function catIconPath(e) { if (e?.cosm) return ""; if (e?.virtual) return absUrl(img(e.imgKey)); const v2 = itemPic(e); if (v2) return v2; const db = catDB() || {};
  if (e.icon) return absUrl(`modules/${CAT}/icons/${/^[a-z0-9_]+$/.test(e.icon) ? e.icon : "box"}.svg`);
  const key = `${e.t}|${e.cat}|${e.sub}`; if (!_cdbIco || _cdbIco.db !== db) _cdbIco = { db, m: new Map() }; const hit = _cdbIco.m.get(key); if (hit) return hit;
  const c = (db.cats || []).find(c => c.type === e.t && c.name === e.cat); const ic = c?.subs?.find(s => s.name === e.sub)?.icon || c?.icon || (db.types || []).find(t => t.id === e.t)?.icon;
  const url = absUrl(`modules/${CAT}/icons/${ic && /^[a-z0-9_]+$/.test(ic) ? ic : "box"}.svg`); _cdbIco.m.set(key, url); return url; }

/* ── fiche : monnaie, portefeuille de fragments, pitié ── */
const nrm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
export function goldKey() { const r = globalThis.MANHWA?.config?.().resources || []; const want = nrm(setting("goldKey")); return (want && r.find(x => nrm(x.key) === want || nrm(x.name) === want)?.key) || r.find(x => nrm(x.key) === "gold" || nrm(x.name) === "gold" || nrm(x.name) === "or")?.key || r[0]?.key || "gold"; }
export const goldOf = a => Number(a?.system?.resources?.[goldKey()]) || 0;
export const walletOf = a => ({ stellar: Number(a?.flags?.[MOD]?.wallet?.stellar) || 0, astral: Number(a?.flags?.[MOD]?.wallet?.astral) || 0 });
export const fragName = k => (setting("fragNames") || {})[k] || (k === "astral" ? "Fragments astraux" : "Fragments stellaires");
export function fragFor(r) { const t = setting("fragValues") || {}; const v = t[r] || DEFAULT_FRAG[r] || ["stellar", 1]; return { c: v[0], n: Number(v[1]) || 0 }; }
export const fmt = n => Math.round(Number(n) || 0).toLocaleString("fr-FR");
/** montant abrégé (10,2 M) avec le montant exact au survol (1.19.2) */
export function fmtS(n) { n = Math.round(Number(n) || 0); const a = Math.abs(n); const f = (v, u) => `${(Math.round(v * 10) / 10).toLocaleString("fr-FR", { maximumFractionDigits: v < 100 ? 1 : 0 })} ${u}`;
  const t = a < 100000 ? n.toLocaleString("fr-FR") : a < 1e6 ? f(n / 1e3, "k") : a < 1e9 ? f(n / 1e6, "M") : a < 1e12 ? f(n / 1e9, "Md") : f(n / 1e12, "B");
  return `<span class="gm-amt" data-tooltip="${n.toLocaleString("fr-FR")}">${t}</span>`; }
export function myCharacters(user = game.user) { return game.actors.filter(a => a.type === "character" && a.testUserPermission(user, "OWNER") && (user.isGM ? (a.hasPlayerOwner || a.id === user.character?.id) : true)).sort((a, b) => (b.id === user.character?.id) - (a.id === user.character?.id) || a.name.localeCompare(b.name, "fr")); }

/* ── bannières ── */
export function newBanner(over = {}) {
  return foundry.utils.mergeObject({
    id: uid(), name: "Nouvelle bannière", sub: "", tag: "Synthèse", kind: "standard", group: "standard", on: true,
    color: "#6f8cff", color2: "#f5c518", img: { bg: "", art: "", thumb: "", logo: "" }, art: { x: 62, y: 50, scale: 100 }, lore: "",
    start: "", end: "", season: "",
    pool: { types: [], cats: [], rangs: [], worlds: [], include: [], exclude: [] },
    featured: [], featRate: 50, featGuarantee: false,
    rates: { ...DEFAULT_RATES },
    cost: { x1: 500, x10: 5000 }, tickets: [],
    pity: { on: false, rank: "", soft: 74, hard: 90, step: 6 }, g10: { on: false, min: "B" }, showcase: [],
    dup: "fragments", announce: true
  }, over, { inplace: false });
}
export function banners() { const l = setting("banners"); return Array.isArray(l) ? l.map(b => newBanner(b)) : []; }
export const bannerById = id => banners().find(b => b.id === id) || null;
export function bannerLive(b, now = Date.now()) { if (!b.on) return false; if (b.start && Date.parse(b.start) > now) return false; if (b.end && Date.parse(b.end) < now) return false; if (b.season && nrmEv(b.season) !== nrmEv(worldEvent())) return false; return true; }
export function timeLeft(b) { if (!b.end) return ""; const ms = Date.parse(b.end) - Date.now(); if (!(ms > 0)) return "terminée"; const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4); return d ? `${d} j ${h} h` : h ? `${h} h ${m} min` : `${m} min`; }

/** arbre du Catalogue : types → catégories → sous-catégories, et mondes */
export function catTree() { const db = catDB() || {}; return (db.types || []).map(t => ({ id: t.id, name: t.name || t.id, color: t.color, cats: (db.cats || []).filter(c => c.type === t.id).map(c => ({ name: c.name, subs: (c.subs || []).map(x => x.name) })) })); }
export function catWorlds() { return (catDB()?.worlds || []).map(w => ({ name: w.name || w, color: w.color })); }
const asList = v => Array.isArray(v) ? v : String(v || "").split(",").map(x => x.trim()).filter(Boolean);

/** lots de la bannière, rangés par rang */
function nrmEv(t) { return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
/** événement en cours (nom du Catalogue), piloté par Manhwa Sheet */
export function worldEvent() { try { const c = game.modules.get(CAT)?.api?.currentSeason; if (c) return c() || ""; return globalThis.MANHWA?.season?.()?.eventName || ""; } catch (e) { return ""; } }
/** saison du monde (Manhwa Sheet) : { key, name, event… } ou null */
export function worldSeason() { try { return globalThis.MANHWA?.season?.() || null; } catch (e) { return null; } }
/* 1.21 — blocs de la Boutique (Catalogue) qui remplissent une bannière : la bannière suit le bloc s'il change */
export function shopBlocks() { try { return (game.settings.get(CAT, "shop")?.blocks || []).map(b => ({ id: b.id, name: b.name || "Bloc", ids: (b.items || []).filter(x => !x.tag && x.id).map(x => x.id) })).filter(b => b.ids.length); } catch (e) { return []; } }
export const blockIds = bl => { const want = new Set(bl || []); if (!want.size) return []; return shopBlocks().filter(b => want.has(b.id)).flatMap(b => b.ids); };
export function poolOf(b) {
  const db = catDB(); const items = db?.items || []; const P = b.pool || {};
  const types = new Set(P.types || []), rangs = new Set(P.rangs || []);
  /* catégories : clés « type|catégorie » ou « type|catégorie|sous-catégorie » (anciennes versions : noms séparés par des virgules) */
  const cats = asList(P.cats); const keyed = cats.filter(c => c.includes("|")), named = cats.filter(c => !c.includes("|")).map(c => c.toLowerCase());
  const worlds = asList(P.worlds).map(w => w.toLowerCase());
  const excl = new Set(P.exclude || []);
  const catOk = e => { if (!cats.length) return true; if (named.some(c => String(e.cat || "").toLowerCase() === c || String(e.sub || "").toLowerCase() === c)) return true; return keyed.some(k => { const [t, c, sb] = k.split("|"); return e.t === t && e.cat === c && (!sb || e.sub === sb); }); };
  const curEv = nrmEv(worldEvent());
  const filtered = types.size || rangs.size || cats.length || worlds.length; const fromBlocks = blockIds(P.blocks);
  const auto = (filtered || (!(P.include || []).length && !fromBlocks.length)) ? items.filter(e => {
    if (excl.has(e.id)) return false; if (types.size && !types.has(e.t)) return false; if (rangs.size && !rangs.has(e.rang)) return false;
    if (!catOk(e)) return false; if (worlds.length && !worlds.includes(String(e.origin || "").toLowerCase())) return false;
    if (e.season && (b.season ? e.season !== b.season : nrmEv(e.season) !== curEv)) return false;   /* objets d'événement : seulement pendant leur événement (saison de Manhwa Sheet / Catalogue) */
    return true; }) : [];
  const ids = new Set(auto.map(e => e.id)); const all = auto.slice();
  for (const id of [...(P.include || []), ...fromBlocks, ...(b.featured || []), ...(b.showcase || [])]) if (!ids.has(id) && !excl.has(id)) { const e = items.find(x => x.id === id); if (e) { all.push(e); ids.add(id); } }
  const by = {}; for (const r of rankList()) by[r] = []; for (const e of all) (by[e.rang] ||= []).push(e);
  return by;
}

/* ── boutique d'échange ── */
export function newShop() { return { sections: [
  { id: "reco", name: "Recommandé", icon: "fa-thumbs-up", offers: [] },
  { id: "stellar", name: "Échange stellaire", icon: "fa-star", currency: "stellar", offers: [{ key: "tk-orbis-s", id: "gm-orbis", price: 20, limit: 5, reset: "month" }] },
  { id: "astral", name: "Convergence astrale", icon: "fa-sun", currency: "astral", offers: [{ key: "tk-orbis-p", id: "gm-orbis-p", price: 20, limit: 5, reset: "month" }, { key: "tk-orbis-a", id: "gm-orbis", price: 10, limit: 5, reset: "month" }] }
] }; }
/** période de remise à zéro d'une offre : "month" (par défaut si limitée), "week", "none" */
export const resetOf = o => o?.reset || (o?.limit ? "month" : "none");
export function periodKey(reset, t = new Date()) { if (reset === "month") return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`; if (reset === "week") { const d = new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())); const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return `${d.getUTCFullYear()}-W${Math.ceil(((d - y0) / 864e5 + 1) / 7)}`; } return ""; }
/** achats déjà faits sur une offre pour la période en cours */
export function boughtOf(actor, o) { const r = resetOf(o); if (r === "none") return actor?.flags?.[MOD]?.bought?.[o.key] || 0; const rec = actor?.flags?.[MOD]?.boughtP?.[o.key]; return rec?.p === periodKey(r) ? Number(rec.n) || 0 : 0; }
/** temps restant avant la remise à zéro (texte court) */
export function resetIn(reset) { const t = new Date(); let end; if (reset === "month") end = new Date(t.getFullYear(), t.getMonth() + 1, 1); else if (reset === "week") { end = new Date(t); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() + ((8 - (end.getDay() || 7)) % 7 || 7)); } else return ""; const ms = end - t, dd = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5); return dd ? `${dd} j ${h} h` : `${h} h`; }
export function shopCfg() { const s = setting("shop"); return s?.sections?.length ? s : newShop(); }

/* ── images du pack : variables CSS + classe body.gm-img quand le pack est présent ── */
export function applyAssetVars() {
  resolveAssets().then(() => applyAssetVars0());
  applyAssetVars0();
}
function applyAssetVars0() {
  const st = document.documentElement.style; for (const k of Object.keys(IMAGES)) { const u = img(k); if (u) st.setProperty(`--gm-${k}`, `url("${absUrl(u)}")`); else st.removeProperty(`--gm-${k}`); }
  const probe = new Image(); probe.onload = () => document.body.classList.add("gm-img"); probe.onerror = () => document.body.classList.remove("gm-img"); const u = img("cardBack"); if (u) probe.src = absUrl(u); else document.body.classList.remove("gm-img");
}
/** icône : image du pack si présent, sinon Font Awesome */
export function gi(fa, key, cls = "") { const u = img(key); return `<i class="fa-solid ${fa} gfa ${cls}"></i>${u ? `<img class="gimg ${cls}" src="${esc(absUrl(u))}" alt="">` : ""}`; }
/** lien entre deux personnages : group (même groupe Manhwa), friend (dans le carnet d'amis), other */
export function relationOf(hostActor, otherActor) {
  if (!hostActor || !otherActor) return "other";
  try { const parties = game.settings.get("manhwa-sheet", "parties")?.list || []; if (parties.some(p => (p.members || []).some(m => m.uuid === hostActor.uuid) && (p.members || []).some(m => m.uuid === otherActor.uuid))) return "group"; } catch (e) {}
  const walk = (l, f) => { for (const n of l || []) { if (f(n)) return true; if (walk(n.children, f)) return true; } return false; };
  const nm = s => String(s || "").trim().toLowerCase();
  const isF = (a, b) => walk(a?.system?.carnet?.friends, n => n.uuid === b.uuid || (!n.uuid && nm(n.name) === nm(b.name)));
  if (isF(hostActor, otherActor) || isF(otherActor, hostActor)) return "friend";
  return "other";
}
export const userActor = u => u?.character || game.actors.find(a => a.type === "character" && a.testUserPermission(u, "OWNER") && a.hasPlayerOwner) || null;
