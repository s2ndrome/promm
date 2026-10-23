// S급 숙소 3D 워크스루: 도면 그대로 벽을 세우고 1인칭으로 걸어다님
// 드래그 = 둘러보기 · 바닥 클릭/탭 = 그 자리로 걷기 · WASD/방향키 · 모바일 조이스틱
(function () {
  const App = window.App;
  const H = 3; // 천장 높이 (m)
  const EYE = 1.6;

  // 도면 픽셀 → 미터 (원본 도면 50px = 1m, 건물 왼쪽 위 모서리가 0,0)
  const S = 50, OX = 68, OY = 362;
  const X = (x) => (x - OX) / S, Z = (y) => (y - OY) / S;
  // 미니맵(잘라낸 도면 plan.webp) 좌표
  const PLAN_OFF = [60, 255];

  // 방 영역 (원본 도면 픽셀) — 지금 어느 방에 있는지 표시할 때 씀
  const ROOMS = [
    ["D", 88, 382, 362, 715], ["E", 88, 725, 362, 945], ["F", 88, 955, 405, 1130], ["A", 412, 948, 595, 1130],
    ["B", 372, 382, 668, 948], ["G", 678, 382, 965, 606], ["C", 678, 606, 965, 900], ["H", 602, 900, 965, 1130], ["I", 68, 250, 985, 362],
  ];
  // 각 방 사진과 비슷한 자리·방향 [서는 곳 x, y, 바라보는 곳 x, y]
  const VIEWS = {
    A: [503, 1105, 503, 940], B: [430, 905, 575, 520], C: [640, 700, 905, 760], D: [335, 695, 130, 540], E: [230, 742, 220, 905],
    F: [255, 985, 120, 1080], G: [720, 590, 880, 430], H: [650, 985, 905, 1060], I: [610, 318, 180, 318],
  };

  let THREE, C;
  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.encoding = THREE.sRGBEncoding;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  }
  let seed = 3;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const between = (a, b) => a + rand() * (b - a);

  // ---------- 텍스처 ----------
  function marbleTex(base = "#1a1a1c", vein = "rgba(230,230,235,") {
    seed = 21;
    return canvasTex(1024, 1024, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(255,255,255,${rand() * .025})`; g.fillRect(rand() * w, rand() * h, 2, 2); }
      for (let i = 0; i < 26; i++) {
        g.strokeStyle = `${vein}${between(.05, .3)})`; g.lineWidth = between(.6, 2.4);
        g.beginPath();
        let x = rand() * w, y = rand() * h; g.moveTo(x, y);
        for (let k = 0; k < 8; k++) { const nx = x + between(-160, 160), ny = y + between(-160, 160); g.quadraticCurveTo(x + between(-80, 80), y + between(-80, 80), nx, ny); x = nx; y = ny; }
        g.stroke();
      }
      // 타일 줄눈
      g.strokeStyle = "rgba(0,0,0,.5)"; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
    });
  }
  function panelTex() {
    return canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = "#2c2a28"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(255,255,255,${rand() * .02})`; g.fillRect(rand() * w, rand() * h, 1, between(4, 30)); }
      g.fillStyle = "#1a1918"; g.fillRect(0, 0, 3, h); g.fillRect(w / 2, 0, 3, h);
    });
  }
  function woodTex() {
    seed = 8;
    return canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = "#3a2a20"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 140; i++) { g.strokeStyle = `rgba(${rand() < .5 ? "20,12,8" : "90,64,46"},${between(.15, .4)})`; g.lineWidth = between(.5, 2); g.beginPath(); const y = rand() * h; g.moveTo(0, y); g.bezierCurveTo(w * .3, y + between(-8, 8), w * .7, y + between(-8, 8), w, y + between(-6, 6)); g.stroke(); }
    });
  }
  function rugTex() {
    return canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "#4a4a4c"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { const v = 50 + rand() * 40; g.fillStyle = `rgb(${v},${v},${v + 2})`; g.fillRect(rand() * w, rand() * h, 1.5, 1.5); }
    });
  }
  function artTex() {
    seed = 41;
    return canvasTex(512, 768, (g, w, h) => {
      g.fillStyle = "#ece9e4"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        g.strokeStyle = rand() < .3 ? `rgba(170,10,20,${between(.4, .9)})` : `rgba(15,15,18,${between(.3, .9)})`;
        g.lineWidth = between(2, 26); g.lineCap = "round";
        g.beginPath(); const x = between(60, w - 60), y = between(80, h - 80); g.moveTo(x, y); g.lineTo(x + between(-120, 120), y + between(-90, 90)); g.stroke();
      }
    });
  }
  function screenTex() {
    seed = 77;
    return canvasTex(512, 288, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#1b2a8a"); gr.addColorStop(.5, "#a01a6a"); gr.addColorStop(1, "#2a9ad8");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { g.fillStyle = `hsla(${between(180, 340)},90%,${between(50, 80)}%,${between(.2, .7)})`; g.beginPath(); g.arc(rand() * w, rand() * h, between(6, 60), 0, 7); g.fill(); }
      g.fillStyle = "rgba(255,255,255,.8)"; g.font = "700 40px Arial"; g.fillText("VICTORY", 30, h - 40);
    });
  }
  // 창밖 야경: 아래로 깔린 도시 불빛 + 높은 빌딩 몇 개
  function skylineTex() {
    seed = 5;
    return canvasTex(4096, 1024, (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#02030a"); sky.addColorStop(.5, "#0a1226"); sky.addColorStop(.62, "#1a2236"); sky.addColorStop(1, "#05060a");
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      const horizon = h * .6;
      for (let layer = 0; layer < 3; layer++) {
        let x = 0;
        while (x < w) {
          const bw = between(30, 120) * (1 - layer * .2), tall = rand() < .08;
          const bh = tall ? between(200, 460) : between(30, 200) * (layer + 1) * .6;
          const top = horizon - bh + layer * 60;
          g.fillStyle = ["#06080d", "#090c13", "#0c1018"][layer]; g.fillRect(x, top, bw, h - top);
          for (let wy = top + 6; wy < h; wy += 9) for (let wx = x + 4; wx < x + bw - 4; wx += 7) {
            if (rand() < (layer === 2 ? .35 : .22)) { g.fillStyle = rand() < .7 ? `rgba(255,214,160,${between(.4, .95)})` : `rgba(200,225,255,${between(.4, .9)})`; g.fillRect(wx, wy, 3, 4); }
          }
          if (tall) { g.fillStyle = "#ff3030"; g.fillRect(x + bw / 2 - 2, top - 6, 4, 4); }
          x += bw + between(0, 12);
        }
      }
      const glow = g.createLinearGradient(0, horizon - 80, 0, horizon + 60); glow.addColorStop(0, "rgba(255,170,110,0)"); glow.addColorStop(1, "rgba(255,170,110,.12)");
      g.fillStyle = glow; g.fillRect(0, horizon - 80, w, 140);
    });
  }

  // ---------- 장면 ----------
  function build(scene, colliders, renderer) {
    const std = (o) => new THREE.MeshStandardMaterial(o);
    const LED = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.3, 1.5), toneMapped: false });
    const marble = marbleTex(); marble.repeat.set(1, 1);
    const M = {
      floor: std({ map: marble, roughness: .14, metalness: .25, envMapIntensity: 1.2 }),
      bathFloor: std({ map: marbleTex("#121214", "rgba(200,200,210,"), roughness: .2, metalness: .2 }),
      stone: std({ map: marbleTex("#2a2a2c", "rgba(160,160,165,"), roughness: .5, metalness: .1 }),
      wall: std({ map: panelTex(), roughness: .75, metalness: .05 }),
      ceil: std({ color: 0x141414, roughness: .9 }),
      black: std({ color: 0x0d0d0f, roughness: .35, metalness: .4 }),
      blackGloss: std({ color: 0x0a0a0b, roughness: .08, metalness: .6, envMapIntensity: 1.5 }),
      darkMarble: std({ map: marbleTex("#0f0f10", "rgba(220,220,225,"), roughness: .12, metalness: .3 }),
      wood: std({ map: woodTex(), roughness: .5 }),
      fabric: std({ color: 0x242427, roughness: .95 }),
      fabricDark: std({ color: 0x18181a, roughness: .95 }),
      linen: std({ color: 0x8a8a8e, roughness: .9 }),
      white: std({ color: 0xe9e7e2, roughness: .7 }),
      plush: std({ color: 0xf4f1ea, roughness: 1 }),
      cream: std({ color: 0xf1dfc1, roughness: 1 }),
      rug: std({ map: rugTex(), roughness: 1 }),
      glass: std({ color: 0x8090a0, roughness: .02, metalness: .9, transparent: true, opacity: .14, envMapIntensity: 1.5 }),
      gold: std({ color: 0xd8a948, roughness: .25, metalness: 1 }),
      silver: std({ color: 0xcfd3da, roughness: .2, metalness: 1 }),
      mirror: std({ color: 0x6a6660, roughness: .05, metalness: 1, envMapIntensity: .6 }),
      lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2, 1.3), toneMapped: false }),
      screenOff: std({ color: 0x050506, roughness: .05, metalness: .5 }),
      screen: new THREE.MeshBasicMaterial({ map: screenTex(), toneMapped: false }),
      leaf: std({ color: 0x2e4a26, roughness: .8 }),
      pink: std({ color: 0xe8b8c4, roughness: .9 }),
      shirt: std({ color: 0x2a2a2e, roughness: .9 }),
    };

    // 바닥 상자 (도면 픽셀 x0,y0,x1,y1 / 높이 h / 바닥에서 y 만큼 띄움)
    const fb = (x0, y0, x1, y1, h, y, mat, solid = false) => {
      const w = (x1 - x0) / S, d = (y1 - y0) / S;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(X((x0 + x1) / 2), y + h / 2, Z((y0 + y1) / 2));
      scene.add(m);
      if (solid) colliders.push([X(x0), Z(y0), X(x1), Z(y1)]);
      return m;
    };
    const at = (geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; };
    const plane = (x0, y0, x1, y1, y, mat, down = false) => {
      const g = new THREE.PlaneGeometry((x1 - x0) / S, (y1 - y0) / S);
      const m = new THREE.Mesh(g, mat);
      m.rotation.x = down ? Math.PI / 2 : -Math.PI / 2;
      m.position.set(X((x0 + x1) / 2), y, Z((y0 + y1) / 2));
      scene.add(m);
      return m;
    };
    const tile = (mat, w, d, size = 1.2) => { const m = mat.clone(); m.map = mat.map.clone(); m.map.needsUpdate = true; m.map.repeat.set(w / size, d / size); return m; };

    // 바닥 · 천장
    plane(68, 362, 985, 1150, 0, tile(M.floor, 18.3, 15.8, 1.2));
    plane(88, 955, 405, 1130, .002, tile(M.bathFloor, 6.3, 3.5, 1));
    plane(88, 270, 965, 362, 0, tile(M.stone, 17.5, 1.9, 1));
    plane(68, 362, 985, 1150, H, M.ceil, true);

    // 벽
    const walls = [
      [68, 362, 110, 382], [330, 362, 395, 382], [640, 362, 710, 382], [960, 362, 985, 382],
      [68, 362, 88, 1150], [965, 362, 985, 1150], [68, 1130, 505, 1150], [570, 1130, 985, 1150],
      [362, 382, 372, 440], [362, 490, 372, 715], [88, 715, 200, 725], [250, 715, 372, 725], [362, 725, 372, 945],
      [88, 945, 230, 955], [270, 945, 412, 955], [305, 1000, 312, 1130], [405, 955, 412, 1130], [595, 948, 602, 1130],
      [602, 940, 700, 948], [745, 940, 840, 948], [832, 892, 840, 948], [832, 892, 965, 900],
      [668, 382, 678, 440], [668, 490, 678, 612], [678, 606, 905, 615],
    ];
    for (const w of walls) fb(...w, H, 0, M.wall, true);
    // 문 위 상인방
    for (const [x0, y0, x1, y1] of [[362, 440, 372, 490], [200, 715, 250, 725], [230, 945, 270, 955], [305, 955, 312, 1000], [700, 940, 745, 948], [668, 440, 678, 490]]) fb(x0, y0, x1, y1, .8, H - .8, M.wall);
    fb(505, 1136, 570, 1146, 2.4, 0, M.wood, true); // 현관문
    fb(527, 1128, 531, 1136, .3, 1.05, M.silver);

    // 큰 통창 (거실 가운데는 발코니로 열린 슬라이딩 도어)
    for (const [x0, x1] of [[110, 330], [395, 470], [560, 640], [710, 960]]) {
      fb(x0, 368, x1, 376, H, 0, M.glass, true);
      for (let x = x0; x <= x1; x += 55) fb(x - 1.5, 366, x + 1.5, 378, H, 0, M.black);
    }
    fb(470, 368, 560, 376, .06, H - .06, M.black);
    // 발코니 유리 난간
    fb(88, 268, 965, 272, 1.1, 0, M.glass, true); fb(88, 266, 965, 270, .05, 1.1, M.silver);
    fb(84, 270, 90, 362, 1.1, 0, M.glass, true); fb(963, 270, 969, 362, 1.1, 0, M.glass, true);

    // 천장 간접조명 (방마다 테두리) + 바닥 쪽 은은한 띠
    for (const [, x0, y0, x1, y1] of ROOMS.slice(0, 8)) {
      const i = 14;
      fb(x0 + i, y0 + i, x1 - i, y0 + i + 2, .03, H - .04, LED); fb(x0 + i, y1 - i - 2, x1 - i, y1 - i, .03, H - .04, LED);
      fb(x0 + i, y0 + i, x0 + i + 2, y1 - i, .03, H - .04, LED); fb(x1 - i - 2, y0 + i, x1 - i, y1 - i, .03, H - .04, LED);
      fb(x0 + i + 4, y0 + i + 4, x1 - i - 4, y1 - i - 4, .08, H - .12, M.ceil); // 떠 있는 천장판
    }
    // 레일 조명
    for (const [x0, y0, x1] of [[420, 470, 640], [420, 800, 640], [470, 980, 540], [700, 680, 940]]) {
      fb(x0, y0, x1, y0 + 4, .05, H - .2, M.black);
      for (let x = x0 + 20; x < x1; x += 45) { at(new THREE.CylinderGeometry(.05, .06, .16, 12), M.black, X(x), H - .3, Z(y0 + 2)); at(new THREE.CircleGeometry(.04, 12), M.lamp, X(x), H - .385, Z(y0 + 2)).rotation.x = Math.PI / 2; }
    }

    // 조명
    scene.add(new THREE.HemisphereLight(0x8a7a6a, 0x101012, .35));
    for (const [x, y, k] of [[520, 660, 1.6], [225, 550, 1.2], [820, 750, 1.2], [820, 500, 1.1], [225, 835, 1.2], [200, 1040, 1], [780, 1040, 1], [503, 1040, .9]]) {
      const l = new THREE.PointLight(0xffc996, k, 8.5, 2); l.position.set(X(x), H - .4, Z(y)); scene.add(l);
    }
    const moon = new THREE.DirectionalLight(0x8fa2c8, .35); moon.position.set(-5, 8, -10); scene.add(moon);

    // 창밖 야경
    const sky = new THREE.Mesh(new THREE.CylinderGeometry(140, 140, 160, 64, 1, true), new THREE.MeshBasicMaterial({ map: skylineTex(), side: THREE.BackSide, fog: false, color: new THREE.Color(1.15, 1.15, 1.2), toneMapped: false }));
    sky.material.map.repeat.set(2, 1);
    sky.position.set(9, -40, 8);
    scene.add(sky);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(140, 48), new THREE.MeshBasicMaterial({ color: 0x030305 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(9, -119, 8); scene.add(ground);

    // ── A 현관 · 복도: 큰 추상화, 신발장, 거울 수납장
    const art = at(new THREE.PlaneGeometry(1.4, 2.1), new THREE.MeshStandardMaterial({ map: artTex(), roughness: .8 }), X(413), 1.55, Z(1030), Math.PI / 2);
    art.position.x += .02;
    fb(414, 965, 450, 1100, .55, 0, M.black, true);
    fb(448, 965, 451, 1100, .02, .02, LED);
    fb(560, 960, 594, 1110, 2.2, 0, M.mirror, true);
    at(new THREE.SphereGeometry(.16, 24, 16), M.silver, X(432), .72, Z(1020));

    // ── B 거실: TV 벽, ㄱ자 소파, 대리석 테이블, 러그, 인형들
    fb(372, 480, 392, 790, H, 0, M.black, true);
    fb(392, 520, 396, 740, 1, 1.1, M.screenOff);
    fb(392, 760, 430, 790, .3, 0, M.black);
    fb(392, 500, 430, 770, .35, 0, M.black); fb(429, 500, 432, 770, .02, .02, LED);
    for (const y of [.8, 1.5, 2.2]) { fb(372, 795, 395, 940, .03, y, M.black); fb(393, 797, 395, 938, .015, y - .016, LED); }
    plane(415, 525, 600, 840, .01, M.rug);
    fb(540, 525, 585, 780, .42, 0, M.fabric, true); fb(570, 525, 585, 780, .4, .42, M.fabric); // 소파 본체 + 등받이
    fb(455, 525, 585, 565, .42, 0, M.fabric, true); fb(455, 525, 585, 540, .4, .42, M.fabric);
    fb(500, 705, 545, 780, .42, 0, M.fabric, true);
    for (let k = 0; k < 4; k++) fb(545, 560 + k * 55, 568, 610 + k * 55, .14, .42, M.fabricDark);
    fb(455, 600, 510, 715, .36, 0, M.darkMarble, true);
    fb(415, 485, 455, 520, .45, 0, M.fabricDark, true);
    fb(545, 790, 575, 820, .5, 0, M.black);
    at(new THREE.CylinderGeometry(.18, .2, .04, 24), M.lamp, X(560), .52, Z(805));
    const plush = (x, z, y, s, ry) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(.2, 20, 14), rand() < .25 ? M.cream : M.plush); body.scale.set(1, .85, .9); g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.15, 20, 14), body.material); head.position.set(0, .2, .02); g.add(head);
      for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), body.material); e.position.set(sx * .1, .32, 0); g.add(e); }
      const nose = new THREE.Mesh(new THREE.SphereGeometry(.02, 8, 6), M.black); nose.position.set(0, .19, .16); g.add(nose);
      g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s); scene.add(g);
    };
    seed = 99;
    for (let k = 0; k < 11; k++) plush(X(between(510, 565)), Z(between(640, 770)), .62 + (k % 3) * .12, between(.8, 1.5), between(-2.4, -.8));

    // ── C 주방 · 다이닝: 대리석 아일랜드, 스툴, 벽면 주방, 식탁
    fb(735, 672, 790, 900, .92, 0, M.darkMarble, true);
    fb(733, 670, 792, 902, .05, .92, M.darkMarble);
    for (const y of [710, 760, 810, 860]) { at(new THREE.CylinderGeometry(.2, .2, .06, 20), M.fabricDark, X(718), .75, Z(y)); at(new THREE.CylinderGeometry(.02, .02, .75, 8), M.black, X(718), .37, Z(y)); }
    fb(920, 650, 965, 892, .92, 0, M.black, true); fb(920, 650, 965, 892, .04, .92, M.darkMarble);
    fb(840, 860, 920, 892, .92, 0, M.black, true);
    fb(950, 650, 965, 892, .9, 1.45, M.black); fb(948, 650, 950, 892, .03, 1.42, LED);
    fb(915, 615, 965, 650, 2.4, 0, M.black, true);
    fb(690, 640, 728, 660, .75, 0, M.wood);

    // ── D 마스터 침실: 큰 침대, 협탁·스탠드, 라운지 체어, 강아지 쿠션
    fb(88, 470, 100, 660, 1.3, 0, M.fabricDark, true);
    fb(100, 490, 215, 640, .35, 0, M.black, true);
    fb(102, 492, 213, 638, .22, .35, M.linen);
    fb(140, 492, 213, 638, .06, .57, M.fabricDark);
    for (const y of [510, 575]) fb(104, y, 130, y + 55, .14, .57, M.white);
    for (const y of [460, 645]) { fb(90, y, 118, y + 26, .5, 0, M.black, true); at(new THREE.CylinderGeometry(.09, .12, .22, 16), M.lamp, X(104), .72, Z(y + 13)); }
    const chair = fb(120, 395, 180, 450, .4, 0, M.fabricDark, true); chair.rotation.y = .6;
    plane(150, 485, 255, 655, .01, M.rug);
    const dogBed = at(new THREE.TorusGeometry(.32, .12, 12, 24), M.fabric, X(215), .12, Z(690)); dogBed.rotation.x = Math.PI / 2;
    plush(X(215), Z(690), .2, 1.1, 2);
    fb(335, 505, 360, 630, .7, 0, M.black, true);

    // ── E 드레스룸: 양쪽 옷장(옷걸이·신발장), 가운데 아일랜드, 전구 거울 화장대
    for (const [x0, x1, pink] of [[88, 130, false], [322, 362, true]]) {
      fb(x0, 730, x1, 940, H - .3, 0, M.black, true);
      for (let y = 740; y < 935; y += 9) fb(x0 + 6, y, x1 - 6, y + 5, .9, 1.25, pink && y > 830 ? M.pink : (y / 9) % 3 < 1 ? M.white : M.shirt);
      const fx = x0 === 88 ? x1 - 3 : x0 + 1;
      for (const hy of [.25, .55, .85]) { fb(x0 + 4, 735, x1 - 4, 938, .03, hy, M.black); fb(fx, 737, fx + 2, 936, .015, hy - .016, LED); for (let y = 745; y < 935; y += 22) fb(x0 + 10, y, x1 - 10, y + 12, .1, hy + .04, M.white); }
    }
    fb(195, 790, 270, 880, .9, 0, M.black, true); fb(193, 788, 272, 882, .04, .9, M.darkMarble);
    fb(132, 830, 140, 890, 1.1, 1, M.mirror);
    for (let k = 0; k < 10; k++) at(new THREE.SphereGeometry(.035, 10, 8), M.lamp, X(142), 1 + (k % 5) * .27, Z(k < 5 ? 828 : 892));
    fb(140, 835, 175, 885, .75, 0, M.wood, true);

    // ── F 마스터 욕실: 검은 욕조, 이중 세면대, 거울, 유리 샤워부스
    const tubG = new THREE.LatheGeometry([[0, .05], [.52, .05], [.62, .3], [.66, .58], [.6, .6], [.52, .35], [0, .3]].map(([r, y]) => new THREE.Vector2(r, y)), 48);
    const tub = at(tubG, M.blackGloss, X(125), 0, Z(1030)); tub.scale.set(.85, 1, 1.75);
    colliders.push([X(98), Z(970), X(152), Z(1090)]);
    fb(175, 1080, 295, 1125, .85, 0, M.black, true); fb(175, 1080, 295, 1125, .04, .85, M.darkMarble);
    fb(175, 1124, 295, 1128, .03, .1, LED);
    for (const x of [205, 265]) at(new THREE.CylinderGeometry(.18, .12, .1, 24), M.blackGloss, X(x), .92, Z(1102));
    fb(175, 1126, 295, 1130, 1.1, 1.3, M.mirror);
    fb(314, 1000, 318, 1128, 2.2, 0, M.glass, true);
    at(new THREE.CylinderGeometry(.12, .12, .02, 24), M.silver, X(360), 2.3, Z(1080));

    // ── G 미디어룸 · 트로피룸: 트로피 진열장, 모니터 책상, 빈백
    fb(905, 385, 965, 605, H - .2, 0, M.black, true);
    for (const hy of [.5, 1, 1.5, 2, 2.5]) {
      fb(903, 390, 907, 600, .02, hy - .02, LED);
      for (let y = 400; y < 595; y += 26) {
        const g = rand() < .7 ? M.gold : M.silver;
        at(new THREE.CylinderGeometry(.07, .03, .18, 16), g, X(893), hy + .2, Z(y));
        at(new THREE.CylinderGeometry(.04, .06, .06, 12), M.black, X(893), hy + .03, Z(y));
      }
    }
    fb(735, 440, 860, 470, .75, 0, M.black, true);
    for (const [x, w] of [[760, 30], [797, 34], [836, 30]]) { const s = fb(x - w / 2, 425, x + w / 2, 427, .38, 1, M.screen); s.rotation.y = (x - 797) * -.006; }
    fb(760, 386, 835, 389, .85, 1.5, M.screen);
    at(new THREE.BoxGeometry(.55, .9, .55), M.fabricDark, X(797), .45, Z(495));
    for (const x of [760, 830]) at(new THREE.SphereGeometry(.42, 20, 14), M.fabricDark, X(x), .25, Z(565)).scale.y = .6;
    colliders.push([X(735), Z(540), X(855), Z(590)]);

    // ── H 게스트룸 · 지수의 서재: 침대, 흰 책상, 스탠드, 책장
    fb(950, 980, 963, 1100, 1.1, 0, M.fabricDark, true);
    fb(840, 980, 950, 1100, .45, 0, M.linen, true);
    fb(840, 982, 900, 1098, .08, .45, M.fabric);
    fb(940, 990, 950, 1090, .12, .45, M.white);
    fb(715, 1065, 790, 1105, .75, 0, M.white, true);
    at(new THREE.CylinderGeometry(.01, .01, .5, 6), M.black, X(780), 1, Z(1080)); at(new THREE.ConeGeometry(.1, .12, 16, 1, true), M.black, X(775), 1.25, Z(1080));
    at(new THREE.CircleGeometry(.07, 12), M.lamp, X(775), 1.19, Z(1080)).rotation.x = Math.PI / 2;
    fb(735, 1040, 765, 1060, .45, 0, M.fabricDark);
    fb(605, 985, 640, 1105, 2.2, 0, M.black, true);
    for (const hy of [.5, 1, 1.5, 2]) fb(640, 990, 642, 1100, .02, hy, LED);
    fb(845, 905, 925, 940, 2.4, 0, M.black, true);
    plane(800, 970, 840, 1110, .01, M.rug);

    // ── I 발코니: 야외 소파, 테이블, 화분과 나무, 바닥 조명
    fb(145, 300, 285, 345, .4, 0, M.fabric, true); fb(145, 300, 285, 312, .35, .4, M.fabric);
    fb(195, 315, 255, 340, .3, 0, M.darkMarble, true);
    for (const x of [780, 830, 880, 930]) {
      fb(x - 18, 325, x + 18, 358, .5, 0, M.black, true);
      at(new THREE.CylinderGeometry(.04, .06, 1.2, 8), M.wood, X(x), 1.05, Z(342));
      at(new THREE.IcosahedronGeometry(.55, 1), M.leaf, X(x), 1.8, Z(342));
      at(new THREE.CircleGeometry(.08, 12), M.lamp, X(x), .51, Z(330)).rotation.x = -Math.PI / 2;
      const up = new THREE.PointLight(0xffd8a0, .5, 3, 2); up.position.set(X(x), .7, Z(330)); scene.add(up);
    }
  }

  // ---------- 화면 ----------
  App.Room3D = async function (container, suite, onRoom) {
    THREE = await App.loadThree();
    const mobile = window.innerWidth < 800;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020306);
    const camera = new THREE.PerspectiveCamera(mobile ? 68 : 62, 1, .05, 400);
    const colliders = [];

    // 반사용 환경 (어두운 방 + 따뜻한 조명 몇 줄)
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(20, 6, 20), new THREE.MeshBasicMaterial({ color: 0x0b0b0c, side: THREE.BackSide })));
    for (const [x, z, ry] of [[0, -9.9, 0], [9.9, 0, Math.PI / 2], [-6, 9.9, 0]]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(14, .25), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 1.9, 1.3), side: THREE.DoubleSide }));
      p.position.set(x, 2.8, z); p.rotation.y = ry; env.add(p);
    }
    const win = new THREE.Mesh(new THREE.PlaneGeometry(16, 3), new THREE.MeshBasicMaterial({ color: 0x0c0e14, side: THREE.DoubleSide })); win.position.set(0, 1.5, -9.8); env.add(win);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, .04).texture;
    pm.dispose();

    build(scene, colliders, renderer);

    const composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(512, 512), .55, .5, .9));
    composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));

    // 플레이어
    const me = { x: 0, z: 0, yaw: 0, pitch: -.05, goal: null, glide: null };
    const keys = new Set();
    const R = .28;
    const blocked = (x, z) => x < X(70) + R || x > X(983) - R || z < Z(272) + R || z > Z(1148) - R || colliders.some((c) => x > c[0] - R && x < c[2] + R && z > c[1] - R && z < c[3] + R);
    function step(dx, dz) {
      let moved = false;
      if (dx && !blocked(me.x + dx, me.z)) { me.x += dx; moved = true; }
      if (dz && !blocked(me.x, me.z + dz)) { me.z += dz; moved = true; }
      return moved;
    }
    const lookAt = (tx, tz) => Math.atan2(-(tx - me.x), -(tz - me.z));
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

    // 미니맵
    const mini = document.createElement("div");
    mini.className = "rw-mini";
    mini.innerHTML = `<img src="${suite.dir}plan.webp" alt="" draggable="false"><i class="rw-me"></i>`;
    const label = document.createElement("div");
    label.className = "rw-room";
    const help = document.createElement("p");
    help.className = "rw-help";
    help.textContent = mobile ? "드래그로 둘러보기 · 바닥을 탭하면 걸어가요 · 왼쪽 아래 스틱으로 이동" : "드래그로 둘러보기 · 바닥 클릭으로 걷기 · WASD / 방향키로 이동";
    const stick = document.createElement("div");
    stick.className = "rw-stick";
    stick.innerHTML = "<i></i>";
    container.append(mini, label, help, stick);
    const meDot = mini.querySelector(".rw-me");
    const toPlan = (x, z) => [((x * S + OX - PLAN_OFF[0]) / suite.plan.w) * 100, ((z * S + OY - PLAN_OFF[1]) / suite.plan.h) * 100];
    mini.addEventListener("click", (e) => {
      const r = mini.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * suite.plan.w + PLAN_OFF[0], py = ((e.clientY - r.top) / r.height) * suite.plan.h + PLAN_OFF[1];
      const room = ROOMS.find(([, x0, y0, x1, y1]) => px >= x0 && px <= x1 && py >= y0 && py <= y1);
      if (room) goto(room[0]);
    });

    // 조작: 드래그로 둘러보기, 짧게 누르면 그 바닥으로 걷기
    const cv = renderer.domElement;
    const pts = new Map();
    let moved = 0;
    cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; me.glide = null; });
    cv.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      const [px, py] = pts.get(e.pointerId), dx = e.clientX - px, dy = e.clientY - py;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      moved += Math.abs(dx) + Math.abs(dy);
      me.yaw += dx * .0045; me.pitch = Math.max(-1.1, Math.min(1, me.pitch + dy * .0035));
    });
    const ray = new THREE.Raycaster(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
    cv.addEventListener("pointerup", (e) => {
      pts.delete(e.pointerId);
      if (moved > 6) return;
      const r = cv.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      if (ray.ray.intersectPlane(floor, hit) && hit.distanceTo(camera.position) < 25) me.goal = { x: hit.x, z: hit.z };
    });
    cv.addEventListener("pointercancel", (e) => pts.delete(e.pointerId));
    cv.addEventListener("wheel", (e) => { e.preventDefault(); camera.fov = Math.max(35, Math.min(80, camera.fov + e.deltaY * .03)); camera.updateProjectionMatrix(); }, { passive: false });
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if (!["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) return;
      e.preventDefault(); e.stopPropagation();
      if (e.type === "keydown") keys.add(k); else keys.delete(k);
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    // 모바일 조이스틱
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
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const ease = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    let last = performance.now(), raf = 0, curRoom = "";
    goto("A", true);
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
      let f = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - joy.y;
      let st = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0) + joy.x;
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
      const bob = me.goal || f || st ? Math.sin(now * .012) * .025 : 0;
      camera.position.set(me.x, EYE + bob, me.z);
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
        if (s) { label.innerHTML = `<b>${s.c}</b>${App.esc(s.ko)}<small>${App.esc(s.en)}</small>`; label.classList.remove("in"); void label.offsetWidth; label.classList.add("in"); }
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
        renderer.dispose();
        renderer.forceContextLoss?.();
        container.innerHTML = "";
      },
    };
  };
})();
