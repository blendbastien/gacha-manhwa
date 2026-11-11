/* Gacha Manhwa — moteur : tout tirage et tout achat est calculé chez le MJ (hasard, paiement, objets, pitié, historique). */
import { MOD, CAT, esc, setting, uid, rankList, rankColor, rarColor, tierOf, tierRank, poolOf, bannerById, bannerLive, goldKey, goldOf, walletOf, fragFor, fragName, fmt, catApi, itemById, catIconPath, shopCfg, ticketImg, HINT, fakeTier, boughtOf, resetOf, periodKey, itemPic, pityIdx } from "./data.js";

/* ── relais MJ (socket) ── */
const handlers = {}; const waiting = new Map(); let queue = Promise.resolve();
export const onGm = (op, fn) => { handlers[op] = fn; };
/* verrou par clé partagé avec Manhwa Sheet et les autres modules (globalThis) : l'or ou l'inventaire d'un personnage n'est touché que par
 * une opération à la fois, tous modules confondus — sinon deux écritures calculées sur la même lecture se seraient écrasées (1.18.0) */
const LOCKS = globalThis.__manhwaLocks ||= new Map();
export function withLock(key, fn) { const prev = LOCKS.get(key) || Promise.resolve(); const run = prev.then(fn); const tail = run.catch(() => {}); LOCKS.set(key, tail); tail.then(() => { if (LOCKS.get(key) === tail) LOCKS.delete(key); }); return run; }
export const actorLock = (actor, fn) => withLock(`actor:${actor?.uuid || actor}`, fn);
const SEEN = new Map();   /* requêtes déjà traitées (double envoi) */
const activeGm = () => game.users.activeGM ?? game.users.find(u => u.isGM && u.active);
const listeners = {}; export const onBroadcast = (op, fn) => { (listeners[op] ||= []).push(fn); };
function runLocal(op, data, userId) { const p = queue.then(() => handlers[op]?.(data, userId)); queue = p.catch(() => {}); return p; }
export async function gmDo(op, data = {}) {
  if (game.user.isGM) { try { const r = await runLocal(op, data, game.user.id); if (r?.msg) ui.notifications[r.ok === false ? "warn" : "info"](r.msg); return r?.ok === false ? null : (r?.value ?? null); } catch (e) { console.error(MOD, e); ui.notifications.error("Appel des Étoiles : " + e.message); return null; } }
  if (!activeGm()) { ui.notifications.warn("Aucun MJ connecté : les synthèses passent par le MJ."); return null; }
  const rid = uid(); game.socket.emit(`module.${MOD}`, { op, data, from: game.user.id, rid });
  return new Promise(res => { const t = setTimeout(() => { waiting.delete(rid); ui.notifications.warn("Le MJ n'a pas répondu."); res(null); }, 15000); waiting.set(rid, v => { clearTimeout(t); res(v); }); });
}
export function broadcast(op, data) { game.socket.emit(`module.${MOD}`, { op: "bc", bop: op, data, from: game.user.id }); for (const f of listeners[op] || []) f(data, game.user.id); }
export function initSocket() {
  game.socket.on(`module.${MOD}`, async m => {
    if (!m) return;
    if (m.op === "bc") { for (const f of listeners[m.bop] || []) f(m.data, m.from); return; }
    if (m.op === "reply") { if (m.to !== game.user.id) return; const f = waiting.get(m.rid); if (f) { waiting.delete(m.rid); if (m.msg) ui.notifications[m.ok ? "info" : "warn"](m.msg); f(m.value ?? null); } return; }
    if (!game.user.isGM || activeGm()?.id !== game.user.id) return;
    /* un MJ exécute toujours en local : une requête réseau qui se dit « MJ » est forgée ; expéditeur inconnu ou absent : refusée aussi */
    const sender = game.users.get(m.from); if (!sender || sender.isGM || !sender.active) { console.warn(MOD, "requête refusée (expéditeur invalide)", m.op, m.from); return; }
    if (m.rid) { const now = Date.now(); for (const [k, t] of SEEN) if (now - t > 60000) SEEN.delete(k); if (SEEN.has(m.rid)) return; SEEN.set(m.rid, now); }
    let value = null, ok = true, msg = "";
    try { const r = await runLocal(m.op, m.data || {}, m.from); if (r && typeof r === "object" && "ok" in r) { ok = r.ok !== false; msg = r.msg || ""; value = r.value ?? null; } else value = r ?? null; }
    catch (e) { console.error(MOD, e); ok = false; msg = "Erreur côté MJ : " + e.message; }
    game.socket.emit(`module.${MOD}`, { op: "reply", to: m.from, rid: m.rid, ok, msg, value });
  });
}

