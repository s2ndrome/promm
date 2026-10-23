// ARCH 페이지 05 장소: 아이기스를 3D 로 둘러보는 뷰어 (three.js 는 화면에 보일 때만 불러옴)
(function () {
  const App = window.App;
  const THREE_SRC = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

  // 시설 위치. match 는 05 장소 목록에서 설명을 찾아올 때 쓰는 이름 일부
  const ZONES = [
    { key: "core", label: "센트럴 코어 / 관제탑", match: "센트럴", en: "CENTRAL CORE", pos: [0, 128, 0], aim: [0, 60, 0], dist: 210 },
    { key: "garden", label: "하늘정원", match: "하늘정원", en: "SKY GARDEN", pos: [-48, 64, -58], dist: 85 },
    { key: "sclass", label: "S급 전용관", match: "개인실", en: "S-CLASS QUARTERS", pos: [54, 44, -46], aim: [54, 24, -46], dist: 95 },
    { key: "med", label: "의무실", match: "의무실", en: "MEDICAL WING", pos: [68, 18, 6], dist: 75 },
    { key: "dock", label: "선착장", match: "선착장", en: "LANDING DOCK", pos: [72, 12, 54], dist: 80 },
    { key: "train", label: "훈련구역", match: "훈련소", en: "TRAINING DOME", pos: [-64, 26, -14], aim: [-64, 14, -14], dist: 85 },
    { key: "stab", label: "비상 안정화실", match: "안정화", en: "EMERGENCY STABILIZATION", pos: [-58, 20, 46], aim: [-58, 12, 46], dist: 70 },
    { key: "gate", label: "메인 게이트", match: "게이트", en: "MAIN GATE", pos: [0, 10, 100], aim: [0, 8, 80], dist: 110 },
    { key: "lounge", label: "라운지", match: "라운지", en: "LOUNGE", pos: [-13, 20, 15], dist: 50, small: true },
    { key: "harmony", label: "하모니 상담실", match: "하모니", en: "HARMONY COUNSELING", pos: [15, 20, 13], dist: 50, small: true },
    { key: "lab", label: "공명연구실", match: "공명", en: "RESONANCE LAB", pos: [11, 30, -11], dist: 50, small: true },
    { key: "arena", label: "특별통제 훈련장 (지하)", match: "특별통제", en: "SPECIAL CONTROL ARENA", pos: [0, -14, 0], dist: 80, small: true },
  ];
  const U = 7; // 창문 텍스처 한 장이 덮는 크기

  let THREE, root, renderer, scene, camera, clock, water, sky, tags = [], pickables = [];
  let garden, crafts = [], blinkers = [], loading = null, running = false, visible = false, tourTimer = null;
  const view = { theta: 0, phi: 1.16, radius: 280, goal: 280, target: null, vt: 0, vp: 0, drag: false };
  let fly = null; // 카메라 이동 애니메이션
  let idleAt = 0;
  const mobile = () => window.innerWidth < 700;
  const homeDist = () => (mobile() ? 370 : 250);

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
  let rnd = 7;
  const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  const between = (a, b) => a + rand() * (b - a);
  function canvasTex(w, h, draw, color = true) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if (color) t.encoding = THREE.sRGBEncoding;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  const col = (hex) => new THREE.Color(hex).convertSRGBToLinear();

  // 벽: 강철 패널 + 가로 창문 띠 (창문 띠만 빛남)
  function wallTex(glow) {
    rnd = 11;
    return canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = glow ? "#000" : "#59616d"; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 256) {
        if (!glow) {
          for (let x = 0; x < w; x += 64) {
            const v = 88 + Math.floor(rand() * 22);
            g.fillStyle = `rgb(${v - 6},${v},${v + 10})`; g.fillRect(x + 1, y + 2, 62, 150);
            g.fillStyle = "rgba(255,255,255,.06)"; g.fillRect(x + 1, y + 2, 62, 3);
          }
          g.fillStyle = "#9aa4b1"; g.fillRect(0, y + 154, w, 4);
          g.fillStyle = "#121821"; g.fillRect(0, y + 160, w, 70);
          g.fillStyle = "#3a414c"; g.fillRect(0, y + 232, w, 24);
        }
        for (let x = 0; x < w; x += 16) {
          const r = rand();
          g.fillStyle = r > .8 ? "#dff0ff" : r > .5 ? "#4f8fd6" : r > .25 ? (glow ? "#0e2742" : "#1d3550") : glow ? "#000" : "#141c27";
          g.fillRect(x + 2, y + 166, 12, 58);
        }
      }
    });
  }
  function panelTex(base = 104) {
    rnd = 5;
    return canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = "#2a3039"; g.fillRect(0, 0, w, h);
      const cell = (x, y, cw, ch, d) => {
        if (d > 0 && cw > 40 && ch > 40 && rand() < .75) {
          if (rand() < .5) { const k = Math.floor(cw * between(.3, .7)); cell(x, y, k, ch, d - 1); cell(x + k, y, cw - k, ch, d - 1); }
          else { const k = Math.floor(ch * between(.3, .7)); cell(x, y, cw, k, d - 1); cell(x, y + k, cw, ch - k, d - 1); }
          return;
        }
        const v = base + Math.floor(between(-14, 14));
        g.fillStyle = `rgb(${v - 4},${v + 2},${v + 12})`; g.fillRect(x + 1.5, y + 1.5, cw - 3, ch - 3);
        if (rand() < .2) { g.fillStyle = "rgba(20,26,34,.7)"; g.fillRect(x + cw * .25, y + ch * .3, cw * .5, ch * .15); }
      };
      cell(0, 0, w, h, 5);
    });
  }
  // 둥근 옥상: 동심원 · 방사선 · 해치
  function deckTex(kind) {
    rnd = kind.length * 13;
    return canvasTex(1024, 1024, (g, w, h) => {
      const c = w / 2;
      g.fillStyle = "#3c434d"; g.fillRect(0, 0, w, h);
      for (let r = c; r > 0; r -= 46) {
        g.fillStyle = `rgb(${54 + (r % 3) * 6},${60 + (r % 3) * 6},${70 + (r % 3) * 6})`;
        g.beginPath(); g.arc(c, c, r, 0, 7); g.fill();
        g.strokeStyle = "#7d8895"; g.lineWidth = 2; g.stroke();
      }
      g.strokeStyle = "rgba(160,175,190,.35)"; g.lineWidth = 3;
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.beginPath(); g.moveTo(c + Math.cos(a) * 120, c + Math.sin(a) * 120); g.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c); g.stroke(); }
      for (let i = 0; i < 60; i++) {
        const a = rand() * Math.PI * 2, r = between(150, c - 30), s = between(12, 40);
        g.fillStyle = rand() < .5 ? "#262c34" : "#6b7581";
        g.save(); g.translate(c + Math.cos(a) * r, c + Math.sin(a) * r); g.rotate(a); g.fillRect(-s / 2, -s / 3, s, s * .66); g.restore();
      }
      g.strokeStyle = "#a9d6ff"; g.lineWidth = 6; g.beginPath(); g.arc(c, c, c - 24, 0, 7); g.stroke();
      if (kind === "pad") {
        g.fillStyle = "#30363f"; g.beginPath(); g.arc(c, c, 330, 0, 7); g.fill();
        g.strokeStyle = "#e9f1fa"; g.lineWidth = 14; g.beginPath(); g.arc(c, c, 300, 0, 7); g.stroke();
        g.lineWidth = 5; g.beginPath(); g.arc(c, c, 325, 0, 7); g.stroke();
        g.fillStyle = "#f1f5fa"; g.font = "700 380px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("H", c, c + 20);
      }
      if (kind === "core") { g.fillStyle = "#2b3139"; g.beginPath(); g.arc(c, c, 260, 0, 7); g.fill(); }
    });
  }
  function signTex() {
    return canvasTex(1024, 360, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#2b323c"); gr.addColorStop(1, "#151a21");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#a8b6c6"; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28);
      g.strokeStyle = "#e8eef5"; g.lineWidth = 4;
      for (const s of [-1, 1]) for (let i = 0; i < 7; i++) {
        g.beginPath(); g.moveTo(w / 2 + s * 250, 120 + i * 14); g.quadraticCurveTo(w / 2 + s * (330 + i * 10), 60 + i * 18, w / 2 + s * (420 + i * 6), 40 + i * 26); g.stroke();
      }
      g.fillStyle = "#f2f5f9"; g.textAlign = "center";
      g.font = "700 170px Georgia, 'Times New Roman', serif"; g.fillText("ARCH", w / 2, 200);
      g.font = "600 66px Georgia, 'Times New Roman', serif"; g.fillText("A E G I S", w / 2, 300);
    });
  }
  function emblemTex() {
    return canvasTex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = "#eaf2fb"; g.fillStyle = "rgba(20,28,38,.9)"; g.lineWidth = 6;
      g.beginPath(); g.moveTo(128, 40); g.lineTo(186, 64); g.lineTo(180, 150); g.lineTo(128, 210); g.lineTo(76, 150); g.lineTo(70, 64); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = "#eaf2fb"; g.font = "700 90px Georgia, serif"; g.textAlign = "center"; g.fillText("A", 128, 158);
      for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(128 + s * 66, 80 + i * 14); g.lineTo(128 + s * (100 + i * 6), 54 + i * 22); g.stroke(); }
    });
  }
  function bannerTex() {
    return canvasTex(256, 1024, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#1b2c4a"); gr.addColorStop(1, "#0d1626");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#89b6ee"; g.lineWidth = 6; g.strokeRect(16, 16, w - 32, h - 32);
      g.strokeStyle = "#e3ecf8"; g.lineWidth = 5;
      g.beginPath(); g.moveTo(128, 150); g.lineTo(180, 175); g.lineTo(172, 270); g.lineTo(128, 320); g.lineTo(84, 270); g.lineTo(76, 175); g.closePath(); g.stroke();
      g.fillStyle = "#e3ecf8"; g.font = "700 56px Georgia, serif"; g.textAlign = "center"; g.fillText("ARCH", 128, 420);
      g.fillRect(60, 900, 136, 4);
    });
  }
  function runwayTex() {
    return canvasTex(256, 2048, (g, w, h) => {
      g.fillStyle = "#2c323b"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${rand() * .04})`; g.fillRect(rand() * w, rand() * h, 3, 12); }
      g.fillStyle = "#d7dee7";
      for (let y = 60; y < h - 420; y += 120) g.fillRect(w / 2 - 5, y, 10, 64);
      g.fillRect(14, 0, 6, h); g.fillRect(w - 20, 0, 6, h);
      g.font = "700 130px Arial"; g.textAlign = "center"; g.fillText("01", w / 2, h - 210);
      for (let i = 0; i < 8; i++) g.fillRect(28 + i * 26, h - 150, 14, 120);
    });
  }
  function waterNormal() {
    const N = 256, img = new ImageData(N, N), hgt = new Float32Array(N * N);
    const waves = [[3, 1, .9], [1, 4, .7], [5, -2, .4], [-4, 6, .25], [9, 3, .15], [2, -11, .12], [13, 7, .07]];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let v = 0;
      waves.forEach(([a, b, amp], i) => { v += amp * Math.sin(((a * x + b * y) / N) * Math.PI * 2 + i * 1.7); });
      hgt[y * N + x] = v;
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = hgt[y * N + ((x + 1) % N)] - hgt[y * N + ((x + N - 1) % N)];
      const dy = hgt[((y + 1) % N) * N + x] - hgt[((y + N - 1) % N) * N + x];
      const nx = -dx * 2.2, ny = -dy * 2.2, l = Math.hypot(nx, ny, 1), i = (y * N + x) * 4;
      img.data[i] = (nx / l * .5 + .5) * 255; img.data[i + 1] = (ny / l * .5 + .5) * 255; img.data[i + 2] = (1 / l * .5 + .5) * 255; img.data[i + 3] = 255;
    }
    return canvasTex(N, N, (g) => g.putImageData(img, 0, 0), false);
  }
  function puffTex() {
    rnd = 3;
    return canvasTex(512, 256, (g, w, h) => {
      for (let i = 0; i < 60; i++) {
        const x = between(70, 440), y = between(100, 170) - Math.sin((x / w) * Math.PI) * 40, r = between(26, 70);
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }
      const sh = g.createLinearGradient(0, 120, 0, 230); sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(120,140,165,.35)");
      g.globalCompositeOperation = "source-atop"; g.fillStyle = sh; g.fillRect(0, 0, w, h);
    });
  }

  // 하늘: 위는 짙은 파랑, 수평선은 밝은 안개색, 해 주변은 빛남
  const SUN = [-0.45, 0.62, 0.4];
  function skyMesh() {
    const m = new THREE.Mesh(new THREE.SphereGeometry(2400, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { sun: { value: new THREE.Vector3(...SUN).normalize() } },
      vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 sun; varying vec3 vDir;
        void main(){
          float h = vDir.y;
          vec3 top = vec3(.11,.25,.47), mid = vec3(.33,.52,.74), hor = vec3(.78,.84,.89), sea = vec3(.05,.12,.2);
          vec3 c = mix(hor, mid, smoothstep(.0, .22, h));
          c = mix(c, top, smoothstep(.22, .95, h));
          c = mix(c, sea, smoothstep(.0, -.12, h));
          float s = max(dot(normalize(vDir), sun), 0.);
          c += vec3(1., .93, .8) * (pow(s, 900.) * 3. + pow(s, 14.) * .22);
          gl_FragColor = vec4(c, 1.);
        }`,
    }));
    m.renderOrder = -1;
    return m;
  }

  // ---------- 재질 · 도형 도우미 ----------
  let M, greebles = [];
  function makeMaterials() {
    const win = wallTex(false), glow = wallTex(true), panel = panelTex(), roof = panelTex(84);
    const std = (o) => new THREE.MeshStandardMaterial(o);
    M = {
      win: std({ map: win, emissiveMap: glow, emissive: 0xffffff, emissiveIntensity: 1.6, metalness: .7, roughness: .32, envMapIntensity: 1.2 }),
      hull: std({ map: panel, bumpMap: panel, bumpScale: .02, metalness: .78, roughness: .34, envMapIntensity: 1.25 }),
      roof: std({ map: roof, metalness: .55, roughness: .55 }),
      dark: std({ color: col(0x262b33), metalness: .75, roughness: .42 }),
      unit: std({ color: col(0x737c88), metalness: .8, roughness: .38 }),
      steel: std({ color: col(0xaab4c0), metalness: .95, roughness: .2, envMapIntensity: 1.4 }),
      glow: new THREE.MeshBasicMaterial({ color: col(0x9fd6ff), toneMapped: false }),
      halo: new THREE.MeshBasicMaterial({ color: col(0x4aa3ff), transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      red: new THREE.MeshBasicMaterial({ color: col(0xff3b3b), toneMapped: false }),
      glass: std({ color: col(0xa9d4ff), metalness: 1, roughness: .06, transparent: true, opacity: .5, envMapIntensity: 1.6 }),
      leaf: std({ color: col(0x3d6b3c), roughness: .85 }),
      leaf2: std({ color: col(0x58854a), roughness: .85 }),
      grass: std({ color: col(0x4f7a42), roughness: .95 }),
      rock: std({ color: col(0x55524e), roughness: .9, metalness: .05 }),
      marble: std({ color: col(0xeeebe4), roughness: .5 }),
      white: std({ color: col(0xe9eff6), emissive: col(0xbcd6f2), emissiveIntensity: .35, roughness: .35, metalness: .2 }),
      foam: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .28, depthWrite: false }),
      deck: { ring: deckTex("ring"), pad: deckTex("pad"), core: deckTex("core") },
    };
  }
  function add(geo, mat, x = 0, y = 0, z = 0, zone, shadow = true) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = shadow;
    if (zone) { m.userData.zone = zone; pickables.push(m); }
    scene.add(m);
    return m;
  }
  function uvScale(g, su, sv) {
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    return g;
  }
  // 창문이 늘어나지 않게 면 크기에 맞춰 UV 를 늘린 상자
  function boxG(w, h, d) {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / U, uv.getY(i) * dims[f][1] / U); }
    return g;
  }
  const blockMats = () => [M.win, M.win, M.roof, M.dark, M.win, M.win];
  function block(x, y, z, w, h, d, rot = 0, zone) {
    const m = add(boxG(w, h, d), blockMats(), x, y + h / 2, z, zone);
    m.rotation.y = rot;
    if (h > 3 && w * d > 10 && rand() < .6) greeble(x, y + h, z, 0, Math.min(w, d) * .3, 2);
    return m;
  }
  // 팔각 타워 (창문 + 꼭대기 첨탑 + 빛 띠)
  function tower(x, y, z, r, h, zone, spire = h * .3) {
    const g = uvScale(new THREE.CylinderGeometry(r * .94, r, h, 8, 1, true), (2 * Math.PI * r) / U, h / U);
    add(g, M.win, x, y + h / 2, z, zone).rotation.y = Math.PI / 8;
    add(new THREE.CylinderGeometry(r + .35, r + .35, .9, 8), M.hull, x, y + h + .45, z, zone).rotation.y = Math.PI / 8;
    add(new THREE.CylinderGeometry(r + .37, r + .37, .2, 8, 1, true), M.glow, x, y + h + .2, z, null, false).rotation.y = Math.PI / 8;
    add(new THREE.ConeGeometry(r * .8, spire, 8), M.steel, x, y + h + .9 + spire / 2, z, zone).rotation.y = Math.PI / 8;
    return y + h + .9 + spire;
  }
  function band(x, y, z, r, tube = .1) {
    add(new THREE.TorusGeometry(r, tube, 6, 96), M.glow, x, y, z, null, false).rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(r, tube * 6, 6, 96), M.halo, x, y, z, null, false).rotation.x = Math.PI / 2;
  }
  // 둥근 층 하나: 창문 벽 + 튀어나온 처마 + 빛 띠 + 옥상
  function tier(x, z, y0, r, h, zone, deck = "ring", slope = .04) {
    const wall = uvScale(new THREE.CylinderGeometry(r, r * (1 + slope), h, 96, 1, true), Math.round((2 * Math.PI * r) / U), h / U);
    add(wall, M.win, x, y0 + h / 2, z, zone);
    const lip = [[r - .3, h - .2], [r + .7, h - .2], [r + 1.1, h + .1], [r + 1.1, h + .55], [r + .8, h + .8], [r - .3, h + .8]];
    const lg = uvScale(new THREE.LatheGeometry(lip.map(([a, b]) => new THREE.Vector2(a, y0 + b)), 96), Math.round((2 * Math.PI * r) / 5), 1);
    add(lg, M.hull, x, 0, z, zone);
    band(x, y0 + h + .32, z, r + 1.12);
    const top = add(new THREE.CircleGeometry(r + .8, 96), new THREE.MeshStandardMaterial({ map: M.deck[deck], metalness: .5, roughness: .6 }), x, y0 + h + .81, z, zone);
    top.rotation.x = -Math.PI / 2;
    return y0 + h + .81;
  }
  // 바다에 닿는 경사진 받침 + 물보라
  function skirt(x, z, r, zone) {
    const pts = [[r + 3.4, -4], [r + 3.4, .4], [r + 2.2, 1.2], [r + .6, 1.6], [r - 1, 1.6]];
    add(uvScale(new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 96), Math.round((2 * Math.PI * r) / 5), 1), M.hull, x, 0, z, zone);
    for (const [w, o] of [[1.6, .32], [5, .12]]) {
      const f = add(new THREE.RingGeometry(r + 3.3, r + 3.3 + w, 96), M.foam, x, .12, z, null, false);
      f.rotation.x = -Math.PI / 2; f.material = M.foam.clone(); f.material.opacity = o; f.renderOrder = 2;
    }
  }
  function platform(x, z, tiers, zone, deck = "ring") {
    skirt(x, z, tiers[0][0], zone);
    let y = 1.6;
    tiers.forEach(([r, h], i) => { y = tier(x, z, y, r, h, zone, i === tiers.length - 1 ? deck : "ring"); });
    return y;
  }
  function greeble(x, y, z, rMin, rMax, n) {
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, r = between(rMin, rMax);
      greebles.push([x + Math.cos(a) * r, y, z + Math.sin(a) * r, between(.5, 1.9), between(.25, 1.1), between(.5, 1.6), a]);
    }
  }
  function flushGreebles() {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.unit, greebles.length);
    const o = new THREE.Object3D();
    greebles.forEach(([x, y, z, sx, sy, sz, a], i) => { o.position.set(x, y + sy / 2, z); o.scale.set(sx, sy, sz); o.rotation.set(0, a, 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
    im.castShadow = im.receiveShadow = true;
    scene.add(im);
  }
  // 다리: 아래 데크 + 지붕 덮인 통로 + 난간 빛
  function bridge(x1, z1, x2, z2, w = 7) {
    const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz), rot = Math.atan2(dx, dz), cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    add(boxG(w, 2.4, len), [M.hull, M.hull, M.roof, M.dark, M.hull, M.hull], cx, 1, cz).rotation.y = rot;
    add(boxG(w * .55, 2.6, len), blockMats(), cx, 3.5, cz).rotation.y = rot;
    for (const s of [-1, 1]) {
      const l = add(new THREE.BoxGeometry(.14, .14, len), M.glow, cx + Math.cos(rot) * s * w / 2, 2.3, cz - Math.sin(rot) * s * w / 2, null, false);
      l.rotation.y = rot;
    }
    for (let k = 1; k < len / 16; k++) {
      const t = k / Math.ceil(len / 16);
      add(new THREE.BoxGeometry(w + .6, 3.6, .8), M.dark, x1 + dx * t, 2.6, z1 + dz * t).rotation.y = rot;
    }
  }
  // 바다로 길게 뻗은 부두: 양쪽에 건물이 줄지어 있음
  function arm(ang, from, len) {
    const c = Math.cos(ang), s = Math.sin(ang), rot = Math.atan2(c, s);
    const x1 = c * from, z1 = s * from, x2 = c * (from + len), z2 = s * (from + len);
    add(boxG(12, 3, len), [M.hull, M.hull, M.roof, M.dark, M.hull, M.hull], (x1 + x2) / 2, .6, (z1 + z2) / 2).rotation.y = rot;
    for (let d = 6; d < len - 4; d += between(8, 13)) {
      for (const side of [-1, 1]) {
        if (rand() < .2) continue;
        const px = c * (from + d) + Math.cos(rot) * side * 3.6, pz = s * (from + d) - Math.sin(rot) * side * 3.6;
        block(px, 2.1, pz, 4.2, between(2, 7), between(5, 9), rot);
      }
    }
    skirt(x2, z2, 6);
    tier(x2, z2, 1.6, 6, 3);
  }

  function aircraft(scale = 1.4) {
    const g = new THREE.Group();
    const part = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
    part(new THREE.CylinderGeometry(.5, .8, 5, 8), M.dark, 0, 0, 0).rotation.x = Math.PI / 2;
    part(new THREE.ConeGeometry(.5, 1.6, 8), M.steel, 0, 0, -3.3).rotation.x = -Math.PI / 2;
    part(new THREE.BoxGeometry(8, .14, 1.8), M.hull, 0, 0, .6);
    part(new THREE.BoxGeometry(3, .12, 1), M.hull, 0, .4, 2.3);
    for (const sx of [-1, 1]) {
      part(new THREE.CylinderGeometry(.45, .45, 1.8, 10), M.dark, sx * 3.2, -.1, .6).rotation.x = Math.PI / 2;
      part(new THREE.CircleGeometry(.4, 10), M.glow, sx * 3.2, -.1, 1.52);
      part(new THREE.SphereGeometry(.12, 6, 4), M.glow, sx * 4, 0, .6);
    }
    blinkers.push(part(new THREE.SphereGeometry(.16, 6, 4), M.red, 0, .55, -1.2));
    g.scale.setScalar(scale);
    scene.add(g);
    return g;
  }

  function buildScene() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(new THREE.Color(.78, .84, .89).convertSRGBToLinear(), .0016);
    camera = new THREE.PerspectiveCamera(36, 1, 1, 6000);
    view.target = new THREE.Vector3(0, 20, 0);
    makeMaterials();

    // 하늘 + 하늘을 비추는 금속 반사
    sky = skyMesh();
    scene.add(sky);
    const envScene = new THREE.Scene();
    envScene.add(skyMesh());
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(envScene, .02).texture;
    pm.dispose();

    scene.add(new THREE.HemisphereLight(col(0xc4d8f0), col(0x0b1824), .35));
    const sun = new THREE.DirectionalLight(col(0xfff0da), 2.6);
    sun.position.set(SUN[0] * 300, SUN[1] * 300, SUN[2] * 300);
    sun.castShadow = true;
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -170; sc.right = sc.top = 170; sc.near = 50; sc.far = 700;
    sun.shadow.mapSize.set(mobile() ? 1024 : 2048, mobile() ? 1024 : 2048);
    sun.shadow.bias = -.0004; sun.shadow.normalBias = .4;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(col(0x8db8ff), .6); rim.position.set(200, 80, -220); scene.add(rim);

    const Z = Object.fromEntries(ZONES.map((z) => [z.key, z]));

    // 바다
    const nm = waterNormal();
    nm.repeat.set(160, 160);
    water = add(new THREE.PlaneGeometry(5000, 5000), new THREE.MeshStandardMaterial({
      color: col(0x0d2a44), roughness: .16, metalness: .1, normalMap: nm, normalScale: new THREE.Vector2(.32, .32),
      transparent: true, opacity: .9, envMapIntensity: 1.1,
    }), 0, 0, 0, null, false);
    water.rotation.x = -Math.PI / 2;
    water.receiveShadow = true;
    water.renderOrder = -1;

    // ── 중앙 허브: 계단식 원형 요새
    const HUB = [[30, 5], [23, 7], [17, 8], [12, 6]];
    const tops = [];
    skirt(0, 0, 30, Z.core);
    let y = 1.6;
    HUB.forEach(([r, h], i) => { y = tier(0, 0, y, r, h, Z.core, i === 3 ? "core" : "ring"); tops.push(y); });

    const PLAT = { train: [-64, -14], sclass: [54, -46], med: [68, 6], dock: [72, 54], stab: [-58, 46], back: [0, -80] };
    const bridgeAng = Object.values(PLAT).map(([x, z]) => Math.atan2(z, x));
    const armAng = [1.15, 1.98, 3.75, 5.2, -0.42];
    const busy = [...bridgeAng, ...armAng, Math.PI / 2, Math.atan2(15, -13), Math.atan2(13, 15)];
    const free = (a, gap) => busy.every((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) > gap);

    // 1층 옥상: 바깥 둘레로 건물들
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      if (!free(a, .16)) continue;
      block(Math.cos(a) * 26.5, tops[0], Math.sin(a) * 26.5, between(3.5, 5), between(2.5, 8), 3.6, Math.atan2(Math.cos(a), Math.sin(a)), Z.core);
    }
    greeble(0, tops[0], 0, 24, 29, 40);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + .1;
      if (!free(a, .22)) continue;
      block(Math.cos(a) * 20, tops[1], Math.sin(a) * 20, between(3, 4.5), between(2, 6), 3, Math.atan2(Math.cos(a), Math.sin(a)), Z.core);
    }
    greeble(0, tops[1], 0, 18, 22.5, 26);

    // 3층 옥상: 관제탑을 둘러싼 첨탑 8개
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8, h = [30, 44, 26, 52, 34, 40, 28, 48][i];
      tower(Math.cos(a) * 14.5, tops[2], Math.sin(a) * 14.5, between(1.7, 2.4), h, Z.core, between(8, 14));
    }
    greeble(0, tops[2], 0, 12.5, 16.5, 18);

    // 관제탑: 위로 갈수록 가늘어지는 팔각 기둥 + 모서리 핀 + 왕관 첨탑
    y = tops[3];
    [[7, 28], [5.6, 22], [4.4, 18], [3.2, 12]].forEach(([r, h], i) => {
      add(uvScale(new THREE.CylinderGeometry(r * .97, r, h, 8, 1, true), (2 * Math.PI * r) / U, h / U), M.win, 0, y + h / 2, 0, Z.core).rotation.y = Math.PI / 8;
      if (i < 3) for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const fin = add(new THREE.BoxGeometry(.6, h, 1.4), M.hull, Math.sin(a) * r, y + h / 2, Math.cos(a) * r, Z.core);
        fin.rotation.y = a;
        add(new THREE.BoxGeometry(.12, h * .9, .12), M.glow, Math.sin(a) * (r + .72), y + h / 2, Math.cos(a) * (r + .72), null, false);
      }
      y += h;
      add(new THREE.CylinderGeometry(r + .8, r + .5, 1.4, 8), M.hull, 0, y + .7, 0, Z.core).rotation.y = Math.PI / 8;
      add(new THREE.CylinderGeometry(r + .82, r + .82, .25, 8, 1, true), M.glow, 0, y + .3, 0, null, false).rotation.y = Math.PI / 8;
      y += 1.4;
    });
    add(new THREE.ConeGeometry(2.6, 34, 8), M.steel, 0, y + 17, 0, Z.core).rotation.y = Math.PI / 8;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      add(new THREE.ConeGeometry(.7, 12, 6), M.steel, Math.sin(a) * 3, y + 6, Math.cos(a) * 3, Z.core);
    }
    blinkers.push(add(new THREE.SphereGeometry(.5, 8, 6), M.red, 0, y + 34.5, 0, null, false));
    const em = add(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: emblemTex(), transparent: true, toneMapped: false }), 0, tops[3] + 22, 7 * Math.cos(Math.PI / 8) + .08, Z.core, false);
    em.material.color = col(0xdfe9f5);

    // 정면 ARCH 간판
    add(new THREE.BoxGeometry(24, 8.5, 4), M.dark, 0, tops[0] + 4.1, 22.6, Z.core);
    add(new THREE.BoxGeometry(25, .6, 4.4), M.hull, 0, tops[0] + 8.6, 22.6, Z.core);
    add(new THREE.PlaneGeometry(22, 7.7), new THREE.MeshStandardMaterial({ map: signTex(), metalness: .4, roughness: .35, emissive: 0xffffff, emissiveMap: signTex(), emissiveIntensity: .25 }), 0, tops[0] + 4.1, 24.62, Z.core);

    // 지하 특별통제 훈련장 (물 아래로 희미하게 비침)
    add(new THREE.CylinderGeometry(14, 14, 7, 8, 1, true), new THREE.MeshBasicMaterial({ color: col(0x2c7dd6), transparent: true, opacity: .35, toneMapped: false, side: THREE.DoubleSide }), 0, -14, 0, Z.arena, false).renderOrder = -2;
    band(0, -10.5, 0, 14.2, .25);

    // 허브 위 작은 시설 (라운지 · 상담실 · 연구실)
    add(boxG(7, 3.2, 4.5), M.glass, -13, tops[1] + 1.6, 15, Z.lounge).rotation.y = -.7;
    add(new THREE.BoxGeometry(7.4, .4, 4.9), M.hull, -13, tops[1] + 3.3, 15, Z.lounge).rotation.y = -.7;
    block(15, tops[1], 13, 6, 3.4, 4.2, .85, Z.harmony);
    add(new THREE.SphereGeometry(3.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.glass, 11, tops[2], -11, Z.lab);
    band(11, tops[2] + .1, -11, 3.5, .08);

    // ── 정면 메인 게이트 + 활주로
    const rw = add(new THREE.BoxGeometry(14, 2.4, 130), [M.hull, M.hull, new THREE.MeshStandardMaterial({ map: runwayTex(), roughness: .7, metalness: .3 }), M.dark, M.hull, M.hull], 0, 1, 96, Z.gate);
    rw.receiveShadow = true;
    for (const s of [-1, 1]) {
      add(new THREE.BoxGeometry(.18, .18, 128), M.glow, s * 6.6, 2.3, 96, null, false);
      for (let z = 40; z < 156; z += 17) block(s * 13, 0, z + 7, 9, between(4, 9), 15, 0, Z.gate);
      tower(s * 10, 2.2, 38, 2.6, 26, Z.gate, 10);
      add(new THREE.PlaneGeometry(3.6, 15), new THREE.MeshStandardMaterial({ map: bannerTex(), roughness: .8, emissive: 0xffffff, emissiveMap: bannerTex(), emissiveIntensity: .15 }), s * 10, 15, 40.9, Z.gate);
    }
    add(new THREE.BoxGeometry(24, 2.4, 3.4), M.hull, 0, 26.5, 38, Z.gate);
    add(new THREE.BoxGeometry(22, .16, .16), M.glow, 0, 25.2, 39.8, null, false);
    tier(0, 162, 1.6, 9, 2, Z.gate);
    skirt(0, 162, 9, Z.gate);

    // ── 다리
    for (const [x, z] of Object.values(PLAT)) {
      const a = Math.atan2(z, x), d = Math.hypot(x, z);
      bridge(Math.cos(a) * 31, Math.sin(a) * 31, Math.cos(a) * (d - 14), Math.sin(a) * (d - 14));
    }
    armAng.forEach((a, i) => arm(a, 32, [120, 110, 130, 115, 95][i]));

    // ── 훈련구역 (투명 돔)
    let top = platform(...PLAT.train, [[15, 4.5], [11.5, 2.5]], Z.train);
    add(new THREE.SphereGeometry(10, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), M.glass, ...[PLAT.train[0], top, PLAT.train[1]], Z.train);
    for (let k = 0; k < 6; k++) {
      const rib = add(new THREE.TorusGeometry(10.05, .12, 6, 48, Math.PI), M.hull, PLAT.train[0], top, PLAT.train[1], Z.train);
      rib.rotation.y = (k / 6) * Math.PI;
    }
    band(PLAT.train[0], top + .1, PLAT.train[1], 10.1);

    // ── S급 전용관 (층층이 + 호텔 타워)
    top = platform(...PLAT.sclass, [[16, 5], [12.5, 5], [9, 4]], Z.sclass);
    tower(PLAT.sclass[0], top, PLAT.sclass[1], 4.4, 16, Z.sclass, 6);
    greeble(PLAT.sclass[0], top, PLAT.sclass[1], 5.5, 8.5, 10);

    // ── 의무실
    top = platform(...PLAT.med, [[13, 4], [9.5, 3]], Z.med);
    add(new THREE.BoxGeometry(6, .3, 1.8), M.glow, PLAT.med[0], top + .2, PLAT.med[1], null, false);
    add(new THREE.BoxGeometry(1.8, .3, 6), M.glow, PLAT.med[0], top + .2, PLAT.med[1], null, false);
    greeble(PLAT.med[0], top, PLAT.med[1], 5, 9, 10);

    // ── 선착장 (헬리패드 + 세워둔 수송기)
    top = platform(...PLAT.dock, [[15, 3.2]], Z.dock, "pad");
    const parked = aircraft(1.5);
    parked.position.set(PLAT.dock[0] + 3, top + 1, PLAT.dock[1] - 2); parked.rotation.y = 2.2;
    block(PLAT.dock[0] + 15, 0, PLAT.dock[1] + 8, 8, 6, 12, -.6, Z.dock);

    // ── 비상 안정화실 (하얗게 빛나는 격리동 + 경고등)
    top = platform(...PLAT.stab, [[12, 4], [8.5, 3]], Z.stab);
    add(new THREE.BoxGeometry(8.4, 4.4, 8.4), M.dark, PLAT.stab[0], top + 2.2, PLAT.stab[1], Z.stab);
    add(new THREE.BoxGeometry(7.6, 4.8, 7.6), M.white, PLAT.stab[0], top + 2.4, PLAT.stab[1], Z.stab);
    for (const [dx, dz] of [[-4.4, -4.4], [4.4, -4.4], [-4.4, 4.4], [4.4, 4.4]]) blinkers.push(add(new THREE.SphereGeometry(.35, 8, 6), M.red, PLAT.stab[0] + dx, top + 5, PLAT.stab[1] + dz, null, false));

    // ── 뒤쪽 첨탑 단지
    top = platform(...PLAT.back, [[19, 4], [14, 4]], Z.core);
    [[-6, -4, 2.6, 58], [5, -8, 3, 76], [-2, 7, 2.2, 44], [8, 4, 2, 50], [-9, 3, 1.8, 36]].forEach(([dx, dz, r, h]) => tower(PLAT.back[0] + dx, top, PLAT.back[1] + dz, r, h, Z.core, h * .22));

    // ── 하늘정원 (공중에 떠 있는 섬 + 신전 폐허 + 숲)
    garden = new THREE.Group();
    const rockG = new THREE.IcosahedronGeometry(13, 5), p = rockG.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), n = 1 + .12 * Math.sin(vx * .9) * Math.cos(vz * .8) + .08 * Math.sin(vy * 1.7);
      p.setXYZ(i, vx * n, vy > 0 ? 0 : vy * 1.9 * n - Math.max(0, 6 - Math.hypot(vx, vz)) * 1.2, vz * n);
    }
    rockG.computeVertexNormals();
    const gp = (geo, mat, x, yy, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, yy, z); m.castShadow = m.receiveShadow = true; garden.add(m); return m; };
    gp(rockG, M.rock, 0, 0, 0);
    gp(new THREE.CylinderGeometry(13.2, 13, 1.2, 48), M.grass, 0, .5, 0);
    gp(new THREE.CylinderGeometry(4.6, 5.2, 1, 24), M.marble, 0, 1.4, 0);
    gp(new THREE.CylinderGeometry(3.4, 3.6, .8, 24), M.marble, 0, 2.2, 0);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2, h = [5, 5, 2.2, 5, 3.4, 5, 5, 1.6, 5, 4, 5, 2.8][k];
      gp(new THREE.CylinderGeometry(.42, .5, h, 10), M.marble, Math.cos(a) * 7, 1.1 + h / 2, Math.sin(a) * 7);
    }
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + .3;
      gp(new THREE.BoxGeometry(4.2, .6, 1.2), M.marble, Math.cos(a) * 7, 6.4, Math.sin(a) * 7).rotation.y = -a + Math.PI / 2;
    }
    for (let k = 0; k < 34; k++) {
      const a = rand() * Math.PI * 2, r = between(8.6, 12.4), s = between(.8, 1.6);
      gp(new THREE.CylinderGeometry(.12 * s, .2 * s, 1.6 * s, 6), M.rock, Math.cos(a) * r, 1.1 + .8 * s, Math.sin(a) * r);
      gp(new THREE.IcosahedronGeometry(1.1 * s, 1), rand() < .5 ? M.leaf : M.leaf2, Math.cos(a) * r, 1.1 + 2 * s, Math.sin(a) * r);
    }
    for (let k = 0; k < 4; k++) {
      const pebble = gp(new THREE.IcosahedronGeometry(between(1.2, 2.4), 1), M.rock, between(-20, 20), between(-10, -3), between(-20, 20));
      pebble.scale.y = 1.4;
    }
    garden.position.set(-48, 46, -58);
    garden.traverse((o) => { if (o.isMesh) { o.userData.zone = Z.garden; pickables.push(o); } });
    scene.add(garden);

    flushGreebles();

    // 구름
    const puff = puffTex();
    for (let i = 0; i < 26; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, transparent: true, opacity: between(.6, .95), fog: false, depthWrite: false }));
      const a = rand() * Math.PI * 2, r = between(700, 1500);
      s.position.set(Math.cos(a) * r, between(90, 260) * (r / 900), Math.sin(a) * r);
      s.scale.set(between(260, 520), between(110, 190), 1);
      scene.add(s);
    }

    // 수송기
    for (let i = 0; i < 5; i++) crafts.push({ g: aircraft(), r: 110 + i * 34, h: 40 + i * 12, sp: (i % 2 ? -1 : 1) * (.05 + i * .012), a: i * 1.9 });

    renderer.shadowMap.needsUpdate = true;
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
    const t = new THREE.Vector3(...(z.aim || z.pos));
    // 지금 보는 방향은 유지하고 거리만 맞춤 (지하는 위에서 내려다보게)
    flyTo(t, z.dist * (mobile() ? 1.3 : 1), z.key === "arena" ? .45 : Math.min(Math.max(view.phi, .8), 1.15));
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
    flyTo(new THREE.Vector3(0, 20, 0), homeDist(), 1.16);
  }
  function flyTo(target, radius, phi) {
    fly = { t0: performance.now(), dur: 1800, from: { t: view.target.clone(), r: view.radius, p: view.phi }, to: { t: target, r: radius, p: phi } };
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
    cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; fly = null; view.drag = true; view.vt = view.vp = 0; });
    cv.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      const [px, py] = pts.get(e.pointerId);
      const dx = e.clientX - px, dy = e.clientY - py;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      moved += Math.abs(dx) + Math.abs(dy);
      idleAt = performance.now();
      if (pts.size === 1) {
        view.vt = -dx * .005; view.vp = -dy * .004;
        view.theta += view.vt;
        view.phi = Math.min(1.42, Math.max(.2, view.phi + view.vp));
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
      if (!pts.size) view.drag = false;
      if (moved < 6 && e.type === "pointerup") pick(e);
    };
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    cv.addEventListener("wheel", (e) => { e.preventDefault(); fly = null; idleAt = performance.now(); zoom(Math.exp(e.deltaY * .0012)); }, { passive: false });
  }
  function zoom(f) { view.goal = Math.min(620, Math.max(28, view.goal * f)); }
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
      view.radius = view.goal = fly.from.r + (fly.to.r - fly.from.r) * e;
      view.phi = fly.from.p + (fly.to.p - fly.from.p) * e;
      if (k >= 1) fly = null;
    }
    // 손을 떼도 살짝 미끄러지듯 멈춤 · 확대는 부드럽게 따라감
    if (!view.drag && !fly) {
      view.theta += view.vt; view.phi = Math.min(1.42, Math.max(.2, view.phi + view.vp));
      view.vt *= .92; view.vp *= .9;
    }
    view.radius += (view.goal - view.radius) * .12;
    if (!fly && now - idleAt > 4000) view.theta += .0006; // 가만히 있으면 천천히 회전
    const sp = Math.sin(view.phi);
    camera.position.set(
      view.target.x + view.radius * sp * Math.sin(view.theta),
      Math.max(3, view.target.y + view.radius * Math.cos(view.phi)),
      view.target.z + view.radius * sp * Math.cos(view.theta));
    camera.lookAt(view.target);

    sky.position.copy(camera.position);
    water.material.normalMap.offset.set(t * .006, t * .004);
    garden.position.y = 46 + Math.sin(t * .5) * 1.4;
    garden.rotation.y = t * .02;
    for (const c of crafts) {
      const a = c.a + t * c.sp;
      c.g.position.set(Math.cos(a) * c.r, c.h + Math.sin(t + c.a) * 2, Math.sin(a) * c.r);
      c.g.rotation.y = -a + (c.sp > 0 ? Math.PI : 0);
      c.g.rotation.z = -.15;
    }
    const on = Math.floor(t * 1.5) % 2 === 0;
    blinkers.forEach((b) => (b.visible = on));

    renderer.render(scene, camera);

    // 이름표 위치
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    const p = new THREE.Vector3();
    for (const tg of tags) {
      if (tg.z.key === "garden") tg.v.set(garden.position.x, garden.position.y + 18, garden.position.z);
      p.copy(tg.v).project(camera);
      const show = p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05 && !(tg.z.small && view.radius > 170 && !tg.el.classList.contains("on"));
      const sy = ((1 - p.y) / 2) * h;
      tg.el.style.display = show && sy > 80 ? "" : "none"; // 위쪽 버튼과 겹치면 숨김
      if (show) tg.el.style.transform = `translate(${((p.x + 1) / 2) * w}px, ${sy}px)`;
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
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile() ? 1.5 : 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    clock = new THREE.Clock();
    buildScene();
    makeTags();
    root.querySelector(".ag-stage").appendChild(renderer.domElement);
    bindControls(renderer.domElement);
    root.querySelector(".ag-load").remove();
    view.radius = homeDist() * 1.5; view.goal = homeDist(); // 처음엔 멀리서 다가오듯
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
