// archive a: 캘린더. 메인 페어마다 처음 만난 날부터 D+일수, 50일 단위 · 주년 기념일 자동, 직접 넣는 기념일
// 데이터: App.data.calendar = { starts: { 페어id: "YYYY-MM-DD" }, events: [{ id, name, date, pair, type: "birthday" | "pair" | "etc", repeat: "yearly" | "once" }] }
(function () {
  const App = window.App;
  const esc = App.esc;
  const DAY = 864e5;
  const WK = ["일", "월", "화", "수", "목", "금", "토"];
  const COLORS = ["#c9a4b4", "#8fb2c9", "#b8a77c", "#9cb88a", "#a99ac4", "#d09a8a", "#7fb3b0", "#c4a0b8", "#a8a8a8"];
  let monthOff = 0, picked = null, filter = "all";
  const TYPES = [["birthday", "생일"], ["pair", "페어 기념일"], ["etc", "기타"]];

  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const parse = (s) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : null);
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const diff = (a, b) => Math.round((a - b) / DAY);
  const dot = (d) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  const md = (d) => `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
  const ddTxt = (n) => (n === 0 ? "D-DAY" : `D-${n}`);
  const cal = () => App.data.calendar || {};

  // 모든 페어 (메인 → 장르별 페어 → ONLY GIRL). 메인 페어는 D-DAY 카드에도 나옴
  function allPairs() {
    const { pairs = [], genres = [], girls = [] } = App.data;
    const starts = cal().starts || {}, out = [];
    const item = (p, group, main, title, names) => ({ p, group, main, title, names, color: COLORS[out.length % COLORS.length], start: main ? parse(starts[p.id]) : null });
    const mains = pairs.filter((p) => !genres.includes(p.genre));
    mains.forEach((p, i) => out.push(item(p, "메인 페어", true, p.title || `페어 ${i + 1}`, [p.male?.name, p.female?.name].filter(Boolean).join(" · "))));
    for (const g of genres) pairs.filter((p) => p.genre === g).forEach((p) => out.push(item(p, g, false, p.title || [p.male?.name, p.female?.name].filter(Boolean).join(" X ") || "페어", "")));
    girls.forEach((c) => out.push(item(c, "ONLY GIRL", false, c.female?.name || c.title || "캐릭터", "")));
    return out;
  }
  const mainPairs = () => allPairs().filter((x) => x.main);
  // 기념일 구분: 50일 · 주년은 페어 기념일, 직접 넣은 건 고른 구분 (예전 것은 이름에 '생일' 이 있으면 생일)
  const typeOf = (e) => (e.auto ? "pair" : e.ev?.type || (/생일|birthday/i.test(e.name) ? "birthday" : "etc"));
  const sinceDays = (start, d = today()) => diff(d, start) + 1; // 처음 만난 날 = 1일

  // 그 날짜에 있는 기념일 (자동 + 직접)
  function eventsOn(d, pairs) {
    const out = [];
    for (const x of pairs) {
      if (!x.start || d < x.start) continue;
      const n = sinceDays(x.start, d);
      if (n > 1 && n % 50 === 0) out.push({ name: `${n}일`, x, auto: true });
      const y = d.getFullYear() - x.start.getFullYear();
      if (y > 0 && d.getMonth() === x.start.getMonth() && d.getDate() === x.start.getDate()) out.push({ name: `${y}주년`, x, auto: true });
    }
    for (const e of cal().events || []) {
      const ed = parse(e.date);
      if (!ed) continue;
      const hit = e.repeat === "once" ? +ed === +d : d >= ed && ed.getMonth() === d.getMonth() && ed.getDate() === d.getDate();
      if (hit) out.push({ name: e.name, x: pairs.find((p) => p.p.id === e.pair), ev: e });
    }
    return out;
  }
  // 다가오는 기념일 전부 → 가까운 순
  function upcoming(pairs) {
    const t = today(), out = [];
    for (const x of pairs) {
      if (!x.start) continue;
      const n = sinceDays(x.start, t);
      const next = Math.max(50, Math.ceil(n / 50) * 50);
      out.push({ name: `${next}일`, x, date: new Date(+x.start + (next - 1) * DAY), auto: true });
      let y = Math.max(1, t.getFullYear() - x.start.getFullYear());
      let a = new Date(x.start); a.setFullYear(x.start.getFullYear() + y);
      if (a < t) a.setFullYear(x.start.getFullYear() + ++y);
      out.push({ name: `${y}주년`, x, date: a, auto: true });
    }
    for (const e of cal().events || []) {
      const ed = parse(e.date);
      if (!ed) continue;
      let d = ed;
      if (e.repeat !== "once") { d = new Date(t.getFullYear(), ed.getMonth(), ed.getDate()); if (d < t) d.setFullYear(d.getFullYear() + 1); if (d < ed) d = ed; }
      out.push({ name: e.name, x: pairs.find((p) => p.p.id === e.pair), date: d, ev: e });
    }
    return out.map((e) => ({ ...e, left: diff(e.date, t) })).filter((e) => e.left >= 0).sort((a, b) => a.left - b.left || (a.auto ? 1 : -1));
  }

  const colorOf = (e) => e.x?.color || COLORS[8];
  const whoOf = (e) => e.x?.title || "공통";

  function pairCard(x) {
    const img = x.p.image ? `<img src="${esc(App.mediaUrl(x.p.image))}" alt="" loading="lazy" onerror="this.remove()">` : "";
    return `<div class="cl-pc">
      <div class="cl-ph">${img}</div>
      <div class="cl-pi">
        <p class="cl-nm"><i class="cl-dot" style="background:${x.color}"></i>${esc(x.title)}</p>
        <p class="cl-sm">${esc(x.names)}${x.start ? `${x.names ? " · " : ""}${dot(x.start)} 부터` : ""}</p>
        <p class="cl-big">${x.start ? `D+${sinceDays(x.start)}` : "<span class=\"cl-none\">D-DAY 미설정</span>"}</p>
      </div>
      <button type="button" class="cl-set adm-inline" data-cal-start="${esc(x.p.id)}">${x.start ? "날짜 수정" : "날짜 설정"}</button>
    </div>`;
  }

  function calGrid(pairs) {
    const t = today(), base = new Date(t.getFullYear(), t.getMonth() + monthOff, 1);
    const m = base.getMonth(), start = new Date(base.getFullYear(), m, 1 - base.getDay());
    let h = `<div class="cl-mhead"><button type="button" data-cal-month="-1" aria-label="이전 달">‹</button><b>${base.getFullYear()}. ${String(m + 1).padStart(2, "0")}</b><button type="button" data-cal-month="1" aria-label="다음 달">›</button>${monthOff ? `<button type="button" class="cl-today" data-cal-month="0">오늘</button>` : ""}</div>`;
    h += `<div class="cl-grid">${WK.map((w, i) => `<div class="cl-wd ${i ? "" : "sun"}">${w}</div>`).join("")}`;
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const ev = eventsOn(d, pairs);
      h += `<button type="button" class="cl-d ${d.getMonth() !== m ? "out" : ""} ${+d === +t ? "today" : ""} ${picked === ymd(d) ? "picked" : ""} ${d.getDay() === 0 ? "sun" : ""}" data-cal-day="${ymd(d)}">
        <span class="n">${d.getDate()}</span>
        ${ev.length ? `<span class="cl-chips">${ev.slice(0, 3).map((e) => `<span class="cl-chip" style="--c:${colorOf(e)}" title="${esc(whoOf(e))} · ${esc(e.name)}">${esc(e.name)}</span>`).join("")}${ev.length > 3 ? `<span class="cl-more">+${ev.length - 3}</span>` : ""}</span>` : ""}
      </button>`;
    }
    h += `</div>`;
    if (picked) {
      const d = parse(picked), ev = eventsOn(d, pairs);
      h += `<div class="cl-pick"><b>${dot(d)} (${WK[d.getDay()]})</b>${ev.length ? ev.map((e) => `<span><i class="cl-dot" style="background:${colorOf(e)}"></i>${esc(e.name)} <small>${esc(whoOf(e))}</small></span>`).join("") : "<span class=\"cl-none\">기념일 없음</span>"}</div>`;
    }
    return h;
  }

  App.renderCalendar = function () {
    const all = allPairs(), pairs = all.filter((x) => x.main), upAll = upcoming(all);
    const up = filter === "all" ? upAll : upAll.filter((e) => typeOf(e) === filter);
    const list = up.slice(0, 14).map((e) => `<li class="${e.ev ? "custom" : ""}" ${e.ev ? `data-cal-edit="${esc(e.ev.id)}"` : ""}>
        <span class="cl-dd">${ddTxt(e.left)}</span>
        <div><p class="cl-what"><i class="cl-dot" style="background:${colorOf(e)}"></i>${esc(e.name)}</p><p class="cl-who">${esc(whoOf(e))}</p></div>
        <span class="cl-when">${md(e.date)} (${WK[e.date.getDay()]})${e.ev ? `<span class="cl-acts adm-inline"><button type="button" data-cal-edit="${esc(e.ev.id)}">수정</button><button type="button" data-cal-del="${esc(e.ev.id)}">삭제</button></span>` : ""}</span>
      </li>`).join("");
    const noStart = pairs.length && pairs.every((x) => !x.start);
    return `<div class="cl-page">
      <div class="cl-top"><div><h1>SCHEDULE</h1><p>ANNIVERSARY · D-DAY</p></div>
        <div class="adm-bar cl-adm"><button type="button" class="pill-btn" data-cal-add>+ 기념일</button><button type="button" class="pill-btn" data-cal-manage>기념일 관리</button></div></div>
      <div class="cl-pairs">${pairs.map(pairCard).join("") || `<p class="cl-empty">메인 페어가 없어요.</p>`}</div>
      ${noStart ? `<p class="cl-tip">편집 모드에서 페어마다 <b>날짜 설정</b>을 누르면 처음 만난 날부터 D+일수가 세어지고, 50일 · 주년 기념일이 자동으로 떠요.</p>` : ""}
      <div class="cl-body">
        <div class="cl-cal">${calGrid(all)}</div>
        <div class="cl-up"><h3>UPCOMING</h3>
          <div class="cl-filter">${[["all", "전체"], ...TYPES].map(([k, t]) => `<button type="button" class="${filter === k ? "on" : ""}" data-cal-filter="${k}">${t}<small>${k === "all" ? upAll.length : upAll.filter((e) => typeOf(e) === k).length}</small></button>`).join("")}</div>${list ? `<ul>${list}</ul>` : `<p class="cl-empty">${filter === "all" ? "다가오는 기념일이 없어요." : "이 구분의 기념일이 없어요."}</p>`}</div>
      </div>
    </div>`;
  };

  // ---------- 편집 ----------
  const uid = () => `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  async function save(fn) {
    try {
      await App.saveData((d) => { d.calendar ||= {}; d.calendar.starts ||= {}; d.calendar.events ||= []; fn(d.calendar); });
      App.closeModal();
    } catch (err) { alert(`저장하지 못했어요: ${err.message}`); }
  }
  function startForm(id) {
    const x = mainPairs().find((p) => p.p.id === id);
    if (!x) return;
    App.openModal(`<form class="form cl-form" id="cl-form">
      <h2>D-DAY 설정</h2><p class="desc">${esc(x.title)} · 처음 만난 날(1일째)을 골라주세요.</p>
      <div class="field"><label>날짜</label><input type="date" name="date" value="${x.start ? ymd(x.start) : ""}" required></div>
      <div class="cl-btns"><button type="submit" class="pill-btn solid">저장</button>${x.start ? `<button type="button" class="pill-btn" data-clear>날짜 지우기</button>` : ""}</div>
    </form>`);
    const f = document.getElementById("cl-form");
    f.onsubmit = (e) => { e.preventDefault(); const v = f.date.value; save((c) => { c.starts[id] = v; }); };
    f.querySelector("[data-clear]")?.addEventListener("click", () => save((c) => { delete c.starts[id]; }));
  }
  function eventForm(evId) {
    const ev = (cal().events || []).find((e) => e.id === evId) || { name: "", date: ymd(today()), pair: "", repeat: "yearly", type: filter === "all" ? "" : filter };
    const type = ev.type || (evId ? typeOf({ name: ev.name, ev: {} }) : ""); // 새로 넣을 땐 안 고르면 이름으로 정함
    const pairs = allPairs(), groups = [...new Set(pairs.map((x) => x.group))];
    App.openModal(`<form class="form cl-form" id="cl-form">
      <h2>${evId ? "기념일 수정" : "기념일 추가"}</h2><p class="desc">생일, 결혼기념일 같은 날을 직접 넣어요. 50일 · 주년은 따로 안 넣어도 자동으로 떠요.</p>
      <div class="field"><label>이름</label><input type="text" name="name" value="${esc(ev.name)}" placeholder="예) 리아 생일" required maxlength="40"></div>
      <div class="field"><label>구분 <small>(안 고르면 이름에 '생일' 이 있을 때 생일, 아니면 기타)</small></label><div class="cl-seg">${TYPES.map(([k, t]) => `<label><input type="radio" name="type" value="${k}" ${type === k ? "checked" : ""}><span>${t}</span></label>`).join("")}</div></div>
      <div class="field"><label>페어 · 캐릭터</label><select name="pair"><option value="">공통 (페어 없음)</option>${groups.map((g) => `<optgroup label="${esc(g)}">${pairs.filter((x) => x.group === g).map((x) => `<option value="${esc(x.p.id)}" ${x.p.id === ev.pair ? "selected" : ""}>${esc(x.title)}</option>`).join("")}</optgroup>`).join("")}</select></div>
      <div class="field"><label>날짜</label><input type="date" name="date" value="${esc(ev.date)}" required></div>
      <div class="field"><label>반복</label><div class="cl-seg">
        <label><input type="radio" name="repeat" value="yearly" ${ev.repeat !== "once" ? "checked" : ""}><span>매년</span></label>
        <label><input type="radio" name="repeat" value="once" ${ev.repeat === "once" ? "checked" : ""}><span>한 번만</span></label></div></div>
      <div class="cl-btns"><button type="submit" class="pill-btn solid">저장</button>${evId ? `<button type="button" class="pill-btn" data-del>삭제</button>` : ""}</div>
    </form>`);
    const f = document.getElementById("cl-form");
    f.onsubmit = (e) => {
      e.preventDefault();
      const item = { id: evId || uid(), name: f.name.value.trim(), date: f.date.value, pair: f.pair.value, type: f.type.value || (/생일|birthday/i.test(f.name.value) ? "birthday" : "etc"), repeat: f.repeat.value };
      if (!item.name || !item.date) return;
      save((c) => { const k = c.events.findIndex((x) => x.id === item.id); k >= 0 ? (c.events[k] = item) : c.events.push(item); });
    };
    f.querySelector("[data-del]")?.addEventListener("click", () => { if (confirm("이 기념일을 지울까요?")) save((c) => { c.events = c.events.filter((x) => x.id !== evId); }); });
  }

  function del(id) {
    const ev = (cal().events || []).find((x) => x.id === id);
    if (ev && confirm(`'${ev.name}' 기념일을 지울까요?`)) save((c) => { c.events = c.events.filter((x) => x.id !== id); });
  }
  // 직접 넣은 기념일 전부 (지난 것 · 먼 것 포함) 한눈에 보고 수정 · 삭제
  function manage() {
    const pairs = allPairs(), t = today();
    const list = (cal().events || []).map((ev) => {
      const ed = parse(ev.date);
      let next = ed;
      if (ed && ev.repeat !== "once") { next = new Date(t.getFullYear(), ed.getMonth(), ed.getDate()); if (next < t) next.setFullYear(next.getFullYear() + 1); if (next < ed) next = ed; }
      return { ev, next, x: pairs.find((p) => p.p.id === ev.pair) };
    }).sort((a, b) => (a.next && b.next ? Math.abs(diff(a.next, t)) - Math.abs(diff(b.next, t)) : 0));
    App.openModal(`<div class="form cl-form cl-manage">
      <h2>기념일 관리</h2><p class="desc">직접 넣은 기념일이에요. 50일 · 주년은 자동이라 여기 없어요.</p>
      ${list.length ? `<ul>${list.map(({ ev, next, x }) => {
        const left = next ? diff(next, t) : null;
        return `<li><div><p class="cl-what"><i class="cl-dot" style="background:${x?.color || COLORS[8]}"></i>${esc(ev.name)}</p>
          <p class="cl-who">${esc(x?.title || "공통")} · ${(TYPES.find(([k]) => k === typeOf({ name: ev.name, ev })) || [])[1]} · ${esc(ev.date.replaceAll("-", "."))} · ${ev.repeat === "once" ? "한 번" : "매년"}${left == null ? "" : left < 0 ? " · 지남" : ` · ${ddTxt(left)}`}</p></div>
          <span class="cl-acts"><button type="button" data-cal-edit="${esc(ev.id)}">수정</button><button type="button" data-cal-del="${esc(ev.id)}">삭제</button></span></li>`;
      }).join("")}</ul>` : `<p class="cl-empty">아직 직접 넣은 기념일이 없어요.</p>`}
      <div class="cl-btns"><button type="button" class="pill-btn solid" data-cal-add>+ 기념일 추가</button></div>
    </div>`);
  }

  document.addEventListener("click", (e) => {
    if (!document.querySelector(".cl-page")) return;
    const b = e.target.closest("[data-cal-month],[data-cal-day],[data-cal-add],[data-cal-start],[data-cal-edit],[data-cal-del],[data-cal-manage],[data-cal-filter]");
    if (!b) return;
    if (b.dataset.calFilter) { filter = b.dataset.calFilter; App.render(); return; }
    if (b.dataset.calMonth != null) { monthOff = +b.dataset.calMonth ? monthOff + +b.dataset.calMonth : 0; picked = null; App.render(); }
    else if (b.dataset.calDay) { picked = picked === b.dataset.calDay ? null : b.dataset.calDay; App.render(); }
    else if (b.dataset.calAdd != null) eventForm(null);
    else if (b.dataset.calStart) startForm(b.dataset.calStart);
    else if (b.dataset.calDel) { e.stopPropagation(); del(b.dataset.calDel); }
    else if (b.dataset.calManage != null) manage();
    else if (b.dataset.calEdit && App.admin) eventForm(b.dataset.calEdit);
  });
})();
