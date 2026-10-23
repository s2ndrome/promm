// S급 숙소 3D: 도면 그대로 벽을 세우고 실제 집처럼 꾸민 뒤 1인칭으로 걸어다님
// 드래그 = 둘러보기 · 바닥 클릭/탭 = 걷기 · WASD/방향키 · 모바일 조이스틱
// 재질은 전부 캔버스로 그린 텍스처 + 요철(노멀맵), 빛은 그림자 · 앰비언트 오클루전 · 실내 반사
(function () {
  const App = window.App;
  const S = 50; // 도면 50px = 1m
  let THREE;

  // ---------- 텍스처 공장 ----------
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const between = (a, b) => a + rand() * (b - a);
  const pick = (a) => a[Math.floor(rand() * a.length)];
  function cv(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); return c; }
  function tex(c, srgb = true, rep = [1, 1]) {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.encoding = THREE.sRGBEncoding;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...rep);
    t.anisotropy = 8;
    return t;
  }
  // 높이 그림(밝을수록 높음) → 노멀맵
  function normalFrom(c, strength = 2) {
    const w = c.width, h = c.height, src = c.getContext("2d").getImageData(0, 0, w, h).data;
    const out = document.createElement("canvas"); out.width = w; out.height = h;
    const g = out.getContext("2d"), img = g.createImageData(w, h), d = img.data;
    const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
      d[i] = (-dx / l * .5 + .5) * 255; d[i + 1] = (dy / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return out;
  }
  function veins(g, w, h, color, n, wmax) {
    for (let i = 0; i < n; i++) {
      g.strokeStyle = color.replace("A", between(.05, .35).toFixed(2)); g.lineWidth = between(.4, wmax);
      g.beginPath(); let x = rand() * w, y = rand() * h; g.moveTo(x, y);
      const ang = between(0, 6.28);
      for (let k = 0; k < 10; k++) { const nx = x + Math.cos(ang + between(-.9, .9)) * between(40, 140), ny = y + Math.sin(ang + between(-.9, .9)) * between(40, 140); g.quadraticCurveTo(x + between(-50, 50), y + between(-50, 50), nx, ny); x = nx; y = ny; }
      g.stroke();
    }
  }
  // 대리석: 큰 타일 + 줄눈 (map / normal / roughness)
  function marble(base, vein, tiles = 1, s = 7) {
    seed = s;
    const size = 1024, grid = size / tiles;
    const map = cv(size, size, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${rand() < .5 ? "255,255,255" : "0,0,0"},${rand() * .035})`; g.fillRect(rand() * w, rand() * h, between(1, 3), between(1, 3)); }
      g.filter = "blur(2px)"; veins(g, w, h, vein, 26, 5); g.filter = "none"; veins(g, w, h, vein, 40, 1.4);
      if (tiles > 1) { g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 2; for (let k = 0; k <= tiles; k++) { g.beginPath(); g.moveTo(k * grid, 0); g.lineTo(k * grid, h); g.moveTo(0, k * grid); g.lineTo(w, k * grid); g.stroke(); } }
    });
    const height = cv(size, size, (g, w, h) => {
      g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
      if (tiles > 1) { g.strokeStyle = "#000"; g.lineWidth = 3; for (let k = 0; k <= tiles; k++) { g.beginPath(); g.moveTo(k * grid, 0); g.lineTo(k * grid, h); g.moveTo(0, k * grid); g.lineTo(w, k * grid); g.stroke(); } }
    });
    const rough = cv(256, 256, (g, w, h) => { g.fillStyle = "#2a2a2a"; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${rand() * .08})`; g.beginPath(); g.arc(rand() * w, rand() * h, between(4, 20), 0, 7); g.fill(); } });
    return { map: tex(map), normalMap: tex(normalFrom(height, 3), false), roughnessMap: tex(rough, false) };
  }
  // 원목 마루: 판재마다 톤이 다르고 결 · 이음매가 있음
  function wood(light, s = 3) {
    seed = s;
    const size = 1024, pw = 128;
    const tones = light ? [[198, 170, 136], [186, 156, 120], [206, 180, 146], [176, 148, 114]] : [[72, 50, 36], [60, 41, 29], [84, 60, 42], [52, 36, 26]];
    const height = cv(size, size, () => {});
    const hg = height.getContext("2d"); hg.fillStyle = "#fff"; hg.fillRect(0, 0, size, size);
    const map = cv(size, size, (g) => {
      for (let x = 0; x < size; x += pw) {
        let y = -between(0, 600);
        while (y < size) {
          const len = between(500, 900), [r, gg, b] = pick(tones);
          g.fillStyle = `rgb(${r},${gg},${b})`; g.fillRect(x, y, pw, len);
          for (let k = 0; k < 40; k++) {
            g.strokeStyle = `rgba(${light ? "120,90,60" : "20,12,8"},${between(.08, .3)})`; g.lineWidth = between(.5, 2.2);
            const gx = x + between(4, pw - 4); g.beginPath(); g.moveTo(gx, y); g.bezierCurveTo(gx + between(-6, 6), y + len * .3, gx + between(-6, 6), y + len * .7, gx + between(-4, 4), y + len); g.stroke();
          }
          hg.fillStyle = "#000"; hg.fillRect(x, y, pw, 2); hg.fillRect(x, y, 2, len);
          g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x, y, pw, 2); g.fillRect(x, y, 2, len);
          y += len;
        }
      }
    });
    return { map: tex(map), normalMap: tex(normalFrom(height, 2.5), false) };
  }
  // 패브릭: 촘촘한 직조 요철
  function fabric(s = 5) {
    seed = s;
    const h = cv(256, 256, (g, w, hh) => {
      g.fillStyle = "#808080"; g.fillRect(0, 0, w, hh);
      for (let y = 0; y < hh; y += 4) for (let x = 0; x < w; x += 4) { g.fillStyle = (x + y) % 8 ? "#a0a0a0" : "#606060"; g.fillRect(x, y, 4, 2); }
      for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${rand() < .5 ? 255 : 0},${rand() < .5 ? 255 : 0},${rand() < .5 ? 255 : 0},.1)`; g.fillRect(rand() * w, rand() * hh, 2, 1); }
    });
    const map = cv(256, 256, (g, w, hh) => { g.fillStyle = "#e8e8e8"; g.fillRect(0, 0, w, hh); for (let i = 0; i < 6000; i++) { const v = 200 + rand() * 55; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rand() * w, rand() * hh, 1.5, 1.5); } });
    return { map: tex(map, true, [4, 4]), normalMap: tex(normalFrom(h, 1.2), false, [4, 4]) };
  }
  // 벽: 은은한 얼룩의 도장면, 또는 세로 홈이 있는 패널
  function wallTex(base, grooves, s = 9) {
    seed = s;
    const map = cv(512, 512, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      g.filter = "blur(16px)"; for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${rand() < .5 ? "255,255,255" : "0,0,0"},.03)`; g.beginPath(); g.arc(rand() * w, rand() * h, between(20, 90), 0, 7); g.fill(); } g.filter = "none";
      for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${rand() * .03})`; g.fillRect(rand() * w, rand() * h, 1, 1); }
      if (grooves) { g.fillStyle = "rgba(0,0,0,.45)"; for (let x = 0; x < w; x += w / 2) g.fillRect(x, 0, 3, h); }
    });
    const hc = cv(512, 512, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); if (grooves) { g.fillStyle = "#000"; for (let x = 0; x < w; x += w / 2) g.fillRect(x, 0, 4, h); } for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(0,0,0,${rand() * .15})`; g.fillRect(rand() * w, rand() * h, 1, 1); } });
    return { map: tex(map), normalMap: tex(normalFrom(hc, grooves ? 3 : .6), false) };
  }
  function rugTex(dark, s = 4) {
    seed = s;
    const map = cv(512, 512, (g, w, h) => {
      g.fillStyle = dark ? "#3a3a3d" : "#e4ddd0"; g.fillRect(0, 0, w, h);
      if (!dark) { g.filter = "blur(6px)"; veins(g, w, h, "rgba(70,95,130,A)", 30, 22); veins(g, w, h, "rgba(150,150,150,A)", 30, 14); g.filter = "none"; }
      for (let i = 0; i < 14000; i++) { const v = dark ? 40 + rand() * 40 : 200 + rand() * 50; g.fillStyle = `rgba(${v},${v},${v + 3},.5)`; g.fillRect(rand() * w, rand() * h, 1.5, 1.5); }
    });
    const hc = cv(256, 256, (g, w, h) => { for (let i = 0; i < 20000; i++) { const v = rand() * 255; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rand() * w, rand() * h, 1, 1); } });
    return { map: tex(map), normalMap: tex(normalFrom(hc, 1.5), false, [3, 3]) };
  }
  function leafTex() {
    return tex(cv(256, 256, (g) => {
      for (let i = 0; i < 4; i++) {
        const x = 64 + (i % 2) * 128, y = 64 + Math.floor(i / 2) * 128;
        const gr = g.createLinearGradient(x - 40, y, x + 40, y); gr.addColorStop(0, ["#3d6a2e", "#4f7d3a", "#355e2a", "#5b8a42"][i]); gr.addColorStop(1, ["#2a4f20", "#3a6229", "#26461d", "#43702f"][i]);
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 22, 58, 0, 0, 7); g.fill();
        g.strokeStyle = "rgba(220,240,200,.35)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 55); g.lineTo(x, y + 55); g.stroke();
      }
    }));
  }
  function artTex(kind, s = 41) {
    seed = s;
    return tex(cv(512, 768, (g, w, h) => {
      g.fillStyle = kind === "red" ? "#ece9e4" : "#f2efe8"; g.fillRect(0, 0, w, h);
      if (kind === "red") {
        for (let i = 0; i < 120; i++) { g.strokeStyle = rand() < .3 ? `rgba(170,10,20,${between(.4, .9)})` : `rgba(15,15,18,${between(.3, .9)})`; g.lineWidth = between(2, 30); g.lineCap = "round"; g.beginPath(); const x = between(60, w - 60), y = between(80, h - 80); g.moveTo(x, y); g.lineTo(x + between(-140, 140), y + between(-100, 100)); g.stroke(); }
      } else {
        g.filter = "blur(10px)"; for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(${pick(["60,100,150", "140,170,200", "200,190,170", "90,120,160"])},${between(.2, .6)})`; g.beginPath(); g.arc(between(60, w - 60), between(80, h - 80), between(30, 120), 0, 7); g.fill(); } g.filter = "none";
      }
    }));
  }
  function screenTex() {
    seed = 77;
    return tex(cv(512, 288, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#1b2a8a"); gr.addColorStop(.5, "#a01a6a"); gr.addColorStop(1, "#2a9ad8");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { g.fillStyle = `hsla(${between(180, 340)},90%,${between(50, 80)}%,${between(.2, .7)})`; g.beginPath(); g.arc(rand() * w, rand() * h, between(6, 60), 0, 7); g.fill(); }
    }));
  }
  // 창밖 풍경: 밤(야경) / 낮(맑은 하늘 · 강 · 빌딩)
  function skyline(day) {
    seed = day ? 15 : 5;
    return tex(cv(4096, 1024, (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h);
      if (day) { sky.addColorStop(0, "#7fb2e6"); sky.addColorStop(.5, "#b8d6f0"); sky.addColorStop(.6, "#dfe9f2"); sky.addColorStop(1, "#c9d6df"); }
      else { sky.addColorStop(0, "#02030a"); sky.addColorStop(.5, "#0a1226"); sky.addColorStop(.62, "#1a2236"); sky.addColorStop(1, "#05060a"); }
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      const horizon = h * .6;
      if (day) { g.fillStyle = "rgba(150,170,190,.7)"; for (let x = 0; x < w; x += 300) { g.beginPath(); g.moveTo(x, horizon - 40); g.quadraticCurveTo(x + 150, horizon - between(90, 160), x + 300, horizon - 40); g.lineTo(x + 300, horizon); g.lineTo(x, horizon); g.fill(); } }
      for (let layer = 0; layer < 3; layer++) {
        let x = 0;
        while (x < w) {
          const bw = between(30, 120) * (1 - layer * .2), tall = rand() < .08;
          const bh = tall ? between(200, 460) : between(30, 200) * (layer + 1) * .6;
          const top = horizon - bh + layer * 60;
          if (day) { const v = [205, 185, 165][layer] + between(-15, 15); g.fillStyle = `rgb(${v - 10},${v},${v + 12})`; }
          else g.fillStyle = ["#06080d", "#090c13", "#0c1018"][layer];
          g.fillRect(x, top, bw, h - top);
          for (let wy = top + 6; wy < h; wy += 9) for (let wx = x + 4; wx < x + bw - 4; wx += 7) {
            if (day) { if (rand() < .5) { g.fillStyle = `rgba(90,110,140,${between(.15, .4)})`; g.fillRect(wx, wy, 3, 4); } }
            else if (rand() < (layer === 2 ? .35 : .22)) { g.fillStyle = rand() < .7 ? `rgba(255,214,160,${between(.4, .95)})` : `rgba(200,225,255,${between(.4, .9)})`; g.fillRect(wx, wy, 3, 4); }
          }
          x += bw + between(0, 12);
        }
      }
      if (day) { const r = g.createLinearGradient(0, h * .8, 0, h); r.addColorStop(0, "#7ea6c8"); r.addColorStop(1, "#5d86ad"); g.fillStyle = r; g.fillRect(0, h * .82, w, h * .18); g.fillStyle = "rgba(255,255,255,.18)"; for (let i = 0; i < 400; i++) g.fillRect(rand() * w, h * .82 + rand() * h * .18, between(8, 40), 1); }
      else { const glow = g.createLinearGradient(0, horizon - 80, 0, horizon + 60); glow.addColorStop(0, "rgba(255,170,110,0)"); glow.addColorStop(1, "rgba(255,170,110,.12)"); g.fillStyle = glow; g.fillRect(0, horizon - 80, w, 140); }
    }));
  }
  function shadowTex() {
    return tex(cv(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }), false);
  }

  // ---------- 도형 ----------
  // 모서리가 둥근 상자 (가구 · 쿠션)
  function rbox(w, h, d, r = .02) {
    const b = Math.min(r * .6, h / 2.2, w / 2.2, d / 2.2), rc = Math.max(.001, Math.min(r, (w - 2 * b) / 2.05, (d - 2 * b) / 2.05));
    const W = w - 2 * b, D = d - 2 * b, s = new THREE.Shape();
    s.moveTo(-W / 2 + rc, -D / 2); s.lineTo(W / 2 - rc, -D / 2); s.quadraticCurveTo(W / 2, -D / 2, W / 2, -D / 2 + rc);
    s.lineTo(W / 2, D / 2 - rc); s.quadraticCurveTo(W / 2, D / 2, W / 2 - rc, D / 2); s.lineTo(-W / 2 + rc, D / 2);
    s.quadraticCurveTo(-W / 2, D / 2, -W / 2, D / 2 - rc); s.lineTo(-W / 2, -D / 2 + rc); s.quadraticCurveTo(-W / 2, -D / 2, -W / 2 + rc, -D / 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.001, h - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 5 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -(h - 2 * b) / 2, 0);
    return g;
  }
  function pillow(w, h, t) {
    const g = new THREE.SphereGeometry(.5, 24, 16), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) * 2, y = p.getY(i) * 2, z = p.getZ(i) * 2;
      const sq = (v) => Math.sign(v) * Math.pow(Math.abs(v), .55);
      p.setXYZ(i, sq(x) * w / 2, sq(y) * h / 2, z * t / 2 * (1 - .35 * Math.max(Math.abs(x), Math.abs(y)) ** 3));
    }
    g.computeVertexNormals();
    return g;
  }
  function curtain(w, h, amp = .05) {
    const g = new THREE.PlaneGeometry(w, h, Math.max(8, Math.round(w * 30)), 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 34) * amp + Math.sin(p.getX(i) * 9) * amp * .5);
    g.computeVertexNormals();
    return g;
  }

  // ---------- 장면 키트: 레이아웃이 쓰는 도구 모음 ----------
  function kit(scene, colliders, L) {
    const [OX, OY] = L.origin, H = L.height || 3;
    const X = (x) => (x - OX) / S, Z = (y) => (y - OY) / S;
    const day = L.theme === "day";
    const std = (o) => new THREE.MeshStandardMaterial(o);
    const phys = (o) => new THREE.MeshPhysicalMaterial(o);
    const F = fabric();
    const fab = (color, rough = .95) => std({ color, roughness: rough, map: F.map, normalMap: F.normalMap, normalScale: new THREE.Vector2(.6, .6) });
    const glow = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), toneMapped: false });
    const M = {
      LED: glow(3.2, 2.3, 1.5), lamp: glow(2.6, 2, 1.3), down: glow(4, 3.4, 2.6),
      glass: phys({ color: 0xffffff, roughness: .02, metalness: 0, transparent: true, opacity: .12, envMapIntensity: 1.5, clearcoat: 1 }),
      glassTint: phys({ color: 0x9aa4ac, roughness: .03, metalness: .2, transparent: true, opacity: .28, envMapIntensity: 1.3 }),
      mirror: std({ color: day ? 0xd8dadc : 0x6a6660, roughness: .03, metalness: 1, envMapIntensity: day ? 1.1 : .7 }),
      chrome: std({ color: 0xdfe3e8, roughness: .12, metalness: 1 }),
      brushed: std({ color: day ? 0xb9b6b0 : 0x1a1a1c, roughness: .35, metalness: 1 }),
      gold: std({ color: 0xd4a548, roughness: .25, metalness: 1 }),
      black: std({ color: 0x0e0e10, roughness: .35, metalness: .3 }),
      blackGloss: phys({ color: 0x0a0a0b, roughness: .1, metalness: .2, clearcoat: 1, clearcoatRoughness: .05 }),
      white: std({ color: 0xf2f0ec, roughness: .45 }),
      ceramic: phys({ color: 0xf6f5f2, roughness: .15, clearcoat: .8 }),
      screenOff: phys({ color: 0x050506, roughness: .05, clearcoat: 1 }),
      screen: new THREE.MeshBasicMaterial({ map: screenTex(), toneMapped: false }),
      leaf: std({ map: leafTex(), alphaTest: .45, side: THREE.DoubleSide, roughness: .7 }),
      soil: std({ color: 0x2a2018, roughness: 1 }),
      flower: std({ color: 0xfbfaf6, roughness: .8, emissive: 0x222018 }),
      contact: new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false, opacity: day ? .55 : .8 }),
      fab, F,
    };
    const shadowed = (m, cast = true) => { m.castShadow = cast; m.receiveShadow = true; return m; };
    const add = (geo, mat, x, y, z, ry = 0, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; scene.add(shadowed(m, cast)); return m; };
    // 도면 픽셀 영역에 상자 [x0, y0, x1, y1], 높이 h, 바닥에서 y
    const fb = (x0, y0, x1, y1, h, y, mat, solid = false, r = 0) => {
      const w = (x1 - x0) / S, d = (y1 - y0) / S;
      const g = r ? rbox(w, h, d, r) : new THREE.BoxGeometry(w, h, d);
      const m = add(g, mat, X((x0 + x1) / 2), y + h / 2, Z((y0 + y1) / 2), 0, !(mat.transparent || mat.isMeshBasicMaterial));
      if (solid) colliders.push([X(x0), Z(y0), X(x1), Z(y1)]);
      return m;
    };
    // 미터 단위 중심 (cx, cz) 에 회전된 둥근 상자
    const rb = (cx, cz, w, h, d, y, mat, ry = 0, r = .02) => add(rbox(w, h, d, r), mat, cx, y + h / 2, cz, ry);
    const plane = (x0, y0, x1, y1, y, mat, down = false, tileM = 0) => {
      const w = (x1 - x0) / S, d = (y1 - y0) / S, g = new THREE.PlaneGeometry(w, d);
      if (tileM) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tileM, uv.getY(i) * d / tileM); }
      const m = new THREE.Mesh(g, mat);
      m.rotation.x = down ? Math.PI / 2 : -Math.PI / 2;
      m.position.set(X((x0 + x1) / 2), y, Z((y0 + y1) / 2));
      m.receiveShadow = true;
      scene.add(m);
      return m;
    };
    const contact = (cx, cz, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.25, d * 1.25), M.contact); m.rotation.x = -Math.PI / 2; m.position.set(cx, .016, cz); m.renderOrder = 1; scene.add(m); };
    const contactPx = (x0, y0, x1, y1) => contact(X((x0 + x1) / 2), Z((y0 + y1) / 2), (x1 - x0) / S, (y1 - y0) / S);
    const C = (x, y) => [X(x), Z(y)];

    // 벽 + 걸레받이
    function walls(list, mat, trim) {
      for (const w of list) {
        fb(...w, H, 0, mat, true);
        fb(w[0] - 1, w[1] - 1, w[2] + 1, w[3] + 1, .09, 0, trim);
      }
    }
    // 통창: 유리 + 창살 + 위아래 프레임 (open = 열린 슬라이딩 구간)
    function windowX(x0, x1, y, frame, open) {
      for (const [a, b] of open ? [[x0, open[0]], [open[1], x1]] : [[x0, x1]]) {
        if (b - a < 2) continue;
        fb(a, y - 3, b, y + 3, H, 0, M.glass, true);
        const n = Math.max(1, Math.round((b - a) / 60));
        for (let k = 0; k <= n; k++) { const x = a + (b - a) * k / n; fb(x - 1.5, y - 5, x + 1.5, y + 5, H, 0, frame); }
      }
      fb(x0, y - 6, x1, y + 6, .06, 0, frame); fb(x0, y - 6, x1, y + 6, .1, H - .1, frame);
    }
    function windowY(y0, y1, x, frame) {
      fb(x - 3, y0, x + 3, y1, H, 0, M.glass, true);
      const n = Math.max(1, Math.round((y1 - y0) / 60));
      for (let k = 0; k <= n; k++) { const y = y0 + (y1 - y0) * k / n; fb(x - 5, y - 1.5, x + 5, y + 1.5, H, 0, frame); }
      fb(x - 6, y0, x + 6, y1, .06, 0, frame); fb(x - 6, y0, x + 6, y1, .1, H - .1, frame);
    }
    // 커튼 (창 양 끝에 모아둠)
    function curtainsX(x0, x1, y, mat, inside = 1) {
      for (const cx of [X(x0) + .35, X(x1) - .35]) { const m = add(curtain(.7, H - .12, .05), mat, cx, (H - .12) / 2, Z(y) + inside * .14, 0, false); m.material.side = THREE.DoubleSide; }
      fb(x0, y + inside * 5, x1, y + inside * 8, .03, H - .08, M.brushed);
    }
    function curtainsY(y0, y1, x, mat, inside = 1) {
      for (const cz of [Z(y0) + .35, Z(y1) - .35]) { const m = add(curtain(.7, H - .12, .05), mat, X(x) + inside * .14, (H - .12) / 2, cz, Math.PI / 2, false); m.material.side = THREE.DoubleSide; }
    }
    // 천장: 내려온 천장판 + 간접조명(밤) + 매입 다운라이트
    function ceiling(rooms, ceilMat, led) {
      for (const [x0, y0, x1, y1] of rooms) {
        plane(x0, y0, x1, y1, H, ceilMat, true);
        const i = 16;
        fb(x0 + i, y0 + i, x1 - i, y1 - i, .1, H - .14, ceilMat);
        if (led) {
          fb(x0 + i - 2, y0 + i - 2, x1 - i + 2, y0 + i, .02, H - .05, M.LED); fb(x0 + i - 2, y1 - i, x1 - i + 2, y1 - i + 2, .02, H - .05, M.LED);
          fb(x0 + i - 2, y0 + i, x0 + i, y1 - i, .02, H - .05, M.LED); fb(x1 - i, y0 + i, x1 - i + 2, y1 - i, .02, H - .05, M.LED);
        }
        const nx = Math.max(1, Math.round((x1 - x0) / 110)), ny = Math.max(1, Math.round((y1 - y0) / 110));
        for (let a = 0; a < nx; a++) for (let b = 0; b < ny; b++) {
          const [cx, cz] = C(x0 + (x1 - x0) * (a + .5) / nx, y0 + (y1 - y0) * (b + .5) / ny);
          add(new THREE.CylinderGeometry(.06, .06, .02, 20), M.black, cx, H - .145, cz, 0, false);
          add(new THREE.CircleGeometry(.045, 20), M.down, cx, H - .156, cz, 0, false).rotation.x = Math.PI / 2;
        }
      }
    }
    // 문: 상인방 + 활짝 열린 문짝
    function door(x0, y0, x1, y1, mat, openDir = 1) {
      const vertical = y1 - y0 > x1 - x0, len = (vertical ? y1 - y0 : x1 - x0) / S;
      fb(x0, y0, x1, y1, .7, H - .7, mat);
      const pivot = new THREE.Group();
      pivot.position.set(X(vertical ? (x0 + x1) / 2 : x0), 0, Z(vertical ? y0 : (y0 + y1) / 2));
      const leaf = shadowed(new THREE.Mesh(new THREE.BoxGeometry(vertical ? .04 : len - .04, 2.25, vertical ? len - .04 : .04), mat));
      leaf.position.set(vertical ? 0 : len / 2, 1.125, vertical ? len / 2 : 0);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 8), M.chrome); knob.position.set(vertical ? .04 : len - .1, 1.05, vertical ? len - .1 : .04);
      pivot.add(leaf, knob); pivot.rotation.y = openDir * 1.45; scene.add(pivot);
    }
    function plant(cx, cz, size = 1, potMat, tall = false) {
      const ph = .35 * size, pr = .18 * size;
      add(new THREE.CylinderGeometry(pr, pr * .78, ph, 24), potMat, cx, ph / 2, cz);
      add(new THREE.CircleGeometry(pr * .92, 20), M.soil, cx, ph - .01, cz).rotation.x = -Math.PI / 2;
      const stemH = tall ? 1.2 * size : .3 * size;
      add(new THREE.CylinderGeometry(.012, .02, stemH, 6), M.soil, cx, ph + stemH / 2, cz);
      const n = Math.round((tall ? 160 : 70) * size), im = new THREE.InstancedMesh(new THREE.PlaneGeometry(.11 * size, .24 * size).translate(0, .12 * size, 0), M.leaf, n);
      const o = new THREE.Object3D(), top = ph + stemH, rad = (tall ? .5 : .35) * size;
      for (let i = 0; i < n; i++) {
        const a = rand() * 6.28, r = Math.sqrt(rand()) * rad, y = top + between(-.25, .3) * size * (tall ? 1.6 : 1);
        o.position.set(cx + Math.cos(a) * r * .6, y, cz + Math.sin(a) * r * .6);
        o.rotation.set(between(-1.2, -.2), a + between(-.6, .6), between(-.5, .5));
        o.scale.setScalar(between(.7, 1.2));
        o.updateMatrix(); im.setMatrixAt(i, o.matrix);
      }
      im.castShadow = true; scene.add(im);
      contact(cx, cz, pr * 2.4, pr * 2.4);
    }
    // 유리 화병 + 초록 가지 + 하얀 꽃
    function vase(cx, cz, y, s = 1, flowers = true) {
      add(new THREE.CylinderGeometry(.06 * s, .05 * s, .26 * s, 20, 1, true), M.glassTint, cx, y + .13 * s, cz, 0, false);
      const o = new THREE.Object3D(), n = 40, im = new THREE.InstancedMesh(new THREE.PlaneGeometry(.05 * s, .1 * s), M.leaf, n);
      for (let i = 0; i < n; i++) { const a = rand() * 6.28, r = between(.02, .2) * s; o.position.set(cx + Math.cos(a) * r, y + between(.25, .55) * s, cz + Math.sin(a) * r); o.rotation.set(between(-1, 1), a, between(-1, 1)); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
      scene.add(im);
      if (flowers) { const f = new THREE.InstancedMesh(new THREE.SphereGeometry(.018 * s, 8, 6), M.flower, 30); for (let i = 0; i < 30; i++) { const a = rand() * 6.28, r = between(.02, .17) * s; o.position.set(cx + Math.cos(a) * r, y + between(.32, .55) * s, cz + Math.sin(a) * r); o.rotation.set(0, 0, 0); o.updateMatrix(); f.setMatrixAt(i, o.matrix); } scene.add(f); }
    }
    function books(x0, y0, x1, y1, y, along, palette) {
      const len = (along === "y" ? y1 - y0 : x1 - x0) / S, depth = (along === "y" ? x1 - x0 : y1 - y0) / S;
      const items = []; let t = 0;
      while (t < len - .05) { const w = between(.025, .055); if (rand() < .12) { t += between(.08, .2); continue; } items.push([t + w / 2, w, between(.18, .3)]); t += w + .002; }
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std({ roughness: .8 }), items.length), o = new THREE.Object3D(), c = new THREE.Color();
      items.forEach(([p, w, h], i) => {
        if (along === "y") { o.position.set(X(x0) + depth / 2, y + h / 2, Z(y0) + p); o.scale.set(depth * .8, h, w); }
        else { o.position.set(X(x0) + p, y + h / 2, Z(y0) + depth / 2); o.scale.set(w, h, depth * .8); }
        o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, c.set(pick(palette)));
      });
      im.castShadow = true; scene.add(im);
    }
    function lampTable(cx, cz, y, shadeMat, s = 1) {
      add(new THREE.CylinderGeometry(.06 * s, .09 * s, .3 * s, 20), M.chrome, cx, y + .15 * s, cz);
      add(new THREE.CylinderGeometry(.13 * s, .16 * s, .2 * s, 24, 1, true), shadeMat, cx, y + .38 * s, cz, 0, false);
      add(new THREE.CircleGeometry(.12 * s, 20), M.lamp, cx, y + .3 * s, cz, 0, false).rotation.x = -Math.PI / 2;
    }
    function chair(cx, cz, ry, seatMat, legMat, back = .45) {
      const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = ry;
      const p = (geo, m, x, y, z) => { const mm = shadowed(new THREE.Mesh(geo, m)); mm.position.set(x, y, z); g.add(mm); return mm; };
      p(rbox(.46, .08, .46, .04), seatMat, 0, .46, 0);
      p(rbox(.46, back, .07, .04), seatMat, 0, .5 + back / 2, .21).rotation.x = -.12;
      for (const [x, z] of [[-.19, -.19], [.19, -.19], [-.19, .19], [.19, .19]]) p(new THREE.CylinderGeometry(.015, .012, .44, 8), legMat, x, .22, z);
      scene.add(g);
      contact(cx, cz, .5, .5);
    }
    function sky(isDay) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(140, 140, 160, 64, 1, true), new THREE.MeshBasicMaterial({ map: skyline(isDay), side: THREE.BackSide, fog: false, color: isDay ? new THREE.Color(1.2, 1.2, 1.2) : new THREE.Color(1.1, 1.1, 1.15), toneMapped: false }));
      m.material.map.repeat.set(2, 1); m.position.set(8, -40, 8); scene.add(m);
      const g = new THREE.Mesh(new THREE.CircleGeometry(140, 48), new THREE.MeshBasicMaterial({ color: isDay ? 0x6d8aa3 : 0x030305 }));
      g.rotation.x = -Math.PI / 2; g.position.set(8, -119, 8); scene.add(g);
    }
    return { X, Z, C, H, M, std, phys, fb, rb, add, plane, contact, contactPx, walls, windowX, windowY, curtainsX, curtainsY, ceiling, door, plant, vase, books, lampTable, chair, sky };
  }

  // ---------- 01 SYNDROME & LIA : 밤, 짙은 대리석 · 차콜 패널 · 따뜻한 간접조명 ----------
  function buildSyndrome(K, scene) {
    const { fb, rb, add, plane, contactPx, C, X, Z, H, M, std, phys } = K;
    const mF = marble("#1a1a1c", "rgba(230,230,235,A)", 2, 21), mDark = marble("#0f0f10", "rgba(225,225,230,A)", 1, 22), mBath = marble("#141416", "rgba(200,200,210,A)", 2, 23);
    const W = wallTex("#2b2a29", true, 9), WD = wood(false, 4), R = rugTex(true);
    const floorM = phys({ ...mF, roughness: .18, metalness: .1, clearcoat: .8, clearcoatRoughness: .08 });
    const bathM = phys({ ...mBath, roughness: .2, clearcoat: .7, clearcoatRoughness: .1 });
    const stoneM = std({ ...marble("#2a2a2c", "rgba(160,160,165,A)", 2, 24), roughness: .6 });
    const wallM = std({ ...W, roughness: .8 }), trim = std({ color: 0x111112, roughness: .4, metalness: .3 });
    const darkMarbleM = phys({ ...mDark, roughness: .12, clearcoat: 1, clearcoatRoughness: .04 });
    const walnut = std({ ...WD, roughness: .45 });
    const sofaM = M.fab(0x2a2a2d), sofaDark = M.fab(0x1c1c1f), linen = M.fab(0x8c8c90), sheet = M.fab(0xd9d7d2, .9), plushM = M.fab(0xf4f1ea, 1), creamM = M.fab(0xf1dfc1, 1), pinkM = M.fab(0xe8b8c4), shirtM = M.fab(0x2a2a2e);
    const rugM = std({ ...R, roughness: 1 }), ceilM = std({ color: 0x131313, roughness: .9 }), curtainM = M.fab(0x3a3836, .95);

    plane(68, 362, 985, 1150, 0, floorM, false, 2);
    plane(88, 955, 405, 1130, .002, bathM, false, 1.5);
    plane(88, 270, 965, 362, 0, stoneM, false, 1.5);
    K.walls([
      [68, 362, 110, 382], [330, 362, 395, 382], [640, 362, 710, 382], [960, 362, 985, 382],
      [68, 362, 88, 1150], [965, 362, 985, 1150], [68, 1130, 505, 1150], [570, 1130, 985, 1150],
      [362, 382, 372, 440], [362, 490, 372, 715], [88, 715, 200, 725], [250, 715, 372, 725], [362, 725, 372, 945],
      [88, 945, 230, 955], [270, 945, 412, 955], [305, 1000, 312, 1130], [405, 955, 412, 1130], [595, 948, 602, 1130],
      [602, 940, 700, 948], [745, 940, 840, 948], [832, 892, 840, 948], [832, 892, 965, 900],
      [668, 382, 678, 440], [668, 490, 678, 612], [678, 606, 905, 615],
    ], wallM, trim);
    for (const d of [[362, 440, 372, 490], [200, 715, 250, 725], [230, 945, 270, 955], [305, 955, 312, 1000], [700, 940, 745, 948], [668, 440, 678, 490]]) K.door(...d, walnut, d[3] - d[1] > d[2] - d[0] ? 1 : -1);
    fb(505, 1136, 570, 1146, 2.4, 0, walnut, true);
    fb(527, 1128, 531, 1136, .3, 1.05, M.chrome);
    K.windowX(110, 330, 372, M.black); K.windowX(395, 640, 372, M.black, [470, 560]); K.windowX(710, 960, 372, M.black);
    K.curtainsX(110, 330, 372, curtainM); K.curtainsX(395, 640, 372, curtainM); K.curtainsX(710, 960, 372, curtainM);
    fb(88, 268, 965, 272, 1.1, 0, M.glass, true); fb(88, 266, 965, 270, .05, 1.1, M.chrome);
    fb(84, 270, 90, 362, 1.1, 0, M.glass, true); fb(963, 270, 969, 362, 1.1, 0, M.glass, true);
    K.ceiling([[88, 382, 362, 715], [88, 725, 362, 945], [88, 955, 305, 1130], [312, 955, 405, 1130], [372, 382, 668, 948], [678, 382, 965, 606], [678, 615, 965, 892], [412, 948, 595, 1130], [602, 948, 965, 1130]], ceilM, true);
    K.sky(false);

    // A 현관
    add(new THREE.PlaneGeometry(1.4, 2.1), std({ map: artTex("red"), roughness: .85 }), X(413) + .03, 1.55, Z(1030), Math.PI / 2, false);
    fb(414, 965, 450, 1100, .55, 0, M.black, true, .01); fb(448, 965, 451, 1100, .02, .02, M.LED);
    fb(560, 960, 594, 1110, 2.2, 0, M.mirror, true);
    add(new THREE.SphereGeometry(.16, 32, 20), M.chrome, X(432), .72, Z(1020));
    // B 거실
    fb(372, 480, 392, 790, H, 0, std({ ...W, roughness: .6, color: 0x555555 }), true);
    fb(392, 520, 395, 740, 1.05, 1.05, M.screenOff); fb(391, 515, 393, 745, 1.15, 1, M.black);
    fb(392, 500, 432, 770, .35, 0, M.black, true, .01); fb(431, 500, 433, 770, .02, .02, M.LED);
    for (const y of [.8, 1.5, 2.2]) { fb(372, 795, 396, 940, .03, y, walnut); fb(394, 797, 396, 938, .015, y - .016, M.LED); }
    K.books(372, 800, 392, 935, .83, "y", ["#2b2b2e", "#4a3b2c", "#7a6a55", "#1c1c1f", "#5a5a5e"]);
    K.vase(...C(385, 820), 1.53, .8, false); add(new THREE.SphereGeometry(.1, 20, 16), M.gold, X(384), 2.33, Z(900));
    plane(415, 525, 600, 840, .012, rugM);
    const sofa = (x0, y0, x1, y1) => fb(x0, y0, x1, y1, .42, 0, sofaM, true, .06);
    sofa(540, 525, 585, 780); fb(568, 525, 586, 780, .42, .38, sofaM, false, .06);
    sofa(455, 525, 585, 562); fb(455, 525, 585, 541, .42, .38, sofaM, false, .06);
    sofa(498, 705, 545, 780);
    for (let k = 0; k < 4; k++) fb(543, 563 + k * 52, 567, 612 + k * 52, .12, .42, sofaDark, false, .05);
    for (let k = 0; k < 3; k++) fb(458 + k * 28, 542, 484 + k * 28, 562, .12, .42, sofaDark, false, .05);
    for (const [y, ry] of [[600, .2], [660, -.15]]) add(pillow(.45, .45, .14), sofaDark, X(574), .74, Z(y), Math.PI / 2 + ry);
    add(rbox(.9, .04, .7, .02), M.fab(0x3a3a3d), X(520), .47, Z(740), .3);
    contactPx(455, 525, 585, 780);
    fb(455, 600, 510, 715, .36, 0, darkMarbleM, true, .01); contactPx(455, 600, 510, 715);
    add(new THREE.BoxGeometry(.3, .04, .22), M.gold, X(470), .38, Z(640)); K.vase(X(495), Z(690), .36, .6, false);
    fb(415, 485, 455, 522, .42, 0, sofaDark, true, .05); fb(415, 485, 455, 492, .35, .4, sofaDark, false, .04);
    fb(545, 790, 577, 822, .5, 0, M.black, true, .01); K.lampTable(X(561), Z(806), .5, sofaM, .9);
    seed = 99;
    const plush = (x, z, y, s, ry) => {
      const g = new THREE.Group(), m = rand() < .25 ? creamM : plushM;
      const body = new THREE.Mesh(new THREE.SphereGeometry(.2, 24, 16), m); body.scale.set(1, .85, .9); g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.16, 24, 16), m); head.position.set(0, .2, .02); g.add(head);
      for (const sx of [-1, 1]) {
        const e = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), m); e.position.set(sx * .1, .33, 0); g.add(e);
        const cheek = new THREE.Mesh(new THREE.SphereGeometry(.025, 8, 6), pinkM); cheek.position.set(sx * .08, .17, .14); g.add(cheek);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(.012, 8, 6), M.black); eye.position.set(sx * .05, .22, .15); g.add(eye);
      }
      g.traverse((o) => { o.castShadow = o.receiveShadow = true; });
      g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s); scene.add(g);
    };
    for (let k = 0; k < 13; k++) plush(X(between(508, 566)), Z(between(640, 772)), .62 + (k % 3) * .13, between(.8, 1.5), between(-2.4, -.8));
    // C 주방
    fb(735, 672, 790, 900, .9, 0, M.black, true, .01); fb(732, 669, 793, 903, .05, .9, darkMarbleM, false, .005); contactPx(735, 672, 790, 900);
    for (const y of [710, 760, 810, 860]) { add(rbox(.4, .07, .4, .05), sofaDark, X(716), .74, Z(y)); add(new THREE.CylinderGeometry(.02, .02, .74, 8), M.black, X(716), .37, Z(y)); add(new THREE.TorusGeometry(.15, .01, 6, 24), M.black, X(716), .28, Z(y)).rotation.x = Math.PI / 2; }
    fb(920, 650, 965, 892, .88, 0, M.black, true); fb(918, 650, 965, 892, .04, .88, darkMarbleM);
    fb(963, 650, 965, 892, .7, .92, darkMarbleM);
    fb(840, 860, 920, 892, .88, 0, M.black, true); fb(840, 858, 920, 892, .04, .88, darkMarbleM);
    fb(950, 650, 965, 892, .9, 1.55, M.black); fb(948, 650, 950, 892, .02, 1.53, M.LED);
    add(new THREE.TorusGeometry(.08, .012, 8, 20, Math.PI), M.chrome, X(935), 1.05, Z(780), Math.PI / 2);
    fb(915, 615, 965, 650, 2.4, 0, M.blackGloss, true);
    for (const x of [745, 780]) add(new THREE.SphereGeometry(.12, 20, 14, 0, 6.28, 0, 1.6), M.gold, X(x), 2.2, Z(785), 0, false);
    // D 마스터 침실
    fb(88, 465, 100, 665, 1.3, 0, M.fab(0x232326), true, .03);
    for (let k = 0; k < 6; k++) fb(89, 470 + k * 32, 101, 498 + k * 32, 1.2, .05, M.fab(0x29292c), false, .03);
    fb(100, 490, 215, 640, .3, 0, M.black, true, .02); fb(102, 492, 213, 638, .22, .3, sheet, false, .06);
    fb(150, 492, 214, 639, .05, .52, linen, false, .03);
    for (const y of [505, 570]) add(pillow(.6, .4, .16), sheet, X(112), .62, Z(y + 30), Math.PI / 2);
    contactPx(100, 490, 215, 640);
    for (const y of [460, 645]) { fb(90, y, 118, y + 26, .5, 0, M.black, true, .01); K.lampTable(X(104), Z(y + 13), .5, linen, .8); }
    rb(X(150), Z(422), .7, .4, .65, 0, M.fab(0x1f1f22), .6, .08); rb(X(140), Z(410), .7, .45, .15, .35, M.fab(0x1f1f22), .6, .06);
    plane(150, 485, 255, 655, .012, rugM);
    add(new THREE.TorusGeometry(.32, .12, 16, 32), M.fab(0x3a3a3d), X(215), .12, Z(690)).rotation.x = Math.PI / 2;
    plush(X(215), Z(690), .2, 1.1, 2);
    fb(335, 505, 360, 630, .7, 0, walnut, true, .01);
    // E 드레스룸
    for (const [x0, x1, pink] of [[88, 130, false], [322, 362, true]]) {
      fb(x0, 730, x1, 940, H - .3, 0, M.black, true);
      const front = x0 === 88 ? x1 : x0, dir = x0 === 88 ? -1 : 1;
      fb(Math.min(front, front + dir * 2), 730, Math.max(front, front + dir * 2), 940, .03, 2.05, M.chrome);
      for (let y = 738; y < 935; y += 7) { const m = pink && y > 835 ? pinkM : (y / 7) % 4 < 1 ? sheet : shirtM; fb(Math.min(front + dir * 6, front + dir * 34), y, Math.max(front + dir * 6, front + dir * 34), y + 4, .95, 1.1, m, false, .01); }
      const fx = x0 === 88 ? x1 - 3 : x0 + 1;
      for (const hy of [.22, .5, .78]) { fb(x0 + 4, 735, x1 - 4, 938, .03, hy, walnut); fb(fx, 737, fx + 2, 936, .015, hy - .016, M.LED); for (let y = 745; y < 935; y += 22) { fb(x0 + 10, y, x1 - 10, y + 7, .09, hy + .04, rand() < .5 ? M.white : M.black, false, .02); fb(x0 + 10, y + 9, x1 - 10, y + 16, .09, hy + .04, rand() < .5 ? M.white : M.black, false, .02); } }
    }
    fb(195, 790, 270, 880, .9, 0, M.black, true, .01); fb(193, 788, 272, 882, .04, .9, darkMarbleM); contactPx(195, 790, 270, 880);
    for (let k = 0; k < 7; k++) add(new THREE.CylinderGeometry(.025, .03, between(.08, .16), 12), rand() < .5 ? M.gold : M.glassTint, X(between(205, 260)), .99, Z(between(800, 870)));
    fb(132, 828, 138, 892, 1.1, 1, M.mirror);
    for (let k = 0; k < 12; k++) add(new THREE.SphereGeometry(.035, 12, 8), M.lamp, X(140), 1.02 + (k % 6) * .2, Z(k < 6 ? 826 : 894), 0, false);
    fb(140, 835, 178, 885, .75, 0, walnut, true, .01); rb(X(195), Z(860), .4, .45, .4, 0, M.fab(0x2b2b2e), 0, .15);
    // F 마스터 욕실
    const tubG = new THREE.LatheGeometry([[0, .05], [.52, .05], [.62, .3], [.66, .58], [.6, .6], [.52, .35], [0, .3]].map(([r, y]) => new THREE.Vector2(r, y)), 64);
    add(tubG, M.blackGloss, X(125), 0, Z(1030)).scale.set(.85, 1, 1.75);
    K.contact(X(125), Z(1030), 1.1, 2.1);
    fb(175, 1080, 295, 1125, .85, 0, M.black, true); fb(175, 1078, 295, 1125, .04, .85, darkMarbleM); fb(175, 1124, 295, 1128, .03, .1, M.LED);
    for (const x of [205, 265]) { add(new THREE.CylinderGeometry(.18, .12, .1, 32), M.blackGloss, X(x), .92, Z(1102)); add(new THREE.CylinderGeometry(.012, .012, .2, 8), M.black, X(x), 1.0, Z(1120)); }
    fb(175, 1126, 295, 1130, 1.1, 1.3, M.mirror);
    fb(314, 1000, 318, 1128, 2.2, 0, M.glass, true);
    add(new THREE.CylinderGeometry(.14, .14, .02, 32), M.black, X(360), 2.3, Z(1080));
    fb(398, 1020, 404, 1060, .7, .7, sheet, false, .02);
    // G 미디어룸 · 트로피룸
    fb(905, 385, 965, 605, H - .2, 0, M.black, true);
    for (const hy of [.5, 1, 1.5, 2, 2.5]) {
      fb(903, 390, 907, 600, .02, hy - .02, M.LED);
      for (let y = 400; y < 595; y += 26) {
        const g = rand() < .7 ? M.gold : M.chrome, s = between(.8, 1.3);
        add(new THREE.LatheGeometry([[0, 0], [.06, 0], [.06, .03], [.015, .05], [.015, .12], [.07, .16], [.08, .24], [0, .22]].map(([r, yy]) => new THREE.Vector2(r * s, yy * s)), 20), g, X(893), hy, Z(y));
      }
    }
    fb(735, 440, 860, 472, .75, 0, M.black, true, .01); fb(733, 438, 862, 474, .03, .75, walnut);
    for (const [x, w] of [[760, 30], [797, 34], [836, 30]]) { fb(x - w / 2, 426, x + w / 2, 428, .36, 1.0, M.screen).rotation.y = (x - 797) * -.006; fb(x - 2, 428, x + 2, 432, .22, .78, M.black); }
    fb(760, 386, 835, 389, .85, 1.5, M.screen);
    const gc = new THREE.Group(); gc.position.set(X(797), 0, Z(500));
    for (const [geo, mat, y, z, rx] of [[rbox(.55, .1, .55, .05), sofaDark, .48, 0, 0], [rbox(.55, .8, .1, .06), sofaDark, .95, .25, -.15], [new THREE.CylinderGeometry(.03, .03, .45, 8), M.chrome, .23, 0, 0]]) { const m = new THREE.Mesh(geo, mat); m.position.set(0, y, z); m.rotation.x = rx; m.castShadow = true; gc.add(m); }
    scene.add(gc);
    for (const x of [760, 830]) add(new THREE.SphereGeometry(.42, 32, 20), sofaDark, X(x), .25, Z(565)).scale.y = .62;
    K.contact(X(795), Z(565), 1.9, .9);
    // H 게스트룸 · 서재
    fb(950, 980, 963, 1100, 1.1, 0, M.fab(0x232326), true, .03);
    fb(840, 980, 950, 1100, .3, 0, M.black, true, .02); fb(842, 982, 948, 1098, .2, .3, sheet, false, .05); fb(840, 982, 900, 1098, .05, .5, M.fab(0x4a4038), false, .03);
    add(pillow(.55, .38, .15), sheet, X(938), .6, Z(1040), Math.PI / 2); contactPx(840, 980, 950, 1100);
    fb(715, 1065, 790, 1105, .04, .74, M.white, true); for (const x of [718, 787]) fb(x - 1, 1066, x + 1, 1104, .74, 0, M.chrome);
    add(new THREE.CylinderGeometry(.008, .008, .5, 6), M.black, X(780), 1, Z(1080)); add(new THREE.ConeGeometry(.1, .12, 20, 1, true), M.black, X(775), 1.26, Z(1080));
    add(new THREE.CircleGeometry(.07, 16), M.lamp, X(775), 1.2, Z(1080), 0, false).rotation.x = Math.PI / 2;
    add(new THREE.BoxGeometry(.34, .02, .24), M.chrome, X(745), .77, Z(1085)); K.chair(X(750), Z(1050), Math.PI, M.fab(0x2b2b2e), M.chrome, .4);
    fb(605, 985, 640, 1105, 2.2, 0, M.black, true);
    for (const hy of [.5, 1, 1.5, 2]) { fb(640, 990, 642, 1100, .015, hy, M.LED); K.books(606, 992, 636, 1098, hy + .02, "y", ["#e8e4dc", "#3a3a3d", "#8a7a66", "#1f1f22"]); }
    fb(845, 905, 925, 940, 2.4, 0, M.black, true);
    plane(800, 970, 840, 1110, .012, rugM);
    // I 발코니
    fb(145, 300, 285, 345, .38, 0, M.fab(0x3a3a3d), true, .05); fb(145, 300, 285, 312, .35, .36, M.fab(0x3a3a3d), false, .05);
    fb(195, 315, 255, 340, .3, 0, darkMarbleM, true, .01);
    for (const x of [780, 830, 880, 930]) { K.plant(X(x), Z(342), 1.3, M.black, true); add(new THREE.CircleGeometry(.06, 12), M.lamp, X(x), .02, Z(326), 0, false).rotation.x = -Math.PI / 2; }

    // 빛: 방마다 따뜻한 조명 + 그림자 지는 스포트라이트
    scene.add(new THREE.HemisphereLight(0x8a7a6a, 0x101012, .3));
    for (const [x, y, k] of [[520, 760, 1.5], [225, 700, 1.3], [800, 620, 1.3], [400, 1040, 1.1], [780, 1040, 1]]) { const l = new THREE.PointLight(0xffc996, k, 11, 2); l.position.set(X(x), H - .4, Z(y)); scene.add(l); }
    for (const [x, y] of [[490, 650], [160, 562], [762, 782]]) {
      const s = new THREE.SpotLight(0xffd2a0, 3.2, 9, .75, .6, 1.6); s.position.set(X(x), H - .2, Z(y)); s.target.position.set(X(x), 0, Z(y + 4));
      s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -.0005; scene.add(s, s.target);
    }
    const moon = new THREE.DirectionalLight(0x8fa2c8, .3); moon.position.set(-5, 8, -10); scene.add(moon);
    return { center: C(520, 700) };
  }

  // ---------- 02 FEATHER & HAEMI : 낮, 베이지 대리석 · 밝은 원목 · 크림 패브릭 · 블루 포인트 ----------
  function buildFeather(K, scene) {
    const { fb, rb, add, plane, contact, contactPx, C, X, Z, H, M, std, phys } = K;
    const mF = marble("#d9d2c6", "rgba(150,140,130,A)", 2, 31), mW = marble("#ece8e2", "rgba(120,120,125,A)", 1, 32), mBath = marble("#d4cbbd", "rgba(140,130,118,A)", 3, 33);
    const OAK = wood(true, 6), W = wallTex("#ece6dc", false, 12), WP = wallTex("#e3d9c9", true, 13), R = rugTex(false);
    const floorM = phys({ ...mF, roughness: .2, clearcoat: .6, clearcoatRoughness: .1 });
    const oakFloor = std({ ...OAK, roughness: .45 });
    const bathM = phys({ ...mBath, roughness: .25, clearcoat: .5 });
    const islandM = phys({ ...mW, roughness: .12, clearcoat: 1, clearcoatRoughness: .05 });
    const wallM = std({ ...W, roughness: .9 }), panelM = std({ ...WP, roughness: .7 }), trim = std({ color: 0xf4f1ea, roughness: .5 });
    const oak = std({ ...OAK, roughness: .5 }), cabinet = std({ color: 0xe6dccb, roughness: .45 }), ceilM = std({ color: 0xf6f3ee, roughness: .95 });
    const cream = M.fab(0xefe9df), creamD = M.fab(0xe0d7c8), white = M.fab(0xfbfaf7, .9), blue = M.fab(0x7d98b8), blueD = M.fab(0x5a7699), throwM = M.fab(0x6d86a8);
    const rugM = std({ ...R, roughness: 1 }), sheer = std({ color: 0xffffff, roughness: 1, transparent: true, opacity: .55, map: M.F.map, side: THREE.DoubleSide });
    const stoneM = std({ ...marble("#cfc7bb", "rgba(150,140,130,A)", 3, 34), roughness: .6 }), doorM = std({ color: 0xf1ece4, roughness: .5 });

    plane(130, 225, 705, 905, 0, floorM, false, 2);
    plane(148, 238, 350, 490, .002, oakFloor, false, 1.6);
    plane(148, 680, 330, 895, .002, oakFloor, false, 1.6);
    plane(447, 238, 600, 405, .003, bathM, false, 1.2); plane(458, 412, 600, 502, .003, bathM, false, 1.2);
    plane(135, 905, 615, 1020, 0, stoneM, false, 1.2);
    K.walls([
      [130, 225, 148, 905], [130, 225, 612, 238], [598, 238, 612, 515], [455, 505, 705, 520], [690, 520, 705, 905],
      [130, 892, 150, 905], [325, 892, 335, 905], [570, 892, 632, 905], [688, 892, 705, 905],
      [345, 238, 355, 430], [345, 470, 355, 497], [437, 238, 447, 265], [437, 300, 447, 415], [355, 405, 365, 415], [430, 405, 447, 415],
      [447, 400, 598, 410], [452, 410, 460, 445], [452, 485, 460, 505],
      [148, 487, 345, 497], [148, 575, 285, 585], [280, 497, 290, 545], [148, 665, 272, 675], [265, 600, 275, 665],
      [345, 497, 355, 600], [345, 660, 355, 690], [148, 672, 290, 682], [325, 672, 335, 892],
    ], wallM, trim);
    for (const d of [[345, 430, 355, 470], [437, 265, 447, 300], [452, 445, 460, 485], [345, 600, 355, 660], [290, 672, 325, 682]]) K.door(...d, doorM, d[3] - d[1] > d[2] - d[0] ? -1 : 1);
    fb(632, 896, 688, 902, 2.4, 0, oak, true); fb(676, 892, 680, 896, .3, 1.05, M.chrome);
    K.windowY(270, 470, 139, trim); K.windowY(700, 880, 139, trim); K.windowY(510, 560, 139, trim);
    K.windowX(335, 570, 898, trim, [420, 500]); K.windowX(150, 325, 898, trim);
    K.curtainsY(270, 470, 139, sheer); K.curtainsY(700, 880, 139, sheer); K.curtainsX(335, 570, 898, sheer, -1); K.curtainsX(150, 325, 898, sheer, -1);
    fb(135, 1015, 615, 1019, 1.1, 0, M.glass, true); fb(135, 1013, 615, 1017, .05, 1.1, M.brushed);
    fb(131, 905, 135, 1019, 1.1, 0, M.glass, true); fb(613, 905, 617, 1019, 1.1, 0, M.glass, true);
    K.ceiling([[148, 238, 345, 487], [355, 238, 437, 405], [447, 238, 598, 400], [460, 410, 598, 505], [355, 415, 452, 690], [148, 497, 280, 575], [148, 585, 265, 665], [148, 682, 325, 892], [335, 690, 690, 892], [490, 520, 690, 690]], ceilM, false);
    K.sky(true);

    // A 현관 · 복도
    fb(357, 440, 375, 520, .8, 0, cabinet, true, .01); fb(356, 438, 377, 522, .04, .8, islandM, false, .005); K.vase(...C(366, 470), .84, 1);
    add(new THREE.PlaneGeometry(.7, .95), std({ map: artTex("blue"), roughness: .8 }), X(355) + .02, 1.55, Z(480), Math.PI / 2, false);
    fb(455, 520, 490, 680, H - .1, 0, cabinet, true); for (let y = 530; y < 680; y += 40) fb(453, y, 456, y + 30, .02, .9, M.chrome);
    for (const hy of [1.1, 1.5, 1.9]) fb(452, 540, 455, 670, .02, hy, M.LED);
    // D 마스터 침실
    fb(200, 238, 310, 246, 1.25, 0, panelM, true, .02);
    fb(205, 246, 305, 352, .32, 0, cream, true, .04); fb(207, 248, 303, 350, .22, .32, white, false, .07);
    fb(207, 300, 303, 350, .05, .54, throwM, false, .03); fb(270, 248, 304, 350, .04, .55, white, false, .03);
    for (const x of [225, 255, 285]) add(pillow(.55, .4, .16), x === 255 ? blue : white, X(x), .7, Z(258), 0).rotation.x = -.25;
    for (const x of [240, 270]) add(pillow(.4, .3, .12), blueD, X(x), .66, Z(270)).rotation.x = -.35;
    contactPx(205, 246, 305, 352);
    for (const x of [192, 318]) { fb(x - 13, 246, x + 13, 268, .55, 0, cabinet, true, .01); K.lampTable(X(x), Z(255), .55, cream, .9); }
    plane(175, 290, 335, 385, .012, rugM);
    rb(X(178), Z(448), .75, .42, .72, 0, cream, .7, .1); rb(X(170), Z(440), .75, .5, .18, .38, cream, .7, .08); add(pillow(.35, .3, .12), blue, X(180), .55, Z(446), .7);
    fb(215, 462, 300, 487, .75, 0, cabinet, true, .01); K.vase(...C(285, 474), .75, .9);
    K.plant(X(165), Z(300), .9, M.ceramic);
    // 드레스룸
    for (let y = 248; y < 400; y += 6) fb(358, y, 372, y + 3, .9, 1.15, pick([white, cream, blue, creamD]), false, .005);
    fb(356, 245, 360, 400, .02, 2.07, M.chrome); fb(375, 245, 437, 402, .4, 0, cabinet, true, .01);
    // E 마스터 욕실
    const tubG = new THREE.LatheGeometry([[0, .02], [.5, .02], [.62, .25], [.68, .58], [.64, .6], [.55, .32], [0, .28]].map(([r, y]) => new THREE.Vector2(r, y)), 64);
    add(tubG, M.ceramic, X(488), 0, Z(270)).scale.set(1.5, 1, .78); contact(X(488), Z(270), 1.9, 1);
    fb(540, 238, 543, 302, 2.1, 0, M.glass, true); fb(543, 299, 598, 302, 2.1, 0, M.glass, true);
    add(new THREE.CylinderGeometry(.14, .14, .02, 32), M.chrome, X(570), 2.25, Z(265));
    fb(455, 372, 540, 400, .8, 0, cabinet, true, .01); fb(454, 370, 541, 400, .04, .8, islandM); fb(455, 399, 540, 401, .02, .08, M.LED);
    for (const x of [475, 520]) { add(rbox(.38, .12, .3, .02), M.ceramic, X(x), .9, Z(384)); add(new THREE.CylinderGeometry(.012, .012, .22, 8), M.chrome, X(x), .95, Z(396)); }
    fb(455, 398, 540, 400, 1, 1.25, M.mirror);
    add(rbox(.38, .42, .55, .12), M.ceramic, X(558), .21, Z(388)); add(rbox(.38, .4, .15, .04), M.ceramic, X(558), .62, Z(398));
    fb(580, 315, 598, 395, 1.4, .3, cabinet, false, .01); K.vase(...C(530, 384), .84, .7);
    // G 게스트 욕실
    fb(465, 412, 505, 440, .8, 0, cabinet, true, .01); fb(464, 410, 506, 440, .04, .8, islandM); add(rbox(.36, .1, .28, .02), M.ceramic, X(485), .88, Z(425));
    fb(465, 410, 505, 412, .9, 1.15, M.mirror);
    add(rbox(.36, .4, .5, .12), M.ceramic, X(537), .2, Z(426)); fb(557, 412, 560, 470, 2.1, 0, M.glass, true); fb(560, 467, 598, 470, 2.1, 0, M.glass, true);
    // C 주방
    fb(490, 520, 690, 545, .88, 0, cabinet, true); fb(490, 518, 690, 547, .04, .88, islandM);
    fb(490, 520, 690, 522, .65, .92, islandM); fb(490, 520, 690, 538, .75, 1.6, cabinet); fb(490, 537, 690, 539, .02, 1.58, M.LED);
    fb(670, 545, 690, 690, .88, 0, cabinet, true); fb(668, 545, 690, 690, .04, .88, islandM); fb(688, 545, 690, 690, .65, .92, islandM);
    add(new THREE.BoxGeometry(.5, .02, .4), M.black, X(680), .93, Z(612));
    for (const [dx, dz] of [[-.1, -.1], [.1, -.1], [-.1, .1], [.1, .1]]) add(new THREE.TorusGeometry(.06, .006, 6, 20), M.brushed, X(680) + dx, .945, Z(612) + dz).rotation.x = Math.PI / 2;
    add(rbox(.55, .15, .4, .02), M.brushed, X(605), .86, Z(532)); add(new THREE.TorusGeometry(.12, .012, 8, 20, Math.PI), M.chrome, X(605), 1.05, Z(522), Math.PI / 2);
    fb(640, 520, 670, 545, 2.2, 0, M.brushed); fb(670, 690, 690, 735, 2.2, 0, M.brushed, true);
    for (let y = 555; y < 685; y += 34) fb(668, y, 670, y + 2, .4, .4, M.chrome);
    fb(540, 615, 625, 665, .88, 0, cabinet, true, .01); fb(536, 611, 629, 669, .05, .88, islandM, false, .01); contactPx(540, 615, 625, 665);
    for (const x of [557, 582, 607]) { add(rbox(.4, .08, .4, .06), cream, X(x), .7, Z(676)); add(rbox(.4, .35, .06, .04), cream, X(x), .95, Z(690)).rotation.x = .15; add(new THREE.CylinderGeometry(.015, .015, .7, 8), M.brushed, X(x), .35, Z(676)); }
    K.vase(...C(570, 640), .93, 1.1);
    for (const x of [550, 600]) { add(new THREE.CylinderGeometry(.005, .005, .8, 6), M.brushed, X(x), 2.6, Z(640)); add(new THREE.SphereGeometry(.12, 24, 16, 0, 6.28, 0, 1.7), M.glassTint, X(x), 2.15, Z(640), 0, false); add(new THREE.SphereGeometry(.04, 12, 8), M.lamp, X(x), 2.12, Z(640), 0, false); }
    // B 거실
    fb(335, 735, 352, 865, H, 0, islandM, true); fb(352, 765, 355, 835, .7, 1.2, M.screenOff); fb(352, 740, 380, 860, .4, 0, cabinet, true, .01); fb(378, 740, 380, 860, .02, .02, M.LED);
    K.vase(...C(366, 750), .4, .9);
    plane(380, 725, 495, 875, .012, rugM);
    fb(458, 735, 495, 865, .42, 0, cream, true, .06); fb(480, 735, 496, 865, .45, .38, cream, false, .07);
    for (const [y, m] of [[755, blue], [785, white], [815, white], [845, blue]]) add(pillow(.45, .42, .15), m, X(475), .75, Z(y), Math.PI / 2 - .2);
    for (let k = 0; k < 3; k++) fb(459, 740 + k * 41, 480, 778 + k * 41, .12, .42, creamD, false, .05);
    contactPx(458, 735, 495, 865);
    for (const y of [732, 858]) { const up = y < 800 ? -1 : 1; rb(X(430), Z(y), .7, .4, .7, 0, cream, 0, .12); rb(X(430), Z(y + up * 12), .7, .45, .2, .35, cream, 0, .1); add(pillow(.35, .3, .12), blue, X(430), .5, Z(y + up * 8)); }
    fb(410, 765, 450, 825, .38, 0, islandM, true, .01); contactPx(410, 765, 450, 825);
    add(new THREE.BoxGeometry(.3, .05, .22), white, X(425), .41, Z(785)); K.vase(X(437), Z(805), .38, .8);
    K.lampTable(X(395), Z(712), 0, cream, 1.6);
    K.plant(X(560), Z(870), 1.1, M.ceramic, true);
    // 다이닝
    fb(560, 735, 605, 830, .05, .74, islandM, true, .01); fb(575, 755, 590, 810, .72, 0, islandM);
    for (const [x, y, ry] of [[548, 752, Math.PI / 2], [548, 782, Math.PI / 2], [548, 812, Math.PI / 2], [617, 752, -Math.PI / 2], [617, 782, -Math.PI / 2], [617, 812, -Math.PI / 2]]) K.chair(X(x), Z(y), ry, cream, M.brushed, .5);
    K.vase(...C(582, 782), .79, 1.1);
    add(new THREE.BoxGeometry(1.2, .04, .1), M.brushed, X(582), 2.2, Z(782), Math.PI / 2); fb(580, 755, 584, 810, .01, 2.18, M.LED);
    // F 게스트룸 · 서재
    fb(150, 712, 195, 802, .42, 0, cream, true, .06); fb(150, 712, 162, 802, .45, .38, cream, false, .06); fb(152, 714, 194, 800, .04, .44, white, false, .03); fb(170, 714, 196, 760, .03, .48, throwM, false, .02);
    for (const y of [730, 760, 785]) add(pillow(.42, .38, .14), y === 760 ? blue : white, X(166), .72, Z(y), Math.PI / 2 - .2);
    contactPx(150, 712, 195, 802);
    add(new THREE.CircleGeometry(.95, 48), rugM, X(225), .013, Z(770), 0, false).rotation.x = -Math.PI / 2;
    fb(296, 805, 326, 866, .04, .74, M.white, true); fb(297, 806, 300, 865, .74, 0, M.white); fb(322, 806, 325, 865, .74, 0, M.white);
    K.chair(X(280), Z(838), Math.PI / 2, creamD, M.brushed, .5); K.lampTable(X(315), Z(815), .78, cream, .7); K.vase(...C(312, 855), .78, .8);
    fb(300, 712, 326, 795, 2.1, 0, oak, true);
    for (const hy of [.4, .8, 1.2, 1.6, 2]) { fb(300, 712, 326, 795, .03, hy, oak); K.books(301, 714, 324, 793, hy + .03, "y", ["#e9e2d6", "#7d98b8", "#c8b89a", "#f5f2ec", "#8c8478"]); }
    add(new THREE.PlaneGeometry(.6, .8), std({ map: artTex("blue", 52), roughness: .8 }), X(240), 1.6, Z(682) + .02, 0, false);
    rb(X(172), Z(843), .65, .4, .65, 0, cream, .4, .1); K.plant(X(205), Z(872), .7, M.ceramic);
    // H 발코니
    for (const x of [232, 298, 445, 520]) {
      const g = new THREE.Group(); g.position.set(X(x), 0, Z(958)); g.rotation.y = -.25;
      for (const [geo, m, y, z, rx] of [[rbox(.7, .14, 1.4, .06), white, .32, .1, 0], [rbox(.7, .1, .6, .05), white, .5, -.55, -.7], [rbox(.72, .04, 1.5, .01), M.brushed, .22, 0, 0]]) { const mm = new THREE.Mesh(geo, m); mm.position.set(0, y, z); mm.rotation.x = rx; mm.castShadow = mm.receiveShadow = true; g.add(mm); }
      const pl = new THREE.Mesh(pillow(.4, .3, .12), blue); pl.position.set(0, .62, -.45); pl.rotation.x = -.6; g.add(pl);
      scene.add(g); contact(X(x), Z(958), .8, 1.5);
    }
    for (const x of [265, 482]) { add(new THREE.CylinderGeometry(.22, .22, .03, 32), M.white, X(x), .5, Z(950)); add(new THREE.CylinderGeometry(.02, .02, .5, 8), M.brushed, X(x), .25, Z(950)); K.vase(X(x), Z(950), .52, .7); }
    for (const [x, y] of [[160, 935], [160, 990], [585, 935], [590, 990], [365, 1000]]) { K.plant(X(x), Z(y), 1.1, M.ceramic); K.vase(X(x), Z(y), .4, 1.6); }

    // 빛: 창으로 들어오는 햇살(그림자) + 하늘빛 + 은은한 실내등
    scene.add(new THREE.HemisphereLight(0xdfeaf5, 0xb8a990, .35));
    const sun = new THREE.DirectionalLight(0xfff1dd, 2.6);
    sun.position.set(X(-300), 7, Z(1400)); sun.target.position.set(X(400), 0, Z(600));
    sun.castShadow = true; const sc = sun.shadow.camera; sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 60;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
    scene.add(sun, sun.target);
    for (const [x, y, k] of [[480, 760, .35], [250, 380, .3], [520, 400, .3], [400, 600, .25]]) { const l = new THREE.PointLight(0xfff0dc, k, 9, 2); l.position.set(X(x), H - .4, Z(y)); scene.add(l); }
    return { center: C(500, 720) };
  }

  const LAYOUTS = {
    syndrome: { origin: [68, 362], theme: "night", bounds: [70, 272, 983, 1148], build: buildSyndrome },
    feather: { origin: [130, 225], theme: "day", bounds: [132, 227, 703, 1017], build: buildFeather },
  };

  // ---------- 화면 ----------
  async function Room3D(container, suite, onRoom) {
    THREE = await App.loadThree();
    const L = LAYOUTS[suite.model];
    if (!L) throw new Error("이 숙소는 3D 가 아직 없어요");
    const mobile = window.innerWidth < 800;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = L.theme === "day" ? .72 : 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(L.theme === "day" ? 0xcfdde9 : 0x020306);
    const camera = new THREE.PerspectiveCamera(mobile ? 68 : 62, 1, .05, 400);
    const colliders = [];
    const K = kit(scene, colliders, L);
    const info = L.build(K, scene);
    const { X, Z } = K;

    // 실내 반사: 방 한가운데에서 실제 방을 한 번 찍어서 금속 · 유리 · 대리석에 비춤
    const cubeRT = new THREE.WebGLCubeRenderTarget(256, { format: THREE.RGBFormat, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, encoding: THREE.sRGBEncoding });
    const cubeCam = new THREE.CubeCamera(.05, 200, cubeRT);
    cubeCam.position.set(info.center[0], 1.5, info.center[1]);
    scene.add(cubeCam);
    cubeCam.update(renderer, scene);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromCubemap(cubeRT.texture).texture;
    if (L.theme === "day") scene.traverse((o) => { if (o.material?.isMeshStandardMaterial) o.material.envMapIntensity = Math.min(o.material.envMapIntensity, .55); });
    pm.dispose();

    // 후처리: 앰비언트 오클루전(구석 그늘, PC) → 빛 번짐 → 감마 → FXAA
    const composer = new THREE.EffectComposer(renderer);
    let ssao = null, fxaa = null;
    if (!mobile && THREE.SSAOPass && !/noao/.test(location.search)) {
      ssao = new THREE.SSAOPass(scene, camera, 512, 512);
      ssao.kernelRadius = .45; ssao.minDistance = .02 / camera.far; ssao.maxDistance = .5 / camera.far;
      composer.addPass(ssao);
    } else composer.addPass(new THREE.RenderPass(scene, camera));
    composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(512, 512), L.theme === "day" ? .06 : .5, .5, .92));
    composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));
    if (THREE.FXAAShader) { fxaa = new THREE.ShaderPass(THREE.FXAAShader); composer.addPass(fxaa); }

    // 방 영역 · 서는 자리 (원본 도면 좌표)
    const off = suite.planOff || [0, 0];
    const ROOMS = suite.spaces.map((s) => [s.c, s.box[0] + off[0], s.box[1] + off[1], s.box[2] + off[0], s.box[3] + off[1]]);
    const VIEWS = suite.spots || {};

    const me = { x: 0, z: 0, yaw: 0, pitch: -.05, goal: null, glide: null };
    const keys = new Set();
    const R = .28, [bx0, by0, bx1, by1] = L.bounds;
    const blocked = (x, z) => x < X(bx0) + R || x > X(bx1) - R || z < Z(by0) + R || z > Z(by1) - R || colliders.some((c) => x > c[0] - R && x < c[2] + R && z > c[1] - R && z < c[3] + R);
    function step(dx, dz) {
      let moved = false;
      if (dx && !blocked(me.x + dx, me.z)) { me.x += dx; moved = true; }
      if (dz && !blocked(me.x, me.z + dz)) { me.z += dz; moved = true; }
      return moved;
    }
    function goto(code, instant) {
      const v = VIEWS[code];
      if (!v) return;
      const to = { x: X(v[0]), z: Z(v[1]) };
      const yaw = Math.atan2(-(X(v[2]) - to.x), -(Z(v[3]) - to.z));
      me.goal = null;
      if (instant) { me.x = to.x; me.z = to.z; me.yaw = yaw; me.pitch = -.05; return; }
      let dy = yaw - me.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      me.glide = { t0: performance.now(), from: { x: me.x, z: me.z, yaw: me.yaw, pitch: me.pitch }, to: { x: to.x, z: to.z, yaw: me.yaw + dy, pitch: -.05 }, dur: 1300 };
    }

    // 미니맵 · 방 이름 · 안내 · 조이스틱
    const mini = document.createElement("div");
    mini.className = "rw-mini";
    mini.innerHTML = `<img src="${suite.dir}plan.webp" alt="" draggable="false"><i class="rw-me"></i>`;
    const label = document.createElement("div"); label.className = "rw-room";
    const help = document.createElement("p"); help.className = "rw-help";
    help.textContent = mobile ? "드래그로 둘러보기 · 바닥을 탭하면 걸어가요 · 왼쪽 아래 스틱으로 이동" : "드래그로 둘러보기 · 바닥 클릭으로 걷기 · WASD / 방향키로 이동";
    const stick = document.createElement("div"); stick.className = "rw-stick"; stick.innerHTML = "<i></i>";
    container.append(mini, label, help, stick);
    const meDot = mini.querySelector(".rw-me");
    const [OX, OY] = L.origin;
    const toPlan = (x, z) => [((x * S + OX - off[0]) / suite.plan.w) * 100, ((z * S + OY - off[1]) / suite.plan.h) * 100];
    mini.addEventListener("click", (e) => {
      const r = mini.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * suite.plan.w + off[0], py = ((e.clientY - r.top) / r.height) * suite.plan.h + off[1];
      const room = ROOMS.find(([, x0, y0, x1, y1]) => px >= x0 && px <= x1 && py >= y0 && py <= y1);
      if (room) goto(room[0]);
    });

    const cvs = renderer.domElement, pts = new Map();
    let moved = 0;
    cvs.addEventListener("pointerdown", (e) => { cvs.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; me.glide = null; });
    cvs.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      const [px, py] = pts.get(e.pointerId), dx = e.clientX - px, dy = e.clientY - py;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      moved += Math.abs(dx) + Math.abs(dy);
      me.yaw += dx * .0045; me.pitch = Math.max(-1.1, Math.min(1, me.pitch + dy * .0035));
    });
    const ray = new THREE.Raycaster(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
    cvs.addEventListener("pointerup", (e) => {
      pts.delete(e.pointerId);
      if (moved > 6) return;
      const r = cvs.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      if (ray.ray.intersectPlane(floor, hit) && hit.distanceTo(camera.position) < 25) me.goal = { x: hit.x, z: hit.z };
    });
    cvs.addEventListener("pointercancel", (e) => pts.delete(e.pointerId));
    cvs.addEventListener("wheel", (e) => { e.preventDefault(); camera.fov = Math.max(35, Math.min(80, camera.fov + e.deltaY * .03)); camera.updateProjectionMatrix(); }, { passive: false });
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if (!["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) return;
      e.preventDefault(); e.stopPropagation();
      if (e.type === "keydown") keys.add(k); else keys.delete(k);
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    const joy = { x: 0, y: 0, id: null };
    stick.addEventListener("pointerdown", (e) => { stick.setPointerCapture(e.pointerId); joy.id = e.pointerId; me.goal = null; me.glide = null; });
    stick.addEventListener("pointermove", (e) => {
      if (joy.id !== e.pointerId) return;
      const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2);
      const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      joy.x = dx; joy.y = dy;
      stick.firstChild.style.transform = `translate(${dx * 26}px, ${dy * 26}px)`;
    });
    const joyEnd = () => { joy.id = null; joy.x = joy.y = 0; stick.firstChild.style.transform = ""; };
    stick.addEventListener("pointerup", joyEnd); stick.addEventListener("pointercancel", joyEnd);

    function resize() {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      if (fxaa) { const pr = renderer.getPixelRatio(); fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr)); }
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const ease = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    let last = performance.now(), raf = 0, curRoom = "";
    goto(VIEWS.A ? "A" : suite.spaces[0].c, true);
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (me.glide) {
        const g = me.glide, k = Math.min(1, (now - g.t0) / g.dur), e = ease(k);
        me.x = g.from.x + (g.to.x - g.from.x) * e; me.z = g.from.z + (g.to.z - g.from.z) * e;
        me.yaw = g.from.yaw + (g.to.yaw - g.from.yaw) * e; me.pitch = g.from.pitch + (g.to.pitch - g.from.pitch) * e;
        if (k >= 1) me.glide = null;
      }
      const sp = 2.4 * dt;
      const f = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - joy.y;
      const st = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0) + joy.x;
      if (keys.has("arrowleft")) me.yaw += 1.8 * dt;
      if (keys.has("arrowright")) me.yaw -= 1.8 * dt;
      if (f || st) {
        me.goal = null;
        const sn = Math.sin(me.yaw), cs = Math.cos(me.yaw);
        step((-sn * f + cs * st) * sp, (-cs * f - sn * st) * sp);
      } else if (me.goal) {
        const dx = me.goal.x - me.x, dz = me.goal.z - me.z, d = Math.hypot(dx, dz);
        if (d < .08 || !step((dx / d) * Math.min(sp, d), (dz / d) * Math.min(sp, d))) me.goal = null;
      }
      const bob = me.goal || f || st ? Math.sin(now * .012) * .02 : 0;
      camera.position.set(me.x, 1.6 + bob, me.z);
      camera.rotation.set(me.pitch, me.yaw, 0, "YXZ");
      composer.render();

      const [mx, my] = toPlan(me.x, me.z);
      meDot.style.left = `${mx}%`; meDot.style.top = `${my}%`;
      meDot.style.transform = `translate(-50%, -50%) rotate(${-me.yaw}rad)`;
      const px = me.x * S + OX, py = me.z * S + OY;
      const room = ROOMS.find(([, x0, y0, x1, y1]) => px >= x0 && px <= x1 && py >= y0 && py <= y1);
      const code = room ? room[0] : curRoom;
      if (code !== curRoom) {
        curRoom = code;
        const s = suite.spaces.find((x) => x.c === code);
        if (s) { label.innerHTML = `<b>${s.c[0]}</b>${App.esc(s.ko)}<small>${App.esc(s.en)}</small>`; label.classList.remove("in"); void label.offsetWidth; label.classList.add("in"); }
        onRoom?.(code);
      }
    }
    raf = requestAnimationFrame(frame);

    return {
      goto,
      destroy() {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener("keydown", onKey, true);
        window.removeEventListener("keyup", onKey, true);
        scene.traverse((o) => { o.geometry?.dispose(); });
        cubeRT.dispose();
        renderer.dispose();
        renderer.forceContextLoss?.();
        container.innerHTML = "";
      },
    };
  }
  App.Room3D = Object.assign(Room3D, { has: (m) => !!LAYOUTS[m] });
})();
