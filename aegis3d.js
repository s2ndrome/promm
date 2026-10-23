// ARCH 페이지 05 장소: 아이기스를 3D 로 둘러보는 뷰어 (사이버펑크 야경)
// three.js 는 화면에 보일 때만 불러옴. 빛 번짐·반사되는 바다는 vendor/three-extras.js
(function () {
  const App = window.App;
  const THREE_SRC = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
  const EXTRAS_SRC = "vendor/three-extras.js?v=2";

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

  let THREE, root, renderer, composer, scene, camera, clock, water, sky, tags = [], pickables = [];
  let garden, crafts = [], blinkers = [], spinners = [], beams = [], flickers = [], timeUniforms = [];
  let traffic, rain, loading = null, running = false, visible = false, tourTimer = null;
  const view = { theta: .28, phi: 1.2, radius: 280, goal: 280, target: null, vt: 0, vp: 0, drag: false };
  let fly = null; // 카메라 이동 애니메이션
  let idleAt = 0;
  const mobile = () => window.innerWidth < 700;
  const homeDist = () => (mobile() ? 370 : 245);

  function script(src) {
    return new Promise((ok, no) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = no;
      document.head.appendChild(s);
    });
  }
  function loadThree() {
    loading ||= (async () => {
      if (!window.THREE) await script(THREE_SRC);
      if (!window.THREE.SSAOPass) await script(EXTRAS_SRC);
      return window.THREE;
    })().catch(() => { loading = null; throw new Error("3D 엔진을 불러오지 못했어요"); });
    return loading;
  }

  // ---------- 색 ----------
  let C; // 네온 색 (1 보다 큰 값 = 빛 번짐)
  const col = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const neon = (r, g, b) => new THREE.Color(r, g, b);

  // ---------- 텍스처 (그림 파일 없이 캔버스로 그림) ----------
  let rnd = 7;
  const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  const between = (a, b) => a + rand() * (b - a);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
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

  // 벽: 어두운 강철 패널 + 가로 창문 띠 (창문은 청록 · 분홍 · 호박색으로 빛남)
  function wallTex(glow) {
    rnd = 11;
    return canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = glow ? "#000" : "#2b313b"; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 256) {
        if (!glow) {
          for (let x = 0; x < w; x += 64) {
            const v = 44 + Math.floor(rand() * 16);
            g.fillStyle = `rgb(${v - 4},${v},${v + 10})`; g.fillRect(x + 1, y + 2, 62, 150);
            g.fillStyle = "rgba(255,255,255,.05)"; g.fillRect(x + 1, y + 2, 62, 2);
          }
          g.fillStyle = "#6e7a8a"; g.fillRect(0, y + 154, w, 3);
          g.fillStyle = "#070a10"; g.fillRect(0, y + 160, w, 70);
          g.fillStyle = "#1c222b"; g.fillRect(0, y + 232, w, 24);
        } else {
          g.fillStyle = "#0b3a4a"; g.fillRect(0, y + 154, w, 3); // 층마다 가는 빛줄
        }
        for (let x = 0; x < w; x += 16) {
          const r = rand();
          const lit = r > .965 ? "#ffffff" : r > .93 ? "#9fe8ff" : r > .78 ? "#d9fbff" : r > .55 ? "#59c8ff" : r > .35 ? "#0e3550" : "#000";
          g.fillStyle = glow || r > .55 ? lit : "#0a1220";
          g.fillRect(x + 2, y + 166, 12, 58);
        }
      }
    });
  }
  function panelTex(base = 58) {
    rnd = 5;
    return canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = "#0e1117"; g.fillRect(0, 0, w, h);
      const cell = (x, y, cw, ch, d) => {
        if (d > 0 && cw > 40 && ch > 40 && rand() < .75) {
          if (rand() < .5) { const k = Math.floor(cw * between(.3, .7)); cell(x, y, k, ch, d - 1); cell(x + k, y, cw - k, ch, d - 1); }
          else { const k = Math.floor(ch * between(.3, .7)); cell(x, y, cw, k, d - 1); cell(x, y + k, cw, ch - k, d - 1); }
          return;
        }
        const v = base + Math.floor(between(-10, 10));
        g.fillStyle = `rgb(${v - 4},${v + 2},${v + 12})`; g.fillRect(x + 1.5, y + 1.5, cw - 3, ch - 3);
        if (rand() < .2) { g.fillStyle = "rgba(5,8,12,.8)"; g.fillRect(x + cw * .25, y + ch * .3, cw * .5, ch * .15); }
      };
      cell(0, 0, w, h, 5);
    });
  }
  // 둥근 옥상: 동심원 네온 · 방사선 · 해치 (glow=true 는 빛나는 선만)
  function deckTex(kind, glow) {
    rnd = kind.length * 13;
    return canvasTex(1024, 1024, (g, w, h) => {
      const c = w / 2;
      g.fillStyle = glow ? "#000" : "#1a1f27"; g.fillRect(0, 0, w, h);
      for (let r = c; r > 0; r -= 46) {
        if (!glow) { g.fillStyle = `rgb(${24 + (r % 3) * 5},${28 + (r % 3) * 5},${36 + (r % 3) * 5})`; g.beginPath(); g.arc(c, c, r, 0, 7); g.fill(); }
        g.strokeStyle = glow ? (r % 138 === 0 ? "#2bd8ff" : "#06303f") : "#48525f"; g.lineWidth = 2; g.beginPath(); g.arc(c, c, r, 0, 7); g.stroke();
      }
      g.strokeStyle = glow ? "#08384a" : "rgba(120,140,160,.25)"; g.lineWidth = 3;
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.beginPath(); g.moveTo(c + Math.cos(a) * 120, c + Math.sin(a) * 120); g.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c); g.stroke(); }
      for (let i = 0; i < 70; i++) {
        const a = rand() * Math.PI * 2, r = between(150, c - 30), s = between(12, 40);
        g.fillStyle = glow ? (rand() < .25 ? pick(["#2bd8ff", "#8fdcff", "#e6faff"]) : "#000") : rand() < .5 ? "#0c0f14" : "#39424e";
        g.save(); g.translate(c + Math.cos(a) * r, c + Math.sin(a) * r); g.rotate(a); g.fillRect(-s / 2, -s / 3, s, s * .66); g.restore();
      }
      g.strokeStyle = glow ? "#4fe8ff" : "#2d6a85"; g.lineWidth = 7; g.beginPath(); g.arc(c, c, c - 24, 0, 7); g.stroke();
      if (kind === "pad") {
        g.fillStyle = glow ? "#000" : "#151a21"; g.beginPath(); g.arc(c, c, 330, 0, 7); g.fill();
        g.strokeStyle = glow ? "#4fe8ff" : "#4a8aa8"; g.lineWidth = 14; g.beginPath(); g.arc(c, c, 300, 0, 7); g.stroke();
        g.fillStyle = glow ? "#cff8ff" : "#b8d8e8"; g.font = "700 380px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("H", c, c + 20);
      }
      if (kind === "core") { g.fillStyle = "#000"; g.beginPath(); g.arc(c, c, 260, 0, 7); g.fill(); }
    });
  }
  function signTex() {
    return canvasTex(1024, 360, (g, w, h) => {
      g.fillStyle = "#06080d"; g.fillRect(0, 0, w, h);
      g.shadowColor = "#38e1ff"; g.shadowBlur = 24;
      g.strokeStyle = "#7fefff"; g.lineWidth = 5; g.strokeRect(16, 16, w - 32, h - 32);
      g.lineWidth = 4;
      for (const s of [-1, 1]) for (let i = 0; i < 7; i++) {
        g.beginPath(); g.moveTo(w / 2 + s * 250, 120 + i * 14); g.quadraticCurveTo(w / 2 + s * (330 + i * 10), 60 + i * 18, w / 2 + s * (420 + i * 6), 40 + i * 26); g.stroke();
      }
      g.fillStyle = "#e9fdff"; g.textAlign = "center";
      g.font = "700 170px Georgia, 'Times New Roman', serif"; g.fillText("ARCH", w / 2, 200);
      g.shadowColor = "#38e1ff"; g.fillStyle = "#d6f6ff";
      g.font = "600 62px Georgia, 'Times New Roman', serif"; g.fillText("A E G I S", w / 2, 300);
    });
  }
  function emblemTex() {
    return canvasTex(256, 256, (g) => {
      g.shadowColor = "#38e1ff"; g.shadowBlur = 14;
      g.strokeStyle = "#cffaff"; g.lineWidth = 6;
      g.beginPath(); g.moveTo(128, 40); g.lineTo(186, 64); g.lineTo(180, 150); g.lineTo(128, 210); g.lineTo(76, 150); g.lineTo(70, 64); g.closePath(); g.stroke();
      g.fillStyle = "#cffaff"; g.font = "700 90px Georgia, serif"; g.textAlign = "center"; g.fillText("A", 128, 158);
      for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(128 + s * 66, 80 + i * 14); g.lineTo(128 + s * (100 + i * 6), 54 + i * 22); g.stroke(); }
    });
  }
  // 네온 간판 (세로/가로)
  function neonTex(text, color, vertical) {
    const w = vertical ? 160 : 640, h = vertical ? 640 : 180;
    return canvasTex(w, h, (g) => {
      g.strokeStyle = color; g.shadowColor = color; g.shadowBlur = 18; g.lineWidth = 4;
      g.strokeRect(10, 10, w - 20, h - 20);
      g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
      if (vertical) {
        g.font = "800 84px 'Pretendard Variable', Pretendard, sans-serif";
        [...text].forEach((ch, i, a) => g.fillText(ch, w / 2, h / 2 + (i - (a.length - 1) / 2) * 96));
      } else {
        g.font = "800 92px 'Pretendard Variable', Pretendard, Arial, sans-serif";
        g.fillText(text, w / 2, h / 2 + 4);
      }
      g.globalCompositeOperation = "source-atop";
      for (let y = 0; y < h; y += 4) { g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(0, y, w, 1.5); }
    });
  }
  function runwayTex(glow) {
    rnd = 9;
    return canvasTex(256, 2048, (g, w, h) => {
      g.fillStyle = glow ? "#000" : "#14181e"; g.fillRect(0, 0, w, h);
      if (!glow) for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${rand() * .03})`; g.fillRect(rand() * w, rand() * h, 3, 12); }
      g.fillStyle = glow ? "#3a8fa8" : "#9fb2c4";
      for (let y = 60; y < h - 420; y += 120) g.fillRect(w / 2 - 5, y, 10, 64);
      g.fillStyle = glow ? "#2bd8ff" : "#8fd8ff"; g.fillRect(14, 0, 6, h); g.fillRect(w - 20, 0, 6, h);
      g.fillStyle = glow ? "#bff6ff" : "#d7e6f2";
      g.font = "700 130px Arial"; g.textAlign = "center"; g.fillText("01", w / 2, h - 210);
      for (let i = 0; i < 8; i++) g.fillRect(28 + i * 26, h - 150, 14, 120);
    });
  }
  function waterNormal() {
    const N = 256, img = new ImageData(N, N), hgt = new Float32Array(N * N);
    const waves = [[3, 1, .9], [1, 4, .7], [5, -2, .4], [-4, 6, .25], [9, 3, .15], [2, -11, .12], [13, 7, .07], [-17, 5, .05]];
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
  function dotTex() {
    return canvasTex(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.25, "rgba(255,255,255,.6)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    });
  }
  function puffTex() {
    rnd = 3;
    return canvasTex(512, 256, (g, w, h) => {
      for (let i = 0; i < 70; i++) {
        const x = between(60, 450), y = between(100, 170) - Math.sin((x / w) * Math.PI) * 40, r = between(26, 74);
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, "rgba(22,32,54,.7)"); gr.addColorStop(1, "rgba(22,32,54,0)");
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }
      const sh = g.createLinearGradient(0, 110, 0, 230); sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(50,150,255,.28)");
      g.globalCompositeOperation = "source-atop"; g.fillStyle = sh; g.fillRect(0, 0, w, h);
    });
  }

  // ---------- 셰이더 ----------
  const MOON = [0.42, 0.3, -0.86];
  // 밤하늘: 위는 거의 검정, 수평선은 도시 불빛에 보라·분홍으로 물듦 + 별 + 달
  function skyMesh() {
    return new THREE.Mesh(new THREE.SphereGeometry(2400, 48, 24), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { moon: { value: new THREE.Vector3(...MOON).normalize() }, top: { value: col(0x020309) }, mid: { value: col(0x06112a) }, hor: { value: col(0x0b2442) }, glow: { value: col(0x1f78c8) }, sea: { value: col(0x02040a) } },
      vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 moon, top, mid, hor, glow, sea; varying vec3 vDir;
        float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        void main(){
          vec3 d = normalize(vDir); float h = d.y;
          vec3 c = mix(hor, mid, smoothstep(.0, .2, h));
          c = mix(c, top, smoothstep(.2, .8, h));
          c += glow * .35 * exp(-abs(h) * 22.);
          c = mix(c, sea, smoothstep(.0, -.08, h));
          float st = step(.9975, hash(floor(d * 420.))) * smoothstep(.06, .35, h);
          c += vec3(.8, .9, 1.) * st * (.4 + .6 * hash(floor(d * 37.)));
          float s = max(dot(d, moon), 0.);
          c += vec3(.85, .9, 1.) * (smoothstep(.9994, .9996, s) * 2.5 + pow(s, 60.) * .12);
          gl_FragColor = vec4(c, 1.);
        }`,
    }));
  }
  // 에너지 방어막: 가장자리로 갈수록 보이는 육각형 격자 + 위로 흐르는 파동
  function shieldMat() {
    const u = { time: { value: 0 }, color: { value: neon(.12, .6, 1.1) } };
    timeUniforms.push(u.time);
    return new THREE.ShaderMaterial({
      uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vN; varying vec3 vP; varying vec2 vUv;
        void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float time; uniform vec3 color; varying vec3 vN; varying vec3 vP; varying vec2 vUv;
        float hex(vec2 p){ p.x *= 1.1547; p.y += mod(floor(p.x), 2.) * .5; p = abs(fract(p) - .5); return abs(max(p.x * 1.5 + p.y, p.y * 2.) - 1.); }
        void main(){
          float f = 1. - abs(dot(normalize(cameraPosition - vP), normalize(vN)));
          f = pow(f, 3.);
          float e = 1. - smoothstep(0., .05, hex(vec2(vUv.x * 260., vUv.y * 75.)));
          float wave = smoothstep(.06, 0., abs(fract(vUv.y * 1.4 - time * .05) - .5) - .44);
          float inside = 1. - smoothstep(170., 195., length(cameraPosition - vec3(0., -2., 0.)));
          float a = (f * .28 + e * f * f * .5 + wave * e * f * .3) * smoothstep(.0, .08, vP.y + 2.) * mix(1., .12, inside);
          gl_FragColor = vec4(color * a, 1.);
        }`,
    });
  }
  // 홀로그램 고리: 끊어진 눈금이 돌아감
  function ringMat(color, n) {
    const u = { time: { value: 0 }, color: { value: color }, n: { value: n } };
    timeUniforms.push(u.time);
    return new THREE.ShaderMaterial({
      uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
      fragmentShader: `uniform float time, n; uniform vec3 color; varying vec2 vP;
        void main(){
          float a = atan(vP.y, vP.x) / 6.2831853 + .5;
          float seg = step(.35, fract(a * n + time * .15));
          float tick = step(.92, fract(a * n * 6.));
          float big = step(.97, fract(a * 3. - time * .05));
          gl_FragColor = vec4(color * (seg * .5 + tick * .7 + big), 1.);
        }`,
    });
  }
  // 빛기둥 · 탐조등: 밑동은 밝고 끝으로 갈수록 사라짐
  function beamMat(color, power = 1) {
    const u = { time: { value: 0 }, color: { value: color }, power: { value: power } };
    timeUniforms.push(u.time);
    return new THREE.ShaderMaterial({
      uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vP;
        void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float time, power; uniform vec3 color; varying vec2 vUv; varying vec3 vN; varying vec3 vP;
        void main(){
          float edge = abs(dot(normalize(cameraPosition - vP), normalize(vN)));
          float a = pow(1. - vUv.y, 1.6) * pow(edge, 1.5) * power * (.85 + .15 * sin(time * 3. + vUv.y * 20.));
          gl_FragColor = vec4(color * a * .35, 1.);
        }`,
    });
  }

  // ---------- 재질 · 도형 도우미 ----------
  let M, greebles = [], statics, lanes = [];
  function makeMaterials() {
    const win = wallTex(false), glow = wallTex(true), panel = panelTex(), roof = panelTex(40);
    const std = (o) => new THREE.MeshStandardMaterial(o);
    const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, ...o });
    C = { cyan: neon(.3, 1.9, 2.8), mag: neon(.35, 1.1, 3), amber: neon(1.5, 2.3, 3), red: neon(1.2, 2.2, 3.2), white: neon(2.4, 2.6, 3) };
    M = {
      win: std({ map: win, emissiveMap: glow, emissive: 0xffffff, emissiveIntensity: 2.2, metalness: .85, roughness: .28, envMapIntensity: 1.3 }),
      hull: std({ map: panel, bumpMap: panel, bumpScale: .02, metalness: .9, roughness: .3, envMapIntensity: 1.5 }),
      roof: std({ map: roof, metalness: .7, roughness: .45 }),
      dark: std({ color: col(0x11141a), metalness: .85, roughness: .35 }),
      unit: std({ color: col(0x3a414c), metalness: .85, roughness: .35 }),
      steel: std({ color: col(0x8d97a6), metalness: 1, roughness: .16, envMapIntensity: 1.8 }),
      cyan: basic(C.cyan), mag: basic(C.mag), amber: basic(C.amber), red: basic(C.red), white: basic(C.white),
      halo: basic(neon(.1, .6, 1.1), { transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false }),
      haloM: basic(neon(.1, .4, 1.2), { transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false }),
      glass: std({ color: col(0x5ac8ff), metalness: 1, roughness: .05, transparent: true, opacity: .35, envMapIntensity: 2, emissive: col(0x0a3050), emissiveIntensity: .6 }),
      leaf: std({ color: col(0x1e5a3c), roughness: .8, emissive: col(0x062a1a), emissiveIntensity: .5 }),
      leaf2: std({ color: col(0x2c6e46), roughness: .8, emissive: col(0x0a3422), emissiveIntensity: .5 }),
      grass: std({ color: col(0x1d3f2c), roughness: .95 }),
      rock: std({ color: col(0x2e2c33), roughness: .85, metalness: .1 }),
      marble: std({ color: col(0xd8dde6), roughness: .45, emissive: col(0x6a7fa0), emissiveIntensity: .25 }),
      cell: std({ color: col(0xe9f3ff), emissive: col(0xd0e8ff), emissiveIntensity: 1.6, roughness: .3 }),
      foam: new THREE.MeshBasicMaterial({ color: neon(.2, .9, 1.3), transparent: true, opacity: .18, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      deck: {},
    };
    for (const k of ["ring", "pad", "core"]) M.deck[k] = std({ map: deckTex(k, false), emissiveMap: deckTex(k, true), emissive: 0xffffff, emissiveIntensity: 1.8, metalness: .7, roughness: .4 });
  }
  // 정적인 건물은 나중에 재질별로 하나로 합쳐서 그림 (그리는 횟수를 줄여 부드럽게)
  function add(geo, mat, x = 0, y = 0, z = 0, zone) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (zone) m.userData.zone = zone;
    statics.add(m);
    return m;
  }
  function bake() {
    statics.updateMatrixWorld(true);
    const buckets = new Map();
    statics.traverse((o) => {
      if (!o.isMesh) return;
      const g = o.geometry, multi = Array.isArray(o.material);
      const groups = multi ? g.groups : [{ start: 0, count: g.index ? g.index.count : g.attributes.position.count, materialIndex: 0 }];
      for (const gr of groups) {
        const mat = multi ? o.material[gr.materialIndex] : o.material;
        const key = `${mat.uuid}|${o.userData.zone?.key || ""}|${o.renderOrder}`;
        if (!buckets.has(key)) buckets.set(key, { mat, zone: o.userData.zone, ro: o.renderOrder, parts: [], n: 0 });
        const b = buckets.get(key);
        b.parts.push([g, o.matrixWorld, gr.start, gr.count]);
        b.n += gr.count;
      }
    });
    const v = new THREE.Vector3(), nm = new THREE.Matrix3();
    for (const b of buckets.values()) {
      const pos = new Float32Array(b.n * 3), nor = new Float32Array(b.n * 3), uv = new Float32Array(b.n * 2);
      let k = 0;
      for (const [g, mw, start, count] of b.parts) {
        const P = g.attributes.position, N = g.attributes.normal, T = g.attributes.uv, I = g.index;
        nm.getNormalMatrix(mw);
        for (let i = start; i < start + count; i++, k++) {
          const vi = I ? I.getX(i) : i;
          v.fromBufferAttribute(P, vi).applyMatrix4(mw); pos[k * 3] = v.x; pos[k * 3 + 1] = v.y; pos[k * 3 + 2] = v.z;
          v.fromBufferAttribute(N, vi).applyMatrix3(nm).normalize(); nor[k * 3] = v.x; nor[k * 3 + 1] = v.y; nor[k * 3 + 2] = v.z;
          if (T) { uv[k * 2] = T.getX(vi); uv[k * 2 + 1] = T.getY(vi); }
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, b.mat);
      m.matrixAutoUpdate = false;
      m.renderOrder = b.ro;
      if (b.zone) { m.userData.zone = b.zone; pickables.push(m); }
      scene.add(m);
    }
    statics.traverse((o) => o.geometry?.dispose());
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
  const NEONS = () => [M.cyan, M.cyan, M.mag, M.amber];
  function block(x, y, z, w, h, d, rot = 0, zone) {
    const m = add(boxG(w, h, d), blockMats(), x, y + h / 2, z, zone);
    m.rotation.y = rot;
    // 지붕 둘레 네온 한 줄
    if (rand() < .55) add(new THREE.BoxGeometry(w + .12, .12, d + .12), pick(NEONS()), x, y + h - .25, z).rotation.y = rot;
    if (h > 3 && w * d > 10 && rand() < .6) greeble(x, y + h, z, 0, Math.min(w, d) * .3, 2);
    return m;
  }
  // 팔각 타워 (창문 + 꼭대기 첨탑 + 빛 띠 + 경고등)
  function tower(x, y, z, r, h, zone, spire = h * .3, ring = M.cyan) {
    const g = uvScale(new THREE.CylinderGeometry(r * .94, r, h, 8, 1, true), (2 * Math.PI * r) / U, h / U);
    add(g, M.win, x, y + h / 2, z, zone).rotation.y = Math.PI / 8;
    add(new THREE.CylinderGeometry(r + .35, r + .35, .9, 8), M.hull, x, y + h + .45, z, zone).rotation.y = Math.PI / 8;
    add(new THREE.CylinderGeometry(r + .37, r + .37, .22, 8, 1, true), ring, x, y + h + .2, z).rotation.y = Math.PI / 8;
    add(new THREE.CylinderGeometry(r * .97 + .03, r * .97 + .03, .16, 8, 1, true), ring, x, y + h * .5, z).rotation.y = Math.PI / 8;
    add(new THREE.ConeGeometry(r * .8, spire, 8), M.steel, x, y + h + .9 + spire / 2, z, zone).rotation.y = Math.PI / 8;
    const top = y + h + .9 + spire;
    blinker(x, top + .3, z, .35);
    return top;
  }
  function blinker(x, y, z, s = .3) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), M.red);
    b.position.set(x, y, z);
    b.userData.phase = rand() * 6;
    blinkers.push(b);
    scene.add(b);
  }
  function band(x, y, z, r, mat = M.cyan, tube = .1) {
    add(new THREE.TorusGeometry(r, tube, 4, 96), mat, x, y, z).rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(r, tube * 7, 4, 96), mat === M.mag ? M.haloM : M.halo, x, y, z).rotation.x = Math.PI / 2;
  }
  // 둥근 층 하나: 창문 벽 + 튀어나온 처마 + 네온 띠 + 옥상
  let tierN = 0;
  function tier(x, z, y0, r, h, zone, deck = "ring", slope = .04) {
    const wall = uvScale(new THREE.CylinderGeometry(r, r * (1 + slope), h, 96, 1, true), Math.round((2 * Math.PI * r) / U), h / U);
    add(wall, M.win, x, y0 + h / 2, z, zone);
    const lip = [[r - .3, h - .2], [r + .7, h - .2], [r + 1.1, h + .1], [r + 1.1, h + .55], [r + .8, h + .8], [r - .3, h + .8]];
    const lg = uvScale(new THREE.LatheGeometry(lip.map(([a, b]) => new THREE.Vector2(a, y0 + b)), 96), Math.round((2 * Math.PI * r) / 5), 1);
    add(lg, M.hull, x, 0, z, zone);
    band(x, y0 + h + .32, z, r + 1.12, tierN++ % 3 === 2 ? M.mag : M.cyan);
    const top = add(new THREE.CircleGeometry(r + .8, 96), M.deck[deck], x, y0 + h + .81, z, zone);
    top.rotation.x = -Math.PI / 2;
    return y0 + h + .81;
  }
  // 바다에 닿는 경사진 받침 + 물가 빛
  function skirt(x, z, r, zone) {
    const pts = [[r + 3.4, -4], [r + 3.4, .4], [r + 2.2, 1.2], [r + .6, 1.6], [r - 1, 1.6]];
    add(uvScale(new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 96), Math.round((2 * Math.PI * r) / 5), 1), M.hull, x, 0, z, zone);
    add(new THREE.TorusGeometry(r + 3.42, .1, 4, 96), M.cyan, x, .55, z).rotation.x = Math.PI / 2;
    const f = add(new THREE.RingGeometry(r + 3.4, r + 9, 96), M.foam, x, .15, z);
    f.rotation.x = -Math.PI / 2; f.renderOrder = 2;
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
    scene.add(im);
  }
  // 네온 간판 (가끔 깜빡임)
  function sign(text, color, x, y, z, rot, vertical, size = 1) {
    const w = (vertical ? 3.4 : 13) * size, h = (vertical ? 13.6 : 3.7) * size;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
      map: neonTex(text, color, vertical), transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, toneMapped: false, color: new THREE.Color(color).multiplyScalar(1.6),
    }));
    m.position.set(x, y, z); m.rotation.y = rot;
    m.userData.phase = rand() * 100;
    flickers.push(m);
    scene.add(m);
  }
  // 다리: 아래 데크 + 지붕 덮인 통로 + 난간 네온 + 오가는 불빛
  function bridge(x1, z1, x2, z2, w = 7) {
    const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz), rot = Math.atan2(dx, dz), cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    const ox = Math.cos(rot), oz = -Math.sin(rot); // 옆 방향
    add(boxG(w, 2.4, len), [M.hull, M.hull, M.roof, M.dark, M.hull, M.hull], cx, 1, cz).rotation.y = rot;
    add(boxG(w * .5, 2.6, len), blockMats(), cx, 3.5, cz).rotation.y = rot;
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(.14, .14, len), M.cyan, cx + ox * s * w / 2, 2.3, cz + oz * s * w / 2).rotation.y = rot;
    add(new THREE.BoxGeometry(.12, .12, len), M.mag, cx, 4.85, cz).rotation.y = rot;
    for (let k = 1; k < len / 16; k++) {
      const t = k / Math.ceil(len / 16);
      add(new THREE.BoxGeometry(w + .6, 3.6, .8), M.dark, x1 + dx * t, 2.6, z1 + dz * t).rotation.y = rot;
    }
    for (const s of [-1, 1]) lanes.push({ a: [x1 + ox * s * 2.7, 2.6, z1 + oz * s * 2.7], b: [x2 + ox * s * 2.7, 2.6, z2 + oz * s * 2.7], dir: s, n: Math.ceil(len / 9) });
  }
  // 바다로 길게 뻗은 부두: 양쪽에 건물이 줄지어 있음
  function arm(ang, from, len) {
    const c = Math.cos(ang), s = Math.sin(ang), rot = Math.atan2(c, s), ox = Math.cos(rot), oz = -Math.sin(rot);
    const x1 = c * from, z1 = s * from, x2 = c * (from + len), z2 = s * (from + len);
    add(boxG(12, 3, len), [M.hull, M.hull, M.roof, M.dark, M.hull, M.hull], (x1 + x2) / 2, .6, (z1 + z2) / 2).rotation.y = rot;
    for (const sd of [-1, 1]) add(new THREE.BoxGeometry(.16, .16, len), M.cyan, (x1 + x2) / 2 + ox * sd * 6.05, 2.05, (z1 + z2) / 2 + oz * sd * 6.05).rotation.y = rot;
    let n = 0;
    for (let d = 6; d < len - 4; d += between(8, 13)) {
      for (const side of [-1, 1]) {
        if (rand() < .2) continue;
        const px = c * (from + d) + ox * side * 3.6, pz = s * (from + d) + oz * side * 3.6, h = between(2, 8);
        block(px, 2.1, pz, 4.2, h, between(5, 9), rot);
        if (h > 5 && n++ % 3 === 0) sign(pick(["ARCH", "AEGIS", "SENTINEL", "GUIDE", "가이딩", "센티넬", "ZONE 7", "아크"]), pick(["#38e1ff", "#8fdcff", "#e6faff"]), px + ox * side * 2.2, 2.1 + h + 2.4, pz + oz * side * 2.2, rot + Math.PI / 2, false, .45);
      }
    }
    for (const sd of [-1, 1]) lanes.push({ a: [x1 + ox * sd * .8, 2.4, z1 + oz * sd * .8], b: [x2 + ox * sd * .8, 2.4, z2 + oz * sd * .8], dir: sd, n: Math.ceil(len / 10) });
    skirt(x2, z2, 6);
    tier(x2, z2, 1.6, 6, 3);
    tower(x2, 5.4, z2, 1.6, 10, null, 6, M.mag);
  }
  // 퀸젯 같은 수송기
  function aircraft(scale = 1.4) {
    const g = new THREE.Group();
    const part = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
    part(new THREE.CylinderGeometry(.5, .9, 5.2, 8), M.dark, 0, 0, 0).rotation.x = Math.PI / 2;
    part(new THREE.ConeGeometry(.5, 1.8, 8), M.steel, 0, 0, -3.4).rotation.x = -Math.PI / 2;
    part(new THREE.BoxGeometry(8.5, .14, 2), M.hull, 0, 0, .7);
    for (const sx of [-1, 1]) {
      part(new THREE.BoxGeometry(.12, 1.4, 1.4), M.hull, sx * .7, .7, 2.2).rotation.z = sx * .4;
      part(new THREE.CylinderGeometry(.45, .45, 1.8, 10), M.dark, sx * 3.3, -.1, .7).rotation.x = Math.PI / 2;
      part(new THREE.CircleGeometry(.42, 10), M.cyan, sx * 3.3, -.1, 1.62);
      part(new THREE.SphereGeometry(.13, 6, 4), sx < 0 ? M.red : new THREE.MeshBasicMaterial({ color: neon(1.2, 2.2, 3.2), toneMapped: false }), sx * 4.2, 0, .7);
    }
    part(new THREE.BoxGeometry(.8, .3, 1.2), M.cyan, 0, .3, -1.6);
    const b = part(new THREE.SphereGeometry(.16, 6, 4), M.red, 0, .55, -.6); b.userData.phase = rand() * 6; blinkers.push(b);
    g.scale.setScalar(scale);
    scene.add(g);
    return g;
  }

  // 오가는 불빛 (다리 · 부두 · 활주로 · 하늘길)
  function makeTraffic() {
    const cars = [];
    for (const L of lanes) {
      const len = Math.hypot(L.b[0] - L.a[0], L.b[2] - L.a[2]);
      for (let i = 0; i < L.n; i++) cars.push({ L, t: rand(), sp: between(4, 8) / len, col: L.col || (L.dir > 0 ? C.white : C.red) });
    }
    for (let i = 0; i < 70; i++) {
      const r = between(70, 260), h = between(28, 110), sp = between(.012, .03) * (rand() < .5 ? -1 : 1);
      cars.push({ orbit: { r, h, wob: between(4, 18) }, t: rand(), sp, col: pick([C.white, C.cyan, C.mag, C.amber, C.red]) });
    }
    const TRAIL = 5, n = cars.length * TRAIL;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const colors = new Float32Array(n * 3);
    cars.forEach((c, i) => { for (let k = 0; k < TRAIL; k++) { const f = (1 - k / TRAIL) ** 1.6; colors.set([c.col.r * f, c.col.g * f, c.col.b * f], (i * TRAIL + k) * 3); } });
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.2, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    pts.frustumCulled = false;
    scene.add(pts);
    traffic = { cars, geo, TRAIL };
  }
  function moveTraffic(dt) {
    const { cars, geo, TRAIL } = traffic, P = geo.attributes.position.array;
    cars.forEach((c, i) => {
      c.t = (c.t + c.sp * dt + 1) % 1;
      for (let k = 0; k < TRAIL; k++) {
        const j = (i * TRAIL + k) * 3;
        if (c.orbit) {
          const a = (c.t - k * .0016 * Math.sign(c.sp)) * Math.PI * 2, o = c.orbit;
          P[j] = Math.cos(a) * o.r; P[j + 1] = o.h + Math.sin(a * 3) * o.wob * .2; P[j + 2] = Math.sin(a) * o.r;
        } else {
          const t = Math.min(1, Math.max(0, (c.L.dir > 0 ? c.t : 1 - c.t) - k * .008 * c.L.dir));
          for (let q = 0; q < 3; q++) P[j + q] = c.L.a[q] + (c.L.b[q] - c.L.a[q]) * t;
        }
      }
    });
    geo.attributes.position.needsUpdate = true;
  }
  // 비: 카메라가 보는 곳 주변에만 가늘게
  function makeRain() {
    const N = mobile() ? 700 : 1600, seed = [];
    for (let i = 0; i < N; i++) seed.push([between(-150, 150), between(0, 160), between(-150, 150)]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: neon(.35, .5, .75), transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    lines.frustumCulled = false;
    scene.add(lines);
    rain = { seed, geo, N };
  }
  function moveRain(t) {
    const { seed, geo, N } = rain, P = geo.attributes.position.array, cx = view.target.x, cz = view.target.z;
    for (let i = 0; i < N; i++) {
      const [x, y0, z] = seed[i], y = ((y0 - t * 70) % 160 + 160) % 160, j = i * 6;
      P[j] = cx + x; P[j + 1] = y; P[j + 2] = cz + z;
      P[j + 3] = cx + x - .4; P[j + 4] = y + 3.2; P[j + 5] = cz + z - .2;
    }
    geo.attributes.position.needsUpdate = true;
  }

  function buildScene() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(col(0x061226), .0021);
    camera = new THREE.PerspectiveCamera(36, 1, 1, 6000);
    view.target = new THREE.Vector3(0, 22, 0);
    makeMaterials();
    statics = new THREE.Group();

    // 밤하늘 + 하늘·네온을 비추는 금속 반사
    sky = skyMesh();
    sky.renderOrder = -10;
    scene.add(sky);
    const envScene = new THREE.Scene();
    envScene.add(skyMesh());
    [[C.cyan, 0], [C.mag, 2.1], [C.amber, 4.2], [C.cyan, 3.1]].forEach(([c, a]) => {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(900, 60), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(.5), side: THREE.DoubleSide }));
      strip.position.set(Math.cos(a) * 1200, 120, Math.sin(a) * 1200); strip.lookAt(0, 120, 0);
      envScene.add(strip);
    });
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(envScene, .02).texture;
    pm.dispose();

    scene.add(new THREE.HemisphereLight(col(0x3a4f9a), col(0x05040a), .55));
    const moon = new THREE.DirectionalLight(col(0x9fb4ff), .9);
    moon.position.set(MOON[0] * 300, MOON[1] * 300 + 100, MOON[2] * 300);
    scene.add(moon);
    for (const [c, x, y, z, d] of [[0x2bd8ff, 0, 40, 0, 160], [0x5aa8ff, 0, 14, 60, 110], [0x2bd8ff, -60, 20, 20, 110], [0x7fd8ff, 60, 20, 30, 110]]) {
      const l = new THREE.PointLight(col(c), 2.2, d, 1.6); l.position.set(x, y, z); scene.add(l);
    }

    const Z = Object.fromEntries(ZONES.map((z) => [z.key, z]));

    // 바다 (도시 불빛이 진짜로 비침)
    water = new THREE.Water(new THREE.PlaneGeometry(6000, 6000), {
      textureWidth: mobile() ? 256 : 512, textureHeight: mobile() ? 256 : 512, waterNormals: waterNormal(),
      sunDirection: new THREE.Vector3(...MOON).normalize(), sunColor: col(0xb8c8ff), waterColor: col(0x010409),
      distortionScale: 2.4, fog: true,
    });
    water.material.fragmentShader = water.material.fragmentShader.replace("vec3( 0.1 ) + reflectionSample * 0.9", "reflectionSample * 0.92");
    water.material.uniforms.size.value = 1.6;
    water.rotation.x = -Math.PI / 2;
    water.renderOrder = -1;
    scene.add(water);

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
      tower(Math.cos(a) * 14.5, tops[2], Math.sin(a) * 14.5, between(1.7, 2.4), h, Z.core, between(8, 14), i % 2 ? M.mag : M.cyan);
    }
    greeble(0, tops[2], 0, 12.5, 16.5, 18);

    // 관제탑: 위로 갈수록 가늘어지는 팔각 기둥 + 모서리 네온 + 왕관 첨탑 + 하늘로 쏘는 빛기둥
    y = tops[3];
    [[7, 28], [5.6, 22], [4.4, 18], [3.2, 12]].forEach(([r, h], i) => {
      add(uvScale(new THREE.CylinderGeometry(r * .97, r, h, 8, 1, true), (2 * Math.PI * r) / U, h / U), M.win, 0, y + h / 2, 0, Z.core).rotation.y = Math.PI / 8;
      if (i < 3) for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        add(new THREE.BoxGeometry(.6, h, 1.4), M.hull, Math.sin(a) * r, y + h / 2, Math.cos(a) * r, Z.core).rotation.y = a;
        add(new THREE.BoxGeometry(.14, h * .92, .14), k % 2 ? M.cyan : M.white, Math.sin(a) * (r + .72), y + h / 2, Math.cos(a) * (r + .72));
      }
      y += h;
      add(new THREE.CylinderGeometry(r + .8, r + .5, 1.4, 8), M.hull, 0, y + .7, 0, Z.core).rotation.y = Math.PI / 8;
      add(new THREE.CylinderGeometry(r + .82, r + .82, .28, 8, 1, true), i % 2 ? M.mag : M.cyan, 0, y + .3, 0).rotation.y = Math.PI / 8;
      y += 1.4;
    });
    add(new THREE.ConeGeometry(2.6, 34, 8), M.steel, 0, y + 17, 0, Z.core).rotation.y = Math.PI / 8;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      add(new THREE.ConeGeometry(.7, 12, 6), M.steel, Math.sin(a) * 3, y + 6, Math.cos(a) * 3, Z.core);
    }
    const tip = y + 34;
    blinker(0, tip + .5, 0, .6);
    for (const [r0, r1, c, pw] of [[4, .9, neon(.3, 1.6, 2.6), 1.4], [.5, .25, neon(1.2, 2.6, 3), 2.2]]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, 900, 24, 1, true).translate(0, 450, 0), beamMat(c, pw));
      b.position.y = tip; scene.add(b);
    }
    const em = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: emblemTex(), transparent: true, toneMapped: false, color: neon(1.3, 2.2, 2.6), blending: THREE.AdditiveBlending, depthWrite: false }));
    em.position.set(0, tops[3] + 22, 7 * Math.cos(Math.PI / 8) + .1); scene.add(em);

    // 관제탑을 감싸고 도는 홀로그램 고리
    [[tops[3] + 8, 13, .03, C.cyan, 36], [tops[3] + 34, 10, -.05, C.mag, 24], [tops[3] + 58, 7.5, .08, C.cyan, 18]].forEach(([hy, r, sp, c, n], i) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + .9, 128), ringMat(c.clone().multiplyScalar(.7), n));
      ring.position.y = hy; ring.rotation.x = -Math.PI / 2 + (i - 1) * .12;
      ring.userData.sp = sp; spinners.push(ring); scene.add(ring);
    });

    // 정면 ARCH 네온 간판
    add(new THREE.BoxGeometry(24, 8.5, 4), M.dark, 0, tops[0] + 4.1, 22.6, Z.core);
    add(new THREE.BoxGeometry(25, .3, 4.4), M.cyan, 0, tops[0] + 8.5, 22.6);
    add(new THREE.BoxGeometry(25, .3, 4.4), M.mag, 0, tops[0] - .1, 22.6);
    const signM = new THREE.Mesh(new THREE.PlaneGeometry(22, 7.7), new THREE.MeshBasicMaterial({ map: signTex(), toneMapped: false, color: neon(1.5, 1.6, 1.7) }));
    signM.position.set(0, tops[0] + 4.1, 24.62); scene.add(signM);

    // 지하 특별통제 훈련장 (물 아래 희미한 보랏빛)
    add(new THREE.CylinderGeometry(14, 14, 7, 8, 1, true), new THREE.MeshBasicMaterial({ color: neon(.2, .6, 1.4), transparent: true, opacity: .4, toneMapped: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }), 0, -1.5, 0, Z.arena);

    // 허브 위 작은 시설 (라운지 · 상담실 · 연구실)
    add(boxG(7, 3.2, 4.5), M.glass, -13, tops[1] + 1.6, 15, Z.lounge).rotation.y = -.7;
    add(new THREE.BoxGeometry(7.4, .4, 4.9), M.hull, -13, tops[1] + 3.3, 15, Z.lounge).rotation.y = -.7;
    add(new THREE.BoxGeometry(7.5, .12, 5), M.amber, -13, tops[1] + 3.55, 15).rotation.y = -.7;
    block(15, tops[1], 13, 6, 3.4, 4.2, .85, Z.harmony);
    add(new THREE.SphereGeometry(3.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.glass, 11, tops[2], -11, Z.lab);
    band(11, tops[2] + .1, -11, 3.5, M.mag, .08);

    // ── 정면 메인 게이트 + 활주로
    const rwMat = new THREE.MeshStandardMaterial({ map: runwayTex(false), emissiveMap: runwayTex(true), emissive: 0xffffff, emissiveIntensity: 2, roughness: .35, metalness: .6 });
    add(new THREE.BoxGeometry(14, 2.4, 130), [M.hull, M.hull, rwMat, M.dark, M.hull, M.hull], 0, 1, 96, Z.gate);
    for (const s of [-1, 1]) {
      add(new THREE.BoxGeometry(.18, .18, 128), M.cyan, s * 6.6, 2.3, 96);
      for (let z = 40; z < 156; z += 17) {
        const h = between(4, 10);
        block(s * 13, 0, z + 7, 9, h, 15, 0, Z.gate);
        if (rand() < .6) sign(pick(["ARCH", "아이기스", "SENTINEL", "가이드", "ZONE 01", "출입통제"]), pick(["#38e1ff", "#8fdcff", "#e6faff"]), s * 8.4, h + 3.5, z + 7, s * Math.PI / 2, true, .5);
      }
      tower(s * 10, 2.2, 38, 2.6, 26, Z.gate, 10, M.mag);
      const ban = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 15), new THREE.MeshBasicMaterial({ map: neonTex("ARCH", "#38e1ff", true), transparent: true, toneMapped: false, color: neon(1.4, 1.6, 1.8), blending: THREE.AdditiveBlending, depthWrite: false }));
      ban.position.set(s * 10, 15, 40.9); scene.add(ban);
    }
    add(new THREE.BoxGeometry(24, 2.4, 3.4), M.hull, 0, 26.5, 38, Z.gate);
    add(new THREE.BoxGeometry(22, .2, .2), M.cyan, 0, 25.2, 39.8);
    tier(0, 162, 1.6, 9, 2, Z.gate);
    skirt(0, 162, 9, Z.gate);
    // 활주로 유도등: 바깥에서 게이트 쪽으로 달리는 빛
    lanes.push({ a: [0, 2.5, 160], b: [0, 2.5, 34], dir: 1, n: 6, col: C.white });
    for (const s of [-1, 1]) lanes.push({ a: [s * 6.6, 2.6, 160], b: [s * 6.6, 2.6, 34], dir: 1, n: 3, col: C.cyan });

    // ── 다리 · 부두
    for (const [x, z] of Object.values(PLAT)) {
      const a = Math.atan2(z, x), d = Math.hypot(x, z);
      bridge(Math.cos(a) * 31, Math.sin(a) * 31, Math.cos(a) * (d - 14), Math.sin(a) * (d - 14));
    }
    armAng.forEach((a, i) => arm(a, 32, [120, 110, 130, 115, 95][i]));

    // ── 훈련구역 (투명 돔)
    let top = platform(...PLAT.train, [[15, 4.5], [11.5, 2.5]], Z.train);
    add(new THREE.SphereGeometry(10, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), M.glass, PLAT.train[0], top, PLAT.train[1], Z.train);
    for (let k = 0; k < 6; k++) add(new THREE.TorusGeometry(10.05, .1, 4, 48, Math.PI), M.cyan, PLAT.train[0], top, PLAT.train[1], Z.train).rotation.y = (k / 6) * Math.PI;
    band(PLAT.train[0], top + .1, PLAT.train[1], 10.1);
    sign("TRAINING", "#38e1ff", PLAT.train[0], top + 14, PLAT.train[1], .5, false, .7);

    // ── S급 전용관
    top = platform(...PLAT.sclass, [[16, 5], [12.5, 5], [9, 4]], Z.sclass);
    tower(PLAT.sclass[0], top, PLAT.sclass[1], 4.4, 16, Z.sclass, 6, M.amber);
    greeble(PLAT.sclass[0], top, PLAT.sclass[1], 5.5, 8.5, 10);
    sign("S-CLASS", "#e6faff", PLAT.sclass[0] - 5, top + 10, PLAT.sclass[1] + 5, -.7, true, .55);

    // ── 의무실
    top = platform(...PLAT.med, [[13, 4], [9.5, 3]], Z.med);
    add(new THREE.BoxGeometry(6, .3, 1.8), M.white, PLAT.med[0], top + .2, PLAT.med[1]);
    add(new THREE.BoxGeometry(1.8, .3, 6), M.white, PLAT.med[0], top + .2, PLAT.med[1]);
    greeble(PLAT.med[0], top, PLAT.med[1], 5, 9, 10);
    sign("의무실", "#8fdcff", PLAT.med[0], top + 7, PLAT.med[1], -1.3, false, .5);

    // ── 선착장
    top = platform(...PLAT.dock, [[15, 3.2]], Z.dock, "pad");
    const parked = aircraft(1.5);
    parked.position.set(PLAT.dock[0] + 3, top + 1, PLAT.dock[1] - 2); parked.rotation.y = 2.2;
    block(PLAT.dock[0] + 15, 0, PLAT.dock[1] + 8, 8, 6, 12, -.6, Z.dock);

    // ── 비상 안정화실 (하얗게 빛나는 격리동 + 붉은 경고등)
    top = platform(...PLAT.stab, [[12, 4], [8.5, 3]], Z.stab);
    add(new THREE.BoxGeometry(8.4, 4.4, 8.4), M.dark, PLAT.stab[0], top + 2.2, PLAT.stab[1], Z.stab);
    add(new THREE.BoxGeometry(7.6, 4.8, 7.6), M.cell, PLAT.stab[0], top + 2.4, PLAT.stab[1], Z.stab);
    add(new THREE.BoxGeometry(8.6, .25, 8.6), M.red, PLAT.stab[0], top + 4.5, PLAT.stab[1]);
    for (const [dx, dz] of [[-4.4, -4.4], [4.4, -4.4], [-4.4, 4.4], [4.4, 4.4]]) blinker(PLAT.stab[0] + dx, top + 5.2, PLAT.stab[1] + dz, .4);
    sign("WARNING", "#38e1ff", PLAT.stab[0], top + 9, PLAT.stab[1], .9, false, .5);

    // ── 뒤쪽 첨탑 단지 + 탐조등
    top = platform(...PLAT.back, [[19, 4], [14, 4]], Z.core);
    [[-6, -4, 2.6, 58], [5, -8, 3, 76], [-2, 7, 2.2, 44], [8, 4, 2, 50], [-9, 3, 1.8, 36]].forEach(([dx, dz, r, h], i) => {
      const t = tower(PLAT.back[0] + dx, top, PLAT.back[1] + dz, r, h, Z.core, h * .22, i % 2 ? M.mag : M.cyan);
      if (i < 3) {
        const b = new THREE.Group();
        b.add(new THREE.Mesh(new THREE.CylinderGeometry(10, .4, 320, 24, 1, true).translate(0, 160, 0), beamMat(neon(.6, 1, 1.6), .7)));
        b.position.set(PLAT.back[0] + dx, t - h * .22, PLAT.back[1] + dz);
        b.userData = { ph: i * 2.1, sp: .25 + i * .07 };
        beams.push(b); scene.add(b);
      }
    });
    for (const s of [-1, 1]) {
      const b = new THREE.Group();
      b.add(new THREE.Mesh(new THREE.CylinderGeometry(8, .4, 260, 24, 1, true).translate(0, 130, 0), beamMat(neon(.6, 1.2, 2.2), .6)));
      b.position.set(s * 10, 39, 38); b.userData = { ph: s > 0 ? 1 : 4, sp: .3 };
      beams.push(b); scene.add(b);
    }

    // ── 하늘정원 (공중에 떠 있는 섬 + 신전 폐허 + 숲, 아래로 빛이 흘러내림)
    garden = new THREE.Group();
    const rockG = new THREE.IcosahedronGeometry(13, 5), p = rockG.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), n = 1 + .12 * Math.sin(vx * .9) * Math.cos(vz * .8) + .08 * Math.sin(vy * 1.7);
      p.setXYZ(i, vx * n, vy > 0 ? 0 : vy * 1.9 * n - Math.max(0, 6 - Math.hypot(vx, vz)) * 1.2, vz * n);
    }
    rockG.computeVertexNormals();
    const gp = (geo, mat, x, yy, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, yy, z); garden.add(m); return m; };
    gp(rockG, M.rock, 0, 0, 0);
    gp(new THREE.CylinderGeometry(13.2, 13, 1.2, 48), M.grass, 0, .5, 0);
    gp(new THREE.TorusGeometry(13.25, .12, 4, 96), M.cyan, 0, 1.1, 0).rotation.x = Math.PI / 2;
    gp(new THREE.CylinderGeometry(4.6, 5.2, 1, 24), M.marble, 0, 1.4, 0);
    gp(new THREE.CylinderGeometry(3.4, 3.6, .8, 24), M.marble, 0, 2.2, 0);
    gp(new THREE.CylinderGeometry(2, 2, .1, 24), M.cyan, 0, 2.66, 0);
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
    const drip = new THREE.Mesh(new THREE.CylinderGeometry(6, 1, 40, 24, 1, true).translate(0, 20, 0), beamMat(neon(.3, 1.4, 1), .5));
    drip.rotation.x = Math.PI; drip.position.y = -10; garden.add(drip);
    for (let k = 0; k < 4; k++) {
      const pebble = gp(new THREE.IcosahedronGeometry(between(1.2, 2.4), 1), M.rock, between(-20, 20), between(-10, -3), between(-20, 20));
      pebble.scale.y = 1.4;
    }
    garden.position.set(-48, 46, -58);
    garden.traverse((o) => { if (o.isMesh && o !== drip) { o.userData.zone = Z.garden; pickables.push(o); } });
    scene.add(garden);

    flushGreebles();
    bake();

    // 에너지 방어막
    const dome = new THREE.Mesh(new THREE.SphereGeometry(190, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2), shieldMat());
    dome.position.y = -2; dome.renderOrder = 5;
    scene.add(dome);

    // 구름 (아래쪽이 도시 불빛에 물든 먹구름)
    const puff = puffTex();
    for (let i = 0; i < 28; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, transparent: true, opacity: between(.5, .9), fog: false, depthWrite: false }));
      const a = rand() * Math.PI * 2, r = between(700, 1500);
      s.position.set(Math.cos(a) * r, between(80, 240) * (r / 900), Math.sin(a) * r);
      s.scale.set(between(280, 560), between(110, 190), 1);
      scene.add(s);
    }

    for (let i = 0; i < 5; i++) crafts.push({ g: aircraft(), r: 110 + i * 34, h: 40 + i * 12, sp: (i % 2 ? -1 : 1) * (.05 + i * .012), a: i * 1.9 });
    makeTraffic();
    makeRain();
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
        <span class="ag-title">THE AEGIS<small><i class="ag-live"></i>LIVE · ARCH DEFENSE GRID</small></span>
        <div class="ag-btns">
          <button type="button" data-ag="tour">TOUR</button>
          <button type="button" data-ag="home">전체</button>
          <button type="button" data-ag="full" aria-label="전체 화면">⛶</button>
        </div>
      </div>
      <aside class="ag-info" hidden>
        <button type="button" class="ag-x" data-ag="close" aria-label="닫기">×</button>
        <p class="ag-en"></p><h3></h3><div class="ag-body"></div>
        <button type="button" class="ag-tour" data-suites hidden>ROOM TOUR · 숙소 8개 둘러보기 ›</button>
        <div class="ag-nav"><button type="button" data-ag="prev">‹ PREV</button><button type="button" data-ag="next">NEXT ›</button></div>
      </aside>
      <p class="ag-hint">드래그로 회전 · 휠/두 손가락으로 확대 · 시설을 누르면 설명</p>
      <p class="ag-stat">SHIELD 100% · SECTOR 01</p>
      <div class="ag-boot" hidden><p>ARCH DEFENSE GRID</p><p>AEGIS · ONLINE</p></div>
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
    info.querySelector(".ag-tour").hidden = z.key !== "sclass";
    info.scrollTop = 0;
    tags.forEach((t) => t.el.classList.toggle("on", t.z === z));
  }
  function home() {
    current = -1;
    root.querySelector(".ag-info").hidden = true;
    tags.forEach((t) => t.el.classList.remove("on"));
    flyTo(new THREE.Vector3(0, 22, 0), homeDist(), 1.2);
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
      if (moved < 6 && e.type === "pointerup") pickAt(e);
    };
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    cv.addEventListener("wheel", (e) => { e.preventDefault(); fly = null; idleAt = performance.now(); zoom(Math.exp(e.deltaY * .0012)); }, { passive: false });
  }
  function zoom(f) { view.goal = Math.min(620, Math.max(28, view.goal * f)); }
  const ray = () => new THREE.Raycaster();
  function pickAt(e) {
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
    if (!root.isConnected || !visible || document.hidden || document.body.classList.contains("st-lock")) { running = false; return; }
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), .1), t = clock.elapsedTime, now = performance.now();

    if (fly) {
      const k = Math.min(1, Math.max(0, (now - fly.t0) / fly.dur)), e = ease(k);
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
    water.material.uniforms.time.value = t * .35;
    for (const u of timeUniforms) u.value = t;
    for (const s of spinners) s.rotation.z = t * s.userData.sp * 6;
    for (const b of beams) { const k = t * b.userData.sp + b.userData.ph; b.rotation.set(Math.sin(k) * .55, 0, Math.cos(k * .8) * .55); }
    for (const f of flickers) f.material.opacity = Math.sin(t * 40 + f.userData.phase) > .97 || (Math.floor(t * 3 + f.userData.phase) % 17 === 0) ? .25 : 1;
    garden.position.y = 46 + Math.sin(t * .5) * 1.4;
    garden.rotation.y = t * .02;
    for (const c of crafts) {
      const a = c.a + t * c.sp;
      c.g.position.set(Math.cos(a) * c.r, c.h + Math.sin(t + c.a) * 2, Math.sin(a) * c.r);
      c.g.rotation.y = -a + (c.sp > 0 ? Math.PI : 0);
      c.g.rotation.z = -.15 * Math.sign(c.sp);
    }
    for (const b of blinkers) b.visible = Math.sin(t * 3 + b.userData.phase) > .2;
    moveTraffic(dt);
    moveRain(t);

    composer.render();

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
    composer.setSize(w, h);
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
    renderer.toneMappingExposure = 1.1;
    clock = new THREE.Clock();
    buildScene();
    // 네온만 번지게 (밝은 부분만 골라서 빛 번짐) → 마지막에 감마 보정
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(512, 512), mobile() ? .8 : 1, .55, .82));
    composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));
    makeTags();
    root.querySelector(".ag-stage").appendChild(renderer.domElement);
    bindControls(renderer.domElement);
    root.querySelector(".ag-load").remove();
    const boot = root.querySelector(".ag-boot");
    boot.hidden = false;
    setTimeout(() => boot.classList.add("out"), 1900);
    setTimeout(() => boot.remove(), 2800);
    view.radius = homeDist() * 2.2; view.goal = homeDist(); view.phi = .75; // 처음엔 높은 곳에서 내려오듯
    fly = { t0: performance.now() + 300, dur: 3200, from: { t: view.target.clone(), r: view.radius, p: view.phi }, to: { t: view.target.clone(), r: homeDist(), p: 1.2 } };
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
  App.agStart = () => { if (visible) start(); };
  App.loadThree = loadThree;
  window.addEventListener("resize", resize);
  document.addEventListener("fullscreenchange", () => setTimeout(resize, 60));
  document.addEventListener("visibilitychange", () => { if (!document.hidden && visible) start(); });

  const after = App.afterWorld;
  App.afterWorld = function () {
    after.apply(this, arguments);
    mount();
  };
})();
