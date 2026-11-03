// ===== ВСЕ ДАННЫЕ ЛИГИ ТУТ. Меняйте только этот файл. =====

const LEAGUE = {
  name: "КХЛ SEASON 1",
  sub: "Континентальная Хоккейная Лига",
  socials: [
    { t: "Телеграм", u: "https://t.me/khlseaso" },   // <- вставьте свои ссылки
    { t: "Тикток", u: "https://www.tiktok.com/" }
  ]
};

// Логотипы: положите файл <id>.png в папку LOGO_DIR (например ska.png, cska.png).
// Если файла нет, показывается цветной кружок с сокращением.
// Если загружаете файлы с телефона прямо в корень репозитория, поставьте LOGO_DIR = "".
const LOGO_DIR = "";

// conf: "west" | "east"; div — дивизион; color — акцентный цвет клуба
const TEAMS = [
  // ЗАПАД — Дивизион Боброва
  { id: "lad", name: "Лада", short: "ЛАД", city: "Тольятти", arena: "Лада-Арена", conf: "west", div: "Дивизион Боброва", color: "#2a6ede", titles: [] },
  { id: "ska", name: "СКА", short: "СКА", city: "Санкт-Петербург", arena: "Ледовый дворец", conf: "west", div: "Дивизион Боброва", color: "#c8102e", titles: [] },
  { id: "spa", name: "Спартак", short: "СПА", city: "Москва", arena: "Мегаспорт", conf: "west", div: "Дивизион Боброва", color: "#e3262e", titles: [] },
  { id: "tor", name: "Торпедо", short: "ТОР", city: "Нижний Новгород", arena: "Нагорный", conf: "west", div: "Дивизион Боброва", color: "#c81e5a", titles: [] },
  { id: "soc", name: "ХК Сочи", short: "СОЧ", city: "Сочи", arena: "Большой", conf: "west", div: "Дивизион Боброва", color: "#e0a000", titles: [] },
  // ЗАПАД — Дивизион Тарасова
  { id: "dyn", name: "Динамо М", short: "ДИН", city: "Москва", arena: "ВТБ Арена", conf: "west", div: "Дивизион Тарасова", color: "#2a6ede", titles: [] },
  { id: "dmn", name: "Динамо Мн", short: "ДМН", city: "Минск", arena: "Минск-Арена", conf: "west", div: "Дивизион Тарасова", color: "#2aa5d8", titles: [] },
  { id: "dra", name: "Драконы", short: "ДРА", city: "Шанхай", arena: "—", conf: "west", div: "Дивизион Тарасова", color: "#e8761f", titles: [] },
  { id: "lok", name: "Локомотив", short: "ЛОК", city: "Ярославль", arena: "Арена 2000", conf: "west", div: "Дивизион Тарасова", color: "#e11b22", titles: [] },
  { id: "sev", name: "Северсталь", short: "СЕВ", city: "Череповец", arena: "Ледовый дворец", conf: "west", div: "Дивизион Тарасова", color: "#e8c000", titles: [] },
  { id: "cska", name: "ЦСКА", short: "ЦСК", city: "Москва", arena: "ЦСКА Арена", conf: "west", div: "Дивизион Тарасова", color: "#d4202c", titles: [] },
  // ВОСТОК — Дивизион Харламова
  { id: "avt", name: "Автомобилист", short: "АВТ", city: "Екатеринбург", arena: "КРК Уралец", conf: "east", div: "Дивизион Харламова", color: "#d4202c", titles: [] },
  { id: "akb", name: "Ак Барс", short: "АКБ", city: "Казань", arena: "Татнефть Арена", conf: "east", div: "Дивизион Харламова", color: "#1a9a5a", titles: [] },
  { id: "mmg", name: "Металлург Мг", short: "МГН", city: "Магнитогорск", arena: "Арена Металлург", conf: "east", div: "Дивизион Харламова", color: "#e0a800", titles: [] },
  { id: "nef", name: "Нефтехимик", short: "НЕФ", city: "Нижнекамск", arena: "Нефтехимик Арена", conf: "east", div: "Дивизион Харламова", color: "#2a8ee0", titles: [] },
  { id: "tra", name: "Трактор", short: "ТРА", city: "Челябинск", arena: "Трактор Арена", conf: "east", div: "Дивизион Харламова", color: "#7a8494", titles: [] },
  // ВОСТОК — Дивизион Чернышева
  { id: "ava", name: "Авангард", short: "АВА", city: "Омск", arena: "Арена Омск", conf: "east", div: "Дивизион Чернышева", color: "#e5352b", titles: [] },
  { id: "adm", name: "Адмирал", short: "АДМ", city: "Владивосток", arena: "Фетисов Арена", conf: "east", div: "Дивизион Чернышева", color: "#1f6fd1", titles: [] },
  { id: "amu", name: "Амур", short: "АМУ", city: "Хабаровск", arena: "Платинум Арена", conf: "east", div: "Дивизион Чернышева", color: "#e07a1f", titles: [] },
  { id: "bar", name: "Барыс", short: "БАР", city: "Астана", arena: "Барыс Арена", conf: "east", div: "Дивизион Чернышева", color: "#1aa0c8", titles: [] },
  { id: "sal", name: "Салават Юлаев", short: "САЛ", city: "Уфа", arena: "Уфа-Арена", conf: "east", div: "Дивизион Чернышева", color: "#1b8fd2", titles: [] },
  { id: "sib", name: "Сибирь", short: "СИБ", city: "Новосибирск", arena: "Сибирь-Арена", conf: "east", div: "Дивизион Чернышева", color: "#2a8ee0", titles: [] }
];

