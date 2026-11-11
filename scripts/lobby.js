/* Gacha Manhwa — lobby d'invocation : avant le tirage, le lanceur attend les spectateurs (médaillons en bas à gauche),
 * puis lance ; tous voient la même scène au même instant (heure du serveur). */
import { MOD, esc, setting, asset, absUrl, img, gi, relationOf, userActor, uid, prefetchVideos } from "./data.js";
import { broadcast, onBroadcast } from "./engine.js";
import { Voice, warm, load } from "./audio.js";

const REL = { group: { cls: "group", key: "embGroup", label: "Groupe" }, friend: { cls: "friend", key: "embFriend", label: "Ami" }, other: { cls: "other", key: "embComm", label: "Communauté" } };
export function medal(m, { small = false, host = false } = {}) {
  const u = game.users.get(m.user); if (!u) return ""; const r = REL[m.rel] || REL.other; const av = u.avatar || userActor(u)?.img || "icons/svg/mystery-man.svg"; const e = img(r.key);
  return `<div class="gm-medal ${r.cls}${small ? " sm" : ""}${m.status === "pending" ? " pending" : ""}" data-u="${u.id}" style="--uc:${esc(u.color?.css ?? u.color ?? "#9fd2ff")}" title="${esc(u.name)} · ${r.label}"><div class="ring"><img src="${esc(av)}" alt=""></div>${e ? `<img class="rel" src="${esc(absUrl(e))}" alt="">` : ""}<span class="nm">${esc(u.name)}</span>${host && m.status === "pending" ? `<div class="ok"><button data-la="accept" data-u="${u.id}"><i class="fa-solid fa-check"></i></button><button data-la="refuse" data-u="${u.id}"><i class="fa-solid fa-xmark"></i></button></div>` : ""}</div>`;
}
const hostActorOf = st => game.actors.get(st.actorId) || null;

