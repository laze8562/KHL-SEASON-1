// ======================================================================
//  СИМУЛЯЦИЯ ИГР, ТУРНИРЫ И ПЛЕЙ-ОФФ (управляет только создатель)
//  Результаты пишутся в Firebase (коллекции matches, games, tournaments),
//  поэтому их видят все посетители сайта.
//  Файл подключается ДО app.js: функции отсюда вызываются позже,
//  когда страница уже собрана, поэтому app.js и data.js здесь доступны.
// ======================================================================
const LG = { rnd: Math.random, busy: false };
const PO_NAMES = ["1/8 финала", "1/4 финала", "1/2 финала", "Финал КХЛ"];   // 16 клубов: по 8 от каждой конференции
const PO_HOME_A = [1, 1, 0, 0, 1, 0, 1];   // схема 2-2-1-1-1: в каких играх серии хозяин — верхний посев
let TN = {};   // турниры: { id: { name, teams, circles, groups:[{name, teams}], order } }

// ---------- Мелочи ----------
const lgInt = (a, b) => a + Math.floor(LG.rnd() * (b - a + 1));
function lgPoisson(l) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= LG.rnd(); } while (p > L); return k - 1; }
function lgPick(list, w) {
  let t = 0; const ws = list.map(x => { const v = Math.max(0, w(x)); t += v; return v; });
  if (t <= 0) return list[Math.floor(LG.rnd() * list.length)];
  let r = LG.rnd() * t;
  for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r < 0) return list[i]; }
  return list[list.length - 1];
}
const lgNum = x => x == null || x.n == null || x.n === "" || isNaN(+x.n) ? null : +x.n;
const lgLabel = x => (lgNum(x) !== null ? lgNum(x) + ". " : "") + x.name;
const lgClean = x => ({ n: lgNum(x), name: x.name });
const lgDone = m => m.hs !== null && m.hs !== undefined && !m.live;
const lgHasGoals = m => { const d = LM[matchKey(m)]; return !!(d && (d.goals || []).length); };
const lgUnplayed = m => !lgDone(m) && !m.live && !lgHasGoals(m);
const lgCan = () => isAdmin() && !!Backend.db && !LG.busy;
const lgSsTime = () => String(lgInt(0, 59)).padStart(2, "0");

function lgToast(text) {
  const old = document.querySelector(".lgtoast"); if (old) old.remove();
  const el = document.createElement("div"); el.className = "lgtoast"; el.textContent = text; document.body.appendChild(el);
  clearTimeout(lgToast.t); lgToast.t = setTimeout(() => el.remove(), 7000);
}
async function lgGuard(fn) {
  if (LG.busy) return;
  LG.busy = true; document.body.classList.add("lgbusy");
  try { await fn(); }
  catch (e) { console.warn(e); lgToast("Не удалось записать. Проверьте вход создателя, интернет и что правила Firestore обновлены (файл firestore.rules)."); }
  finally { LG.busy = false; document.body.classList.remove("lgbusy"); }
}
const lgStamp = () => firebase.firestore.FieldValue.serverTimestamp();
// пишем пачками (в Firestore не больше 500 операций за раз)
async function lgBatch(ops) {
  for (let i = 0; i < ops.length; i += 400) {
    const b = Backend.db.batch();
    ops.slice(i, i + 400).forEach(f => f(b));
    await b.commit();
  }
}

// ======================================================================
//  1. СИМУЛЯЦИЯ ОДНОЙ ИГРЫ
// ======================================================================
// Игроки для голов: состав на этот матч → последний сохранённый состав клуба → заявка из data.js.
function lgSquad(team, key) {
  const own = LU[`${key}__${team}`];
  let pl = own && (own.players || []).length ? own.players : null;
  if (!pl) {
    const last = Object.values(LU).filter(d => d && d.team === team && (d.players || []).length).sort((a, b) => (b.tour || 0) - (a.tour || 0))[0];
    if (last) pl = last.players;
  }
  if (!pl) pl = knownPlayers(team);
  return pl.filter(p => p && p.name && (p.pos === "F" || p.pos === "D"));
}
const lgLine = l => ({ 1: 1, 2: .75, 3: .5, 4: .3 })[+l] || .6;          // первое звено забивает чаще четвёртого
const lgGoalW = p => (p.pos === "F" ? 1 : .35) * lgLine(p.line);          // нападающие забивают чаще защитников
const lgAsstW = p => (p.pos === "F" ? 1 : .8) * lgLine(p.line);
const lgTime = p => `${(p - 1) * 20 + lgInt(0, 19)}:${lgSsTime()}`;
const lgTm = t => { const [m, s] = String(t || "0:0").split(":"); return (+m || 0) * 60 + (+s || 0); };

// Лёгкий перевес сильнее: рейтинг клуба — доля набранных очков в турнирной таблице (до 3 игр рейтинг ровный).
function lgRatings() {
  const map = {};
  ["west", "east"].forEach(c => standings(c).forEach(r => { if (r.t) map[r.t.id] = r.gp >= 3 ? r.pts / (2 * r.gp) : .5; }));
  return id => (map[id] === undefined ? .5 : map[id]);
}