// ТУРНИРНАЯ ТАБЛИЦА (вписана вручную по вашим скриншотам). Порядок строк = места.
// Формат: [id клуба, игры, победы (В), победы в овертайме (ВО), очки]
const STANDINGS = {
  west: [
    ["dyn", 0, 0, 0, 0],
    ["dmn", 0, 0, 0, 0],
    ["dra", 0, 0, 0, 0],
    ["lad", 0, 0, 0, 0],
    ["lok", 0, 0, 0, 0],
    ["ska", 0, 0, 0, 0],
    ["sev", 0, 0, 0, 0],
    ["spa", 0, 0, 0, 0],
    ["tor", 0, 0, 0, 0],
    ["soc", 0, 0, 0, 0],
    ["cska", 0, 0, 0, 0]
  ],
  east: [
    ["ava", 0, 0, 0, 0],
    ["avt", 0, 0, 0, 0],
    ["adm", 0, 0, 0, 0],
    ["akb", 0, 0, 0, 0],
    ["amu", 0, 0, 0, 0],
    ["bar", 0, 0, 0, 0],
    ["mmg", 0, 0, 0, 0],
    ["nef", 0, 0, 0, 0],
    ["sal", 0, 0, 0, 0],
    ["sib", 0, 0, 0, 0],
    ["tra", 0, 0, 0, 0]
  ]
};