/* ── tirage ── */
const rnd = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; };
function pickWeighted(entries) { const tot = entries.reduce((s, [, w]) => s + Math.max(0, w), 0); if (tot <= 0) return entries[0]?.[0]; let x = rnd() * tot; for (const [k, w] of entries) { x -= Math.max(0, w); if (x <= 0) return k; } return entries[entries.length - 1][0]; }
const pickOne = l => l[Math.floor(rnd() * l.length)];
const HIGH = new Set(["S", "SS", "SSS"]);

/** probabilités effectives pour le prochain tirage (pitié douce / dure sur le rang garanti et au-dessus, garantie du ×10) */
export function effectiveRates(b, st = {}) {
  const ranks = rankList(); const base = {}; for (const r of ranks) base[r] = Math.max(0, Number(b.rates?.[r]) || 0);
  const pi = pityIdx(b); let high = ranks.filter((r, i) => i >= pi);
  /* rang garanti sans taux (ex. bannière de départ réglée à 0 % au-dessus de E) : on garantit le plus haut rang réellement tirable */
  if (!high.some(r => base[r] > 0)) { const lastOk = ranks.filter(r => base[r] > 0).pop(); if (lastOk) high = [lastOk]; }
  const rates = { ...base };
  if (b.pity?.on) {
    const n = (Number(st.n) || 0) + 1; const hard = Number(b.pity.hard) || 90, soft = Number(b.pity.soft) || hard, step = Number(b.pity.step) || 0;
    const hiBase = high.reduce((s, r) => s + base[r], 0) || 1;
    let target = null; if (n >= hard) target = 100; else if (n >= soft && step > 0) target = Math.min(100, hiBase + step * (n - soft + 1));
    if (target != null && target > hiBase) { const lowKeys = ranks.filter(r => !high.includes(r)); const lowTot = lowKeys.reduce((s, r) => s + base[r], 0) || 1; for (const r of high) rates[r] = base[r] / hiBase * target; for (const r of lowKeys) rates[r] = base[r] / lowTot * (100 - target); }
  }
  return rates;
}
function rollRank(b, st) {
  const ranks = rankList(); let rates = effectiveRates(b, st);
  if (b.g10?.on && (Number(st.n10) || 0) >= 9) { const min = ranks.indexOf(b.g10.min || "B"); if (min >= 0) { const r2 = {}; for (const r of ranks) r2[r] = ranks.indexOf(r) >= min ? rates[r] : 0; if (Object.values(r2).some(v => v > 0)) rates = r2; } }
  return pickWeighted(Object.entries(rates));
}
function pickItem(b, pool, rank, st) {
  const ranks = rankList(); let r = rank; let list = pool[r] || [];
  if (!list.length) { const i = ranks.indexOf(rank); for (let d = 1; d < ranks.length && !list.length; d++) { for (const j of [i - d, i + d]) if (j >= 0 && j < ranks.length && (pool[ranks[j]] || []).length) { r = ranks[j]; list = pool[r]; break; } } }
  if (!list.length) return { e: null, feat: false };
  const feat = list.filter(e => (b.featured || []).includes(e.id)); const other = list.filter(e => !(b.featured || []).includes(e.id));
  if (feat.length && other.length) {
    if (b.featGuarantee && st.g) { st.g = false; return { e: pickOne(feat), feat: true }; }
    if (rnd() * 100 < (Number(b.featRate) || 50)) { st.g = false; return { e: pickOne(feat), feat: true }; }
    if (b.featGuarantee) st.g = true; return { e: pickOne(other), feat: false };
  }
  const e = pickOne(list); return { e, feat: (b.featured || []).includes(e.id) };
}

