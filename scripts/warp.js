/* Gacha Manhwa — fenêtre d'invocation (page des bannières façon HSR), détails, historique, invitation à regarder. */
import { MOD, CAT, esc, absUrl, gi, setting, asset, banners, bannerById, bannerLive, timeLeft, poolOf, rankList, rankColor, tierOf, goldOf, walletOf, fragName, fmt, fmtS, myCharacters, itemById, catIconPath, prefetchVideos, TICKETS, itemPic, pityRank } from "./data.js";
import { gmDo, effectiveRates, ticketPulls, onBroadcast } from "./engine.js";
import { Scene } from "./scene.js";
import { Lobby } from "./lobby.js";
import { Voice, warm, load, playOnce as _playOnce, volPop } from "./audio.js";
const { ApplicationV2, DialogV2 } = foundry.applications.api;

export const badge = (r, cls = "") => `<span class="gm-badge ${cls}" style="--rc:${rankColor(r)}"><svg viewBox="0 0 40 40"><polygon points="20,2 36,11 36,29 20,38 4,29 4,11"/></svg><b>${esc(r)}</b></span>`;
const frIcon = c => `<i class="fr ${c}"></i>`;
export const bgOf = b => b.img?.bg ? `url('${esc(absUrl(b.img.bg))}')` : "none";
export const thumbOf = b => { if (b.img?.thumb) return `url('${esc(absUrl(b.img.thumb))}')`; if (b.img?.bg) return bgOf(b); if (b.img?.art) return `url('${esc(absUrl(b.img.art))}')`; const p = (b.showcase || []).concat(b.featured || []).map(id => itemPic(itemById(id))).find(Boolean); return p ? `url('${esc(p)}')` : "none"; };
export const playOnce = _playOnce;

/** réduit la police d'un titre jusqu'à ce qu'il tienne dans sa boîte (lignes max) */
export function fitText(el, { max = 30, min = 15, lines = 3 } = {}) { if (!el) return; let fs = max; el.style.fontSize = fs + "px"; const lh = () => parseFloat(getComputedStyle(el).lineHeight) || fs * 1.1; let guard = 30; while (guard-- > 0 && fs > min && (el.scrollHeight > lh() * lines + 2 || el.scrollWidth > el.clientWidth + 1)) { fs -= 1; el.style.fontSize = fs + "px"; } }

/** jauge de garantie (pitié) : tirages faits / garantie, avec la zone où la chance monte */
function pityGauge(b, st) { const hard = Number(b.pity.hard) || 90, soft = Math.min(hard, Number(b.pity.soft) || hard), n = Math.min(hard, Number(st.n) || 0), left = Math.max(0, hard - n), hot = n + 1 >= soft; const rk = pityRank(b);
  return `<div class="gw-pity${hot ? " hot" : ""}" title="Tirages depuis le dernier objet de rang ${esc(rk)} ou mieux. À partir du ${soft}e la chance augmente ; au ${hard}e il est garanti."><div class="lb"><i class="fa-solid fa-hourglass-half"></i><span>Garantie ${esc(rk)}</span><b>${n}<em>/${hard}</em></b><small>${left ? `encore ${left}` : "garanti"}</small></div><div class="bar"><s style="left:${(soft - 1) / hard * 100}%"></s><i style="width:${n / hard * 100}%"></i></div></div>`; }
