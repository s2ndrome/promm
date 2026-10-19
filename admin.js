// 회원용 편집 기능. 내용은 Supabase(site_data 테이블)에, 사진은 media 저장소에 저장합니다.
(function () {
  const App = window.App;
  const esc = App.esc;

  // ---------- 편집 폼 정의 ----------
  const SCHEMAS = {
    pairs: {
      title: "Pair",
      fields: [
        { key: "title", label: "페어 이름", type: "text" },
        { key: "genre", label: "장르", type: "genre", hint: "비워두면 메인에 보여요. 장르를 고르면 메인 아래 그 장르 토글 안에 들어가요." },
        { key: "tag", label: "태그 (예: ARCH, 月とナイフ, calltaku)", type: "text", hint: "카드 왼쪽 위 작은 태그에 보여요. 비워두면 안 보여요." },
        { key: "image", label: "페어 사진", type: "image" },
        { key: "male.name", label: "남캐 이름", type: "text" },
        { key: "male.base", label: "남캐 외형 프롬프트 (첫 단락)", type: "textarea" },
        { key: "female.name", label: "여캐 이름", type: "text" },
        { key: "female.base", label: "여캐 외형 프롬프트 (첫 단락)", type: "textarea" },
        { key: "_h_info", label: "PAIR INFO", type: "heading" },
        { key: "info.intro", label: "페어 설명", type: "textarea" },
        { key: "_h_male", label: "남캐 프로필", type: "heading" },
        { key: "male.profile.photo", label: "증명사진", type: "image" },
        { key: "male.profile.photoPrompt", label: "공식 프롬프트 (PAIR INFO 에서 증명사진을 누르면 나와요)", type: "textarea" },
        { key: "male.profile.codename", label: "코드네임", type: "text" },
        { key: "male.profile.realname", label: "이름", type: "idrow", hint: "왼쪽 칸은 항목 이름이에요. 바꾸면 프로필 카드에 그대로 보여요." },
        { key: "male.profile.team", label: "소속", type: "idrow" },
        { key: "male.profile.grade", label: "등급", type: "idrow" },
        { key: "male.profile.element", label: "속성", type: "idrow" },
        { key: "male.profile.age", label: "나이", type: "idrow" },
        { key: "male.profile.personality", label: "성격", type: "textarea" },
        { key: "male.profile.secret", label: "비밀 설정", type: "textarea" },
        { key: "male.profile.tmi", label: "TMI", type: "textarea" },
        { key: "_h_female", label: "여캐 프로필", type: "heading" },
        { key: "female.profile.photo", label: "증명사진", type: "image" },
        { key: "female.profile.photoPrompt", label: "공식 프롬프트 (PAIR INFO 에서 증명사진을 누르면 나와요)", type: "textarea" },
        { key: "female.profile.codename", label: "코드네임", type: "text" },
        { key: "female.profile.realname", label: "이름", type: "idrow", hint: "왼쪽 칸은 항목 이름이에요. 바꾸면 프로필 카드에 그대로 보여요." },
        { key: "female.profile.team", label: "소속", type: "idrow" },
        { key: "female.profile.grade", label: "등급", type: "idrow" },
        { key: "female.profile.element", label: "속성", type: "idrow" },
        { key: "female.profile.age", label: "나이", type: "idrow" },
        { key: "female.profile.personality", label: "성격", type: "textarea" },
        { key: "female.profile.secret", label: "비밀 설정", type: "textarea" },
        { key: "female.profile.tmi", label: "TMI", type: "textarea" },
        { key: "variants", label: "의상 (둘째 단락)", type: "variants",
          hint: "의상 칩을 누르면 둘째 단락에 나와요. 상의/하의/신발을 나눠 적으면 '상반신만', '신발 없이' 체크로 빼고 복사할 수 있어요. 의상 사진은 선택이에요." },
      ],
      blank: () => ({
        id: `p${Date.now()}`, title: "", tag: "", image: "",
        male: { name: "", base: "" }, female: { name: "", base: "" },
        variants: [{ label: "제복", sub: "", image: "", male: { top: "", bottom: "", shoes: "" }, female: { top: "", bottom: "", shoes: "" } }],
      }),
    },
    girls: {
      title: "Only Girl",
      fields: [
        { key: "female.name", label: "캐릭터 이름", type: "text" },
        { key: "title", label: "부제 (선택)", type: "text" },
        { key: "tag", label: "태그 (선택)", type: "text", hint: "카드 왼쪽 위 작은 태그에 보여요." },
        { key: "image", label: "사진", type: "image" },
        { key: "female.base", label: "외형 프롬프트 (첫 단락)", type: "textarea" },
        { key: "_h_profile", label: "PROFILE", type: "heading" },
        { key: "info.intro", label: "캐릭터 설명", type: "textarea" },
        { key: "female.profile.photo", label: "증명사진", type: "image" },
        { key: "female.profile.photoPrompt", label: "공식 프롬프트 (PROFILE 에서 증명사진을 누르면 나와요)", type: "textarea" },
        { key: "female.profile.codename", label: "코드네임", type: "text" },
        { key: "female.profile.realname", label: "이름", type: "idrow", hint: "왼쪽 칸은 항목 이름이에요. 바꾸면 프로필 카드에 그대로 보여요." },
        { key: "female.profile.team", label: "소속", type: "idrow" },
        { key: "female.profile.grade", label: "등급", type: "idrow" },
        { key: "female.profile.element", label: "속성", type: "idrow" },
        { key: "female.profile.age", label: "나이", type: "idrow" },
        { key: "female.profile.personality", label: "성격", type: "textarea" },
        { key: "female.profile.secret", label: "비밀 설정", type: "textarea" },
        { key: "female.profile.tmi", label: "TMI", type: "textarea" },
        { key: "variants", label: "의상 (둘째 단락)", type: "variants", solo: true,
          hint: "의상 칩을 누르면 둘째 단락에 나와요. 상의/하의/신발을 나눠 적으면 '상반신만', '신발 없이' 체크로 빼고 복사할 수 있어요." },
      ],
      blank: () => ({
        id: `c${Date.now()}`, title: "", tag: "", image: "",
        female: { name: "", base: "" },
        variants: [{ label: "제복", sub: "", image: "", female: { top: "", bottom: "", shoes: "" } }],
      }),
    },
    gallery: {
      title: "Asset",
      fields: [
        { key: "image", label: "사진", type: "image" },
        { key: "section", label: "구분 (예: 웨딩, 제복)", type: "section", hint: "같은 구분끼리 한 줄로 묶이고 구분선으로 나뉘어요." },
        { key: "caption", label: "제목 (선택)", type: "text" },
        { key: "pairMode", label: "페어 프롬프트 사용", type: "checkbox", hint: "체크하면 A / B 프롬프트를 따로 적을 수 있어요." },
        { key: "prompt", label: "프롬프트", type: "textarea", hideIf: "pairMode" },
        { key: "promptA", label: "A 프롬프트", type: "textarea", showIf: "pairMode" },
        { key: "promptB", label: "B 프롬프트", type: "textarea", showIf: "pairMode" },
      ],
      blank: () => ({ id: `g${Date.now()}`, image: "", section: "", caption: "", pairMode: false, prompt: "", promptA: "", promptB: "" }),
    },
    genres: {
      title: "Genres", single: true,
      fields: [{ key: "list", label: "장르 (한 줄에 하나, 위에서부터 순서대로)", type: "lines", hint: "장르 이름을 바꾸면 그 장르의 페어도 같이 옮겨져요. 지운 장르의 페어는 메인으로 돌아와요." }],
    },
    links: {
      title: "Link",
      fields: [
        { key: "title", label: "이름", type: "text" },
        { key: "url", label: "주소 (https://...)", type: "text" },
        { key: "desc", label: "설명 (선택)", type: "text" },
        { key: "section", label: "구분 (선택)", type: "section", source: "links", hint: "같은 구분끼리 묶여요." },
      ],
      blank: () => ({ title: "", url: "", desc: "", section: "" }),
    },

    // ---------- ARCH World (쭌식 전용) ----------
    "world.hero": { title: "Cover", single: true, fields: [
      { key: "title", label: "타이틀", type: "text" },
      { key: "kicker", label: "작은 제목", type: "text" },
      { key: "ver", label: "버전 문구", type: "text" },
      { key: "quote", label: "인용문", type: "textarea" },
      { key: "intro", label: "소개", type: "textarea" },
    ] },
    "world.awakened": { title: "Awakened", fields: [
      { key: "title", label: "이름", type: "text" },
      { key: "en", label: "영문", type: "text" },
      { key: "body", label: "설명", type: "textarea" },
    ], blank: () => ({ title: "", en: "", body: "" }) },
    "world.guiding": { title: "Guiding Rule", fields: [
      { key: "title", label: "제목", type: "text" },
      { key: "body", label: "내용", type: "textarea" },
    ], blank: () => ({ title: "", body: "" }) },
    "world.arch": { title: "ARCH", single: true, fields: [
      { key: "intro", label: "기관 소개", type: "textarea" },
      { key: "identityQuote", label: "요원 자기인식 (인용)", type: "text" },
      { key: "identity", label: "요원 자기인식 (설명)", type: "textarea" },
    ] },
    "world.ranks": { title: "Rank", fields: [
      { key: "name", label: "직급", type: "text" },
      { key: "en", label: "영문", type: "text" },
      { key: "grade", label: "등급 (예: S, A–B)", type: "text" },
      { key: "desc", label: "설명", type: "textarea" },
      { key: "rep", label: "기관 내 이미지 (선택)", type: "textarea" },
    ], blank: () => ({ name: "", en: "", grade: "", desc: "", rep: "" }) },
    "world.partnerRules": { title: "Partner Rule", fields: [
      { key: "title", label: "제목", type: "text" },
      { key: "body", label: "내용", type: "textarea" },
    ], blank: () => ({ title: "", body: "" }) },
    "world.elementsIntro": { title: "Elements", single: true, fields: [
      { key: "sentinel", label: "속성 센티넬 설명", type: "textarea" },
      { key: "guide", label: "속성 가이드 설명", type: "textarea" },
    ] },
    "world.elements": { title: "Element", fields: [
      { key: "icon", label: "아이콘 (이모지)", type: "text" },
      { key: "ko", label: "이름", type: "text" },
      { key: "en", label: "영문", type: "text" },
      { key: "color", label: "색", type: "color" },
      { key: "power", label: "힘의 특징", type: "textarea" },
      { key: "rampage", label: "폭주 징후", type: "textarea" },
      { key: "guide", label: "속성 가이드 능력", type: "textarea" },
      { key: "sentinelRep", label: "평판 · 센티넬", type: "textarea" },
      { key: "guideRep", label: "평판 · 가이드", type: "textarea" },
    ], blank: () => ({ icon: "", ko: "", en: "", color: "#c9a96e", power: "", rampage: "", guide: "", sentinelRep: "", guideRep: "" }) },
    "world.teams": { title: "Team", fields: [
      { key: "name", label: "팀 이름", type: "text" },
      { key: "cls", label: "등급 (예: S-CLASS)", type: "text" },
      { key: "members", label: "요원", type: "members", hint: "증명사진은 파일을 고르거나 붙여넣기. 비워두면 빈 증명사진으로 보여요." },
      { key: "relations", label: "인물 관계도 (한 줄에 하나)", type: "relations",
        hint: "예) 애쉬 → 셰인 | 라이벌   ·   애쉬 ↔ 노아 | 소꿉친구   ·   → 한쪽 / ↔ 서로 / - 그냥 연결. 이름은 위 요원 이름과 똑같이 적어주세요." },
    ], blank: () => ({ name: "", cls: "", members: [], relations: [] }) },
    "world.places": { title: "Location", fields: [
      { key: "name", label: "이름", type: "text" },
      { key: "en", label: "영문 / 부제", type: "text" },
      { key: "body", label: "설명", type: "textarea" },
    ], blank: () => ({ name: "", en: "", body: "" }) },
    "world.threats": { title: "Threat", fields: [
      { key: "name", label: "이름", type: "text" },
      { key: "en", label: "영문", type: "text" },
      { key: "body", label: "설명", type: "textarea" },
    ], blank: () => ({ name: "", en: "", body: "" }) },
    "world.codeRed": { title: "Code Red", single: true, fields: [{ key: "body", label: "코드 레드 설명", type: "textarea" }] },
    "world.terms": { title: "Term", fields: [
      { key: "term", label: "용어", type: "text" },
      { key: "en", label: "영문", type: "text" },
      { key: "body", label: "설명", type: "textarea" },
    ], blank: () => ({ term: "", en: "", body: "" }) },
    site: {
      title: "Site",
      single: true,
      fields: [
        { key: "title", label: "로고 글자", type: "text" },
      ],
    },
  };

  // 작태: asset 과 같은 형태 (구분 자동완성만 작태 사진 기준)
  SCHEMAS.jaktae = {
    ...SCHEMAS.gallery,
    title: "작태",
    fields: SCHEMAS.gallery.fields.map((f) => (f.type === "section" ? { ...f, source: "jaktae" } : f)),
  };

  // OOC: 글만
  SCHEMAS.ooc = {
    title: "OOC",
    fields: [
      { key: "section", label: "구분 (선택)", type: "section", source: "ooc", hint: "같은 구분끼리 한 줄로 묶이고 구분선으로 나뉘어요." },
      { key: "title", label: "제목 (선택)", type: "text" },
      { key: "text", label: "OOC 내용", type: "textarea" },
    ],
    blank: () => ({ id: `o${Date.now()}`, section: "", title: "", text: "" }),
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
  // 프로필 항목 이름(이름/소속/등급/속성/나이)이 저장되는 곳: male.profile.realname → male.profile.labels.realname
  const labelKey = (f) => f.key.replace(".profile.", ".profile.labels.");

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

  // 저장: 서버의 최신 데이터를 받아서, 이번에 고친 부분(keys)만 바꿔 넣음.
  // 다른 탭/다른 회원이 그 사이 저장한 내용(예: 링크)을 덮어쓰지 않기 위해서.
  async function saveData(next, keys) {
    const { data: row, error: e1 } = await App.sb.from("site_data").select("data").eq("id", "main").maybeSingle();
    if (e1) throw new Error(e1.message);
    const merged = row?.data ? App.normalize(row.data) : next;
    for (const k of keys) merged[k] = next[k];
    const { error } = await App.sb.from("site_data").upsert({ id: "main", data: merged, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    App.data = App.normalize(merged);
    App.render();
    App.toast("저장했어요");
  }

  // 관계도 한 줄: "A → B | 라벨" (→ / -> 한쪽, ↔ / <-> 서로, - 그냥 연결)
  function parseRelations(text) {
    return text.split("\n").map((line) => {
      const [pairPart, ...rest] = line.split("|");
      const m = pairPart.match(/^\s*(.+?)\s*(<->|↔|->|→|=>|-)\s*(.+?)\s*$/);
      if (!m) return null;
      const dir = /↔|<->/.test(m[2]) ? "both" : m[2] === "-" ? "none" : "one";
      return { from: m[1], to: m[3], dir, label: rest.join("|").trim() };
    }).filter(Boolean);
  }

  App.saveData = (next, keys) => saveData(next, keys);

  // ---------- 편집 모드 켜기/끄기 ----------
  document.getElementById("edit-btn").addEventListener("click", () => {
    App.admin = !App.admin;
    document.body.classList.toggle("admin", App.admin);
    App.render();
  });

  // ---------- edit form ----------
  const PARTS = [["top", "상의"], ["bottom", "하의"], ["shoes", "신발"]];
  function variantHtml(v = {}, solo = false) {
    const person = (k, label) => `<span class="v-cap">${label}</span>
      ${PARTS.map(([part, name]) => `<div class="v-part"><span>${name}</span>
        <input type="text" class="v-${k}-${part}" value="${esc(v[k]?.[part])}"></div>`).join("")}`;
    return `<div class="variant-edit" data-image="${esc(v.image || "")}">
      <div class="variant-top">
        <input type="text" class="v-label" placeholder="의상 이름 (예: 사복)" value="${esc(v.label)}">
        <input type="text" class="v-sub" placeholder="보조 문구 (예: 여름 ver)" value="${esc(v.sub)}">
        <button type="button" class="pill-btn v-remove">삭제</button>
      </div>
      ${solo ? person("female", "의상") : person("male", "남캐 의상") + person("female", "여캐 의상")}
      <div class="img-field">
        <div class="preview" style="${v.image ? `background-image:url('${esc(App.mediaUrl(v.image))}')` : ""}"></div>
        <div><input type="file" class="v-file" accept="image/*">
          <button type="button" class="pill-btn paste-btn">붙여넣기</button>
          <p class="hint">이 의상 사진 (선택)</p></div>
      </div>
    </div>`;
  }

  function memberHtml(m = {}) {
    return `<div class="variant-edit member-edit" data-image="${esc(m.photo || "")}">
      <div class="variant-top">
        <input type="text" class="m-name" placeholder="이름" value="${esc(m.name)}">
        <input type="text" class="m-attr" placeholder="속성 (예: 불 속성, S급 물)" value="${esc(m.attr)}">
        <button type="button" class="pill-btn m-remove">삭제</button>
      </div>
      <input type="text" class="m-desc" placeholder="한 줄 소개 (관계도에 표시, 예: 27세 / 뱅가드 리더)" value="${esc(m.desc)}">
      <div class="img-field">
        <div class="preview" style="${m.photo ? `background-image:url('${esc(App.mediaUrl(m.photo))}')` : ""}"></div>
        <div><input type="file" class="m-file" accept="image/*">
          <button type="button" class="pill-btn paste-btn">붙여넣기</button>
          <p class="hint">증명사진</p></div>
      </div>
    </div>`;
  }

  function fieldHtml(f, val) {
    const name = `f:${f.key}`;
    if (f.type === "variants")
      return `<div class="variant-list" ${f.solo ? "data-solo" : ""}>${(val || []).map((v) => variantHtml(v, f.solo)).join("")}</div>
        <button type="button" class="pill-btn v-add">+ 의상 추가</button>`;
    if (f.type === "textarea")
      return `<textarea name="${name}">${esc(val)}</textarea>`;
    if (f.type === "color")
      return `<input type="color" name="${name}" value="${esc(val || "#c9a4b4")}">`;
    if (f.type === "list")
      return `<input type="text" name="${name}" value="${esc((val || []).join(", "))}">`;
    if (f.type === "genre") {
      const gs = App.data.genres || [];
      return `<select name="${name}"><option value="">메인 (장르 없음)</option>${gs.map((g) => `<option value="${esc(g)}" ${g === val ? "selected" : ""}>${esc(g)}</option>`).join("")}</select>`;
    }
    if (f.type === "lines")
      return `<textarea name="${name}">${esc((val || []).join("\n"))}</textarea>`;
    if (f.type === "checkbox")
      return `<label class="check"><input type="checkbox" name="${name}" ${val ? "checked" : ""}> ${esc(f.label)}</label>`;
    if (f.type === "relations")
      return `<textarea name="${name}" placeholder="애쉬 → 셰인 | 라이벌">${esc((val || []).map((r) => `${r.from} ${r.dir === "both" ? "↔" : r.dir === "none" ? "-" : "→"} ${r.to}${r.label ? ` | ${r.label}` : ""}`).join("\n"))}</textarea>`;
    if (f.type === "members")
      return `<div class="member-edit-list">${(val || []).map(memberHtml).join("")}</div>
        <button type="button" class="pill-btn m-add">+ 요원 추가</button>`;
    if (f.type === "section") {
      const names = [...new Set(App.data[f.source || "gallery"].map((g) => (g.section || "").trim()).filter(Boolean))];
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
        <div><input type="file" name="${name}" accept="image/*">
          <button type="button" class="pill-btn paste-btn">붙여넣기</button>
          <p class="hint">${val ? "새 사진을 고르거나 붙여넣으면 교체돼요." : "파일을 고르거나, 복사한 이미지를 Ctrl+V / ⌘V 로 붙여넣어도 돼요."}</p></div>
      </div>`;
    return `<input type="text" name="${name}" value="${esc(val)}">`;
  }

  function openEditor(col, index, preset = {}) {
    const schema = SCHEMAS[col];
    const isNew = !schema.single && index == null;
    const item = col === "genres" ? { list: clone(App.data.genres || []) }
      : schema.single ? clone(getPath(App.data, col) || {})
      : isNew ? { ...schema.blank(), ...preset } : clone(getPath(App.data, col)[index]);

    const fields = schema.fields;
    const parts = fields.map((f) => f.type === "heading"
      ? `<h3 class="form-sec">${esc(f.label)}</h3>`
      : f.type === "idrow"
      ? `<div class="field"><div class="idrow">
          <input type="text" class="idrow-l" name="l:${f.key}" placeholder="${esc(f.label)}" value="${esc(getPath(item, labelKey(f)) || f.label)}">
          <input type="text" name="f:${f.key}" value="${esc(getPath(item, f.key))}"></div>${f.hint ? `<p class="hint">${esc(f.hint)}</p>` : ""}</div>`
      : f.type === "checkbox"
      ? `<div class="field">${fieldHtml(f, getPath(item, f.key))}${f.hint ? `<p class="hint">${esc(f.hint)}</p>` : ""}</div>`
      : `<div class="field" ${f.showIf ? `data-show-if="${f.showIf}"` : ""} ${f.hideIf ? `data-hide-if="${f.hideIf}"` : ""}><label>${esc(f.label)}</label>${fieldHtml(f, getPath(item, f.key))}${f.hint ? `<p class="hint">${esc(f.hint)}</p>` : ""}</div>`
    );

    App.openModal(`<form class="form" id="edit-form">
      <h2>${isNew ? "ADD" : "EDIT"} ${esc(schema.title).toUpperCase()}</h2>
      <p class="desc">${esc(schema.hint || "저장하면 바로 반영돼요.")}</p>
      ${parts.join("")}
      <div class="form-actions">
        <button type="button" class="pill-btn" data-close>Cancel</button>
        <button type="submit" class="pill-btn dark">Save</button>
      </div>
    </form>`);

    const form = document.getElementById("edit-form");
    form.querySelector("[data-close]").onclick = App.closeModal;

    // 체크박스에 따라 보이는 칸 바꾸기 (예: 페어 프롬프트 사용 → A/B 칸)
    const syncShow = () => {
      form.querySelectorAll("[data-show-if], [data-hide-if]").forEach((el) => {
        const key = el.dataset.showIf || el.dataset.hideIf;
        const on = form.elements[`f:${key}`]?.checked;
        el.hidden = el.dataset.showIf ? !on : on;
      });
    };
    form.addEventListener("change", (e) => { if (e.target.type === "checkbox") syncShow(); });
    syncShow();

    // 사진 미리보기
    form.addEventListener("change", (e) => {
      const inp = e.target;
      if (inp.type !== "file" || !inp.files[0]) return;
      inp.closest(".img-field").querySelector(".preview").style.backgroundImage = `url('${URL.createObjectURL(inp.files[0])}')`;
    });
    // 이미지 붙여넣기: 마지막으로 누른 사진 칸(없으면 첫 사진 칸)에 넣음
    let pasteTarget = null;
    const putImage = (input, file) => {
      const dt = new DataTransfer();
      dt.items.add(new File([file], file.name || `pasted.${(file.type.split("/")[1] || "png")}`, { type: file.type }));
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      App.toast("이미지를 넣었어요");
    };
    form.addEventListener("pointerdown", (e) => {
      const f = e.target.closest(".img-field");
      if (f) pasteTarget = f.querySelector("input[type=file]");
    });
    const onPaste = (e) => {
      const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith("image/"));
      if (!file) return;
      e.preventDefault();
      putImage(pasteTarget || form.querySelector(".img-field input[type=file]"), file);
    };
    document.addEventListener("paste", onPaste);
    // 폼이 닫히면 붙여넣기 감지 해제
    new MutationObserver((_, obs) => {
      if (!document.body.contains(form)) { document.removeEventListener("paste", onPaste); obs.disconnect(); }
    }).observe(document.getElementById("modal-body"), { childList: true });
    form.addEventListener("click", async (e) => {
      const pb = e.target.closest(".paste-btn");
      if (!pb) return;
      const input = pb.closest(".img-field").querySelector("input[type=file]");
      try {
        for (const item of await navigator.clipboard.read()) {
          const type = item.types.find((t) => t.startsWith("image/"));
          if (type) return putImage(input, await item.getType(type));
        }
        App.toast("복사된 이미지가 없어요");
      } catch {
        pasteTarget = input;
        App.toast("이 칸을 누른 상태에서 Ctrl+V / ⌘V 로 붙여넣어 주세요");
      }
    });

    // 의상 추가 / 삭제
    form.addEventListener("click", (e) => {
      if (e.target.closest(".v-add")) {
        const vl = form.querySelector(".variant-list");
        vl.insertAdjacentHTML("beforeend", variantHtml({}, vl.hasAttribute("data-solo")));
      }
      if (e.target.closest(".m-add")) form.querySelector(".member-edit-list").insertAdjacentHTML("beforeend", memberHtml());
      const mr = e.target.closest(".m-remove");
      if (mr && confirm("이 요원을 지울까요?")) mr.closest(".member-edit").remove();
      const rm = e.target.closest(".v-remove");
      if (rm && confirm("이 의상을 지울까요?")) rm.closest(".variant-edit").remove();
    });

    form.onsubmit = async (e) => {
      e.preventDefault();
      form.classList.add("busy");
      try {
        for (const f of fields) {
          if (f.type === "heading") continue;
          if (f.type === "members") {
            const list = [];
            for (const box of form.querySelectorAll(".member-edit")) {
              const m = { name: box.querySelector(".m-name").value.trim(), attr: box.querySelector(".m-attr").value.trim(), desc: box.querySelector(".m-desc").value.trim(), photo: box.dataset.image || "" };
              const file = box.querySelector(".m-file").files[0];
              if (file) m.photo = await uploadImage(file);
              if (m.name) list.push(m);
            }
            setPath(item, f.key, list);
            continue;
          }
          if (f.type === "variants") {
            const list = [];
            for (const box of form.querySelectorAll(".variant-edit")) {
              const v = {
                label: box.querySelector(".v-label").value.trim(),
                sub: box.querySelector(".v-sub").value.trim(),
                image: box.dataset.image || "",
              };
              const who = f.solo ? ["female"] : ["male", "female"];
              for (const k of who)
                v[k] = Object.fromEntries(PARTS.map(([part]) => [part, box.querySelector(`.v-${k}-${part}`).value.trim()]));
              const file = box.querySelector(".v-file").files[0];
              if (file) v.image = await uploadImage(file);
              const hasText = who.some((k) => Object.values(v[k]).some(Boolean));
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
            } else if (isNew && !getPath(item, f.key) && (col === "gallery" || col === "jaktae")) {
              throw new Error("사진 파일을 골라주세요.");
            }
          } else if (f.type === "lines") {
            setPath(item, f.key, [...new Set(el.value.split("\n").map((x) => x.trim()).filter(Boolean))]);
          } else if (f.type === "idrow") {
            setPath(item, f.key, el.value);
            const lv = form.elements[`l:${f.key}`].value.trim();
            setPath(item, labelKey(f), lv === f.label ? "" : lv);
          } else if (f.type === "relations") {
            setPath(item, f.key, parseRelations(el.value));
          } else if (f.type === "checkbox") {
            setPath(item, f.key, el.checked);
          } else if (f.type === "list") {
            setPath(item, f.key, el.value.split(",").map((s) => s.trim()).filter(Boolean));
          } else {
            setPath(item, f.key, el.value);
          }
        }
        if (col === "links" && item.url && !/^[a-z][a-z0-9+.-]*:/i.test(item.url.trim())) item.url = `https://${item.url.trim()}`;
        // 갤러리: 비어 있는 개별 프롬프트는 지워서 페어 프롬프트를 쓰게 함
        if (col === "gallery" || col === "jaktae") {
          for (const k of ["male", "female"]) if (item[k] && !item[k].name && !item[k].prompt) delete item[k];
        }

        const next = clone(App.data);
        if (col === "genres") {
          // 같은 자리의 이름이 바뀌었으면 그 장르의 페어도 새 이름으로 옮김
          const before = App.data.genres || [];
          before.forEach((old, k) => {
            const now = item.list[k];
            if (now && old !== now && !item.list.includes(old) && !before.includes(now))
              next.pairs.forEach((p) => { if (p.genre === old) p.genre = now; });
          });
          next.genres = item.list;
        } else if (schema.single) setPath(next, col, item);
        else {
          const list = getPath(next, col);
          isNew ? list.push(item) : (list[index] = item);
        }
        await saveData(next, col === "genres" ? ["genres", "genresV", "pairs"] : [col.split(".")[0]]);
        App.closeModal();
      } catch (err) {
        form.classList.remove("busy");
        alert(`저장하지 못했어요: ${err.message}`);
      }
    };
  }

  // ---------- OOC 파일로 가져오기 (.json 또는 노션 .md 내보내기) ----------
  // 노션 토글 형식: "- 제목" 다음 줄부터 4칸 들여쓴 내용
  function parseNotionMd(md) {
    const items = [];
    let cur = null;
    for (const ln of md.replace(/\r/g, "").split("\n")) {
      if (/^- \S/.test(ln)) {
        cur = { title: ln.slice(2).trim(), body: [] };
        items.push(cur);
      } else if (cur) {
        cur.body.push(ln.startsWith("    ") ? ln.slice(4) : ln);
      }
    }
    return items.map((it) => ({
      title: it.title.replace(/\*\*(.+?)\*\*/g, "$1").trim(),
      text: it.body.join("\n").replace(/[ \t]+\n/g, "\n").replace(/^```[a-z]*\s*\n?|\n?```\s*$/gm, "").replace(/\n{3,}/g, "\n\n").trim(),
    })).filter((x) => x.text);
  }

  function openImport() {
    App.openModal(`<form class="form" id="import-form">
      <h2>IMPORT OOC</h2>
      <p class="desc">.json 파일이나 노션에서 내보낸 .md 파일을 고르면 OOC 가 한 번에 추가돼요.</p>
      <div class="field"><label>구분</label><input type="text" name="section" placeholder="예: TALK">
        <p class="hint">파일에 구분이 적혀 있으면 자동으로 채워져요. 노션 .md 파일이면 페이지 제목이 들어가요.</p></div>
      <div class="field"><label>파일</label><input type="file" name="file" accept=".json,.md,.txt,application/json,text/markdown,text/plain">
        <p class="hint" id="import-info">파일을 골라주세요.</p></div>
      <div class="form-actions">
        <button type="button" class="pill-btn" data-close>Cancel</button>
        <button type="submit" class="pill-btn dark">가져오기</button>
      </div>
    </form>`);
    const form = document.getElementById("import-form");
    form.querySelector("[data-close]").onclick = App.closeModal;
    let parsed = [];
    form.file.onchange = async () => {
      const f = form.file.files[0];
      if (!f) return;
      const text = await f.text();
      let guess = "";
      try {
        if (/\.json$/i.test(f.name) || text.trim().startsWith("[")) {
          parsed = JSON.parse(text).map((x) => ({ title: String(x.title || ""), text: String(x.text || ""), section: x.section }));
          const secs = [...new Set(parsed.map((x) => x.section).filter(Boolean))];
          if (secs.length === 1) guess = secs[0];
        } else {
          parsed = parseNotionMd(text);
          // 노션 페이지 제목 (# 개발새발 TALK 시리즈 → 개발새발 TALK 시리즈)
          guess = (text.match(/^# (.+)$/m) || [])[1]?.trim() || "";
        }
      } catch {
        parsed = [];
      }
      if (guess && !form.section.value.trim()) form.section.value = guess;
      document.getElementById("import-info").textContent = parsed.length
        ? `${parsed.length}개 찾았어요: ${parsed.slice(0, 3).map((x) => x.title || "제목 없음").join(", ")}${parsed.length > 3 ? " …" : ""}`
        : "읽을 수 있는 OOC 가 없어요.";
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (!parsed.length) return alert("가져올 OOC 가 없어요.");
      form.classList.add("busy");
      const section = form.section.value.trim();
      const next = clone(App.data);
      const t = Date.now();
      parsed.forEach((x, k) => next.ooc.push({ id: `o${t}-${k}`, section: section || x.section || "", title: x.title, text: x.text }));
      try {
        await saveData(next, ["ooc"]);
        App.closeModal();
        App.toast(`${parsed.length}개를 가져왔어요`);
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

    if (act === "import") return openImport();
    if (act === "add") {
      const preset = {};
      if (btn.dataset.section) preset.section = btn.dataset.section;
      if (btn.dataset.genre) preset.genre = btn.dataset.genre;
      return openEditor(col, SCHEMAS[col].single ? 0 : null, preset);
    }
    if (act === "rename-section") {
      const from = btn.dataset.section;
      const to = prompt("새 구분 이름", from);
      if (to == null || to.trim() === from) return;
      const next = clone(App.data);
      const gcol = btn.dataset.col || "gallery";
      next[gcol].forEach((g) => { if ((g.section || "").trim() === from) g.section = to.trim(); });
      try { await saveData(next, [gcol]); } catch (err) { alert(`저장하지 못했어요: ${err.message}`); }
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
      // 갤러리는 같은 구분, 페어는 같은 장르 안에서만 순서 이동
      const groupKey = ["gallery", "jaktae", "ooc"].includes(col) ? (x) => (x.section || "").trim()
        : col === "pairs" ? (x) => ((App.data.genres || []).includes(x.genre) ? x.genre : "")
        : null;
      if (groupKey) {
        const g = groupKey(list[i]);
        while (j >= 0 && j < list.length && groupKey(list[j]) !== g) j += Number(btn.dataset.dir);
      }
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
    }
    try {
      await saveData(next, [col.split(".")[0]]);
    } catch (err) {
      alert(`저장하지 못했어요: ${err.message}`);
    }
  });

})();
