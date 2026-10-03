(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const hasGsap = !!window.gsap;
  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  $("#year").textContent = new Date().getFullYear();

  // ---------- performance mode ----------
  // "lite" = machines plus modestes : pas de particules, pas de grain, pas de flou, scroll natif.
  // Forcer avec ?lite ou ?full dans l'URL.
  const q = new URLSearchParams(location.search);
  let lite = q.has("lite") || (!q.has("full") && ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4));
  if (lite) document.documentElement.classList.add("lite");
  const setLite = () => {
    lite = true;
    document.documentElement.classList.add("lite");
    if (lenis) { lenis.destroy(); lenis = null; }
    ctx.clearRect(0, 0, W, H);
  };
  // mesure réelle pendant l'écran de chargement : si on tombe sous ~45 fps, on allège
  const probeFps = () => new Promise((res) => {
    if (lite || q.has("full")) return res();
    let n = 0, t0 = performance.now(), last = t0, slow = 0;
    const f = (t) => {
      if (t - last > 28) slow++;
      last = t; n++;
      if (t - t0 < 1000) return requestAnimationFrame(f);
      if (n < 45 || slow > 8) setLite();
      res();
    };
    requestAnimationFrame(f);
  });

  // ---------- visibility flags (on ne calcule rien pour ce qui est hors écran) ----------
  const onScreen = new Map();
  const visIO = new IntersectionObserver((entries) => {
    for (const en of entries) { onScreen.set(en.target, en.isIntersecting); en.target.classList.toggle("is-off", !en.isIntersecting); }
  });
  $$(".hero, .feed").forEach((el) => { onScreen.set(el, true); visIO.observe(el); });
  const visible = (sel) => onScreen.get($(sel)) !== false;

  // ---------- helpers ----------
  const fmt = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });
  const esc = (t) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // split text into chars / words for animation
  $$("[data-split]").forEach((el) => {
    el.setAttribute("aria-label", el.textContent);
    el.innerHTML = [...el.textContent].map((c) => `<span class="char" aria-hidden="true">${c === " " ? "&nbsp;" : esc(c)}</span>`).join("");
  });
  $$("[data-split-words]").forEach((el) => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="word-wrap"><span class="word">${esc(w)}</span></span>`).join(" ");
  });

  // ---------- smooth scroll ----------
  let lenis = null;
  if (window.Lenis && !reduce && !lite) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    if (hasGsap) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis?.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { if (!lenis) return; lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    lenis.stop();
    $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const target = $(a.getAttribute("href"));
      if (!target || !lenis) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: a.getAttribute("href") === "#top" ? 0 : -40, duration: 1.4 });
    }));
  }

  // ---------- particles ----------
  const canvas = $("#fx");
  const ctx = canvas.getContext("2d", { alpha: true });
  let W, H, dpr, parts = [];
  const pointer = { x: -999, y: -999, nx: 0, ny: 0 };
  const colors = ["242,194,0", "226,21,95", "42,123,255", "246,242,234"];
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = canvas.width = innerWidth * dpr; H = canvas.height = innerHeight * dpr;
    const n = Math.round(Math.min(60, (innerWidth * innerHeight) / 22000));
    parts = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.8 + .4) * dpr,
      vx: (Math.random() - .5) * .25 * dpr, vy: (-Math.random() * .35 - .05) * dpr,
      c: colors[Math.floor(Math.random() * colors.length)], a: Math.random() * .6 + .2, z: Math.random() * .8 + .2,
    }));
  };
  // halo pré-dessiné une fois par couleur : bien moins coûteux que shadowBlur à chaque image
  const sprites = Object.fromEntries(colors.map((c) => {
    const sc = document.createElement("canvas"); sc.width = sc.height = 32;
    const g = sc.getContext("2d"), grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grd.addColorStop(0, `rgba(${c},1)`); grd.addColorStop(.25, `rgba(${c},.8)`); grd.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
    return [c, sc];
  }));
  resize();
  let resizeT;
  addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(resize, 150); });
  const drawFx = () => {
    if (lite || reduce) return;
    requestAnimationFrame(drawFx);
    if (document.hidden) return;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      const dx = p.x - pointer.x * dpr, dy = p.y - pointer.y * dpr, d2 = dx * dx + dy * dy, R = 140 * dpr;
      if (d2 < R * R) { const f = (1 - Math.sqrt(d2) / R) * 1.6; p.x += (dx / Math.sqrt(d2 || 1)) * f; p.y += (dy / Math.sqrt(d2 || 1)) * f; }
      p.x += p.vx; p.y += p.vy;
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      const px = p.x + pointer.nx * 20 * p.z * dpr, py = p.y + pointer.ny * 14 * p.z * dpr;
      const size = p.r * 6;
      ctx.globalAlpha = p.a;
      ctx.drawImage(sprites[p.c], px - size / 2, py - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  };
  drawFx();

  // ---------- cursor + magnetic ----------
  const cursor = $("#cursor");
  const dot = $(".cursor__dot"), ring = $(".cursor__ring");
  let cx = innerWidth / 2, cy = innerHeight / 2, rx = cx, ry = cy;
  addEventListener("pointermove", (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY;
    pointer.nx = e.clientX / innerWidth - .5; pointer.ny = e.clientY / innerHeight - .5;
    cx = e.clientX; cy = e.clientY;
  });
  if (fine) {
    let running = false;
    const loop = () => {
      rx += (cx - rx) * .18; ry += (cy - ry) * .18;
      dot.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      if (Math.abs(cx - rx) + Math.abs(cy - ry) > .3) requestAnimationFrame(loop); else running = false;
    };
    addEventListener("pointermove", () => { if (!running) { running = true; requestAnimationFrame(loop); } });
    document.addEventListener("pointerover", (e) => {
      const play = e.target.closest("[data-cursor=play]");
      cursor.classList.toggle("is-play", !!play);
      cursor.classList.toggle("is-hover", !play && !!e.target.closest("a, button"));
    });
  }
  const bindMagnetic = (el) => {
    if (!fine || reduce || !hasGsap) return;
    const inner = el.querySelector("span") || el;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
      gsap.to(el, { x: x * .3, y: y * .4, duration: .5, ease: "power3.out" });
      gsap.to(inner, { x: x * .12, y: y * .12, duration: .5, ease: "power3.out" });
    });
    el.addEventListener("pointerleave", () => gsap.to([el, inner], { x: 0, y: 0, duration: .8, ease: "elastic.out(1, .4)" }));
  };
  $$(".magnetic").forEach(bindMagnetic);

  // ---------- tilt ----------
  const bindTilt = (el, max = 12) => {
    if (!fine || reduce || !hasGsap) return;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--px", `${x * 100}%`); el.style.setProperty("--py", `${y * 100}%`);
      gsap.to(el, { rotateY: (x - .5) * max, rotateX: (.5 - y) * max, scale: 1.03, duration: .5, ease: "power2.out", transformPerspective: 900 });
    });
    el.addEventListener("pointerleave", () => gsap.to(el, { rotateY: 0, rotateX: 0, scale: 1, duration: 1, ease: "elastic.out(1, .5)" }));
  };
  $$(".tilt").forEach((el) => bindTilt(el, 6));

  // ---------- hero parallax (mouse) ----------
  const depthEls = $$(".hero [data-depth]");
  if (hasGsap && !reduce) {
    const setters = depthEls.map((el) => ({ d: +el.dataset.depth, x: gsap.quickTo(el, "x", { duration: 1.2, ease: "power3.out" }), y: gsap.quickTo(el, "y", { duration: 1.2, ease: "power3.out" }) }));
    const card = $("#photoCard");
    const rotY = gsap.quickTo(card, "rotationY", { duration: 1, ease: "power3.out" });
    const rotX = gsap.quickTo(card, "rotationX", { duration: 1, ease: "power3.out" });
    addEventListener("pointermove", (e) => {
      if (!visible(".hero")) return;
      const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
      for (const s of setters) { s.x(-nx * 60 * s.d); s.y(-ny * 40 * s.d); }
      rotY(-10 + nx * 22); rotX(4 - ny * 16);
      card.style.setProperty("--sx", `${50 + nx * 90}%`); card.style.setProperty("--sy", `${40 + ny * 90}%`);
    });
    addEventListener("deviceorientation", (e) => {
      if (e.gamma == null) return;
      const nx = Math.max(-.5, Math.min(.5, e.gamma / 60)), ny = Math.max(-.5, Math.min(.5, (e.beta - 45) / 60));
      for (const s of setters) { s.x(-nx * 60 * s.d); s.y(-ny * 40 * s.d); }
    });
  }

  // ---------- counters ----------
  const countTo = (el, value, delay = 0, prefix = "") => {
    if (!hasGsap || reduce) { el.textContent = prefix + fmt.format(value); return; }
    const o = { v: 0 };
    gsap.to(o, { v: value, duration: 2, delay, ease: "power3.out", onUpdate: () => { el.textContent = prefix + fmt.format(Math.round(o.v)); } });
  };
  // ---------- live embeds (loaded by the visitor's browser, so always up to date) ----------
  const markReady = (box) => box.classList.add("is-ready");
  const igBox = $("#igLive"), igFrame = $("#igLive iframe");
  const ttBox = $("#ttLive");
  const loadInstagram = () => {
    if (igFrame.src) return;
    igFrame.addEventListener("load", () => setTimeout(() => markReady(igBox), 400), { once: true });
    igFrame.src = igFrame.dataset.src;
  };
  new IntersectionObserver(([en], io) => { if (en.isIntersecting) { loadInstagram(); io.disconnect(); } }, { rootMargin: "600px" }).observe(igBox);
  // embed.js injects an iframe into the blockquote — wait for it to load
  new MutationObserver((_, mo) => {
    const f = ttBox.querySelector("iframe");
    if (!f) return;
    mo.disconnect();
    f.addEventListener("load", () => setTimeout(() => markReady(ttBox), 600), { once: true });
  }).observe(ttBox, { childList: true, subtree: true });
  setTimeout(() => { markReady(ttBox); markReady(igBox); }, 12000);

  // ---------- scroll animations ----------
  const scrollFx = () => {
    if (!hasGsap || reduce) return;

    // hero: visual sinks, text lifts, ghost slides (wrappers only — the intro animates their children)
    const heroTl = gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    heroTl.fromTo(".hero__visual", { yPercent: 0, scale: 1 }, { yPercent: 18, scale: 1.12, ease: "none" }, 0)
      .fromTo(".hero__text", { yPercent: 0, opacity: 1 }, { yPercent: -60, opacity: 0, ease: "none" }, 0)
      .fromTo(".hero__ghost", { xPercent: 0 }, { xPercent: -25, ease: "none" }, 0)
      .fromTo(".chip", { yPercent: 0 }, { yPercent: (i) => -300 - i * 200, ease: "none" }, 0);

    // section titles: words slide up
    $$("[data-split-words]").forEach((h) => {
      gsap.from($$(".word", h), { yPercent: 110, rotate: 6, duration: 1.1, ease: "power4.out", stagger: .06, scrollTrigger: { trigger: h, start: "top 88%" } });
    });
    $$(".section .eyebrow, .about__body p, .about__links").forEach((el) => {
      gsap.from(el, { y: 30, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 92%" } });
    });

    // live frames swing into place in 3D
    $$(".feed__frame").forEach((f, i) => {
      const side = f.closest(".feed--reverse") ? -1 : 1;
      gsap.fromTo(f, { rotateY: -28 * side, rotateX: 14, y: 120, opacity: 0, transformPerspective: 1400 },
        { rotateY: 0, rotateX: 0, y: 0, opacity: 1, ease: "power3.out", scrollTrigger: { trigger: f, start: "top 95%", end: "top 35%", scrub: 1 } });
    });
    $$(".feed__info").forEach((el) => gsap.from($$(".feed__text, .feed__actions", el), { y: 40, opacity: 0, duration: 1, stagger: .1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 80%" } }));

    // big TikTok / Instagram headings scale
    $$(".h2--big").forEach((h) => gsap.fromTo(h, { scale: .8, letterSpacing: "0em" }, { scale: 1, letterSpacing: "-0.05em", ease: "none", scrollTrigger: { trigger: h, start: "top bottom", end: "top 40%", scrub: true } }));

    // about card
    gsap.from(".about__card", { y: 120, rotateX: 18, opacity: 0, duration: 1.4, ease: "power4.out", transformPerspective: 1200, scrollTrigger: { trigger: ".about", start: "top 80%" } });
    gsap.fromTo(".about__photo img", { yPercent: -12 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: ".about", scrub: true } });

    // footer letters wave
    gsap.from(".footer__big .char", { yPercent: 100, opacity: 0, duration: 1.2, ease: "power4.out", stagger: .04, scrollTrigger: { trigger: ".footer", start: "top 90%" } });

    // nav hides on scroll down
    const nav = $("#nav");
    ScrollTrigger.create({ start: 200, onUpdate: (s) => nav.classList.toggle("is-hidden", s.direction === 1 && s.scroll() > 400) });
  };

  // ---------- intro ----------
  const intro = () => {
    document.body.classList.remove("is-loading");
    lenis?.start();
    if (!hasGsap || reduce) { $("#loader").remove(); return; }
    const tl = gsap.timeline();
    tl.to(".loader__name .char", { yPercent: -110, duration: .6, ease: "power3.in", stagger: .02 })
      .to("#loader", { clipPath: "inset(0 0 100% 0)", duration: 1, ease: "expo.inOut" }, "-=.2")
      .set("#loader", { display: "none" })
      .from(".hero__ring", { scale: 0, rotate: -180, duration: 1.6, ease: "expo.out" }, "-=.6")
      .from(".hero__num", { yPercent: 60, opacity: 0, duration: 1.4, ease: "expo.out" }, "<.1")
      .from(".photo-card", { yPercent: 30, rotateY: -50, rotateX: 20, scale: .8, opacity: 0, duration: 1.8, ease: "expo.out" }, "<.1")
      .from(".hero__title .char", { yPercent: 120, rotateX: -90, opacity: 0, duration: 1.2, ease: "expo.out", stagger: .045 }, "<.2")
      .from(".hero__eyebrow, .hero__sub, .hero__cta > *", { y: 30, opacity: 0, duration: .9, ease: "power3.out", stagger: .08 }, "<.3")
      .from(".chip", { scale: 0, opacity: 0, duration: 1, ease: "back.out(2)", stagger: .12 }, "<.2")
      .from(".nav", { y: -80, opacity: 0, duration: .9, ease: "power3.out" }, "<")
      .from(".hero__ghost", { opacity: 0, scale: 1.3, duration: 2, ease: "expo.out" }, "<-.4");
  };

  // loader progress — waits for the data and hero image, minimum ~1.4s for the show
  const heroImg = $(".photo-card img");
  const imgReady = heroImg.complete ? Promise.resolve() : new Promise((r) => { heroImg.onload = heroImg.onerror = r; });
  const minTime = new Promise((r) => setTimeout(r, reduce ? 0 : 1400));
  const prog = { v: 0 };
  if (hasGsap && !reduce) {
    gsap.to(".loader__name .char", { yPercent: 0, duration: .9, ease: "expo.out", stagger: .04 });
    gsap.to(prog, { v: 85, duration: 1.4, ease: "power2.out", onUpdate: () => { $("#loaderCount").textContent = Math.round(prog.v); $("#loaderBar").style.width = `${prog.v}%`; } });
  }

  Promise.all([imgReady, minTime, probeFps()]).then(() => {
    const finish = () => {
      intro();
      scrollFx();
      $$("[data-count]").forEach((el) => countTo(el, +el.dataset.count, 1.6, "+"));
      if (hasGsap) ScrollTrigger.refresh();
    };
    if (hasGsap && !reduce) {
      gsap.to(prog, { v: 100, duration: .4, overwrite: true, onUpdate: () => { $("#loaderCount").textContent = Math.round(prog.v); $("#loaderBar").style.width = `${prog.v}%`; }, onComplete: finish });
    } else finish();
  });
})();
