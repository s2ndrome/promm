(function () {
  const $ = (sel) => document.querySelector(sel);
  const content = $("#content");
  const modal = $("#modal");
  const modalBody = $("#modal-body");

  // 다른 스크립트(admin.js)와 공유하는 상태
  const App = (window.App = {
    data: null,
    admin: false,
    render: () => route(),
    openModal,
    closeModal,
    toast,
    esc,
  });

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  const num = (i) => String(i + 1).padStart(2, "0");
  const pairById = (id) => App.data.pairs.find((p) => p.id === id);

  function thumb(src, alt) {
    if (!src) return `<div class="thumb empty"></div>`;
    return `<div class="thumb"><img src="${esc(App.mediaUrl(src))}" alt="${esc(alt)}" loading="lazy"
      onerror="this.parentNode.classList.add('empty');this.remove()"></div>`;
  }

  // 관리자 모드에서만 보이는 편집 버튼
  function tools(col, i, move = true) {
    return `<div class="adm-tools">
      ${move ? `<button type="button" data-act="move" data-col="${col}" data-i="${i}" data-dir="-1" title="앞으로">←</button>
      <button type="button" data-act="move" data-col="${col}" data-i="${i}" data-dir="1" title="뒤로">→</button>` : ""}
      <button type="button" data-act="edit" data-col="${col}" data-i="${i}" title="수정">✎</button>
      <button type="button" data-act="del" data-col="${col}" data-i="${i}" title="삭제">✕</button>
    </div>`;
  }
  const addBtn = (col, label) => `<button type="button" class="pill-btn" data-act="add" data-col="${col}">+ ${label}</button>`;
  App.tools = tools;
  App.addBtn = addBtn;

  // ---------- 즐겨찾기 (이 브라우저에만 저장) ----------
  let favs = new Set();
  try { favs = new Set(JSON.parse(localStorage.getItem("promm_favs") || "[]")); } catch {}
  function toggleFav(id) {
    favs.has(id) ? favs.delete(id) : favs.add(id);
    try { localStorage.setItem("promm_favs", JSON.stringify([...favs])); } catch {}
  }

  // ---------- pages ----------
  // 장르 토글 열림 상태 (다시 그려도 유지)
  const openGenres = new Set();
  document.addEventListener("toggle", (e) => {
    const d = e.target.closest?.("[data-genre-box]");
    if (d) d.open ? openGenres.add(d.dataset.genreBox) : openGenres.delete(d.dataset.genreBox);
  }, true);

  function renderHome() {
    const { pairs, genres = [] } = App.data;
    const card = (p, i) => `<article class="item" data-open="pairs" data-i="${i}">
        <div class="item-head">
          ${p.tag ? `<span class="pill">${esc(p.tag)}</span>` : "<span></span>"}
          <button type="button" class="star ${favs.has(p.id) ? "on" : ""}" data-fav="${esc(p.id)}" aria-label="즐겨찾기">${favs.has(p.id) ? "★" : "☆"}</button>
        </div>
        ${tools("pairs", i)}
        ${thumb(p.image, p.title)}
        <p class="item-name">${esc(p.male?.name)} × ${esc(p.female?.name)}</p>
        <p class="item-sub">${esc(p.title)}</p>
        <div class="item-foot"><button type="button" class="pill-btn" data-info="${i}">Pair Info</button></div>
      </article>`;
    // 장르가 없거나 목록에 없는 장르면 메인에
    const genreOf = (p) => (genres.includes(p.genre) ? p.genre : "");
    const cards = (g) => pairs.map((p, i) => (genreOf(p) === g ? card(p, i) : "")).join("");
    const main = cards("");
    const boxes = genres.map((g) => {
      const n = pairs.filter((p) => genreOf(p) === g).length;
      return `<details class="genre" data-genre-box="${esc(g)}" ${openGenres.has(g) ? "open" : ""}>
        <summary><span class="genre-name">${esc(g)}</span><span class="genre-count">${n}</span></summary>
        <div class="genre-body">
          ${n ? `<section class="grid">${cards(g)}</section>` : `<p class="genre-empty">아직 페어가 없어요.</p>`}
          <div class="adm-bar genre-add"><button type="button" class="pill-btn" data-act="add" data-col="pairs" data-genre="${esc(g)}">+ 이 장르에 페어 추가</button></div>
        </div>
      </details>`;
    }).join("");
    return `<div class="adm-bar">${addBtn("pairs", "페어 추가")}${addBtn("genres", "장르 관리")}<span class="owner-only">${addBtn("site", "사이트 정보")}</span></div>
      ${main ? `<section class="grid">${main}</section>` : ""}
      ${boxes ? `<div class="genres">${boxes}</div>` : ""}`;
  }

  // asset 하위 페이지들 (같은 형태). col 은 데이터 이름
  const ASSET_PAGES = [
    { col: "gallery", route: "/gallery", title: "ASSET" },
    { col: "jaktae", route: "/jaktae", title: "작태" },
  ];

  function renderGallery(col = "gallery") {
    const gallery = App.data[col] || [];
    const page = ASSET_PAGES.find((x) => x.col === col);
    // section 이름별로 묶기 (처음 나온 순서대로)
    const groups = new Map();
    gallery.forEach((g, i) => {
      const key = (g.section || "").trim();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(i);
    });
    const shot = (i) => {
      const g = gallery[i];
      const p = pairById(g.pair);
      return `<figure class="shot" data-open="${col}" data-i="${i}">
        ${tools(col, i)}
        ${thumb(g.image, g.caption)}
        <figcaption class="shot-cap"><span>${esc(g.caption || p?.title || "")}</span>${p?.tag ? `<span class="pill">${esc(p.tag)}</span>` : ""}</figcaption>
      </figure>`;
    };
    const sections = [...groups].map(([name, idx]) => `<section class="g-section">
        ${name || groups.size > 1 ? `<div class="block-title">${esc(name || "ETC")}
          ${name ? `<span class="adm-inline"><button type="button" class="pill-btn" data-act="rename-section" data-col="${col}" data-section="${esc(name)}">이름 변경</button></span>` : ""}</div>` : ""}
        <div class="gallery">${idx.map(shot).join("")}</div>
        <div class="adm-bar g-add"><button type="button" class="pill-btn" data-act="add" data-col="${col}" data-section="${esc(name)}">+ 이 줄에 사진 추가</button></div>
      </section>`).join("");
    const tabs = ASSET_PAGES.map((x) => `<a href="#${x.route}" class="${x.col === col ? "on" : ""}">${esc(x.title)}</a>`).join("");
    return `<div class="page-head"><h1>${esc(page.title)}</h1><p>사진을 누르면 프롬프트가 열려요</p>
        <nav class="sub-tabs">${tabs}</nav></div>
      <div class="adm-bar">${addBtn(col, "사진 추가")}</div>
      ${sections || `<p class="link-empty">아직 사진이 없어요.</p>`}`;
  }

  // OOC: 사진 없이 글만. 에셋처럼 구분별 줄로 묶음
  // OOC 검색어 (다시 그려도 유지)
  let oocQuery = "";

  // 검색어를 형광펜으로 표시 (글은 먼저 이스케이프)
  function mark(text, q) {
    const safe = esc(text);
    const words = String(q || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return safe;
    const re = new RegExp(words.map((w) => esc(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "gi");
    return safe.replace(re, (m) => `<mark>${m}</mark>`);
  }

  function oocCard(i, q = "") {
    const o = App.data.ooc[i];
    return `<article class="ooc-card" data-open="ooc" data-i="${i}">
      ${tools("ooc", i)}
      ${q && o.section ? `<span class="pill ooc-sec">${mark(o.section, q)}</span>` : ""}
      ${o.title ? `<h3 class="ooc-title">${mark(o.title, q)}</h3>` : ""}
      <p class="ooc-text">${mark(o.text, q)}</p>
      <div class="ooc-foot"><button type="button" class="pill-btn dark" data-copy="${esc(o.text)}">Copy</button></div>
    </article>`;
  }

  // 검색어가 있으면 결과만, 없으면 구분별 토글
  function oocListHtml() {
    const list = App.data.ooc || [];
    const q = oocQuery.trim();
    if (q) {
      const words = q.toLowerCase().split(/\s+/);
      const hits = list.map((o, i) => i).filter((i) => {
        const o = list[i];
        const hay = `${o.title || ""} ${o.text || ""} ${o.section || ""}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      });
      return `<p class="ooc-count">'${esc(q)}' 검색 결과 ${hits.length}개</p>
        ${hits.length ? `<div class="ooc-grid">${hits.map((i) => oocCard(i, q)).join("")}</div>` : `<p class="link-empty">찾는 OOC 가 없어요.</p>`}`;
    }
    const groups = new Map();
    list.forEach((o, i) => {
      const key = (o.section || "").trim();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(i);
    });
    // 구분 없는 글은 위에 그대로, 구분마다 토글
    const loose = groups.get("") || [];
    const toggles = [...groups].filter(([name]) => name).map(([name, idx]) => {
      const key = `ooc:${name}`;
      return `<details class="genre" data-genre-box="${esc(key)}" ${openGenres.has(key) ? "open" : ""}>
        <summary><span class="genre-name">${esc(name)}</span><span class="genre-count">${idx.length}</span></summary>
        <div class="genre-body">
          <div class="ooc-grid">${idx.map((i) => oocCard(i)).join("")}</div>
          <div class="adm-bar genre-add">
            <button type="button" class="pill-btn" data-act="add" data-col="ooc" data-section="${esc(name)}">+ 이 구분에 OOC 추가</button>
            <button type="button" class="pill-btn" data-act="rename-section" data-col="ooc" data-section="${esc(name)}">구분 이름 변경</button>
          </div>
        </div>
      </details>`;
    }).join("");
    return `${loose.length ? `<div class="ooc-grid">${loose.map((i) => oocCard(i)).join("")}</div>` : ""}
      ${toggles ? `<div class="genres ooc-genres">${toggles}</div>` : ""}
      ${list.length ? "" : `<p class="link-empty">아직 OOC 가 없어요.</p>`}`;
  }

  function renderOOC() {
    return `<div class="page-head"><h1>OOC</h1><p>누르면 전체 글이 열려요</p></div>
      <div class="ooc-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4a6 6 0 1 0 3.87 10.59l4.27 4.27 1.41-1.41-4.27-4.27A6 6 0 0 0 10 4zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/></svg>
        <input type="search" id="ooc-q" placeholder="키워드로 OOC 검색" value="${esc(oocQuery)}" autocomplete="off" enterkeyhint="search">
        <button type="button" class="ooc-clear" aria-label="검색어 지우기" ${oocQuery ? "" : "hidden"}>✕</button>
      </div>
      <div class="adm-bar">${addBtn("ooc", "OOC 추가")}<button type="button" class="pill-btn" data-act="import" data-col="ooc">파일로 가져오기</button></div>
      <div id="ooc-list">${oocListHtml()}</div>`;
  }

  // 입력할 때마다 목록만 다시 그림 (검색창 포커스 유지)
  document.addEventListener("input", (e) => {
    if (e.target.id !== "ooc-q") return;
    oocQuery = e.target.value;
    document.getElementById("ooc-list").innerHTML = oocListHtml();
    document.querySelector(".ooc-clear").hidden = !oocQuery;
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".ooc-clear")) return;
    oocQuery = "";
    const q = document.getElementById("ooc-q");
    q.value = "";
    q.focus();
    document.getElementById("ooc-list").innerHTML = oocListHtml();
    e.target.closest(".ooc-clear").hidden = true;
  });

  function showOoc(o) {
    detail = null;
    openModal(`<div class="form ooc-pop">
      ${o.section ? `<span class="pill">${esc(o.section)}</span>` : ""}
      <h2>${esc(o.title || "OOC")}</h2>
      <div class="prompt">
        <div class="prompt-head"><b></b>
          <span class="copy-btns"><button type="button" class="pill-btn dark" data-copy="${esc(o.text)}">Copy</button></span>
        </div>
        <div class="prompt-text"><p>${esc(o.text)}</p></div>
      </div>
    </div>`);
  }

  function renderLinks() {
    const links = App.data.links || [];
    const groups = new Map();
    links.forEach((l, i) => {
      const key = (l.section || "").trim();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(i);
    });
    const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
    const row = (i) => {
      const l = links[i];
      const name = l.title || host(l.url) || l.url;
      return `<div class="link-card">
        <a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">
          <span class="link-mono">${esc([...name][0] || "·")}</span>
          <span class="link-title">${esc(name)}</span>
          ${l.desc ? `<span class="link-desc">${esc(l.desc)}</span>` : ""}
          <span class="link-host">${esc(host(l.url))}<span class="link-arrow">↗</span></span>
        </a>
        ${tools("links", i)}
      </div>`;
    };
    const sections = [...groups].map(([name, idx]) => `<section class="g-section">
        ${name || groups.size > 1 ? `<div class="block-title">${esc(name || "ETC")}</div>` : ""}
        <div class="link-grid">${idx.map(row).join("")}</div>
      </section>`).join("");
    return `<div class="page-head"><h1>LINK</h1><p>모아둔 링크</p></div>
      <div class="adm-bar">${addBtn("links", "링크 추가")}</div>
      ${sections || `<p class="link-empty">아직 링크가 없어요.</p>`}`;
  }

  const routes = {
    "/": { title: "Pairs", render: renderHome },
    "/gallery": { title: "Asset", render: () => renderGallery("gallery") },
    "/jaktae": { title: "작태", render: () => renderGallery("jaktae") },
    "/world": { title: "ARCH", render: () => App.renderWorld() },
    "/link": { title: "Link", render: renderLinks },
    "/ooc": { title: "OOC", render: renderOOC },
  };

  function route() {
    if (!App.data) return;
    let path = location.hash.replace(/^#/, "") || "/";
    if (path === "/arch") path = "/world"; // #/arch 주소로 들어와도 ARCH 페이지
    if (path === "/asset") path = "/gallery"; // #/asset 주소로 들어와도 ASSET 페이지
    const r = routes[path] || routes["/"];
    document.body.classList.toggle("world-mode", path === "/world");
    content.innerHTML = r.render();
    if (path === "/world") App.afterWorld();
    const site = App.data.site || {};
    const brand = site.title || "ZZON";
    $(".brand").textContent = brand;
    document.title = `${r.title} · ${brand}`;
    document.querySelectorAll("[data-route]").forEach((a) =>
      a.classList.toggle("active", a.dataset.route === path || (a.dataset.route === "/gallery" && path === "/jaktae")));
    document.querySelector(".nav-drop")?.classList.remove("open");
  }

  // ---------- prompt popup ----------
  // 첫 단락(외형) + 둘째 단락(의상). 의상은 칩을 눌러야 나옴
  function promptBlock(name, base, outfit) {
    if (!name && !base && !outfit) return "";
    const full = [base, outfit].filter(Boolean).join("\n\n");
    return `<div class="prompt">
      <div class="prompt-head">
        <b>${esc(name)}</b>
        <span class="copy-btns">
          <button type="button" class="pill-btn" data-copy="${esc(base)}">Copy</button>
          <button type="button" class="pill-btn dark" data-copy="${esc(full)}">Full Copy</button>
        </span>
      </div>
      <div class="prompt-text">${base ? `<p>${esc(base)}</p>` : ""}${outfit ? `<p class="outfit">${esc(outfit)}</p>` : ""}</div>
    </div>`;
  }

  // 상의/하의/신발을 체크박스 설정에 맞춰 합침
  function outfitText(o, opt) {
    if (!o) return "";
    const parts = [o.top];
    if (!opt.upper) {
      parts.push(o.bottom);
      if (!opt.noShoes) parts.push(o.shoes);
    }
    return parts.map((t) => (t || "").trim()).filter(Boolean).join(" ");
  }

  // 지금 열려 있는 팝업 상태
  let detail = null;

  function showPrompt(col, i) {
    let people, variants, image, title, sub, tag;
    const fromPair = (p) => [
      { name: p.male?.name, base: p.male?.base || "" },
      { name: p.female?.name, base: p.female?.base || "" },
    ];
    if (col === "pairs") {
      const p = App.data.pairs[i];
      people = fromPair(p);
      variants = p.variants || [];
      image = p.image;
      title = p.title;
      tag = p.tag;
    } else {
      if (col === "ooc") return showOoc(App.data.ooc[i]);
      return showGalleryPrompt(App.data[col][i]);
    }
    sub ||= `${people[0].name || ""} × ${people[1].name || ""}`;
    detail = { people, variants, image, title, sel: -1, opt: { upper: false, noShoes: false } };
    const tabs = variants.length
      ? `<div class="variants">${variants.map((v, k) => `<button type="button" class="vtab" data-variant="${k}">${esc(v.label || "의상")}${v.sub ? ` <em>${esc(v.sub)}</em>` : ""}</button>`).join("")}</div>
        <div class="outfit-opts" hidden>
          <label><input type="checkbox" data-opt="upper"> 상반신만</label>
          <label><input type="checkbox" data-opt="noShoes"> 신발 없이</label>
        </div>`
      : "";
    openModal(`<div class="detail">
      <div class="detail-visual">
        <div id="detail-img"></div>
        ${tabs}
      </div>
      <div class="detail-info">
        ${tag ? `<span class="pill">${esc(tag)}</span>` : ""}
        <h2>${esc(title)}</h2>
        <p class="sub">${esc(sub)}</p>
        <div id="detail-prompts"></div>
      </div>
    </div>`);
    renderDetail();
  }

  // PAIR INFO: 페어 프로필 팝업
  function showInfo(i) {
    const p = App.data.pairs[i];
    const info = p.info || {};
    const card = (who) => {
      const pr = who?.profile || {};
      const rows = [["이름", pr.realname], ["소속", pr.team], ["등급", pr.grade], ["속성", pr.element], ["나이", pr.age]];
      const block = (label, text) => (text ? `<div class="id-block"><h4>${label}</h4><p>${esc(text)}</p></div>` : "");
      return `<article class="id-card">
        <div class="id-photo">${thumb(pr.photo, pr.codename || who?.name)}</div>
        <p class="id-code">${esc(pr.codename || who?.name || "")}</p>
        <dl class="id-rows">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v || "—")}</dd>`).join("")}</dl>
        ${block("성격", pr.personality)}
        ${pr.secret ? `<details class="id-block id-secret"><summary>비밀 설정</summary><p>${esc(pr.secret)}</p></details>` : ""}
        ${block("TMI", pr.tmi)}
      </article>`;
    };
    openModal(`<div class="pinfo">
      <header class="pinfo-head">
        ${p.tag ? `<span class="pill">${esc(p.tag)}</span>` : ""}
        <p class="pinfo-kicker">PAIR INFO</p>
        <h2>${esc(p.title)}</h2>
        ${info.intro ? `<p class="pinfo-intro">${esc(info.intro)}</p>` : ""}
      </header>
      <div class="pinfo-people">${card(p.male)}${card(p.female)}</div>
    </div>`);
  }

  // 갤러리: 기본은 프롬프트 한 단락, '페어 프롬프트 사용'이면 A / B 두 단락
  function showGalleryPrompt(g) {
    detail = null;
    const block = (label, text) => `<div class="prompt">
      <div class="prompt-head"><b>${label}</b>
        <span class="copy-btns"><button type="button" class="pill-btn dark" data-copy="${esc(text)}">Copy</button></span>
      </div>
      <div class="prompt-text"><p>${esc(text)}</p></div>
    </div>`;
    const body = g.pairMode
      ? [g.promptA && block("A", g.promptA), g.promptB && block("B", g.promptB)].filter(Boolean).join("")
      : g.prompt ? block("Prompt", g.prompt) : "";
    openModal(`<div class="detail">
      <div class="detail-visual">${thumb(g.image, g.caption)}</div>
      <div class="detail-info">
        ${g.section ? `<span class="pill">${esc(g.section)}</span>` : ""}
        <h2>${esc(g.caption || "")}</h2>
        <p class="sub"></p>
        ${body || `<p class="sub">아직 프롬프트가 없어요.</p>`}
      </div>
    </div>`);
  }

  function renderDetail() {
    const { variants, sel, opt, people } = detail;
    const v = variants[sel];
    const [m, f] = people;
    document.getElementById("detail-img").innerHTML = thumb(v?.image || detail.image, detail.title);
    document.getElementById("detail-prompts").innerHTML =
      promptBlock(m.name, m.base, outfitText(v?.male, opt)) + promptBlock(f.name, f.base, outfitText(v?.female, opt));
    document.querySelectorAll(".vtab").forEach((b) => b.classList.toggle("active", Number(b.dataset.variant) === sel));
    const opts = document.querySelector(".outfit-opts");
    if (opts) {
      opts.hidden = !v;
      const shoes = opts.querySelector('[data-opt="noShoes"]');
      shoes.disabled = opt.upper; // 상반신만이면 신발은 이미 빠짐
    }
  }

  function selectVariant(k) {
    detail.sel = detail.sel === k ? -1 : k; // 같은 칩을 다시 누르면 의상 끄기
    renderDetail();
  }

  let lockY = 0;
  function openModal(html) {
    modalBody.innerHTML = html;
    // 아이폰에서도 뒤 페이지가 움직이지 않게 고정 (스크롤 위치 기억)
    if (modal.hidden) {
      lockY = window.scrollY;
      Object.assign(document.body.style, { position: "fixed", top: `-${lockY}px`, left: "0", right: "0", overflow: "hidden" });
    }
    modal.hidden = false;
    modal.querySelector(".modal-box").scrollTop = 0;
  }
  function closeModal() {
    const wasOpen = !modal.hidden;
    modal.hidden = true;
    modalBody.innerHTML = "";
    if (wasOpen) {
      Object.assign(document.body.style, { position: "", top: "", left: "", right: "", overflow: "" });
      window.scrollTo(0, lockY);
    }
  }

  function toast(msg, ms = 1600) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast("복사했어요");
  }

  // ---------- events ----------
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-act]")) return; // admin.js 가 처리
    const fav = e.target.closest("[data-fav]");
    if (fav) {
      toggleFav(fav.dataset.fav);
      route();
      return;
    }
    const vt = e.target.closest("[data-variant]");
    if (vt) return selectVariant(Number(vt.dataset.variant));
    const op = e.target.closest("[data-opt]");
    if (op) {
      detail.opt[op.dataset.opt] = op.checked;
      return renderDetail();
    }
    const cp = e.target.closest("[data-copy]");
    if (cp) return copy(cp.dataset.copy);
    const info = e.target.closest("[data-info]");
    if (info) return showInfo(Number(info.dataset.info));
    const open = e.target.closest("[data-open]");
    if (open) showPrompt(open.dataset.open, Number(open.dataset.i));
  });
  // asset 하위 메뉴: ▾ 를 누르면 열고, 바깥을 누르면 닫음
  document.addEventListener("click", (e) => {
    const drop = document.querySelector(".nav-drop");
    if (!drop) return;
    if (e.target.closest(".drop-btn")) drop.classList.toggle("open");
    else if (!e.target.closest(".nav-drop")) drop.classList.remove("open");
  });
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  $("#modal-close").addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });
  window.addEventListener("hashchange", () => { closeModal(); route(); window.scrollTo(0, 0); });

  $("#year").textContent = new Date().getFullYear();

  // 예전 형식을 지금 형식으로 변환
  // 지금 형식: male/female.base = 외형 프롬프트
  //           variants[].male/female = { top, bottom, shoes } 의상 프롬프트
  App.normalize = (d) => {
    d.links ??= [];
    d.jaktae ??= [];
    d.ooc ??= [];
    d.genres ??= ["ARCH", "MO1", "月とナイフ", "ETC"];
    if (!d.genresV) {
      // 한 번만: ARCH 장르를 MO1 위에 추가 (나중에 지우면 다시 생기지 않음)
      if (!d.genres.includes("ARCH")) {
        const at = d.genres.indexOf("MO1");
        d.genres.splice(at < 0 ? 0 : at, 0, "ARCH");
      }
      d.genresV = 1;
    }
    // 갤러리: 예전의 남/여 개별 프롬프트는 한 단락으로 합침
    for (const g of d.gallery || []) {
      if (g.prompt === undefined && (g.male || g.female)) {
        g.prompt = [g.male?.prompt, g.female?.prompt].filter(Boolean).join("\n\n");
      }
      delete g.male;
      delete g.female;
    }
    // 예전 세계관 형식이면 ARCH 기본 내용으로 교체 (쭌식이 들어오면 저장됨)
    const W = window.WORLD_DEFAULT;
    if (!d.world || !(d.world.v >= 2)) d.world = structuredClone(W);
    if (d.world.v < 3) {
      // v3: 요원 증명사진 추가 (이름이 같으면 기본 사진을 채워 넣음)
      const photoOf = {};
      for (const t of W.teams) for (const m of t.members) photoOf[m.name] = m.photo;
      for (const t of d.world.teams || []) for (const m of t.members || []) m.photo ??= photoOf[m.name] || "";
      d.world.v = 3;
    }
    if (d.world.v < 4) {
      // v4: VANGUARD 3팀 줄 추가 (2팀 바로 다음)
      const teams = (d.world.teams ??= []);
      if (!teams.some((t) => t.name === "VANGUARD 3팀")) {
        const at = teams.findIndex((t) => t.name === "VANGUARD 2팀");
        teams.splice(at < 0 ? teams.length : at + 1, 0, { name: "VANGUARD 3팀", cls: "S-CLASS", members: [] });
      }
      d.world.v = 4;
    }
    for (const p of d.pairs || []) {
      p.male ??= {};
      p.female ??= {};
      if (!Array.isArray(p.variants)) {
        p.variants = [];
        if (p.male.prompt || p.female.prompt)
          p.variants.push({ label: "제복", sub: "", image: "", male: p.male.prompt || "", female: p.female.prompt || "" });
      }
      for (const k of ["male", "female"]) {
        delete p[k].prompt;
        if (p[k].base === undefined) {
          const first = p.variants[0]?.[k];
          const base = typeof first === "string" ? first.split(/\n\s*\n/)[0].trim() : "";
          p[k].base = base;
          for (const v of p.variants)
            if (typeof v[k] === "string" && v[k].startsWith(base)) v[k] = v[k].slice(base.length).trim();
        }
        for (const v of p.variants)
          if (typeof v[k] !== "object" || !v[k]) v[k] = { top: v[k] || "", bottom: "", shoes: "" };
      }
    }
    return d;
  };

  // 데이터는 로그인 후 auth.js 가 불러와서 App.render() 를 호출함
})();
