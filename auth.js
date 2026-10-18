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
      out.push(p.image);
      for (const v of p.variants || []) out.push(v.image);
    }
    for (const g of d.gallery || []) out.push(g.image);
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
    d = App.normalize(d);
    await App.resolveMedia(imagePaths(d));
    App.data = d;
  }

  // ---------- 화면 ----------
  function showGate(html) {
    document.body.classList.add("locked");
    gate.hidden = false;
    gate.innerHTML = `<div class="gate-box"><div class="gate-logo">ZZON</div>${html}</div>`;
  }

  function authForm(mode = "login", msg = "") {
    const signup = mode === "signup";
    showGate(`
      <div class="gate-tabs">
        <button type="button" class="${signup ? "" : "on"}" data-mode="login">로그인</button>
        <button type="button" class="${signup ? "on" : ""}" data-mode="signup">회원가입</button>
      </div>
      <form id="auth-form" class="gate-form">
        <input type="email" name="email" placeholder="이메일" autocomplete="email" required>
        <input type="password" name="password" placeholder="비밀번호 (6자 이상)" autocomplete="${signup ? "new-password" : "current-password"}" minlength="6" required>
        ${signup ? `<input type="text" name="code" placeholder="초대 코드" autocomplete="off" required>` : ""}
        <p class="gate-msg">${esc(msg)}</p>
        <button type="submit" class="pill-btn dark">${signup ? "가입하기" : "로그인"}</button>
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
          const { data, error } = await sb.auth.signUp({ email, password });
          if (error) throw error;
          if (!data.session) {
            // 이미 가입한 이메일이거나 이메일 인증이 켜져 있는 경우: 바로 로그인 시도
            const { error: e2 } = await sb.auth.signInWithPassword({ email, password });
            if (e2) throw e2;
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
      <p class="gate-desc">초대 코드를 입력하면 들어갈 수 있어요.</p>
      <form id="code-form" class="gate-form">
        <input type="text" name="code" placeholder="초대 코드" autocomplete="off" required>
        <p class="gate-msg">${esc(msg)}</p>
        <button type="submit" class="pill-btn dark">확인</button>
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
    if (/only the owner/i.test(m)) return "World 는 쭌식만 수정할 수 있어요.";
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
    showGate(`<p class="gate-desc">불러오는 중…</p>`);
    try {
      await loadData();
    } catch (err) {
      return showGate(`<p class="gate-desc">불러오지 못했어요: ${esc(err.message)}</p>`);
    }
    gate.hidden = true;
    gate.innerHTML = "";
    document.body.classList.remove("locked");
    App.render();
    document.dispatchEvent(new CustomEvent("app:ready"));
  }

  async function logout() {
    await sb.auth.signOut();
    location.reload();
  }

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

  enter();
})();