// Возвращает поля документа matches/<матч>: счёт, периоды, голы с авторами и передачами.
// opt.playoff — в плей-офф ничьей и буллитов нет: овертайм идёт до гола.
function lgSimGame(m, opt = {}) {
  const key = matchKey(m), rt = opt.rating || (() => .5);
  const diff = rt(m.home) - rt(m.away);
  let h = Math.min(9, lgPoisson(2.9 * (1 + .35 * diff))), a = Math.min(9, lgPoisson(2.7 * (1 - .35 * diff)));
  const squads = { home: lgSquad(m.home, key), away: lgSquad(m.away, key) };
  const per = { p1: { h: 0, a: 0 }, p2: { h: 0, a: 0 }, p3: { h: 0, a: 0 } };
  const goals = [], stamp = Date.now().toString(36);
  let seq = 0;
  const add = (side, p, t, st) => {
    const sq = squads[side], sc = sq.length ? lgPick(sq, lgGoalW) : null, as = [];
    if (sc) {
      const r = LG.rnd(), n = r < .12 ? 0 : r < .40 ? 1 : 2, pool = sq.filter(x => x !== sc);
      for (let i = 0; i < n && pool.length; i++) { const x = lgPick(pool, lgAsstW); as.push(x); pool.splice(pool.indexOf(x), 1); }
    }
    goals.push({ id: stamp + (seq++).toString(36), team: side, per: p, t, st, p: sc ? lgLabel(sc) : "", a: as.map(lgLabel).join(", "), sc: sc ? lgClean(sc) : null, as: as.map(lgClean), v: "" });
  };
  const strength = () => { const r = LG.rnd(); return r < .04 ? "МЕН" : r < .22 ? "БОЛ" : "РАВ"; };
  for (let i = 0; i < h; i++) { const p = lgInt(1, 3); per["p" + p].h++; add("home", String(p), lgTime(p), strength()); }
  for (let i = 0; i < a; i++) { const p = lgInt(1, 3); per["p" + p].a++; add("away", String(p), lgTime(p), strength()); }
  let ot = "", period = "3";
  if (h === a) {
    const homeWins = LG.rnd() < .5 + .1 * diff;
    if (opt.playoff || LG.rnd() < .55) {              // овертайм с голом
      ot = period = "ОТ";
      per.ot = { h: homeWins ? 1 : 0, a: homeWins ? 0 : 1 };
      add(homeWins ? "home" : "away", "ОТ", `${60 + (opt.playoff ? lgInt(0, 19) : lgInt(0, 4))}:${lgSsTime()}`, "");
    } else {                                          // серия буллитов: победитель получает +1 к счёту
      ot = period = "Б";
      per.so = { h: homeWins ? 1 : 0, a: homeWins ? 0 : 1 };
    }
    if (homeWins) h++; else a++;
  }
  goals.sort((x, y) => PER.indexOf(x.per) - PER.indexOf(y.per) || lgTm(x.t) - lgTm(y.t));
  return { home: m.home, away: m.away, tour: m.tour, goals, status: "final", period, per, hs: h, as: a, ot };
}

// Сыграть список матчей: уже сыгранные, идущие и матчи с внесёнными вручную голами пропускаются.
async function lgSimRun(list, opt = {}) {
  const todo = list.filter(lgUnplayed), res = {};
  if (!todo.length) return { n: 0, skipped: list.length, res };
  const rating = lgRatings(), stamp = lgStamp();
  await lgBatch(todo.map(m => b => {
    const d = lgSimGame(m, { ...opt, rating }), key = matchKey(m);
    res[key] = { hs: d.hs, as: d.as };
    b.set(Backend.db.collection("matches").doc(key), { ...d, updatedAt: stamp });
  }));
  return { n: todo.length, skipped: list.length - todo.length, res };
}
const lgSummary = r => `Сыграно матчей: ${r.n}` + (r.skipped ? ` (пропущено: ${r.skipped} — уже сыграны или идут)` : "");

// ---------- Кнопка «Сыграть матч» в карточке одного матча ----------
async function lgSimOne() {
  if (!lgCan() || !currentMatch) return;
  const key = currentMatch, m = MATCHES.find(x => matchKey(x) === key); if (!m) return;
  if (!lgUnplayed(m)) { lgToast("Этот матч уже сыгран, идёт или в нём внесены голы"); return; }
  await lgGuard(async () => {
    const r = await lgSimRun([m], { playoff: m.stage === "playoff" }), s = r.res[key];
    let extra = "";
    if (s && m.stage === "playoff") {   // как и при общей симуляции: сразу планируем следующие игры серии и раунды
      const merged = poGames().map(g => matchKey(g) === key ? { ...g, hs: s.hs, as: s.as, live: false } : g);
      const next = poBuild(merged);
      if (next.out.length) { await lgGamesWrite(next.out); extra = `. Запланировано новых игр: ${next.out.length}`; }
      else if (next.msg) extra = ". " + next.msg;
    }
    if (s) lgToast(`${T(m.home).name} ${s.hs}:${s.as} ${T(m.away).name}${extra}`);
  });
}

// ---------- Кнопка «Провести игры» в расписании (регулярный чемпионат) ----------
async function lgSimTour() {
  if (!lgCan()) return;
  const tour = ui.tour, list = regular().filter(m => m.tour === tour), open = list.filter(lgUnplayed);
  if (!open.length) { lgToast(`В туре ${tour} нет несыгранных матчей`); return; }
  if (!confirm(`Провести игры тура ${tour}? Будет сыграно матчей: ${open.length}. Счёт, голы и передачи запишутся сами, результаты попадут в турнирную таблицу и статистику.`)) return;
  await lgGuard(async () => { const r = await lgSimRun(list); lgToast(`Тур ${tour}. ${lgSummary(r)}`); });
}

