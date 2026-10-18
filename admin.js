// 회원용 편집 기능. 내용은 Supabase(site_data 테이블)에, 사진은 media 저장소에 저장합니다.
(function () {
  const App = window.App;
  const esc = App.esc;

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
        { key: "tag", label: "태그 (예: ARCH, 月とナイフ, calltaku)", type: "text", hint: "카드 왼쪽 위 작은 태그에 보여요. 비워두면 안 보여요." },
        { key: "image", label: "페어 사진", type: "image" },
        { key: "male.name", label: "남캐 이름", type: "text" },
        { key: "male.base", label: "남캐 외형 프롬프트 (첫 단락)", type: "textarea" },
        { key: "female.name", label: "여캐 이름", type: "text" },
        { key: "female.base", label: "여캐 외형 프롬프트 (첫 단락)", type: "textarea" },
        { key: "variants", label: "의상 (둘째 단락)", type: "variants",
          hint: "의상 칩을 누르면 둘째 단락에 나와요. 상의/하의/신발을 나눠 적으면 '상반신만', '신발 없이' 체크로 빼고 복사할 수 있어요. 의상 사진은 선택이에요." },
      ],
      blank: () => ({
        id: `p${Date.now()}`, title: "", tag: "", image: "",
        male: { name: "", base: "" }, female: { name: "", base: "" },
        variants: [{ label: "제복", sub: "", image: "", male: { top: "", bottom: "", shoes: "" }, female: { top: "", bottom: "", shoes: "" } }],
      }),
    },
    gallery: {
      title: "Gallery",
      fields: [
        { key: "image", label: "사진", type: "image" },
        { key: "section", label: "구분 (예: 웨딩, 제복)", type: "section", hint: "같은 구분끼리 한 줄로 묶이고 구분선으로 나뉘어요." },
        { key: "caption", label: "설명 (선택)", type: "text" },
        { key: "pair", label: "어떤 페어의 사진인가요?", type: "pair", hint: "페어를 고르면 그 페어의 프롬프트가 팝업에 떠요." },
        ...PERSON("male", "남캐"),
        ...PERSON("female", "여캐"),
      ],
      hint: "이 사진만의 프롬프트가 따로 있으면 아래에 적어주세요. 비워두면 선택한 페어의 프롬프트가 쓰여요.",
      blank: () => ({ id: `g${Date.now()}`, image: "", section: "", caption: "", pair: "" }),
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

  // 큰 사진은 줄이고 webp 로 변환 (투명 배경 유지)
  function imageToBlob(file, max = 1600) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        c.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("이미지 변환 실패"))), "image/webp", 0.92);
      };
      img.onerror = () => reject(new Error("이미지를 읽을 수 없어요"));
      img.src = URL.createObjectURL(file);
    });
  }

  async function uploadImage(file) {
    const path = `images/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`;
    await App.uploadMedia(path, await imageToBlob(file), "image/webp");
    return path;
  }

  async function saveData(next) {
    const { error } = await App.sb.from("site_data").upsert({ id: "main", data: next, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    App.data = next;
    App.render();
    App.toast("저장했어요");
  }

  // ---------- 편집 모드 켜기/끄기 ----------
  document.getElementById("edit-btn").addEventListener("click", () => {
    App.admin = !App.admin;
    document.body.classList.toggle("admin", App.admin);
    App.render();
  });

  // ---------- edit form ----------
  const PARTS = [["top", "상의"], ["bottom", "하의"], ["shoes", "신발"]];
  function variantHtml(v = {}) {
    const person = (k, label) => `<span class="v-cap">${label}</span>
      ${PARTS.map(([part, name]) => `<div class="v-part"><span>${name}</span>
        <input type="text" class="v-${k}-${part}" value="${esc(v[k]?.[part])}"></div>`).join("")}`;
    return `<div class="variant-edit" data-image="${esc(v.image || "")}">
      <div class="variant-top">
        <input type="text" class="v-label" placeholder="의상 이름 (예: 사복)" value="${esc(v.label)}">
        <input type="text" class="v-sub" placeholder="보조 문구 (예: 여름 ver)" value="${esc(v.sub)}">
        <button type="button" class="pill-btn v-remove">삭제</button>
      </div>
      ${person("male", "남캐 의상")}
      ${person("female", "여캐 의상")}
      <div class="img-field">
        <div class="preview" style="${v.image ? `background-image:url('${esc(App.mediaUrl(v.image))}')` : ""}"></div>
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
    if (f.type === "section") {
      const names = [...new Set(App.data.gallery.map((g) => (g.section || "").trim()).filter(Boolean))];
      return `<input type="text" name="${name}" value="${esc(val)}" list="section-list" autocomplete="off">
        <datalist id="section-list">${names.map((n) => `<option value="${esc(n)}">`).join("")}</datalist>`;
    }
    if (f.type === "pair") {
      const opts = App.data.pairs.map((p, i) => `<option value="${esc(p.id)}" ${p.id === val ? "selected" : ""}>#${String(i + 1).padStart(2, "0")} ${esc(p.title)}</option>`).join("");
      return `<select name="${name}"><option value="">선택 안 함</option>${opts}</select>`;
    }
    if (f.type === "image")
      return `<div class="img-field">
        <div class="preview" style="${val ? `background-image:url('${esc(App.mediaUrl(val))}')` : ""}"></div>
        <div><input type="file" name="${name}" accept="image/*"><p class="hint">${val ? "새 파일을 고르면 교체돼요." : "사진 파일을 골라주세요."}</p></div>
      </div>`;
    return `<input type="text" name="${name}" value="${esc(val)}">`;
  }

  function openEditor(col, index, preset = {}) {
    const schema = SCHEMAS[col];
    const isNew = !schema.single && index == null;
    const item = schema.single ? clone(getPath(App.data, col) || {}) : isNew ? { ...schema.blank(), ...preset } : clone(getPath(App.data, col)[index]);

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
                sub: box.querySelector(".v-sub").value.trim(),
                image: box.dataset.image || "",
              };
              for (const k of ["male", "female"])
                v[k] = Object.fromEntries(PARTS.map(([part]) => [part, box.querySelector(`.v-${k}-${part}`).value.trim()]));
              const file = box.querySelector(".v-file").files[0];
              if (file) v.image = await uploadImage(file);
              const hasText = ["male", "female"].some((k) => Object.values(v[k]).some(Boolean));
              if (v.label || v.image || hasText) list.push(v);
            }
            setPath(item, f.key, list);
            continue;
          }
          const el = form.elements[`f:${f.key}`];
          if (f.type === "image") {
            const file = el.files[0];
            if (file) {
              setPath(item, f.key, await uploadImage(file));
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
        await saveData(next);
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

    if (act === "add") return openEditor(col, SCHEMAS[col].single ? 0 : null, btn.dataset.section ? { section: btn.dataset.section } : {});
    if (act === "rename-section") {
      const from = btn.dataset.section;
      const to = prompt("새 구분 이름", from);
      if (to == null || to.trim() === from) return;
      const next = clone(App.data);
      next.gallery.forEach((g) => { if ((g.section || "").trim() === from) g.section = to.trim(); });
      try { await saveData(next); } catch (err) { alert(`저장하지 못했어요: ${err.message}`); }
      return;
    }
    if (act === "edit") return openEditor(col, i);

    const next = clone(App.data);
    const list = getPath(next, col);
    if (act === "del") {
      if (!confirm("정말 삭제할까요?")) return;
      list.splice(i, 1);
    } else if (act === "move") {
      let j = i + Number(btn.dataset.dir);
      // 갤러리는 같은 구분 안에서만 순서 이동
      if (col === "gallery") {
        const sec = (list[i].section || "").trim();
        while (j >= 0 && j < list.length && (list[j].section || "").trim() !== sec) j += Number(btn.dataset.dir);
      }
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
    }
    try {
      await saveData(next);
    } catch (err) {
      alert(`저장하지 못했어요: ${err.message}`);
    }
  });

})();
