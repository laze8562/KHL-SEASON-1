const $ = (s, r = document) => r.querySelector(s);
const T = id => TEAMS.find(t => t.id === id);
const CONF = { west: "Запад", east: "Восток" };
const BASE_ACCENT = "#2f7bff";

let state = JSON.parse(localStorage.getItem("khl-s1") || "{}"); // { fav: id|null, color: bool }
const ui = { schStage: "regular", tour: null, tabStage: "regular" };
const save = () => localStorage.setItem("khl-s1", JSON.stringify(state));

const badge = (t, big) => t
  ? `<span class="badge${big ? " big" : ""}" style="background:${t.color}"><b>${t.short}</b><img src="${LOGO_DIR}${t.id}.png" alt="" onload="this.parentNode.classList.add('logo')" onerror="this.remove()"></span>`
  : `<span class="badge" style="background:#2a3345">?</span>`;
const tmHtml = (t, right) => `<div class="tm${right ? " r" : ""}">${right ? "" : badge(t)}<span>${t ? t.name : "Определится"}</span>${right ? badge(t) : ""}</div>`;
const fmtDate = d => new Date(d + "T00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

// ---------- Расчёт таблицы ----------
function standings(conf) {
  // база — STANDINGS в data.js (вручную) + матчи, которые создатель завершил на сайте
  // (учитываются только те, которых ещё нет в data.js, чтобы не считать дважды)
  const rows = STANDINGS[conf].map(([id, gp, w, otw, pts], i) => ({ t: T(id), gp, w, otw, pts, i }));
  const by = {}; rows.forEach(r => { if (r.t) by[r.t.id] = r; });
  let changed = false;
  MATCHES.filter(m => m.liveFinal && m.stage === "regular").forEach(m => {
    const homeWon = m.hs > m.as;
    [[by[m.home], homeWon], [by[m.away], !homeWon]].forEach(([r, won]) => {
      if (!r) return;
      r.gp++; changed = true;
      if (won) { r.pts += 2; if (m.ot) r.otw++; else r.w++; }   // победа (в основное время, ОТ или по буллитам) — 2 очка
      else if (m.ot) r.pts += 1;                                 // поражение в ОТ или по буллитам — 1 очко, в основное время — 0
    });
  });
  if (changed) rows.sort((a, b) => b.pts - a.pts || (b.w + b.otw) - (a.w + a.otw) || a.i - b.i);
  return rows;
}
// запасной вариант: автоматический расчёт по матчам (сейчас не используется)
function standingsCalc(conf) {
  const rows = TEAMS.filter(t => t.conf === conf).map(t => ({ t, gp: 0, w: 0, otw: 0, otl: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  const get = id => rows.find(r => r.t.id === id);
  MATCHES.filter(m => m.stage === "regular" && m.hs !== null).forEach(m => {
    [[m.home, m.hs, m.as], [m.away, m.as, m.hs]].forEach(([id, f, a]) => {
      const r = get(id); if (!r) return;
      r.gp++; r.gf += f; r.ga += a;
      if (f > a) { r.pts += 2; if (m.ot) r.otw++; else r.w++; }
      else if (m.ot) { r.otl++; r.pts += 1; } else r.l++;
    });
  });
  return rows.sort((a, b) => b.pts - a.pts || (b.w + b.otw) - (a.w + a.otw) || (b.gf - b.ga) - (a.gf - a.ga) || a.t.name.localeCompare(b.t.name));
}

// ---------- Сетка плей-офф ----------
function bracket(conf) {
  // сетка заполняется только когда в data.js вписаны 8 посеянных клубов (PLAYOFF_SEEDS)
  const given = (typeof PLAYOFF_SEEDS !== "undefined" && PLAYOFF_SEEDS[conf]) || [];
  const seeds = given.length === 8 ? given : Array(8).fill(null);
  let cur = [[0, 7], [3, 4], [1, 6], [2, 5]].map(([x, y]) => [seeds[x], seeds[y]]);
  const rounds = []; let winners = [];
  for (let r = 0; r < 3; r++) {
    winners = [];
    rounds.push(cur.map((p, i) => {
      const res = PLAYOFF[`${conf}-${r}-${i}`] || {};
      const sa = res.a || 0, sb = res.b || 0;
      const w = sa >= 4 ? p[0] : sb >= 4 ? p[1] : null;
      winners.push(w);
      return { a: p[0], b: p[1], sa, sb, w };
    }));
    cur = [];
    for (let i = 0; i < winners.length; i += 2) cur.push([winners[i], winners[i + 1]]);
  }
  return { rounds, champ: winners[0] };
}
const serHtml = s => `<div class="ser">
  <div class="${s.w && s.w === s.a ? "w" : ""}"><span>${T(s.a) ? T(s.a).name : "—"}</span><span>${s.a ? s.sa : ""}</span></div>
  <div class="${s.w && s.w === s.b ? "w" : ""}"><span>${T(s.b) ? T(s.b).name : "—"}</span><span>${s.b ? s.sb : ""}</span></div></div>`;

// ---------- Рендер ----------
function leadersBlock(conf) {
  const rows = standings(conf).slice(0, 3);
  return `<div class="box clickable" data-go="table"><h3>${CONF[conf]}</h3>` +
    rows.map((r, i) => `<div class="tm clickable" data-club="${r.t.id}" style="margin:8px 0">${i + 1}. ${badge(r.t)}<span style="flex:1">${r.t.name}</span><b>${r.pts}</b></div>`).join("") + `</div>`;
}
function newsCard(n) {
  const click = n.list ? ` clickable" data-list="${n.list}` : "";
  const more = n.list ? `<span class="more">Открыть список →</span>` : "";
  return `<div class="card news${click}"><small>${fmtDate(n.date)}</small><h4>${n.title}</h4><p>${n.text}</p>${more}</div>`;
}

const LISTS = {
  captains: { title: "Капитаны команд", map: () => CAPTAINS },
  coaches: { title: "Главные тренеры команд", map: () => COACHES }
};
function listModal(key) {
  const L = LISTS[key], m = L.map();
  const col = conf => `<h4 class="ph">${CONF[conf]}</h4>` + TEAMS.filter(t => t.conf === conf).map(t =>
    `<div class="prow">${badge(t)}<span><b>${t.name}</b> — ${m[t.id] || "—"}</span></div>`).join("");
  openModal(`<h3>${L.title}</h3><p class="hint">Сезон 2026/2027</p>${col("west")}${col("east")}`);
}
const sortedNews = () => [...NEWS].sort((a, b) => b.date.localeCompare(a.date));

function renderHome() {
  $("#leagueName").textContent = LEAGUE.name;
  $("#leagueSub").textContent = LEAGUE.sub;
  $("#leaders").innerHTML = leadersBlock("west") + leadersBlock("east");
  const fav = state.fav && T(state.fav);
  const el = $("#nextMatch");
  if (!fav) { el.innerHTML = `<span class="hint">Выберите клуб в настройках ⚙</span>`; }
  else {
    const m = MATCHES.filter(m => (m.hs === null || m.live) && (m.home === fav.id || m.away === fav.id)).sort((a, b) => (a.tour || 0) - (b.tour || 0) || (a.date || "").localeCompare(b.date || ""))[0];
    el.innerHTML = m ? matchHtml(m) : `<span class="hint">У клуба «${fav.name}» пока нет запланированных матчей</span>`;
  }
  $("#homeNews").innerHTML = sortedNews().slice(0, 4).map(newsCard).join("");
}

const matchKey = m => m.tour ? `t${m.tour}-${m.home}-${m.away}` : null;
// Готовые составы из data.js (PRESET_LINEUPS) подставляются, если на сайте для матча ещё нет сохранённого состава
function withPresets(lu) {
  if (typeof PRESET_LINEUPS === "undefined") return lu;
  const out = { ...lu };
  MATCHES.forEach(m => {
    // составы тура: из PRESET_BY_TOUR (если задан), иначе старый вариант: PRESET_LINEUPS для тура PRESET_TOUR
    const src = (typeof PRESET_BY_TOUR !== "undefined" && PRESET_BY_TOUR[m.tour]) || (m.tour === PRESET_TOUR ? PRESET_LINEUPS : null);
    if (!src) return;
    const key = matchKey(m);
    [m.home, m.away].forEach(id => {
      const id2 = `${key}__${id}`;
      if (out[id2]) return;   // состав на этот матч уже сохранён на сайте
      // приоритет: сохранённый на сайте состав клуба из прошлых туров (самый свежий) → заготовка из data.js
      let prev = null;
      Object.values(lu).forEach(d => { if (d && !d.preset && d.team === id && d.tour < m.tour && (d.players || []).length && (!prev || d.tour > prev.tour)) prev = d; });
      if (prev) out[id2] = { team: id, match: key, tour: m.tour, home: m.home, away: m.away, players: prev.players.map(p => ({ ...p })), preset: true };
      else if (src[id]) out[id2] = { team: id, match: key, tour: m.tour, home: m.home, away: m.away, players: src[id].map(p => ({ ...p })), preset: true };
    });
  });
  return out;
}
function lineupChip(m) {
  const key = matchKey(m); if (!key) return "";
  const my = coachTeam();
  const have = [m.home, m.away].filter(id => LU[`${key}__${id}`]).length;
  if (my && (m.home === my || m.away === my) && !LU[`${key}__${my}`]) return `<div class="mfoot"><span class="chip mine">✏️ Записать состав</span></div>`;
  if (isAdmin()) return `<div class="mfoot"><span class="chip mine">✏️ Составы: ${have}/2</span></div>`;
  if (have) return `<div class="mfoot"><span class="chip">✓ Составы: ${have}/2</span></div>`;
  return "";
}
function matchHtml(m) {
  const sc = m.hs === null ? "—" : `${m.hs}:${m.as}${m.ot ? `<br><small>${typeof m.ot === "string" ? m.ot : "ОТ"}</small>` : ""}`;
  const when = m.date ? `${fmtDate(m.date)} · ${m.time}` : `Тур ${m.tour}`;
  const lab = (m.live ? `<div class="lab live">● Идёт${m.period ? " · " + (m.period === "ОТ" || m.period === "Б" ? m.period : m.period + "-й период") : ""}</div>` : "") + (m.label ? `<div class="lab">${m.label}</div>` : "");
  const key = matchKey(m);
  return `<div class="match${m.label ? " derby" : ""}${m.live ? " live" : ""}${key ? " clickable" : ""}"${key ? ` data-mk="${key}"` : ""}>${lab}<div class="d">${when}</div>${tmHtml(T(m.home))}<div class="sc">${sc}</div>${tmHtml(T(m.away), true)}${lineupChip(m)}</div>`;
}
const regular = () => MATCHES.filter(m => m.stage === "regular");
const tourCount = () => Math.max(0, ...regular().map(m => m.tour || 0));
function renderSchedule() {
  const bar = $("#tourBar");
  if (ui.schStage !== "regular") {
    bar.style.display = "none";
    const l = MATCHES.filter(m => m.stage === ui.schStage);
    $("#schList").innerHTML = l.length ? l.map(matchHtml).join("") : `<p class="hint">Матчей плей-офф пока нет</p>`;
    return;
  }
  bar.style.display = "";
  const n = tourCount();
  if (ui.tour === null) {
    const open = regular().find(m => m.hs === null || m.live);
    ui.tour = open ? open.tour : n;
  }
  ui.tour = Math.min(Math.max(1, ui.tour), n || 1);
  const sel = $("#tourSel");
  sel.innerHTML = Array.from({ length: n }, (_, i) => `<option value="${i + 1}"${i + 1 === ui.tour ? " selected" : ""}>Тур ${i + 1}</option>`).join("");
  const list = regular().filter(m => m.tour === ui.tour);
  $("#schList").innerHTML = list.length ? list.map(matchHtml).join("") : `<p class="hint">Матчей нет</p>`;
}

function standingsTable(conf) {
  const rows = standings(conf);
  return `<div class="box"><h3>${CONF[conf]}</h3><div class="tw"><table>
    <tr><th>Место</th><th class="l">Клуб</th><th>Игры</th><th>В</th><th>ВО</th><th>Очки</th></tr>
    ${rows.map((r, i) => `<tr class="${i < 8 ? "po" : ""}"><td>${i + 1}</td><td class="l"><div class="tm clickable" data-club="${r.t.id}">${badge(r.t)}<span>${r.t.name}</span></div></td><td>${r.gp}</td><td>${r.w}</td><td>${r.otw}</td><td><b>${r.pts}</b></td></tr>`).join("")}
  </table></div><p class="hint" style="margin-top:8px">Первые 8 мест — выход в плей-офф</p></div>`;
}
function renderTable() {
  const el = $("#tableBody");
  if (ui.tabStage === "regular") { el.innerHTML = `<div class="two">${standingsTable("west")}${standingsTable("east")}</div>`; return; }
  const seeded = typeof PLAYOFF_SEEDS !== "undefined" && ["west", "east"].some(c => (PLAYOFF_SEEDS[c] || []).length === 8);
  if (!seeded) { el.innerHTML = `<p class="hint" style="margin-top:18px">Сетка плей-офф появится после завершения регулярного чемпионата.</p>`; return; }
  const names = ["1/4 финала", "1/2 финала", "Финал конф."];
  const bw = bracket("west"), be = bracket("east");
  const fin = PLAYOFF.final || {}, fa = fin.a || 0, fb = fin.b || 0;
  const finS = { a: bw.champ, b: be.champ, sa: fa, sb: fb, w: fa >= 4 ? bw.champ : fb >= 4 ? be.champ : null };
  const col = (conf, b) => `<div class="box"><h3>${CONF[conf]}</h3><div class="bracket">${b.rounds.map((r, i) => `<div class="round"><h4>${names[i]}</h4>${r.map(serHtml).join("")}</div>`).join("")}</div></div>`;
  el.innerHTML = col("west", bw) + `<div style="height:14px"></div>` + col("east", be) +
    `<div class="box" style="margin-top:14px"><h3>Финал КХЛ</h3>${serHtml(finS)}</div>` +
    (finS.w ? `<div class="champ">🏆 Чемпион: <b>${T(finS.w).name}</b></div>` : "");
}

function renderClubs() {
  $("#clubsBody").innerHTML = ["west", "east"].map(c =>
    `<div><h3 style="margin-bottom:10px;color:var(--accent)">${CONF[c]}</h3>` +
    [...new Set(TEAMS.filter(t => t.conf === c).map(t => t.div))].map(d =>
      `<div class="div">${d}</div>` +
      TEAMS.filter(t => t.conf === c && t.div === d).map(t => `<div class="card club clickable" data-club="${t.id}">${badge(t)}<span style="flex:1">${t.name}</span><small class="muted">${t.city}</small></div>`).join("")
    ).join("") + `</div>`).join("");
}
function renderMedia() { $("#mediaBody").innerHTML = sortedNews().map(newsCard).join(""); }

// ---------- Модальные окна ----------
let modalLocked = false, currentMatch = null, editing = false;
const openModal = (html, lock = false) => {
  modalLocked = lock; editing = false;
  $("#overlay").classList.toggle("locked", lock);
  $("#modalBody").innerHTML = html;
  if (!document.body.classList.contains("mo")) modalScroll = window.scrollY;
  $("#overlay").classList.add("on");
  document.body.classList.add("mo");      // окно показывается как обычная страница: скриншот с прокруткой захватывает его целиком
  window.scrollTo(0, 0);
};
let modalScroll = 0;
const closeModal = () => {
  modalLocked = false; editing = false; currentMatch = null; pendingVideo = null;
  $("#overlay").classList.remove("on", "locked");
  if (document.body.classList.contains("mo")) { document.body.classList.remove("mo"); window.scrollTo(0, modalScroll); }
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function clubModal(id) {
  const t = T(id);
  const S = clubSeason(id), info = (k, v) => `<div class="ci"><span>${k}</span><b>${v}</b></div>`;
  const tile = (k, v) => `<div class="kc"><span>${k}</span><div class="kv">${v}</div></div>`;
  const diff = S.gf - S.ga, dots = S.form.length ? S.form.map(w => `<i class="fd ${w ? "w" : "l"}"></i>`).join("") : `<span class="muted">—</span>`;
  openModal(`<div class="clogo">${badge(t, true)}</div>
    <h3 class="cname">${t.name}</h3>
    ${info("Город", t.city)}${info("Арена", t.arena)}${info("Достижения", t.titles.length ? t.titles.join(", ") : "Достижений нет")}
    <h4 class="ph">Сезон · ${CONF[t.conf]}</h4>
    <div class="kt">
      ${tile("Место", `${S.place}<small class="${S.place <= 8 ? "po" : ""}">${S.place <= 8 ? "плей-офф" : "вылет"}</small>`)}
      ${tile("Очки", S.pts)}
      ${tile("Матчи", S.gp)}
      ${tile("Победы / пор.", `${S.w} / ${S.l}`)}
      ${tile("Шайбы", `${S.gf}:${S.ga}<small>${diff > 0 ? "+" + diff : diff}</small>`)}
      ${tile("Форма", `<div class="form">${dots}</div>`)}
    </div>
    <h4 class="ph">Последний матч</h4>${S.last ? clubMatchHtml(S.last) : `<p class="hint">Сыгранных матчей пока нет</p>`}
    <h4 class="ph">Следующий матч</h4>${S.next ? clubMatchHtml(S.next) : `<p class="hint">Запланированных матчей пока нет</p>`}
    ${clubLeadersHtml(id)}`);
}
// Сезон клуба для карточки. Место, очки, игры и победы — из турнирной таблицы (STANDINGS + матчи, завершённые на сайте);
// шайбы, форма, последний и следующий матч — по матчам с результатом.
function clubSeason(id) {
  const t = T(id), rows = standings(t.conf), i = rows.findIndex(r => r.t && r.t.id === id), r = rows[i] || { gp: 0, w: 0, otw: 0, pts: 0 };
  const ord = m => (m.stage === "regular" ? 0 : 1e4) + (m.tour || 0);
  const byTime = (a, b) => ord(a) - ord(b) || (a.date || "").localeCompare(b.date || "");
  const mine = MATCHES.filter(m => m.home === id || m.away === id);
  const done = mine.filter(m => m.hs !== null && !m.live).sort(byTime);
  const reg = done.filter(m => m.stage === "regular");
  let gf = 0, ga = 0;
  reg.forEach(m => { gf += m.home === id ? m.hs : m.as; ga += m.home === id ? m.as : m.hs; });
  const w = r.w + r.otw;
  return {
    place: i < 0 ? rows.length : i + 1, pts: r.pts, gp: r.gp, w, l: Math.max(0, r.gp - w), gf, ga,
    form: reg.slice(-5).map(m => (m.home === id ? m.hs > m.as : m.as > m.hs)),
    last: done[done.length - 1] || null,
    next: mine.filter(m => m.hs === null || m.live).sort(byTime)[0] || null
  };
}
function clubMatchHtml(m) {
  const key = matchKey(m), played = m.hs !== null;
  const lab = m.tour ? `Тур ${m.tour}` : (m.label || "Плей-офф");
  const ot = played && m.ot ? `<small>${typeof m.ot === "string" ? m.ot : "ОТ"}</small>` : "";
  return `<div class="cm${key ? " clickable" : ""}"${key ? ` data-mk="${key}"` : ""}><div class="ct">${lab}</div><div class="cr">${tmHtml(T(m.home))}<div class="cs${played ? "" : " vs"}">${played ? m.hs + ":" + m.as : "vs"}${ot}</div>${tmHtml(T(m.away), true)}</div></div>`;
}
// Блок «Лидеры клуба» — одинаковый в карточке каждого клуба (карточка открывается из любой вкладки)
function clubLeadersHtml(id) {
  const L = clubLeaders(id);
  const who = (r, val) => r ? `${esc(r.name)}${r.n !== null ? ` <small class="muted">№${r.n}</small>` : ""} <b>${val}</b>` : "—";
  return `<h4 class="ph">Лидеры клуба</h4>
    <div class="row"><span>Больше всех очков (Г+П)</span><span class="ldr">${who(L.pts, L.pts && L.pts.pts)}</span></div>
    <div class="row"><span>Лучший бомбардир (голы)</span><span class="ldr">${who(L.goals, L.goals && L.goals.g)}</span></div>
    <div class="row"><span>Лучший вратарь (пропущено)</span><span class="ldr">${who(L.gk, L.gk && L.gk.ga)}</span></div>`;
}
function pickerModal() {
  openModal(`<h3>Выберите любимый клуб</h3><p class="hint">Акцентный цвет сайта изменится под ваш клуб</p>
    <div class="pick">${TEAMS.map(t => `<button data-fav="${t.id}">${badge(t)}${t.name}</button>`).join("")}</div>
    <button class="btn ghost" data-fav="">Пропустить, оставить синий цвет</button>`);
}
function settingsModal() {
  const fav = state.fav && T(state.fav);
  const locked = !!coachTeam();   // у тренера клуб закреплён за его командой
  openModal(`<h3>Настройки</h3>
    <div class="set">${fav ? "Любимый клуб: <b>" + fav.name + "</b>" : "Любимый клуб не выбран"}${locked ? `<br><small class="muted">Закреплён за вашей командой</small>` : `<br><button class="btn" id="chg">Изменить</button>`}</div>
    <div class="set"><label><input type="checkbox" id="colorOn" ${state.color !== false ? "checked" : ""}> Цвет команды — перекрасить акценты сайта в цвет клуба</label></div>
    <div class="set links"><div class="hint">Мы в соцсетях</div>${LEAGUE.socials.map(s => `<a href="${s.u}" target="_blank" rel="noopener">${s.t}</a>`).join("")}</div>
    <div class="set">${isAdmin() ? "Вы вошли как <b>создатель лиги</b>" : coachTeam() ? "Вы вошли как тренер: <b>" + T(coachTeam()).name + "</b>" : "Вы заходите как болельщик"}<br><button class="btn ghost" id="roleBtn">${coachTeam() || isAdmin() ? "Выйти" : "Сменить роль"}</button></div>
    <div class="set"><div class="hint">Сброс — вернуть все настройки по умолчанию</div><button class="btn ghost" id="reset">Сбросить всё</button></div>`);
}

function applyAccent() {
  const fav = state.fav && T(state.fav);
  document.documentElement.style.setProperty("--accent", fav && state.color !== false ? fav.color : BASE_ACCENT);
}
function renderAll() { applyAccent(); renderHome(); renderSchedule(); renderTable(); renderStats(); renderClubs(); renderMedia(); }

function go(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("on", v.id === view));
  document.querySelectorAll("#nav button").forEach(b => b.classList.toggle("on", b.dataset.view === view));
  window.scrollTo(0, 0);
}

// ---------- События ----------
function tabs(id, key, fn) {
  $(id).addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    ui[key] = b.dataset.v;
    $(id).querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
    fn();
  });
}
tabs("#schStage", "schStage", renderSchedule);
$("#tourSel").addEventListener("change", e => { ui.tour = +e.target.value; renderSchedule(); });
$("#tourPrev").onclick = () => { ui.tour--; renderSchedule(); };
$("#tourNext").onclick = () => { ui.tour++; renderSchedule(); };
tabs("#tabStage", "tabStage", renderTable);

$("#nav").addEventListener("click", e => { const b = e.target.closest("button"); if (b) go(b.dataset.view); });
$("#brand").onclick = () => go("home");
$("#gear").onclick = settingsModal;
$("#close").onclick = closeModal;
$("#overlay").addEventListener("click", e => { if (e.target.id === "overlay" && !modalLocked) closeModal(); });

document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]"); if (g && !e.target.closest("[data-club]")) go(g.dataset.go);
  const c = e.target.closest("[data-club]"); if (c) clubModal(c.dataset.club);
  const ls = e.target.closest("[data-list]"); if (ls) listModal(ls.dataset.list);
  const f = e.target.closest("[data-fav]");
  if (f && !coachTeam()) { state.fav = f.dataset.fav || null; save(); renderAll(); closeModal(); }
  if (e.target.id === "chg" && !coachTeam()) pickerModal();
  if (e.target.id === "reset") { localStorage.removeItem("khl-s1"); state = {}; signOutCoach(); applyRole(); renderAll(); entryModal(); }
  if (e.target.id === "roleBtn") { delete state.role; save(); signOutCoach(); applyRole(); renderAll(); entryModal(); }
  if (e.target.id === "roleFan") { state.role = "fan"; save(); signOutCoach(); applyRole(); renderAll(); closeModal(); if (state.fav === undefined) pickerModal(); }
  if (e.target.id === "roleCoach") coachLoginModal();
  if (e.target.id === "coachBack") entryModal();
  const mk = e.target.closest("[data-mk]"); if (mk && !e.target.closest("a")) matchModal(mk.dataset.mk);
  const de = e.target.closest("[data-edit]"); if (de) editorModal(de.dataset.edit, de.dataset.team);
  const cp = e.target.closest("[data-copy]"); if (cp) copyCred(cp);
  const ms = e.target.closest("[data-ms]"); if (ms) matchAction(ms.dataset.ms);
  const ga = e.target.closest("[data-gadd]"); if (ga) goalAdd();
  const gd = e.target.closest("[data-gdel]"); if (gd) goalDel(gd.dataset.gdel);
  const vp = e.target.closest("[data-vplay]"); if (vp) playVideo(vp.dataset.vplay);
  if (e.target.closest("[data-vclear]")) { pendingVideo = null; setVid(); }
  const pk = e.target.closest("[data-pick]"); if (pk) edPicker(pk.dataset.pick);
  const fd = e.target.closest("[data-found]");
  if (fd) { const [pos, i] = fd.dataset.found.split(":"); const r = ed.rows[pos][+i]; r.on = true; edPicker(pos, String(r.n || r.name)); return; }
  if (e.target.id === "pAdd") { const pos = $("#pRows").dataset.pos; edCollect(pos); ed.rows[pos].push({ pos, n: "", name: "", on: true, line: "" }); edPicker(pos); }
  if (e.target.id === "pDone") { edCollect($("#pRows").dataset.pos); edMain(); }
  if (e.target.id === "eSave") saveLineup();
  if (e.target.id === "eCancel") matchModal(currentMatch);
  if (e.target.id === "eClear") clearLineup();
});
document.addEventListener("change", e => {
  if (e.target.id === "colorOn") { state.color = e.target.checked; save(); applyAccent(); }
  if (e.target.id === "gFile") {
    const f = e.target.files && e.target.files[0], er = $("#gErr"); if (!f) return;
    if (!/^video\//.test(f.type) && !/\.(mp4|mov|m4v|webm|mkv|3gp)$/i.test(f.name)) { er.textContent = "Выберите видеофайл"; return; }
    if (f.size > MAX_VIDEO) { er.textContent = "Файл больше 100 МБ. Обрежьте момент гола или сожмите видео."; return; }
    er.textContent = ""; pendingVideo = f; setVid();
  }
});

// запуск вынесен в конец файла (после блока составов)

// ---------- Партнёры (показываются внизу на всех вкладках) ----------
function renderPartners() {
  const list = typeof PARTNERS !== "undefined" ? PARTNERS : [];
  const el = $("#partners");
  if (!list.length) { el.style.display = "none"; return; }
  el.innerHTML = `<h3>Партнёры ${LEAGUE.name}</h3>` + list.map(p => `
    <div class="partner">
      <div class="plogo"><img src="${LOGO_DIR}${p.file}" alt="${p.name}" onerror="this.replaceWith(Object.assign(document.createElement('b'),{textContent:'${p.name}'}))"></div>
      <div class="prole">${p.role}</div>
    </div>`).join("");
}
renderPartners();

// аватарка канала КХЛ TB в карточке Twitch (файл twitch.png лежит рядом с index.html)
document.querySelectorAll("img[data-twitch]").forEach(i => {
  i.onerror = () => i.replaceWith(Object.assign(document.createElement("span"), { className: "av ph", textContent: "TB" }));
  i.src = "twitch.png";
});

// ======================================================================
//  РОЛИ, ВХОД ТРЕНЕРА И СОСТАВЫ НА МАТЧ
//  Данные составов хранятся в Firebase (см. firebase-config.js и ИНСТРУКЦИЯ.txt).
// ======================================================================
const COACH_DOMAIN = "khl-s1.app";
const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const Backend = { ready: false, auth: null, db: null, storage: null, user: null, authKnown: false, init: null };
let LU = {};   // (в начале файла заполняется withPresets) составы: { "t1-ska-cska__ska": {players:[...], ...} }
let pendingVideo = null, upPct = null;   // видео гола: выбранный файл и процент загрузки
let LM = {};   // живые матчи: { "t1-ska-cska": {status:"live"|"final", hs, as, ot} }
const TWITCH_URL = "https://www.twitch.tv/khltvlive";

// накладываем живой счёт на расписание; без записи в базе матч возвращается к данным из data.js
function applyLive() {
  MATCHES.forEach(m => {
    const k = matchKey(m); if (!k) return;
    if (!m._o) m._o = { hs: m.hs, as: m.as, ot: m.ot };
    const d = LM[k];
    if (d && (d.status === "live" || d.status === "final")) {
      m.hs = d.hs || 0; m.as = d.as || 0; m.ot = d.ot || false;
      m.live = d.status === "live"; m.period = d.period || "";
      m.liveFinal = d.status === "final" && m._o.hs === null;   // идёт в таблицу, только если результата нет в data.js
    } else { m.hs = m._o.hs; m.as = m._o.as; m.ot = m._o.ot; m.live = false; m.liveFinal = false; }
  });
}
// перерисовать открытое окно матча, не сбрасывая прокрутку
function refreshModal() {
  const ae = document.activeElement;
  if (ae && ae.closest && ae.closest("#modalBody") && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)) return;   // не сбивать ввод
  if (currentMatch && $("#gP") && gDirty()) return;   // в форме гола уже что-то введено
  if (currentMatch && !editing && $("#overlay").classList.contains("on")) { const y = window.scrollY; matchModal(currentMatch); window.scrollTo(0, y); }
}
// ---------- Периоды, голы и управление матчем ----------
const PER = ["1", "2", "3", "ОТ", "Б"], PK = { "1": "p1", "2": "p2", "3": "p3", "ОТ": "ot", "Б": "so" };
const isStarted = d => !!d && (d.status === "live" || d.status === "final");
// кружки периодов под счётом: 1, 2, 3 и (если включены создателем) ОТ и Б, под каждым счёт периода
function periodsHtml(d, canEdit) {
  if (!d.per) return "";
  const ci = Math.max(0, PER.indexOf(d.period || "1")), live = d.status === "live";
  return `<div class="pers">${PER.map((p, i) => {
    const sc = d.per[PK[p]], reached = i <= ci || !!(sc && (sc.h || sc.a));
    if (i >= 3 && !reached && !canEdit) return "";
    const txt = sc ? `${sc.h}:${sc.a}` : reached ? "0:0" : "";
    const circ = canEdit ? `<button type="button" class="pcirc" data-ms="per${i}">${p}</button>` : `<span class="pcirc">${p}</span>`;
    return `<div class="per${i === ci && live ? " cur" : reached ? " done" : ""}">${circ}<small>${txt || "&nbsp;"}</small></div>`;
  }).join("")}</div>`;
}
const goalsSorted = g => {
  const tm = t => { const [m, s] = String(t || "0:0").split(":"); return (+m || 0) * 60 + (+s || 0); };
  return [...g].sort((x, y) => PER.indexOf(x.per) - PER.indexOf(y.per) || tm(x.t) - tm(y.t));
};
// список голов: время, счёт после гола, кто забил, передачи, видео
function goalsHtml(d, admin) {
  const list = goalsSorted((d && d.goals) || []);
  if (!list.length) return "";
  let h = 0, a = 0;
  const rows = list.map(g => {
    if (g.team === "away") a++; else h++;
    const sc = g.team === "away" ? `<span class="dim">${h}</span>:<b>${a}</b>` : `<b>${h}</b>:<span class="dim">${a}</span>`;
    const okv = g.v && /^https?:\/\//i.test(g.v);
    const play = !okv ? "" : g.vf ? `<button type="button" class="gplay" data-vplay="${esc(g.v)}" aria-label="Смотреть момент">▶</button>` : `<a class="gplay" href="${esc(g.v)}" target="_blank" rel="noopener" aria-label="Смотреть момент">▶</a>`;
    const del = admin ? `<button type="button" class="gdel" data-gdel="${esc(g.id)}" aria-label="Удалить гол">✕</button>` : "";
    return `<div class="gr"><div class="gt">${esc(g.t || "")}<small>${esc(g.st || (g.per === "ОТ" || g.per === "Б" ? g.per : ""))}</small></div><div class="gs">${sc}</div><div class="gw"><b>${esc(g.p)}</b>${g.a ? `<span>${esc(g.a)}</span>` : ""}</div>${play}${del}</div>`;
  }).join("");
  return `<div class="lgh"><span>Заброшенные шайбы</span></div><div class="grs">${rows}</div>`;
}
function goalsAdmin(m, d) {
  const H = T(m.home), A = T(m.away), cp = (d && d.period) || "1";
  return `<div class="box adm"><h3>Добавить гол</h3><p class="hint">Выберите команду, затем найдите игроков по номеру или фамилии — номер подставится сам. Голы и передачи сразу попадут во вкладку «Статистика».</p>
    <select class="inp" id="gTeam"><option value="home">${esc(H.name)}</option><option value="away">${esc(A.name)}</option></select>
    <select class="inp" id="gPer">${PER.map(p => `<option${p === cp ? " selected" : ""}>${p}</option>`).join("")}</select>
    <input class="inp" id="gTime" placeholder="Время гола, например 34:14" autocomplete="off">
    <select class="inp" id="gStr"><option value="РАВ">РАВ — равные составы</option><option value="БОЛ">БОЛ — большинство</option><option value="МЕН">МЕН — меньшинство</option><option value="">Не указывать</option></select>
    <p class="glab">Кто забил</p>
    <input class="inp gps" id="gP" data-gps="P" placeholder="🔍 Поиск игрока: номер или фамилия" autocomplete="off">
    <div class="gfound" id="gfP"></div>
    <p class="glab">Первая передача (необязательно)</p>
    <input class="inp gps" id="gA1" data-gps="A1" placeholder="🔍 Поиск игрока: номер или фамилия" autocomplete="off">
    <div class="gfound" id="gfA1"></div>
    <p class="glab">Вторая передача (необязательно)</p>
    <input class="inp gps" id="gA2" data-gps="A2" placeholder="🔍 Поиск игрока: номер или фамилия" autocomplete="off">
    <div class="gfound" id="gfA2"></div>
    <div id="gVid">${vidPick()}</div>
    <input class="inp" id="gV" placeholder="Или ссылка на видео (необязательно)" inputmode="url" autocomplete="off">
    <div class="err" id="gErr"></div>
    <button class="btn big" data-gadd="1" type="button">➕ Добавить гол</button></div>`;
}
// панель управления матчем (только создатель)
function adminPanel(key, m) {
  const d = LM[key], H = T(m.home), A = T(m.away);
  if (!isStarted(d)) return `<div class="box adm"><h3>Управление матчем</h3><button class="btn big" data-ms="start">▶ Начать матч</button></div>`;
  const row = (t, p, mi, pl) => `<div class="srow"><span>${esc(t.short || t.name)}</span><button class="btn ghost" data-ms="${mi}" type="button">−</button><b>${p}</b><button class="btn" data-ms="${pl}" type="button">+</button></div>`;
  if (d.status === "live") return `<div class="box adm"><h3>Матч идёт</h3>
    <p class="hint">Период выбирайте кружками под счётом (1, 2, 3, ОТ, Б). Голы «+» записываются в выбранный период.</p>
    ${row(H, d.hs || 0, "hm", "hp")}${row(A, d.as || 0, "am", "ap")}
    <div class="err" id="msErr"></div>
    <button class="btn big" data-ms="finish" type="button">🏁 Завершить матч</button>
    <button class="btn big ghost" data-ms="reset" type="button">Отменить матч</button></div>`;
  return `<div class="box adm"><h3>Матч завершён</h3><p class="hint">Результат учтён в турнирной таблице.</p>
    <button class="btn" data-ms="reopen" type="button">↩ Вернуть в игру (править счёт)</button>
    <button class="btn ghost" data-ms="reset" type="button">Сбросить результат</button></div>`;
}
async function matchAction(act) {
  if (!isAdmin() || !Backend.db || !currentMatch) return;
  const key = currentMatch, m = MATCHES.find(x => matchKey(x) === key); if (!m) return;
  const ref = Backend.db.collection("matches").doc(key), cur = LM[key];
  const stamp = firebase.firestore.FieldValue.serverTimestamp();
  const base = { home: m.home, away: m.away, tour: m.tour };
  const per0 = () => { const p = { ...(cur.per || {}) }; if (!cur.per) p.p1 = { h: cur.hs || 0, a: cur.as || 0 }; return p; };
  const sum = per => { const v = Object.values(per); return { hs: v.reduce((s, x) => s + x.h, 0), as: v.reduce((s, x) => s + x.a, 0) }; };
  try {
    if (act === "start") await ref.set({ ...base, ...(cur && cur.goals ? { goals: cur.goals } : {}), status: "live", period: "1", per: { p1: { h: 0, a: 0 } }, hs: 0, as: 0, ot: "", updatedAt: stamp });
    else if (!isStarted(cur)) return;
    else if (["hp", "hm", "ap", "am"].includes(act)) {
      if (cur.status !== "live") return;
      const per = per0(), k = PK[cur.period || "1"], e = { ...(per[k] || { h: 0, a: 0 }) };
      if (act[0] === "h") e.h = Math.max(0, e.h + (act === "hp" ? 1 : -1)); else e.a = Math.max(0, e.a + (act === "ap" ? 1 : -1));
      per[k] = e;
      await ref.update({ per, ...sum(per), updatedAt: stamp });
    }
    else if (/^per[0-4]$/.test(act)) {          // выбор периода: 1, 2, 3, ОТ, Б
      if (cur.status !== "live") return;
      const i = +act[3], per = per0();
      if (!per[PK[PER[i]]]) per[PK[PER[i]]] = { h: 0, a: 0 };
      [3, 4].forEach(j => { const e = per[PK[PER[j]]]; if (j > i && e && !e.h && !e.a) delete per[PK[PER[j]]]; });   // выключили ОТ/Б — пустой кружок убираем
      await ref.update({ period: PER[i], per, ...sum(per), updatedAt: stamp });
    }
    else if (act === "finish") {
      if ((cur.hs || 0) === (cur.as || 0)) { const er = $("#msErr"); if (er) er.textContent = "Счёт равный: в хоккее ничьей не бывает. Исправьте счёт или включите ОТ / Б."; return; }
      await ref.update({ status: "final", ot: cur.period === "ОТ" || cur.period === "Б" ? cur.period : "", updatedAt: stamp });
    }
    else if (act === "reopen") await ref.update({ status: "live", updatedAt: stamp });
    else if (act === "reset") {
      if (!confirm("Сбросить матч? Счёт и результат будут удалены" + (cur.goals && cur.goals.length ? ", список голов останется." : "."))) return;
      if (cur.goals && cur.goals.length) await ref.set({ ...base, goals: cur.goals }); else await ref.delete();
    }
  } catch (e) { alert("Не удалось сохранить. Проверьте интернет и что правила Firestore обновлены (файл firestore.rules)."); }
}
const MAX_VIDEO = 100 * 1024 * 1024;   // 100 МБ (то же число в storage.rules)
function vidPick() {
  if (upPct !== null) return `<div class="vchip">⏫ Загрузка видео… ${upPct}%<i style="width:${upPct}%"></i></div>`;
  if (pendingVideo) return `<div class="vchip">🎬 ${esc(pendingVideo.name)} · ${(pendingVideo.size / 1048576).toFixed(1)} МБ<button type="button" class="gdel" data-vclear="1" aria-label="Убрать видео">✕</button></div>`;
  return `<label class="btn ghost vpick">🎬 Выбрать видео с телефона<input type="file" id="gFile" accept="video/*" hidden></label>`;
}
const setVid = () => { const e = $("#gVid"); if (e) e.innerHTML = vidPick(); };
// просмотр загруженного видео прямо на сайте
function playVideo(url) {
  if (!/^https:\/\//i.test(url || "")) return;
  const o = document.createElement("div"); o.className = "vlay";
  o.innerHTML = `<button type="button" class="vx" aria-label="Закрыть">✕</button><video controls autoplay playsinline src="${esc(url)}"></video>`;
  o.addEventListener("click", e => { if (e.target === o || e.target.classList.contains("vx")) { const v = o.querySelector("video"); if (v) v.pause(); o.remove(); } });
  document.body.appendChild(o);
}
async function goalAdd() {
  if (!isAdmin() || !Backend.db || !currentMatch || upPct !== null) return;
  const key = currentMatch, m = MATCHES.find(x => matchKey(x) === key), er = $("#gErr"); if (!m) return;
  const v = $("#gV").value.trim(), teamId = goalTeamId();
  const sc = gResolve("P", teamId), as1 = gResolve("A1", teamId), as2 = gResolve("A2", teamId);
  if (sc === false || as1 === false || as2 === false) { er.textContent = "По запросу найдено несколько игроков. Выберите нужного из списка."; return; }
  if (!sc) { er.textContent = "Укажите, кто забил"; return; }
  const assists = [as1, as2].filter(Boolean);
  if (assists.some(x => gSame(x, sc))) { er.textContent = "Автор гола не может быть и ассистентом"; return; }
  if (as1 && as2 && gSame(as1, as2)) { er.textContent = "Один и тот же игрок указан в передачах дважды"; return; }
  if (as2 && !as1) { er.textContent = "Заполните первую передачу"; return; }
  if (v && !/^https?:\/\//i.test(v)) { er.textContent = "Ссылка на видео должна начинаться с https://"; return; }
  // p и a — готовый текст для списка голов в матче; sc и as — структурные данные для статистики
  const g = { id: String(Date.now()), team: $("#gTeam").value, per: $("#gPer").value, t: $("#gTime").value.trim(), st: $("#gStr").value, p: gLabel(sc), a: assists.map(gLabel).join(", "), sc: gClean(sc), as: assists.map(gClean), v };
  const file = pendingVideo;
  if (file) {
    if (!Backend.storage) { er.textContent = "Хранилище видео не подключено. Включите Storage в Firebase (см. инструкцию) или вставьте ссылку."; return; }
    const path = `goals/${key}/${g.id}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    try {
      er.textContent = ""; upPct = 0; setVid();
      const ref = Backend.storage.ref(path);
      await new Promise((ok, fail) => {
        const task = ref.put(file, { contentType: file.type || "video/mp4" });
        task.on("state_changed", sn => { upPct = Math.round(sn.bytesTransferred / sn.totalBytes * 100); setVid(); }, fail, ok);
      });
      g.v = await ref.getDownloadURL(); g.vf = 1; g.vp = path;
    } catch (e) {
      upPct = null; setVid();
      const er2 = $("#gErr"); if (er2) er2.textContent = "Не удалось загрузить видео. Проверьте интернет и что в Firebase включён Storage с правилами из storage.rules.";
      return;
    }
    upPct = null; pendingVideo = null;
  }
  const goals = [...((LM[key] && LM[key].goals) || []), g].slice(0, 60);
  try {
    await Backend.db.collection("matches").doc(key).set({ home: m.home, away: m.away, tour: m.tour, goals }, { merge: true });
    gReset(); setVid(); refreshModal();   // форма очищается, список голов и статистика обновляются
  }
  catch (e) { const er2 = $("#gErr"); if (er2) er2.textContent = "Не удалось сохранить. Проверьте правила Firestore."; }
}
async function goalDel(id) {
  const key = currentMatch; if (!isAdmin() || !key || !LM[key] || !confirm("Удалить этот гол?")) return;
  const old = (LM[key].goals || []).find(g => g.id === id);
  const goals = (LM[key].goals || []).filter(g => g.id !== id);
  try {
    await Backend.db.collection("matches").doc(key).update({ goals });
    if (old && old.vp && Backend.storage) Backend.storage.ref(old.vp).delete().catch(() => {});   // чистим файл, чтобы не занимал место
  } catch (e) { alert("Не удалось удалить гол."); }
}

// ---------- Выбор игроков при вводе гола ----------
// Игрок ищется среди заявки выбранной команды (ROSTERS в data.js + составы на матчи); номер подставляется сам.
const gSel = { P: null, A1: null, A2: null };   // выбранные игроки: { n, name }
const gRes = { P: [], A1: [], A2: [] };         // текущие результаты поиска для каждого поля
const gKeys = ["P", "A1", "A2"];
const gNum = x => x == null || x.n === null || x.n === undefined || x.n === "" || isNaN(+x.n) ? null : +x.n;
const gLabel = x => (gNum(x) !== null ? gNum(x) + ". " : "") + x.name;
const gClean = x => ({ n: gNum(x), name: x.name });
const gSame = (a, b) => (gNum(a) !== null && gNum(a) === gNum(b)) || qn(a.name) === qn(b.name);
// ручной ввод вида «77. Зуган Д.» (запасной вариант, если игрока нет в списке команды)
const parseWho = s => { s = String(s || "").trim(); const m = s.match(/^(\d{1,2})\s*[.)\-]?\s*(\D.*)$/); return m ? { n: +m[1], name: m[2].trim() } : { n: null, name: s }; };
function goalTeamId() {
  const m = MATCHES.find(x => matchKey(x) === currentMatch), s = $("#gTeam");
  return m && s ? (s.value === "away" ? m.away : m.home) : null;
}
function gClearPlayers() {
  gKeys.forEach(k => { gSel[k] = null; const i = $("#g" + k), b = $("#gf" + k); if (i) i.value = ""; if (b) b.innerHTML = ""; });
}
function gReset() {
  gClearPlayers();
  ["gTime", "gV"].forEach(id => { const i = $("#" + id); if (i) i.value = ""; });
}
// в форме гола что-то введено — не перерисовываем окно, чтобы не стереть ввод
function gDirty() {
  return gKeys.some(k => { const i = $("#g" + k); return i && i.value; }) || !!($("#gTime") && $("#gTime").value) || !!($("#gV") && $("#gV").value) || !!pendingVideo;
}
function gFind(which) {
  const inp = $("#g" + which), box = $("#gf" + which); if (!inp || !box) return;
  if (gSel[which] && inp.value !== gLabel(gSel[which])) gSel[which] = null;   // текст изменили — выбор сбрасывается
  if (gSel[which]) { box.innerHTML = ""; return; }
  const q = qn(inp.value), id = goalTeamId(), all = id ? knownPlayers(id) : [];
  const taken = gKeys.filter(k => k !== which && gSel[k]).map(k => gSel[k]);
  const list = all.filter(p => qHit(p, q) && !taken.some(t => gSame(t, p))).sort((a, b) => (gNum(a) ?? 999) - (gNum(b) ?? 999));
  gRes[which] = list.slice(0, 30);
  const role = { G: "вратарь", D: "защитник", F: "нападающий" };
  box.innerHTML = gRes[which].length
    ? gRes[which].map((p, i) => `<button class="btn ghost foundbtn" type="button" data-gpick="${which}:${i}"><b>${esc(gNum(p) ?? "–")}</b> ${esc(p.name)} <small>${role[p.pos] || ""}</small></button>`).join("")
    : q ? `<p class="hint">Никого не найдено — игрок запишется по тексту, который вы ввели</p>`
    : all.length ? "" : `<p class="hint">Список игроков команды пока пуст. Введите вручную, например: 77. Зуган</p>`;
}
function gPick(ref) {
  const [w, i] = ref.split(":"), p = (gRes[w] || [])[+i]; if (!p) return;
  gSel[w] = { n: gNum(p), name: p.name };
  $("#g" + w).value = gLabel(gSel[w]);   // номер подставляется автоматически
  $("#gf" + w).innerHTML = "";
}
// итог поля: игрок, null (поле пустое) или false (по запросу несколько игроков, нужно выбрать)
function gResolve(which, teamId) {
  const inp = $("#g" + which), txt = inp ? inp.value.trim() : "";
  if (!txt) return null;
  if (gSel[which] && txt === gLabel(gSel[which])) return gSel[which];
  const q = qn(txt), hits = (teamId ? knownPlayers(teamId) : []).filter(p => qHit(p, q));
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) {
    const ex = hits.filter(p => qn(p.name) === q || (gNum(p) !== null && String(gNum(p)) === q));
    return ex.length === 1 ? ex[0] : false;
  }
  return parseWho(txt);
}
document.addEventListener("input", e => { const w = e.target.dataset && e.target.dataset.gps; if (w) gFind(w); });
document.addEventListener("focusin", e => { const w = e.target.dataset && e.target.dataset.gps; if (w) gFind(w); });
document.addEventListener("change", e => { if (e.target.id === "gTeam") gClearPlayers(); });   // сменили команду — игроки выбираются заново
document.addEventListener("click", e => {
  const pk = e.target.closest("[data-gpick]"); if (pk) return gPick(pk.dataset.gpick);
  if (!e.target.closest(".gps, .gfound")) document.querySelectorAll(".gfound").forEach(b => { b.innerHTML = ""; });
  const sa = e.target.closest("[data-stall]"); if (sa) { ui.statsAll[sa.dataset.stall] = !ui.statsAll[sa.dataset.stall]; renderStats(); }
});

// ---------- Статистика игроков ----------
// Считается на лету из голов в карточках матчей: гол — 1 очко автору, передача — 1 очко ассистенту (максимум две на гол).
ui.statsAll = {};
function statsData() {
  const byKey = new Map(MATCHES.map(m => [matchKey(m), m]).filter(([k]) => k));
  const rosters = {}, rows = new Map();
  const roster = id => rosters[id] || (rosters[id] = knownPlayers(id));
  const row = (team, p) => {
    let n = gNum(p), name = String((p && p.name) || "").trim();
    if (!name && n === null) return null;
    const list = roster(team);
    const hit = (n !== null && list.find(x => gNum(x) === n)) || (name && list.find(x => qn(x.name) === qn(name)));
    if (hit) { if (n === null) n = gNum(hit); name = hit.name; }   // имя и номер берём из заявки, чтобы один игрок не раздваивался
    const key = team + "|" + (n !== null ? "#" + n : qn(name));
    let r = rows.get(key); if (!r) rows.set(key, r = { team, n, name: name || "№" + n, g: 0, a: 0 });
    return r;
  };
  Object.entries(LM).forEach(([key, d]) => {
    const m = byKey.get(key); if (!m || !d || !Array.isArray(d.goals)) return;
    d.goals.forEach(g => {
      const team = g.team === "away" ? m.away : m.home;
      // новые голы хранят sc/as; старые (введённые текстом) разбираются из p/a
      const sc = g.sc || (g.p ? parseWho(g.p) : null);
      const as = Array.isArray(g.as) ? g.as : String(g.a || "").split(/[,;]/).map(s => s.trim()).filter(Boolean).map(parseWho);
      const rs = sc && row(team, sc); if (rs) rs.g++;
      as.slice(0, 2).forEach(x => { const ra = row(team, x); if (ra) ra.a++; });
    });
  });
  return [...rows.values()].map(r => ({ ...r, pts: r.g + r.a }));
}
// Лидеры одного клуба: по очкам, по голам и лучший вратарь (меньше всего пропущенных шайб).
// В воротах в матче считается вратарь с ролью «Основной» из состава (если роли нет — первый вратарь списка);
// пропущено = голы соперника в этом матче по итоговому счёту. Считаются только завершённые матчи регулярного чемпионата.
function clubLeaders(id) {
  const mine = statsData().filter(r => r.team === id);
  const top = (k, then) => mine.filter(r => r[k] > 0).sort((a, b) => b[k] - a[k] || b[then] - a[then] || a.name.localeCompare(b.name, "ru"))[0] || null;
  const gks = new Map();
  MATCHES.forEach(m => {
    const key = matchKey(m);
    if (!key || m.hs === null || m.live || (m.home !== id && m.away !== id)) return;
    const d = LU[`${key}__${id}`]; if (!d) return;
    const gs = (d.players || []).filter(p => p.pos === "G");
    const g = gs.find(p => +p.line === 1) || gs[0]; if (!g) return;
    let r = gks.get(g.name); if (!r) gks.set(g.name, r = { n: gNum(g), name: g.name, ga: 0, gp: 0 });
    r.ga += m.home === id ? m.as : m.hs; r.gp++;
  });
  const gk = [...gks.values()].sort((a, b) => a.ga - b.ga || b.gp - a.gp || a.name.localeCompare(b.name, "ru"))[0] || null;
  return { pts: top("pts", "g"), goals: top("g", "pts"), gk };
}
const STAT_TABLES = [
  { id: "pts", title: "Лидеры по очкам", hint: "Очки = голы + передачи", col: "pts", then: "g" },
  { id: "g", title: "Лидеры по голам", hint: "Количество заброшенных шайб", col: "g", then: "pts" },
  { id: "a", title: "Лидеры по передачам", hint: "Количество результативных передач", col: "a", then: "pts" }
];
function statsTable(def, all) {
  const rows = all.filter(r => r[def.col] > 0).sort((a, b) => b[def.col] - a[def.col] || b[def.then] - a[def.then] || a.name.localeCompare(b.name, "ru"));
  const open = !!ui.statsAll[def.id], shown = open ? rows : rows.slice(0, 20);
  let place = 0, prev = null;
  const th = (k, t) => `<th class="${def.col === k ? "pri" : ""}">${t}</th>`;
  const td = (r, k) => `<td class="${def.col === k ? "pri" : ""}">${def.col === k ? `<b>${r[k]}</b>` : r[k]}</td>`;
  const body = shown.map((r, i) => {
    if (r[def.col] !== prev) { place = i + 1; prev = r[def.col]; }   // у равных результатов одно и то же место
    const t = T(r.team);
    return `<tr><td>${place}</td><td class="l"><div class="tm clickable" data-club="${r.team}">${badge(t)}<span class="pl"><b>${esc(r.name)}</b><small>${r.n !== null ? "№" + r.n + " · " : ""}${esc(t ? t.name : r.team)}</small></span></div></td>${td(r, "g")}${td(r, "a")}${td(r, "pts")}</tr>`;
  }).join("");
  const more = rows.length > 20 ? `<button class="btn ghost stbtn" type="button" data-stall="${def.id}">${open ? "Свернуть" : "Показать всех (" + rows.length + ")"}</button>` : "";
  return `<div class="box"><h3>${def.title}</h3><p class="hint">${def.hint}</p>` + (rows.length
    ? `<div class="tw"><table><tr><th>№</th><th class="l">Игрок</th>${th("g", "Г")}${th("a", "П")}${th("pts", "О")}</tr>${body}</table></div>${more}`
    : `<p class="hint">Пока нет данных</p>`) + `</div>`;
}
function renderStats() {
  const el = $("#statsBody"); if (!el) return;
  const all = statsData();
  el.innerHTML = all.length
    ? `<div class="stats">${STAT_TABLES.map(d => statsTable(d, all)).join("")}</div>`
    : `<p class="hint" style="margin-top:18px">Пока никто не забивал. Статистика появится, когда в карточках матчей будут внесены голы и передачи.</p>`;
}

function loadScript(src) {
  return new Promise((ok, fail) => {
    const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => fail(new Error("load " + src));
    document.head.appendChild(s);
  });
}
async function initBackend() {
  if (typeof FIREBASE_CONFIG === "undefined" || !FIREBASE_CONFIG) { Backend.authKnown = true; return false; }
  try {
    await loadScript(SDK + "firebase-app-compat.js");
    await Promise.all([loadScript(SDK + "firebase-auth-compat.js"), loadScript(SDK + "firebase-firestore-compat.js")]);
    await loadScript(SDK + "firebase-storage-compat.js").catch(() => {});   // хранилище видео; если не загрузилось, остальное работает
    firebase.initializeApp(FIREBASE_CONFIG);
    Backend.auth = firebase.auth(); Backend.db = firebase.firestore(); Backend.ready = true;
    try { Backend.storage = firebase.storage(); } catch (_) { Backend.storage = null; }
    Backend.db.collection("lineups").onSnapshot(snap => {
      LU = {}; snap.forEach(d => { LU[d.id] = d.data(); }); LU = withPresets(LU);
      renderSchedule(); renderHome(); renderStats();
      refreshModal();
    }, err => console.warn("lineups", err));
    // живые матчи: статус «Идёт», счёт и итог (пишет только создатель)
    Backend.db.collection("matches").onSnapshot(snap => {
      LM = {}; snap.forEach(d => { LM[d.id] = d.data(); });
      applyLive(); renderHome(); renderSchedule(); renderTable(); renderStats();
      refreshModal();
    }, err => console.warn("matches", err));
    Backend.auth.onAuthStateChanged(u => {
      Backend.user = u; const first = !Backend.authKnown; Backend.authKnown = true;
      if (first && state.role === "coach" && !u) { delete state.role; save(); applyRole(); entryModal(); }
      applyRole(); renderSchedule(); watchCreds();
    });
    return true;
  } catch (e) { console.warn("Firebase не подключился", e); Backend.authKnown = true; return false; }
}
const signOutCoach = () => { if (Backend.auth && Backend.user) Backend.auth.signOut(); };
const ADMIN_LOGIN = "admin";   // логин создателя: admin@khl-s1.app (то же имя зашито в firestore.rules)
function isAdmin() {
  return state.role === "coach" && !!Backend.user && String(Backend.user.email || "").toLowerCase() === `${ADMIN_LOGIN}@${COACH_DOMAIN}`;
}
function coachTeam() {
  if (state.role !== "coach" || !Backend.user) return null;
  const id = String(Backend.user.email || "").split("_")[0];
  return T(id) ? id : null;
}
function applyRole() {
  const b = $("#roleBadge"), id = coachTeam(), adm = isAdmin();
  if (adm) { b.style.display = ""; b.textContent = "👑 Создатель"; }
  else if (id) { b.style.display = ""; b.textContent = "🧢 " + T(id).short; }
  else b.style.display = "none";
  // у тренера любимый клуб всегда равен его команде
  if (id && state.fav !== id) { state.fav = id; save(); applyAccent(); renderHome(); }
  // вкладка «Доступы» видна только создателю
  const nb = $("#navAccess"); if (nb) nb.style.display = adm ? "" : "none";
  if (!adm && $("#access").classList.contains("on")) go("home");
}

// ---------- Вкладка «Доступы» (только создатель) ----------
let CREDS = {}, credsUnsub = null;
function watchCreds() {
  if (isAdmin() && Backend.db) {
    if (credsUnsub) return;
    credsUnsub = Backend.db.collection("credentials").onSnapshot(snap => {
      CREDS = {}; snap.forEach(d => { CREDS[d.id] = d.data(); }); renderAccess();
    }, err => { console.warn("credentials", err); $("#accessBody").innerHTML = `<p class="err">Нет доступа к списку. Проверьте правила Firestore (файл firestore.rules).</p>`; });
  } else {
    if (credsUnsub) { credsUnsub(); credsUnsub = null; }
    CREDS = {}; const el = $("#accessBody"); if (el) el.innerHTML = "";   // данные не остаются на странице
  }
}
function renderAccess() {
  const rows = Object.values(CREDS).sort((a, b) => String(a.club || a.login).localeCompare(String(b.club || b.login), "ru"));
  $("#accessBody").innerHTML = rows.length
    ? `<div class="tw"><table><tr><th class="l">Клуб — тренер</th><th class="l">Логин</th><th class="l">Пароль</th><th></th></tr>${rows.map(r =>
        `<tr><td class="l">${esc(r.note || r.club || "")}</td><td class="l"><code>${esc(r.login)}</code></td><td class="l"><code>${esc(r.password)}</code></td><td><button class="btn ghost sm" data-copy="${esc(r.login)} ${esc(r.password)}">Копировать</button></td></tr>`).join("")}</table></div>`
    : `<p class="hint">Список пуст. Откройте setup.html один раз — он сохранит логины и пароли сюда.</p>`;
}
function copyCred(el) {
  const txt = el.dataset.copy;
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { el.textContent = "Скопировано ✓"; setTimeout(() => el.textContent = "Копировать", 1500); }).catch(() => { el.textContent = txt; });
}

// ---------- Окно входа ----------
function entryModal() {
  openModal(`<div class="entry">
    ${typeof LEAGUE_LOGO !== "undefined" ? `<img class="eLogo" src="${LEAGUE_LOGO}" alt="КХЛ Season 1">` : ""}
    <h3>Добро пожаловать!</h3><p class="hint">Кто вы?</p>
    <button class="btn big" id="roleFan">🏒 Я болельщик</button>
    <button class="btn big ghost" id="roleCoach">🧢 Я тренер</button>
  </div>`, true);
}
function coachLoginModal(msg = "") {
  openModal(`<form id="coachForm" class="entry" autocomplete="on">
    <h3>Вход для тренера</h3><p class="hint">Логин и пароль выдаёт администратор лиги</p>
    <input class="inp" id="cLogin" name="username" type="text" placeholder="Логин" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false">
    <input class="inp" id="cPass" name="password" type="password" placeholder="Пароль" autocomplete="current-password">
    <div class="err" id="cErr">${msg}</div>
    <button class="btn big" type="submit" id="cGo">Войти</button>
    <button class="btn big ghost" type="button" id="coachBack">Назад</button>
  </form>`, true);
}
async function coachLogin(login, pw) {
  const l = login.trim().toLowerCase(), id = l.split("_")[0];
  if (!l || !pw) return "Введите логин и пароль";
  await Backend.init;
  if (!Backend.ready) return "Вход для тренеров пока не подключён администратором.";
  if (!T(id) && l !== ADMIN_LOGIN) return "Неверный логин или пароль";
  try { await Backend.auth.signInWithEmailAndPassword(`${l}@${COACH_DOMAIN}`, pw); }
  catch (e) { return e.code === "auth/network-request-failed" ? "Нет связи с сервером. Проверьте интернет." : e.code === "auth/too-many-requests" ? "Слишком много попыток. Подождите и попробуйте снова." : "Неверный логин или пароль"; }
  state.role = "coach"; if (T(id)) state.fav = id; else if (state.fav === undefined) state.fav = null; save();
  return null;
}
document.addEventListener("submit", async e => {
  if (e.target.id !== "coachForm") return;
  e.preventDefault();
  const btn = $("#cGo"); btn.disabled = true; btn.textContent = "Входим…";
  const err = await coachLogin($("#cLogin").value, $("#cPass").value);
  if (err) { $("#cErr").textContent = err; btn.disabled = false; btn.textContent = "Войти"; return; }
  applyRole(); watchCreds(); renderAll(); closeModal();
});

// ---------- Состав: просмотр (в стиле карточки матча КХЛ) ----------
const splitName = s => { s = String(s || "").trim(); const i = s.indexOf(" "); return i < 0 ? [s, ""] : [s.slice(0, i), s.slice(i + 1)]; };
const byPos = (d, p) => d ? (d.players || []).filter(x => x.pos === p).sort((a, b) => (a.line || 9) - (b.line || 9) || a.n - b.n) : [];
const whenHtml = d => { try { return d && d.updatedAt && d.updatedAt.toDate ? d.updatedAt.toDate().toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""; } catch (_) { return ""; } };
// игрок на льду: круглый аватар, номер сбоку (у хозяев слева, у гостей справа), фамилия под ним
const SIL = `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="18" r="8"/><path d="M8 46c0-10 7-16 16-16s16 6 16 16z"/></svg>`;
const rc = (x, side) => x
  ? `<div class="rc ${side}"><span class="pa">${x.photo ? `<img src="${esc(x.photo)}" alt="">` : SIL}<span class="pb">${esc(x.n)}</span></span><small>${esc(splitName(x.name)[0])}${splitName(x.name)[1] ? "<br>" + esc(splitName(x.name)[1]) : ""}</small></div>`
  : `<div class="rc"></div>`;
function rinkHtml(hd, ad) {
  const col = d => { const g = byPos(d, "G")[0], D = byPos(d, "D"), F = byPos(d, "F"); return { out: [D[0], g, D[1]], inn: [F[0], F[1], F[2]] }; };
  const h = col(hd), a = col(ad);
  let cells = "";
  for (let r = 0; r < 3; r++) cells += rc(h.out[r], "h") + rc(h.inn[r], "h") + rc(a.inn[r], "a") + rc(a.out[r], "a");
  const deco = `<i class="fo fo1"></i><i class="fo fo2"></i><i class="fo fo3"></i><i class="fo fo4"></i><i class="fo foc"></i>`;
  return `<div class="lgh"><span>Стартовые пятёрки</span></div><div class="rink">${deco}${cells}</div>`;
}
function pairsHtml(title, ha, aa) {
  const n = Math.max(ha.length, aa.length); if (!n) return "";
  const nm = (x, right) => { if (!x) return ""; const [s, r] = splitName(x.name); return `<span class="nmb${right ? "" : " l"}"><b>${esc(s)}</b>${r ? "<br>" + esc(r) : ""}</span>`; };
  const pn = x => x ? `<span class="pb">${esc(x.n)}</span>` : "";
  let rows = "";
  for (let i = 0; i < n; i++) rows += `<div class="pr"><div class="pc l">${nm(ha[i], false)}${pn(ha[i])}</div><div class="pc">${pn(aa[i])}${nm(aa[i], true)}</div></div>`;
  return `<div class="lgh"><span>${title}</span></div><div class="prs">${rows}</div>`;
}
function lineupsHtml(hd, ad) {
  return rinkHtml(hd, ad) + pairsHtml("Вратари", byPos(hd, "G"), byPos(ad, "G")) + pairsHtml("Защитники", byPos(hd, "D"), byPos(ad, "D")) + pairsHtml("Нападающие", byPos(hd, "F"), byPos(ad, "F"));
}
function matchModal(key) {
  const m = MATCHES.find(x => matchKey(x) === key); if (!m) return;
  if (currentMatch !== key) gKeys.forEach(k => { gSel[k] = null; });   // открыли другой матч — выбранные игроки сбрасываются
  const my = coachTeam(), H = T(m.home), A = T(m.away);
  const hd = LU[`${key}__${m.home}`], ad = LU[`${key}__${m.away}`];
  const head = `<div class="mh"><div class="mt">${badge(H)}<b>${esc(H.name)}</b></div><div class="mt r"><b>${esc(A.name)}</b>${badge(A)}</div></div>`;
  const body = hd || ad ? lineupsHtml(hd, ad) : `<p class="hint">Составы пока не объявлены</p>`;
  const info = [[H, hd], [A, ad]].map(([t, d]) => d && whenHtml(d) ? `${esc(t.short || t.name)}: обновлён ${whenHtml(d)}` : "").filter(Boolean).join(" · ");
  const eb = (team, d, label) => `<button class="btn" data-edit="${key}" data-team="${team}">${d ? "✏️ Редактировать состав" : "➕ Записать состав"}${label}</button>`;
  const edit = isAdmin()
    ? eb(m.home, hd, ` — ${esc(H.short || H.name)}`) + eb(m.away, ad, ` — ${esc(A.short || A.name)}`)
    : my && (my === m.home || my === m.away) ? eb(my, my === m.home ? hd : ad, "") : "";
  const watch = `<a class="btn watch" href="${TWITCH_URL}" target="_blank" rel="noopener">📺 Смотреть игру</a>`;
  const d = LM[key], started = isStarted(d);
  const score = m.hs === null ? "" : `<div class="mscore${m.live ? " live" : ""}"><div class="big">${m.hs}:${m.as}</div><small>${m.live ? "● Идёт" : "Завершён" + (m.ot ? " · " + (typeof m.ot === "string" ? m.ot : "ОТ") : "")}</small>${started ? periodsHtml(d, isAdmin() && d.status === "live") : ""}</div>`;
  const goals = goalsHtml(d, isAdmin());
  openModal(`${watch}<h3>${esc(H.name)} — ${esc(A.name)}</h3><p class="hint">Тур ${m.tour}${m.label ? " · " + esc(m.label) : ""}</p>${head}${score}${isAdmin() ? adminPanel(key, m) : ""}${goals}${isAdmin() ? goalsAdmin(m, d) : ""}${body}${info ? `<p class="hint" style="margin-top:10px">${info}</p>` : ""}${edit}`);
  currentMatch = key;
}

// ---------- Состав: редактор (только тренер своей команды) ----------
const POSN = { G: "Вратари", D: "Защитники", F: "Нападающие" };
const LNL = { G: ["Основной", "Запасной"], D: ["1-я пара", "2-я пара", "3-я пара", "4-я пара"], F: ["1-е звено", "2-е звено", "3-е звено", "4-е звено"] };
const rowHtml = p => `<div class="erow">
  <input type="checkbox" class="ck" aria-label="В составе"${p.on ? " checked" : ""}>
  <input class="n" inputmode="numeric" maxlength="2" placeholder="№" value="${esc(p.n ?? "")}">
  <input class="nm" maxlength="40" placeholder="Фамилия Имя" value="${esc(p.name ?? "")}">
  <div class="eopt">
    <select class="ln"><option value="">${p.pos === "G" ? "Роль" : p.pos === "D" ? "Пара" : "Звено"} —</option>${LNL[p.pos].map((t, i) => `<option value="${i + 1}"${+p.line === i + 1 ? " selected" : ""}>${t}</option>`).join("")}</select>
  </div></div>`;
// Все известные игроки команды: заранее заданные (ROSTERS в data.js) + те, кого тренер уже записывал в прошлых составах
function knownPlayers(team) {
  const map = new Map();
  ((typeof ROSTERS !== "undefined" && ROSTERS[team]) || []).forEach(p => map.set(p.name, { ...p }));
  Object.values(LU).filter(d => d.team === team).forEach(d => (d.players || []).forEach(p => map.set(p.name, { n: p.n, name: p.name, pos: p.pos })));
  return [...map.values()];
}
// Редактор: сначала сводка и три кнопки (вратари / защитники / нападающие), каждая открывает полный список игроков команды
let ed = null;
function edCollect(pos) {
  if (!ed) return;
  const box = document.querySelector(`#pRows`); if (!box) return;
  ed.rows[pos] = [...box.querySelectorAll(".erow")].map(r => ({ on: r.querySelector(".ck").checked, n: r.querySelector(".n").value.trim(), name: r.querySelector(".nm").value.trim(), line: r.querySelector(".ln").value, pos }));
}
const qn = v => String(v ?? "").toLowerCase().replace(/ё/g, "е").trim();
const qHit = (p, q) => !q || qn(p.n).startsWith(q) || qn(p.name).includes(q) || q.split(/\s+/).every(w => qn(p.n) === w || qn(p.name).includes(w));
function pFilter() {
  const q = qn(($("#pSearch") || {}).value || "");
  document.querySelectorAll("#pRows .erow").forEach(r => {
    const hit = qHit({ n: r.querySelector(".n").value, name: r.querySelector(".nm").value }, q);
    r.style.display = hit ? "" : "none";
  });
}
function eFind() {
  const box = $("#eFound"); if (!box) return;
  const q = qn($("#eSearch").value);
  if (!q) { box.innerHTML = ""; return; }
  const res = [];
  for (const pos of ["G", "D", "F"]) ed.rows[pos].forEach((p, i) => { if (qHit(p, q)) res.push([pos, i, p]); });
  box.innerHTML = res.length
    ? res.slice(0, 8).map(([pos, i, p]) => `<button class="btn ghost foundbtn" type="button" data-found="${pos}:${i}"><b>${esc(p.n || "–")}</b> ${esc(p.name)} <small>${p.on ? "✓ в составе · " : ""}${{ G: "вратарь", D: "защитник", F: "нападающий" }[pos]}</small></button>`).join("")
    : `<p class="hint">Никого не найдено</p>`;
}
let editTeam = null;   // чей состав сейчас редактируется
function editorModal(key, team) {
  const m = MATCHES.find(x => matchKey(x) === key);
  const my = isAdmin() ? team : coachTeam();   // создатель правит любую из двух команд матча
  if (!m || !my || (m.home !== my && m.away !== my)) return;
  editTeam = my;
  const d = LU[`${key}__${my}`], cur = new Map((d ? d.players : []).map(p => [p.name, p]));
  const all = knownPlayers(my);
  ed = { key, my, rows: { G: [], D: [], F: [] } };
  for (const pos of ["G", "D", "F"]) {
    ed.rows[pos] = all.filter(p => p.pos === pos).sort((a, b) => (a.n ?? 999) - (b.n ?? 999)).map(p => { const c = cur.get(p.name); return { pos, n: p.n == null ? "" : String(p.n), name: p.name, on: !!c, line: c && c.line ? String(c.line) : "" }; });
  }
  edMain();
}
function edMain() {
  const m = MATCHES.find(x => matchKey(x) === ed.key), d = LU[`${ed.key}__${ed.my}`];
  const blocks = ["G", "D", "F"].map(pos => {
    const sel = ed.rows[pos].filter(p => p.on && p.name);
    return `<button class="btn big pickbtn" data-pick="${pos}" type="button"><span>${POSN[pos]}</span><b>${sel.length} из ${ed.rows[pos].length || 0} ›</b></button>` +
      (sel.length ? `<div class="sel">${sel.map(p => `<span><b>${esc(p.n)}</b> ${esc(splitName(p.name)[0])}</span>`).join("")}</div>` : "");
  }).join("");
  openModal(`<h3>Состав: ${T(ed.my).name}</h3><p class="hint">${T(m.home).name} — ${T(m.away).name}, тур ${m.tour}</p>
    <input class="inp" id="eSearch" type="search" placeholder="🔍 Поиск игрока: номер, имя или фамилия" autocomplete="off">
    <div id="eFound"></div>
    <p class="hint">Или нажмите на раздел, чтобы выбрать игроков из списка команды.</p>
    ${blocks}
    <div class="err" id="eMsg"></div>
    <div><button class="btn" id="eSave" type="button">Сохранить</button><button class="btn ghost" id="eCancel" type="button">Назад</button>${d ? `<button class="btn ghost" id="eClear" type="button">Очистить</button>` : ""}</div>`);
  currentMatch = ed.key; editing = true;
}
function edPicker(pos, q) {
  const rows = ed.rows[pos];
  openModal(`<h3>${POSN[pos]}: ${T(ed.my).name}</h3>
    <p class="hint">Отметьте игроков, которые выходят на матч, и выберите ${pos === "G" ? "роль" : pos === "D" ? "пару" : "звено"}.${rows.length ? "" : " Список пока пуст: добавьте игроков кнопкой ниже, дальше они будут в списке всегда."}</p>
    <input class="inp" id="pSearch" type="search" placeholder="🔍 Поиск: номер, имя или фамилия" autocomplete="off" value="${esc(q || "")}">
    <div id="pRows" data-pos="${pos}">${rows.map(p => rowHtml(p)).join("")}</div>
    <button class="btn ghost" id="pAdd" type="button">+ Добавить игрока</button>
    <div><button class="btn" id="pDone" type="button">Готово</button></div>`);
  currentMatch = ed.key; editing = true;
  if (q) pFilter();
}
async function saveLineup() {
  const key = currentMatch, my = editTeam, msg = $("#eMsg");
  const m = MATCHES.find(x => matchKey(x) === key);
  if (!m || !my || !ed || (!isAdmin() && my !== coachTeam())) return;
  const players = [], nums = new Set();
  for (const pos of ["G", "D", "F"]) for (const r of ed.rows[pos]) {
    if (!r.on || (!r.name && !r.n)) continue;
    if (!r.name) { msg.textContent = "У одного из игроков не указана фамилия"; return; }
    if (!/^\d{1,2}$/.test(r.n)) { msg.textContent = `Укажите номер (0–99) для «${r.name}»`; return; }
    if (nums.has(+r.n)) { msg.textContent = `Номер ${r.n} указан дважды`; return; }
    nums.add(+r.n);
    const p = { n: +r.n, name: r.name, pos }; if (r.line) p.line = +r.line;
    players.push(p);
  }
  if (!players.length) { msg.textContent = "Выберите хотя бы одного игрока"; return; }
  if (players.length > 30) { msg.textContent = "Не больше 30 игроков"; return; }
  const btn = $("#eSave"); btn.disabled = true; msg.textContent = "";
  try {
    await Backend.db.collection("lineups").doc(`${key}__${my}`).set({
      team: my, match: key, tour: m.tour, home: m.home, away: m.away, players,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(), by: Backend.user.email
    });
    ed = null; matchModal(key);
  } catch (e) { btn.disabled = false; msg.textContent = "Не удалось сохранить. Проверьте интернет и что вы вошли как тренер этой команды."; }
}
async function clearLineup() {
  const key = currentMatch, my = editTeam;
  if (!key || !my || (!isAdmin() && my !== coachTeam()) || !confirm("Удалить состав на этот матч?")) return;
  try { await Backend.db.collection("lineups").doc(`${key}__${my}`).delete(); matchModal(key); }
  catch (e) { $("#eMsg").textContent = "Не удалось удалить состав."; }
}

// ---------- Запуск ----------
LU = withPresets(LU);
renderAll();
Backend.init = initBackend();
(async () => {
  if (state.role === "coach") {            // ждём ответ Firebase: он решит, вошёл ли тренер
    const ok = await Backend.init;
    if (!ok) { delete state.role; save(); entryModal(); }
    return;
  }
  if (!state.role) entryModal();
  else if (state.fav === undefined) pickerModal();
})();

document.addEventListener("input", e => {
  if (e.target.id === "pSearch") return pFilter();
  if (e.target.id === "eSearch") return eFind(); const r = e.target.closest && e.target.closest(".erow"); if (r && e.target.matches(".n,.nm")) r.querySelector(".ck").checked = true; });