// ======================================================================
//  2. ДИНАМИЧЕСКИЕ МАТЧИ (плей-офф и турниры): коллекция games
//     Сам матч (счёт, голы, составы) живёт так же, как матчи регулярки: в matches/<key> и lineups/<key>__<команда>.
// ======================================================================
function lgSyncGames(snap) {
  for (let i = MATCHES.length - 1; i >= 0; i--) if (MATCHES[i].dyn) MATCHES.splice(i, 1);
  snap.forEach(d => {
    const g = d.data();
    // подпись пересчитываем, чтобы у матчей, созданных до переименования раундов, она тоже была верной
    MATCHES.push({ ...g, key: g.key || d.id, dyn: true, label: "", hs: null, as: null, ot: false, ...(g.stage === "playoff" && g.round !== undefined ? { tag: poTag(g) } : {}) });
  });
  applyLive();
}
function lgSyncTournaments(snap) {
  TN = {}; snap.forEach(d => { TN[d.id] = d.data(); });
  if (ui.tid && !TN[ui.tid]) ui.tid = null;
}
const lgGamesWrite = docs => lgBatch(docs.map(d => b => b.set(Backend.db.collection("games").doc(d.key), { ...d, createdAt: lgStamp() })));
// удалить игры вместе с их результатами и сохранёнными составами
function lgDeleteGamesOps(keys) {
  const ops = [];
  keys.forEach(k => {
    ops.push(b => b.delete(Backend.db.collection("games").doc(k)));
    if (LM[k]) ops.push(b => b.delete(Backend.db.collection("matches").doc(k)));
    Object.keys(LU).filter(id => id.startsWith(k + "__") && LU[id] && !LU[id].preset).forEach(id => ops.push(b => b.delete(Backend.db.collection("lineups").doc(id))));
  });
  return ops;
}

// ======================================================================
//  3. ПЛЕЙ-ОФФ
//     Серии до 4 побед. Сетка строится сама из сыгранных матчей плей-офф.
// ======================================================================
const poGames = () => MATCHES.filter(m => m.stage === "playoff");
const poHas = () => poGames().length > 0;

const poTag = g => `${PO_NAMES[g.round]}${g.conf ? " · " + CONF[g.conf] : ""} · Игра ${g.gn}`;
function poGameDoc(o) {
  const home = o.home || (PO_HOME_A[o.gn - 1] ? o.a : o.b), away = home === o.a ? o.b : o.a;
  return {
    key: `p${o.round}${o.conf ? o.conf[0] : "f"}${o.slot}g${o.gn}`, stage: "playoff",
    round: o.round, conf: o.conf || null, slot: o.slot, gn: o.gn, a: o.a, b: o.b, sa: o.sa || null, sb: o.sb || null,
    home, away, tour: 60 + o.round * 10 + o.gn,
    tag: poTag(o)
  };
}
// Серии: игры группируются по раунду, конференции и номеру серии; победы считаются по сыгранным матчам.
function poSeries(games) {
  const map = new Map();
  [...games].sort((x, y) => (x.round - y.round) || (x.slot - y.slot) || (x.gn - y.gn)).forEach(g => {
    const id = `${g.round}|${g.conf || "f"}|${g.slot}`;
    let s = map.get(id);
    if (!s) map.set(id, s = { id, round: g.round, conf: g.conf || null, slot: g.slot, a: g.a, b: g.b, sa: g.sa || null, sb: g.sb || null, wa: 0, wb: 0, games: [] });
    s.games.push(g);
    if (lgDone(g)) { const w = g.hs > g.as ? g.home : g.away; if (w === s.a) s.wa++; else if (w === s.b) s.wb++; }
  });
  return [...map.values()].map(s => ({ ...s, done: s.wa >= 4 || s.wb >= 4, winner: s.wa >= 4 ? s.a : s.wb >= 4 ? s.b : null, idle: s.games.every(lgDone) }));
}
// 8 лучших клубов конференции: из PLAYOFF_SEEDS (если вписаны в data.js) или из турнирной таблицы
function poSeeds(conf) {
  const given = (typeof PLAYOFF_SEEDS !== "undefined" && PLAYOFF_SEEDS[conf]) || [];
  return given.length === 8 ? given : standings(conf).slice(0, 8).map(r => r.t && r.t.id).filter(Boolean);
}
// Что добавить в расписание: сетка 1-8 / 4-5 / 2-7 / 3-6, затем следующие игры серий и следующие раунды.
function poBuild(games) {
  const series = poSeries(games), out = [], by = (r, c, i) => series.find(s => s.round === r && s.conf === c && s.slot === i);
  if (!series.length) {
    for (const conf of ["west", "east"]) {
      const seeds = poSeeds(conf);
      if (seeds.length < 8) return { out: [], msg: `В конференции «${CONF[conf]}» меньше 8 клубов — сетку составить нельзя` };
      [[0, 7], [3, 4], [1, 6], [2, 5]].forEach(([x, y], slot) => out.push(poGameDoc({ round: 0, conf, slot, gn: 1, a: seeds[x], b: seeds[y], sa: x + 1, sb: y + 1 })));
    }
    return { out, msg: "" };
  }
  series.forEach(s => { if (!s.done && s.idle) out.push(poGameDoc({ ...s, gn: s.games.length + 1 })); });
  for (const conf of ["west", "east"]) for (let r = 0; r < 2; r++) for (let i = 0; i < (r === 0 ? 2 : 1); i++) {
    const f1 = by(r, conf, 2 * i), f2 = by(r, conf, 2 * i + 1);
    if (!(f1 && f2 && f1.done && f2.done) || by(r + 1, conf, i)) continue;
    const x = { t: f1.winner, s: f1.winner === f1.a ? f1.sa : f1.sb }, y = { t: f2.winner, s: f2.winner === f2.a ? f2.sa : f2.sb };
    const [hi, lo] = (x.s || 99) <= (y.s || 99) ? [x, y] : [y, x];
    out.push(poGameDoc({ round: r + 1, conf, slot: i, gn: 1, a: hi.t, b: lo.t, sa: hi.s, sb: lo.s }));
  }
  const wf = by(2, "west", 0), ef = by(2, "east", 0), fin = by(3, null, 0);
  if (wf && ef && wf.done && ef.done && !fin) out.push(poGameDoc({ round: 3, conf: null, slot: 0, gn: 1, a: wf.winner, b: ef.winner }));
  if (out.length) return { out, msg: "" };
  if (fin && fin.done) return { out, msg: `Плей-офф завершён. Чемпион: ${T(fin.winner).name}` };
  return { out, msg: "Сначала проведите уже запланированные игры — после них появятся следующие" };
}

