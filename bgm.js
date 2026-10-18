// 페이지 아래 BGM 플레이어. 곡 추가는 Vanguard 이상, 삭제는 쭌식(owner)만
(function () {
  const App = window.App;
  const esc = App.esc;
  const bar = document.getElementById("bgm");
  const audio = new Audio();
  audio.preload = "none";

  let tracks = [];
  let cur = -1;
  let playing = false;
  let yt = null; // YouTube 플레이어
  let ytReady = null;
  let shuffle = false;
  let volume = 0.6;
  try {
    shuffle = localStorage.getItem("bgm_shuffle") === "1";
    volume = Number(localStorage.getItem("bgm_volume") ?? 0.6);
  } catch {}
  audio.volume = volume;

  // ---------- 화면 ----------
  // 아이콘은 SVG 로 (⏮ 같은 문자는 아이폰에서 이모지로 바뀜)
  const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICON = {
    prev: svg('<path d="M6 5h2v14H6zM20 5v14L9 12z"/>'),
    next: svg('<path d="M16 5h2v14h-2zM4 5v14l11-7z"/>'),
    play: svg('<path d="M7 4.5v15l13-7.5z"/>'),
    pause: svg('<path d="M6 4.5h4v15H6zM14 4.5h4v15h-4z"/>'),
    shuffle: svg('<path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>'),
    list: svg('<path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>'),
  };
  bar.innerHTML = `
    <div class="bgm-left">
      <button type="button" class="bgm-btn bgm-prev" data-bgm="prev" aria-label="이전 곡">${ICON.prev}</button>
      <button type="button" class="bgm-btn bgm-play" data-bgm="toggle" aria-label="재생">${ICON.play}</button>
      <button type="button" class="bgm-btn" data-bgm="next" aria-label="다음 곡">${ICON.next}</button>
      <button type="button" class="bgm-btn bgm-shuffle" data-bgm="shuffle" aria-label="셔플" title="셔플">${ICON.shuffle}</button>
    </div>
    <div class="bgm-mid">
      <div class="bgm-yt"><div id="bgm-yt"></div></div>
      <span class="bgm-title">BGM</span>
    </div>
    <div class="bgm-right">
      <input type="range" class="bgm-vol" min="0" max="1" step="0.01" aria-label="볼륨">
      <button type="button" class="pill-btn bgm-list-btn" data-bgm="list" aria-label="곡 목록"><span class="bgm-list-ico">${ICON.list}</span><span class="bgm-list-txt">List</span></button>
    </div>`;
  const $ = (s) => bar.querySelector(s);
  $(".bgm-vol").value = volume;

  function paint() {
    const t = tracks[cur];
    $(".bgm-title").textContent = t ? t.title : tracks.length ? "재생할 곡을 골라주세요" : "아직 곡이 없어요 · List 에서 추가";
    $(".bgm-play").innerHTML = playing ? ICON.pause : ICON.play;
    $(".bgm-shuffle").classList.toggle("on", shuffle);
    $(".bgm-yt").classList.toggle("show", t?.kind === "youtube");
    const list = document.getElementById("bgm-list");
    if (list) list.innerHTML = listHtml();
  }

  // ---------- YouTube ----------
  function loadYT() {
    if (ytReady) return ytReady;
    ytReady = new Promise((resolve) => {
      window.onYouTubeIframeAPIReady = () => {
        yt = new YT.Player("bgm-yt", {
          width: 64, height: 36,
          playerVars: { playsinline: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0 },
          events: {
            onReady: () => resolve(),
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.ENDED) next();
              if (e.data === YT.PlayerState.PLAYING) { playing = true; paint(); }
            },
            onError: () => { App.toast("이 영상은 재생할 수 없어요"); next(); },
          },
        });
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    });
    return ytReady;
  }

  function youtubeId(url) {
    const m = String(url).trim().match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
    if (m) return m[1];
    return /^[\w-]{11}$/.test(String(url).trim()) ? String(url).trim() : "";
  }

  // ---------- 재생 ----------
  function stopAll() {
    audio.pause();
    if (yt?.stopVideo) yt.stopVideo();
  }

  async function play(i) {
    if (!tracks.length) return;
    cur = (i + tracks.length) % tracks.length;
    const t = tracks[cur];
    stopAll();
    playing = true;
    paint();
    try {
      if (t.kind === "youtube") {
        await loadYT();
        yt.setVolume(Math.round(volume * 100));
        yt.loadVideoById(t.src);
      } else {
        await App.resolveMedia([t.src]);
        audio.src = App.mediaUrl(t.src);
        await audio.play();
      }
    } catch (err) {
      playing = false;
      paint();
      if (err?.name !== "AbortError") App.toast("재생하지 못했어요");
    }
  }

  function toggle() {
    if (cur < 0) return play(shuffle ? Math.floor(Math.random() * tracks.length) : 0);
    const t = tracks[cur];
    if (playing) {
      t.kind === "youtube" ? yt?.pauseVideo() : audio.pause();
      playing = false;
    } else {
      if (t.kind === "youtube") yt?.playVideo();
      else audio.play().catch(() => {});
      playing = true;
    }
    paint();
  }

  function next() {
    if (!tracks.length) return;
    if (shuffle && tracks.length > 1) {
      let k;
      do k = Math.floor(Math.random() * tracks.length); while (k === cur);
      return play(k);
    }
    play(cur + 1);
  }
  const prev = () => (shuffle ? next() : play(cur - 1));

  audio.addEventListener("ended", next);
  audio.addEventListener("pause", () => { if (tracks[cur]?.kind !== "youtube") { playing = false; paint(); } });
  audio.addEventListener("play", () => { playing = true; paint(); });

  $(".bgm-vol").addEventListener("input", (e) => {
    volume = Number(e.target.value);
    audio.volume = volume;
    if (yt?.setVolume) yt.setVolume(Math.round(volume * 100));
    try { localStorage.setItem("bgm_volume", volume); } catch {}
  });

  // ---------- 목록 팝업 ----------
  function listHtml() {
    if (!tracks.length) return `<p class="bgm-empty">아직 곡이 없어요. 아래에서 추가해 주세요.</p>`;
    return tracks.map((t, i) => `<div class="bgm-row ${i === cur ? "on" : ""}">
      <button type="button" class="bgm-row-play" data-bgm-play="${i}">
        <span class="bgm-row-icon">${i === cur && playing ? ICON.pause : ICON.play}</span>
        <span class="bgm-row-title">${esc(t.title)}</span>
      </button>
      <span class="pill">${t.kind === "youtube" ? "YouTube" : "File"}</span>
      ${App.role === "owner" ? `<button type="button" class="bgm-del" data-bgm-del="${i}" aria-label="삭제">✕</button>` : ""}
    </div>`).join("");
  }

  function openList() {
    App.openModal(`<div class="form bgm-pop">
      <h2>BGM</h2>
      <p class="desc">곡을 누르면 재생돼요. ${shuffle ? "셔플 재생 중" : ""}</p>
      <div id="bgm-list" class="bgm-list">${listHtml()}</div>
      ${App.rank >= 2 ? "" : `<p class="hint">곡 추가는 Vanguard 등급부터 할 수 있어요.</p>`}
      <form id="bgm-add" class="bgm-add" ${App.rank >= 2 ? "" : "hidden"}>
        <div class="bgm-add-tabs">
          <button type="button" class="vtab active" data-kind="file">파일</button>
          <button type="button" class="vtab" data-kind="youtube">유튜브 링크</button>
        </div>
        <div class="field"><input type="text" name="title" placeholder="곡 제목"></div>
        <div class="field" data-for="file"><input type="file" name="file" accept="audio/*"><p class="hint">mp3, m4a 등 · 50MB 이하</p></div>
        <div class="field" data-for="youtube" hidden><input type="text" name="url" placeholder="https://youtu.be/..."></div>
        <div class="form-actions"><button type="submit" class="pill-btn dark">+ 곡 추가</button></div>
      </form>
    </div>`);
    const form = document.getElementById("bgm-add");
    let kind = "file";
    form.querySelectorAll("[data-kind]").forEach((b) => (b.onclick = () => {
      kind = b.dataset.kind;
      form.querySelectorAll("[data-kind]").forEach((x) => x.classList.toggle("active", x === b));
      form.querySelectorAll("[data-for]").forEach((x) => (x.hidden = x.dataset.for !== kind));
    }));
    form.onsubmit = async (e) => {
      e.preventDefault();
      form.classList.add("busy");
      try {
        await addTrack(kind, form);
        form.reset();
        App.toast("곡을 추가했어요");
      } catch (err) {
        alert(`추가하지 못했어요: ${err.message}`);
      }
      form.classList.remove("busy");
    };
  }

  async function addTrack(kind, form) {
    let title = form.title.value.trim();
    let src;
    if (kind === "file") {
      const file = form.file.files[0];
      if (!file) throw new Error("음악 파일을 골라주세요.");
      if (file.size > 50 * 1024 * 1024) throw new Error("50MB 이하 파일만 올릴 수 있어요.");
      const ext = (file.name.split(".").pop() || "mp3").toLowerCase().replace(/[^a-z0-9]/g, "");
      src = `bgm/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      await App.uploadMedia(src, file, file.type || "audio/mpeg");
      title ||= file.name.replace(/\.[^.]+$/, "");
    } else {
      src = youtubeId(form.url.value);
      if (!src) throw new Error("유튜브 링크를 확인해 주세요.");
      if (!title) {
        try {
          const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${src}`)}`);
          if (r.ok) title = (await r.json()).title;
        } catch {}
      }
      title ||= `YouTube ${src}`;
    }
    const { data, error } = await App.sb.from("bgm").insert({ title, kind, src }).select().single();
    if (error) throw new Error(error.message);
    tracks.push(data);
    paint();
  }

  async function removeTrack(i) {
    const t = tracks[i];
    if (!confirm(`'${t.title}' 을(를) 삭제할까요?`)) return;
    const { error } = await App.sb.from("bgm").delete().eq("id", t.id);
    if (error) return alert(`삭제하지 못했어요: ${error.message}`);
    if (t.kind === "file") await App.sb.storage.from("media").remove([t.src]);
    if (i === cur) { stopAll(); playing = false; cur = -1; }
    else if (i < cur) cur--;
    tracks.splice(i, 1);
    paint();
  }

  // ---------- events ----------
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-bgm]");
    if (b) {
      const act = b.dataset.bgm;
      if (act === "toggle") toggle();
      else if (act === "next") next();
      else if (act === "prev") prev();
      else if (act === "list") openList();
      else if (act === "shuffle") {
        shuffle = !shuffle;
        try { localStorage.setItem("bgm_shuffle", shuffle ? "1" : "0"); } catch {}
        App.toast(shuffle ? "셔플 재생 켜짐" : "셔플 재생 꺼짐");
        paint();
      }
      return;
    }
    const pl = e.target.closest("[data-bgm-play]");
    if (pl) {
      const i = Number(pl.dataset.bgmPlay);
      return i === cur ? toggle() : play(i);
    }
    const del = e.target.closest("[data-bgm-del]");
    if (del) removeTrack(Number(del.dataset.bgmDel));
  });

  document.addEventListener("app:ready", async () => {
    bar.hidden = false;
    document.body.classList.add("has-bgm");
    const { data, error } = await App.sb.from("bgm").select("*").order("created_at");
    if (!error) tracks = data || [];
    paint();
  });
})();
