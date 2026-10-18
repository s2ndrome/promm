(function () {
  const $ = (sel) => document.querySelector(sel);
  const content = $("#content");
  const modal = $("#modal");
  const modalBody = $("#modal-body");

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const pairById = (id) => PAIRS.find((p) => p.id === id);

  // 이미지가 없거나 깨지면 플레이스홀더로 바꿈
  function thumb(src, label) {
    if (!src) return `<div class="thumb empty" data-label="${esc(label)}"></div>`;
    return `<div class="thumb" data-label="${esc(label)}"><img src="${esc(src)}" alt="${esc(label)}" loading="lazy"
      onerror="this.parentNode.classList.add('empty');this.remove()"></div>`;
  }

  function header(icon, title, desc) {
    return `<div class="cover"></div>
      <div class="page">
        <div class="page-icon">${icon}</div>
        <h1 class="page-title">${esc(title)}</h1>
        ${desc ? `<p class="page-desc">${esc(desc)}</p>` : ""}`;
  }

  // ---------- pages ----------
  function renderHome() {
    const cards = PAIRS.map(
      (p, i) => `<button class="card" data-pair="${i}">
        ${thumb(p.image, p.title)}
        <div class="card-body">
          <div class="card-title">${esc(p.title)}</div>
          <div class="card-sub">${esc(p.male?.name)} × ${esc(p.female?.name)}</div>
        </div>
      </button>`
    ).join("");
    return `${header(SITE.icon, SITE.title, "캐릭터 페어를 눌러 프롬프트를 확인하세요.")}
      <div class="pair-grid">${cards}</div></div>`;
  }

  function renderGallery() {
    const tiles = GALLERY.map(
      (g, i) => `<button class="tile" data-gallery="${i}">${thumb(g.image, g.caption || `#${i + 1}`)}</button>`
    ).join("");
    return `${header("🖼️", "갤러리", "사진을 누르면 프롬프트가 열립니다.")}
      <div class="masonry">${tiles}</div></div>`;
  }

  function renderWorld() {
    const sections = (WORLD.sections || []).map(
      (s) => `<div class="callout">
        <div class="callout-icon">${esc(s.icon)}</div>
        <div><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></div>
      </div>`
    ).join("");
    const factions = (WORLD.factions || []).map(
      (f) => `<div class="faction" style="background:${esc(f.color || "#f1f1ef")}">
        <h3>${esc(f.name)}</h3>
        <p>${esc(f.desc)}</p>
        <div class="tags">${(f.members || []).map((m) => `<span class="tag">${esc(m)}</span>`).join("")}</div>
      </div>`
    ).join("");
    const relations = (WORLD.relations || []).map(
      (r) => `<div class="relation">
        <span class="who">${esc(r.from)}</span>
        <span class="link">${esc(r.label)}</span>
        <span class="who">${esc(r.to)}</span>
      </div>`
    ).join("");
    return `${header("🗺️", "세계관", WORLD.intro)}
      ${sections}
      ${factions ? `<h2>세력 구도</h2><div class="factions">${factions}</div>` : ""}
      ${relations ? `<h2>캐릭터 관계</h2><div class="relations">${relations}</div>` : ""}
    </div>`;
  }

  const routes = {
    "/": { title: "메인", render: renderHome },
    "/gallery": { title: "갤러리", render: renderGallery },
    "/world": { title: "세계관", render: renderWorld },
  };

  function route() {
    const path = location.hash.replace(/^#/, "") || "/";
    const r = routes[path] || routes["/"];
    content.innerHTML = r.render();
    $("#crumb").textContent = `${SITE.title} / ${r.title}`;
    document.title = `${r.title} · ${SITE.title}`;
    document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === path));
    document.body.classList.remove("nav-open");
    closeModal();
    window.scrollTo(0, 0);
  }

  // ---------- modal ----------
  function promptBlock(kind, label, who) {
    if (!who) return "";
    return `<div class="prompt ${kind}">
      <div class="prompt-head">
        <span>${label}<small>${esc(who.name)}</small></span>
        <button class="copy-btn" data-copy="${esc(who.prompt)}">복사</button>
      </div>
      <pre>${esc(who.prompt)}</pre>
    </div>`;
  }

  function openModal({ image, title, caption, male, female }) {
    modalBody.innerHTML = `<div class="modal-grid">
      ${thumb(image, title)}
      <div class="modal-info">
        <h3>${esc(title)}</h3>
        ${caption ? `<p class="caption">${esc(caption)}</p>` : `<p class="caption"></p>`}
        ${promptBlock("male", "♂ 남", male)}
        ${promptBlock("female", "♀ 여", female)}
      </div>
    </div>`;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1400);
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
    const pairEl = e.target.closest("[data-pair]");
    if (pairEl) {
      const p = PAIRS[pairEl.dataset.pair];
      openModal({ image: p.image, title: p.title, male: p.male, female: p.female });
      return;
    }
    const galEl = e.target.closest("[data-gallery]");
    if (galEl) {
      const g = GALLERY[galEl.dataset.gallery];
      const p = pairById(g.pair) || {};
      openModal({
        image: g.image,
        title: p.title || g.caption || "",
        caption: p.title ? g.caption : "",
        male: g.male || p.male,
        female: g.female || p.female,
      });
      return;
    }
    const copyEl = e.target.closest("[data-copy]");
    if (copyEl) copy(copyEl.dataset.copy);
  });

  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  $("#modal-close").addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

  $("#menu-btn").addEventListener("click", () => document.body.classList.toggle("nav-open"));
  $("#sidebar-backdrop").addEventListener("click", () => document.body.classList.remove("nav-open"));

  $("#ws-icon").textContent = SITE.icon;
  $("#ws-name").textContent = SITE.title;

  window.addEventListener("hashchange", route);
  route();
})();