// ---------- Кнопки плей-офф в расписании ----------
function poToolsHtml() {
  if (!isAdmin()) return "";
  const b = (a, t) => `<button class="fillBtn" data-po="${a}" type="button">${t}</button>`;
  return `<div class="tourbar poBar">${b("build", "📅 Сделать расписание матчей")}${b("fill", "📝 Заполнить составы")}${b("sim", "🎲 Провести игры")}${b("add", "➕ Создать матч")}${poHas() ? b("clear", "🗑 Очистить плей-офф") : ""}</div>`;
}
// строка со счётом серии над матчами: «Лада 1:0 Спартак»
const poSerHead = s => `<div class="serHead${s.done ? " end" : ""}"><span>${esc(T(s.a).name)}</span><b>${s.wa}:${s.wb}</b><span>${esc(T(s.b).name)}</span>${s.done ? `<small>серия окончена</small>` : ""}</div>`;
function poListHtml() {
  const ser = poSeries(poGames()).sort((x, y) => (x.round - y.round) || String(x.conf).localeCompare(String(y.conf)) || (x.slot - y.slot));
  if (!ser.length) return `<p class="hint">Матчей плей-офф пока нет</p>`;
  let html = "", r = -1;
  ser.forEach(s => {
    if (s.round !== r) { r = s.round; html += `<h4 class="ph">${PO_NAMES[r]}</h4>`; }
    html += poSerHead(s) + s.games.map(matchHtml).join("");
  });
  return html;
}
// счёт серии для окна матча
const poSerOf = m => poSeries(poGames()).find(s => s.games.some(g => matchKey(g) === matchKey(m)));
async function poBuildRun() {
  if (!lgCan()) return;
  const games = poGames(), left = regular().filter(m => !lgDone(m)).length;
  if (!games.length) {
    const ask = left
      ? `Регулярный чемпионат ещё не закончен: не сыграно матчей — ${left}. Сетка составится по ТЕКУЩЕЙ таблице и может не совпасть с итоговой. Всё равно составить?`
      : "Составить сетку плей-офф по итоговой таблице сезона? 1-е место играет с 8-м, 2-е с 7-м, 3-е с 6-м, 4-е с 5-м (внутри своей конференции).";
    if (!confirm(ask)) return;
  }
  await lgGuard(async () => {
    const r = poBuild(games);
    if (!r.out.length) { lgToast(r.msg); return; }
    await lgGamesWrite(r.out);
    lgToast(`Добавлено матчей в расписание: ${r.out.length}`);
  });
}
async function poSimRun() {
  if (!lgCan()) return;
  const games = poGames(), pending = games.filter(lgUnplayed);
  if (!pending.length) { lgToast(games.length ? "Все запланированные игры уже сыграны. Нажмите «Сделать расписание матчей»" : "Матчей плей-офф пока нет. Нажмите «Сделать расписание матчей» или создайте матч вручную"); return; }
  await lgGuard(async () => {
    const r = await lgSimRun(pending, { playoff: true });
    const merged = games.map(g => r.res[matchKey(g)] ? { ...g, hs: r.res[matchKey(g)].hs, as: r.res[matchKey(g)].as, live: false } : g);
    const next = poBuild(merged);
    if (next.out.length) await lgGamesWrite(next.out);
    lgToast(lgSummary(r) + (next.out.length ? `. Запланировано новых игр: ${next.out.length}` : next.msg ? `. ${next.msg}` : ""));
  });
}
async function poClear() {
  if (!lgCan() || !poHas()) return;
  if (!confirm("Удалить все матчи плей-офф вместе с результатами и сохранёнными составами? Это нельзя отменить.")) return;
  await lgGuard(async () => { await lgBatch(lgDeleteGamesOps(poGames().map(matchKey))); lgToast("Плей-офф очищен"); });
}
function poAddModal() {
  if (!isAdmin()) return;
  const opts = `<option value="">— выберите клуб —</option>` + ["west", "east"].map(c => `<optgroup label="${CONF[c]}">${TEAMS.filter(t => t.conf === c).map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join("")}</optgroup>`).join("");
  openModal(`<h3>Создать матч плей-офф</h3>
    <p class="hint">Выберите раунд, хозяев и гостей. Если серия этих клубов уже есть — матч станет её следующей игрой.</p>
    <select class="inp" id="poRound">${PO_NAMES.map((n, i) => `<option value="${i}">${n}</option>`).join("")}</select>
    <p class="glab">Хозяева</p><select class="inp" id="poHome">${opts}</select>
    <p class="glab">Гости</p><select class="inp" id="poAway">${opts}</select>
    <div class="err" id="poErr"></div>
    <button class="btn big" data-po="addgo" type="button">➕ Создать матч</button>`);
}
async function poAddGo() {
  if (!lgCan()) return;
  const er = $("#poErr"), round = +$("#poRound").value, h = $("#poHome").value, a = $("#poAway").value;
  if (!h || !a) { er.textContent = "Выберите обоих соперников"; return; }
  if (h === a) { er.textContent = "Клуб не может играть сам с собой"; return; }
  const games = poGames(), series = poSeries(games);
  const s = series.find(x => x.round === round && ((x.a === h && x.b === a) || (x.a === a && x.b === h)));
  let doc;
  if (s) {
    if (s.done) { er.textContent = "Эта серия уже закончена (одна из команд выиграла 4 матча)"; return; }
    if (!s.idle) { er.textContent = "В этой серии уже есть несыгранный матч"; return; }
    if (s.games.length >= 7) { er.textContent = "В серии не больше 7 игр"; return; }
    doc = poGameDoc({ round, conf: s.conf, slot: s.slot, gn: s.games.length + 1, a: s.a, b: s.b, sa: s.sa, sb: s.sb, home: h });
  } else {
    const conf = round < 3 ? T(h).conf : null;
    if (round < 3 && T(h).conf !== T(a).conf) { er.textContent = "В этом раунде играют клубы одной конференции"; return; }
    let slot = 0; while (series.some(x => x.round === round && x.conf === conf && x.slot === slot)) slot++;
    doc = poGameDoc({ round, conf, slot, gn: 1, a: h, b: a, home: h });
  }
  await lgGuard(async () => { await lgGamesWrite([doc]); closeModal(); lgToast("Матч добавлен в расписание плей-офф"); });
}

