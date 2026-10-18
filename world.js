// ARCH World 페이지. ARCH PRIMA 이상이면 edit 모드에서 편집 도구가 보임
(function () {
  const App = window.App;
  const esc = App.esc;

  const ELEMENT_COLORS = { 불: "#ff5a36", 물: "#3aa8ff", 풀: "#5fd36b", 번개: "#f5d03b", 바람: "#9fe8d8", 얼음: "#b9dcff" };
  function attrColor(attr) {
    for (const [k, c] of Object.entries(ELEMENT_COLORS)) if (String(attr).includes(k)) return c;
    return "#9a9a9a"; // 무속성
  }
  const nl = (s) => esc(s).replace(/\n/g, "<br>");
  const pad = (n) => String(n).padStart(2, "0");

  // 편집 도구 (쭌식 + 편집 모드에서만 보임)
  const tools = (col, i, move = true) => App.tools(`world.${col}`, i, move);
  // 목록이면 '추가', 단일 항목이면 '수정' 버튼 (어느 쪽인지는 admin.js 의 SCHEMAS 가 정함)
  const addBtn = (col, label) => `<div class="adm-bar w-adm">${App.addBtn(`world.${col}`, label)}</div>`;

  function chapter(no, en, ko, body) {
    return `<section class="w-chapter reveal" id="w-${no}">
      <header class="w-ch-head">
        <span class="w-ch-no">${no}</span>
        <div>
          <p class="w-ch-en">${esc(en)}</p>
          <h2 class="w-ch-ko">${esc(ko)}</h2>
        </div>
      </header>
      ${body}
    </section>`;
  }

  function emblem(elements) {
    const n = elements.length || 6;
    const pts = elements.map((e, i) => {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2;
      return { x: 150 + Math.cos(a) * 112, y: 150 + Math.sin(a) * 112, c: e.color, icon: e.icon };
    });
    const poly = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    return `<svg class="w-emblem" viewBox="0 0 300 300" aria-hidden="true">
      <circle cx="150" cy="150" r="140" class="e-ring"/>
      <circle cx="150" cy="150" r="112" class="e-ring thin"/>
      <circle cx="150" cy="150" r="62" class="e-ring thin"/>
      <g class="e-spin">
        <polygon points="${poly}" class="e-hex"/>
        ${pts.map((p) => `<line x1="150" y1="150" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" class="e-spoke"/>`).join("")}
        ${pts.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="9" fill="${p.c}" class="e-dot"/>`).join("")}
      </g>
      <text x="150" y="158" text-anchor="middle" class="e-core">A</text>
    </svg>`;
  }

  App.renderWorld = function () {
    const w = App.data.world;
    const h = w.hero || {};

    const toc = [
      ["01", "각성자"], ["02", "아크"], ["03", "6속성"], ["04", "요원"],
      ["05", "장소"], ["06", "위협"], ["07", "용어"],
    ];

    const hero = `<section class="w-hero">
      <div class="w-hero-bg"></div>
      ${emblem(w.elements || [])}
      <p class="w-kicker">[${esc(h.title)}] ${esc(h.kicker)}</p>
      <h1 class="w-title">${esc(h.title)}</h1>
      <p class="w-ver">${esc(h.ver)}</p>
      <blockquote class="w-quote">${nl(h.quote)}</blockquote>
      <p class="w-intro">${nl(h.intro)}</p>
      ${addBtn("hero", "표지 수정")}
      <nav class="w-toc">${toc.map(([n, t]) => `<button type="button" data-wjump="w-${n}"><b>${n}</b>${t}</button>`).join("")}</nav>
    </section>`;

    // 01 각성자
    const awakened = (w.awakened || []).map((a, i) => `<article class="w-panel w-role">
        <p class="w-role-en">${esc(a.en)}</p>
        <h3>${esc(a.title)}</h3>
        <p>${nl(a.body)}</p>
        ${tools("awakened", i)}
      </article>`).join("");
    const guiding = (w.guiding || []).map((g, i) => `<div class="w-rule">
        <span class="w-rule-no">${pad(i + 1)}</span>
        <div><h4>${esc(g.title)}</h4><p>${nl(g.body)}</p></div>
        ${tools("guiding", i)}
      </div>`).join("");
    const ch1 = chapter("01", "THE AWAKENED", "각성자: 센티넬과 가이드", `
      <div class="w-grid-2">${awakened}</div>${addBtn("awakened", "항목 추가")}
      <h3 class="w-sub">'가이딩(Guiding)' 상세 규약</h3>
      <div class="w-rules">${guiding}</div>${addBtn("guiding", "규약 추가")}`);

    // 02 아크
    const a = w.arch || {};
    const ranks = (w.ranks || []).map((r, i) => `<div class="w-rank">
        <span class="w-rank-grade ${String(r.grade || "").length > 4 ? "long" : String(r.grade || "").length > 2 ? "mid" : ""}">${esc(r.grade)}</span>
        <div class="w-rank-body">
          <h4>${esc(r.name)} <small>${esc(r.en)}</small></h4>
          <p>${nl(r.desc)}</p>
          ${r.rep ? `<p class="w-rank-rep">${nl(r.rep)}</p>` : ""}
        </div>
        ${tools("ranks", i)}
      </div>`).join("");
    const rules = (w.partnerRules || []).map((r, i) => `<article class="w-panel">
        <h4>${esc(r.title)}</h4><p>${nl(r.body)}</p>${tools("partnerRules", i)}
      </article>`).join("");
    const ch2 = chapter("02", "THE SHIELD OF HUMANITY", "인류의 방패: 아크 (ARCH)", `
      <p class="w-lead">${nl(a.intro)}</p>
      <figure class="w-motto">
        <blockquote>“${esc(a.identityQuote)}”</blockquote>
        <figcaption>${nl(a.identity)}</figcaption>
      </figure>
      ${addBtn("arch", "소개 수정")}
      <h3 class="w-sub">직급 체계</h3>
      <div class="w-ranks">${ranks}</div>${addBtn("ranks", "직급 추가")}
      <h3 class="w-sub">파트너 배정 규정</h3>
      <div class="w-grid-2">${rules}</div>${addBtn("partnerRules", "규정 추가")}`);

    // 03 6속성
    const ei = w.elementsIntro || {};
    const elements = (w.elements || []).map((e, i) => `<article class="w-el" style="--el:${esc(e.color)}">
        <div class="w-el-head">
          <span class="w-el-icon">${esc(e.icon)}</span>
          <div><h3>${esc(e.ko)}</h3><p>${esc(e.en)}</p></div>
        </div>
        <dl>
          <dt>힘의 특징</dt><dd>${nl(e.power)}</dd>
          <dt>폭주 징후</dt><dd>${nl(e.rampage)}</dd>
          <dt>속성 가이드</dt><dd>${nl(e.guide)}</dd>
        </dl>
        <details class="w-el-rep">
          <summary>기관 내 평판</summary>
          <p><b>센티넬</b> ${nl(e.sentinelRep)}</p>
          <p><b>가이드</b> ${nl(e.guideRep)}</p>
        </details>
        ${tools("elements", i)}
      </article>`).join("");
    const ch3 = chapter("03", "THE SIX ELEMENTS", "6가지 속성의 힘", `
      <div class="w-grid-2 w-el-intro">
        <article class="w-panel"><p class="w-role-en">ELEMENTAL SENTINEL</p><h3>속성 센티넬: 절대적인 공격수</h3><p>${nl(ei.sentinel)}</p></article>
        <article class="w-panel"><p class="w-role-en">ELEMENTAL GUIDE</p><h3>속성 가이드: 유일한 서포터</h3><p>${nl(ei.guide)}</p></article>
      </div>
      ${addBtn("elementsIntro", "설명 수정")}
      <div class="w-els">${elements}</div>${addBtn("elements", "속성 추가")}`);

    // 04 로스터
    const agent = (m) => `<figure class="w-agent" style="--el:${attrColor(m.attr)}">
        <div class="w-agent-photo ${m.photo ? "" : "empty"}">${m.photo
          ? `<img src="${esc(App.mediaUrl(m.photo))}" alt="${esc(m.name)}" loading="lazy" onerror="this.parentNode.classList.add('empty');this.remove()">`
          : ""}</div>
        <figcaption><b>${esc(m.name)}</b><small>${esc(m.attr)}</small></figcaption>
      </figure>`;
    const teams = (w.teams || []).map((t, i) => `<article class="w-team">
        <header><h3>${esc(t.name)}</h3><span>${esc(t.cls)}</span></header>
        ${(t.members || []).length
          ? `<div class="w-agents">${t.members.map(agent).join("")}</div>`
          : `<p class="w-agents-empty">COMING SOON</p>`}
        ${tools("teams", i)}
      </article>`).join("");
    const ch4 = chapter("04", "AGENTS", "요원", `<div class="w-teams">${teams}</div>${addBtn("teams", "팀 추가")}`);

    // 05 장소
    const places = (w.places || []).map((p, i) => `<article class="w-place">
        <span class="w-place-no">${pad(i + 1)}</span>
        <p class="w-place-en">${esc(p.en)}</p>
        <h3>${esc(p.name)}</h3>
        <p>${nl(p.body)}</p>
        ${tools("places", i)}
      </article>`).join("");
    const ch5 = chapter("05", "LOCATIONS", "장소", `<div class="w-places">${places}</div>${addBtn("places", "장소 추가")}`);

    // 06 위협
    const threats = (w.threats || []).map((t, i) => `<article class="w-threat">
        <p class="w-place-en">${esc(t.en)}</p><h3>${esc(t.name)}</h3><p>${nl(t.body)}</p>${tools("threats", i)}
      </article>`).join("");
    const ch6 = chapter("06", "THREATS", "적 · 괴수 · 빌런", `
      <div class="w-threats">${threats}</div>${addBtn("threats", "위협 추가")}
      <div class="w-codered"><span class="w-siren"></span><div><h3>CODE RED · 긴급 출동</h3><p>${nl(w.codeRed?.body)}</p></div></div>
      ${addBtn("codeRed", "코드 레드 수정")}`);

    // 07 용어
    const terms = (w.terms || []).map((t, i) => `<details class="w-term">
        <summary><span>${esc(t.term)}</span><small>${esc(t.en)}</small></summary>
        <p>${nl(t.body)}</p>
        ${tools("terms", i)}
      </details>`).join("");
    const ch7 = chapter("07", "GLOSSARY", "기타 용어", `<div class="w-terms">${terms}</div>${addBtn("terms", "용어 추가")}`);

    return `<div class="world-page">${hero}<div class="w-body">${ch1}${ch2}${ch3}${ch4}${ch5}${ch6}${ch7}</div>
      <p class="w-end">— END OF DOCUMENT —</p></div>`;
  };

  // 페이지가 그려진 뒤: 스크롤 등장 효과
  App.afterWorld = function () {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) return els.forEach((e) => e.classList.add("in"));
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }, { rootMargin: "0px 0px -10% 0px" });
    els.forEach((e) => io.observe(e));
  };

  document.addEventListener("click", (e) => {
    const j = e.target.closest("[data-wjump]");
    if (j) document.getElementById(j.dataset.wjump)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
