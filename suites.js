// S급 전용관 룸투어: 숙소 8개. 도면의 방을 누르면 그 방 사진이 뜸
(function () {
  const App = window.App;
  const esc = App.esc;

  // box 는 도면 그림(plan) 위의 픽셀 영역 [왼, 위, 오른, 아래]
  const SUITES = [
    {
      name: "SYNDROME & LIA",
      title: "ARCH VANGUARD PENTHOUSE: THE SYNDROME SUITE",
      sub: "ARCH DISTRICT · SECTOR S",
      meta: ["18M × 15M", "270㎡", "3 ROOMS · 3 BATHS", "PENTHOUSE LEVEL"],
      dir: "img/rooms/syndrome-lia/",
      plan: { w: 930, h: 910 },
      spaces: [
        { c: "A", ko: "현관 · 복도", en: "ENTRANCE & HALLWAY", box: [348, 695, 532, 880] },
        { c: "B", ko: "거실", en: "LIVING ROOM", box: [312, 120, 618, 690] },
        { c: "C", ko: "주방 · 다이닝", en: "KITCHEN & DINING", box: [622, 360, 905, 690] },
        { c: "D", ko: "마스터 침실", en: "MASTER BEDROOM", box: [25, 125, 302, 460] },
        { c: "E", ko: "드레스룸", en: "WALK-IN CLOSET / DRESSING ROOM", box: [25, 465, 302, 690] },
        { c: "F", ko: "마스터 욕실", en: "MASTER BATHROOM", box: [25, 695, 345, 880] },
        { c: "G", ko: "미디어룸 · 트로피룸", en: "MEDIA ROOM / TROPHY ROOM", box: [620, 125, 905, 357] },
        { c: "H", ko: "게스트룸 · 지수의 서재", en: "GUEST ROOM / JISU'S STUDY", box: [538, 692, 905, 880] },
        { c: "I", ko: "발코니", en: "BALCONY", box: [30, 15, 900, 113] },
      ],
    },
  ];
  while (SUITES.length < 8) SUITES.push(null);

  let el = null, room = 0, sp = 0, mode = "road", walk = null;
  const live = () => mode === "road" || mode === "walk"; // 로드뷰 · 3D 도면은 같은 화면 칸을 씀
  const no = (i) => String(i + 1).padStart(2, "0");

  function roomHtml(s, i) {
    if (!s) return `<div class="st-vacant"><span>${no(i)}</span><p>VACANT</p><small>아직 배정된 요원이 없어요</small></div>`;
    const pct = (v, t) => `${((v / t) * 100).toFixed(2)}%`;
    const hots = s.spaces.map((x, k) => {
      const [l, t, r, b] = x.box;
      return `<button type="button" class="st-hot" data-sp="${k}" style="left:${pct(l, s.plan.w)};top:${pct(t, s.plan.h)};width:${pct(r - l, s.plan.w)};height:${pct(b - t, s.plan.h)}" aria-label="${esc(x.ko)}"><span>${x.c}</span></button>`;
    }).join("");
    return `<div class="st-head">
        <p class="st-kicker">SUITE ${no(i)} · ${esc(s.sub)}</p>
        <h2>${esc(s.name)}</h2>
        <p class="st-title">${esc(s.title)}</p>
        <ul class="st-meta">${s.meta.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
      </div>
      <div class="st-modes">${[["road", "ROAD VIEW"], ["walk", "3D FLOOR"], ["photo", "PHOTOS"]].map(([m, t]) => `<button type="button" data-mode="${m}" class="${mode === m ? "on" : ""}">${t}</button>`).join("")}</div>
      <div class="st-walk" ${live() ? "" : "hidden"}><p class="st-loading">LOADING 3D…</p></div>
      <div class="st-grid" ${mode === "photo" ? "" : "hidden"}>
        <div class="st-plan"><img src="${s.dir}plan.webp" alt="${esc(s.name)} 도면" draggable="false">${hots}</div>
        <figure class="st-view">
          <div class="st-photo"><img alt=""><button type="button" class="st-arrow prev" data-step="-1" aria-label="이전">‹</button><button type="button" class="st-arrow next" data-step="1" aria-label="다음">›</button></div>
          <figcaption><b></b><span></span><small></small></figcaption>
        </figure>
      </div>
      <div class="st-list">${s.spaces.map((x, k) => `<button type="button" data-sp="${k}"><b>${x.c}</b>${esc(x.ko)}</button>`).join("")}</div>`;
  }

  function mark(k) {
    el.querySelectorAll("[data-sp]").forEach((b) => b.classList.toggle("on", +b.dataset.sp === k));
  }
  function showSpace(k, fromWalk) {
    const s = SUITES[room];
    if (!s) return;
    sp = (k + s.spaces.length) % s.spaces.length;
    if (live() && walk && !fromWalk) walk.goto(s.spaces[sp].c);
    const x = s.spaces[sp];
    const img = el.querySelector(".st-photo img");
    img.classList.remove("in");
    img.onload = () => img.classList.add("in");
    img.src = `${s.dir}${x.c.toLowerCase()}.webp`;
    img.alt = x.ko;
    el.querySelector(".st-view b").textContent = x.c;
    el.querySelector(".st-view span").textContent = x.ko;
    el.querySelector(".st-view small").textContent = x.en;
    mark(sp);
  }
  // 3D 워크스루 켜기 (처음 열 때만 만들고, 사진 모드로 가면 정리)
  async function startWalk() {
    const s = SUITES[room], box = el?.querySelector(".st-walk");
    const engine = mode === "road" ? App.RoadView : App.Room3D;
    if (!s || !box || walk || !engine || !App.loadThree) return;
    const token = (startWalk.n = (startWalk.n || 0) + 1);
    try {
      const w = await engine(box, s, (code) => {
        const k = s.spaces.findIndex((x) => x.c === code);
        if (k >= 0) showSpace(k, true);
      });
      if (token !== startWalk.n || !el || !box.isConnected) return w.destroy();
      walk = w;
      box.querySelector(".st-loading")?.remove();
    } catch (err) {
      box.querySelector(".st-loading").textContent = "3D 를 불러오지 못했어요. PHOTOS 로 봐주세요.";
    }
  }
  function stopWalk() {
    startWalk.n = (startWalk.n || 0) + 1;
    walk?.destroy();
    walk = null;
  }
  function setMode(m) {
    mode = m;
    el.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("on", b.dataset.mode === m));
    el.querySelector(".st-walk").hidden = !live();
    el.querySelector(".st-grid").hidden = m !== "photo";
    stopWalk();
    if (live()) { el.querySelector(".st-walk").innerHTML = '<p class="st-loading">LOADING…</p>'; startWalk(); }
  }

  function showRoom(i) {
    stopWalk();
    room = i;
    el.querySelector(".st-body").innerHTML = roomHtml(SUITES[i], i);
    el.querySelectorAll("[data-room]").forEach((b) => b.classList.toggle("on", +b.dataset.room === i));
    if (SUITES[i]) { showSpace(0, true); if (live()) startWalk(); }
  }

  function close() {
    stopWalk();
    el?.remove();
    el = null;
    document.body.classList.remove("st-lock");
    document.removeEventListener("keydown", onKey);
    App.agStart?.();
  }
  function onKey(e) {
    if (e.key === "Escape") close();
    else if (live()) return;
    else if (e.key === "ArrowRight") showSpace(sp + 1);
    else if (e.key === "ArrowLeft") showSpace(sp - 1);
  }

  App.openSuites = function (i = 0) {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    close();
    el = document.createElement("div");
    el.className = "st-tour";
    el.setAttribute("role", "dialog");
    el.innerHTML = `<div class="st-top">
        <p class="st-brand">S-CLASS QUARTERS<small>ROOM TOUR</small></p>
        <button type="button" class="st-x" data-close aria-label="닫기">×</button>
      </div>
      <nav class="st-rooms">${SUITES.map((s, k) => `<button type="button" data-room="${k}" class="${s ? "" : "vacant"}"><b>${no(k)}</b>${s ? esc(s.name) : "VACANT"}</button>`).join("")}</nav>
      <section class="st-body"></section>`;
    el.addEventListener("click", (e) => {
      const t = e.target.closest("[data-close],[data-room],[data-sp],[data-step],[data-mode]");
      if (!t) return;
      if (t.dataset.close != null) close();
      else if (t.dataset.room != null) showRoom(+t.dataset.room);
      else if (t.dataset.mode != null) setMode(t.dataset.mode);
      else if (t.dataset.sp != null) {
        showSpace(+t.dataset.sp);
        // 모바일: 도면은 사진 아래에 있으니 사진으로 올려줌
        if (mode === "photo" && window.innerWidth <= 800) el.querySelector(".st-view").scrollIntoView({ behavior: "smooth", block: "start" });
      }
      else showSpace(sp + +t.dataset.step);
    });
    // 사진 좌우로 밀어서 넘기기
    let sx = null;
    el.addEventListener("touchstart", (e) => { if (e.target.closest(".st-photo")) sx = e.touches[0].clientX; }, { passive: true });
    el.addEventListener("touchend", (e) => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx;
      sx = null;
      if (Math.abs(dx) > 40) showSpace(sp + (dx < 0 ? 1 : -1));
    });
    document.body.appendChild(el);
    document.body.classList.add("st-lock");
    document.addEventListener("keydown", onKey);
    showRoom(i);
  };

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-suites]")) App.openSuites();
  });
})();
