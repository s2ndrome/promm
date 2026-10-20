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

  // ---------- 메인 (흑백 에디토리얼) ----------
  let ftCur = 0, ftList = [], relGenre = null;
  const short = (t) => String(t || "").trim().toLowerCase();

  function heroHtml() {
    const pairs = App.data.pairs, i = ftList[ftCur], p = pairs[i];
    if (!p) return "";
    return `<div class="hc-head">
        <div class="hc-id"><small>pair</small><b>${esc(p.title)}</b><small>${esc(p.male?.name)} × ${esc(p.female?.name)}</small></div>
        <div class="hc-btns">
          <button type="button" class="pb" data-open="pairs" data-i="${i}">prompt</button>
          <button type="button" class="pc" data-info="${i}" aria-label="Pair Info">i</button>
        </div>
        <button type="button" class="star ${favs.has(p.id) ? "on" : ""}" data-fav="${esc(p.id)}" aria-label="즐겨찾기">${favs.has(p.id) ? "★" : "☆"}</button>
      </div>
      <div class="hc-stage" data-open="pairs" data-i="${i}">
        ${thumb(p.image, p.title)}
        <p class="hc-label">${esc(short(p.tag) || "zzon")}</p>
        <p class="hc-huge">${esc(short(p.title))}</p>
        <p class="hc-vol">( vol.${num(ftCur)} )</p>
        <p class="hc-side">character<br>prompt<br>archive</p>
        ${ftList.length > 1 ? `<button type="button" class="hc-next" data-ft-step="1">next ›</button>` : ""}
      </div>`;
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ft-step]");
    if (b && ftList.length) {
      ftCur = (ftCur + 1) % ftList.length;
      const el = document.getElementById("hc");
      el.innerHTML = heroHtml();
      el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap");
      return;
    }
    const c = e.target.closest("[data-rel-genre]");
    if (c) {
      relGenre = relGenre === c.dataset.relGenre ? null : c.dataset.relGenre;
      document.querySelectorAll("[data-rel-genre]").forEach((x) => x.classList.toggle("on", x.dataset.relGenre === relGenre));
      document.getElementById("rel-view").innerHTML = relView();
    }
  });

  const mini = (col, x, i) => {
    const solo = col === "girls";
    return `<article class="mini" data-open="${col}" data-i="${i}">
      ${tools(col, i)}
      ${thumb(x.image, x.title)}
      <p>${esc(solo ? x.female?.name : x.title)}</p>
      <div class="mini-sub">
        <small>${esc(solo ? x.title : `${x.male?.name || ""} × ${x.female?.name || ""}`)}</small>
        <button type="button" class="mini-info" data-info="${i}" ${solo ? `data-col="girls"` : ""}>${solo ? "profile" : "info"} ›</button>
      </div>
    </article>`;
  };
  function relView() {
    if (!relGenre) return "";
    const { pairs, genres = [] } = App.data;
    if (relGenre === "ONLY GIRL") {
      const girls = App.data.girls || [];
      return `<div class="rv-head"><span>only girl</span><span>( ${girls.length} )</span></div>
        ${girls.length ? `<div class="mini-grid">${girls.map((c, i) => mini("girls", c, i)).join("")}</div>` : `<p class="genre-empty">아직 캐릭터가 없어요.</p>`}
        <div class="adm-bar"><button type="button" class="pill-btn" data-act="add" data-col="girls">+ 캐릭터 추가</button></div>`;
    }
    const list = pairs.map((p, i) => (p.genre === relGenre && genres.includes(p.genre) ? i : -1)).filter((i) => i >= 0);
    return `<div class="rv-head"><span>${esc(short(relGenre))}</span><span>( ${list.length} )</span></div>
      ${list.length ? `<div class="mini-grid">${list.map((i) => mini("pairs", pairs[i], i)).join("")}</div>` : `<p class="genre-empty">아직 페어가 없어요.</p>`}
      <div class="adm-bar"><button type="button" class="pill-btn" data-act="add" data-col="pairs" data-genre="${esc(relGenre)}">+ 이 장르에 페어 추가</button></div>`;
  }

  // ---------- 의상 프롬프트 생성기 (Supabase 함수 outfit-chat → Claude) ----------
  const OUTFIT_API = "https://outfit-chat.jenojeno0423.workers.dev/"; // 사이트 정보에서 다른 주소로 바꿀 수 있음
  let ocMsgs = [], ocBusy = false, ocErr = "";
  function ocLogHtml() {
    if (!ocMsgs.length && !ocBusy && !ocErr) return `<p class="oc-hint">원하는 분위기나 아이템을 적으면 의상 프롬프트만 만들어줘요.<br>이어서 "치마를 바지로" 처럼 고쳐 달라고 해도 돼요.</p>`;
    return ocMsgs.map((m) => m.role === "user"
      ? `<p class="oc-q">${esc(m.content)}</p>`
      : `<div class="oc-a"><p>${esc(m.content)}</p><button type="button" class="oc-copy" data-copy="${esc(m.content)}">copy</button></div>`).join("")
      + (ocBusy ? `<p class="oc-wait"><i></i><i></i><i></i></p>` : "")
      + (ocErr ? `<p class="oc-err">${esc(ocErr)}</p>` : "");
  }
  function ocPaint() {
    const log = document.getElementById("oc-log");
    if (!log) return;
    log.innerHTML = ocLogHtml();
    log.scrollTop = log.scrollHeight;
    const r = document.querySelector("[data-oc-reset]");
    if (r) r.hidden = !ocMsgs.length;
  }
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "oc-form") return;
    e.preventDefault();
    const inp = document.getElementById("oc-in");
    const q = inp.value.trim();
    if (!q || ocBusy) return;
    inp.value = "";
    ocMsgs.push({ role: "user", content: q });
    ocBusy = true; ocErr = "";
    ocPaint();
    try {
      const api = (App.data.site?.outfitApi || OUTFIT_API).trim();
      const { data: ss } = await App.sb.auth.getSession();
      let res;
      try {
        res = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${ss.session?.access_token || ""}` },
          body: JSON.stringify({ messages: ocMsgs.slice(-12) }),
        });
      } catch {
        throw new Error("생성기 주소에 연결하지 못했어요. 주소를 확인해 주세요.");
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status === 403 ? "회원만 쓸 수 있어요." : res.status === 429 ? "지금 요청이 많아요. 잠시 후 다시 해주세요." : "만들지 못했어요. 다시 해주세요.");
      if (!data?.text) throw new Error("만들지 못했어요. 다시 해주세요.");
      ocMsgs.push({ role: "assistant", content: data.text });
    } catch (err) {
      ocMsgs.pop();
      inp.value = q;
      ocErr = err.message;
    }
    ocBusy = false;
    ocPaint();
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-oc-reset]")) return;
    ocMsgs = []; ocErr = "";
    ocPaint();
  });

  function renderHome() {
    const { pairs, genres = [] } = App.data;
    const genreOf = (p) => (genres.includes(p.genre) ? p.genre : "");
    const mainIdx = pairs.map((p, i) => (genreOf(p) ? -1 : i)).filter((i) => i >= 0);
    ftList = mainIdx.filter((i) => pairs[i].image);
    if (!ftList.length) ftList = pairs.map((p, i) => (p.image ? i : -1)).filter((i) => i >= 0);
    if (ftCur >= ftList.length) ftCur = 0;
    if (relGenre && relGenre !== "ONLY GIRL" && !genres.includes(relGenre)) relGenre = null;
    const chips = [...genres, "ONLY GIRL"].map((g) => `<button type="button" class="chip ${relGenre === g ? "on" : ""}" data-rel-genre="${esc(g)}">${esc(g)}</button>`).join("");
    return `
      <div class="adm-bar">${addBtn("pairs", "페어 추가")}${addBtn("genres", "장르 관리")}<span class="owner-only">${addBtn("site", "사이트 정보")}</span></div>
      <div class="row-head"><span>more pairs <i>›</i></span><span>( ${mainIdx.length} )</span></div>
      ${mainIdx.length ? `<div class="mini-grid">${mainIdx.map((i) => mini("pairs", pairs[i], i)).join("")}</div>` : ""}
      <div class="rel-wrap">
      <section class="rel">
        <div class="rel-l">
          <p class="rel-t">related :</p>
          <p class="rel-s">zzon also keeps <span>×</span></p>
          <div class="chips">${chips}</div>
        </div>
        <div class="rel-r oc">
          <div class="oc-head"><span class="pb pb-sm">outfit generator</span><button type="button" class="oc-reset" data-oc-reset ${ocMsgs.length ? "" : "hidden"}>reset</button></div>
          <div class="oc-log" id="oc-log">${ocLogHtml()}</div>
          <form class="oc-form" id="oc-form" autocomplete="off">
            <input type="text" id="oc-in" placeholder="예) 겨울 데이트룩, 니트랑 롱코트" maxlength="300" enterkeyhint="send">
            <button type="submit" class="pb">send</button>
          </form>
        </div>
      </section>
      <div id="rel-view" class="rel-view">${relView()}</div>
      </div>`;
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
    const host = (u) => { try { return new URL(u).host; } catch { return ""; } };
    const card = (i) => {
      const l = links[i];
      const name = l.title || host(l.url).replace(/^www\./, "") || l.url;
      return `<div class="link-card">
        <a class="lk" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" style="--dot:${esc(l.dot || "#111111")}">
          <span class="lk-top"><i class="lk-dot"></i><span class="lk-host">${esc(host(l.url))}</span></span>
          <span class="lk-title">${esc(name)}</span>
        </a>
        ${tools("links", i)}
      </div>`;
    };
    // 장르(토글) → 구분(구분선) 순서로 묶기. 처음 나온 순서대로
    const byGenre = new Map();
    links.forEach((l, i) => {
      const g = (l.genre || "").trim(), s = (l.section || "").trim();
      if (!byGenre.has(g)) byGenre.set(g, new Map());
      const secs = byGenre.get(g);
      if (!secs.has(s)) secs.set(s, []);
      secs.get(s).push(i);
    });
    const sectionsHtml = (secs) => [...secs].map(([name, idx]) => `<section class="g-section">
        ${name ? `<div class="block-title">${esc(name)}</div>` : ""}
        <div class="link-grid">${idx.map(card).join("")}</div>
      </section>`).join("");
    const top = byGenre.has("") ? sectionsHtml(byGenre.get("")) : "";
    const boxes = [...byGenre].filter(([g]) => g).map(([g, secs]) => {
      const key = `link:${g}`, n = [...secs.values()].reduce((a, x) => a + x.length, 0);
      return `<details class="genre" data-genre-box="${esc(key)}" ${openGenres.has(key) ? "open" : ""}>
        <summary><span class="genre-name">${esc(g)}</span><span class="genre-count">${n}</span></summary>
        <div class="genre-body">
          ${sectionsHtml(secs)}
          <div class="adm-bar genre-add"><button type="button" class="pill-btn" data-act="add" data-col="links" data-genre="${esc(g)}">+ 이 장르에 링크 추가</button></div>
        </div>
      </details>`;
    }).join("");
    return `<div class="page-head"><h1>LINK</h1><p>모아둔 링크</p></div>
      <div class="adm-bar">${addBtn("links", "링크 추가")}</div>
      ${top}
      ${boxes ? `<div class="genres">${boxes}</div>` : ""}
      ${links.length ? "" : `<p class="link-empty">아직 링크가 없어요.</p>`}`;
  }

  function renderSoon(k) {
    return `<div class="page-head"><h1>준비중</h1><p>archive ${k}.</p></div>
      <div class="soon"><p>아직 준비중인 페이지예요.</p><small>coming soon</small></div>`;
  }

  const routes = {
    "/": { title: "Pairs", render: renderHome },
    "/gallery": { title: "Asset", render: () => renderGallery("gallery") },
    "/jaktae": { title: "작태", render: () => renderGallery("jaktae") },
    "/world": { title: "ARCH", render: () => App.renderWorld() },
    "/link": { title: "Link", render: renderLinks },
    "/ooc": { title: "OOC", render: renderOOC },
    // archive a / b / c: 아직 준비중인 페이지
    "/archive-a": { title: "준비중", render: () => renderSoon("a") },
    "/archive-b": { title: "준비중", render: () => renderSoon("b") },
    "/archive-c": { title: "준비중", render: () => renderSoon("c") },
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
      { k: "male", name: p.male?.name, base: p.male?.base || "" },
      { k: "female", name: p.female?.name, base: p.female?.base || "" },
    ];
    if (col === "pairs") {
      const p = App.data.pairs[i];
      people = fromPair(p);
      variants = p.variants || [];
      image = p.image;
      title = p.title;
      tag = p.tag;
    } else if (col === "girls") {
      const c = App.data.girls[i];
      people = [{ k: "female", name: c.female?.name, base: c.female?.base || "" }];
      variants = c.variants || [];
      image = c.image;
      title = c.title || c.female?.name;
      tag = c.tag;
      sub = c.title ? c.female?.name || "" : "";
    } else {
      if (col === "ooc") return showOoc(App.data.ooc[i]);
      return showGalleryPrompt(App.data[col][i]);
    }
    if (col === "pairs") sub = `${people[0].name || ""} × ${people[1].name || ""}`;
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
  function showInfo(i, col = "pairs") {
    const solo = col === "girls";
    const p = App.data[col][i];
    const info = p.info || {};
    const card = (who, k) => {
      const pr = who?.profile || {};
      const lb = pr.labels || {};
      const rows = [[lb.realname || "이름", pr.realname], [lb.team || "소속", pr.team], [lb.grade || "등급", pr.grade], [lb.element || "속성", pr.element], [lb.age || "나이", pr.age]];
      const block = (label, text) => (text ? `<div class="id-block"><h4>${label}</h4><p>${esc(text)}</p></div>` : "");
      return `<article class="id-card">
        <button type="button" class="id-photo" data-idphoto="${i}:${k}" data-col="${col}" aria-label="공식 프롬프트 보기">${thumb(pr.photo, pr.codename || who?.name)}
          <span class="id-photo-hint">공식 프롬프트</span></button>
        <p class="id-code">${esc(pr.codename || who?.name || "")}</p>
        <dl class="id-rows">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v || "—")}</dd>`).join("")}</dl>
        ${block("성격", pr.personality)}
        ${pr.secret ? `<details class="id-block id-secret"><summary>비밀 설정</summary><p>${esc(pr.secret)}</p></details>` : ""}
        ${block("TMI", pr.tmi)}
      </article>`;
    };
    openModal(`<div class="pinfo">
      <header class="pinfo-head">
        ${p.tag ? `<span class="pill">${esc(p.tag)}</span>` : ""}
        <p class="pinfo-kicker">${solo ? "PROFILE" : "PAIR INFO"}</p>
        <h2>${esc(solo ? p.title || p.female?.name : p.title)}</h2>
        ${info.intro ? `<p class="pinfo-intro">${esc(info.intro)}</p>` : ""}
      </header>
      <div class="pinfo-people ${solo ? "solo" : ""}">${solo ? card(p.female, "female") : card(p.male, "male") + card(p.female, "female")}</div>
    </div>`);
  }

  // PAIR INFO 증명사진을 누르면: 공식 프롬프트 한 단락
  function showIdPrompt(i, k, col = "pairs") {
    const p = App.data[col][i];
    const who = p[k] || {};
    const pr = who.profile || {};
    const text = pr.photoPrompt || "";
    openModal(`<div class="detail idp">
      <div class="detail-visual"><div class="id-photo id-photo-lg">${thumb(pr.photo, pr.codename || who.name)}</div></div>
      <div class="detail-info">
        <button type="button" class="pill-btn back-btn" data-info="${i}" data-col="${col}">← ${col === "girls" ? "Profile" : "Pair Info"}</button>
        <h2>${esc(pr.codename || who.name || "")}</h2>
        <p class="sub">${esc(p.title)}</p>
        ${text ? `<div class="prompt">
          <div class="prompt-head"><b>공식 프롬프트</b>
            <span class="copy-btns"><button type="button" class="pill-btn dark" data-copy="${esc(text)}">Copy</button></span>
          </div>
          <div class="prompt-text"><p>${esc(text)}</p></div>
        </div>` : `<p class="sub">아직 공식 프롬프트가 없어요.</p>`}
      </div>
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
    document.getElementById("detail-img").innerHTML = thumb(v?.image || detail.image, detail.title);
    document.getElementById("detail-prompts").innerHTML =
      people.map((p) => promptBlock(p.name, p.base, outfitText(v?.[p.k], opt))).join("");
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
    const box = modal.querySelector(".modal-box");
    box.className = "modal-box";
    box.scrollTop = 0;
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
    if (e.target.closest("[data-ft-step], [data-rel-genre]")) return; // 메인 '다음' 버튼 · 장르 칩
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
    const idp = e.target.closest("[data-idphoto]");
    if (idp) {
      const [pi, pk] = idp.dataset.idphoto.split(":");
      return showIdPrompt(Number(pi), pk, idp.dataset.col || "pairs");
    }
    const info = e.target.closest("[data-info]");
    if (info) return showInfo(Number(info.dataset.info), info.dataset.col || "pairs");
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

  // ---------- 다크 모드 버튼 ----------
  const darkNow = () => {
    const t = document.documentElement.dataset.theme;
    return t === "dark";
  };
  const paintTheme = () => { const b = $("#theme-btn span"); if (b) b.textContent = darkNow() ? "light" : "dark"; };
  $("#theme-btn")?.addEventListener("click", () => {
    const next = darkNow() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("zzon_theme", next); } catch {}
    paintTheme();
  });
  paintTheme();

  // 예전 형식을 지금 형식으로 변환
  // 지금 형식: male/female.base = 외형 프롬프트
  //           variants[].male/female = { top, bottom, shoes } 의상 프롬프트
  App.normalize = (d) => {
    d.links ??= [];
    d.jaktae ??= [];
    d.ooc ??= [];
    d.girls ??= [];
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
    if (d.world.v < 6) {
      // v5~6: 요원 상세 프로필(증명사진을 누르면 뜨는 팝업) 기본값 — 비어 있는 요원만 채움 (v6: 휴고)
      const cards = window.AGENT_CARDS || {};
      for (const t of d.world.teams || []) for (const m of t.members || []) if (!m.card && cards[(m.name || "").trim()]) m.card = cards[(m.name || "").trim()];
      d.world.v = 6;
    }
    // 예전 편집 화면(상세 프로필 칸이 없던 버전)으로 저장하면 card 가 통째로 빠짐 → 기본값으로 되살림
    // (편집에서 일부러 비운 경우는 card 가 "" 로 남으므로 그대로 둠)
    {
      const cards = window.AGENT_CARDS || {};
      for (const t of d.world.teams || []) for (const m of t.members || []) {
        const k = (m.name || "").trim();
        if (m.card === undefined && cards[k]) m.card = cards[k];
      }
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