// ---------- Сетка плей-офф: строится сама по матчам ----------
function poBracketHtml() {
  const series = poSeries(poGames()), names = ["1/8 финала", "1/4 финала", "1/2 финала"], cap = [4, 2, 1];
  const ser = s => s ? { a: s.a, b: s.b, sa: s.wa, sb: s.wb, w: s.winner } : { a: null, b: null, sa: 0, sb: 0, w: null };
  const col = conf => `<div class="box"><h3>${CONF[conf]}</h3><div class="bracket">${[0, 1, 2].map(r => `<div class="round"><h4>${names[r]}</h4>${Array.from({ length: cap[r] }, (_, i) => serHtml(ser(series.find(s => s.round === r && s.conf === conf && s.slot === i)))).join("")}</div>`).join("")}</div></div>`;
  const fin = series.find(s => s.round === 3);
  return col("west") + `<div style="height:14px"></div>` + col("east") +
    `<div class="box" style="margin-top:14px"><h3>Финал КХЛ</h3>${serHtml(ser(fin))}</div>` +
    (fin && fin.winner ? `<div class="champ">🏆 Чемпион: <b>${esc(T(fin.winner).name)}</b></div>` : "");
}

// ======================================================================
//  4. ТУРНИРЫ
// ======================================================================
// Круговой турнир: каждый с каждым (circles = 2 — ещё и ответные матчи). Метод «круга».
function roundRobin(ids, circles = 1) {
  const t = [...ids]; if (t.length % 2) t.push(null);
  const n = t.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      let a = t[i], b = t[n - 1 - i];
      if (a === null || b === null) continue;
      if ((r + i) % 2) [a, b] = [b, a];   // хозяева чередуются
      pairs.push([a, b]);
    }
    rounds.push(pairs);
    t.splice(1, 0, t.pop());
  }
  if (circles >= 2) rounds.slice().forEach(r => rounds.push(r.map(([a, b]) => [b, a])));
  return rounds;
}
function tnGames(tid, groups, circles) {
  const out = [], multi = groups.length > 1;
  groups.forEach((g, gi) => roundRobin(g.teams, circles).forEach((pairs, r) => pairs.forEach(([home, away]) => out.push({
    key: `x${tid}-${gi}-${r + 1}-${home}-${away}`, stage: "tournament", tid, grp: gi, rnd: r + 1, tour: 100 + r + 1, home, away,
    tag: (multi ? g.name + " · " : "") + "Тур " + (r + 1)
  }))));
  return out;
}
// таблица одной группы: победа 2 очка, ОТ/буллиты — победителю 2, проигравшему 1 (как в чемпионате)
function tnRows(tid, gi) {
  const rows = TN[tid].groups[gi].teams.map(id => ({ id, gp: 0, w: 0, otw: 0, otl: 0, l: 0, gf: 0, ga: 0, pts: 0 })), by = {};
  rows.forEach(r => { by[r.id] = r; });
  MATCHES.filter(m => m.tid === tid && m.grp === gi && lgDone(m)).forEach(m => {
    [[m.home, m.hs, m.as], [m.away, m.as, m.hs]].forEach(([id, f, a]) => {
      const r = by[id]; if (!r) return;
      r.gp++; r.gf += f; r.ga += a;
      if (f > a) { r.pts += 2; if (m.ot) r.otw++; else r.w++; }
      else if (m.ot) { r.otl++; r.pts += 1; } else r.l++;
    });
  });
  return rows.sort((x, y) => y.pts - x.pts || (y.w + y.otw) - (x.w + x.otw) || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || T(x.id).name.localeCompare(T(y.id).name, "ru"));
}
const tnMatches = tid => MATCHES.filter(m => m.tid === tid);
const tnTours = tid => Math.max(0, ...tnMatches(tid).map(m => m.rnd || 0));