/* paiement : Gold de la fiche ou tickets (objets du Catalogue / objets marqués) */
function ticketItems(actor, b) {
  const refs = b.tickets || []; if (!refs.length) return [];
  const out = []; for (const it of actor.items) { const cid = it.flags?.[CAT]?.id, own = it.flags?.[MOD]?.ticket; for (const t of refs) { const ref = String(t.ref || "").trim(); if (!ref) continue; if (cid === ref || it.name === ref || (own && (own === ref || own === b.id))) { out.push({ it, pulls: Math.max(1, Number(t.pulls) || 1) }); break; } } }
  return out;
}
export function ticketPulls(actor, b) { return ticketItems(actor, b).reduce((s, x) => s + x.pulls * (Number(x.it.system?.quantity) || 1), 0); }

onGm("pull", async ({ banner, actor: actorUuid, count, pay, lid = null, members = [] }, userId) => {
  const user = game.users.get(userId); const b = bannerById(banner); const actor = await fromUuid(actorUuid);
  if (!b || !actor) return { ok: false, msg: "Bannière ou personnage introuvable." };
  if (!user.isGM && !actor.testUserPermission(user, "OWNER")) return { ok: false, msg: "Ce personnage n'est pas à toi." };
  if (!user.isGM && !bannerLive(b)) return { ok: false, msg: "Cette bannière n'est pas ouverte." };
  const n = count === 10 ? 10 : 1; const pool = poolOf(b);
  if (!Object.values(pool).some(l => l.length)) return { ok: false, msg: "Cette bannière ne contient aucun lot." };
  /* paiement + tirage + objets : sous verrou du personnage (partagé avec Manhwa Sheet, Catalogue, Véhicules) ; si la création des objets
   * échoue après le paiement, le paiement est rendu (or recrédité, tickets recréés) */
  const out = await actorLock(actor, async () => {
  let paid = ""; const refund = [];   /* fonctions de restitution */
  if (pay === "ticket") {
    let need = n; const tix = ticketItems(actor, b).sort((a, z) => z.pulls - a.pulls); const upd = [], del = [];
    for (const { it, pulls } of tix) { let q = Number(it.system?.quantity) || 1, used = 0; while (q > 0 && need >= pulls) { q--; used++; need -= pulls; } if (used) { if (q > 0) upd.push({ _id: it.id, "system.quantity": q, _was: Number(it.system?.quantity) || 1 }); else del.push(it); } if (need <= 0) break; }
    if (need > 0) return { ok: false, msg: n === 1 ? "Il faut un ticket ×1 pour ce tirage." : "Pas assez de tickets pour un ×10." };
    if (upd.length) { await actor.updateEmbeddedDocuments("Item", upd.map(({ _id, ...u }) => ({ _id, "system.quantity": u["system.quantity"] }))); refund.push(() => actor.updateEmbeddedDocuments("Item", upd.map(u => ({ _id: u._id, "system.quantity": u._was })))); }
    if (del.length) { const back = del.map(it => it.toObject()); await actor.deleteEmbeddedDocuments("Item", del.map(it => it.id)); refund.push(() => actor.createEmbeddedDocuments("Item", back, { keepId: true })); }
    paid = "tickets";
  } else {
    const cost = Number(n === 10 ? b.cost?.x10 : b.cost?.x1) || 0; const k = goldKey();
    if (cost > 0) { if (goldOf(actor) < cost) return { ok: false, msg: `Pas assez de Gold (${fmt(cost)} requis).` }; await actor.update({ [`system.resources.${k}`]: goldOf(actor) - cost }); refund.push(() => actor.update({ [`system.resources.${k}`]: goldOf(actor) + cost })); }
    paid = cost > 0 ? `${fmt(cost)} G` : "gratuit";
  }
  try {
  /* tirages */
  const key = `pity.${b.group || b.id}`; const st = foundry.utils.deepClone(actor.flags?.[MOD]?.pity?.[b.group || b.id] || { n: 0, n10: 0, g: false });
  const owned = new Set(actor.items.map(i => i.flags?.[CAT]?.id).filter(Boolean)); const results = []; const gain = { stellar: 0, astral: 0 }; const create = []; const createAt = []; const stackUpd = {}; const stackAt = [];
  const minIdx = rankList().indexOf(b.g10?.min || "B");
  /* résultat imposé par le MJ (Outils MJ › Forcer un résultat) : remplace un tirage au hasard de la série */
  const fz = actor.flags?.[MOD]?.force; const fzE = fz && (!fz.banner || fz.banner === b.id) ? itemById(fz.id) : null; const fzAt = fzE ? Math.floor(rnd() * n) : -1;
  for (let i = 0; i < n; i++) {
    let r = null, e = null, feat = false;
    if (i === fzAt) { e = fzE; r = e.rang; feat = (b.featured || []).includes(e.id); if (feat) st.g = false; }
    else { r = rollRank(b, st); ({ e, feat } = pickItem(b, pool, r, st)); } if (!e) continue;
    const t = tierOf(e.rang); st.n = rankList().indexOf(e.rang) >= pityIdx(b) ? 0 : (Number(st.n) || 0) + 1; st.n10 = rankList().indexOf(e.rang) >= minIdx ? 0 : (Number(st.n10) || 0) + 1;
    const dup = owned.has(e.id); let frag = null;
    if (dup && b.dup !== "stack") { frag = fragFor(e.rang); gain[frag.c] += frag.n; }
    else if (dup && b.dup === "stack") { const ex = actor.items.find(it => it.flags?.[CAT]?.id === e.id); if (ex) { stackUpd[ex.id] = (stackUpd[ex.id] ?? (Number(ex.system?.quantity) || 1)) + 1; stackAt.push([results.length, ex.id]); } else { create.push(e); createAt.push(results.length); } }
    else { create.push(e); createAt.push(results.length); owned.add(e.id); }
    results.push({ id: e.id, n: e.n, r: e.rang, rar: e.rar || "", t: e.t, cat: e.cat || "", desc: String(e.desc || "").slice(0, 260), icon: catIconPath(e), pic: itemPic(e), dup, frag, feat, tier: t });
  }
  /* objets */
  const api = catApi(); const docs = [];
  for (const e of create) { let d = null; try { d = api?.itemData ? await api.itemData(e) : null; } catch (err) { console.warn(MOD, err); } if (!d) d = { name: e.n, type: "item", img: catIconPath(e), system: { quantity: 1 } }; foundry.utils.setProperty(d, `flags.${MOD}.from`, { banner: b.id, t: Date.now() }); docs.push(d); }
  if (docs.length) { const made = await actor.createEmbeddedDocuments("Item", docs); made.forEach((d, j) => { const r = results[createAt[j]]; if (r) r.item = d.id; }); }
  for (const [ri, iid] of stackAt) if (results[ri]) { results[ri].item = iid; results[ri].stack = true; }
  const su = Object.entries(stackUpd).map(([_id, q]) => ({ _id, "system.quantity": q })); if (su.length) await actor.updateEmbeddedDocuments("Item", su);
  const w = walletOf(actor); const upd = { [`flags.${MOD}.${key}`]: st }; if (fzE) upd[`flags.${MOD}.-=force`] = null; if (gain.stellar || gain.astral) upd[`flags.${MOD}.wallet`] = { stellar: w.stellar + gain.stellar, astral: w.astral + gain.astral };
  await actor.update(upd);
  return { ok: true, paid, results, gain };
  } catch (err) { console.error(MOD, "synthèse interrompue, paiement rendu", err); for (const f of refund.reverse()) { try { await f(); } catch (e2) { console.error(MOD, e2); } } return { ok: false, msg: `Synthèse interrompue (${err.message}) : paiement rendu.` }; }
  });
  if (!out.ok) return out; const { paid, results, gain } = out;
  /* historique, chat, annonce, scène partagée */
  const best = results.reduce((m, x) => tierRank(x.tier) > tierRank(m) ? x.tier : m, "low");
  const rec = { pid: uid(), t: Date.now(), user: userId, b: b.id, bn: b.name, a: actor.name, ai: actor.img, n, paid, res: results.map(x => ({ id: x.id, n: x.n, r: x.r, rar: x.rar, dup: x.dup, frag: x.frag, feat: x.feat })), gain };
  await addHistory(userId, rec);
  await chatCard(user, actor, b, results, gain, paid);
  /* annonce (module de notifications) retardée jusqu'à la fin de la scène du joueur : plus de résultat dévoilé en pleine animation */
  const annPid = rec.pid; PENDING_ANN.set(annPid, { fire: () => announce(user, actor, b, results), t: setTimeout(() => fireAnn(annPid), 120000) });
  const show = { pid: rec.pid, user: userId, userName: user.name, actor: { name: actor.name, img: actor.img, uuid: actor.uuid }, banner: { id: b.id, name: b.name, color: b.color, color2: b.color2 }, results, gain, best, fake: fakeTier(best, (Number(setting("fakeRate")) || 0) / 100), n, lid, members: Array.isArray(members) ? members : [], at: lid ? game.time.serverTime + 1600 : null };
  broadcast("show", show);
  return { ok: true, value: show };
});

