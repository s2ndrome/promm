// S급 숙소 로드뷰: 방 사진을 둥글게 펼쳐서 둘러보고, 바닥 화살표를 누르면 다음 방으로 걸어 들어감
(function () {
  const App = window.App;
  const R = 10;          // 사진을 감는 원통 반지름
  const VFOV = 58;       // 사진 한 장의 세로 시야각
  // 방마다 사진 속 이동 화살표 [가는 방, 사진 가로 위치 0~1, 세로 위치 0~1]
  const LINKS = {
    A: [["B", .72, .68]],
    B: [["A", .2, .72], ["D", .07, .6], ["I", .57, .54], ["G", .84, .5], ["C", .95, .62]],
    C: [["B", .12, .7], ["G", .24, .56], ["H", .88, .68]],
    D: [["I", .1, .56], ["B", .78, .6], ["E", .93, .66]],
    E: [["D", .12, .68], ["F", .88, .68]],
    F: [["E", .08, .68]],
    G: [["B", .9, .68], ["C", .62, .7]],
    H: [["B", .08, .7], ["C", .32, .66]],
    I: [["B", .88, .6], ["D", .14, .6]],
  };
  // 미니맵에서 서 있는 자리와 사진이 바라보는 방향 (원본 도면 픽셀, room3d 와 같음)
  const SPOTS = {
    A: [503, 1105, 503, 940], B: [430, 905, 575, 520], C: [640, 700, 905, 760], D: [335, 695, 130, 540], E: [230, 742, 220, 905],
    F: [255, 985, 120, 1080], G: [720, 590, 880, 430], H: [650, 985, 905, 1060], I: [610, 318, 180, 318],
  };
  const PLAN_OFF = [60, 255];

  App.RoadView = async function (container, suite, onRoom) {
    const THREE = await App.loadThree();
    const mobile = window.innerWidth < 800;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020203);
    const baseFov = mobile ? 62 : 52;
    const camera = new THREE.PerspectiveCamera(baseFov, 1, .1, 100);
    const loader = new THREE.TextureLoader();
    const texCache = {};
    const load = (code) => (texCache[code] ||= new Promise((ok) => loader.load(`${suite.dir}${code.toLowerCase()}.webp`, (t) => {
      t.encoding = THREE.sRGBEncoding;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      t.minFilter = THREE.LinearMipmapLinearFilter;
      ok(t);
    })));

    // 가장자리를 부드럽게 흐리는 마스크
    const fadeC = document.createElement("canvas");
    fadeC.width = 256; fadeC.height = 256;
    {
      const g = fadeC.getContext("2d"), img = g.createImageData(256, 256);
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
        const e = (t, w) => Math.min(1, Math.min(t, 1 - t) / w);
        const v = e(x / 255, .07) * e(y / 255, .06) * 255, i = (y * 256 + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }
    const fade = new THREE.CanvasTexture(fadeC);

    // 흐린 배경 (사진 밖으로 넘어가도 분위기가 이어지게)
    function blurTex(t) {
      const c = document.createElement("canvas");
      c.width = 256; c.height = 128;
      const g = c.getContext("2d");
      g.filter = "blur(18px) brightness(.55)";
      g.drawImage(t.image, -30, -30, 316, 188);
      const bt = new THREE.CanvasTexture(c);
      bt.encoding = THREE.sRGBEncoding;
      return bt;
    }

    let cur = null, old = null, code = "";
    const view = { yaw: 0, pitch: 0, vy: 0, vp: 0, drag: false, span: 1.6, h: 10, idle: 0 };
    function makePano(t) {
      const aspect = t.image.width / t.image.height;
      const h = 2 * R * Math.tan((VFOV * Math.PI) / 360);
      const span = (aspect * h) / R; // 원통에 감기는 각도
      const g = new THREE.CylinderGeometry(R, R, h, 96, 1, true, Math.PI - span / 2, span);
      const mat = new THREE.MeshBasicMaterial({ map: t, alphaMap: fade, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false });
      t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; // 안쪽에서 보면 좌우가 뒤집히니 바로잡음
      const pano = new THREE.Mesh(g, mat);
      const bg = new THREE.Mesh(new THREE.SphereGeometry(R * 1.5, 48, 24), new THREE.MeshBasicMaterial({ map: blurTex(t), side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false }));
      bg.rotation.y = Math.PI;
      pano.renderOrder = 1; // 흐린 배경 위에 사진
      const grp = new THREE.Group();
      grp.add(bg, pano);
      grp.userData = { span, h, pano, bg };
      scene.add(grp);
      return grp;
    }
    const setOpacity = (grp, o) => { grp.userData.pano.material.opacity = o; grp.userData.bg.material.opacity = o; };
    const dispose = (grp) => { scene.remove(grp); grp.traverse((m) => { m.geometry?.dispose(); if (m.material) { if (m === grp.userData.bg) m.material.map.dispose(); m.material.dispose(); } }); };

    // 화면 위 요소: 이동 화살표 · 방 이름 · 미니맵 · 썸네일 · 안내
    const hud = document.createElement("div");
    hud.className = "rv-hud";
    hud.innerHTML = `<div class="rv-hots"></div>
      <div class="rv-room"></div>
      <div class="rv-mini"><img src="${suite.dir}plan.webp" alt="" draggable="false"><i class="rv-cone"></i><i class="rv-dot"></i></div>
      <div class="rv-thumbs">${suite.spaces.map((s) => `<button type="button" data-rv="${s.c}"><img src="${suite.dir}${s.c.toLowerCase()}.webp" alt="" loading="lazy"><span><b>${s.c}</b>${App.esc(s.ko)}</span></button>`).join("")}</div>
      <p class="rv-help">${mobile ? "드래그로 둘러보기 · 화살표를 누르면 이동" : "드래그로 둘러보기 · 휠로 확대 · 화살표를 누르면 다음 방으로"}</p>
      <div class="rv-flash"></div>`;
    container.appendChild(hud);
    const hots = hud.querySelector(".rv-hots"), roomEl = hud.querySelector(".rv-room"), mini = hud.querySelector(".rv-mini");
    const dot = hud.querySelector(".rv-dot"), cone = hud.querySelector(".rv-cone"), flash = hud.querySelector(".rv-flash");
    let hotEls = [];
    hud.addEventListener("click", (e) => {
      const b = e.target.closest("[data-rv]");
      if (b) goto(b.dataset.rv, b.classList.contains("rv-hot") ? +b.dataset.yaw : null, b.classList.contains("rv-hot") ? +b.dataset.pitch : null);
    });
    mini.addEventListener("click", (e) => {
      const r = mini.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * suite.plan.w + PLAN_OFF[0], py = ((e.clientY - r.top) / r.height) * suite.plan.h + PLAN_OFF[1];
      let best = null, bd = 1e9;
      for (const [c, [x, y]] of Object.entries(SPOTS)) { const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = c; } }
      if (best) goto(best);
    });

    // 사진 속 위치(u, v) → 둘러보는 각도
    const angleOf = (u, v, grp) => ({ yaw: (.5 - u) * grp.userData.span, pitch: Math.atan(((.5 - v) * grp.userData.h) / R) });
    function placeHots() {
      hots.innerHTML = "";
      hotEls = (LINKS[code] || []).map(([to, u, v]) => {
        const s = suite.spaces.find((x) => x.c === to);
        const a = angleOf(u, v, cur);
        const b = document.createElement("button");
        b.type = "button"; b.className = "rv-hot"; b.dataset.rv = to; b.dataset.yaw = a.yaw; b.dataset.pitch = a.pitch;
        b.innerHTML = `<i></i><span>${App.esc(s?.ko || to)}</span>`;
        hots.appendChild(b);
        return { b, p: new THREE.Vector3(-Math.sin(a.yaw) * R * .98, Math.tan(a.pitch) * R * .98, -Math.cos(a.yaw) * R * .98) };
      });
    }

    // 이동: 화살표 방향으로 확대하며 걸어 들어가는 느낌 → 다음 사진이 살짝 당겨진 상태에서 풀리며 나타남
    let busy = false;
    async function goto(to, yaw = null, pitch = null, instant = false) {
      if (busy || (to === code && !instant)) return;
      busy = true;
      const t = await load(to);
      if (!instant && cur) {
        if (yaw != null) await tween(320 + Math.abs(yaw - view.yaw) * 200, (e, s) => { view.yaw = s.yaw + (yaw - s.yaw) * e; view.pitch = s.pitch + (pitch - s.pitch) * e; }, { yaw: view.yaw, pitch: view.pitch });
        flash.classList.add("on");
        await tween(520, (e) => { camera.fov = baseFov - (baseFov - 22) * e * e; camera.updateProjectionMatrix(); setOpacity(cur, 1 - e * .6); });
      }
      old && dispose(old);
      old = cur;
      cur = makePano(t);
      code = to;
      view.yaw = 0; view.pitch = 0; view.span = cur.userData.span; view.h = cur.userData.h;
      placeHots();
      if (old) dispose(old), (old = null);
      roomEl.innerHTML = (() => { const s = suite.spaces.find((x) => x.c === to); return s ? `<b>${s.c}</b>${App.esc(s.ko)}<small>${App.esc(s.en)}</small>` : ""; })();
      roomEl.classList.remove("in"); void roomEl.offsetWidth; roomEl.classList.add("in");
      hud.querySelectorAll(".rv-thumbs [data-rv]").forEach((b) => b.classList.toggle("on", b.dataset.rv === to));
      hud.querySelector(`.rv-thumbs [data-rv="${to}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      onRoom?.(to);
      flash.classList.remove("on");
      camera.fov = instant ? baseFov : 34; camera.updateProjectionMatrix();
      await tween(instant ? 600 : 900, (e) => { setOpacity(cur, e); if (!instant) { camera.fov = 34 + (baseFov - 34) * e; camera.updateProjectionMatrix(); } });
      busy = false;
      // 옆 방 사진은 미리 받아둠
      (LINKS[to] || []).forEach(([n]) => load(n));
    }
    function tween(ms, fn, start) {
      return new Promise((ok) => {
        const t0 = performance.now();
        const tick = (now) => {
          const k = Math.min(1, (now - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          fn(e, start);
          k < 1 ? requestAnimationFrame(tick) : ok();
        };
        requestAnimationFrame(tick);
      });
    }

    // 드래그 · 휠 · 핀치
    const cv = renderer.domElement, pts = new Map();
    let pinch = 0;
    const deg = (fov) => (fov * Math.PI) / 180;
    cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); view.drag = true; view.vy = view.vp = 0; });
    cv.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      const [px, py] = pts.get(e.pointerId), dx = e.clientX - px, dy = e.clientY - py;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      view.idle = performance.now();
      if (pts.size === 1) {
        const k = deg(camera.fov) / cv.clientHeight; // 화면을 잡고 끄는 느낌 그대로
        view.vy = dx * k; view.vp = dy * k;
        view.yaw += view.vy; view.pitch += view.vp;
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch) zoom((pinch - d) * .08);
        pinch = d;
      }
    });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; if (!pts.size) view.drag = false; };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    const zoom = (d) => { if (busy) return; camera.fov = Math.max(26, Math.min(baseFov + 6, camera.fov + d)); camera.updateProjectionMatrix(); };
    cv.addEventListener("wheel", (e) => { e.preventDefault(); zoom(e.deltaY * .03); view.idle = performance.now(); }, { passive: false });
    const onKey = (e) => {
      if (e.key === "ArrowLeft") view.vy = .02; else if (e.key === "ArrowRight") view.vy = -.02; else return;
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);

    function resize() {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const v3 = new THREE.Vector3();
    let raf = 0;
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!view.drag) {
        view.yaw += view.vy; view.pitch += view.vp; view.vy *= .92; view.vp *= .88;
        if (now - view.idle > 5000 && !busy) view.yaw += Math.sin(now * .00025) * .00045; // 가만히 두면 천천히 숨 쉬듯 움직임
      }
      // 사진 밖으로 너무 나가지 않게 (살짝 넘어가면 부드럽게 되돌아옴)
      const hf = deg(camera.fov) / 2, hw = Math.atan(Math.tan(hf) * camera.aspect);
      const ly = Math.max(0, view.span / 2 - hw * .85), lp = Math.max(0, Math.atan(view.h / 2 / R) - hf * .9);
      if (!view.drag) {
        if (view.yaw > ly) view.yaw += (ly - view.yaw) * .15; else if (view.yaw < -ly) view.yaw += (-ly - view.yaw) * .15;
        if (view.pitch > lp) view.pitch += (lp - view.pitch) * .15; else if (view.pitch < -lp) view.pitch += (-lp - view.pitch) * .15;
      } else {
        view.yaw = Math.max(-ly - .25, Math.min(ly + .25, view.yaw));
        view.pitch = Math.max(-lp - .15, Math.min(lp + .15, view.pitch));
      }
      camera.rotation.set(view.pitch, view.yaw, 0, "YXZ");
      renderer.render(scene, camera);

      const w = cv.clientWidth, h = cv.clientHeight;
      for (const { b, p } of hotEls) {
        v3.copy(p).project(camera);
        const sy = ((1 - v3.y) / 2) * h, show = v3.z < 1 && Math.abs(v3.x) < 1.05 && sy > 70 && sy < h - 100 && !busy; // 썸네일 줄과 겹치면 숨김
        b.style.display = show ? "" : "none";
        if (show) b.style.transform = `translate(${((v3.x + 1) / 2) * w}px, ${sy}px)`;
      }
      // 미니맵: 서 있는 자리 + 보는 방향
      const s = SPOTS[code];
      if (s) {
        const mx = ((s[0] - PLAN_OFF[0]) / suite.plan.w) * 100, my = ((s[1] - PLAN_OFF[1]) / suite.plan.h) * 100;
        const base = Math.atan2(s[2] - s[0], -(s[3] - s[1])); // 도면 위쪽 = 0, 시계 방향
        dot.style.left = cone.style.left = `${mx}%`;
        dot.style.top = cone.style.top = `${my}%`;
        cone.style.transform = `translate(-50%, -100%) rotate(${base - view.yaw}rad)`;
      }
    }
    raf = requestAnimationFrame(frame);
    await goto("A", null, null, true);

    return {
      goto: (c) => goto(c),
      destroy() {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener("keydown", onKey, true);
        scene.traverse((o) => { o.geometry?.dispose(); });
        Object.values(texCache).forEach((p) => p.then((t) => t.dispose()));
        renderer.dispose();
        renderer.forceContextLoss?.();
        container.innerHTML = "";
      },
    };
  };
})();