// РАСПИСАНИЕ РЕГУЛЯРНОГО ЧЕМПИОНАТА (21 тур, по 11 матчей).
// Матч: ["хозяева", "гости", "подпись (необязательно, например дерби)", "счёт (необязательно)"]
// Не сыгран: просто не пишите счёт. Результат: ["ska", "cska", "", "3:2"]
// Овертайм: "3:2 ОТ", буллиты: "3:2 Б". Подпись пропустить: пустые кавычки "".
const SCHEDULE = [
  { tour: 1, games: [
    ["akb", "tor", "Матч Открытия КХЛ SEASON 1"],
    ["amu", "sal"],
    ["ava", "sev"],
    ["bar", "spa", "Столичное Дерби"],
    ["soc", "adm"],
    ["nef", "dra"],
    ["tra", "dmn"],
    ["dyn", "lad"],
    ["sib", "cska"],
    ["ska", "lok"],
    ["mmg", "avt", "Уральское Дерби"]
  ]},
  { tour: 2, games: [
    ["ava", "amu"],
    ["sal", "spa"],
    ["adm", "sev"],
    ["akb", "bar", "Кошачье Дерби"],
    ["soc", "nef"],
    ["dmn", "tor"],
    ["lad", "dra"],
    ["tra", "sib"],
    ["lok", "dyn"],
    ["avt", "cska"],
    ["ska", "mmg"]
  ]},
  { tour: 3, games: [
    ["spa", "amu"],
    ["ava", "adm"],
    ["sal", "akb", "Зелёное Дерби"],
    ["nef", "sev"],
    ["bar", "dmn", "Столичное Дерби"],
    ["soc", "lad"],
    ["sib", "tor"],
    ["dra", "lok"],
    ["tra", "avt", "Уральское Дерби"],
    ["mmg", "dyn"],
    ["cska", "ska", "Армейское Дерби"]
  ]},
  { tour: 4, games: [
    ["adm", "amu", "Дальне-Восточное Дерби"],
    ["akb", "spa"],
    ["ava", "nef"],
    ["dmn", "sal"],
    ["lad", "sev"],
    ["bar", "sib"],
    ["lok", "soc"],
    ["avt", "tor"],
    ["dra", "mmg"],
    ["ska", "tra"],
    ["cska", "dyn", "Московское Дерби"]
  ]},
  { tour: 5, games: [
    ["amu", "akb"],
    ["nef", "adm"],
    ["spa", "dmn", "Столичное Дерби"],
    ["ava", "lad"],
    ["sib", "sal"],
    ["sev", "lok"],
    ["bar", "avt"],
    ["mmg", "soc"],
    ["tor", "ska"],
    ["dra", "cska"],
    ["dyn", "tra"]
  ]},
  { tour: 6, games: [
    ["amu", "nef"],
    ["dmn", "akb"],
    ["lad", "adm"],
    ["spa", "sib"],
    ["lok", "ava"],
    ["avt", "sal", "Уральское Дерби"],
    ["sev", "mmg"],
    ["ska", "bar"],
    ["cska", "soc"],
    ["tor", "dyn"],
    ["tra", "dra"]
  ]},
  { tour: 7, games: [
    ["amu", "dmn"],
    ["nef", "lad"],
    ["sib", "akb"],
    ["adm", "lok"],
    ["spa", "avt"],
    ["mmg", "ava"],
    ["sal", "ska"],
    ["sev", "cska"],
    ["bar", "dyn", "Столичное Дерби"],
    ["soc", "tra"],
    ["tor", "dra"]
  ]},
  { tour: 8, games: [
    ["lok", "amu"],
    ["sib", "avt"],
    ["mmg", "lad"],
    ["ska", "dmn"],
    ["nef", "cska"],
    ["dyn", "akb"],
    ["tra", "adm"],
    ["spa", "dra"],
    ["tor", "ava"],
    ["soc", "sal"],
    ["sev", "bar"]
  ]},
  { tour: 9, games: [
    ["sib", "amu"],
    ["lad", "lok"],
    ["dmn", "avt"],
    ["mmg", "nef"],
    ["akb", "ska"],
    ["adm", "cska"],
    ["spa", "dyn", "Московское Дерби"],
    ["ava", "tra"],
    ["sal", "dra"],
    ["tor", "sev"],
    ["bar", "soc"]
  ]},
  { tour: 10, games: [
    ["lad", "amu"],
    ["sib", "dmn"],
    ["nef", "lok"],
    ["avt", "akb"],
    ["mmg", "adm"],
    ["spa", "ska"],
    ["cska", "ava"],
    ["dyn", "sal"],
    ["sev", "tra"],
    ["dra", "bar"],
    ["tor", "soc"]
  ]},
  { tour: 11, games: [
    ["amu", "avt"],
    ["mmg", "lok"],
    ["sib", "ska"],
    ["lad", "cska"],
    ["dmn", "dyn", "Дерби Динамо"],
    ["nef", "tra"],
    ["akb", "dra"],
    ["tor", "adm"],
    ["spa", "soc"],
    ["ava", "bar"],
    ["sev", "sal"]
  ]},
  { tour: 12, games: [
    ["ska", "amu"],
    ["mmg", "cska"],
    ["avt", "dyn"],
    ["tra", "lok"],
    ["sib", "dra"],
    ["lad", "tor"],
    ["soc", "dmn"],
    ["nef", "bar"],
    ["akb", "sev"],
    ["sal", "adm"],
    ["spa", "ava"]
  ]},
  { tour: 13, games: [
    ["mmg", "amu"],
    ["ska", "avt"],
    ["lok", "cska"],
    ["dyn", "sib"],
    ["tra", "lad"],
    ["dmn", "dra"],
    ["tor", "nef"],
    ["soc", "akb"],
    ["adm", "bar"],
    ["sev", "spa"],
    ["sal", "ava"]
  ]},
  { tour: 14, games: [
    ["cska", "amu"],
    ["ska", "dyn"],
    ["tra", "mmg", "Уральское Дерби"],
    ["dra", "avt"],
    ["lok", "tor"],
    ["soc", "sib"],
    ["bar", "lad"],
    ["dmn", "sev"],
    ["sal", "nef"],
    ["ava", "akb"],
    ["adm", "spa"]
  ]},
  { tour: 15, games: [
    ["amu", "tra"],
    ["dra", "dyn"],
    ["tor", "cska"],
    ["ska", "soc"],
    ["bar", "mmg"],
    ["sev", "avt"],
    ["lok", "sal"],
    ["ava", "sib"],
    ["spa", "lad"],
    ["dmn", "adm"],
    ["akb", "nef"]
  ]},
  { tour: 16, games: [
    ["amu", "dyn"],
    ["cska", "tra"],
    ["dra", "ska"],
    ["mmg", "tor"],
    ["avt", "soc"],
    ["bar", "lok"],
    ["sib", "sev"],
    ["lad", "sal"],
    ["ava", "dmn"],
    ["nef", "spa"],
    ["akb", "adm"]
  ]},
  { tour: 17, games: [
    ["amu", "dra"],
    ["tor", "tra"],
    ["dyn", "soc"],
    ["cska", "bar"],
    ["sev", "ska"],
    ["mmg", "sal", "Уральское Дерби"],
    ["avt", "ava"],
    ["spa", "lok"],
    ["sib", "adm"],
    ["lad", "akb"],
    ["nef", "dmn"]
  ]},
  { tour: 18, games: [
    ["amu", "bar"],
    ["sev", "soc"],
    ["sal", "tor"],
    ["dra", "ava"],
    ["spa", "tra"],
    ["adm", "dyn"],
    ["cska", "akb"],
    ["nef", "ska"],
    ["dmn", "mmg"],
    ["avt", "lad"],
    ["sib", "lok"]
  ]},
  { tour: 19, games: [
    ["amu", "soc"],
    ["tor", "bar"],
    ["sev", "dra"],
    ["tra", "sal", "Уральское Дерби"],
    ["dyn", "ava"],
    ["cska", "spa", "Московское Дерби"],
    ["ska", "adm"],
    ["mmg", "akb"],
    ["nef", "avt"],
    ["lok", "dmn"],
    ["sib", "lad"]
  ]},
  { tour: 20, games: [
    ["tor", "amu"],
    ["dra", "soc"],
    ["bar", "tra"],
    ["sev", "dyn"],
    ["cska", "sal"],
    ["ava", "ska"],
    ["spa", "mmg"],
    ["avt", "adm"],
    ["akb", "lok"],
    ["nef", "sib"],
    ["lad", "dmn"]
  ]},
  { tour: 21, games: [
    ["sev", "amu"],
    ["bar", "sal"],
    ["soc", "ava"],
    ["spa", "tor"],
    ["dra", "adm"],
    ["tra", "akb"],
    ["nef", "dyn"],
    ["cska", "dmn", "Столичное Дерби"],
    ["ska", "lad"],
    ["sib", "mmg"],
    ["avt", "lok"]
  ]}
];

