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
  // таблица берётся из STANDINGS в data.js (вручную)
  return STANDINGS[conf].map(([id, gp, w, otw, pts]) => ({ t: T(id), gp, w, otw, pts }));
}
// запасной вариант: автоматический расчёт по матчам (сейчас не используется)
function standingsCalc(conf) {
  const rows = TEAMS.filter(t => t.conf === conf).map(t => ({ t, gp: 0, w: 0, otw: 0, otl: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  const get = id => rows.find(r => r.t.id === id);
  MATCHES.filter(m => m.stage === "regular" && m.hs !== null).forEach(m => {
    [[m.home, m.hs, m.as], [m.away, m.as, m.hs]].forEach(([id, f, a]) => {
      const r = get(id); if (!r) return;
      r.gp++; r.gf += f; r.ga += a;
      if (f > a) { if (m.ot) { r.otw++; r.pts += 2; } else { r.w++; r.pts += 3; } }
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
    rows.map((r, i) => `<div class="tm" style="margin:8px 0">${i + 1}. ${badge(r.t)}<span style="flex:1">${r.t.name}</span><b>${r.pts}</b></div>`).join("") + `</div>`;
}
function newsCard(n) {
  return `<div class="card news"><small>${fmtDate(n.date)}</small><h4>${n.title}</h4><p>${n.text}</p></div>`;
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
    const m = MATCHES.filter(m => m.hs === null && (m.home === fav.id || m.away === fav.id)).sort((a, b) => (a.tour || 0) - (b.tour || 0) || (a.date || "").localeCompare(b.date || ""))[0];
    el.innerHTML = m ? matchHtml(m) : `<span class="hint">У клуба «${fav.name}» пока нет запланированных матчей</span>`;
  }
  $("#homeNews").innerHTML = sortedNews().slice(0, 4).map(newsCard).join("");
}

function matchHtml(m) {
  const sc = m.hs === null ? "—" : `${m.hs}:${m.as}${m.ot ? "<br><small>ОТ</small>" : ""}`;
  const when = m.date ? `${fmtDate(m.date)} · ${m.time}` : `Тур ${m.tour}`;
  const lab = m.label ? `<div class="lab">${m.label}</div>` : "";
  return `<div class="match${m.label ? " derby" : ""}">${lab}<div class="d">${when}</div>${tmHtml(T(m.home))}<div class="sc">${sc}</div>${tmHtml(T(m.away), true)}</div>`;
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
    const open = regular().find(m => m.hs === null);
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
    ${rows.map((r, i) => `<tr class="${i < 8 ? "po" : ""}"><td>${i + 1}</td><td class="l"><div class="tm">${badge(r.t)}<span>${r.t.name}</span></div></td><td>${r.gp}</td><td>${r.w}</td><td>${r.otw}</td><td><b>${r.pts}</b></td></tr>`).join("")}
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
const openModal = html => { $("#modalBody").innerHTML = html; $("#overlay").classList.add("on"); };
const closeModal = () => $("#overlay").classList.remove("on");

function clubModal(id) {
  const t = T(id);
  openModal(`<div style="text-align:center;margin-bottom:12px">${badge(t, true)}<h3 style="margin-top:10px">${t.name}</h3></div>
    <div class="row"><span>Город</span><span>${t.city}</span></div>
    <div class="row"><span>Арена</span><span>${t.arena}</span></div>
    <div class="row"><span>Конференция</span><span>${CONF[t.conf]}</span></div>
    <div class="row"><span>Дивизион</span><span>${t.div}</span></div>
    <div class="row"><span>Достижения</span><span>${t.titles.length ? t.titles.join(", ") : "Пока нет"}</span></div>`);
}
function pickerModal() {
  openModal(`<h3>Выберите любимый клуб</h3><p class="hint">Акцентный цвет сайта изменится под ваш клуб</p>
    <div class="pick">${TEAMS.map(t => `<button data-fav="${t.id}">${badge(t)}${t.name}</button>`).join("")}</div>
    <button class="btn ghost" data-fav="">Пропустить, оставить синий цвет</button>`);
}
function settingsModal() {
  const fav = state.fav && T(state.fav);
  openModal(`<h3>Настройки</h3>
    <div class="set">${fav ? "Любимый клуб: <b>" + fav.name + "</b>" : "Любимый клуб не выбран"}<br><button class="btn" id="chg">Изменить</button></div>
    <div class="set"><label><input type="checkbox" id="colorOn" ${state.color !== false ? "checked" : ""}> Цвет команды — перекрасить акценты сайта в цвет клуба</label></div>
    <div class="set links"><div class="hint">Мы в соцсетях</div>${LEAGUE.socials.map(s => `<a href="${s.u}" target="_blank" rel="noopener">${s.t}</a>`).join("")}</div>
    <div class="set"><div class="hint">Сброс — вернуть все настройки по умолчанию</div><button class="btn ghost" id="reset">Сбросить всё</button></div>`);
}

function applyAccent() {
  const fav = state.fav && T(state.fav);
  document.documentElement.style.setProperty("--accent", fav && state.color !== false ? fav.color : BASE_ACCENT);
}
function renderAll() { applyAccent(); renderHome(); renderSchedule(); renderTable(); renderClubs(); renderMedia(); }

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
$("#overlay").addEventListener("click", e => { if (e.target.id === "overlay") closeModal(); });

document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]"); if (g) go(g.dataset.go);
  const c = e.target.closest("[data-club]"); if (c) clubModal(c.dataset.club);
  const f = e.target.closest("[data-fav]");
  if (f) { state.fav = f.dataset.fav || null; save(); renderAll(); closeModal(); }
  if (e.target.id === "chg") pickerModal();
  if (e.target.id === "reset") { localStorage.removeItem("khl-s1"); state = {}; renderAll(); closeModal(); pickerModal(); }
});
document.addEventListener("change", e => {
  if (e.target.id === "colorOn") { state.color = e.target.checked; save(); applyAccent(); }
});

renderAll();
if (state.fav === undefined) pickerModal();
