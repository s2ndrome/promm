// 토큰이 있는 사람만 쓰는 편집 기능.
// GitHub API 로 data/site.json 과 이미지를 저장소에 직접 커밋합니다.
(function () {
  const OWNER = "s2ndrome";
  const REPO = "promm";
  const DATA_PATH = "data/site.json";
  const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
  const TOKEN_KEY = "promm_token";

  const App = window.App;
  const esc = App.esc;
  let token = "";
  let branch = "";
  let dataSha = "";

  // ---------- 편집 폼 정의 ----------
  const PERSON = (key, label) => [
    { key: `${key}.name`, label: `${label} 이름`, type: "text" },
    { key: `${key}.prompt`, label: `${label} 프롬프트`, type: "textarea" },
  ];
  const SCHEMAS = {
    pairs: {
      title: "Pair",
      fields: [
        { key: "title", label: "페어 이름", type: "text" },
        { key: "image", label: "페어 사진", type: "image", dir: "img/pairs" },
        { key: "male.name", label: "남캐 이름", type: "text" },
        { key: "female.name", label: "여캐 이름", type: "text" },
        { key: "variants", label: "의상별 프롬프트", type: "variants", dir: "img/pairs",
          hint: "제복 / 사복 처럼 의상마다 프롬프트를 따로 적어요. 의상 사진은 선택이에요 (없으면 페어 사진이 보여요)." },
      ],
      blank: () => ({ id: `p${Date.now()}`, title: "", image: "", male: { name: "" }, female: { name: "" }, variants: [{ label: "제복", image: "", male: "", female: "" }] }),
    },
    gallery: {
      title: "Gallery",
      fields: [
        { key: "image", label: "사진", type: "image", dir: "img/gallery" },
        { key: "caption", label: "설명 (선택)", type: "text" },
        { key: "pair", label: "어떤 페어의 사진인가요?", type: "pair", hint: "페어를 고르면 그 페어의 프롬프트가 팝업에 떠요." },
        ...PERSON("male", "남캐"),
        ...PERSON("female", "여캐"),
      ],
      hint: "이 사진만의 프롬프트가 따로 있으면 아래에 적어주세요. 비워두면 선택한 페어의 프롬프트가 쓰여요.",
      blank: () => ({ id: `g${Date.now()}`, image: "", caption: "", pair: "" }),
    },
    "world.sections": {
      title: "Story",
      fields: [
        { key: "icon", label: "아이콘 (이모지, 선택)", type: "text" },
        { key: "title", label: "제목", type: "text" },
        { key: "body", label: "내용", type: "textarea" },
      ],
      blank: () => ({ icon: "", title: "", body: "" }),
    },
    "world.factions": {
      title: "Faction",
      fields: [
        { key: "name", label: "세력 이름", type: "text" },
        { key: "color", label: "색", type: "color" },
        { key: "desc", label: "설명", type: "textarea" },
        { key: "members", label: "소속 캐릭터 (쉼표로 구분)", type: "list" },
      ],
      blank: () => ({ name: "", color: "#c9a4b4", desc: "", members: [] }),
    },
    "world.relations": {
      title: "Relation",
      fields: [
        { key: "from", label: "캐릭터 A", type: "text" },
        { key: "label", label: "관계 (예: 연인, 라이벌)", type: "text" },
        { key: "to", label: "캐릭터 B", type: "text" },
      ],
      blank: () => ({ from: "", label: "", to: "" }),
    },
    // 목록이 아니라 객체 하나를 수정하는 폼
    world: { title: "World", single: true, fields: [{ key: "intro", label: "세계관 소개", type: "textarea" }] },
    site: {
      title: "Site",
      single: true,
      fields: [
        { key: "title", label: "로고 글자", type: "text" },
      ],
    },
  };

  // ---------- helpers ----------
  const getPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  function setPath(obj, path, val) {
    const keys = path.split(".");
    const last = keys.pop();
    const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
    target[last] = val;
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const b64encode = (str) => {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  };
  const b64decode = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

  async function gh(path, opts = {}) {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", ...(opts.headers || {}) },
    });
    if (!res.ok) {
      const err = new Error(`GitHub ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }

  async function putFile(path, contentB64, message, sha) {
    const body = { message, content: contentB64, branch };
    if (sha) body.sha = sha;
    return gh(`/contents/${path.split("/").map(encodeURIComponent).join("/")}`, { method: "PUT", body: JSON.stringify(body) });
  }

  // 큰 사진은 줄이고 webp 로 변환 (투명 배경 유지)
  function imageToB64(file, max = 1600) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        c.toBlob((blob) => {
          if (!blob) return reject(new Error("이미지 변환 실패"));
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result.split(",")[1]);
          fr.readAsDataURL(blob);
        }, "image/webp", 0.92);
      };
      img.onerror = () => reject(new Error("이미지를 읽을 수 없어요"));
      img.src = URL.createObjectURL(file);
    });
  }

  // ---------- data load / save ----------
  async function loadFresh() {
    const f = await gh(`/contents/${DATA_PATH}?ref=${encodeURIComponent(branch)}`);
    dataSha = f.sha;
    App.data = App.normalize(JSON.parse(b64decode(f.content)));
  }

  async function saveData(next, message) {
    const content = b64encode(JSON.stringify(next, null, 2) + "\n");
    try {
      const r = await putFile(DATA_PATH, content, message, dataSha);
      dataSha = r.content.sha;
    } catch (e) {
      if (e.status !== 409 && e.status !== 422) throw e;
      // 다른 곳에서 먼저 저장된 경우: 최신 sha 로 한 번 더 시도
      const f = await gh(`/contents/${DATA_PATH}?ref=${encodeURIComponent(branch)}`);
      const r = await putFile(DATA_PATH, content, message, f.sha);
      dataSha = r.content.sha;
    }
    App.data = next;
    App.render();
    App.toast("저장했어요 · 사이트 반영까지 1~2분 걸려요", 2600);
  }

  // ---------- login ----------
  function loginForm() {
    App.openModal(`<form class="form" id="login-form">
      <h2>ADMIN</h2>
      <p class="desc">GitHub 토큰이 있으면 이 페이지에서 바로 사진과 글을 추가·수정할 수 있어요.</p>
      <div class="field">
        <label>GitHub 토큰</label>
        <input type="password" name="token" placeholder="github_pat_..." autocomplete="off" required>
        <p class="hint">토큰은 이 브라우저에만 저장돼요.</p>
      </div>
      <details>
        <summary style="cursor:pointer;font-size:12px;color:#666">토큰 만드는 법</summary>
        <ol>
          <li><code>github.com/settings/personal-access-tokens/new</code> 접속</li>
          <li>Repository access → <b>Only select repositories</b> → <code>${OWNER}/${REPO}</code></li>
          <li>Permissions → Repository permissions → <b>Contents: Read and write</b><br>(선택) <b>Pages: Read-only</b></li>
          <li>Generate token → 생성된 <code>github_pat_...</code> 복사해서 위에 붙여넣기</li>
        </ol>
      </details>
      <div class="form-actions">
        <button type="button" class="pill-btn" data-close>Cancel</button>
        <button type="submit" class="pill-btn dark">Login</button>
      </div>
    </form>`);
    const form = document.getElementById("login-form");
    form.querySelector("[data-close]").onclick = App.closeModal;
    form.onsubmit = async (e) => {
      e.preventDefault();
      form.classList.add("busy");
      try {
        await login(form.token.value.trim());
        App.closeModal();
        App.toast("편집 모드가 켜졌어요");
      } catch (err) {
        form.classList.remove("busy");
        alert(err.message);
      }
    };
  }

  async function login(t) {
    token = t;
    let repo;
    try {
      repo = await gh("");
    } catch (e) {
      token = "";
      throw new Error(e.status === 401 ? "토큰이 올바르지 않아요." : "저장소에 접근할 수 없어요. 토큰 권한을 확인해 주세요.");
    }
    if (!repo.permissions?.push) {
      token = "";
      throw new Error("이 토큰에는 쓰기 권한(Contents: Read and write)이 없어요.");
    }
    // 사이트가 실제로 배포되는 브랜치에 저장
    branch = repo.default_branch;
    try {
      const pages = await gh("/pages");
      if (pages?.source?.branch) branch = pages.source.branch;
    } catch {}
    await loadFresh();
    try { localStorage.setItem(TOKEN_KEY, token); } catch {}
    App.admin = true;
    document.body.classList.add("admin");
    App.render();
  }

  function logout() {
    if (!confirm("편집 모드를 끌까요? (이 브라우저에 저장된 토큰이 지워져요)")) return;
    token = "";
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
    App.admin = false;
    document.body.classList.remove("admin");
    App.render();
  }

  document.getElementById("admin-btn").addEventListener("click", () => (App.admin ? logout() : loginForm()));

  // ---------- edit form ----------
  function variantHtml(v = {}) {
    return `<div class="variant-edit" data-image="${esc(v.image || "")}">
      <div class="variant-top">
        <input type="text" class="v-label" placeholder="의상 이름 (예: 제복, 사복)" value="${esc(v.label)}">
        <button type="button" class="pill-btn v-remove">삭제</button>
      </div>
      <span class="v-cap">남캐 프롬프트</span>
      <textarea class="v-male">${esc(v.male)}</textarea>
      <span class="v-cap">여캐 프롬프트</span>
      <textarea class="v-female">${esc(v.female)}</textarea>
      <div class="img-field">
        <div class="preview" style="${v.image ? `background-image:url('${esc(v.image)}')` : ""}"></div>
        <div><input type="file" class="v-file" accept="image/*"><p class="hint">이 의상 사진 (선택)</p></div>
      </div>
    </div>`;
  }

  function fieldHtml(f, val) {
    const name = `f:${f.key}`;
    if (f.type === "variants")
      return `<div class="variant-list">${(val || []).map(variantHtml).join("")}</div>
        <button type="button" class="pill-btn v-add">+ 의상 추가</button>`;
    if (f.type === "textarea")
      return `<textarea name="${name}">${esc(val)}</textarea>`;
    if (f.type === "color")
      return `<input type="color" name="${name}" value="${esc(val || "#c9a4b4")}">`;
    if (f.type === "list")
      return `<input type="text" name="${name}" value="${esc((val || []).join(", "))}">`;
    if (f.type === "pair") {
      const opts = App.data.pairs.map((p, i) => `<option value="${esc(p.id)}" ${p.id === val ? "selected" : ""}>#${String(i + 1).padStart(2, "0")} ${esc(p.title)}</option>`).join("");
      return `<select name="${name}"><option value="">선택 안 함</option>${opts}</select>`;
    }
    if (f.type === "image")
      return `<div class="img-field">
        <div class="preview" style="${val ? `background-image:url('${esc(val)}')` : ""}"></div>
        <div><input type="file" name="${name}" accept="image/*"><p class="hint">${val ? "새 파일을 고르면 교체돼요." : "사진 파일을 골라주세요."}</p></div>
      </div>`;
    return `<input type="text" name="${name}" value="${esc(val)}">`;
  }

  function openEditor(col, index) {
    const schema = SCHEMAS[col];
    const isNew = !schema.single && index == null;
    const item = schema.single ? clone(getPath(App.data, col) || {}) : isNew ? schema.blank() : clone(getPath(App.data, col)[index]);

    const fields = schema.fields;
    const parts = fields.map(
      (f) => `<div class="field"><label>${esc(f.label)}</label>${fieldHtml(f, getPath(item, f.key))}${f.hint ? `<p class="hint">${esc(f.hint)}</p>` : ""}</div>`
    );

    App.openModal(`<form class="form" id="edit-form">
      <h2>${isNew ? "ADD" : "EDIT"} ${esc(schema.title).toUpperCase()}</h2>
      <p class="desc">${esc(schema.hint || "저장하면 저장소에 바로 커밋돼요.")}</p>
      ${parts.join("")}
      <div class="form-actions">
        <button type="button" class="pill-btn" data-close>Cancel</button>
        <button type="submit" class="pill-btn dark">Save</button>
      </div>
    </form>`);

    const form = document.getElementById("edit-form");
    form.querySelector("[data-close]").onclick = App.closeModal;

    // 사진 미리보기
    form.addEventListener("change", (e) => {
      const inp = e.target;
      if (inp.type !== "file" || !inp.files[0]) return;
      inp.closest(".img-field").querySelector(".preview").style.backgroundImage = `url('${URL.createObjectURL(inp.files[0])}')`;
    });
    // 의상 추가 / 삭제
    form.addEventListener("click", (e) => {
      if (e.target.closest(".v-add")) form.querySelector(".variant-list").insertAdjacentHTML("beforeend", variantHtml());
      const rm = e.target.closest(".v-remove");
      if (rm && confirm("이 의상을 지울까요?")) rm.closest(".variant-edit").remove();
    });

    form.onsubmit = async (e) => {
      e.preventDefault();
      form.classList.add("busy");
      try {
        for (const f of fields) {
          if (f.type === "variants") {
            const list = [];
            for (const box of form.querySelectorAll(".variant-edit")) {
              const v = {
                label: box.querySelector(".v-label").value.trim(),
                image: box.dataset.image || "",
                male: box.querySelector(".v-male").value,
                female: box.querySelector(".v-female").value,
              };
              const file = box.querySelector(".v-file").files[0];
              if (file) {
                const path = `${f.dir}/${Date.now()}.webp`;
                await putFile(path, await imageToB64(file), `Upload image: ${path}`);
                v.image = path;
              }
              if (v.label || v.male || v.female || v.image) list.push(v);
            }
            setPath(item, f.key, list);
            continue;
          }
          const el = form.elements[`f:${f.key}`];
          if (f.type === "image") {
            const file = el.files[0];
            if (file) {
              const path = `${f.dir}/${Date.now()}.webp`;
              await putFile(path, await imageToB64(file), `Upload image: ${path}`);
              setPath(item, f.key, path);
            } else if (isNew && !getPath(item, f.key) && col === "gallery") {
              throw new Error("사진 파일을 골라주세요.");
            }
          } else if (f.type === "list") {
            setPath(item, f.key, el.value.split(",").map((s) => s.trim()).filter(Boolean));
          } else {
            setPath(item, f.key, el.value);
          }
        }
        // 갤러리: 비어 있는 개별 프롬프트는 지워서 페어 프롬프트를 쓰게 함
        if (col === "gallery") {
          for (const k of ["male", "female"]) if (item[k] && !item[k].name && !item[k].prompt) delete item[k];
        }

        const next = clone(App.data);
        if (schema.single) setPath(next, col, item);
        else {
          const list = getPath(next, col);
          isNew ? list.push(item) : (list[index] = item);
        }
        await saveData(next, `${isNew ? "Add" : "Update"} ${col}: ${item.title || item.name || item.caption || item.from || ""}`.trim());
        App.closeModal();
      } catch (err) {
        form.classList.remove("busy");
        alert(`저장하지 못했어요: ${err.message}`);
      }
    };
  }

  // ---------- admin buttons ----------
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn || !App.admin) return;
    e.preventDefault();
    e.stopPropagation();
    const { act, col } = btn.dataset;
    const i = btn.dataset.i == null ? null : Number(btn.dataset.i);

    if (act === "add") return openEditor(col, SCHEMAS[col].single ? 0 : null);
    if (act === "edit") return openEditor(col, i);

    const next = clone(App.data);
    const list = getPath(next, col);
    if (act === "del") {
      if (!confirm("정말 삭제할까요?")) return;
      list.splice(i, 1);
    } else if (act === "move") {
      const j = i + Number(btn.dataset.dir);
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
    }
    try {
      await saveData(next, `${act === "del" ? "Delete" : "Reorder"} ${col}`);
    } catch (err) {
      alert(`저장하지 못했어요: ${err.message}`);
    }
  });

  // ---------- 자동 로그인 ----------
  let saved = "";
  try { saved = localStorage.getItem(TOKEN_KEY) || ""; } catch {}
  if (saved) {
    App.ready.then(() => login(saved)).catch(() => {
      try { localStorage.removeItem(TOKEN_KEY); } catch {}
    });
  }
})();