function tnTableHtml(tid) {
  const d = TN[tid], multi = d.groups.length > 1;
  const box = (g, gi) => `<div class="box"><h3>${esc(g.name)}</h3><div class="tw"><table>
    <tr><th>Место</th><th class="l">Клуб</th><th>И</th><th>В</th><th>ВО</th><th>ПО</th><th>П</th><th>Ш</th><th>О</th></tr>
    ${tnRows(tid, gi).map((r, i) => `<tr><td>${i + 1}</td><td class="l"><div class="tm clickable" data-club="${r.id}">${badge(T(r.id))}<span>${esc(T(r.id).name)}</span></div></td><td>${r.gp}</td><td>${r.w}</td><td>${r.otw}</td><td>${r.otl}</td><td>${r.l}</td><td>${r.gf}:${r.ga}</td><td><b>${r.pts}</b></td></tr>`).join("")}
    </table></div></div>`;
  return `<div class="${multi ? "two" : ""}">${d.groups.map(box).join("")}</div>`;
}
function tnGamesHtml(tid) {
  const n = tnTours(tid), d = TN[tid];
  if (!n) return `<p class="hint">В турнире нет матчей</p>`;
  if (!ui.ttour) { const open = tnMatches(tid).filter(m => !lgDone(m)).sort((x, y) => x.rnd - y.rnd)[0]; ui.ttour = open ? open.rnd : n; }
  ui.ttour = Math.min(Math.max(1, ui.ttour), n);
  const list = tnMatches(tid).filter(m => m.rnd === ui.ttour).sort((x, y) => x.grp - y.grp);
  const bar = `<div class="tourbar"><button type="button" data-tn="prev" aria-label="Предыдущий тур">‹</button><select id="tnTourSel">${Array.from({ length: n }, (_, i) => `<option value="${i + 1}"${i + 1 === ui.ttour ? " selected" : ""}>Тур ${i + 1}</option>`).join("")}</select><button type="button" data-tn="next" aria-label="Следующий тур">›</button>${isAdmin() ? `<button type="button" class="fillBtn" data-tn="simtour">🎲 Провести игры</button>` : ""}</div>`;
  let html = bar, g = -1;
  list.forEach(m => { if (d.groups.length > 1 && m.grp !== g) { g = m.grp; html += `<h4 class="ph">${esc(d.groups[g].name)}</h4>`; } html += matchHtml(m); });
  return html;
}
function tnListHtml() {
  const list = Object.entries(TN).sort((a, b) => (b[1].order || 0) - (a[1].order || 0));
  if (!list.length) return `<p class="hint" style="margin-top:18px">Турниров пока нет${isAdmin() ? ". Нажмите «Создать турнир»" : ""}.</p>`;
  return `<div class="grid">${list.map(([id, d]) => {
    const ms = tnMatches(id), done = ms.filter(lgDone).length;
    return `<div class="card tcard" data-tn-open="${esc(id)}"><h4>${esc(d.name)}</h4><p class="hint">Команд: ${d.teams.length} · ${d.groups.length > 1 ? "групп: " + d.groups.length : "одна таблица"}<br>Сыграно ${done} из ${ms.length}</p></div>`;
  }).join("")}</div>`;
}
function renderTournaments() {
  const el = $("#tnBody"); if (!el) return;
  const adm = isAdmin();
  if (!ui.tid || !TN[ui.tid]) {
    el.innerHTML = (adm ? `<button class="btn" data-tn="new" type="button">➕ Создать турнир</button>` : "") + tnListHtml();
    return;
  }
  const d = TN[ui.tid], tab = ui.ttab || "table";
  el.innerHTML = `<button class="btn ghost" data-tn="back" type="button">‹ Все турниры</button>
    <h3 class="tnTitle">${esc(d.name)}</h3>
    <p class="hint">Команд: ${d.teams.length} · ${d.circles >= 2 ? "два круга" : "один круг"}${d.groups.length > 1 ? " · групп: " + d.groups.length : ""}</p>
    ${adm ? `<div class="tnAdm"><button class="btn" data-tn="simall" type="button">🎲 Провести весь турнир</button><button class="btn ghost" data-tn="del" type="button">🗑 Удалить турнир</button></div>` : ""}
    <div class="tabs"><button data-tn-tab="table"${tab === "table" ? ' class="on"' : ""}>Таблица</button><button data-tn-tab="games"${tab === "games" ? ' class="on"' : ""}>Матчи</button></div>
    ${tab === "table" ? tnTableHtml(ui.tid) : tnGamesHtml(ui.tid)}`;
}