export class Lobby {
  static current = null;
  /** côté lanceur : ouvre le lobby ; résout avec la liste des spectateurs au lancement, ou null si annulé */
  static host({ banner, actor, n }) {
    Lobby.current?.close(false);
    return new Promise(res => { const L = new Lobby({ lid: uid(), host: game.user.id, actorId: actor.id, actorName: actor.name, actorImg: actor.img, banner: { id: banner.id, name: banner.name, color: banner.color, color2: banner.color2, tag: banner.tag }, n, members: [] }, true); L.resolve = res; Lobby.current = L; L.open(); broadcast("lobby-open", L.pub()); });
  }
  constructor(st, isHost) { this.st = st; this.isHost = isHost; this.v = new Voice(); this.T = []; this.joined = isHost; }
  pub() { return { ...this.st, timeout: Number(setting("lobbyTimeout")) || 0, t0: this.t0 || game.time.serverTime }; }
  get members() { return this.st.members; }
  open() {
    warm(); prefetchVideos(); if (game.settings.get(MOD, "anim3d") !== false) import("./hyper3d.js").then(m => { m.loadThree(); m.loadTram(); }).catch(() => {}); this.t0 = this.t0 || game.time.serverTime;
    const el = this.el = document.createElement("div"); el.id = "gm-lobby"; el.className = this.isHost ? "host" : "spec"; el.style.setProperty("--b1", this.st.banner.color || "#6f8cff"); el.style.setProperty("--b2", this.st.banner.color2 || "#f5c518");
    const vm = asset("vMeteor"), vd = asset("vDust");
    el.innerHTML = `${vm ? `<video class="lv-meteor" src="${esc(vm)}" muted loop autoplay playsinline></video>` : ""}${vd ? `<video class="lv-dust" src="${esc(vd)}" muted loop autoplay playsinline></video>` : ""}<div class="lv-veil"></div>
      <header><div class="who">${gi("fa-users", "embComm", "hd")}<span>${this.isHost ? "Salle de Synthèse" : `Salle de Synthèse de <b>${esc(game.users.get(this.st.host)?.name)}</b>`}</span></div><div class="cnt"><span class="n">0</span> spectateur(s)</div></header>
      <div class="lv-center"><div class="emb">${img("embWarp") ? `<img src="${esc(absUrl(img("embWarp")))}" alt="">` : '<i class="fa-solid fa-wand-magic-sparkles"></i>'}</div><div class="tag">${esc(this.st.banner.tag || "Synthèse")}</div><h2>${esc(this.st.banner.name)}</h2>
        <div class="sub">${this.st.actorImg ? `<img src="${esc(this.st.actorImg)}" alt="">` : ""}<span><b>${esc(this.st.actorName)}</b> prépare une synthèse <b>×${this.st.n}</b></span></div>
        <div class="timer"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" cx="60" cy="60" r="52"/></svg><b>—</b><small>avant le lancement</small></div>
        ${this.isHost ? `<div class="acts"><button class="go" data-la="go"><span>Lancer la synthèse</span></button><button class="cancel" data-la="cancel">Annuler</button></div>` : `<div class="wait">En attente du lancement…</div><div class="acts"><button class="cancel" data-la="leave">Quitter</button></div>`}</div>
      <div class="lv-medals"></div><div class="lv-hint">${this.isHost ? "Les autres joueurs peuvent rejoindre la salle pour regarder." : "Tu regarderas la synthèse en même temps que le lanceur."}</div>`;
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add("on"));
    el.addEventListener("click", ev => { const b = ev.target.closest("[data-la]"); if (b) this.act(b.dataset.la, b); });
    load("lobbyBgm").then(b => { const k = b ? "lobbyBgm" : "bgm"; return load(k).then(() => { if (this.el) this.v.startMusic(k, 0.45, { fadeIn: 1.5 }); }); });
    this.renderMedals(); this.tick(); this.iv = setInterval(() => this.tick(), 250);
  }
  renderMedals() { if (!this.el) return; const list = this.members.filter(m => this.isHost || m.status === "in"); this.el.querySelector(".lv-medals").innerHTML = list.map(m => medal(m, { host: this.isHost })).join("") || `<div class="none">Personne pour l'instant…</div>`; this.el.querySelector(".cnt .n").textContent = this.members.filter(m => m.status === "in").length; }
  tick() {
    if (!this.el) return; const to = Number(this.st.timeout ?? setting("lobbyTimeout")) || 0; const t = this.el.querySelector(".timer");
    if (!to) { t.classList.add("off"); return; }
    const left = Math.max(0, to - (game.time.serverTime - this.t0) / 1000); const sec = Math.ceil(left); if (sec !== this._sec) { if (sec <= 3 && sec >= 1 && this._sec != null) { this.v.play("countTick", { vol: 0.7 }); this.el.classList.remove("cd"); void this.el.offsetWidth; this.el.classList.add("cd"); } this._sec = sec; } t.querySelector("b").textContent = sec; t.querySelector(".fg").style.strokeDashoffset = String(326.7 * (1 - left / to));
    if (left <= 0 && this.isHost && !this.launched) this.launch();
  }
  act(a, el) {
    if (a === "go") return this.launch();
    if (a === "cancel") { broadcast("lobby-close", { lid: this.st.lid }); this.close(false); return; }
    if (a === "leave") { broadcast("lobby-leave", { lid: this.st.lid, user: game.user.id }); this.close(); return; }
    if (a === "accept" || a === "refuse") { const m = this.members.find(x => x.user === el.dataset.u); if (!m) return; if (a === "accept") m.status = "in"; else { this.st.members = this.members.filter(x => x !== m); broadcast("lobby-reject", { lid: this.st.lid, user: m.user }); } this.sync(); }
  }
  sync() { this.renderMedals(); if (this.isHost) broadcast("lobby-state", this.pub()); }
  launch() { if (this.launched) return; this.launched = true; this.v.play("countGo", { vol: 0.8 }); this.el?.classList.add("launch"); const w = this.el?.querySelector(".go span"); if (w) w.textContent = "Ouverture du portail…"; this.resolve?.({ lid: this.st.lid, members: this.members.filter(m => m.status === "in").map(m => ({ user: m.user, rel: m.rel })) }); }
  /** appelé quand la scène démarre (ou en cas d'échec) */
  close(launched = true) { clearInterval(this.iv); this.v.stopMusic(0.6); const el = this.el; this.el = null; if (el) { el.classList.add("out"); setTimeout(() => el.remove(), 500); } if (!launched && this.resolve && !this.launched) this.resolve(null); if (Lobby.current === this) Lobby.current = null; }
}