/** objets montrés sur la bannière : la vitrine choisie dans l'éditeur, sinon ceux à l'affiche, sinon les meilleurs objets réellement tirables */
export function showcaseOf(b, max = 6) {
  const ids = [...(b.showcase || []), ...(b.featured || [])]; const seen = new Set(); const out = [];
  for (const id of ids) { if (seen.has(id)) continue; seen.add(id); const e = itemById(id); if (e) out.push(e); if (out.length >= max) return out; }
  if (out.length) return out;
  const pool = poolOf(b); const L = rankList(); const tops = L.slice().reverse().filter(r => (Number(b.rates?.[r]) || 0) > 0 && (pool[r] || []).length);
  for (const r of tops) { const list = (pool[r] || []).slice().sort((x, y) => (itemPic(y) ? 1 : 0) - (itemPic(x) ? 1 : 0)); for (const e of list) { out.push(e); if (out.length >= max) return out; } }
  return out;
}
const miniCard = (e, i) => { const p = itemPic(e); return `<div class="gw-mc${i === 0 ? " on" : ""}" style="--rc:${rankColor(e.rang)}" title="${esc(e.n)} · rang ${esc(e.rang)}${e.rar ? " · " + esc(e.rar) : ""}">${p ? `<img src="${esc(p)}" alt="">` : `<i class="ico" style="--ico:url('${esc(catIconPath(e))}')"></i>`}${badge(e.rang, "sm")}<span>${esc(e.n)}</span></div>`; };
/** taux affichés sur la bannière (rangs qui peuvent sortir) */
function ratesLine(b) { const L = rankList().slice().reverse().filter(r => (Number(b.rates?.[r]) || 0) > 0); if (!L.length) return "";
  return `<div class="gw-rates">${L.map(r => `<span style="--rc:${rankColor(r)}"><b>${esc(r)}</b>${(Number(b.rates[r]) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} %</span>`).join("")}</div>`; }
/** contenu de la zone principale d'une bannière (page d'invocation et aperçu de l'éditeur) ; ph = repères des emplacements vides */
export function bannerMainHTML(b, { actor = null, ph = false } = {}) {
  const live = bannerLive(b); const feats = (b.featured || []).map(itemById).filter(Boolean); const top1 = feats[0] || itemById((b.showcase || [])[0]);
  const st = actor?.flags?.[MOD]?.pity?.[b.group || b.id] || {}; const pityLeft = b.pity?.on ? Math.max(0, (Number(b.pity.hard) || 90) - (Number(st.n) || 0)) : null;
  const ax = Number(b.art?.x ?? 62), ay = Number(b.art?.y ?? 50), asc = (Number(b.art?.scale) || 100) / 100;
  const art = b.img?.art ? `<img class="gw-art" data-drag="art" src="${esc(b.img.art)}" style="left:${ax}%;top:${ay}%;--sc:${asc}" draggable="false">`
    : ph ? `<div class="gw-ph art" data-drag="art" style="left:${ax}%;top:${ay}%;--sc:${asc}"><b>ILLUSTRATION</b><small>personnage ou objet · PNG détouré<br>glisse-moi · molette = taille</small></div>`
    : (top1 ? `<div class="gw-art gen" style="--rc:${rankColor(top1.rang)};left:${ax}%;top:${ay}%;--sc:${asc}">${itemPic(top1) ? `<img class="pic" src="${esc(itemPic(top1))}" alt="">` : `<i class="ico" style="--ico:url('${esc(catIconPath(top1))}')"></i>`}</div>` : "");
  return `<div class="gw-bg"></div>${!b.img?.bg && ph ? `<div class="gw-ph bg"><b>FOND</b><small>image paysage 16:9 · 1920 × 1080 conseillé</small></div>` : ""}${art}<div class="gw-veil"></div>
    ${b.img?.logo ? `<img class="gw-logo" src="${esc(b.img.logo)}">` : ph ? `<div class="gw-ph logo"><b>LOGO</b><small>titre graphique · PNG</small></div>` : ""}
    <div class="gw-card"><span class="tag${b.kind === "limited" ? " lim" : ""}"><b>${esc(b.tag || (b.kind === "limited" ? "Synthèse limitée" : "Synthèse permanente"))}</b></span><h2 class="fit">${esc(b.name)}</h2><p class="sub">${esc(b.sub || (b.end ? "Disponible pour une durée limitée" : "Disponible en permanence"))}</p>
      ${(() => { const sc = showcaseOf(b); const pr = b.pity?.on ? `<div class="gw-guar"><i class="fa-solid fa-shield-halved"></i> Rang <b style="color:${rankColor(pityRank(b))}">${esc(pityRank(b))}</b> ou mieux garanti au ${Number(b.pity.hard) || 90}<sup>e</sup> tirage${pityLeft != null && actor ? ` · encore <b>${pityLeft}</b>` : ""}</div>` : "";
        return `${sc.length ? `<h5 class="gw-sh">À gagner</h5><div class="gw-show n${Math.min(6, sc.length)}">${sc.map(miniCard).join("")}</div>` : `<p class="nofeat">${esc(b.lore || "Tous les objets de la bannière peuvent apparaître.")}</p>`}${ratesLine(b)}${pr}`; })()}</div>
    ${top1 ? `<div class="gw-label"><span class="nm">${esc(top1.n)}</span><span class="rk">${badge(top1.rang)}<em>${esc(top1.rar || "")}</em></span></div>` : ""}
    <div class="gw-info">${b.g10?.on ? `<span><i class="fa-solid fa-shield-halved"></i> Tous les 10 tirages : un objet de rang <b>${esc(b.g10.min)}</b> ou mieux est garanti</span>` : ""}${pityLeft != null ? pityGauge(b, st) : ""}${b.featured?.length && b.featGuarantee ? (st.g ? `<span class="ff won" title="Le dernier objet de haut rang n'était pas à l'affiche : le prochain le sera."><i class="fa-solid fa-star"></i> 50/50 : <b>prochain haut rang garanti à l'affiche</b></span>` : `<span class="ff" title="Au prochain objet de rang S ou mieux : ${Number(b.featRate) || 50} % de chance qu'il soit à l'affiche. Perdu, le suivant est garanti."><i class="fa-solid fa-scale-balanced"></i> 50/50 : <b>en jeu</b></span>`) : ""}${!live && !ph ? `<span class="off"><i class="fa-solid fa-eye-slash"></i> Fermée aux joueurs (visible par le MJ)</span>` : ""}</div>
    ${b.end ? `<div class="gw-count"><i class="fa-regular fa-clock"></i>${esc(timeLeft(b))}</div>` : ""}`;
}

/* musique d'ambiance de la page (Website BGM) */
const BGM = { v: new Voice(), on: false, start() { if (this.on) return; this.on = true; this.v.startMusic("bgm", 0.45, { fadeIn: 1.2 }); }, stop() { this.on = false; this.v.stopMusic(0.8); }, duck(d) { if (!this.on) { if (!d && WarpApp.instance?.rendered) this.start(); return; } this.v.fade(d ? 0 : 0.45, 0.6); } };
Hooks.on("gachaSceneClosed", () => { if (WarpApp.instance?.rendered && !WarpApp.instance.minimized && !WarpApp.instance._msFsMin) BGM.duck(false); });
document.addEventListener("visibilitychange", () => { if (Scene.current || !WarpApp.instance?.rendered) return; if (document.hidden) BGM.duck(true); else if (!WarpApp.instance.minimized && !WarpApp.instance._msFsMin) BGM.duck(false); });

/** barres du haut et du bas : on retire des détails par paliers tant que ça déborde (quelle que soit la police ou la taille de la fenêtre) */
export function fitBars(root) {
  if (!root) return;
  for (const [sel, levels] of [[".gw-bar", ["c1", "c2", "c3", "c4", "c5"]], [".gw-top", ["t1", "t2", "t3"]]]) {
    const bar = root.querySelector(sel); if (!bar) continue; bar.classList.remove(...levels); bar.classList.add("measure");
    for (const lv of levels) { if (bar.scrollWidth <= bar.clientWidth + 1) break; bar.classList.add(lv); }
    bar.classList.remove("measure");
  }
}
export class WarpApp extends ApplicationV2 {
  static MIN_SIZE = { w: 560, h: 480 }; /* taille minimale (appliquée par Manhwa Sheet) */
  static instance = null;
  static DEFAULT_OPTIONS = { id: "gm-warp", classes: ["gm-app", "gm-warp", "ms-fsable"], window: { title: "Appel des Étoiles", icon: "fa-solid fa-wand-magic-sparkles", resizable: true }, position: { width: 1280, height: 760 } };
  static open(opts = {}) { let a = WarpApp.instance; if (!a) a = WarpApp.instance = new WarpApp(); if (opts.banner) a.sel = opts.banner; if (opts.actor) a.actorId = opts.actor; a.render({ force: true }); return a; }
  constructor(o) { super(o); this.sel = null; this.actorId = null; this.pay = "gold"; this.busy = false; }
  get actor() { const l = myCharacters(); return l.find(a => a.id === this.actorId) || l[0] || null; }
  list() { const all = banners(); return game.user.isGM ? all : all.filter(b => bannerLive(b)); }
  async _renderHTML() {
    const L = this.list(); let b = L.find(x => x.id === this.sel) || L[0]; this.sel = b?.id || null; const a = this.actor; const gm = game.user.isGM;
    const chars = myCharacters();
    const top = `<header class="gw-top"><div class="ttl">${gi("fa-wand-magic-sparkles", "embWarp", "ttl-ic")}<div><small>Synthétiseur</small><b>${esc(b?.name || "Aucune bannière")}</b></div></div>
      <div class="wal">${chars.length > 1 ? `<select data-k="actor">${chars.map(c => `<option value="${c.id}"${c.id === a?.id ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select>` : a ? `<span class="who">${esc(a.name)}</span>` : ""}
      ${a ? `<span class="cur g" title="Gold">${gi("fa-coins", "coin")}${fmtS(goldOf(a))}</span>${b?.tickets?.length ? `<span class="cur t" title="Tirages en tickets">${gi("fa-ticket", "ticketStd")}${fmt(ticketPulls(a, b))}</span>` : ""}<span class="cur s" title="${esc(fragName("stellar"))}">${frIcon("stellar")}${fmtS(walletOf(a).stellar)}</span><span class="cur a" title="${esc(fragName("astral"))}">${frIcon("astral")}${fmtS(walletOf(a).astral)}</span>` : ""}
      <button class="tb vol" data-a="vol" title="Volume (musique / effets)"><i class="fa-solid fa-sliders"></i></button>
      ${gm ? `<button class="tb" data-a="edit" title="Éditer les bannières">${gi("fa-pen-ruler", "icGear")}<span>Éditer</span></button><button class="tb" data-a="gmtools" title="Outils du MJ : offrir des tirages, forcer un résultat">${gi("fa-crown", "icInfo")}<span>MJ</span></button><button class="tb" data-a="demo" title="Tester les animations">${gi("fa-clapperboard", "icDemo")}<span>Animations</span></button>` : ""}</div></header>`;
    if (!b) return `<div class="gw empty">${top}<div class="gw-none"><i class="fa-solid fa-moon"></i><p>${gm ? "Aucune bannière. Crée la première dans l'éditeur." : "Aucune bannière ouverte pour le moment."}</p>${gm ? '<button data-a="edit">Ouvrir l\'éditeur</button>' : ""}</div></div>`;
    const thumbs = L.map(x => `<a class="th${x.id === b.id ? " on" : ""}${bannerLive(x) ? "" : " off"}" data-a="sel" data-id="${x.id}" style="--b1:${esc(x.color)};--b2:${esc(x.color2)};--img:${thumbOf(x)}"><span>${esc(x.name)}</span>${x.end ? `<em>${esc(timeLeft(x))}</em>` : ""}</a>`).join("");
    const cost1 = Number(b.cost?.x1) || 0, cost10 = Number(b.cost?.x10) || 0; const tix = a ? ticketPulls(a, b) : 0; const hasT = (b.tickets || []).length;
    const pay = hasT && this.pay === "ticket" ? "ticket" : "gold";
    const price = n => pay === "ticket" ? `${gi("fa-ticket", "ticketStd")}<span>× ${n}</span>` : `${gi("fa-coins", "coin")}<span>${fmtS(n === 10 ? cost10 : cost1)}</span>`;
    return `<div class="gw" style="--b1:${esc(b.color)};--b2:${esc(b.color2)}">${top}
      <aside class="gw-list">${thumbs}</aside>
      <section class="gw-main${b.img?.bg ? "" : " gen"}${b.kind === "limited" ? " lim" : ""}" style="--bg:${bgOf(b)}">${bannerMainHTML(b, { actor: a })}</section>
      <footer class="gw-bar"><div class="l">${[["details", "fa-circle-info", "icInfo", "Infos", "Détails : taux, garantie, règles"], ["history", "fa-clock-rotate-left", "icHistory", "Historique", "Historique des synthèses"], ["shop", "fa-store", "icShop", "Boutique", "Boutique stellaire"]].map(([a, fa, k, cap, tip], i) => `<button data-a="${a}" class="med" style="--d:${i * -0.9}s" title="${tip}"><span class="md"><i class="ring"></i><i class="glow"></i>${gi(fa, k)}<i class="spk s1"></i><i class="spk s2"></i><i class="spk s3"></i></span><span class="cap">${cap}</span></button>`).join("")}</div>
        <div class="r">${hasT ? `<div class="paym"><button data-a="pay" data-v="gold" class="${pay === "gold" ? "on" : ""}" title="Payer en Gold"><i class="fa-solid fa-coins"></i></button><button data-a="pay" data-v="ticket" class="${pay === "ticket" ? "on" : ""}" title="${fmt(tix)} tirage(s) en tickets"><i class="fa-solid fa-ticket"></i></button></div>` : ""}
          <button class="pull" data-a="pull" data-n="1"${this.busy ? " disabled" : ""}><span class="c">${price(1)}</span><b><i class="st">✦</i><span class="w">Synthétiser</span> ×1</b></button><button class="pull x10" data-a="pull" data-n="10"${this.busy ? " disabled" : ""}><span class="c">${price(10)}</span><b><i class="st">✦</i><span class="w">Synthétiser</span> ×10</b></button></div></footer></div>`;
  }
  _replaceHTML(html, content) { content.innerHTML = html; content.querySelectorAll("[data-a]").forEach(el => el.addEventListener(el.tagName === "SELECT" ? "change" : "click", ev => this.act(el.dataset.a, el, ev))); content.querySelector('[data-k="actor"]')?.addEventListener("change", ev => { this.actorId = ev.target.value; this.render(); }); requestAnimationFrame(() => this.fitAll()); document.fonts?.ready?.then(() => this.rendered && this.fitAll()); }
  /** titres adaptables : la taille suit la largeur de la carte / de l'écran, sur 2 lignes au plus (1.19) */
  fitAll() { const c = this.element; if (!c) return; const card = c.querySelector(".gw-card"); const cw = card?.clientWidth || 300;
    fitText(c.querySelector(".gw-card h2"), { max: Math.max(22, Math.min(64, Math.round(cw / 6.4))), min: 15, lines: 2 }); fitText(c.querySelector(".gw-card .tag b"), { max: Math.max(12, Math.min(22, Math.round(cw / 17))), min: 10, lines: 1 });
    fitText(c.querySelector(".gw-label .nm"), { max: Math.max(18, Math.min(34, Math.round((c.clientWidth || 1200) / 52))), min: 13, lines: 2 }); fitBars(c); }
  _onFirstRender() { warm(); prefetchVideos(); if (game.settings.get(MOD, "anim3d") !== false) import("./hyper3d.js").then(m => { m.loadThree(); m.loadTram(); }).catch(() => {}); try { let t = 0; this._ro = new ResizeObserver(() => { cancelAnimationFrame(t); t = requestAnimationFrame(() => this.fitAll()); }); this._ro.observe(this.element); } catch (e) {} load("bgm").then(() => { if (this.rendered) BGM.start(); }); }
  _onClose() { BGM.stop(); this._ro?.disconnect(); WarpApp.instance = null; }
  /* musique coupée quand la fenêtre est réduite ou l'onglet du navigateur caché */
  /** plein écran (Manhwa Sheet ≥ 1.29) : réduite en barre → musique coupée */
  onFsMinimize(min) { if (min) BGM.duck(true); else if (!Scene.current) BGM.duck(false); }
  async minimize() { await super.minimize(); BGM.duck(true); } async maximize() { await super.maximize(); if (!Scene.current) BGM.duck(false); }
  async act(a, el) {
    const b = bannerById(this.sel);
    if (a === "sel") { this.sel = el.dataset.id; return this.render(); }
    if (a === "pay") { this.pay = el.dataset.v; return this.render(); }
    if (a === "edit") return (await import("./editor.js")).EditorApp.open(this.sel);
    if (a === "vol") return volPop(el);
    if (a === "demo") return demoMenu();
    if (a === "gmtools") return gmTools(b);
    if (a === "details") return b && detailsDialog(b, this.actor);
    if (a === "history") return HistoryApp.open();
    if (a === "shop") { const { ShopApp } = await import("./shop.js"); const back = this._msBack, pos = { ...this.position }, actorId = this.actor?.id; const { whenRendered } = await import("./main.js");
      if (!globalThis.MANHWA?.attachBack) return ShopApp.open(actorId);
      const fromMenu = this._msFromMenu; await this.close({ animate: false }); const s = await whenRendered(ShopApp.open(actorId)); s.setPosition(pos); s._msFromMenu = fromMenu;
      globalThis.MANHWA.attachBack(s, async () => { const w2 = await whenRendered(WarpApp.open({ actor: actorId })); w2.setPosition({ ...s.position }); w2._msFromMenu = fromMenu; if (back) globalThis.MANHWA.attachBack(w2, back, "Menu"); }, "Appel des Étoiles"); return; }
    if (a === "pull") return this.pull(Number(el.dataset.n) || 1);
  }
  async pull(n, src = "page") {
    /* garde-fous (1.17.1) : jamais deux synthèses à la suite sans un vrai clic — pas pendant une scène, pas deux fois en moins d'une seconde */
    const now = Date.now(); if (Scene.current && !Scene.current.observer) { console.warn(MOD, "synthèse refusée : une scène est déjà en cours"); return; }
    if (now - (this._lastPull || 0) < 1200) { console.warn(MOD, "synthèse refusée : trop rapprochée de la précédente"); return; } this._lastPull = now;
    try { document.activeElement?.blur?.(); } catch (e) {}   /* le bouton ne garde pas le focus : Entrée / Espace ne relancent pas une synthèse */
    const b = bannerById(this.sel); const actor = this.actor; if (!b || !actor || this.busy) { if (!actor) ui.notifications.warn("Aucun personnage : assigne-toi un personnage."); return; }
    const pay = (b.tickets || []).length && this.pay === "ticket" ? "ticket" : "gold";
    if (pay === "gold") { const cost = Number(n === 10 ? b.cost?.x10 : b.cost?.x1) || 0; if (goldOf(actor) < cost) return ui.notifications.warn(`Pas assez de Gold (${fmt(cost)} requis).`); }
    if (pay === "ticket" && ticketPulls(actor, b) < n) return ui.notifications.warn("Pas assez de tickets.");
    this.busy = true; this.render();
    /* lobby : les autres joueurs peuvent rejoindre avant le lancement */
    let lobby = null; const others = game.users.filter(u => u.active && u.id !== game.user.id).length;
    if (setting("lobbyOn") && setting("lobbyAccept") !== "solo" && others) { BGM.duck(true); lobby = await Lobby.host({ banner: b, actor, n }); if (!lobby) { this.busy = false; this.render(); BGM.duck(false); return; } }
    playOnce("pay", 0.8);
    const show = await gmDo("pull", { banner: b.id, actor: actor.uuid, count: n, pay, lid: lobby?.lid || null, members: lobby?.members || [] });
    this.busy = false; this.render(); if (!show) { Lobby.current?.close(false); return; }
    BGM.duck(true); Scene.play(show, { onAgain: k => this.pull(k, "again"), startAt: show.at, members: show.members, onStart: () => Lobby.current?.close() });
  }
}

/* ── détails : taux, lots, règles ── */
export function detailsDialog(b, actor) {
  const pool = poolOf(b); const st = actor?.flags?.[MOD]?.pity?.[b.group || b.id] || {}; const eff = effectiveRates(b, st);
  const rows = rankList().slice().reverse().map(r => `<tr><td>${badge(r, "sm")}</td><td class="n">${(Number(b.rates?.[r]) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} %</td>${b.pity?.on ? `<td class="n">${eff[r].toLocaleString("fr-FR", { maximumFractionDigits: 3 })} %</td>` : ""}<td class="n">${(pool[r] || []).length}</td></tr>`).join("");
  const feats = (b.featured || []).map(itemById).filter(Boolean);
  const content = `<div class="gm-details"><p class="lore">${esc(b.lore || "")}</p><table><thead><tr><th>Rang</th><th>Taux</th>${b.pity?.on ? "<th>Prochain tirage</th>" : ""}<th>Lots</th></tr></thead><tbody>${rows}</tbody></table>
    ${feats.length ? `<h4>À l'affiche</h4><ul class="feats">${feats.map(e => `<li>${badge(e.rang, "sm")} ${esc(e.n)}</li>`).join("")}</ul><p class="rule">Quand un objet d'un rang mis à l'affiche sort, il a <b>${Number(b.featRate) || 50} %</b> de chances d'être l'objet à l'affiche${b.featGuarantee ? ", et si ce n'est pas le cas, le suivant l'est forcément" : ""}.</p>` : ""}
    <h4>Règles</h4><ul class="rules"><li>Coût : ${fmt(b.cost?.x1)} Gold le tirage, ${fmt(b.cost?.x10)} Gold les 10${(b.tickets || []).length ? ", ou des tickets" : ""}.</li>
    <li>${b.pity?.on ? `Pitié : à partir du ${b.pity.soft}<sup>e</sup> tirage sans objet de rang ${esc(pityRank(b))} ou mieux, la chance augmente de ${b.pity.step} % par tirage ; au ${b.pity.hard}<sup>e</sup>, il est garanti. Le compteur ${b.group ? `est partagé par les bannières « ${esc(b.group)} »` : "est propre à cette bannière"}.` : "Pas de pitié : chaque tirage est indépendant."}</li>
    <li>${b.g10?.on ? `Tous les 10 tirages, un objet de rang ${esc(b.g10.min)} ou mieux est garanti.` : "Pas de minimum garanti sur 10 tirages."}</li>
    <li>${b.dup === "stack" ? "Un objet déjà possédé s'ajoute à la pile." : `Un objet déjà possédé devient des fragments (${esc(fragName("stellar"))} pour les rangs bas, ${esc(fragName("astral"))} pour les rangs élevés), à dépenser dans la Boutique stellaire.`}</li>
    ${b.end ? `<li>Fin : ${new Date(b.end).toLocaleString("fr-FR")} (${esc(timeLeft(b))}).</li>` : ""}${b.season ? `<li>Liée à la saison : ${esc(b.season)}.</li>` : ""}</ul></div>`;
  return DialogV2.prompt({ window: { title: `${b.name} — Détails`, icon: "fa-solid fa-circle-info" }, classes: ["gm-app", "gm-dialog"], position: { width: 560 }, content, ok: { label: "Fermer" }, rejectClose: false });
}

/* ── historique : un onglet par joueur, visible par tous ── */
export class HistoryApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = { id: "gm-history", classes: ["gm-app", "gm-history"], window: { title: "Historique des synthèses", icon: "fa-solid fa-clock-rotate-left", resizable: true }, position: { width: 820, height: 620 } };
  static open() { const a = foundry.applications.instances.get("gm-history") || new HistoryApp(); a.render({ force: true }); return a; }
  constructor(o) { super(o); this.user = game.user.id; this.banner = ""; this.page = 0; }
  async _renderHTML() {
    const H = setting("history") || {}; const users = game.users.filter(u => (H[u.id] || []).length || u.id === game.user.id);
    if (!users.some(u => u.id === this.user)) this.user = users[0]?.id || game.user.id;
    const list = (H[this.user] || []).filter(r => !this.banner || r.b === this.banner); const bns = [...new Map((H[this.user] || []).map(r => [r.b, r.bn])).entries()];
    const rows = []; for (const r of list) for (const x of r.res) rows.push({ r, x });
    const per = 60, pages = Math.max(1, Math.ceil(rows.length / per)); this.page = Math.min(this.page, pages - 1); const vis = rows.slice(this.page * per, this.page * per + per);
    const cnt = {}; for (const { x } of rows) cnt[tierOf(x.r)] = (cnt[tierOf(x.r)] || 0) + 1;
    return `<div class="gh"><nav>${users.map(u => `<a data-u="${u.id}" class="${u.id === this.user ? "on" : ""}" style="--uc:${u.color?.css ?? u.color}"><i></i>${esc(u.name)}<em>${(H[u.id] || []).reduce((s, r) => s + r.res.length, 0)}</em></a>`).join("")}</nav>
      <div class="gh-main"><div class="gh-bar"><select data-k="banner"><option value="">Toutes les bannières</option>${bns.map(([id, n]) => `<option value="${esc(id)}"${id === this.banner ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>
        <div class="sum">${rows.length} tirage(s) · <b class="t-SSS">${cnt.SSS || 0} SSS</b> · <b class="t-SS">${cnt.SS || 0} SS</b> · <b class="t-S">${cnt.S || 0} S</b> · <b class="t-mid">${cnt.mid || 0} A/B</b></div>${game.user.isGM ? `<button data-a="clear" title="Effacer l'historique de ce joueur"><i class="fa-solid fa-trash"></i></button>` : ""}</div>
        <table><thead><tr><th>Objet</th><th>Rang</th><th>Bannière</th><th>Personnage</th><th>Date</th></tr></thead><tbody>${vis.map(({ r, x }) => `<tr class="t-${tierOf(x.r)}"><td class="nm">${esc(x.n)}${x.feat ? ' <span class="feat">À L\'AFFICHE</span>' : ""}${x.dup ? ` <span class="dup">${x.frag ? `+${x.frag.n} ${frIcon(x.frag.c)}` : "×2"}</span>` : ""}</td><td>${badge(x.r, "sm")}</td><td>${esc(r.bn)}</td><td>${esc(r.a)}</td><td class="d">${new Date(r.t).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td></tr>`).join("") || `<tr><td colspan="5" class="none">Aucune synthèse.</td></tr>`}</tbody></table>
        ${pages > 1 ? `<div class="gh-pg"><button data-a="prev"${this.page ? "" : " disabled"}>‹</button><span>${this.page + 1} / ${pages}</span><button data-a="next"${this.page < pages - 1 ? "" : " disabled"}>›</button></div>` : ""}</div></div>`;
  }
  _replaceHTML(html, c) { c.innerHTML = html; c.querySelectorAll("[data-u]").forEach(e => e.addEventListener("click", () => { this.user = e.dataset.u; this.page = 0; this.banner = ""; this.render(); }));
    c.querySelector('[data-k="banner"]')?.addEventListener("change", e => { this.banner = e.target.value; this.page = 0; this.render(); });
    c.querySelectorAll("[data-a]").forEach(e => e.addEventListener("click", async () => { const a = e.dataset.a; if (a === "prev") this.page--; if (a === "next") this.page++; if (a === "clear") { const ok = await DialogV2.confirm({ window: { title: "Effacer l'historique" }, content: `<p>Effacer tout l'historique de ${esc(game.users.get(this.user)?.name)} ?</p>`, classes: ["gm-app", "gm-dialog"] }); if (!ok) return; await gmDo("clearHistory", { user: this.user }); } this.render(); })); }
}
Hooks.on("updateSetting", s => { if (s.key === `${MOD}.history`) foundry.applications.instances.get("gm-history")?.render(); if (s.key === `${MOD}.banners`) WarpApp.instance?.render(); });
Hooks.on("updateActor", a => { const w = WarpApp.instance; if (w?.rendered && w.actor?.id === a.id && !w.busy) w.render(); });

/* ── invitation à regarder l'invocation d'un autre joueur ── */
onBroadcast("show", (show, from) => {
  if (show.user === game.user.id) return;
  if (show.lid) { const L = Lobby.current; if (L && !L.isHost && L.st.lid === show.lid && (show.members || []).some(m => m.user === game.user.id)) { Scene.play(show, { observer: true, startAt: show.at, members: show.members, onStart: () => L.close() }); } else if (L && L.st.lid === show.lid) L.close(); return; }
  const mode = setting("watch"); if (mode === "never") return; warm();
  if (mode === "always") return Scene.play(show, { observer: true });
  const box = document.getElementById("gm-invites") || Object.assign(document.body.appendChild(document.createElement("div")), { id: "gm-invites" });
  const el = document.createElement("div"); el.className = `gm-invite t-${show.best}`; el.style.setProperty("--b1", show.banner?.color || "#6f8cff");
  el.innerHTML = `${gi("fa-wand-magic-sparkles", "icAnnounce", "inv")}<div><b>${esc(show.actor?.name)}</b> lance une synthèse ×${show.n}<small>${esc(show.banner?.name)}</small></div><button data-w>Regarder</button><button data-x title="Ignorer"><i class="fa-solid fa-xmark"></i></button>`;
  box.appendChild(el); const kill = () => { el.classList.add("out"); setTimeout(() => el.remove(), 300); };
  el.querySelector("[data-w]").onclick = () => { kill(); Scene.play(show, { observer: true }); }; el.querySelector("[data-x]").onclick = kill; setTimeout(kill, 14000);
});

/* ── aperçu des animations (MJ) ── */
/** outils du MJ : offrir des Tickets Orbis, imposer le prochain résultat d'un personnage */
export async function gmTools(b) {
  const chars = game.actors.filter(a => a.type === "character" && a.hasPlayerOwner); if (!chars.length) return ui.notifications.warn("Aucun personnage de joueur.");
  const opts = chars.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  const what = await DialogV2.wait({ window: { title: "Outils du MJ", icon: "fa-solid fa-crown" }, classes: ["gm-app", "gm-dialog"], content: `<p>Que veux-tu faire ?</p>`, buttons: [{ action: "gift", label: "Offrir des tirages", icon: "fa-solid fa-gift", default: true }, { action: "force", label: "Forcer un résultat", icon: "fa-solid fa-wand-magic" }, { action: "unforce", label: "Annuler un résultat forcé", icon: "fa-solid fa-xmark" }], rejectClose: false });
  if (what === "gift") {
    const r = await DialogV2.wait({ window: { title: "Offrir des tirages", icon: "fa-solid fa-gift" }, classes: ["gm-app", "gm-dialog"], content: `<div class="gm-form"><label>Personnages <select name="who" multiple size="${Math.min(6, chars.length)}">${opts}</select></label><label>Ticket <select name="tk">${Object.values(TICKETS).map(t => `<option value="${t.id}">${esc(t.n)}</option>`).join("")}</select></label><label>Nombre <input type="number" name="q" min="1" max="999" value="10"></label><label>Message (chat) <input type="text" name="msg" placeholder="Récompense de fin de mission…"></label></div>`,
      buttons: [{ action: "ok", label: "Offrir", default: true, callback: (ev, btn) => ({ who: [...btn.form.who.selectedOptions].map(o => o.value), tk: btn.form.tk.value, q: Number(btn.form.q.value) || 1, msg: btn.form.msg.value }) }, { action: "cancel", label: "Annuler" }], rejectClose: false });
    if (!r || r === "cancel" || !r.who.length) return; const { giveTickets } = await import("./engine.js"); const tk = TICKETS[r.tk];
    for (const id of r.who) await giveTickets(game.actors.get(id), r.tk, r.q);
    const names = r.who.map(id => game.actors.get(id)?.name).filter(Boolean);
    ChatMessage.create({ content: `<div class="gm-chat gift"><header><i class="fa-solid fa-gift"></i><div><small>ORBIS ASTRA</small><b>${esc(tk.n)} ×${r.q}</b></div></header><p>${esc(names.join(", "))}${r.msg ? ` — ${esc(r.msg)}` : ""}</p></div>` });
    return ui.notifications.info(`${tk.n} ×${r.q} → ${names.join(", ")}`);
  }
  if (what === "force" || what === "unforce") {
    const L = banners(); const r = await DialogV2.wait({ window: { title: what === "force" ? "Forcer un résultat" : "Annuler un résultat forcé", icon: "fa-solid fa-wand-magic" }, classes: ["gm-app", "gm-dialog"], content: `<div class="gm-form"><label>Personnage <select name="who">${chars.map(c => `<option value="${c.id}">${esc(c.name)}${c.flags?.[MOD]?.force ? " ★ (déjà forcé)" : ""}</option>`).join("")}</select></label>${what === "force" ? `<label>Bannière <select name="b"><option value="">N'importe laquelle</option>${L.map(x => `<option value="${x.id}"${x.id === b?.id ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label><p class="hint">À la prochaine synthèse de ce personnage (sur cette bannière), un des tirages donnera l'objet choisi. Rien ne l'indique aux joueurs.</p>` : ""}</div>`,
      buttons: [{ action: "ok", label: what === "force" ? "Choisir l'objet…" : "Annuler le forçage", default: true, callback: (ev, btn) => ({ who: btn.form.who.value, b: btn.form.b?.value || "" }) }, { action: "cancel", label: "Fermer" }], rejectClose: false });
    if (!r || r === "cancel") return; const actor = game.actors.get(r.who);
    if (what === "unforce") { await actor.unsetFlag(MOD, "force"); return ui.notifications.info(`Plus de résultat forcé pour ${actor.name}.`); }
    const { catSearch } = await import("./editor.js"); const ids = await catSearch({ title: `Objet imposé à ${actor.name}`, multi: false }); const id = Array.isArray(ids) ? ids[0] : ids; if (!id) return;
    await actor.setFlag(MOD, "force", { id, banner: r.b, t: Date.now() }); return ui.notifications.info(`${actor.name} obtiendra « ${itemById(id)?.n || id} » à sa prochaine synthèse.`);
  }
}
export async function demoMenu() {
  const { demoShow } = await import("./scene.js");
  let fake = false; const cb = (ev, btn) => { fake = !!btn.form?.fake?.checked; return btn.dataset.action; };
  const t = await DialogV2.wait({ window: { title: "Tester les animations", icon: "fa-solid fa-clapperboard" }, classes: ["gm-app", "gm-dialog"], content: `<p>Rejoue une synthèse ×10 fictive (aucun objet créé, rien n'est dépensé) avec, au milieu, un objet du palier choisi.</p><label class="gm-check"><input type="checkbox" name="fake"> Fausse alerte de rareté (rangs S, SS, SSS)</label>`,
    buttons: [{ action: "low", label: "Commun", callback: cb }, { action: "mid", label: "A / B", callback: cb }, { action: "S", label: "Rang S", callback: cb }, { action: "SS", label: "Rang SS", callback: cb }, { action: "SSS", label: "Rang SSS", default: true, callback: cb }], rejectClose: false });
  if (!t) return; const lower = { S: "mid", SS: "S", SSS: "SS" }; BGM.duck(true); Scene.play(demoShow(t, fake && lower[t] ? lower[t] : null), {});
}
Hooks.on("manhwaSeason", () => WarpApp.instance?.render());
