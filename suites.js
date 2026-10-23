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
      planOff: [60, 255],
      model: true, // 도면 3D (room3d.js)
      links: {
        A: [["B", .72, .68]],
        B: [["A", .2, .72], ["D", .07, .6], ["I", .57, .54], ["G", .84, .5], ["C", .95, .62]],
        C: [["B", .12, .7], ["G", .24, .56], ["H", .88, .68]],
        D: [["I", .1, .56], ["B", .78, .6], ["E", .93, .66]],
        E: [["D", .12, .68], ["F", .88, .68]],
        F: [["E", .08, .68]],
        G: [["B", .9, .68], ["C", .62, .7]],
        H: [["B", .08, .7], ["C", .32, .66]],
        I: [["B", .88, .6], ["D", .14, .6]],
      },
      spots: {
        A: [503, 1105, 503, 940], B: [430, 905, 575, 520], C: [640, 700, 905, 760], D: [335, 695, 130, 540], E: [230, 742, 220, 905],
        F: [255, 985, 120, 1080], G: [720, 590, 880, 430], H: [650, 985, 905, 1060], I: [610, 318, 180, 318],
      },
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
    {
      name: "FEATHER & HAEMI",
      title: "SANCTUARY 707, THE AZURE HAVEN",
      sub: "ARCH HQ · SECTOR GAMMA",
      meta: ["14M × 11M", "154㎡", "2 BED · 2 BATH", "SINGLE FLOOR"],
      dir: "img/rooms/feather-haemi/",
      plan: { w: 600, h: 815 },
      planOff: [120, 215],
      // box 는 잘라낸 도면(plan.webp) 기준 픽셀
      spaces: [
        { c: "A", ko: "현관 · 복도", en: "FOYER & CORRIDOR", box: [265, 205, 335, 475] },
        { c: "B", ko: "거실", en: "LIVING ROOM", box: [215, 475, 420, 680] },
        { c: "B2", ko: "다이닝", en: "DINING", box: [420, 475, 520, 640] },
        { c: "C", ko: "주방", en: "KITCHEN", box: [370, 305, 585, 475] },
        { c: "D", ko: "마스터 침실", en: "MASTER BEDROOM", box: [28, 23, 230, 275] },
        { c: "E", ko: "마스터 욕실", en: "MASTER BATHROOM", box: [325, 23, 478, 190] },
        { c: "F", ko: "게스트룸 · 서재", en: "GUEST ROOM / STUDY", box: [28, 465, 210, 680] },
        { c: "G", ko: "게스트 욕실", en: "GUEST BATHROOM", box: [338, 200, 478, 285] },
        { c: "H", ko: "발코니", en: "BALCONY", box: [15, 690, 495, 805] },
      ],
      links: {
        A: [["B", .72, .68], ["D", .25, .6]],
        B: [["H", .45, .52], ["B2", .9, .6], ["A", .12, .68]],
        B2: [["C", .75, .58], ["B", .12, .64], ["H", .06, .5]],
        C: [["B2", .12, .66], ["B", .32, .6]],
        D: [["E", .88, .62], ["A", .62, .66]],
        E: [["D", .08, .68], ["G", .5, .7]],
        F: [["A", .88, .66], ["H", .6, .5]],
        G: [["A", .1, .68], ["E", .7, .6]],
        H: [["B", .12, .6], ["F", .04, .48]],
      },
      spots: {
        A: [425, 680, 425, 430], B: [500, 700, 420, 900], B2: [430, 800, 650, 640], C: [560, 760, 640, 560], D: [330, 470, 180, 300],
        E: [470, 395, 520, 260], F: [300, 700, 150, 800], G: [480, 490, 540, 430], H: [300, 960, 550, 980],
      },
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
      return `<button type="button" class="st-hot" data-sp="${k}" style="left:${pct(l, s.plan.w)};top:${pct(t, s.plan.h)};width:${pct(r - l, s.plan.w)};height:${pct(b - t, s.plan.h)}" aria-label="${esc(x.ko)}"><span>${x.c[0]}</span></button>`;
    }).join("");
    return `<div class="st-head">
        <p class="st-kicker">SUITE ${no(i)} · ${esc(s.sub)}</p>
        <h2>${esc(s.name)}</h2>
        <p class="st-title">${esc(s.title)}</p>
        <ul class="st-meta">${s.meta.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
      </div>
      <div class="st-modes">${[["road", "ROAD VIEW"], ...(s.model ? [["walk", "3D FLOOR"]] : []), ["photo", "PHOTOS"]].map(([m, t]) => `<button type="button" data-mode="${m}" class="${mode === m ? "on" : ""}">${t}</button>`).join("")}</div>
      <div class="st-walk" ${live() ? "" : "hidden"}><p class="st-loading">LOADING 3D…</p></div>
      <div class="st-grid" ${mode === "photo" ? "" : "hidden"}>
        <div class="st-plan"><img src="${s.dir}plan.webp" alt="${esc(s.name)} 도면" draggable="false">${hots}</div>
        <figure class="st-view">
          <div class="st-photo"><img alt=""><button type="button" class="st-arrow prev" data-step="-1" aria-label="이전">‹</button><button type="button" class="st-arrow next" data-step="1" aria-label="다음">›</button></div>
          <figcaption><b></b><span></span><small></small></figcaption>
        </figure>
      </div>
      <div class="st-list">${s.spaces.map((x, k) => `<button type="button" data-sp="${k}"><b>${x.c[0]}</b>${esc(x.ko)}</button>`).join("")}</div>`;
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
    el.querySelector(".st-view b").textContent = x.c[0];
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
    if (mode === "walk" && !SUITES[i]?.model) mode = "road";
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