// ---------- Создание турнира: команды → делить ли на группы и как → расписание ----------
const TW_L = "ABCDEFGH";
let TW = null;
const twSel = () => TEAMS.filter(t => TW.teams.has(t.id)).map(t => t.id);
function twShuffle(ids, n) {
  const a = [...ids]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(LG.rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  const g = Array.from({ length: n }, () => []); a.forEach((id, i) => g[i % n].push(id)); return g;
}
const twMaxN = () => Math.max(2, Math.min(8, Math.floor(twSel().length / 2)));
// группы по выбранному способу
function twGroups() {
  const ids = twSel();
  if (!TW.yes) return [{ name: "Общая таблица", teams: ids }];
  if (TW.how === "conf") return ["west", "east"].map(c => ({ name: CONF[c], teams: ids.filter(id => T(id).conf === c) })).filter(g => g.teams.length);
  if (TW.how === "div") { const divs = [...new Set(TEAMS.map(t => t.div))]; return divs.map(dv => ({ name: dv, teams: ids.filter(id => T(id).div === dv) })).filter(g => g.teams.length); }
  if (TW.how === "rand") return (TW.rand || []).map((tm, i) => ({ name: "Группа " + TW_L[i], teams: tm }));
  if (TW.how === "manual") return Array.from({ length: TW.n }, (_, i) => ({ name: "Группа " + TW_L[i], teams: ids.filter((id, k) => (TW.manual[id] === undefined ? k % TW.n : TW.manual[id]) === i) }));
  return [];
}
function twValidate(groups) {
  if (twSel().length < 2) return "Выберите хотя бы две команды";
  if (TW.yes && !TW.how) return "Выберите, как разделить команды на группы";
  if (!groups.length) return "Не получилось составить группы";
  const bad = groups.find(g => g.teams.length < 2);
  if (bad) return `В группе «${bad.name}» меньше двух команд`;
  return "";
}
function twHtml() {
  const err = TW.err ? `<div class="err">${esc(TW.err)}</div>` : "";
  if (TW.step === 1) {
    const col = c => `<div><h4 class="ph">${CONF[c]}</h4>${TEAMS.filter(t => t.conf === c).map(t => `<label class="frow"><input type="checkbox" data-tw-team="${t.id}"${TW.teams.has(t.id) ? " checked" : ""}>${badge(t)}<span class="fn"><b>${esc(t.name)}</b><small>${esc(t.div)}</small></span></label>`).join("")}</div>`;
    return `<h3>Новый турнир</h3><p class="hint">Шаг 1 из 2. Название и команды-участники.</p>
      <input class="inp" id="twName" maxlength="40" placeholder="Название турнира" value="${esc(TW.name)}" autocomplete="off">
      <p class="glab">Участники</p>
      <div class="twq"><button class="btn ghost sm" data-tw="all" type="button">Все</button><button class="btn ghost sm" data-tw="west" type="button">Запад</button><button class="btn ghost sm" data-tw="east" type="button">Восток</button><button class="btn ghost sm" data-tw="none" type="button">Очистить</button></div>
      <div class="two tnteams">${col("west")}${col("east")}</div>
      <p class="glab">Сколько кругов</p>
      <div class="twq"><button class="btn${TW.circles === 1 ? "" : " ghost"}" data-tw="c1" type="button">1 круг</button><button class="btn${TW.circles === 2 ? "" : " ghost"}" data-tw="c2" type="button">2 круга (дома и в гостях)</button></div>
      ${err}<button class="btn big" id="twNext" data-tw="next" type="button">Далее →</button>`;
  }
  const n = twSel().length, groups = twGroups();
  const both = ["west", "east"].every(c => twSel().some(id => T(id).conf === c));
  const hows = [["conf", "По конференциям", both], ["div", "По дивизионам", true], ["rand", "Жеребьёвка", true], ["manual", "Вручную", true]];
  const nSel = `<p class="glab">Сколько групп</p><select class="inp" id="twN">${Array.from({ length: twMaxN() - 1 }, (_, i) => i + 2).map(k => `<option${k === TW.n ? " selected" : ""}>${k}</option>`).join("")}</select>`;
  const manual = TW.how === "manual" ? twSel().map((id, k) => `<div class="twm">${badge(T(id))}<span>${esc(T(id).name)}</span><select class="inp" data-tw-man="${id}">${Array.from({ length: TW.n }, (_, i) => `<option value="${i}"${(TW.manual[id] === undefined ? k % TW.n : TW.manual[id]) === i ? " selected" : ""}>Группа ${TW_L[i]}</option>`).join("")}</select></div>`).join("") : "";
  const preview = TW.yes && !TW.how ? "" : `<h4 class="ph">Что получится</h4>` + groups.map(g => `<div class="twg"><b>${esc(g.name)}</b> <small class="muted">· ${g.teams.length}</small><div>${g.teams.map(id => `<span class="chip">${esc(T(id).short)}</span>`).join(" ")}</div></div>`).join("");
  return `<h3>${esc(TW.name || "Новый турнир")}</h3><p class="hint">Шаг 2 из 2. Команд: ${n}. Система составит расписание «каждый с каждым» (${TW.circles === 2 ? "два круга" : "один круг"}).</p>
    <h4 class="ph">Разделить команды на группы?</h4>
    <div class="twq"><button class="btn${TW.yes ? " ghost" : ""}" data-tw="no" type="button">Нет, одна таблица</button><button class="btn${TW.yes ? "" : " ghost"}" data-tw="yes" type="button">Да, разделить</button></div>
    ${TW.yes ? `<p class="glab">Как разделить</p><div class="twq">${hows.map(([k, t, ok]) => `<button class="btn${TW.how === k ? "" : " ghost"}" data-tw="how-${k}" type="button"${ok ? "" : " disabled"}>${t}</button>`).join("")}</div>` : ""}
    ${TW.yes && (TW.how === "rand" || TW.how === "manual") ? nSel : ""}
    ${TW.yes && TW.how === "rand" ? `<div class="twq"><button class="btn ghost sm" data-tw="shuffle" type="button">🔀 Перемешать</button></div>` : ""}
    ${manual}${preview}${err}
    <button class="btn big" data-tw="create" type="button">Создать турнир и расписание</button>
    <button class="btn big ghost" data-tw="back" type="button">‹ Назад</button>`;
}
function twRender() {
  const b = $("#modalBody");
  if ($("#overlay").classList.contains("on") && b.dataset.twz === "1") b.innerHTML = twHtml();
  else { openModal(twHtml()); $("#modalBody").dataset.twz = "1"; }
}
function twOpen() {
  if (!isAdmin()) return;
  TW = { step: 1, name: "", teams: new Set(), circles: 1, yes: false, how: "", n: 2, manual: {}, rand: null, err: "" };
  delete $("#modalBody").dataset.twz;   // окно открывается заново, а не поверх чужого
  twRender();
}
function twAct(a) {
  if (!TW) return;
  TW.err = "";
  if (a === "all") TW.teams = new Set(TEAMS.map(t => t.id));
  else if (a === "west" || a === "east") TW.teams = new Set(TEAMS.filter(t => t.conf === a).map(t => t.id));
  else if (a === "none") TW.teams = new Set();
  else if (a === "c1") TW.circles = 1;
  else if (a === "c2") TW.circles = 2;
  else if (a === "next") {
    TW.name = ($("#twName") ? $("#twName").value : TW.name).trim();
    if (!TW.name) { TW.err = "Введите название турнира"; twRender(); return; }
    if (twSel().length < 2) { TW.err = "Выберите хотя бы две команды"; twRender(); return; }
    TW.step = 2; TW.n = Math.min(TW.n, twMaxN());
  }
  else if (a === "back") { TW.step = 1; TW.yes = false; TW.how = ""; TW.rand = null; TW.manual = {}; }
  else if (a === "no") { TW.yes = false; TW.how = ""; }
  else if (a === "yes") { TW.yes = true; if (!TW.how) { TW.how = ["west", "east"].every(c => twSel().some(id => T(id).conf === c)) ? "conf" : "rand"; if (TW.how === "rand") TW.rand = twShuffle(twSel(), TW.n); } }
  else if (a.startsWith("how-")) { TW.how = a.slice(4); if (TW.how === "rand") TW.rand = twShuffle(twSel(), TW.n); if (TW.how === "manual") TW.manual = {}; }
  else if (a === "shuffle") TW.rand = twShuffle(twSel(), TW.n);
  else if (a === "create") return twCreate();
  twRender();
}
async function twCreate() {
  if (!lgCan()) return;
  const groups = twGroups(), err = twValidate(groups);
  if (err) { TW.err = err; twRender(); return; }
  const tid = "k" + Date.now().toString(36) + Math.floor(LG.rnd() * 1296).toString(36), games = tnGames(tid, groups, TW.circles);
  if (games.length > 300 && !confirm(`В турнире будет ${games.length} матчей. Создать?`)) return;
  await lgGuard(async () => {
    await Backend.db.collection("tournaments").doc(tid).set({ name: TW.name, teams: twSel(), circles: TW.circles, groups, order: Date.now(), createdAt: lgStamp() });
    await lgGamesWrite(games);
    ui.tid = tid; ui.ttab = "table"; ui.ttour = 0; TW = null;
    closeModal(); go("tournaments"); renderTournaments();
    lgToast(`Турнир создан. Матчей в расписании: ${games.length}`);
  });
}
async function tnSimTour() {
  if (!lgCan() || !ui.tid) return;
  const list = tnMatches(ui.tid).filter(m => m.rnd === ui.ttour), open = list.filter(lgUnplayed);
  if (!open.length) { lgToast(`В туре ${ui.ttour} нет несыгранных матчей`); return; }
  if (!confirm(`Провести игры тура ${ui.ttour}? Будет сыграно матчей: ${open.length}.`)) return;
  await lgGuard(async () => { const r = await lgSimRun(list); lgToast(`Тур ${ui.ttour}. ${lgSummary(r)}`); });
}
async function tnSimAll() {
  if (!lgCan() || !ui.tid) return;
  const list = tnMatches(ui.tid), open = list.filter(lgUnplayed);
  if (!open.length) { lgToast("В турнире нет несыгранных матчей"); return; }
  if (!confirm(`Провести весь турнир? Будет сыграно матчей: ${open.length}.`)) return;
  await lgGuard(async () => { const r = await lgSimRun(list); lgToast(lgSummary(r)); });
}
async function tnDelete() {
  if (!lgCan() || !ui.tid) return;
  const tid = ui.tid, d = TN[tid]; if (!d) return;
  if (!confirm(`Удалить турнир «${d.name}» вместе со всеми матчами и результатами? Это нельзя отменить.`)) return;
  await lgGuard(async () => {
    const ops = lgDeleteGamesOps(tnMatches(tid).map(matchKey));
    ops.push(b => b.delete(Backend.db.collection("tournaments").doc(tid)));
    await lgBatch(ops);
    ui.tid = null; renderTournaments(); lgToast("Турнир удалён");
  });
}

// ---------- События ----------
document.addEventListener("click", e => {
  const tw = e.target.closest("[data-tw]"); if (tw && !tw.disabled) twAct(tw.dataset.tw);
  const po = e.target.closest("[data-po]");
  if (po) { const a = po.dataset.po; if (a === "build") poBuildRun(); else if (a === "sim") poSimRun(); else if (a === "add") poAddModal(); else if (a === "addgo") poAddGo(); else if (a === "fill") fillModal(); else if (a === "clear") poClear(); }
  const op = e.target.closest("[data-tn-open]"); if (op) { ui.tid = op.dataset.tnOpen; ui.ttab = "table"; ui.ttour = 0; renderTournaments(); window.scrollTo(0, 0); }
  const tb = e.target.closest("[data-tn-tab]"); if (tb) { ui.ttab = tb.dataset.tnTab; renderTournaments(); }
  const tn = e.target.closest("[data-tn]");
  if (tn) {
    const a = tn.dataset.tn;
    if (a === "new") twOpen();
    else if (a === "back") { ui.tid = null; renderTournaments(); }
    else if (a === "prev") { ui.ttour = Math.max(1, ui.ttour - 1); renderTournaments(); }
    else if (a === "next") { ui.ttour++; renderTournaments(); }
    else if (a === "simtour") tnSimTour();
    else if (a === "simall") tnSimAll();
    else if (a === "del") tnDelete();
  }
  if (e.target.closest("#simBtn")) lgSimTour();
  if (e.target.closest("[data-sim1]")) lgSimOne();
});
document.addEventListener("change", e => {
  const t = e.target;
  if (TW && t.matches && t.matches("[data-tw-team]")) {
    if (t.checked) TW.teams.add(t.dataset.twTeam); else TW.teams.delete(t.dataset.twTeam);
  }
  else if (TW && t.id === "twN") { TW.n = +t.value; if (TW.how === "rand") TW.rand = twShuffle(twSel(), TW.n); TW.manual = {}; twRender(); }
  else if (TW && t.matches && t.matches("[data-tw-man]")) { TW.manual[t.dataset.twMan] = +t.value; twRender(); }
  else if (t.id === "tnTourSel") { ui.ttour = +t.value; renderTournaments(); }
});
document.addEventListener("input", e => { if (TW && e.target.id === "twName") TW.name = e.target.value; });