async function addHistory(userId, rec) {
  const h = foundry.utils.deepClone(setting("history") || {}); const l = h[userId] || []; l.unshift(rec); h[userId] = l.slice(0, Number(setting("historyMax")) || 300);
  await game.settings.set(MOD, "history", h);
}
const rankChip = r => `<b class="gm-rk" style="--rc:${rankColor(r)}">${esc(r)}</b>`;
async function chatCard(user, actor, b, results, gain, paid) {
  if (!setting("chat")) return;
  const rows = results.map(x => `<li class="t-${x.tier}">${rankChip(x.r)}<span>${esc(x.n)}</span>${x.dup ? `<em>${x.frag ? `+${x.frag.n} ${x.frag.c === "astral" ? "✦" : "✧"}` : "×2"}</em>` : `<em class="new">NOUVEAU</em>`}</li>`).join("");
  const g = [gain.stellar ? `+${gain.stellar} ${esc(fragName("stellar"))}` : "", gain.astral ? `+${gain.astral} ${esc(fragName("astral"))}` : ""].filter(Boolean).join(" · ");
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="gm-chat" style="--bc:${esc(b.color)}"><header><i class="fa-solid fa-wand-magic-sparkles"></i><div><small>SYNTHÈSE ×${results.length}</small><b>${esc(b.name)}</b></div></header><ul>${rows}</ul><footer>${esc(paid)}${g ? ` · ${g}` : ""}</footer></div>`, flags: { [MOD]: { pull: true } } });
}
const PENDING_ANN = new Map();
function fireAnn(pid) { const p = PENDING_ANN.get(pid); if (!p) return; PENDING_ANN.delete(pid); clearTimeout(p.t); try { p.fire(); } catch (err) { console.warn(MOD, err); } }
onGm("annNow", async ({ pid }) => { fireAnn(pid); return { ok: true }; });
function announce(user, actor, b, results) {
  const nm = game.modules.get("notifications-manhwa"); if (!nm?.active || !nm.api?.notify || !b.announce) return;
  const thr = Number(setting("announceRate")) || 0.5; const best = results.filter(x => (Number(b.rates?.[x.r]) || 100) <= thr).sort((a, z) => tierRank(z.tier) - tierRank(a.tier) || rankList().indexOf(z.r) - rankList().indexOf(a.r))[0];
  if (!best) return; const c = best.tier === "SSS" ? "#ffffff" : rankColor(best.r);
  try { nm.api.notify({ text: `${actor.name} a obtenu\n${best.n}`, top: `SYNTHÈSE · RANG ${best.r}`, bot: b.name, theme: "custom", colors: { main: c, glow: best.tier === "SSS" ? "#f5c518" : c }, position: "center", duration: best.tier === "SSS" ? 9 : 7, targets: "all", gmToo: true }); } catch (e) { console.warn(MOD, e); }
}

/* ── boutique d'échange ── */
/* enveloppe : le handler tourne sous le verrou du personnage visé */
const lockedByActor = fn => async (d, userId) => { const a = d?.actor ? await fromUuid(d.actor) : null; return a ? actorLock(a, () => fn(d, userId)) : fn(d, userId); };
onGm("buy", lockedByActor(async ({ section, offer, actor: actorUuid, qty }, userId) => {
  const user = game.users.get(userId); const actor = await fromUuid(actorUuid); if (!actor) return { ok: false, msg: "Personnage introuvable." };
  if (!user.isGM && !actor.testUserPermission(user, "OWNER")) return { ok: false, msg: "Ce personnage n'est pas à toi." };
  const sec = shopCfg().sections.find(s => s.id === section); const o = sec?.offers?.find(x => x.key === offer); if (!o) return { ok: false, msg: "Offre introuvable." };
  const q0 = Math.max(1, Math.min(99, Number(qty) || 1)); const q = /^(ph|cs):/.test(String(o.id)) ? 1 : q0; const cur = o.currency || sec.currency || "stellar"; const price = (Number(o.price) || 0) * q;
  const bought = boughtOf(actor, o); if (o.limit && bought + q > o.limit) return { ok: false, msg: `Limite atteinte (${o.limit}${resetOf(o) === "month" ? " ce mois-ci" : resetOf(o) === "week" ? " cette semaine" : ""}).` };
  const e = itemById(o.id); if (!e) return { ok: false, msg: "Objet introuvable." };
  /* cosmétique (carte du joueur ou téléphone) : débloqué, pas d'objet sur la fiche */
  const CA = globalThis.MANHWA?.cosmetics;
  if (e.cosm) { if (!CA?.unlock) return { ok: false, msg: "Cosmétiques indisponibles (Manhwa Sheet à mettre à jour)." }; if (e.gid.startsWith("phone:") && !game.users.some(u => !u.isGM && actor.testUserPermission(u, "OWNER"))) return { ok: false, msg: "Aucun joueur ne possède ce personnage." }; if (CA.owns(actor, e.gid)) return { ok: false, msg: "Déjà débloqué." }; }
  let refund = null;
  if (cur === "gold") { if (goldOf(actor) < price) return { ok: false, msg: "Pas assez de Gold." }; await actor.update({ [`system.resources.${goldKey()}`]: goldOf(actor) - price }); refund = () => actor.update({ [`system.resources.${goldKey()}`]: goldOf(actor) + price }); }
  else { const w = walletOf(actor); if (w[cur] < price) return { ok: false, msg: `Pas assez de ${fragName(cur)}.` }; await actor.update({ [`flags.${MOD}.wallet.${cur}`]: w[cur] - price }); refund = () => actor.update({ [`flags.${MOD}.wallet.${cur}`]: walletOf(actor)[cur] + price }); }
  try {
  if (e.cosm) { await CA.unlock(actor, e.gid, true);
    const rs0 = resetOf(o); await actor.update(rs0 === "none" ? { [`flags.${MOD}.bought.${o.key}`]: bought + 1 } : { [`flags.${MOD}.boughtP.${o.key}`]: { p: periodKey(rs0), n: bought + 1 } });
    return { ok: true, msg: `${e.n} débloqué pour ${actor.name}`, value: true }; }
  let d = null;
  if (e.virtual) d = { name: e.n, type: "item", img: ticketImg(e), system: { rank: e.rang, rarity: e.rar, description: `<p>${esc(e.desc)}</p>`, lore: `<p><em>${esc(e.lore)}</em></p>` }, flags: { [MOD]: { ticket: e.id } } };
  else { const api = catApi(); try { d = api?.itemData ? await api.itemData(e) : null; } catch (err) { console.warn(MOD, err); } if (!d) d = { name: e.n, type: "item", img: catIconPath(e), system: {} }; }
  foundry.utils.setProperty(d, "system.quantity", q); const ex = actor.items.find(it => e.virtual ? it.flags?.[MOD]?.ticket === e.id : it.flags?.[CAT]?.id === e.id && (e.t === "item" || /consommable|munition|ticket/i.test(e.cat || "")));
  if (ex) await ex.update({ "system.quantity": (Number(ex.system?.quantity) || 1) + q }); else await actor.createEmbeddedDocuments("Item", [d]);
  const rs = resetOf(o); await actor.update(rs === "none" ? { [`flags.${MOD}.bought.${o.key}`]: bought + q } : { [`flags.${MOD}.boughtP.${o.key}`]: { p: periodKey(rs), n: bought + q } });
  return { ok: true, msg: `${e.n} ×${q} → ${actor.name}`, value: true };
  } catch (err) { console.error(MOD, "achat interrompu, paiement rendu", err); try { await refund?.(); } catch (e2) { console.error(MOD, e2); } return { ok: false, msg: `Achat interrompu (${err.message}) : paiement rendu.` }; }
}));

/* déconstruction des objets obtenus (fin de synthèse) : l'objet disparaît (ou une unité de la pile) et devient des fragments */
onGm("decon", lockedByActor(async ({ actor: actorUuid, items }, userId) => {
  const user = game.users.get(userId); const actor = await fromUuid(actorUuid); if (!actor || !user) return { ok: false, msg: "Personnage introuvable." };
  if (!user.isGM && !actor.testUserPermission(user, "OWNER")) return { ok: false, msg: "Ce personnage n'est pas à toi." };
  const gain = { stellar: 0, astral: 0 }; const del = [], upd = [], done = []; const left = {};
  for (const { item, stack } of (items || []).slice(0, 20)) { const it = actor.items.get(item); if (!it) continue; const cid = it.flags?.[CAT]?.id; const e = cid ? itemById(cid) : null; const rang = e?.rang || it.system?.rank; if (!rang) continue;
    const q = left[it.id] ?? (Number(it.system?.quantity) || 1); if (q > 1 && stack) { left[it.id] = q - 1; } else if (!del.includes(it.id)) { left[it.id] = 0; del.push(it.id); } else continue;
    const f = fragFor(rang); gain[f.c] += f.n; done.push({ item, c: f.c, n: f.n }); }
  for (const [id, q] of Object.entries(left)) if (q > 0) upd.push({ _id: id, "system.quantity": q });
  if (upd.length) await actor.updateEmbeddedDocuments("Item", upd); if (del.length) await actor.deleteEmbeddedDocuments("Item", del);
  const w = walletOf(actor); if (gain.stellar || gain.astral) await actor.update({ [`flags.${MOD}.wallet`]: { stellar: w.stellar + gain.stellar, astral: w.astral + gain.astral } });
  return { ok: true, value: { gain, done } };
}));

/* MJ : offrir des Tickets Orbis (crée ou empile l'objet ticket sur la fiche) */
export async function giveTickets(actor, ticketId, q) {
  const e = itemById(ticketId); if (!actor || !e?.virtual) return false; q = Math.max(1, Math.min(999, Number(q) || 1));
  return actorLock(actor, async () => {
  const ex = actor.items.find(it => it.flags?.[MOD]?.ticket === e.id);
  if (ex) await ex.update({ "system.quantity": (Number(ex.system?.quantity) || 1) + q });
  else await actor.createEmbeddedDocuments("Item", [{ name: e.n, type: "item", img: ticketImg(e), system: { quantity: q, rank: e.rang, rarity: e.rar, description: `<p>${esc(e.desc)}</p>`, lore: `<p><em>${esc(e.lore)}</em></p>` }, flags: { [MOD]: { ticket: e.id } } }]);
  return true;
  });
}

/* MJ : ajuster un portefeuille */
onGm("wallet", lockedByActor(async ({ actor: actorUuid, cur, delta }, userId) => {
  if (!game.users.get(userId)?.isGM) return { ok: false, msg: "Réservé au MJ." };
  const a = await fromUuid(actorUuid); if (!a) return { ok: false }; const w = walletOf(a); await a.update({ [`flags.${MOD}.wallet.${cur}`]: Math.max(0, w[cur] + Number(delta)) }); return { ok: true };
}));
