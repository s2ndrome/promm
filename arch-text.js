// ARCH 정보를 프롬프트용 텍스트로 정리 (세계관 / 요원 따로). ARCH 페이지의 TXT 버튼과 저장소 스크립트가 같이 씀
(function (root) {
  const ENT = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", middot: "·", hellip: "…", rarr: "→", larr: "←", times: "×", ndash: "–", mdash: "—" };
  // 상세 프로필 HTML → 읽기 좋은 글 (스타일 · 스크립트 · 이미지는 버리고 글자만)
  function htmlToText(html) {
    if (!html) return "";
    let s = String(html)
      .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n· ")
      .replace(/<\/(div|p|li|h[1-6]|tr|section|article|header|footer|blockquote|ul|ol|table)>/gi, "\n")
      .replace(/<\/(td|th|span|b|strong|em|i|a|small|label)>/gi, (m) => (/td|th/i.test(m) ? " | " : m))
      .replace(/<[^>]+>/g, "")
      .replace(/&(#?\w+);/g, (m, k) => (ENT[k] ?? (k[0] === "#" ? String.fromCharCode(k[1] === "x" ? parseInt(k.slice(2), 16) : +k.slice(1)) : m)));
    return s.split("\n").map((l) => l.replace(/[ \t]+/g, " ").replace(/\s*\|\s*$/, "").trim()).filter((l, i, a) => l || (a[i - 1] && a[i - 1].trim()))
      .join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  const line = (k, v) => (v && String(v).trim() ? `${k}: ${String(v).trim()}\n` : "");
  const head = (t) => `\n━━━━━━━━━━━━━━━━━━━━\n【${t}】\n━━━━━━━━━━━━━━━━━━━━\n`;

  // 세계관 전부 (요원 상세 프로필 제외, 요원 명단 · 관계는 포함)
  function world(w, extra = {}) {
    w = w || {};
    let o = "# ARCH 세계관 설정집\n(ARCH 페이지에 등록된 모든 세계관 정보. 요원 상세 프로필은 별도 파일)\n";
    const h = w.hero || {};
    o += head("표지");
    o += line("제목", h.title) + line("부제", h.kicker) + line("버전", h.ver) + line("인용", h.quote) + line("소개", h.intro);
    o += head("01 각성자");
    for (const a of w.awakened || []) o += `\n▶ ${a.title}${a.en ? ` (${a.en})` : ""}\n${a.body || ""}\n`;
    if ((w.guiding || []).length) { o += "\n▶ 가이딩\n"; for (const g of w.guiding) o += `· ${g.title}: ${g.body}\n`; }
    o += head("02 아크 (ARCH)");
    const ar = w.arch || {};
    o += line("소개", ar.intro) + line("정체성 문구", ar.identityQuote) + line("정체성", ar.identity);
    o += "\n▶ 직급\n";
    for (const r of w.ranks || []) o += `\n· ${r.name}${r.en ? ` (${r.en})` : ""}${r.grade ? ` — ${r.grade}` : ""}\n${line("  설명", r.desc)}${line("  평판", r.rep)}`;
    if ((w.partnerRules || []).length) { o += "\n▶ 파트너 규정\n"; for (const p of w.partnerRules) o += `· ${p.title}: ${p.body}\n`; }
    o += head("03 6속성");
    const ei = w.elementsIntro || {};
    o += line("속성 센티넬", ei.sentinel) + line("속성 가이드", ei.guide);
    for (const e of w.elements || []) {
      o += `\n▶ ${e.ko}${e.en ? ` (${e.en})` : ""}\n`;
      o += line("  능력", e.power) + line("  폭주 증상", e.rampage) + line("  가이드 능력", e.guide) + line("  센티넬 평판", e.sentinelRep) + line("  가이드 평판", e.guideRep);
    }
    o += head("04 요원 명단 (팀별)");
    o += "(각 요원의 상세 프로필은 'ARCH 요원 정보' 파일 참고)\n";
    for (const t of w.teams || []) {
      o += `\n▶ ${t.name}${t.cls ? ` · ${t.cls}` : ""}\n`;
      if (!(t.members || []).length) o += "· (공석)\n";
      for (const m of t.members || []) o += `· ${m.name}${m.attr ? ` — ${m.attr}` : ""}${m.desc ? ` / ${m.desc}` : ""}\n`;
      if ((t.relations || []).length) {
        o += "  관계:\n";
        for (const r of t.relations) o += `  - ${r.from} ${r.dir === "both" ? "↔" : r.dir === "none" ? "—" : "→"} ${r.to}${r.label ? ` : ${r.label}` : ""}\n`;
      }
    }
    o += head("05 장소");
    for (const p of w.places || []) o += `\n▶ ${p.name}${p.en ? ` (${p.en})` : ""}\n${p.body || ""}\n`;
    if ((extra.suites || []).length) {
      o += "\n▶ S급 전용관 숙소\n";
      extra.suites.forEach((s, i) => {
        if (!s) { o += `· SUITE ${String(i + 1).padStart(2, "0")}: 공실\n`; return; }
        o += `\n· SUITE ${String(i + 1).padStart(2, "0")} — ${s.name}\n  ${s.title}${s.sub ? ` · ${s.sub}` : ""}\n  ${(s.meta || []).join(" · ")}\n  구성: ${(s.spaces || []).map((x) => `${x.ko}(${x.en})`).join(", ")}\n`;
      });
    }
    o += head("06 위협");
    for (const t of w.threats || []) o += `\n▶ ${t.name}${t.en ? ` (${t.en})` : ""}\n${t.body || ""}\n`;
    if (w.codeRed?.body) o += `\n▶ CODE RED (긴급 출동)\n${w.codeRed.body}\n`;
    o += head("07 기타 용어");
    for (const t of w.terms || []) o += `\n▶ ${t.term}${t.en ? ` (${t.en})` : ""}\n${t.body || ""}\n`;
    if (w.jj?.notes?.trim()) o += head("추가 설정") + w.jj.notes.trim() + "\n";
    return o.replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  // 요원 정보 전부 (팀 · 속성 · 관계 + 상세 프로필 HTML 의 내용)
  function agents(w) {
    w = w || {};
    let o = "# ARCH 요원 정보\n(ARCH 페이지에 등록된 모든 요원. 상세 프로필(HTML 소개 카드)의 내용을 글로 옮김)\n";
    for (const t of w.teams || []) {
      if (!(t.members || []).length) continue;
      o += head(`${t.name}${t.cls ? ` · ${t.cls}` : ""}`);
      for (const m of t.members || []) {
        o += `\n■ ${m.name}\n`;
        o += line("소속", `${t.name}${t.cls ? ` (${t.cls})` : ""}`) + line("등급 · 속성", m.attr) + line("한 줄 소개", m.desc);
        const rel = (t.relations || []).filter((r) => r.from === m.name || r.to === m.name);
        if (rel.length) o += "관계:\n" + rel.map((r) => `- ${r.from} ${r.dir === "both" ? "↔" : r.dir === "none" ? "—" : "→"} ${r.to}${r.label ? ` : ${r.label}` : ""}`).join("\n") + "\n";
        const card = htmlToText(m.card);
        o += card ? `\n[상세 프로필]\n${card}\n` : "(상세 프로필 없음)\n";
      }
    }
    if (w.jj?.notes?.trim()) o += head("추가 설정") + w.jj.notes.trim() + "\n";
    return o.replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  root.ArchText = { world, agents, htmlToText };
})(typeof window !== "undefined" ? window : globalThis);
