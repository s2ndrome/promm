// ARCH 페이지 05 장소: 아이기스를 3D 로 둘러보는 뷰어 (three.js 는 화면에 보일 때만 불러옴)
(function () {
  const App = window.App;
  const THREE_SRC = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

  // 시설 위치. match 는 05 장소 목록에서 설명을 찾아올 때 쓰는 이름 일부
  const ZONES = [
    { key: "core", label: "센트럴 코어 / 관제탑", match: "센트럴", en: "CENTRAL CORE", pos: [0, 30, 0], dist: 95, big: true },
    { key: "garden", label: "하늘정원", match: "하늘정원", en: "SKY GARDEN", pos: [-30, 33, -34], dist: 48 },
    { key: "sclass", label: "S급 전용관", match: "개인실", en: "S-CLASS QUARTERS", pos: [34, 10, -28], dist: 46 },
    { key: "med", label: "의무실", match: "의무실", en: "MEDICAL WING", pos: [44, 6, 4], dist: 40 },
    { key: "dock", label: "선착장", match: "선착장", en: "LANDING DOCK", pos: [50, 4, 34], dist: 42 },
    { key: "train", label: "훈련구역", match: "훈련소", en: "TRAINING DOME", pos: [-42, 8, -6], dist: 44 },
    { key: "stab", label: "비상 안정화실", match: "안정화", en: "EMERGENCY STABILIZATION", pos: [-36, 5, 26], dist: 38 },
    { key: "gate", label: "메인 게이트", match: "게이트", en: "MAIN GATE", pos: [0, 3, 58], dist: 48 },
    { key: "lounge", label: "라운지", match: "라운지", en: "LOUNGE", pos: [-10, 7, 6], dist: 30, small: true },
    { key: "harmony", label: "하모니 상담실", match: "하모니", en: "HARMONY COUNSELING", pos: [10, 7, 6], dist: 30, small: true },
    { key: "lab", label: "공명연구실", match: "공명", en: "RESONANCE LAB", pos: [9, 7, -8], dist: 30, small: true },
    { key: "arena", label: "특별통제 훈련장 (지하)", match: "특별통제", en: "SPECIAL CONTROL ARENA", pos: [0, -10, 0], dist: 42, small: true },
  ];

  let THREE, root, renderer, scene, camera, clock, water, waterBase, tags = [], pickables = [];
  let garden, crafts = [], blinkers = [], loading = null, running = false, visible = false, tourTimer = null;
  const view = { theta: 0.35, phi: 1.05, radius: 150, target: null };
  let fly = null; // 카메라 이동 애니메이션
  let idleAt = 0;

  function loadThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    loading ||= new Promise((ok, no) => {
      const s = document.createElement("script");
      s.src = THREE_SRC;
      s.onload = () => ok(window.THREE);
      s.onerror = () => { loading = null; no(new Error("3D 엔진을 불러오지 못했어요")); };
      document.head.appendChild(s);
    });
    return loading;
  }

  // ---------- 텍스처 (그림 파일 없이 캔버스로 그림) ----------
  function canvasTex(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }
  let rnd = 7;
  const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);

  // 벽: 짙은 강철 패널 + 가로 창문 띠 (창문 띠만 은은하게 빛남)
  function wallTex(glow) {
    rnd = 7;
    return canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = glow ? "#000" : "#2f3640"; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 128) {
        if (!glow) {
          g.fillStyle = "#3a424d"; g.fillRect(0, y, w, 80);
          g.fillStyle = "#262c35"; for (let x = 0; x < w; x += 32) g.fillRect(x, y, 2, 80);
          g.fillStyle = "#4a5361"; g.fillRect(0, y + 80, w, 3);
          g.fillStyle = "#1b2029"; g.fillRect(0, y + 116, w, 12);
        }
        for (let x = 0; x < w; x += 16) {
          const r = rand();
          g.fillStyle = r > .78 ? "#d8ecff" : r > .45 ? "#3f78b8" : glow ? "#0a1a2c" : "#152132";
          g.fillRect(x + 1, y + 88, 14, 22);
        }
      }
    });
  }
  function signTex(top, bottom) {
    return canvasTex(512, 220, (g, w, h) => {
      g.fillStyle = "#1a2029"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#8fa6c0"; g.lineWidth = 4; g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = "#e9eef5"; g.textAlign = "center";
      g.font = "700 96px Georgia, serif"; g.fillText(top, w / 2, 120);
      g.font = "600 40px Georgia, serif"; g.fillText(bottom, w / 2, 182);
      // 날개
      g.strokeStyle = "#c9d6e6"; g.lineWidth = 3;
      for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
        g.beginPath(); g.moveTo(w / 2 + s * 150, 80 + i * 12); g.lineTo(w / 2 + s * (210 + i * 8), 50 + i * 16); g.stroke();
      }
    });
  }
  function bannerTex() {
    return canvasTex(128, 512, (g, w, h) => {
      g.fillStyle = "#16233a"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#7aa6e0"; g.lineWidth = 3; g.strokeRect(10, 10, w - 20, h - 20);
      g.fillStyle = "#dfe8f5"; g.textAlign = "center"; g.font = "700 30px Georgia, serif";
      g.fillText("ARCH", w / 2, 210);
      g.beginPath(); g.moveTo(w / 2, 90); g.lineTo(w / 2 + 30, 110); g.lineTo(w / 2 + 24, 160); g.lineTo(w / 2, 180); g.lineTo(w / 2 - 24, 160); g.lineTo(w / 2 - 30, 110); g.closePath(); g.stroke();
    });
  }
  function runwayTex() {
    const t = canvasTex(128, 1024, (g, w, h) => {
      g.fillStyle = "#2a3039"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#c8d2de";
      for (let y = 40; y < h - 200; y += 70) g.fillRect(w / 2 - 3, y, 6, 36);
      g.fillRect(8, 0, 4, h); g.fillRect(w - 12, 0, 4, h);
      g.font = "700 64px Arial"; g.textAlign = "center";
      g.save(); g.translate(w / 2, h - 90); g.fillText("01", 0, 0); g.restore();
      for (let i = 0; i < 6; i++) g.fillRect(20 + i * 15, h - 60, 8, 50);
    });
    return t;
  }
  function padTex() {
    return canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "#3b434f"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#cfe3ff"; g.lineWidth = 6;
      g.beginPath(); g.arc(128, 128, 100, 0, 7); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.arc(128, 128, 115, 0, 7); g.stroke();
      g.fillStyle = "#e6eef8"; g.font = "700 110px Arial"; g.textAlign = "center"; g.fillText("H", 128, 166);
    });
  }
  function skyTex() {
    return canvasTex(4, 512, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, "#1d3a66"); gr.addColorStop(.45, "#4f7aa8"); gr.addColorStop(.62, "#a9c1d8"); gr.addColorStop(1, "#c9d7e3");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
  }
  function puffTex() {
    return canvasTex(256, 128, (g, w, h) => {
      for (let i = 0; i < 26; i++) {
        const x = 40 + rand() * 176, y = 50 + rand() * 40, r = 18 + rand() * 30;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }
    });
  }

  // ---------- 장면 만들기 ----------
  let M; // 재질 모음
  function makeMaterials() {
    const win = wallTex(false), em = wallTex(true);
    const wall = (rx, ry) => {
      const map = win.clone(), emi = em.clone();
      for (const t of [map, emi]) { t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); }
      return new THREE.MeshStandardMaterial({ map, emissiveMap: emi, emissive: 0xffffff, emissiveIntensity: .85, metalness: .55, roughness: .42 });
    };
    M = {
      wall,
      deck: new THREE.MeshStandardMaterial({ color: 0x2a3039, metalness: .5, roughness: .55 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x222831, metalness: .5, roughness: .5 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x4b5562, metalness: .6, roughness: .35 }),
      glow: new THREE.MeshBasicMaterial({ color: 0x6fc0ff }),
      glass: new THREE.MeshStandardMaterial({ color: 0x9fd2ff, metalness: .1, roughness: .05, transparent: true, opacity: .35, emissive: 0x2a5d8f, emissiveIntensity: .4 }),
      leaf: new THREE.MeshStandardMaterial({ color: 0x2f5a34, roughness: .9 }),
      rock: new THREE.MeshStandardMaterial({ color: 0x4a443c, roughness: .95 }),
      marble: new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: .6 }),
      foam: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35 }),
      red: new THREE.MeshBasicMaterial({ color: 0xff4040 }),
    };
  }

  function mesh(geo, mat, x = 0, y = 0, z = 0, zone) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (zone) { m.userData.zone = zone; pickables.push(m); }
    scene.add(m);
    return m;
  }
  const cyl = (rt, rb, h, seg = 48) => new THREE.CylinderGeometry(rt, rb, h, seg);
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  // 옆면만 창문, 윗면·아랫면은 강철 판
  const wallBox = (rx, ry) => { const w = M.wall(rx, ry); return [w, w, M.deck, M.dark, w, w]; };

  function ring(x, y, z, r, tube = .18) {
    const m = mesh(new THREE.TorusGeometry(r, tube, 6, 64), M.glow, x, y, z);
    m.rotation.x = Math.PI / 2;
    return m;
  }
  function foam(x, z, r) {
    const m = mesh(new THREE.RingGeometry(r, r + 1.6, 48), M.foam, x, .08, z);
    m.rotation.x = -Math.PI / 2;
  }
  // 둥근 플랫폼(층층이)
  function platform(x, z, r, tiers, zone) {
    let y = -1, rr = r;
    tiers.forEach((h, i) => {
      const circ = 2 * Math.PI * rr;
      mesh(cyl(rr, rr * (i ? 1 : 1.06), h), M.wall(Math.round(circ / 7), Math.max(1, Math.round(h / 4))), x, y + h / 2, z, zone);
      mesh(cyl(rr + .3, rr + .3, .5), M.deck, x, y + h, z, zone);
      ring(x, y + h + .3, z, rr + .1);
      y += h; rr *= .72;
    });
    foam(x, z, r * 1.06);
    return y;
  }
  function bridge(x1, z1, x2, z2, w = 3, y = .8) {
    const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
    const m = mesh(box(w, 1.4, len), M.deck, (x1 + x2) / 2, y, (z1 + z2) / 2);
    m.rotation.y = Math.atan2(dx, dz);
    const l = mesh(box(.15, .15, len), M.glow, (x1 + x2) / 2, y + .75, (z1 + z2) / 2);
    l.rotation.y = m.rotation.y;
  }
  function tree(x, y, z, s = 1) {
    mesh(cyl(.12 * s, .18 * s, 1.2 * s, 6), M.rock, x, y + .6 * s, z);
    mesh(new THREE.SphereGeometry(.9 * s, 8, 6), M.leaf, x, y + 1.6 * s, z);
  }
  function aircraft() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(box(1.2, .5, 4.2), M.dark));
    const wing = new THREE.Mesh(box(6, .12, 1.4), M.steel); wing.position.z = .3; g.add(wing);
    for (const s of [-1, 1]) {
      const eng = new THREE.Mesh(cyl(.35, .35, 1.4, 10), M.dark); eng.rotation.x = Math.PI / 2; eng.position.set(s * 2.6, 0, .4); g.add(eng);
      const lt = new THREE.Mesh(new THREE.SphereGeometry(.14, 6, 4), M.glow); lt.position.set(s * 3, 0, .3); g.add(lt);
    }
    const blink = new THREE.Mesh(new THREE.SphereGeometry(.16, 6, 4), M.red); blink.position.set(0, .35, -1.6); g.add(blink);
    blinkers.push(blink);
    scene.add(g);
    return g;
  }

  function buildScene() {
    scene = new THREE.Scene();
    scene.background = skyTex();
    scene.fog = new THREE.Fog(0x9fb4c9, 260, 760);
    camera = new THREE.PerspectiveCamera(42, 1, .5, 1400);
    view.target = new THREE.Vector3(0, 10, 0);
    scene.add(new THREE.HemisphereLight(0xc9dcf5, 0x0a1622, .75));
    const sun = new THREE.DirectionalLight(0xfff4e6, 1.25); sun.position.set(-80, 120, 60); scene.add(sun);
    const rim = new THREE.DirectionalLight(0x7fb2ff, .5); rim.position.set(90, 40, -80); scene.add(rim);
    makeMaterials();
    const Z = Object.fromEntries(ZONES.map((z) => [z.key, z]));

    // 바다
    const wg = new THREE.PlaneGeometry(900, 900, 110, 110);
    wg.rotateX(-Math.PI / 2);
    waterBase = Float32Array.from(wg.attributes.position.array);
    water = mesh(wg, new THREE.MeshPhongMaterial({ color: 0x0a2236, specular: 0x9cc4ee, shininess: 70, transparent: true, opacity: .9 }));

    // 중앙 허브 + 관제탑
    platform(0, 0, 17, [4, 3.4, 2.6], Z.core);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + .5, x = Math.cos(a) * 6.5, z = Math.sin(a) * 6.5, h = 18 + (i % 3) * 6;
      mesh(box(2.2, h, 2.2), wallBox(1, Math.round(h / 5)), x, 9 + h / 2, z, Z.core);
      mesh(new THREE.ConeGeometry(1.1, 6, 4), M.steel, x, 9 + h + 3, z, Z.core);
    }
    mesh(box(5.5, 42, 5.5), wallBox(2, 9), 0, 9 + 21, 0, Z.core);
    mesh(box(4, 10, 4), wallBox(2, 3), 0, 56, 0, Z.core);
    mesh(new THREE.ConeGeometry(1.6, 16, 4), M.steel, 0, 69, 0, Z.core);
    for (const y of [20, 34, 48]) ring(0, y, 0, 4.4, .12);

    // 지하 특별통제 훈련장 (물 아래로 희미하게 보임)
    mesh(cyl(9, 9, 5, 8), new THREE.MeshStandardMaterial({ color: 0x1c2a3a, emissive: 0x1e5aa0, emissiveIntensity: .5, transparent: true, opacity: .8 }), 0, -10, 0, Z.arena);
    ring(0, -7.4, 0, 9.2, .25);

    // 허브 위 작은 시설 (라운지 · 상담실 · 연구실)
    mesh(box(5, 2.2, 3.2), M.glass, -10, 6.5, 6, Z.lounge);
    mesh(box(4, 2.2, 3.2), wallBox(2, 1), 10, 6.5, 6, Z.harmony);
    mesh(new THREE.SphereGeometry(2.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.glass, 9, 5.4, -8, Z.lab);

    // 뒤쪽 첨탑들
    platform(0, -44, 11, [3], Z.core);
    [[-6, -42, 34], [5, -46, 44], [-2, -50, 28], [8, -40, 24]].forEach(([x, z, h]) => {
      mesh(box(2.6, h, 2.6), wallBox(1, Math.round(h / 5)), x, 2 + h / 2, z, Z.core);
      mesh(new THREE.ConeGeometry(1.3, 8, 4), M.steel, x, 2 + h + 4, z, Z.core);
    });
    bridge(0, -16, 0, -33, 4);

    // 훈련구역 (돔)
    let top = platform(-42, -6, 11, [3.5, 2], Z.train);
    mesh(new THREE.SphereGeometry(6.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.glass, -42, top, -6, Z.train);
    bridge(-16.5, -2, -31, -5);

    // 하늘정원 (떠 있는 섬)
    garden = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.ConeGeometry(9, 12, 9), M.rock); rock.rotation.x = Math.PI; rock.position.y = -6; garden.add(rock);
    const lawn = new THREE.Mesh(cyl(9.2, 9.2, 1, 24), M.leaf); garden.add(lawn);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, h = i % 3 === 0 ? 1.6 : 3.6;
      const col = new THREE.Mesh(cyl(.35, .4, h, 8), M.marble); col.position.set(Math.cos(a) * 3.5, .5 + h / 2, Math.sin(a) * 3.5); garden.add(col);
    }
    const altar = new THREE.Mesh(box(2.4, .6, 2.4), M.marble); altar.position.y = .8; garden.add(altar);
    garden.position.set(-30, 26, -34);
    garden.traverse((o) => { if (o.isMesh) { o.userData.zone = Z.garden; pickables.push(o); } });
    scene.add(garden);
    for (let i = 0; i < 14; i++) {
      const a = rand() * Math.PI * 2, r = 5.5 + rand() * 3;
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(cyl(.12, .18, 1.2, 6), M.rock); trunk.position.y = .6; t.add(trunk);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(.9, 8, 6), M.leaf); crown.position.y = 1.6; t.add(crown);
      t.position.set(Math.cos(a) * r, .5, Math.sin(a) * r);
      garden.add(t);
    }

    // S급 전용관
    top = platform(34, -28, 12, [4, 3.5, 3], Z.sclass);
    mesh(box(6, 6, 6), wallBox(3, 2), 34, top + 3, -28, Z.sclass);
    bridge(13, -10, 26, -20);

    // 의무실
    top = platform(44, 4, 8.5, [3, 2.4], Z.med);
    mesh(box(4, .3, 1.2), M.glow, 44, top + .3, 4); mesh(box(1.2, .3, 4), M.glow, 44, top + .3, 4);
    bridge(17, 2, 35.5, 3.5);

    // 선착장 (헬리패드)
    top = platform(50, 34, 10, [2.4], Z.dock);
    const pad = mesh(new THREE.CircleGeometry(7.5, 40), new THREE.MeshStandardMaterial({ map: padTex(), roughness: .7 }), 50, top + .32, 34, Z.dock);
    pad.rotation.x = -Math.PI / 2;
    bridge(13, 11, 42, 28);
    bridge(58, 40, 84, 60, 4, .6);

    // 비상 안정화실
    top = platform(-36, 26, 8, [3, 2], Z.stab);
    mesh(box(5, 2.6, 5), new THREE.MeshStandardMaterial({ color: 0xdfe6ee, emissive: 0xffffff, emissiveIntensity: .25, roughness: .4 }), -36, top + 1.3, 26, Z.stab);
    bridge(-13, 11, -29, 21);

    // 바깥으로 뻗은 부두들
    [[-60, 50], [-80, -30], [70, -50], [-50, -60]].forEach(([x, z]) => bridge(x * .45, z * .45, x, z, 5, .5));
    [[-60, 50], [-80, -30], [70, -50], [-50, -60]].forEach(([x, z]) => { mesh(box(8, 3, 8), wallBox(2, 1), x, .5, z); foam(x, z, 5); });

    // 메인 게이트 활주로
    const rw = mesh(box(8, 1.2, 62), new THREE.MeshStandardMaterial({ map: runwayTex(), roughness: .8 }), 0, .6, 47, Z.gate);
    rw.material.map.rotation = 0;
    for (const s of [-1, 1]) {
      mesh(box(4, 4, 50), wallBox(10, 1), s * 7, 1.2, 46, Z.gate);
      mesh(box(.2, .2, 50), M.glow, s * 5, 3.3, 46);
      mesh(box(2, 13, .6), new THREE.MeshBasicMaterial({ map: bannerTex() }), s * 11, 7, 19, Z.gate);
    }
    mesh(box(16, 7, 5), M.dark, 0, 3.5, 20, Z.core);
    mesh(new THREE.PlaneGeometry(13, 5.6), new THREE.MeshBasicMaterial({ map: signTex("ARCH", "AEGIS") }), 0, 3.8, 22.56, Z.core);

    // 구름
    const puff = puffTex();
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, transparent: true, opacity: .85, fog: false, depthWrite: false }));
      const a = rand() * Math.PI * 2, r = 260 + rand() * 160;
      s.position.set(Math.cos(a) * r, 70 + rand() * 60, Math.sin(a) * r);
      s.scale.set(120 + rand() * 80, 50 + rand() * 30, 1);
      scene.add(s);
    }

    // 수송기
    for (let i = 0; i < 4; i++) crafts.push({ g: aircraft(), r: 60 + i * 22, h: 22 + i * 7, sp: .08 + i * .025, a: i * 1.7 });
  }

  // ---------- 화면 (캔버스 + 이름표 + 설명창) ----------
  function placeFor(z) {
    const list = App.data?.world?.places || [];
    return list.find((p) => (p.name || "").includes(z.match) || (p.en || "").toLowerCase().includes(z.en.toLowerCase().split(" ")[0]));
  }

  function buildDom() {
    root = document.createElement("div");
    root.className = "ag3d";
    root.innerHTML = `
      <div class="ag-stage"></div>
      <div class="ag-tags"></div>
      <div class="ag-hud">
        <span class="ag-title">THE AEGIS<small>3D FACILITY MAP</small></span>
        <div class="ag-btns">
          <button type="button" data-ag="tour">TOUR</button>
          <button type="button" data-ag="home">전체</button>
          <button type="button" data-ag="full" aria-label="전체 화면">⛶</button>
        </div>
      </div>
      <aside class="ag-info" hidden>
        <button type="button" class="ag-x" data-ag="close" aria-label="닫기">×</button>
        <p class="ag-en"></p><h3></h3><div class="ag-body"></div>
        <div class="ag-nav"><button type="button" data-ag="prev">‹ PREV</button><button type="button" data-ag="next">NEXT ›</button></div>
      </aside>
      <p class="ag-hint">드래그로 회전 · 휠/두 손가락으로 확대 · 시설을 누르면 설명</p>
      <p class="ag-load">AEGIS · LOADING</p>`;
    root.addEventListener("click", onButton);
  }

  function makeTags() {
    const box = root.querySelector(".ag-tags");
    box.innerHTML = "";
    tags = ZONES.map((z) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `ag-tag${z.small ? " sm" : ""}`;
      el.textContent = z.label;
      el.onclick = (e) => { e.stopPropagation(); stopTour(); focus(z); };
      box.appendChild(el);
      return { z, el, v: new THREE.Vector3(...z.pos) };
    });
  }

  let current = -1;
  function focus(z) {
    current = ZONES.indexOf(z);
    const t = new THREE.Vector3(...z.pos);
    // 지금 보는 방향은 유지하고 거리만 맞춤 (지하는 위에서 내려다보게)
    flyTo(t, z.dist, z.key === "arena" ? .5 : Math.min(view.phi, 1.15));
    const p = placeFor(z);
    const info = root.querySelector(".ag-info");
    info.hidden = false;
    info.querySelector(".ag-en").textContent = p?.en || z.en;
    info.querySelector("h3").textContent = p?.name || z.label;
    info.querySelector(".ag-body").innerHTML = p?.body ? App.esc(p.body).replace(/\n/g, "<br>") : `<span class="ag-none">아직 설명이 없어요.${App.admin ? `<br>05 장소에 '${App.esc(z.match)}'(이)가 들어간 이름으로 장소를 추가하면 여기 떠요.` : ""}</span>`;
    info.scrollTop = 0;
    tags.forEach((t) => t.el.classList.toggle("on", t.z === z));
  }
  function home() {
    current = -1;
    root.querySelector(".ag-info").hidden = true;
    tags.forEach((t) => t.el.classList.remove("on"));
    flyTo(new THREE.Vector3(0, 10, 0), window.innerWidth < 700 ? 190 : 150, 1.05);
  }
  function flyTo(target, radius, phi) {
    fly = { t0: performance.now(), dur: 1400, from: { t: view.target.clone(), r: view.radius, p: view.phi }, to: { t: target, r: radius, p: phi } };
  }
  function stopTour() {
    clearInterval(tourTimer); tourTimer = null;
    root.querySelector('[data-ag="tour"]')?.classList.remove("on");
  }
  function onButton(e) {
    const b = e.target.closest("[data-ag]");
    if (!b) return;
    const act = b.dataset.ag;
    if (act === "close") { root.querySelector(".ag-info").hidden = true; tags.forEach((t) => t.el.classList.remove("on")); }
    else if (act === "home") { stopTour(); home(); }
    else if (act === "next" || act === "prev") { stopTour(); focus(ZONES[(current + (act === "next" ? 1 : -1) + ZONES.length) % ZONES.length]); }
    else if (act === "tour") {
      if (tourTimer) return stopTour();
      b.classList.add("on");
      focus(ZONES[(current + 1) % ZONES.length]);
      tourTimer = setInterval(() => focus(ZONES[(current + 1) % ZONES.length]), 6500);
    } else if (act === "full") {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (root.requestFullscreen) root.requestFullscreen().catch(() => root.classList.toggle("ag-full"));
      else root.classList.toggle("ag-full");
      setTimeout(resize, 60);
    }
  }

  // ---------- 조작 (드래그 회전 · 휠/핀치 확대 · 클릭으로 시설 선택) ----------
  function bindControls(cv) {
    const pts = new Map();
    let moved = 0, pinch = 0;
    cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; fly = null; });
    cv.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      const [px, py] = pts.get(e.pointerId);
      const dx = e.clientX - px, dy = e.clientY - py;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      moved += Math.abs(dx) + Math.abs(dy);
      idleAt = performance.now();
      if (pts.size === 1) {
        view.theta -= dx * .006;
        view.phi = Math.min(1.45, Math.max(.18, view.phi - dy * .005));
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch) zoom(pinch / d);
        pinch = d;
      }
    });
    const up = (e) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = 0;
      if (moved < 6 && e.type === "pointerup") pick(e);
    };
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    cv.addEventListener("wheel", (e) => { e.preventDefault(); fly = null; idleAt = performance.now(); zoom(Math.exp(e.deltaY * .0012)); }, { passive: false });
  }
  function zoom(f) { view.radius = Math.min(260, Math.max(14, view.radius * f)); }
  const ray = () => new THREE.Raycaster();
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const rc = ray();
    rc.setFromCamera(v, camera);
    const hit = rc.intersectObjects(pickables, false)[0];
    if (hit) { stopTour(); focus(hit.object.userData.zone); }
  }

  // ---------- 그리기 ----------
  const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function frame() {
    if (!running) return;
    if (!root.isConnected || !visible || document.hidden) { running = false; return; }
    requestAnimationFrame(frame);
    const t = clock.getElapsedTime(), now = performance.now();

    if (fly) {
      const k = Math.min(1, (now - fly.t0) / fly.dur), e = ease(k);
      view.target.lerpVectors(fly.from.t, fly.to.t, e);
      view.radius = fly.from.r + (fly.to.r - fly.from.r) * e;
      view.phi = fly.from.p + (fly.to.p - fly.from.p) * e;
      if (k >= 1) fly = null;
    }
    if (!fly && now - idleAt > 4000) view.theta += .0009; // 가만히 있으면 천천히 회전
    const sp = Math.sin(view.phi);
    camera.position.set(
      view.target.x + view.radius * sp * Math.sin(view.theta),
      Math.max(1.5, view.target.y + view.radius * Math.cos(view.phi)),
      view.target.z + view.radius * sp * Math.cos(view.theta));
    camera.lookAt(view.target);

    // 물결
    const pos = water.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      const x = waterBase[i], z = waterBase[i + 2];
      pos[i + 1] = Math.sin(x * .06 + t * 1.1) * .45 + Math.cos(z * .05 + t * .8) * .4 + Math.sin((x + z) * .11 + t * 1.7) * .15;
    }
    water.geometry.attributes.position.needsUpdate = true;
    water.geometry.computeVertexNormals();

    garden.position.y = 26 + Math.sin(t * .6) * .8;
    garden.rotation.y = t * .03;
    for (const c of crafts) {
      const a = c.a + t * c.sp;
      c.g.position.set(Math.cos(a) * c.r, c.h + Math.sin(t + c.a) * 1.5, Math.sin(a) * c.r);
      c.g.rotation.y = -a;
      c.g.rotation.z = -.15;
    }
    const on = Math.floor(t * 1.5) % 2 === 0;
    blinkers.forEach((b) => (b.visible = on));

    renderer.render(scene, camera);

    // 이름표 위치
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    const p = new THREE.Vector3();
    for (const tg of tags) {
      if (tg.z.key === "garden") tg.v.set(garden.position.x, garden.position.y + 7, garden.position.z);
      p.copy(tg.v).project(camera);
      const show = p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05 && !(tg.z.small && view.radius > 120 && !tg.el.classList.contains("on"));
      tg.el.style.display = show ? "" : "none";
      if (show) tg.el.style.transform = `translate(${((p.x + 1) / 2) * w}px, ${((1 - p.y) / 2) * h}px)`;
    }
  }
  function start() {
    if (running || !renderer) return;
    running = true;
    requestAnimationFrame(frame);
  }
  function resize() {
    if (!renderer || !root.isConnected) return;
    const st = root.querySelector(".ag-stage");
    const w = st.clientWidth, h = st.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  async function init() {
    try {
      THREE = await loadThree();
    } catch (err) {
      root.querySelector(".ag-load").textContent = err.message;
      return;
    }
    if (renderer) return;
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    clock = new THREE.Clock();
    buildScene();
    makeTags();
    root.querySelector(".ag-stage").appendChild(renderer.domElement);
    bindControls(renderer.domElement);
    root.querySelector(".ag-load").remove();
    view.radius = window.innerWidth < 700 ? 190 : 150;
    idleAt = performance.now();
    resize();
    start();
  }

  // 페이지가 다시 그려져도 같은 3D 화면을 새 자리로 옮겨 붙임
  let io;
  function mount() {
    const slot = document.getElementById("ag-slot");
    if (!slot) return;
    if (!root) buildDom();
    slot.appendChild(root);
    io?.disconnect();
    io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (!visible) return;
      if (!renderer) init(); else { resize(); start(); }
    }, { rootMargin: "200px" });
    io.observe(slot);
    if (renderer) resize();
  }
  window.addEventListener("resize", resize);
  document.addEventListener("fullscreenchange", () => setTimeout(resize, 60));
  document.addEventListener("visibilitychange", () => { if (!document.hidden && visible) start(); });

  const after = App.afterWorld;
  App.afterWorld = function () {
    after.apply(this, arguments);
    mount();
  };
})();