/* ── réseau ── */
onBroadcast("lobby-open", (st, from) => {
  if (st.host === game.user.id) return; const mode = setting("watch"); if (mode === "never") return; warm();
  const join = () => { if (Lobby.current && Lobby.current.st.lid !== st.lid) Lobby.current.close(); const L = new Lobby(foundry.utils.deepClone(st), false); L.t0 = st.t0; L.st.timeout = st.timeout; Lobby.current = L; L.joined = true; L.open(); broadcast("lobby-join", { lid: st.lid, user: game.user.id }); };
  if (mode === "always") return join();
  const box = document.getElementById("gm-invites") || Object.assign(document.body.appendChild(document.createElement("div")), { id: "gm-invites" });
  const el = document.createElement("div"); el.className = "gm-invite"; el.dataset.lid = st.lid; el.style.setProperty("--b1", st.banner?.color || "#6f8cff");
  el.innerHTML = `${gi("fa-wand-magic-sparkles", "icAnnounce", "inv")}<div><b>${esc(game.users.get(st.host)?.name)}</b> prépare une synthèse ×${st.n}<small>${esc(st.banner?.name)}</small></div><button data-w>Rejoindre</button><button data-x title="Ignorer"><i class="fa-solid fa-xmark"></i></button>`;
  box.appendChild(el); const kill = () => { el.classList.add("out"); setTimeout(() => el.remove(), 300); };
  el.querySelector("[data-w]").onclick = () => { kill(); join(); }; el.querySelector("[data-x]").onclick = kill; setTimeout(kill, Math.max(15000, (Number(st.timeout) || 30) * 1000));
});
onBroadcast("lobby-join", ({ lid, user }) => {
  const L = Lobby.current; if (!L?.isHost || L.st.lid !== lid || L.launched) return; if (L.members.some(m => m.user === user)) return;
  const mode = setting("lobbyAccept"); const rel = relationOf(game.actors.get(L.st.actorId), userActor(game.users.get(user)));
  if (mode === "friends" && rel === "other") { broadcast("lobby-reject", { lid, user }); return; }
  L.members.push({ user, rel, status: mode === "manual" ? "pending" : "in" }); L.v.play("lobbyJoin", { vol: 0.55 }); L.sync();
});
onBroadcast("lobby-leave", ({ lid, user }) => { const L = Lobby.current; if (!L || L.st.lid !== lid) return; L.v.play("lobbyLeave", { vol: 0.5 }); L.st.members = L.members.filter(m => m.user !== user); if (L.isHost) L.sync(); else L.renderMedals(); });
onBroadcast("lobby-state", st => { const L = Lobby.current; if (!L || L.isHost || L.st.lid !== st.lid) return; if ((st.members || []).filter(m => m.status === "in").length > (L.members || []).filter(m => m.status === "in").length) L.v.play("lobbyJoin", { vol: 0.45 }); L.st.members = st.members; L.renderMedals(); if (!st.members.some(m => m.user === game.user.id && m.status !== "pending") && st.members.some(m => m.user === game.user.id)) L.el?.querySelector(".wait")?.replaceChildren(document.createTextNode("En attente de l'accord du lanceur…")); });
onBroadcast("lobby-reject", ({ lid, user }) => { const L = Lobby.current; if (user !== game.user.id || !L || L.st.lid !== lid) return; L.close(); ui.notifications.info("Le lanceur a préféré synthétiser sans spectateur."); });
onBroadcast("lobby-close", ({ lid }) => { const L = Lobby.current; document.querySelectorAll(`.gm-invite[data-lid="${lid}"]`).forEach(e => e.remove()); if (!L || L.isHost || L.st.lid !== lid) return; L.close(); ui.notifications.info("La synthèse a été annulée."); });
