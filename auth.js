// 로그인 / 회원가입(초대 코드) / 데이터 불러오기
(function () {
  const SUPABASE_URL = "https://psmfizpqfpyxfbygoedo.supabase.co";
  const SUPABASE_KEY = "sb_publishable_WGflck45xCAvjTbLOW8MVQ_-Ngle1cu";
  const BUCKET = "media";
  const URL_TTL = 60 * 60 * 6; // 서명된 주소 유효시간(초)

  const App = window.App;
  const esc = App.esc;

  // 등급: 쭌식(owner) > ARCH PRIMA > Vanguard > Acolyte
  const ROLE_NAMES = (App.ROLE_NAMES = { owner: "쭌식", prima: "ARCH PRIMA", vanguard: "Vanguard", acolyte: "Acolyte" });
  const RANKS = { owner: 4, prima: 3, vanguard: 2, acolyte: 1 };
  App.rank = 0;
  const sb = (App.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY));
  const gate = document.getElementById("gate");

  // ---------- 비공개 파일 주소 ----------
  // 저장소 경로(images/..., bgm/...) → 서명된 주소. 예전 경로(img/...)나 http 주소는 그대로
  const urls = new Map();
  const isRemote = (src) => src && !/^(https?:|data:|blob:|img\/)/.test(src);
  App.mediaUrl = (src) => (isRemote(src) ? urls.get(src) || "" : src || "");

  App.resolveMedia = async (paths) => {
    const need = [...new Set(paths.filter((p) => isRemote(p) && !urls.has(p)))];
    if (!need.length) return;
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrls(need, URL_TTL);
    if (error) throw new Error(error.message);
    for (const r of data || []) if (r.signedUrl) urls.set(r.path, r.signedUrl);
  };

  App.uploadMedia = async (path, blob, contentType) => {
    const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType, upsert: false });
    if (error) throw new Error(error.message);
    await App.resolveMedia([path]);
  };

  function imagePaths(d) {
    const out = [];
    for (const p of d.pairs || []) {
      out.push(p.image, p.male?.profile?.photo, p.female?.profile?.photo);
      for (const v of p.variants || []) out.push(v.image);
    }
    for (const g of [...(d.gallery || []), ...(d.jaktae || [])]) out.push(g.image);
    for (const c of d.girls || []) {
      out.push(c.image, c.female?.profile?.photo);
      for (const v of c.variants || []) out.push(v.image);
    }
    for (const t of d.world?.teams || []) for (const m of t.members || []) out.push(m.photo);
    return out.filter(Boolean);
  }

  // ---------- 사이트 데이터 ----------
  const EMPTY = { site: { title: "ZZON" }, pairs: [], gallery: [], world: { intro: "", sections: [], factions: [], relations: [] } };

  // 처음 한 번: 예전 data/site.json 과 img/ 이미지를 Supabase 로 옮김
  async function migrateLegacy() {
    let legacy;
    try {
      const r = await fetch(`data/site.json?v=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) return null;
      legacy = App.normalize(await r.json());
    } catch {
      return null;
    }
    const moved = new Map();
    const move = async (src) => {
      if (!src || !src.startsWith("img/")) return src;
      if (moved.has(src)) return moved.get(src);
      const res = await fetch(src);
      if (!res.ok) return src;
      const blob = await res.blob();
      const path = `images/${src.split("/").pop()}`;
      const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || "image/webp", upsert: true });
      if (error) throw new Error(error.message);
      moved.set(src, path);
      return path;
    };
    for (const p of legacy.pairs) {
      p.image = await move(p.image);
      for (const v of p.variants) v.image = await move(v.image);
    }
    for (const g of legacy.gallery) g.image = await move(g.image);
    return legacy;
  }

  async function loadData() {
    const { data: row, error } = await sb.from("site_data").select("data").eq("id", "main").maybeSingle();
    if (error) throw new Error(error.message);
    let d = row?.data;
    if (!d) {
      d = (await migrateLegacy()) || structuredClone(EMPTY);
      const { error: e2 } = await sb.from("site_data").upsert({ id: "main", data: d });
      if (e2) throw new Error(e2.message);
    }
    const oldWorld = !d.world || d.world.v !== window.WORLD_DEFAULT.v;
    d = App.normalize(d);
    // 쭌식이 처음 들어오면 ARCH 세계관 기본 내용을 저장
    if (oldWorld && App.role === "owner") {
      const { error: e3 } = await sb.from("site_data").upsert({ id: "main", data: d });
      if (e3) console.warn(e3.message);
    }
    await App.resolveMedia(imagePaths(d));
    App.data = d;
  }

  // ---------- 화면 ----------
  // ARCH 보안 접속 터미널: 틀(배경·엠블럼·상단바)은 한 번만 그리고 가운데 내용만 바꿈
  const ECG = "M0 40 H30 Q36 30 42 40 H52 L56 46 L62 6 L68 70 L74 40 H84 Q96 24 108 40 H140 H170 Q176 30 182 40 H192 L196 46 L202 6 L208 70 L214 40 H224 Q236 24 248 40 H280";
  const NODE = `NODE-${String(Math.floor(Math.random() * 900) + 100)}`;
  let ticker = null;

  function frame() {
    document.body.classList.add("locked");
    gate.hidden = false;
    gate.classList.remove("leaving");
    if (gate.querySelector(".sec-content")) return gate.querySelector(".sec-content");
    const crest = App.emblem ? App.emblem(window.WORLD_DEFAULT?.elements || []) : "";
    gate.innerHTML = `<div class="sec-bg"></div><div class="sec-scan"></div>
      <header class="sec-top">
        <span><i class="sec-dot"></i>ARCH // SECURE ACCESS ${NODE}</span>
        <span class="sec-clock"></span>
      </header>
      <div class="gate-box sec-box">
        <div class="sec-crest">${crest}</div>
        <p class="sec-kicker">RESTRICTED ACCESS</p>
        <h1 class="sec-title">ARCH</h1>
        <p class="sec-sub">AUTHORIZED PERSONNEL ONLY</p>
        <div class="sec-content"></div>
      </div>
      <footer class="sec-foot">ENCRYPTED CHANNEL · AES-256 · ALL ACCESS IS MONITORED AND LOGGED</footer>`;
    const tick = () => {
      if (gate.hidden) return clearInterval(ticker);
      const c = gate.querySelector(".sec-clock");
      if (c) c.textContent = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
      const bpm = gate.querySelector(".sec-bpm");
      if (bpm) bpm.textContent = 68 + Math.floor(Math.random() * 9);
    };
    clearInterval(ticker);
    ticker = setInterval(tick, 1000);
    tick();
    return gate.querySelector(".sec-content");
  }

  // 불러오는 동안: 접속 로그 + 심전도(생체 신호) 모니터
  function showLoading() {
    const box = frame();
    if (box.querySelector(".sec-loading")) return;
    const log = [["SECURE CHANNEL", "OK"], ["AGENT CREDENTIALS", "VERIFIED"], ["BIOMETRIC SIGNATURE", "MATCH"], ["DECRYPTING ARCHIVE", "…"]];
    box.innerHTML = `<div class="sec-loading">
      <div class="sec-log">${log.map(([k, v], i) => `<p style="--i:${i}"><span>&gt; ${k}</span><b>${v}</b></p>`).join("")}</div>
      <div class="ecg">
        <svg viewBox="0 0 280 80" preserveAspectRatio="none" aria-hidden="true">
          <path d="${ECG}" class="ecg-ghost"/>
          <path d="${ECG}" class="ecg-line" pathLength="1"/>
        </svg>
        <i class="ecg-dot" style="offset-path: path('${ECG}')"></i>
      </div>
      <p class="sec-vitals"><span>VITAL SIGN MONITOR</span><span><b class="sec-bpm">72</b> BPM</span></p>
    </div>`;
  }

  function showGate(html) {
    frame().innerHTML = html;
  }

  // 접속 성공: ACCESS GRANTED 를 잠깐 보여주고 화면이 열림
  async function granted() {
    showGate(`<div class="sec-granted">
      <p class="sec-granted-k">IDENTITY CONFIRMED</p>
      <p class="sec-granted-t">ACCESS GRANTED</p>
      <p class="sec-granted-s">WELCOME, ${esc(nickname() || ROLE_NAMES[App.role] || App.role)}</p>
      ${nickname() ? `<p class="sec-granted-c">CLEARANCE · ${esc(ROLE_NAMES[App.role] || App.role)}</p>` : ""}
    </div>`);
    gate.classList.add("ok");
    await new Promise((r) => setTimeout(r, 1100));
    gate.classList.add("leaving");
    await new Promise((r) => setTimeout(r, 450));
  }

  function authForm(mode = "login", msg = "") {
    const signup = mode === "signup";
    showGate(`
      <div class="gate-tabs">
        <button type="button" class="${signup ? "" : "on"}" data-mode="login"><b>ACCESS</b>로그인</button>
        <button type="button" class="${signup ? "on" : ""}" data-mode="signup"><b>ENLIST</b>회원가입</button>
      </div>
      <form id="auth-form" class="gate-form">
        <label class="sec-field"><span>AGENT ID</span><input type="email" name="email" placeholder="이메일" autocomplete="email" required></label>
        <label class="sec-field"><span>PASSCODE</span><input type="password" name="password" placeholder="비밀번호 (6자 이상)" autocomplete="${signup ? "new-password" : "current-password"}" minlength="6" required></label>
        ${signup ? `<label class="sec-field"><span>CODENAME</span><input type="text" name="nick" placeholder="닉네임 (선택 · 나중에 바꿀 수 있어요)" maxlength="20" autocomplete="nickname"></label>` : ""}
        ${signup ? `<label class="sec-field"><span>CLEARANCE KEY</span><input type="text" name="code" placeholder="초대 코드" autocomplete="off" required></label>` : ""}
        <p class="gate-msg">${msg ? `ACCESS DENIED — ${esc(msg)}` : ""}</p>
        <button type="submit" class="sec-btn">${signup ? "REQUEST CLEARANCE" : "AUTHENTICATE"} <span>›</span></button>
      </form>`);
    gate.querySelectorAll("[data-mode]").forEach((b) => (b.onclick = () => authForm(b.dataset.mode)));
    const form = document.getElementById("auth-form");
    form.onsubmit = async (e) => {
      e.preventDefault();
      form.classList.add("busy");
      const email = form.email.value.trim();
      const password = form.password.value;
      try {
        if (signup) {
          const nick = form.nick.value.trim();
          const { data, error } = await sb.auth.signUp({ email, password, options: { data: nick ? { nickname: nick } : {} } });
          if (error) throw error;
          if (!data.session) {
            // 이미 가입한 이메일이거나 이메일 인증이 켜져 있는 경우: 바로 로그인 시도
            const { error: e2 } = await sb.auth.signInWithPassword({ email, password });
            if (e2) throw e2;
            if (nick) await sb.auth.updateUser({ data: { nickname: nick } });
          }
          try {
            await join(form.code.value.trim());
          } catch (err) {
            // 계정은 만들어졌으니 코드만 다시 입력받음
            return codeForm(friendly(err));
          }
        } else {
          const { error } = await sb.auth.signInWithPassword({ email, password });
          if (error) throw error;
        }
        await enter();
      } catch (err) {
        authForm(mode, friendly(err));
      }
    };
  }

  // 로그인은 했지만 아직 회원이 아닌 경우 (초대 코드가 틀렸던 경우 등)
  function codeForm(msg = "") {
    showGate(`
      <p class="gate-desc">CLEARANCE REQUIRED — 초대 코드를 입력하면 들어갈 수 있어요.</p>
      <form id="code-form" class="gate-form">
        <label class="sec-field"><span>CLEARANCE KEY</span><input type="text" name="code" placeholder="초대 코드" autocomplete="off" required></label>
        <p class="gate-msg">${msg ? `ACCESS DENIED — ${esc(msg)}` : ""}</p>
        <button type="submit" class="sec-btn">VERIFY <span>›</span></button>
        <button type="button" class="gate-link" id="gate-logout">다른 계정으로 로그인</button>
      </form>`);
    document.getElementById("gate-logout").onclick = logout;
    const form = document.getElementById("code-form");
    form.onsubmit = async (e) => {
      e.preventDefault();
      form.classList.add("busy");
      try {
        await join(form.code.value.trim());
        await enter();
      } catch (err) {
        codeForm(friendly(err));
      }
    };
  }

  async function join(code) {
    const { error } = await sb.rpc("join_with_code", { code });
    if (error) throw error;
  }

  function friendly(err) {
    const m = err?.message || String(err);
    if (/invalid invite code/i.test(m)) return "초대 코드가 맞지 않아요.";
    if (/invalid login credentials/i.test(m)) return "이메일 또는 비밀번호가 맞지 않아요.";
    if (/already registered/i.test(m)) return "이미 가입된 이메일이에요. 로그인해 주세요.";
    if (/email not confirmed/i.test(m)) return "이메일 인증이 안 된 계정이에요. (Supabase 에서 Confirm email 을 끄고 계정을 지운 뒤 다시 가입해 주세요)";
    if (/only the owner/i.test(m)) return "사이트 정보는 쭌식만 수정할 수 있어요.";
    if (/password/i.test(m) && /6/.test(m)) return "비밀번호는 6자 이상이어야 해요.";
    return m;
  }

  async function enter() {
    const { data: session } = await sb.auth.getSession();
    if (!session.session) return authForm();
    App.user = session.session.user;
    const { data: role, error } = await sb.rpc("my_role");
    if (error) return authForm("login", friendly(error));
    if (!role) return codeForm();
    App.role = role;
    App.rank = RANKS[role] || 0;
    document.body.classList.toggle("owner", role === "owner");
    document.body.classList.toggle("can-edit", App.rank >= 3);
    document.getElementById("grade").textContent = ROLE_NAMES[role] || role;
    paintNick();
    showLoading();
    try {
      await loadData();
    } catch (err) {
      return showGate(`<p class="gate-msg">CONNECTION FAILED — 불러오지 못했어요: ${esc(err.message)}</p>`);
    }
    await granted();
    gate.hidden = true;
    gate.classList.remove("ok", "leaving");
    gate.innerHTML = "";
    document.body.classList.remove("locked");
    App.render();
    document.dispatchEvent(new CustomEvent("app:ready"));
  }

  // 다른 탭에서 바뀐 내용 반영: 이 탭으로 돌아오면 최신 데이터를 다시 불러옴 (편집 창이 열려 있으면 건너뜀)
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible" || !App.data || !document.getElementById("modal").hidden) return;
    try {
      await loadData();
      App.render();
    } catch {}
  });

  async function logout() {
    await sb.auth.signOut();
    location.reload();
  }

  // ---------- 닉네임 (각자 자기 계정 정보에 저장) ----------
  function nickname() {
    return (App.user?.user_metadata?.nickname || "").trim();
  }
  function paintNick() {
    const b = document.getElementById("nick-btn");
    if (b) b.textContent = nickname() || "닉네임 설정";
  }
  function openNick() {
    App.openModal(`<form class="form" id="nick-form">
      <h2>CODENAME</h2>
      <p class="desc">접속 화면의 WELCOME 에 보일 닉네임이에요. 언제든 바꿀 수 있어요.</p>
      <div class="field"><label>닉네임</label><input type="text" name="nick" maxlength="20" value="${esc(nickname())}" placeholder="비워두면 등급 이름으로 보여요"></div>
      <div class="form-actions">
        <button type="button" class="pill-btn" data-close>Cancel</button>
        <button type="submit" class="pill-btn dark">Save</button>
      </div>
    </form>`);
    const form = document.getElementById("nick-form");
    form.querySelector("[data-close]").onclick = App.closeModal;
    form.nick.focus();
    form.onsubmit = async (e) => {
      e.preventDefault();
      form.classList.add("busy");
      const { data, error } = await sb.auth.updateUser({ data: { nickname: form.nick.value.trim() } });
      if (error) {
        form.classList.remove("busy");
        return alert(`저장하지 못했어요: ${error.message}`);
      }
      App.user = data.user;
      paintNick();
      App.closeModal();
      App.toast("닉네임을 바꿨어요");
    };
  }
  document.getElementById("nick-btn").addEventListener("click", openNick);

  // ---------- 회원 관리 (쭌식 전용) ----------
  async function openMembers() {
    const { data, error } = await sb.rpc("list_members");
    if (error) return alert(error.message);
    const opts = (role) => ["prima", "vanguard", "acolyte"]
      .map((r) => `<option value="${r}" ${r === role ? "selected" : ""}>${ROLE_NAMES[r]}</option>`).join("");
    App.openModal(`<div class="form">
      <h2>MEMBERS</h2>
      <p class="desc">등급을 바꾸면 바로 저장돼요. 바뀐 등급은 그 회원이 새로고침하면 적용돼요.</p>
      <div class="member-list">${(data || []).map((m) => `<div class="member-row">
        <span class="member-email">${esc(m.email || m.user_id)}</span>
        ${m.role === "owner"
          ? `<span class="pill">${ROLE_NAMES.owner}</span>`
          : `<select data-member="${m.user_id}">${opts(m.role)}</select>
             <button type="button" class="bgm-del" data-kick="${m.user_id}" aria-label="내보내기" title="내보내기">✕</button>`}
      </div>`).join("")}</div>
    </div>`);
  }

  document.addEventListener("change", async (e) => {
    const sel = e.target.closest("[data-member]");
    if (!sel) return;
    const { error } = await sb.rpc("set_member_role", { target: sel.dataset.member, new_role: sel.value });
    if (error) return alert(error.message);
    App.toast(`${ROLE_NAMES[sel.value]} 으로 바꿨어요`);
  });
  document.addEventListener("click", async (e) => {
    const k = e.target.closest("[data-kick]");
    if (!k || !confirm("이 회원을 내보낼까요? (다시 들어오려면 초대 코드가 필요해요)")) return;
    const { error } = await sb.rpc("remove_member", { target: k.dataset.kick });
    if (error) return alert(error.message);
    openMembers();
  });
  document.getElementById("members-btn").addEventListener("click", openMembers);

  document.getElementById("logout-btn").addEventListener("click", () => {
    if (confirm("로그아웃할까요?")) logout();
  });

  showLoading();
  enter();
})();
