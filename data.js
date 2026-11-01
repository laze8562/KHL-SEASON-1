// ===== ВСЕ ДАННЫЕ ЛИГИ ТУТ. Меняйте только этот файл. =====

const LEAGUE = {
  name: "КХЛ SEASON 1",
  sub: "Континентальная Хоккейная Лига",
  socials: [
    { t: "Телеграм", u: "https://t.me/" },   // <- вставьте свои ссылки
    { t: "Тикток", u: "https://www.tiktok.com/" }
  ]
};

// conf: "west" | "east"; color — акцентный цвет клуба
const TEAMS = [
  // ЗАПАД (11)
  { id: "ska", name: "СКА", short: "СКА", city: "Санкт-Петербург", arena: "Ледовый дворец", conf: "west", color: "#c8102e", titles: [] },
  { id: "cska", name: "ЦСКА", short: "ЦСК", city: "Москва", arena: "ЦСКА Арена", conf: "west", color: "#d4202c", titles: [] },
  { id: "dyn", name: "Динамо Москва", short: "ДИН", city: "Москва", arena: "ВТБ Арена", conf: "west", color: "#2a6ede", titles: [] },
  { id: "spa", name: "Спартак", short: "СПА", city: "Москва", arena: "Мегаспорт", conf: "west", color: "#e3262e", titles: [] },
  { id: "lok", name: "Локомотив", short: "ЛОК", city: "Ярославль", arena: "Арена 2000", conf: "west", color: "#e11b22", titles: [] },
  { id: "tor", name: "Торпедо", short: "ТОР", city: "Нижний Новгород", arena: "Нагорный", conf: "west", color: "#1f9d55", titles: [] },
  { id: "sev", name: "Северсталь", short: "СЕВ", city: "Череповец", arena: "Ледовый дворец", conf: "west", color: "#28a0d8", titles: [] },
  { id: "soc", name: "Сочи", short: "СОЧ", city: "Сочи", arena: "Большой", conf: "west", color: "#1d7bd6", titles: [] },
  { id: "dmn", name: "Динамо Минск", short: "ДМН", city: "Минск", arena: "Минск-Арена", conf: "west", color: "#2f6fd1", titles: [] },
  { id: "vit", name: "Витязь", short: "ВИТ", city: "Москва", arena: "Платинум Арена", conf: "west", color: "#e0a000", titles: [] },
  { id: "lad", name: "Лада", short: "ЛАД", city: "Тольятти", arena: "Лада-Арена", conf: "west", color: "#d4392b", titles: [] },
  // ВОСТОК (11)
  { id: "akb", name: "Ак Барс", short: "АКБ", city: "Казань", arena: "Татнефть Арена", conf: "east", color: "#1a9a5a", titles: [] },
  { id: "sal", name: "Салават Юлаев", short: "САЛ", city: "Уфа", arena: "Уфа-Арена", conf: "east", color: "#1b8fd2", titles: [] },
  { id: "mmg", name: "Металлург", short: "МГН", city: "Магнитогорск", arena: "Арена Металлург", conf: "east", color: "#2c7be5", titles: [] },
  { id: "ava", name: "Авангард", short: "АВА", city: "Омск", arena: "Арена Омск", conf: "east", color: "#e5352b", titles: [] },
  { id: "tra", name: "Трактор", short: "ТРА", city: "Челябинск", arena: "Трактор Арена", conf: "east", color: "#e8d000", titles: [] },
  { id: "avt", name: "Автомобилист", short: "АВТ", city: "Екатеринбург", arena: "КРК Уралец", conf: "east", color: "#e6b800", titles: [] },
  { id: "nef", name: "Нефтехимик", short: "НЕФ", city: "Нижнекамск", arena: "Нефтехимик Арена", conf: "east", color: "#e2762b", titles: [] },
  { id: "sib", name: "Сибирь", short: "СИБ", city: "Новосибирск", arena: "Сибирь-Арена", conf: "east", color: "#2a8ee0", titles: [] },
  { id: "amu", name: "Амур", short: "АМУ", city: "Хабаровск", arena: "Платинум Арена", conf: "east", color: "#e07a1f", titles: [] },
  { id: "adm", name: "Адмирал", short: "АДМ", city: "Владивосток", arena: "Фетисов Арена", conf: "east", color: "#1f6fd1", titles: [] },
  { id: "bar", name: "Барыс", short: "БАР", city: "Астана", arena: "Барыс Арена", conf: "east", color: "#1aa0c8", titles: [] }
];

