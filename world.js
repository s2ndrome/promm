// ARCH World 페이지. ARCH PRIMA 이상이면 edit 모드에서 편집 도구가 보임
(function () {
  const App = window.App;
  const esc = App.esc;

  const ELEMENT_COLORS = { 불: "#ff5a36", 물: "#3aa8ff", 풀: "#5fd36b", 번개: "#f5d03b", 바람: "#9fe8d8", 얼음: "#b9dcff" };
  function attrColor(attr) {
    for (const [k, c] of Object.entries(ELEMENT_COLORS)) if (String(attr).includes(k)) return c;
    return "#9a9a9a"; // 무속성
  }
  const nl = (s) => esc(s).replace(/\n/g, "<br>");
  const pad = (n) => String(n).padStart(2, "0");

  // 편집 도구 (쭌식 + 편집 모드에서만 보임)
  const tools = (col, i, move = true) => App.tools(`world.${col}`, i, move);
  // 목록이면 '추가', 단일 항목이면 '수정' 버튼 (어느 쪽인지는 admin.js 의 SCHEMAS 가 정함)
  const addBtn = (col, label) => `<div class="adm-bar w-adm">${App.addBtn(`world.${col}`, label)}</div>`;

  function chapter(no, en, ko, body) {
    return `<section class="w-chapter reveal" id="w-${no}">
      <header class="w-ch-head">
        <span class="w-ch-no">${no}</span>
        <div>
          <p class="w-ch-en">${esc(en)}</p>
          <h2 class="w-ch-ko">${esc(ko)}</h2>
        </div>
      </header>
      ${body}
    </section>`;
  }

  // 표지 엠블럼: 처음엔 링이 그려지며 등장 → 레이더 스윕, 속성 에너지가 중심에서 퍼져 나가는 모션
  function emblem(elements) {
    const n = elements.length || 6;
    const f = (v) => v.toFixed(1);
    const pts = elements.map((e, i) => {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2;
      return { x: 150 + Math.cos(a) * 112, y: 150 + Math.sin(a) * 112, c: e.color };
    });
    const poly = pts.map((p) => `${f(p.x)},${f(p.y)}`).join(" ");
    const ticks = Array.from({ length: 72 }, (_, k) => {
      const a = (k * 5 * Math.PI) / 180, r1 = k % 6 ? 145 : 141;
      return `<line x1="${f(150 + Math.cos(a) * r1)}" y1="${f(150 + Math.sin(a) * r1)}" x2="${f(150 + Math.cos(a) * 149)}" y2="${f(150 + Math.sin(a) * 149)}"/>`;
    }).join("");
    return `<div class="w-emblem-wrap"><svg class="w-emblem" viewBox="0 0 300 300" aria-hidden="true">
      <defs>
        <radialGradient id="e-core-glow"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <linearGradient id="e-sweep-g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".15"/></linearGradient>
      </defs>
      <g class="e-ticks">${ticks}</g>
      <circle cx="150" cy="150" r="138" class="e-ring e-draw" pathLength="1"/>
      <circle cx="150" cy="150" r="126" class="e-ring thin e-rev"/>
      <circle cx="150" cy="150" r="62" class="e-ring thin e-spin-slow"/>
      <path d="M150 150 L288 150 A138 138 0 0 0 269.5 81 Z" class="e-sweep" fill="url(#e-sweep-g)"/>
      <circle cx="150" cy="150" r="138" class="e-wave"/>
      <circle cx="150" cy="150" r="138" class="e-wave w2"/>
      <g class="e-spin">
        <polygon points="${poly}" class="e-hex" pathLength="1"/>
        ${pts.map((p, i) => `<line x1="150" y1="150" x2="${f(p.x)}" y2="${f(p.y)}" class="e-spoke" style="--d:${i}"/>`).join("")}
        ${pts.map((p, i) => `<line x1="150" y1="150" x2="${f(p.x)}" y2="${f(p.y)}" class="e-pulse" pathLength="1" stroke="${p.c}" style="--d:${i};color:${p.c}"/>`).join("")}
        ${pts.map((p, i) => `<g class="e-node" style="--d:${i};color:${p.c}">
          <circle cx="${f(p.x)}" cy="${f(p.y)}" r="9" class="e-ping" stroke="${p.c}" style="transform-origin:${f(p.x)}px ${f(p.y)}px"/>
          <circle cx="${f(p.x)}" cy="${f(p.y)}" r="9" fill="${p.c}" class="e-dot" style="transform-origin:${f(p.x)}px ${f(p.y)}px"/>
        </g>`).join("")}
      </g>
      <g class="e-orbit"><circle cx="150" cy="12" r="2.6" class="e-spark"/></g>
      <circle cx="150" cy="150" r="46" fill="url(#e-core-glow)" class="e-core-glow"/>
      <clipPath id="e-shield-clip"><path d="M150 108 L183 119 L183 147 C183 170 169 185 150 196 C131 185 117 170 117 147 L117 119 Z"/></clipPath>
      <linearGradient id="e-glint-g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <g class="e-crest">
        <g><path d="M116 121 C104 110 90 108 76 111 C88 118 101 125 116 131" class="e-wing" pathLength="1"/><path d="M116 133 C106 126 94 125 82 128 C93 134 104 139 116 142" class="e-wing" pathLength="1"/><path d="M117 145 C109 141 100 141 91 144 C100 149 108 152 118 153" class="e-wing" pathLength="1"/></g>
        <g transform="translate(300 0) scale(-1 1)"><path d="M116 121 C104 110 90 108 76 111 C88 118 101 125 116 131" class="e-wing" pathLength="1"/><path d="M116 133 C106 126 94 125 82 128 C93 134 104 139 116 142" class="e-wing" pathLength="1"/><path d="M117 145 C109 141 100 141 91 144 C100 149 108 152 118 153" class="e-wing" pathLength="1"/></g>
        <path d="M150 108 L183 119 L183 147 C183 170 169 185 150 196 C131 185 117 170 117 147 L117 119 Z" class="e-shield" pathLength="1"/>
        <path d="M150 117 L175 125.5 L175 147 C175 165 164 177 150 186 C136 177 125 165 125 147 L125 125.5 Z" class="e-shield in" pathLength="1"/>
        <path d="M137 172 L137 151 A13 13 0 0 1 163 151 L163 172" class="e-gate" pathLength="1"/>
        <path d="M131 172 L169 172" class="e-gate" pathLength="1"/>
        <path d="M142 132 L150 126.5 L158 132" class="e-gate" pathLength="1"/>
        <g class="e-star"><path d="M150 146 L152.2 154 L160 156.5 L152.2 159 L150 167 L147.8 159 L140 156.5 L147.8 154 Z"/></g>
        <g clip-path="url(#e-shield-clip)"><rect x="60" y="100" width="34" height="110" fill="url(#e-glint-g)" class="e-glint"/></g>
      </g>
    </svg></div>`;
  }

  App.emblem = emblem; // 로그인 화면에서도 씀

  // 속성 기호: 이모지 대신 얇은 선으로 그린 문양 (이름으로 자동 선택)
  const GLYPHS = {
    fire: '<path d="M24 5c1.5 7.5 10 11 10 21a10 10 0 0 1-20 0c0-5 3-8 5-10 0 4 2 6 4 6-1-6 1-12 1-17z"/><path d="M24 40a4.5 4.5 0 0 1-4.5-4.5c0-3 2.5-4.5 4.5-7.5 2 3 4.5 4.5 4.5 7.5A4.5 4.5 0 0 1 24 40z"/>',
    water: '<path d="M24 5C18 15 12 21.5 12 29a12 12 0 0 0 24 0C36 21.5 30 15 24 5z"/><path d="M18.5 30.5a6 6 0 0 0 5 5.5"/>',
    grass: '<path d="M38 8C20 8 10 17 10 29c0 5 2 9 4 11 2-2 6-4 10-5 9-3 14-12 14-27z"/><path d="M14 40c5-11 12-19 21-27"/><path d="M20 29h7M24 23l7-1"/>',
    bolt: '<path d="M28 4 11 27h11l-4 17 19-25H25l3-15z"/>',
    wind: '<path d="M6 18h22a5 5 0 1 0-5-5"/><path d="M6 25h31a5 5 0 1 1-5 5"/><path d="M6 32h14"/>',
    ice: '<path d="M24 4v40M6.7 14l34.6 20M6.7 34l34.6-20"/><path d="M19 7.5l5 4 5-4M19 40.5l5-4 5 4M7.6 21l6.2-1.3-2-6M40.4 27l-6.2 1.3 2 6M7.6 27l6.2 1.3-2 6M40.4 21l-6.2-1.3 2-6"/>',
    spark: '<path d="M24 6l4 14 14 4-14 4-4 14-4-14-14-4 14-4z"/>',
  };
  function elGlyph(e) {
    const s = `${e.ko || ""} ${e.en || ""}`.toLowerCase();
    const k = /불|pyre|fire/.test(s) ? "fire" : /물|aqua|water/.test(s) ? "water" : /풀|verde|grass|leaf/.test(s) ? "grass"
      : /번개|fulmen|thunder|light/.test(s) ? "bolt" : /바람|aero|wind/.test(s) ? "wind" : /얼음|glacies|ice|frost/.test(s) ? "ice" : "spark";
    return `<svg viewBox="0 0 48 48" aria-hidden="true">${GLYPHS[k]}</svg>`;
  }

  // ---------- 6속성: 캡슐 카드 캐러셀 + 선택된 속성의 오라 이펙트 ----------
  let elIdx = 0;
  const elKind = (e) => {
    const s = `${e.ko || ""} ${e.en || ""}`.toLowerCase();
    return /불|pyre|fire/.test(s) ? "fire" : /물|aqua|water/.test(s) ? "water" : /풀|verde|grass|leaf/.test(s) ? "grass"
      : /번개|fulmen|thunder|light/.test(s) ? "bolt" : /바람|aero|wind/.test(s) ? "wind" : /얼음|glacies|ice|frost/.test(s) ? "ice" : "spark";
  };
  const R = (a, b) => a + Math.random() * (b - a);
  // 부드러운 빛 덩어리 (미리 그려두고 찍어 씀)
  const sprites = {};
  function sprite(rgb) {
    if (sprites[rgb]) return sprites[rgb];
    const cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    const c = cv.getContext("2d"), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(.4, `rgba(${rgb},.45)`); g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    return (sprites[rgb] = cv);
  }
  const blob = (c, rgb, x, y, r, a) => { c.globalAlpha = a; c.drawImage(sprite(rgb), x - r, y - r, r * 2, r * 2); };
  // 캡슐 테두리 위의 점 (각도 a)
  const edge = (cx, cy, w, h, a, pad = 0) => {
    const rx = w / 2 + pad, ry = h / 2 + pad;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  };

  const AURA = {
    fire(c, f, k, t) {
      const { cx, cy, w, h, st } = f;
      st.ps ||= [];
      blob(c, "255,60,30", cx, cy - h * .1, h * 1.1, .35 * k);
      for (let n = 0; n < 10 * k; n++) {
        const u = R(-1.08, 1.08), x = cx + u * w * .5;
        st.ps.push({ x, y: cy - h * .5 + Math.abs(u) ** 2 * h * .5 + R(0, 22), vx: R(-.6, .6) + u * .5, vy: R(-4.2, -1.8), r: R(14, 32), life: 1 });
      }
      c.globalCompositeOperation = "lighter";
      st.ps = st.ps.filter((p) => (p.life -= .026) > 0);
      for (const p of st.ps) {
        p.x += p.vx + Math.sin(t / 120 + p.y / 14) * .6; p.y += p.vy; p.vy *= .99;
        const rgb = p.life > .75 ? "255,236,170" : p.life > .45 ? "255,140,40" : "230,40,20";
        blob(c, rgb, p.x, p.y, p.r * (.4 + p.life * .8), p.life * .55 * k);
      }
    },
    bolt(c, f, k, t) {
      const { cx, cy, w, h, st } = f;
      c.globalCompositeOperation = "lighter";
      blob(c, "255,200,60", cx, cy, h * 1.25, .55 * k);
      // 빛살
      for (let n = 0; n < 64; n++) {
        const a = (n / 64) * Math.PI * 2 + t / 6000;
        const L = (30 + 46 * Math.abs(Math.sin(n * 2.3 + t / 380))) * k;
        const [x1, y1] = edge(cx, cy, w, h, a, 6), [x2, y2] = edge(cx, cy, w, h, a, 6 + L);
        const g = c.createLinearGradient(x1, y1, x2, y2);
        g.addColorStop(0, "rgba(255,230,140,.9)"); g.addColorStop(1, "rgba(255,180,40,0)");
        c.strokeStyle = g; c.lineWidth = n % 3 ? 1 : 2; c.globalAlpha = .8;
        c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      }
      // 전기 아크
      st.arcs ||= [];
      if (Math.random() < .12 * k) {
        const a = R(0, Math.PI * 2), pts = [edge(cx, cy, w, h, a, 2)];
        for (let n = 1; n < 7; n++) pts.push(edge(cx, cy, w, h, a + R(-.12, .12), 2 + n * 9 + R(-4, 4)));
        st.arcs.push({ pts, life: 1 });
      }
      st.arcs = st.arcs.filter((p) => (p.life -= .12) > 0);
      c.strokeStyle = "#fffbe0"; c.lineWidth = 1.6; c.shadowColor = "#ffd23b"; c.shadowBlur = 12;
      for (const a of st.arcs) { c.globalAlpha = a.life; c.beginPath(); a.pts.forEach(([x, y], n) => (n ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); }
      c.shadowBlur = 0;
      // 불티
      st.sp ||= [];
      if (Math.random() < .5 * k) { const a = R(0, 7); st.sp.push({ a, d: 0, v: R(.6, 1.6), r: R(1, 2.6), life: 1 }); }
      st.sp = st.sp.filter((p) => (p.life -= .012) > 0);
      for (const p of st.sp) { p.d += p.v; const [x, y] = edge(cx, cy, w, h, p.a, 10 + p.d); blob(c, "255,215,100", x, y, p.r * 3, p.life * k); }
    },
    grass(c, f, k, t) {
      const { cx, cy, w, h, st } = f;
      blob(c, "60,220,110", cx, cy + h * .05, h * 1.1, .32 * k);
      // 처음 한 번: 캡슐 가장자리에서 뻗어 나갈 덩굴 모양을 만듦 (가지·잎·끝 덩굴손 포함)
      if (!st.vines) {
        st.t0 = t;
        st.vines = [];
        const grow = (x, y, dir, len, curl, depth, delay) => {
          const pts = [[x, y]], leaves = [];
          let a = dir, cv = curl;
          const n = Math.round(len / 3);
          for (let m = 1; m <= n; m++) {
            const u = m / n;
            cv += R(-.004, .004);
            a += cv * (1 + u * u * 6); // 끝으로 갈수록 말려 들어감 (덩굴손)
            x += Math.cos(a) * 3; y += Math.sin(a) * 3;
            pts.push([x, y]);
            if (m % 7 === 0 && u < .85) leaves.push({ m, a: a + (m % 14 ? 1 : -1) * R(.7, 1.2), s: R(4, 7) * (1 - depth * .25) });
            if (depth < 2 && m % 13 === 0 && u > .2 && u < .75 && Math.random() < .7)
              grow(x, y, a + (Math.random() < .5 ? 1 : -1) * R(.6, 1.1), len * R(.35, .55), -curl * R(.8, 1.4), depth + 1, delay + u * 1100);
          }
          st.vines.push({ pts, leaves, depth, delay, ph: R(0, 7), root: [pts[0][0] - cx, pts[0][1] - cy] });
        };
        const N = 9;
        for (let q = 0; q < N; q++) {
          const a = (q / N) * Math.PI * 2 + R(-.2, .2) + .3;
          const [x, y] = edge(0, 0, w, h, a, -2);
          grow(x, y, a + R(-.3, .3), R(70, 125), (Math.random() < .5 ? 1 : -1) * R(.012, .03), 0, q * 90);
        }
      }
      const el = t - st.t0;
      c.lineCap = "round"; c.lineJoin = "round";
      c.shadowColor = "rgba(90,255,150,.9)"; c.shadowBlur = 10;
      for (const v of st.vines) {
        const g = Math.max(0, Math.min(1, (el - v.delay) / 1500));
        if (!g) continue;
        const e = 1 - (1 - g) ** 2, upto = Math.max(1, Math.floor((v.pts.length - 1) * e));
        c.save();
        c.translate(cx, cy);
        // 바람에 살짝 흔들림 (뿌리 기준 회전)
        c.translate(v.root[0], v.root[1]); c.rotate(Math.sin(t / 1300 + v.ph) * .035); c.translate(-v.root[0], -v.root[1]);
        for (let m = 1; m <= upto; m++) {
          const u = m / (v.pts.length - 1);
          c.strokeStyle = `rgba(${Math.round(110 + 110 * u)},${Math.round(225 + 30 * u)},${Math.round(140 + 80 * u)},${.95 * k})`;
          c.lineWidth = Math.max(.6, (3.2 - v.depth * 1) * (1 - u * .8));
          c.beginPath(); c.moveTo(v.pts[m - 1][0], v.pts[m - 1][1]); c.lineTo(v.pts[m][0], v.pts[m][1]); c.stroke();
        }
        for (const lf of v.leaves) {
          if (lf.m > upto) continue;
          const sc = Math.min(1, (upto - lf.m) / 10);
          const [x, y] = v.pts[lf.m];
          c.save(); c.translate(x, y); c.rotate(lf.a);
          const L = lf.s * 2.2 * sc, W2 = lf.s * sc;
          const gr = c.createLinearGradient(0, 0, L, 0);
          gr.addColorStop(0, `rgba(60,190,100,${k})`); gr.addColorStop(1, `rgba(200,255,210,${k})`);
          c.fillStyle = gr;
          c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(L * .5, -W2, L, 0); c.quadraticCurveTo(L * .5, W2, 0, 0); c.fill();
          c.restore();
        }
        c.restore();
      }
      c.shadowBlur = 0;
      // 꽃가루 같은 빛 알갱이
      st.ps ||= [];
      if (Math.random() < .35 * k) { const [x, y] = edge(cx, cy, w, h, R(0, 7), R(10, 80)); st.ps.push({ x, y, vy: R(-.8, -.2), life: 1 }); }
      c.globalCompositeOperation = "lighter";
      st.ps = st.ps.filter((p) => (p.life -= .012) > 0);
      for (const p of st.ps) { p.y += p.vy; p.x += Math.sin(t / 400 + p.y / 30) * .3; blob(c, "180,255,190", p.x, p.y, 5, p.life * .8 * k); }
    },
    wind(c, f, k, t) {
      const { cx, cy, w, h, st } = f;
      st.ws ||= Array.from({ length: 34 }, () => ({ rx: R(8, 70), ry: R(6, 50), ph: R(0, 7), v: R(.012, .03) * (Math.random() < .2 ? -1 : 1), len: R(.5, 1.5), tilt: R(-.25, .25), wd: R(.6, 2) }));
      c.globalCompositeOperation = "lighter";
      blob(c, "60,230,190", cx, cy, h * 1.05, .4 * k);
      for (const s of st.ws) {
        s.ph += s.v;
        const rx = (w / 2 + s.rx * k), ry = (h / 2 + s.ry * k);
        const seg = 14;
        for (let n = 0; n < seg; n++) {
          const a1 = s.ph - (s.len * n) / seg, a2 = s.ph - (s.len * (n + 1)) / seg;
          const p = (a) => [cx + Math.cos(a) * rx * Math.cos(s.tilt) - Math.sin(a) * ry * Math.sin(s.tilt), cy + Math.cos(a) * rx * Math.sin(s.tilt) + Math.sin(a) * ry * Math.cos(s.tilt)];
          const [x1, y1] = p(a1), [x2, y2] = p(a2);
          c.globalAlpha = (1 - n / seg) * .85 * k;
          c.strokeStyle = n < 3 ? "#eafff8" : "#5ff0c8"; c.lineWidth = s.wd;
          c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
        }
      }
    },
    water(c, f, k, t) {
      const { cx, cy, w, h, st } = f;
      c.globalCompositeOperation = "lighter";
      blob(c, "40,140,255", cx, cy, h * 1.1, .4 * k);
      st.rings ||= []; st.next ||= 0;
      if (t > st.next) { st.rings.push({ s: 0, life: 1 }); st.next = t + 620; }
      st.rings = st.rings.filter((r) => (r.life -= .011) > 0);
      for (const r of st.rings) {
        r.s += 1.1;
        c.globalAlpha = r.life * .9 * k; c.strokeStyle = r.life > .6 ? "#d8f0ff" : "#4fb4ff"; c.lineWidth = 1.6 * r.life + .3;
        c.beginPath(); c.ellipse(cx, cy, w / 2 + 6 + r.s, h / 2 + 6 + r.s * .9, 0, 0, Math.PI * 2); c.stroke();
      }
      st.bs ||= [];
      if (Math.random() < .35 * k) st.bs.push({ x: cx + R(-w * .9, w * .9), y: cy + h * .55, r: R(1.5, 4), vy: R(-1.4, -.5), life: 1 });
      st.bs = st.bs.filter((b) => (b.life -= .01) > 0);
      c.strokeStyle = "#cfeaff"; c.lineWidth = 1;
      for (const b of st.bs) { b.y += b.vy; b.x += Math.sin(t / 300 + b.r * 3) * .4; c.globalAlpha = b.life * k; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.stroke(); }
    },
    ice(c, f, k, t) {
      const { cx, cy, w, h, st } = f;
      c.globalCompositeOperation = "lighter";
      blob(c, "150,200,255", cx, cy, h * 1.1, .4 * k);
      st.sh ||= Array.from({ length: 18 }, (_, n) => ({ a: (n / 18) * Math.PI * 2 + R(-.1, .1), L: R(24, 70), wd: R(4, 9), ph: R(0, 7) }));
      const e = 1 - (1 - k) ** 3;
      for (const s of st.sh) {
        const L = s.L * e * (1 + Math.sin(t / 700 + s.ph) * .05);
        const [x0, y0] = edge(cx, cy, w, h, s.a, 2);
        const nx = Math.cos(s.a), ny = Math.sin(s.a) * (h / w) * .6 + Math.sin(s.a) * .4;
        const len = Math.hypot(nx, ny), ux = nx / len, uy = ny / len;
        const g = c.createLinearGradient(x0, y0, x0 + ux * L, y0 + uy * L);
        g.addColorStop(0, "rgba(200,230,255,.85)"); g.addColorStop(1, "rgba(255,255,255,.05)");
        c.fillStyle = g; c.globalAlpha = .9;
        c.beginPath(); c.moveTo(x0 - uy * s.wd / 2, y0 + ux * s.wd / 2); c.lineTo(x0 + ux * L, y0 + uy * L); c.lineTo(x0 + uy * s.wd / 2, y0 - ux * s.wd / 2); c.closePath(); c.fill();
      }
      st.fl ||= Array.from({ length: 30 }, () => ({ a: R(0, 7), d: R(10, 110), tw: R(0, 7), r: R(1.5, 4) }));
      c.strokeStyle = "#f2f8ff"; c.lineWidth = 1;
      for (const p of st.fl) {
        p.a += .002;
        const [x, y] = edge(cx, cy, w, h, p.a, p.d * e);
        c.globalAlpha = (.3 + .7 * Math.abs(Math.sin(t / 500 + p.tw))) * k;
        c.beginPath(); c.moveTo(x - p.r, y); c.lineTo(x + p.r, y); c.moveTo(x, y - p.r); c.lineTo(x, y + p.r); c.stroke();
      }
    },
    spark(c, f, k, t) {
      blob(c, "255,255,255", f.cx, f.cy, f.h, .3 * k);
    },
  };

  let elRaf = 0, elFx = null;
  function setEl(i, first) {
    const els = App.data.world.elements || [];
    if (!els.length) return;
    elIdx = ((i % els.length) + els.length) % els.length;
    const stage = document.querySelector(".el-stage");
    if (!stage) return;
    const n = els.length, mobile = innerWidth < 640;
    const gap = mobile ? 112 : 178;
    stage.querySelectorAll(".el-cap").forEach((cap) => {
      const j = Number(cap.dataset.el);
      let off = (j - elIdx + n) % n;
      if (off > n / 2) off -= n;
      const d = Math.abs(off), lim = mobile ? 1 : 2;
      cap.classList.toggle("on", off === 0);
      cap.style.transform = `translate(-50%, -50%) translateX(${off * gap}px) scale(${off === 0 ? 1.14 : 1 - d * .1})`;
      cap.style.opacity = d > lim ? 0 : off === 0 ? 1 : 1 - d * .28;
      cap.style.zIndex = off === 0 ? 10 : 4 - d; // 이펙트(캔버스 z 5)가 옆 카드 위, 선택 카드 아래
      cap.style.pointerEvents = d > lim ? "none" : "";
    });
    stage.style.setProperty("--el", els[elIdx].color);
    const e = els[elIdx];
    const det = document.getElementById("el-detail");
    det.style.setProperty("--el", e.color);
    det.innerHTML = `<div class="el-detail-in">
        <header><span class="el-detail-ic">${elGlyph(e)}</span><div><h3>${esc(e.ko)}</h3><p>${esc(e.en)}</p></div></header>
        <dl>
          <div><dt>힘의 특징</dt><dd>${nl(e.power)}</dd></div>
          <div><dt>폭주 징후</dt><dd>${nl(e.rampage)}</dd></div>
          <div><dt>속성 가이드</dt><dd>${nl(e.guide)}</dd></div>
        </dl>
        <details class="w-el-rep">
          <summary>기관 내 평판</summary>
          <p><b>센티넬</b> ${nl(e.sentinelRep)}</p>
          <p><b>가이드</b> ${nl(e.guideRep)}</p>
        </details>
        ${tools("elements", elIdx)}
      </div>`;
    // 다른 속성으로 바뀔 때만 이펙트를 처음부터 (화면 크기 변경 등에서는 유지)
    if (!elFx || elFx.i !== elIdx) elFx = { i: elIdx, kind: elKind(e), st: {}, born: performance.now() };
  }

  function startEl() {
    cancelAnimationFrame(elRaf);
    const stage = document.querySelector(".el-stage");
    if (!stage) return;
    elFx = null;
    setEl(elIdx, true);
    const cv = stage.querySelector(".el-fx"), c = cv.getContext("2d");
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = 1, on = true;
    const size = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = stage.clientWidth; H = stage.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
    };
    size();
    if ("IntersectionObserver" in window) new IntersectionObserver(([en]) => (on = en.isIntersecting)).observe(stage);
    const loop = (t) => {
      if (!stage.isConnected) return;
      elRaf = requestAnimationFrame(loop);
      if (!on || !elFx) return;
      if (cv.width !== Math.round(stage.clientWidth * dpr)) size();
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, W, H);
      const cap = stage.querySelector(".el-cap.on");
      if (!cap) return;
      const mobile = innerWidth < 640;
      const w = cap.offsetWidth * 1.14, h = cap.offsetHeight * 1.14;
      const k = still ? 1 : Math.min(1, (t - elFx.born) / 700);
      const f = { cx: W / 2, cy: H * .46, w, h, st: elFx.st };
      c.save();
      (AURA[elFx.kind] || AURA.spark)(c, f, k * (mobile ? .85 : 1), t);
      c.restore();
      c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
    };
    elRaf = requestAnimationFrame(loop);
  }

  document.addEventListener("click", (e) => {
    const cap = e.target.closest(".el-cap");
    if (cap) return setEl(Number(cap.dataset.el));
    const st = e.target.closest("[data-el-step]");
    if (st) setEl(elIdx + Number(st.dataset.elStep));
  });
  // 모바일: 좌우로 밀어서 넘기기
  let swipeX = null;
  document.addEventListener("pointerdown", (e) => { if (e.target.closest(".el-stage")) swipeX = e.clientX; });
  document.addEventListener("pointerup", (e) => {
    if (swipeX == null) return;
    const dx = e.clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 40) setEl(elIdx + (dx < 0 ? 1 : -1));
  });
  window.addEventListener("resize", () => document.querySelector(".el-stage") && setEl(elIdx, true));

  App.renderWorld = function () {
    const w = App.data.world;
    const h = w.hero || {};

    const toc = [
      ["01", "각성자"], ["02", "아크"], ["03", "6속성"], ["04", "요원"],
      ["05", "장소"], ["06", "위협"], ["07", "용어"],
    ];

    const hero = `<section class="w-hero">
      <div class="w-hero-bg"></div>
      ${emblem(w.elements || [])}
      <p class="w-kicker">[${esc(h.title)}] ${esc(h.kicker)}</p>
      <h1 class="w-title">${esc(h.title)}</h1>
      <p class="w-ver">${esc(h.ver)}</p>
      <blockquote class="w-quote">${nl(h.quote)}</blockquote>
      <p class="w-intro">${nl(h.intro)}</p>
      ${addBtn("hero", "표지 수정")}
      <nav class="w-toc">${toc.map(([n, t]) => `<button type="button" data-wjump="w-${n}"><b>${n}</b>${t}</button>`).join("")}</nav>
    </section>`;

    // 01 각성자
    const awakened = (w.awakened || []).map((a, i) => `<article class="w-panel w-role">
        <p class="w-role-en">${esc(a.en)}</p>
        <h3>${esc(a.title)}</h3>
        <p>${nl(a.body)}</p>
        ${tools("awakened", i)}
      </article>`).join("");
    const guiding = (w.guiding || []).map((g, i) => `<div class="w-rule">
        <span class="w-rule-no">${pad(i + 1)}</span>
        <div><h4>${esc(g.title)}</h4><p>${nl(g.body)}</p></div>
        ${tools("guiding", i)}
      </div>`).join("");
    const ch1 = chapter("01", "THE AWAKENED", "각성자: 센티넬과 가이드", `
      <div class="w-grid-2">${awakened}</div>${addBtn("awakened", "항목 추가")}
      <h3 class="w-sub">'가이딩(Guiding)' 상세 규약</h3>
      <div class="w-rules">${guiding}</div>${addBtn("guiding", "규약 추가")}`);

    // 02 아크
    const a = w.arch || {};
    const ranks = (w.ranks || []).map((r, i) => `<div class="w-rank">
        <span class="w-rank-grade ${String(r.grade || "").length > 4 ? "long" : String(r.grade || "").length > 2 ? "mid" : ""}">${esc(r.grade)}</span>
        <div class="w-rank-body">
          <h4>${esc(r.name)} <small>${esc(r.en)}</small></h4>
          <p>${nl(r.desc)}</p>
          ${r.rep ? `<p class="w-rank-rep">${nl(r.rep)}</p>` : ""}
        </div>
        ${tools("ranks", i)}
      </div>`).join("");
    const rules = (w.partnerRules || []).map((r, i) => `<article class="w-panel">
        <h4>${esc(r.title)}</h4><p>${nl(r.body)}</p>${tools("partnerRules", i)}
      </article>`).join("");
    const ch2 = chapter("02", "THE SHIELD OF HUMANITY", "인류의 방패: 아크 (ARCH)", `
      <p class="w-lead">${nl(a.intro)}</p>
      <figure class="w-motto">
        <blockquote>“${esc(a.identityQuote)}”</blockquote>
        <figcaption>${nl(a.identity)}</figcaption>
      </figure>
      ${addBtn("arch", "소개 수정")}
      <h3 class="w-sub">직급 체계</h3>
      <div class="w-ranks">${ranks}</div>${addBtn("ranks", "직급 추가")}
      <h3 class="w-sub">파트너 배정 규정</h3>
      <div class="w-grid-2">${rules}</div>${addBtn("partnerRules", "규정 추가")}`);

    // 03 6속성
    const ei = w.elementsIntro || {};
    const els = w.elements || [];
    if (elIdx >= els.length) elIdx = 0;
    const elements = els.length ? `<div class="el-stage" style="--el:${esc(els[elIdx].color)}">
        <canvas class="el-fx" aria-hidden="true"></canvas>
        <div class="el-track">${els.map((e, i) => `<button type="button" class="el-cap" data-el="${i}" style="--c:${esc(e.color)}">
          <span class="el-cap-no">${pad(i + 1)}</span>
          <span class="el-cap-ic">${elGlyph(e)}</span>
          <b>${esc(e.ko)}</b><small>${esc(e.en)}</small>
        </button>`).join("")}</div>
        <button type="button" class="el-nav prev" data-el-step="-1" aria-label="이전 속성">‹</button>
        <button type="button" class="el-nav next" data-el-step="1" aria-label="다음 속성">›</button>
      </div>
      <div class="el-detail" id="el-detail"></div>` : "";
    const ch3 = chapter("03", "THE SIX ELEMENTS", "6가지 속성의 힘", `
      <div class="w-grid-2 w-el-intro">
        <article class="w-panel"><p class="w-role-en">ELEMENTAL SENTINEL</p><h3>속성 센티넬: 절대적인 공격수</h3><p>${nl(ei.sentinel)}</p></article>
        <article class="w-panel"><p class="w-role-en">ELEMENTAL GUIDE</p><h3>속성 가이드: 유일한 서포터</h3><p>${nl(ei.guide)}</p></article>
      </div>
      ${addBtn("elementsIntro", "설명 수정")}
      ${elements}${addBtn("elements", "속성 추가")}`);

    // 04 로스터
    const agent = (m, k, i) => `<figure class="w-agent" data-agent="${i}:${k}" style="--el:${attrColor(m.attr)}">
        <div class="w-agent-photo ${m.photo ? "" : "empty"}">${m.photo
          ? `<img src="${esc(App.mediaUrl(m.photo))}" alt="${esc(m.name)}" loading="lazy" onerror="this.parentNode.classList.add('empty');this.remove()">`
          : ""}</div>
        <figcaption><b>${esc(m.name)}</b><small>${esc(m.attr)}</small></figcaption>
      </figure>`;
    const teams = (w.teams || []).map((t, i) => `<article class="w-team" data-team="${i}">
        <header><h3>${esc(t.name)}</h3><span>${esc(t.cls)}</span><em class="w-rel-open">관계도 ›</em></header>
        ${(t.members || []).length
          ? `<div class="w-agents">${t.members.map((m, k) => agent(m, k, i)).join("")}</div>`
          : `<p class="w-agents-empty">COMING SOON</p>`}
        ${tools("teams", i)}
      </article>`).join("");
    const ch4 = chapter("04", "AGENTS", "요원", `<div class="w-teams">${teams}</div>${addBtn("teams", "팀 추가")}`);

    // 05 장소
    const places = (w.places || []).map((p, i) => `<article class="w-place">
        <span class="w-place-no">${pad(i + 1)}</span>
        <p class="w-place-en">${esc(p.en)}</p>
        <h3>${esc(p.name)}</h3>
        <p>${nl(p.body)}</p>
        ${tools("places", i)}
      </article>`).join("");
    const ch5 = chapter("05", "LOCATIONS", "장소", `<div class="ag-slot" id="ag-slot"></div><button type="button" class="st-open" data-suites>S-CLASS QUARTERS · ROOM TOUR <span>S급 숙소 8개 둘러보기 ›</span></button><div class="w-places">${places}</div>${addBtn("places", "장소 추가")}`);

    // 06 위협
    const threats = (w.threats || []).map((t, i) => `<article class="w-threat">
        <p class="w-place-en">${esc(t.en)}</p><h3>${esc(t.name)}</h3><p>${nl(t.body)}</p>${tools("threats", i)}
      </article>`).join("");
    const ch6 = chapter("06", "THREATS", "적 · 괴수 · 빌런", `
      <div class="w-threats">${threats}</div>${addBtn("threats", "위협 추가")}
      <div class="w-codered"><span class="w-siren"></span><div><h3>CODE RED · 긴급 출동</h3><p>${nl(w.codeRed?.body)}</p></div></div>
      ${addBtn("codeRed", "코드 레드 수정")}`);

    // 07 용어
    const terms = (w.terms || []).map((t, i) => `<details class="w-term">
        <summary><span>${esc(t.term)}</span><small>${esc(t.en)}</small></summary>
        <p>${nl(t.body)}</p>
        ${tools("terms", i)}
      </details>`).join("");
    const ch7 = chapter("07", "GLOSSARY", "기타 용어", `<div class="w-terms">${terms}</div>${addBtn("terms", "용어 추가")}`);

    return `<div class="world-page">${hero}<div class="w-body">${ch1}${ch2}${ch3}${ch4}${ch5}${ch6}${ch7}</div>
      <p class="w-end">— END OF DOCUMENT —</p>${addBtn("jj", "쭌식이 메모 (채팅 전용 설정)")}</div>`;
  };

  // 페이지가 그려진 뒤: 스크롤 등장 효과
  // 엠블럼: 마우스를 따라 살짝 기울어짐
  document.addEventListener("pointermove", (e) => {
    const em = document.querySelector(".w-emblem");
    if (!em || e.pointerType !== "mouse") return;
    const r = em.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
    const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
    em.style.setProperty("--ry", `${(dx * 28).toFixed(2)}deg`);
    em.style.setProperty("--rx", `${(-dy * 28).toFixed(2)}deg`);
  });

  App.afterWorld = function () {
    startEl();
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) return els.forEach((e) => e.classList.add("in"));
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }, { rootMargin: "0px 0px -10% 0px" });
    els.forEach((e) => io.observe(e));
  };

  // ---------- 요원 상세 프로필 (증명사진을 누르면 팝업) ----------
  // 붙여넣은 HTML 에서 스크립트·이벤트 속성 등 위험한 것만 걷어냄 (style 은 유지)
  function cleanHtml(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script, iframe, object, embed, link, meta, base, form, frame, frameset").forEach((n) => n.remove());
    doc.body.querySelectorAll("*").forEach((n) => {
      for (const a of [...n.attributes]) {
        const v = a.value.replace(/\s/g, "").toLowerCase();
        if (/^on/i.test(a.name) || (/^(href|src|xlink:href|action|formaction)$/i.test(a.name) && /^(javascript|vbscript|data:text)/.test(v)))
          n.removeAttribute(a.name);
      }
    });
    return doc.body.innerHTML;
  }

  function openAgent(ti, mi) {
    const t = App.data.world.teams[ti];
    const m = t?.members?.[mi];
    if (!m) return;
    const canEdit = App.admin && App.rank >= 3;
    const body = m.card
      ? `<div class="agent-card">${cleanHtml(m.card)}</div>`
      : `<div class="agent-basic" style="--el:${attrColor(m.attr)}">
          <div class="agent-basic-ph ${m.photo ? "" : "empty"}">${m.photo ? `<img src="${esc(App.mediaUrl(m.photo))}" alt="">` : ""}</div>
          <p class="agent-basic-team">${esc(t.name)} · ${esc(t.cls || "")}</p>
          <h2>${esc(m.name)}</h2>
          ${m.attr ? `<p class="agent-basic-attr">${esc(m.attr)}</p>` : ""}
          ${m.desc ? `<p class="agent-basic-desc">${esc(m.desc)}</p>` : ""}
          <p class="agent-basic-empty">CLASSIFIED${canEdit ? " · 팀 ✎ 편집에서 이 요원의 상세 프로필 HTML 을 붙여넣어 주세요" : ""}</p>
        </div>`;
    App.openModal(body);
    document.querySelector(".modal-box").classList.add("agent-box");
  }

  // ---------- 인물 관계도 (팀을 누르면 팝업) ----------
  const LOVE = /사랑|연인|애인|짝사랑|썸|약혼|부부|♥|❤|좋아/;
  const HATE = /라이벌|혐관|대립|적대|원수|증오|경쟁|싫어|앙숙/;
  const relColor = (label) => (LOVE.test(label) ? "#ff7aa8" : HATE.test(label) ? "#ff5a4f" : "#bdbdbd");

  let chart = null; // { i, pos: {이름: [x%, y%]}, dirty }

  function defaultPos(members) {
    const n = members.length, pos = {};
    members.forEach((m, k) => {
      if (n === 1) return (pos[m.name] = [50, 50]);
      const a = (Math.PI * 2 * k) / n - Math.PI / 2;
      pos[m.name] = [50 + Math.cos(a) * 36, 50 + Math.sin(a) * 34];
    });
    return pos;
  }

  function openChart(i) {
    const t = App.data.world.teams[i];
    const members = t.members || [];
    const base = defaultPos(members);
    chart = { i, pos: Object.fromEntries(members.map((m) => [m.name, (t.pos || {})[m.name] || base[m.name]])), dirty: false };
    const canEdit = App.admin && App.rank >= 3;
    App.openModal(`<div class="rel-pop">
      <header class="rel-head">
        <p>${esc(t.cls || "")}</p>
        <h2>${esc(t.name)}</h2>
        <span>인물 관계도</span>
      </header>
      <div class="rel-canvas" id="rel-canvas">
        <svg class="rel-lines" id="rel-svg"></svg>
        ${members.map((m) => `<div class="rel-node" data-node="${esc(m.name)}" style="--el:${attrColor(m.attr)}">
          <div class="rel-ph ${m.photo ? "" : "empty"}">${m.photo ? `<img src="${esc(App.mediaUrl(m.photo))}" alt="" draggable="false" onerror="this.parentNode.classList.add('empty');this.remove()">` : ""}</div>
          <b>${esc(m.name)}</b>
        </div>`).join("")}
        <div id="rel-labels"></div>
      </div>
      ${(t.relations || []).length ? "" : `<p class="rel-empty">아직 관계가 없어요.${canEdit ? " 팀 ✎ 편집에서 관계를 적어주세요." : ""}</p>`}
      ${canEdit ? `<div class="rel-tools"><span>사진을 끌어서 배치를 바꿀 수 있어요</span>
        <button type="button" class="pill-btn" data-rel="reset">자동 배치</button>
        <button type="button" class="pill-btn dark" data-rel="save" disabled>배치 저장</button></div>` : ""}
    </div>`);
    document.querySelector(".modal-box").classList.add("rel-box");
    drawChart();
    if (canEdit) enableDrag();
  }

  function drawChart() {
    const cv = document.getElementById("rel-canvas");
    if (!cv || !chart) return;
    const t = App.data.world.teams[chart.i];
    const W = cv.clientWidth, H = cv.clientHeight;
    const P = (name) => { const p = chart.pos[name]; return p && [p[0] / 100 * W, p[1] / 100 * H]; };
    cv.querySelectorAll(".rel-node").forEach((n) => {
      const p = chart.pos[n.dataset.node];
      n.style.left = `${p[0]}%`;
      n.style.top = `${p[1]}%`;
    });
    const ph = cv.querySelector(".rel-ph");
    const pr = ph ? ph.offsetWidth / 2 : 30;
    const R = pr + 6; // 사진 테두리에서 선이 끝나도록
    // 아래쪽으로 나가는 선은 이름표 밑에서 끝나게 (화살표가 이름에 가리지 않게)
    const depth = {};
    cv.querySelectorAll(".rel-node").forEach((n) => (depth[n.dataset.node] = n.offsetHeight - pr + 6));
    const gap = (name, down) => Math.max(R, down * (depth[name] || R));
    const rels = (t.relations || []).filter((r) => P(r.from) && P(r.to) && r.from !== r.to);
    const key = (a, b) => [a, b].sort().join("\u0000");
    const count = {};
    rels.forEach((r) => (count[key(r.from, r.to)] = (count[key(r.from, r.to)] || 0) + 1));
    const seen = {};
    let defs = "", lines = "", labels = "";
    rels.forEach((r, k) => {
      const [x1, y1] = P(r.from), [x2, y2] = P(r.to);
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      // 같은 두 사람 사이에 관계가 둘이면 서로 반대쪽으로 휘게
      const kk = key(r.from, r.to);
      seen[kk] = (seen[kk] || 0) + 1;
      // 방향이 반대면 수직 방향도 뒤집히므로 이름 순서로 맞춰서 번갈아 양쪽으로
      const bend = count[kk] > 1 ? (seen[kk] % 2 ? 1 : -1) * (r.from < r.to ? 1 : -1) * Math.min(46, len * 0.18) : 0;
      const g1 = gap(r.from, uy), g2 = gap(r.to, -uy);
      const sx = x1 + ux * g1, sy = y1 + uy * g1, ex = x2 - ux * g2, ey = y2 - uy * g2;
      const cx = (sx + ex) / 2 - uy * bend * 2, cy = (sy + ey) / 2 + ux * bend * 2;
      const col = relColor(r.label);
      const id = `rm${k}`;
      defs += `<marker id="${id}e" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${col}"/></marker>`;
      const dash = r.dir === "none" ? ` stroke-dasharray="5 5"` : "";
      const mEnd = r.dir === "none" ? "" : ` marker-end="url(#${id}e)"`;
      const mStart = r.dir === "both" ? ` marker-start="url(#${id}e)"` : "";
      lines += `<path d="M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}" stroke="${col}" stroke-width="1.8" fill="none"${dash}${mEnd}${mStart}/>`;
      if (r.label) {
        const lx = 0.25 * sx + 0.5 * cx + 0.25 * ex, ly = 0.25 * sy + 0.5 * cy + 0.25 * ey;
        labels += `<span class="rel-label" style="left:${lx}px;top:${ly}px;--c:${col}">${LOVE.test(r.label) ? "♥ " : ""}${esc(r.label)}</span>`;
      }
    });
    const svg = document.getElementById("rel-svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = `<defs>${defs}</defs>${lines}`;
    document.getElementById("rel-labels").innerHTML = labels;
  }

  function enableDrag() {
    const cv = document.getElementById("rel-canvas");
    let drag = null;
    cv.addEventListener("pointerdown", (e) => {
      const n = e.target.closest(".rel-node");
      if (!n) return;
      e.preventDefault();
      drag = n.dataset.node;
      n.setPointerCapture(e.pointerId);
      n.classList.add("dragging");
    });
    cv.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const r = cv.getBoundingClientRect();
      const x = Math.min(94, Math.max(6, ((e.clientX - r.left) / r.width) * 100));
      const y = Math.min(90, Math.max(8, ((e.clientY - r.top) / r.height) * 100));
      chart.pos[drag] = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
      chart.dirty = true;
      document.querySelector('[data-rel="save"]').disabled = false;
      drawChart();
    });
    const end = () => {
      if (!drag) return;
      cv.querySelector(".dragging")?.classList.remove("dragging");
      drag = null;
    };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
  }

  async function saveChartPos() {
    const btn = document.querySelector('[data-rel="save"]');
    btn.disabled = true;
    const team = JSON.parse(JSON.stringify(App.data.world.teams[chart.i]));
    const pos = chart.pos;
    try {
      // 이 팀의 배치만 바꿔서 저장 (다른 데 바뀐 건 그대로)
      await App.saveData((d) => { const k = App.locate(d.world.teams, team, chart.i); if (k >= 0) d.world.teams[k].pos = pos; });
      chart.dirty = false;
      // 저장하면 페이지가 다시 그려지므로 팝업도 다시 열기
      openChart(chart.i);
    } catch (err) {
      btn.disabled = false;
      alert(`저장하지 못했어요: ${err.message}`);
    }
  }

  window.addEventListener("resize", () => drawChart());

  document.addEventListener("click", (e) => {
    const j = e.target.closest("[data-wjump]");
    if (j) return document.getElementById(j.dataset.wjump)?.scrollIntoView({ behavior: "smooth", block: "start" });
    const rb = e.target.closest("[data-rel]");
    if (rb) {
      if (rb.dataset.rel === "save") return saveChartPos();
      if (rb.dataset.rel === "reset") {
        const t = App.data.world.teams[chart.i];
        chart.pos = defaultPos(t.members || []);
        chart.dirty = true;
        document.querySelector('[data-rel="save"]').disabled = false;
        return drawChart();
      }
    }
    // 요원 증명사진을 누르면 그 요원 상세 프로필
    const ag = e.target.closest("[data-agent]");
    if (ag && !e.target.closest(".adm-tools, [data-act]")) {
      const [ti, mi] = ag.dataset.agent.split(":").map(Number);
      return openAgent(ti, mi);
    }
    // 팀 카드를 누르면 관계도 (편집 버튼은 제외)
    const team = e.target.closest("[data-team]");
    if (team && !e.target.closest(".adm-tools, [data-act]")) openChart(Number(team.dataset.team));
  });
})();
