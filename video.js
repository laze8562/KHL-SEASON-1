// ======================================================================
//  Видео матча с любой площадки: YouTube, Twitch, VK Видео, Rutube, Vimeo и прямая ссылка на файл.
//  Что здесь есть:
//    VID.parse(url)            -> { kind, id, ... } или null, если площадка не распознана
//    VID.mount(box, v, opts)   -> плеер внутри box; возвращает { time(), seek(s), play(), pause(), destroy() }
//    VID.pairMarks(goals, m)   -> расстановка меток по голам (порядок гола = порядок метки)
//  Плеер нужен, чтобы сайт сам читал текущее время видео: оно подставляется в гол вместо ручного ввода.
// ======================================================================
const VID = (() => {
  const LABEL = { yt: "YouTube", twitch: "Twitch", vk: "VK Видео", rutube: "Rutube", vimeo: "Vimeo", file: "видеофайл" };
  const SUPPORTED = "YouTube, Twitch (записи), VK Видео, Rutube, Vimeo или прямая ссылка на .mp4 / .webm / .mov";

  // ---------- Распознавание ссылки ----------
  function parse(raw) {
    const s = String(raw || "").trim();
    if (!/^https?:\/\//i.test(s)) return null;
    let u; try { u = new URL(s); } catch (_) { return null; }
    const host = u.hostname.toLowerCase().replace(/^(www|m)\./, ""), path = u.pathname, q = u.searchParams;
    const mk = (kind, id, extra) => ({ kind, id, url: s, label: LABEL[kind], ...(extra || {}) });
    let m;

    if (host === "youtu.be") { m = path.match(/^\/([\w-]{11})/); if (m) return mk("yt", m[1]); }
    if (/(^|\.)youtube(-nocookie)?\.com$/.test(host)) {
      const v = q.get("v"); if (v && /^[\w-]{11}$/.test(v)) return mk("yt", v);
      m = path.match(/^\/(?:live|embed|shorts|v)\/([\w-]{11})/); if (m) return mk("yt", m[1]);
    }

    if (host === "twitch.tv" || host.endsWith(".twitch.tv")) {
      m = path.match(/\/videos\/(\d+)/); if (m) return mk("twitch", m[1]);
      const pv = q.get("video"); if (pv && /^v?\d+$/.test(pv)) return mk("twitch", pv.replace(/^v/, ""));
    }

    if (host === "vk.com" || host === "vk.ru" || host === "vkvideo.ru" || host.endsWith(".vk.com")) {
      const hash = q.get("hash") || "";
      const oid = q.get("oid"), id = q.get("id");
      if (/^-?\d+$/.test(oid || "") && /^\d+$/.test(id || "")) return mk("vk", id, { oid, hash });
      m = s.match(/video(-?\d+)_(\d+)/); if (m) return mk("vk", m[2], { oid: m[1], hash });
    }

    if (host === "rutube.ru") {
      m = path.match(/^\/(?:video|play\/embed|shorts)\/(?:private\/)?([0-9a-f]{32})/i);
      if (m) return mk("rutube", m[1].toLowerCase(), { key: q.get("p") || "" });
    }

    if (host === "vimeo.com" || host === "player.vimeo.com") {
      m = path.match(/\/(?:video\/)?(\d{5,})(?:\/([0-9a-f]{6,}))?/i);
      if (m) return mk("vimeo", m[1], { h: q.get("h") || m[2] || "" });
    }

    if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(path)) return mk("file", s);
    return null;
  }

  // ---------- Загрузка внешних скриптов ----------
  const scripts = {};
  const load = src => scripts[src] || (scripts[src] = new Promise((ok, fail) => {
    const el = document.createElement("script"); el.src = src; el.onload = ok;
    el.onerror = () => { delete scripts[src]; fail(new Error("Не загрузился " + src)); };
    document.head.appendChild(el);
  }));
  let ytReady = null;
  const loadYT = () => ytReady || (ytReady = new Promise((ok, fail) => {
    if (window.YT && window.YT.Player) return ok();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); ok(); };
    load("https://www.youtube.com/iframe_api").catch(e => { ytReady = null; fail(e); });
  }));
  const within = (p, ms, msg) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(msg)), ms))]);
  let uid = 0;
  const frame = (src, allow) => {
    const f = document.createElement("iframe");
    f.src = src; f.allow = allow || "autoplay; encrypted-media; picture-in-picture; fullscreen"; f.allowFullscreen = true;
    f.referrerPolicy = "strict-origin-when-cross-origin";
    return f;
  };
  const hms = s => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 3600)}h${Math.floor(s % 3600 / 60)}m${s % 60}s`; };

  // ---------- Драйверы площадок ----------
  // каждый возвращает { time, seek, play, pause, destroy }; time() отдаёт секунды или null, пока плеер не готов
  const drivers = {
    async yt(el, v, o) {
      await within(loadYT(), 15000, "Не загрузился плеер YouTube");
      const box = document.createElement("div"); el.appendChild(box);
      const p = await within(new Promise(ok => {
        const pl = new YT.Player(box, {
          videoId: v.id, width: "100%", height: "100%",
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1, autoplay: o.autoplay ? 1 : 0, start: Math.floor(o.start || 0) },
          events: { onReady: () => ok(pl) }
        });
      }), 15000, "Плеер YouTube не ответил");
      return {
        time: () => { try { return p.getCurrentTime(); } catch (_) { return null; } },
        seek: s => p.seekTo(s, true), play: () => p.playVideo(), pause: () => p.pauseVideo(),
        destroy: () => { try { p.destroy(); } catch (_) {} }
      };
    },

    async twitch(el, v, o) {
      if (!location.hostname) throw new Error("Twitch-плеер работает только на сайте с адресом, не с файла на компьютере");
      await within(load("https://player.twitch.tv/js/embed/v1.js"), 15000, "Не загрузился плеер Twitch");
      const box = document.createElement("div"); box.id = "vid-tw-" + (++uid); el.appendChild(box);
      const p = new Twitch.Player(box.id, {
        video: "v" + v.id, parent: [location.hostname], autoplay: !!o.autoplay, muted: false,
        time: hms(o.start), width: "100%", height: "100%"
      });
      await within(new Promise(ok => p.addEventListener(Twitch.Player.READY, ok)), 20000, "Плеер Twitch не ответил");
      return {
        time: () => { try { return p.getCurrentTime(); } catch (_) { return null; } },
        seek: s => p.seek(s), play: () => p.play(), pause: () => p.pause(),
        destroy: () => { try { p.destroy && p.destroy(); } catch (_) {} }
      };
    },

    async vk(el, v, o) {
      const q = `oid=${v.oid}&id=${v.id}${v.hash ? "&hash=" + encodeURIComponent(v.hash) : ""}&js_api=1${o.start ? "&t=" + hms(o.start) : ""}${o.autoplay ? "&autoplay=1" : ""}`;
      const f = frame("https://vk.ru/video_ext.php?" + q, "autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;");
      el.appendChild(f);
      await within(load("https://vk.ru/js/api/videoplayer.js").catch(() => load("https://vk.com/js/api/videoplayer.js")), 15000, "Не загрузился плеер VK");
      const p = VK.VideoPlayer(f);
      let t = null;
      const num = x => (typeof x === "number" && isFinite(x) ? x : x && typeof x === "object" && isFinite(x.time ?? x.currentTime) ? +(x.time ?? x.currentTime) : null);
      try { p.on("timeupdate", x => { const n = num(x); if (n !== null) t = n; }); } catch (_) {}
      const poll = setInterval(() => { try { Promise.resolve(p.getCurrentTime()).then(x => { const n = num(x); if (n !== null) t = n; }, () => {}); } catch (_) {} }, 500);
      return {
        time: () => t, seek: s => { t = s; p.seek(s); }, play: () => p.play(), pause: () => p.pause(),
        destroy: () => clearInterval(poll)
      };
    },

    async rutube(el, v, o) {
      const f = frame(`https://rutube.ru/play/embed/${v.id}${v.key ? "?p=" + encodeURIComponent(v.key) : ""}`);
      el.appendChild(f);
      let t = null;
      const send = (type, data) => { try { f.contentWindow.postMessage(JSON.stringify({ type, data: data || {} }), "*"); } catch (_) {} };
      const onMsg = e => {
        if (e.source !== f.contentWindow) return;
        let d = e.data; if (typeof d === "string") { try { d = JSON.parse(d); } catch (_) { return; } }
        if (d && d.type === "player:currentTime" && d.data && isFinite(d.data.time)) t = +d.data.time;
      };
      window.addEventListener("message", onMsg);
      await within(new Promise(ok => f.addEventListener("load", ok)), 15000, "Не загрузился плеер Rutube");
      if (o.start) setTimeout(() => send("player:setCurrentTime", { time: o.start }), 1200);
      if (o.autoplay) setTimeout(() => send("player:play"), 1500);
      return {
        time: () => t, seek: s => { t = s; send("player:setCurrentTime", { time: s }); },
        play: () => send("player:play"), pause: () => send("player:pause"),
        destroy: () => window.removeEventListener("message", onMsg)
      };
    },

    async vimeo(el, v, o) {
      const f = frame(`https://player.vimeo.com/video/${v.id}?${v.h ? "h=" + v.h + "&" : ""}dnt=1${o.autoplay ? "&autoplay=1" : ""}`);
      el.appendChild(f);
      await within(load("https://player.vimeo.com/api/player.js"), 15000, "Не загрузился плеер Vimeo");
      const p = new Vimeo.Player(f);
      await within(p.ready(), 15000, "Плеер Vimeo не ответил");
      let t = null;
      p.on("timeupdate", d => { t = d.seconds; });
      if (o.start) p.setCurrentTime(o.start).catch(() => {});
      return {
        time: () => t, seek: s => { t = s; p.setCurrentTime(s).catch(() => {}); },
        play: () => p.play().catch(() => {}), pause: () => p.pause().catch(() => {}),
        destroy: () => { try { p.off("timeupdate"); } catch (_) {} }
      };
    },

    async file(el, v, o) {
      const vd = document.createElement("video");
      vd.controls = true; vd.playsInline = true; vd.preload = "metadata"; vd.src = v.id;
      el.appendChild(vd);
      await within(new Promise((ok, fail) => {
        vd.addEventListener("loadedmetadata", ok, { once: true });
        vd.addEventListener("error", () => fail(new Error("Видеофайл не открылся: проверьте ссылку и что файл доступен без входа")), { once: true });
      }), 20000, "Видеофайл не загрузился");
      if (o.start) vd.currentTime = o.start;
      if (o.autoplay) vd.play().catch(() => {});
      return {
        time: () => vd.currentTime, seek: s => { vd.currentTime = s; },
        play: () => vd.play(), pause: () => vd.pause(), destroy: () => { vd.pause(); vd.removeAttribute("src"); vd.load(); }
      };
    }
  };

  // box — пустой контейнер; opts: { start, end, autoplay }. На «end» воспроизведение само ставится на паузу.
  async function mount(box, v, opts) {
    const o = opts || {};
    const drv = drivers[v && v.kind]; if (!drv) throw new Error("Эта площадка не поддерживается");
    box.innerHTML = "";
    let ctrl;
    try { ctrl = await drv(box, v, o); } catch (e) { box.innerHTML = ""; throw e; }
    let watch = null;
    if (typeof o.end === "number") {
      watch = setInterval(() => { const t = ctrl.time(); if (t !== null && t >= o.end) { clearInterval(watch); watch = null; try { ctrl.pause(); } catch (_) {} } }, 400);
    }
    const kill = ctrl.destroy;
    ctrl.destroy = () => { if (watch) clearInterval(watch); try { kill(); } catch (_) {} box.innerHTML = ""; };
    return ctrl;
  }

  // ---------- Метки -> голы ----------
  // goals: голы без времени в видео, уже в порядке игры; marks: секунды видео, где создатель нажал «Метка».
  // Привязка по порядку: 1-й гол игры = 1-я метка по времени видео. Работает, только если их поровну.
  function pairMarks(goals, marks) {
    const m = [...marks].filter(x => typeof x === "number" && isFinite(x)).sort((a, b) => a - b);
    if (!goals.length) return { ok: false, why: "nogoals", goals: 0, marks: m.length };
    if (!m.length) return { ok: false, why: "nomarks", goals: goals.length, marks: 0 };
    if (goals.length !== m.length) return { ok: false, why: "count", goals: goals.length, marks: m.length };
    return { ok: true, pairs: goals.map((g, i) => [g, m[i]]) };
  }

  return { parse, mount, pairMarks, LABEL, SUPPORTED };
})();
