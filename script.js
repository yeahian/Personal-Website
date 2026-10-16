// Ian Dahlin – portfolio scripts: nav, active section, and the hero point-cloud torus.
(() => {
  "use strict";

  /* ---------- Footer year ---------- */
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Header border on scroll ---------- */
  const header = document.querySelector(".site-header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  const toggle = document.querySelector(".nav-toggle");
  const links = document.getElementById("nav-links");
  const setMenu = (open) => {
    links.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  toggle.addEventListener("click", () => setMenu(!links.classList.contains("open")));
  links.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ---------- Highlight the section in view ---------- */
  const navLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  // The active section is the last one whose top has passed 40% of the viewport,
  // or the last section once the page is scrolled to the bottom.
  let spyQueued = false;
  const updateActive = () => {
    spyQueued = false;
    const line = window.innerHeight * 0.4;
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    let current = null;
    sections.forEach((s) => { if (s.getBoundingClientRect().top <= line) current = s; });
    if (atBottom && sections.length) current = sections[sections.length - 1];
    navLinks.forEach((a) => a.classList.toggle("active", !!current && a.getAttribute("href") === "#" + current.id));
  };
  const queueSpy = () => { if (!spyQueued) { spyQueued = true; requestAnimationFrame(updateActive); } };
  updateActive();
  window.addEventListener("scroll", queueSpy, { passive: true });
  window.addEventListener("resize", queueSpy);

  /* ---------- Hero: point cloud sampled from a torus ---------- */
  const canvas = document.getElementById("torus");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Sample points uniformly over the torus surface (rejection sampling on the tube angle),
  // with a little jitter so it reads like a scanned point cloud rather than a mesh.
  const R = 1.0, r = 0.42, N = 3400;
  const pts = new Float32Array(N * 3);
  let i = 0;
  while (i < N) {
    const u = Math.random() * Math.PI * 2;
    const v = Math.random() * Math.PI * 2;
    if (Math.random() * (R + r) > R + r * Math.cos(v)) continue; // area-uniform
    const j = () => (Math.random() - 0.5) * 0.025;
    pts[i * 3]     = (R + r * Math.cos(v)) * Math.cos(u) + j();
    pts[i * 3 + 1] = r * Math.sin(v) + j();
    pts[i * 3 + 2] = (R + r * Math.cos(v)) * Math.sin(u) + j();
    i++;
  }

  // Depth colour ramp: teal (near) -> purple (far), both from the site palette.
  const near = [3, 218, 197], far = [187, 134, 252];
  const STEPS = 24;
  const ramp = Array.from({ length: STEPS }, (_, k) => {
    const t = k / (STEPS - 1);
    const c = near.map((n, idx) => Math.round(n + (far[idx] - n) * t));
    return `rgba(${c[0]},${c[1]},${c[2]},${1 - t * 0.35})`;
  });

  let rotX = -0.95, rotY = 0.4;     // current orientation (tilted enough to show the hole)
  let velX = 0, velY = 0.0035;       // spin per frame
  const AUTO_Y = 0.0035;
  let width = 0, height = 0, dpr = 1;
  const proj = new Float32Array(N * 3);
  const order = new Uint16Array(N);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 3);   // full sharpness on 3x phone screens
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    if (!width) return;
    ctx.clearRect(0, 0, width, height);
    const cx = Math.cos(rotX), sx = Math.sin(rotX), cy = Math.cos(rotY), sy = Math.sin(rotY);
    const scale = Math.min(width, height) * 0.33 * zoom, cam = 4.2;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let k = 0; k < N; k++) {
      const x = pts[k * 3], y = pts[k * 3 + 1], z = pts[k * 3 + 2];
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;          // rotate around Y
      const y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;          // rotate around X
      const p = cam / (cam + z2);
      const px = x1 * scale * p, py = y2 * scale * p;
      proj[k * 3] = px; proj[k * 3 + 1] = py; proj[k * 3 + 2] = z2;
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
      order[k] = k;
    }
    // Center on the drawn shape, not the torus origin: perspective makes the near rim
    // larger, which would otherwise push the shape toward one edge of the frame.
    const ox = width / 2 - (minX + maxX) / 2, oy = height / 2 - (minY + maxY) / 2;
    order.sort((a, b) => proj[b * 3 + 2] - proj[a * 3 + 2]);      // far first
    for (let n = 0; n < N; n++) {
      const k = order[n], z = proj[k * 3 + 2];
      const t = Math.min(1, Math.max(0, (z + 1.45) / 2.9));
      ctx.fillStyle = ramp[Math.round(t * (STEPS - 1))];
      const s = 2.6 - t * 1.2;
      ctx.fillRect(ox + proj[k * 3] - s / 2, oy + proj[k * 3 + 1] - s / 2, s, s);
    }
  }

  // Interaction (pointer events cover mouse, pen and touch).
  // Mouse and pen rotate on any drag. On touch the first few pixels decide: a mostly
  // sideways swipe takes the gesture and can then tilt freely, a mostly vertical one is
  // left to the browser so the page still scrolls. Two fingers pinch to zoom.
  const FRAME = 1000 / 60;             // velocities are in radians per 60 Hz frame
  const SLOP = 6;                      // px of travel before a touch picks a direction
  const FLING_WINDOW = 80;             // ms of recent movement used for release speed
  const MAX_FLING = 0.2;               // radians per frame, so a hard flick stays watchable
  const ZOOM_MIN = 0.7, ZOOM_MAX = 1.15;  // max keeps the torus inside the frame
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const pointers = new Map();          // pointerId -> { x, y }
  let mode = "idle";                   // idle | pending | rotate | pinch | ignore
  let startX = 0, startY = 0;
  let pendX = 0, pendY = 0;            // rotation waiting for the next frame
  let accX = 0, accY = 0;              // total rotation in this drag
  let history = [];                    // recent { t, x, y } samples of acc, for fling speed
  let zoom = 1, pinchDist = 1, pinchZoom = 1;
  const interacting = () => mode === "rotate" || mode === "pinch";
  const sensitivity = () => 3 / Math.max(300, width);    // radians per px; a bit livelier on small screens
  const spread = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  };

  canvas.addEventListener("pointerdown", (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && e.pointerType === "touch" && mode !== "ignore") {
      mode = "pinch"; pinchDist = spread(); pinchZoom = zoom;
      velX = 0; velY = 0;
    } else if (pointers.size === 1) {
      startX = e.clientX; startY = e.clientY;
      accX = accY = 0; history = [{ t: e.timeStamp, x: 0, y: 0 }];
      mode = e.pointerType === "touch" ? "pending" : "rotate";
      if (mode === "rotate") { canvas.setPointerCapture(e.pointerId); canvas.classList.add("dragging"); }
    }
    start();
  });

  canvas.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    let dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;

    if (mode === "pinch") {
      if (pointers.size === 2) zoom = clamp(pinchZoom * spread() / pinchDist, ZOOM_MIN, ZOOM_MAX);
      start();
      return;
    }
    if (mode === "pending") {
      dx = e.clientX - startX; dy = e.clientY - startY;   // count the slop so nothing is lost
      if (Math.hypot(dx, dy) < SLOP) return;
      mode = Math.abs(dx) > Math.abs(dy) ? "rotate" : "ignore";
      if (mode === "rotate") canvas.classList.add("dragging");
    }
    if (mode !== "rotate") return;

    const k = sensitivity();
    pendY += dx * k; pendX += dy * k;
    accY += dx * k; accX += dy * k;
    history.push({ t: e.timeStamp, x: accX, y: accY });
    while (history.length > 2 && e.timeStamp - history[0].t > FLING_WINDOW) history.shift();
    start();
  });

  // Once the torus owns a touch gesture, stop the page from scrolling or zooming with it.
  // pointermove runs first for the same movement, so the mode is already decided here.
  canvas.addEventListener("touchmove", (e) => { if (interacting()) e.preventDefault(); }, { passive: false });
  canvas.addEventListener("gesturestart", (e) => e.preventDefault());   // iOS page pinch

  const release = (e) => {
    if (!pointers.delete(e.pointerId)) return;
    if (mode === "rotate" && pointers.size === 0) {
      // Release speed is the average over the last FLING_WINDOW ms, so a flick carries
      // momentum and a finger held still before lifting does not.
      const recent = history.filter((h) => e.timeStamp - h.t <= FLING_WINDOW);
      if (!reduceMotion && recent.length >= 2) {
        const a = recent[0], b = recent[recent.length - 1];
        const dt = Math.max(e.timeStamp - a.t, FRAME);
        velX = clamp((b.x - a.x) / dt * FRAME, -MAX_FLING, MAX_FLING);
        velY = clamp((b.y - a.y) / dt * FRAME, -MAX_FLING, MAX_FLING);
      } else {
        velX = 0; velY = 0;
      }
    }
    if (pointers.size === 0) { mode = "idle"; canvas.classList.remove("dragging"); }
    else if (mode === "pinch") mode = "ignore";   // one finger left: wait for it to lift
    start();
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  const hint = document.querySelector(".drag-hint");
  if (hint && window.matchMedia("(pointer: coarse)").matches) {
    hint.textContent = "Swipe sideways to rotate, pinch to zoom.";
  }

  // Animation loop: gentle auto-spin, eased back after a drag. Steps are scaled by elapsed
  // time so 60 Hz and 120 Hz screens feel the same. Paused when off screen.
  let raf = 0, visible = true, lastTime = 0;
  function frame(now) {
    raf = 0;
    const f = lastTime ? Math.min(3, (now - lastTime) / FRAME) : 1;   // 60 Hz frames elapsed
    lastTime = now;
    rotX += pendX; rotY += pendY;
    pendX = pendY = 0;
    if (!interacting()) {
      velX *= Math.pow(0.94, f);
      velY += ((reduceMotion ? 0 : AUTO_Y) - velY) * (1 - Math.pow(0.97, f));
      rotX += velX * f; rotY += velY * f;
    }
    draw();
    const moving = interacting() || Math.abs(velX) > 0.0002 || Math.abs(velY) > 0.0002;
    if (visible && moving) raf = requestAnimationFrame(frame);
    else lastTime = 0;
  }
  function start() { if (!raf && visible) raf = requestAnimationFrame(frame); }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    }).observe(canvas);
  }

  if (reduceMotion) velY = 0;
  window.addEventListener("resize", resize);
  resize();
  start();
})();
