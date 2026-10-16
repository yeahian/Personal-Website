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
    dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    const scale = Math.min(width, height) * 0.33, cam = 4.2;
    for (let k = 0; k < N; k++) {
      const x = pts[k * 3], y = pts[k * 3 + 1], z = pts[k * 3 + 2];
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;          // rotate around Y
      const y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;          // rotate around X
      const p = cam / (cam + z2);
      proj[k * 3] = width / 2 + x1 * scale * p;
      proj[k * 3 + 1] = height / 2 + y2 * scale * p;
      proj[k * 3 + 2] = z2;
      order[k] = k;
    }
    order.sort((a, b) => proj[b * 3 + 2] - proj[a * 3 + 2]);      // far first
    for (let n = 0; n < N; n++) {
      const k = order[n], z = proj[k * 3 + 2];
      const t = Math.min(1, Math.max(0, (z + 1.45) / 2.9));
      ctx.fillStyle = ramp[Math.round(t * (STEPS - 1))];
      const s = 2.6 - t * 1.2;
      ctx.fillRect(proj[k * 3] - s / 2, proj[k * 3 + 1] - s / 2, s, s);
    }
  }

  // Drag to rotate (pointer events cover mouse, pen and touch).
  let dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId); canvas.classList.add("dragging");
    start();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    velY = dx * 0.006; velX = dy * 0.006;
    rotY += velY; rotX += velX;
    if (reduceMotion) draw();
  });
  const endDrag = () => { dragging = false; canvas.classList.remove("dragging"); };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  // Animation loop: gentle auto-spin, eased back after a drag. Paused when off screen.
  let raf = 0, visible = true;
  function frame() {
    raf = 0;
    if (!dragging) {
      velX *= 0.94;
      velY += ((reduceMotion ? 0 : AUTO_Y) - velY) * 0.03;
      rotX += velX; rotY += velY;
    }
    draw();
    const moving = dragging || Math.abs(velX) > 0.0002 || Math.abs(velY) > 0.0002;
    if (visible && moving) raf = requestAnimationFrame(frame);
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
