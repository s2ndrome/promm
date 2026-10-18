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
          ${p.tag ? `<span class="pill">${esc(p.tag)}</span>` : "<span></span>"}
          <button type="button" class="star ${favs.has(p.id) ? "on" : ""}" data-fav="${esc(p.id)}" aria-label="즐겨찾기">${favs.has(p.id) ? "★" : "☆"}</button>
        </div>
        ${tools("pairs", i)}
        ${thumb(p.image, p.title)}
        <p class="item-name">${esc(p.male?.name)} × ${esc(p.female?.name)}</p>
        <p class="item-sub">${esc(p.title)}</p>
        <div class="item-foot"><button type="button" class="pill-btn">Prompt</button></div>
      </article>`
    ).join("");
    return `<div class="adm-bar">${addBtn("pairs", "페어 추가")}<span class="owner-only">${addBtn("site", "사이트 정보")}</span></div>
      <section class="grid">${items}</section>`;
  }

  function renderGallery() {
    const { gallery } = App.data;
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
      return `<figure class="shot" data-open="gallery" data-i="${i}">
        ${tools("gallery", i)}
        ${thumb(g.image, g.caption)}
        <figcaption class="shot-cap"><span>${esc(g.caption || p?.title || "")}</span>${p?.tag ? `<span class="pill">${esc(p.tag)}</span>` : ""}</figcaption>
      </figure>`;
    };
    const sections = [...groups].map(([name, idx]) => `<section class="g-section">
        ${name || groups.size > 1 ? `<div class="block-title">${esc(name || "ETC")}
          ${name ? `<span class="adm-inline"><button type="button" class="pill-btn" data-act="rename-section" data-section="${esc(name)}">이름 변경</button></span>` : ""}</div>` : ""}
        <div class="gallery">${idx.map(shot).join("")}</div>
        <div class="adm-bar g-add"><button type="button" class="pill-btn" data-act="add" data-col="gallery" data-section="${esc(name)}">+ 이 줄에 사진 추가</button></div>
      </section>`).join("");
    return `<div class="page-head"><h1>GALLERY</h1><p>사진을 누르면 프롬프트가 열려요</p></div>
      <div class="adm-bar">${addBtn("gallery", "사진 추가")}</div>
      ${sections}`;
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
      <div class="world owner-edit">
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
    const site = App.data.site || {};
    const brand = site.title || "ZZON";
    $(".brand").textContent = brand;
    document.title = `${r.title} · ${brand}`;
    document.querySelectorAll("[data-route]").forEach((a) => a.classList.toggle("active", a.dataset.route === path));
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
      const g = App.data.gallery[i];
      const p = pairById(g.pair) || {};
      people = fromPair(p);
      variants = p.variants || [];
      if (g.male || g.female) {
        // 사진에만 따로 적은 프롬프트
        people = [
          { name: g.male?.name || people[0].name, base: g.male?.prompt || "" },
          { name: g.female?.name || people[1].name, base: g.female?.prompt || "" },
        ];
        variants = [];
      }
      image = g.image;
      tag = p.tag;
      title = g.caption || p.title || "";
      sub = p.title && g.caption ? p.title : "";
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
    const vt = e.target.closest("[data-variant]");
    if (vt) return selectVariant(Number(vt.dataset.variant));
    const op = e.target.closest("[data-opt]");
    if (op) {
      detail.opt[op.dataset.opt] = op.checked;
      return renderDetail();
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

  // 예전 형식을 지금 형식으로 변환
  // 지금 형식: male/female.base = 외형 프롬프트
  //           variants[].male/female = { top, bottom, shoes } 의상 프롬프트
  App.normalize = (d) => {
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