// Матч: M(дата, время, хозяева, гости, голы хозяев, голы гостей, овертайм/буллиты?, стадия)
// Будущий матч: не указывайте голы -> M("2026-11-08","19:00","ska","cska")
function M(date, time, home, away, hs = null, as = null, ot = false, stage = "regular") {
  return { date, time, home, away, hs, as, ot, stage };
}

const MATCHES = [
  // сыгранные
  M("2026-09-05", "19:00", "ska", "cska", 3, 2, true),
  M("2026-09-05", "19:30", "dyn", "spa", 4, 1),
  M("2026-09-06", "18:00", "lok", "tor", 2, 3),
  M("2026-09-06", "19:00", "sev", "soc", 1, 0),
  M("2026-09-07", "17:00", "akb", "sal", 5, 2),
  M("2026-09-07", "18:30", "mmg", "ava", 2, 1, true),
  M("2026-09-08", "19:00", "tra", "avt", 3, 4),
  M("2026-09-08", "20:00", "nef", "sib", 0, 2),
  M("2026-09-10", "19:00", "dmn", "vit", 3, 1),
  M("2026-09-10", "19:30", "lad", "ska", 1, 4),
  M("2026-09-12", "18:00", "amu", "adm", 2, 3, true),
  M("2026-09-12", "19:00", "bar", "akb", 1, 3),
  M("2026-10-03", "19:00", "cska", "dyn", 2, 1),
  M("2026-10-04", "19:00", "sal", "mmg", 4, 3),
  // будущие
  M("2026-11-08", "19:00", "ska", "dyn"),
  M("2026-11-08", "19:30", "cska", "lok"),
  M("2026-11-09", "18:00", "akb", "mmg"),
  M("2026-11-09", "19:00", "sib", "ava"),
  M("2026-11-12", "19:00", "spa", "tor"),
  M("2026-11-12", "18:30", "bar", "adm"),
  M("2026-11-15", "19:00", "sal", "tra"),
  M("2026-11-15", "19:30", "vit", "soc")
];

// Новости (новые сверху определяются по дате)
const NEWS = [
  { date: "2026-10-30", title: "Открытие Season 1", text: "Стартует первый сезон Континентальной Хоккейной Лиги: 22 клуба, две конференции." },
  { date: "2026-10-28", title: "Регламент сезона", text: "Победа в основное время — 3 очка, в овертайме — 2, поражение в овертайме — 1. В плей-офф выходят 8 лучших клубов каждой конференции." },
  { date: "2026-10-25", title: "Жеребьёвка календаря", text: "Календарь регулярного чемпионата опубликован в разделе «Расписание»." },
  { date: "2026-10-20", title: "Заявки клубов приняты", text: "Все 22 клуба подтвердили участие в первом сезоне." }
];

// Результаты серий плей-офф до 4 побед. Ключ: "конференция-раунд-номер", раунд 0 = 1/4, 1 = 1/2, 2 = финал конференции.
// Пример: "west-0-0": { a: 4, b: 2 }   — первая пара 1/4 финала Запада, 4:2 в пользу верхнего посева.
// Финал лиги: "final": { a: 0, b: 0 }  (a — победитель Запада, b — победитель Востока)
const PLAYOFF = {
  // "west-0-0": { a: 4, b: 2 },
};
