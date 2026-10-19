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

  // 표지 엠블럼: 처음엔 링이 그려지며 등장 → 레이더 스윕, 속성 에너지가 중심에서 퍼져 나가는 모션
  function emblem(elements) {
    const n = elements.length || 6;
    const f = (v) => v.toFixed(1);
    const pts = elements.map((e, i) => {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2;
      return { x: 150 + Math.cos(a) * 112, y: 150 + Math.sin(a) * 112, c: e.color };
    });
    const poly = pts.map((p) => `${f(p.x)},${f(p.y)}`).join(" ");
    const ticks = Array.from({ length: 72 }, (_, k) => {
      const a = (k * 5 * Math.PI) / 180, r1 = k % 6 ? 145 : 141;
      return `<line x1="${f(150 + Math.cos(a) * r1)}" y1="${f(150 + Math.sin(a) * r1)}" x2="${f(150 + Math.cos(a) * 149)}" y2="${f(150 + Math.sin(a) * 149)}"/>`;
    }).join("");
    return `<div class="w-emblem-wrap"><svg class="w-emblem" viewBox="0 0 300 300" aria-hidden="true">
      <defs>
        <radialGradient id="e-core-glow"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <linearGradient id="e-sweep-g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".15"/></linearGradient>
      </defs>
      <g class="e-ticks">${ticks}</g>
      <circle cx="150" cy="150" r="138" class="e-ring e-draw" pathLength="1"/>
      <circle cx="150" cy="150" r="126" class="e-ring thin e-rev"/>
      <circle cx="150" cy="150" r="62" class="e-ring thin e-spin-slow"/>
      <path d="M150 150 L288 150 A138 138 0 0 0 269.5 81 Z" class="e-sweep" fill="url(#e-sweep-g)"/>
      <circle cx="150" cy="150" r="138" class="e-wave"/>
      <circle cx="150" cy="150" r="138" class="e-wave w2"/>
      <g class="e-spin">
        <polygon points="${poly}" class="e-hex" pathLength="1"/>
        ${pts.map((p, i) => `<line x1="150" y1="150" x2="${f(p.x)}" y2="${f(p.y)}" class="e-spoke" style="--d:${i}"/>`).join("")}
        ${pts.map((p, i) => `<line x1="150" y1="150" x2="${f(p.x)}" y2="${f(p.y)}" class="e-pulse" pathLength="1" stroke="${p.c}" style="--d:${i};color:${p.c}"/>`).join("")}
        ${pts.map((p, i) => `<g class="e-node" style="--d:${i};color:${p.c}">
          <circle cx="${f(p.x)}" cy="${f(p.y)}" r="9" class="e-ping" stroke="${p.c}" style="transform-origin:${f(p.x)}px ${f(p.y)}px"/>
          <circle cx="${f(p.x)}" cy="${f(p.y)}" r="9" fill="${p.c}" class="e-dot" style="transform-origin:${f(p.x)}px ${f(p.y)}px"/>
        </g>`).join("")}
      </g>
      <g class="e-orbit"><circle cx="150" cy="12" r="2.6" class="e-spark"/></g>
      <circle cx="150" cy="150" r="46" fill="url(#e-core-glow)" class="e-core-glow"/>
      <g class="e-core-g">
        <text x="150" y="162" text-anchor="middle" class="e-core e-gl1">A</text>
        <text x="150" y="162" text-anchor="middle" class="e-core e-gl2">A</text>
        <text x="150" y="162" text-anchor="middle" class="e-core">A</text>
      </g>
    </svg></div>`;
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
    const teams = (w.teams || []).map((t, i) => `<article class="w-team" data-team="${i}">
        <header><h3>${esc(t.name)}</h3><span>${esc(t.cls)}</span><em class="w-rel-open">관계도 ›</em></header>
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
  // 엠블럼: 마우스를 따라 살짝 기울어짐
  document.addEventListener("pointermove", (e) => {
    const em = document.querySelector(".w-emblem");
    if (!em || e.pointerType !== "mouse") return;
    const r = em.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
    const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
    em.style.setProperty("--ry", `${(dx * 28).toFixed(2)}deg`);
    em.style.setProperty("--rx", `${(-dy * 28).toFixed(2)}deg`);
  });

  App.afterWorld = function () {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) return els.forEach((e) => e.classList.add("in"));
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }, { rootMargin: "0px 0px -10% 0px" });
    els.forEach((e) => io.observe(e));
  };

  // ---------- 인물 관계도 (팀을 누르면 팝업) ----------
  const LOVE = /사랑|연인|애인|짝사랑|썸|약혼|부부|♥|❤|좋아/;
  const HATE = /라이벌|혐관|대립|적대|원수|증오|경쟁|싫어|앙숙/;
  const relColor = (label) => (LOVE.test(label) ? "#ff7aa8" : HATE.test(label) ? "#ff5a4f" : "#bdbdbd");

  let chart = null; // { i, pos: {이름: [x%, y%]}, dirty }

  function defaultPos(members) {
    const n = members.length, pos = {};
    members.forEach((m, k) => {
      if (n === 1) return (pos[m.name] = [50, 50]);
      const a = (Math.PI * 2 * k) / n - Math.PI / 2;
      pos[m.name] = [50 + Math.cos(a) * 36, 50 + Math.sin(a) * 34];
    });
    return pos;
  }

  function openChart(i) {
    const t = App.data.world.teams[i];
    const members = t.members || [];
    const base = defaultPos(members);
    chart = { i, pos: Object.fromEntries(members.map((m) => [m.name, (t.pos || {})[m.name] || base[m.name]])), dirty: false };
    const canEdit = App.admin && App.rank >= 3;
    App.openModal(`<div class="rel-pop">
      <header class="rel-head">
        <p>${esc(t.cls || "")}</p>
        <h2>${esc(t.name)}</h2>
        <span>인물 관계도</span>
      </header>
      <div class="rel-canvas" id="rel-canvas">
        <svg class="rel-lines" id="rel-svg"></svg>
        ${members.map((m) => `<div class="rel-node" data-node="${esc(m.name)}" style="--el:${attrColor(m.attr)}">
          <div class="rel-ph ${m.photo ? "" : "empty"}">${m.photo ? `<img src="${esc(App.mediaUrl(m.photo))}" alt="" draggable="false" onerror="this.parentNode.classList.add('empty');this.remove()">` : ""}</div>
          <b>${esc(m.name)}</b>${m.desc ? `<small>${esc(m.desc)}</small>` : m.attr ? `<small>${esc(m.attr)}</small>` : ""}
        </div>`).join("")}
        <div id="rel-labels"></div>
      </div>
      ${(t.relations || []).length ? "" : `<p class="rel-empty">아직 관계가 없어요.${canEdit ? " 팀 ✎ 편집에서 관계를 적어주세요." : ""}</p>`}
      ${canEdit ? `<div class="rel-tools"><span>사진을 끌어서 배치를 바꿀 수 있어요</span>
        <button type="button" class="pill-btn" data-rel="reset">자동 배치</button>
        <button type="button" class="pill-btn dark" data-rel="save" disabled>배치 저장</button></div>` : ""}
    </div>`);
    document.querySelector(".modal-box").classList.add("rel-box");
    drawChart();
    if (canEdit) enableDrag();
  }

  function drawChart() {
    const cv = document.getElementById("rel-canvas");
    if (!cv || !chart) return;
    const t = App.data.world.teams[chart.i];
    const W = cv.clientWidth, H = cv.clientHeight;
    const P = (name) => { const p = chart.pos[name]; return p && [p[0] / 100 * W, p[1] / 100 * H]; };
    cv.querySelectorAll(".rel-node").forEach((n) => {
      const p = chart.pos[n.dataset.node];
      n.style.left = `${p[0]}%`;
      n.style.top = `${p[1]}%`;
    });
    const ph = cv.querySelector(".rel-ph");
    const pr = ph ? ph.offsetWidth / 2 : 30;
    const R = pr + 6; // 사진 테두리에서 선이 끝나도록
    // 아래쪽으로 나가는 선은 이름표 밑에서 끝나게 (화살표가 이름에 가리지 않게)
    const depth = {};
    cv.querySelectorAll(".rel-node").forEach((n) => (depth[n.dataset.node] = n.offsetHeight - pr + 6));
    const gap = (name, down) => Math.max(R, down * (depth[name] || R));
    const rels = (t.relations || []).filter((r) => P(r.from) && P(r.to) && r.from !== r.to);
    const key = (a, b) => [a, b].sort().join("\u0000");
    const count = {};
    rels.forEach((r) => (count[key(r.from, r.to)] = (count[key(r.from, r.to)] || 0) + 1));
    const seen = {};
    let defs = "", lines = "", labels = "";
    rels.forEach((r, k) => {
      const [x1, y1] = P(r.from), [x2, y2] = P(r.to);
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      // 같은 두 사람 사이에 관계가 둘이면 서로 반대쪽으로 휘게
      const kk = key(r.from, r.to);
      seen[kk] = (seen[kk] || 0) + 1;
      // 방향이 반대면 수직 방향도 뒤집히므로 이름 순서로 맞춰서 번갈아 양쪽으로
      const bend = count[kk] > 1 ? (seen[kk] % 2 ? 1 : -1) * (r.from < r.to ? 1 : -1) * Math.min(46, len * 0.18) : 0;
      const g1 = gap(r.from, uy), g2 = gap(r.to, -uy);
      const sx = x1 + ux * g1, sy = y1 + uy * g1, ex = x2 - ux * g2, ey = y2 - uy * g2;
      const cx = (sx + ex) / 2 - uy * bend * 2, cy = (sy + ey) / 2 + ux * bend * 2;
      const col = relColor(r.label);
      const id = `rm${k}`;
      defs += `<marker id="${id}e" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${col}"/></marker>`;
      const dash = r.dir === "none" ? ` stroke-dasharray="5 5"` : "";
      const mEnd = r.dir === "none" ? "" : ` marker-end="url(#${id}e)"`;
      const mStart = r.dir === "both" ? ` marker-start="url(#${id}e)"` : "";
      lines += `<path d="M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}" stroke="${col}" stroke-width="1.8" fill="none"${dash}${mEnd}${mStart}/>`;
      if (r.label) {
        const lx = 0.25 * sx + 0.5 * cx + 0.25 * ex, ly = 0.25 * sy + 0.5 * cy + 0.25 * ey;
        labels += `<span class="rel-label" style="left:${lx}px;top:${ly}px;--c:${col}">${LOVE.test(r.label) ? "♥ " : ""}${esc(r.label)}</span>`;
      }
    });
    const svg = document.getElementById("rel-svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = `<defs>${defs}</defs>${lines}`;
    document.getElementById("rel-labels").innerHTML = labels;
  }

  function enableDrag() {
    const cv = document.getElementById("rel-canvas");
    let drag = null;
    cv.addEventListener("pointerdown", (e) => {
      const n = e.target.closest(".rel-node");
      if (!n) return;
      e.preventDefault();
      drag = n.dataset.node;
      n.setPointerCapture(e.pointerId);
      n.classList.add("dragging");
    });
    cv.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const r = cv.getBoundingClientRect();
      const x = Math.min(94, Math.max(6, ((e.clientX - r.left) / r.width) * 100));
      const y = Math.min(90, Math.max(8, ((e.clientY - r.top) / r.height) * 100));
      chart.pos[drag] = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
      chart.dirty = true;
      document.querySelector('[data-rel="save"]').disabled = false;
      drawChart();
    });
    const end = () => {
      if (!drag) return;
      cv.querySelector(".dragging")?.classList.remove("dragging");
      drag = null;
    };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
  }

  async function saveChartPos() {
    const btn = document.querySelector('[data-rel="save"]');
    btn.disabled = true;
    const next = JSON.parse(JSON.stringify(App.data));
    next.world.teams[chart.i].pos = chart.pos;
    try {
      await App.saveData(next, ["world"]);
      chart.dirty = false;
      // 저장하면 페이지가 다시 그려지므로 팝업도 다시 열기
      openChart(chart.i);
    } catch (err) {
      btn.disabled = false;
      alert(`저장하지 못했어요: ${err.message}`);
    }
  }

  window.addEventListener("resize", () => drawChart());

  document.addEventListener("click", (e) => {
    const j = e.target.closest("[data-wjump]");
    if (j) return document.getElementById(j.dataset.wjump)?.scrollIntoView({ behavior: "smooth", block: "start" });
    const rb = e.target.closest("[data-rel]");
    if (rb) {
      if (rb.dataset.rel === "save") return saveChartPos();
      if (rb.dataset.rel === "reset") {
        const t = App.data.world.teams[chart.i];
        chart.pos = defaultPos(t.members || []);
        chart.dirty = true;
        document.querySelector('[data-rel="save"]').disabled = false;
        return drawChart();
      }
    }
    // 팀 카드를 누르면 관계도 (편집 버튼은 제외)
    const team = e.target.closest("[data-team]");
    if (team && !e.target.closest(".adm-tools, [data-act]")) openChart(Number(team.dataset.team));
  });
})();
