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
    return `<div class="thumb"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy"
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

  // ---------- 즐겨찾기 (이 브라우저에만 저장) ----------
  let favs = new Set();
  try { favs = new Set(JSON.parse(localStorage.getItem("promm_favs") || "[]")); } catch {}
  function toggleFav(id) {
    favs.has(id) ? favs.delete(id) : favs.add(id);
    try { localStorage.setItem("promm_favs", JSON.stringify([...favs])); } catch {}
  }

  // ---------- pages ----------
  function renderHome() {
    const { pairs } = App.data;
    const items = pairs.map(
      (p, i) => `<article class="item" data-open="pairs" data-i="${i}">
        <div class="item-head">
          <span class="pill">#${num(i)}</span>
          <button type="button" class="star ${favs.has(p.id) ? "on" : ""}" data-fav="${esc(p.id)}" aria-label="즐겨찾기">${favs.has(p.id) ? "★" : "☆"}</button>
        </div>
        ${tools("pairs", i)}
        ${thumb(p.image, p.title)}
        <p class="item-name">${esc(p.male?.name)} × ${esc(p.female?.name)}</p>
        <p class="item-sub">${esc(p.title)}</p>
        <div class="item-foot"><button type="button" class="pill-btn">Prompt</button></div>
      </article>`
    ).join("");
    return `<div class="adm-bar">${addBtn("pairs", "페어 추가")}${addBtn("site", "사이트 정보")}</div>
      <section class="grid">${items}</section>`;
  }

  function renderGallery() {
    const { gallery } = App.data;
    const shots = gallery.map((g, i) => {
      const p = pairById(g.pair);
      return `<figure class="shot" data-open="gallery" data-i="${i}">
        ${tools("gallery", i)}
        ${thumb(g.image, g.caption)}
        <figcaption class="shot-cap"><span>${esc(g.caption || p?.title || "")}</span><span class="pill">#${num(i)}</span></figcaption>
      </figure>`;
    }).join("");
    return `<div class="page-head"><h1>GALLERY</h1><p>사진을 누르면 프롬프트가 열려요</p></div>
      <div class="adm-bar">${addBtn("gallery", "사진 추가")}</div>
      <section class="gallery">${shots}</section>`;
  }

  function renderWorld() {
    const w = App.data.world;
    const chapters = (w.sections || []).map(
      (s, i) => `<div class="chapter">
        <span class="chapter-no">${num(i)}</span>
        <div><h3>${esc(s.icon)} ${esc(s.title)}</h3><p>${esc(s.body)}</p></div>
        ${tools("world.sections", i)}
      </div>`
    ).join("");
    const factions = (w.factions || []).map(
      (f, i) => `<div class="faction">
        <h3><span class="faction-dot" style="background:${esc(f.color || "#ddd")}"></span>${esc(f.name)}</h3>
        <p>${esc(f.desc)}</p>
        <div class="tags">${(f.members || []).map((m) => `<span class="pill">${esc(m)}</span>`).join("")}</div>
        ${tools("world.factions", i)}
      </div>`
    ).join("");
    const relations = (w.relations || []).map(
      (r, i) => `<div class="relation">
        <span class="who">${esc(r.from)}</span>
        <span class="pill">${esc(r.label)}</span>
        <span class="who">${esc(r.to)}</span>
        ${tools("world.relations", i, false)}
      </div>`
    ).join("");
    return `<div class="page-head"><h1>WORLD</h1></div>
      <div class="world">
        <p class="world-intro">${esc(w.intro)}</p>
        <div class="adm-bar">${addBtn("world", "소개 수정")}</div>
        <div class="block-title">STORY</div>
        ${chapters}
        <div class="adm-bar" style="margin-top:18px">${addBtn("world.sections", "항목 추가")}</div>
        <div class="block-title">FACTIONS</div>
        <div class="factions">${factions}</div>
        <div class="adm-bar" style="margin-top:18px">${addBtn("world.factions", "세력 추가")}</div>
        <div class="block-title">RELATIONS</div>
        ${relations}
        <div class="adm-bar" style="margin-top:18px">${addBtn("world.relations", "관계 추가")}</div>
      </div>`;
  }

  const routes = {
    "/": { title: "Pairs", render: renderHome },
    "/gallery": { title: "Gallery", render: renderGallery },
    "/world": { title: "World", render: renderWorld },
  };

  function route() {
    if (!App.data) return;
    const path = location.hash.replace(/^#/, "") || "/";
    const r = routes[path] || routes["/"];
    content.innerHTML = r.render();
    const brand = App.data.site?.title || "PROMM";
    $(".brand").textContent = brand;
    document.title = `${r.title} · ${brand}`;
    document.querySelectorAll("[data-route]").forEach((a) => a.classList.toggle("active", a.dataset.route === path));
  }

  // ---------- prompt popup ----------
  function promptBlock(label, who) {
    if (!who || (!who.name && !who.prompt)) return "";
    return `<div class="prompt">
      <div class="prompt-head">
        <b>${label}<span>${esc(who.name)}</span></b>
        <button type="button" class="pill-btn" data-copy="${esc(who.prompt)}">Copy</button>
      </div>
      <p class="prompt-text">${esc(who.prompt)}</p>
    </div>`;
  }

  function showPrompt(col, i) {
    let item, tag, title, sub;
    if (col === "pairs") {
      item = App.data.pairs[i];
      tag = `#${num(i)}`;
      title = item.title;
      sub = `${item.male?.name || ""} × ${item.female?.name || ""}`;
    } else {
      const g = App.data.gallery[i];
      const p = pairById(g.pair) || {};
      item = { image: g.image, male: g.male || p.male, female: g.female || p.female };
      tag = `#${num(i)}`;
      title = g.caption || p.title || "";
      sub = p.title && g.caption ? p.title : `${item.male?.name || ""} × ${item.female?.name || ""}`;
    }
    openModal(`<div class="detail">
      ${thumb(item.image, title)}
      <div class="detail-info">
        <span class="pill">${tag}</span>
        <h2>${esc(title)}</h2>
        <p class="sub">${esc(sub)}</p>
        ${promptBlock("HIM", item.male)}
        ${promptBlock("HER", item.female)}
      </div>
    </div>`);
  }

  function openModal(html) {
    modalBody.innerHTML = html;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    modal.hidden = true;
    modalBody.innerHTML = "";
    document.body.style.overflow = "";
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
    toast("프롬프트를 복사했어요");
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
    const cp = e.target.closest("[data-copy]");
    if (cp) return copy(cp.dataset.copy);
    const open = e.target.closest("[data-open]");
    if (open) showPrompt(open.dataset.open, Number(open.dataset.i));
  });
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  $("#modal-close").addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });
  window.addEventListener("hashchange", () => { closeModal(); route(); window.scrollTo(0, 0); });

  $("#year").textContent = new Date().getFullYear();

  // ---------- load ----------
  App.ready = fetch(`data/site.json?v=${Date.now()}`, { cache: "no-store" })
    .then((r) => r.json())
    .then((d) => { App.data = d; route(); })
    .catch(() => { content.innerHTML = `<p style="text-align:center;color:#999">데이터를 불러오지 못했어요.</p>`; });
})();