function M(date, time, home, away, hs = null, as = null, ot = false, stage = "regular") {
  return { date, time, home, away, hs, as, ot, stage };
}

const MATCHES = [];
SCHEDULE.forEach(t => t.games.forEach(([home, away, label, score]) => {
  const m = { tour: t.tour, home, away, label: label || "", hs: null, as: null, ot: false, stage: "regular" };
  const r = score && String(score).match(/^\s*(\d+)\s*[:\-]\s*(\d+)\s*(ОТ|Б)?\s*$/);
  if (r) { m.hs = +r[1]; m.as = +r[2]; m.ot = !!r[3]; }
  MATCHES.push(m);
}));

// Новости (новые сверху определяются по дате)
const NEWS = [
  { date: "2026-10-30", title: "Открытие Season 1", text: "Стартует первый сезон Континентальной Хоккейной Лиги: 22 клуба, две конференции." },
  { date: "2026-10-28", title: "Регламент сезона", text: "В плей-офф выходят 8 лучших клубов каждой конференции." },
  { date: "2026-10-25", title: "Жеребьёвка календаря", text: "Календарь регулярного чемпионата опубликован в разделе «Расписание»." },
  { date: "2026-10-20", title: "Заявки клубов приняты", text: "Все 22 клуба подтвердили участие в первом сезоне." }
];

// ПЛЕЙ-ОФФ: посев клубов. Пока регулярка не закончилась — оставьте пустым (сетка будет пустой).
// Потом впишите по 8 клубов в порядке мест (1-е место первым). Пары: 1-8, 4-5, 2-7, 3-6.
// Пример: west: ["lok","cska","spa","tor","sev","dra","dmn","dyn"]
const PLAYOFF_SEEDS = { west: [], east: [] };

// Результаты серий плей-офф до 4 побед. Ключ: "конференция-раунд-номер", раунд 0 = 1/4, 1 = 1/2, 2 = финал конференции.
// Пример: "west-0-0": { a: 4, b: 2 }   — первая пара 1/4 финала Запада, 4:2 в пользу верхнего посева.
// Финал лиги: "final": { a: 0, b: 0 }  (a — победитель Запада, b — победитель Востока)
const PLAYOFF = {
  // "west-0-0": { a: 4, b: 2 },
};
