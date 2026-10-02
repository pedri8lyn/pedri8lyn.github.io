(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const hasGsap = !!window.gsap;
  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  $("#year").textContent = new Date().getFullYear();

  // ---------- helpers ----------
  const fmt = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  const ago = (ts) => {
    if (!ts) return "";
    const s = ts - Date.now() / 1000;
    const units = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
    for (const [u, sec] of units) if (Math.abs(s) >= sec) return rtf.format(Math.round(s / sec), u);
    return "à l'instant";
  };
  const esc = (t) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shortAgo = (ts) => {
    if (!ts) return "";
    const s = Date.now() / 1000 - ts;
    if (s < 3600) return "à l'instant";
    if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
    if (s < 604800) return `il y a ${Math.round(s / 86400)} j`;
    if (s < 2592000) return `il y a ${Math.round(s / 604800)} sem.`;
    return `il y a ${Math.round(s / 2592000)} mois`;
  };
  // hashtags / mentions in gold — split first so HTML entities never get matched
  const richText = (t) => t.trim().split(/([#@][\p{L}\p{N}_.]+)/u)
    .map((part, i) => (i % 2 ? `<span class="tag">${esc(part)}</span>` : esc(part))).join("");
  const icons = {
    play: '<svg viewBox="0 0 24 24"><path d="M6 4l15 8-15 8z"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8z"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11.2A4.8 4.8 0 0112 6a4.8 4.8 0 018 3.8C20 15.8 12 21 12 21z"/></svg>',
  };
  const tiktokPlayer = (id, autoplay) =>
    `<iframe src="https://www.tiktok.com/player/v1/${id}?autoplay=${autoplay ? 1 : 0}&loop=1&rel=0&music_info=1&description=0&native_context_menu=0"
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen title="Vidéo TikTok de pedri8lyn_"></iframe>`;

  // split text into chars / words for animation
  $$("[data-split]").forEach((el) => {
    el.setAttribute("aria-label", el.textContent);
    el.innerHTML = [...el.textContent].map((c) => `<span class="char" aria-hidden="true">${c === " " ? "&nbsp;" : esc(c)}</span>`).join("");
  });
  $$("[data-split-words]").forEach((el) => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="word-wrap"><span class="word">${esc(w)}</span></span>`).join(" ");
  });

  // ---------- data ----------
  const getJSON = (url) => fetch(url, { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const dataReady = Promise.all([getJSON("data/tiktok.json"), getJSON("data/instagram.json")]);

  // ---------- smooth scroll ----------
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    if (hasGsap) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    lenis.stop();
    $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const target = $(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: a.getAttribute("href") === "#top" ? 0 : -40, duration: 1.4 });
    }));
  }

  // ---------- particles ----------
  const canvas = $("#fx");
  const ctx = canvas.getContext("2d");
  let W, H, dpr, parts = [];
  const pointer = { x: -999, y: -999, nx: 0, ny: 0 };
  const colors = ["242,194,0", "226,21,95", "42,123,255", "246,242,234"];
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.width = innerWidth * dpr; H = canvas.height = innerHeight * dpr;
    const n = Math.round(Math.min(90, (innerWidth * innerHeight) / 16000));
    parts = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.8 + .4) * dpr,
      vx: (Math.random() - .5) * .25 * dpr, vy: (-Math.random() * .35 - .05) * dpr,
      c: colors[Math.floor(Math.random() * colors.length)], a: Math.random() * .6 + .2, z: Math.random() * .8 + .2,
    }));
  };
  resize();
  addEventListener("resize", resize);
  const drawFx = () => {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      const dx = p.x - pointer.x * dpr, dy = p.y - pointer.y * dpr, d2 = dx * dx + dy * dy, R = 140 * dpr;
      if (d2 < R * R) { const f = (1 - Math.sqrt(d2) / R) * 1.6; p.x += (dx / Math.sqrt(d2 || 1)) * f; p.y += (dy / Math.sqrt(d2 || 1)) * f; }
      p.x += p.vx; p.y += p.vy;
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      const px = p.x + pointer.nx * 20 * p.z * dpr, py = p.y + pointer.ny * 14 * p.z * dpr;
      ctx.beginPath(); ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.c},${p.a})`; ctx.shadowColor = `rgba(${p.c},.8)`; ctx.shadowBlur = 8 * dpr; ctx.fill();
    }
    if (!reduce) requestAnimationFrame(drawFx);
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
    const loop = () => {
      rx += (cx - rx) * .18; ry += (cy - ry) * .18;
      dot.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    loop();
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
    addEventListener("pointermove", (e) => {
      const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
      for (const s of setters) { s.x(-nx * 60 * s.d); s.y(-ny * 40 * s.d); }
    });
    addEventListener("deviceorientation", (e) => {
      if (e.gamma == null) return;
      const nx = Math.max(-.5, Math.min(.5, e.gamma / 60)), ny = Math.max(-.5, Math.min(.5, (e.beta - 45) / 60));
      for (const s of setters) { s.x(-nx * 60 * s.d); s.y(-ny * 40 * s.d); }
    });
  }

  // ---------- counters ----------
  const countTo = (el, value, delay = 0) => {
    if (!hasGsap || reduce) { el.textContent = fmt.format(value); return; }
    const o = { v: 0 };
    gsap.to(o, { v: value, duration: 2, delay, ease: "power3.out", onUpdate: () => { el.textContent = fmt.format(Math.round(o.v)); } });
  };
  const statsHTML = (v) =>
    `<div class="stat"><b data-num="${v.views}">${fmt.format(v.views)}</b><span>vues</span></div>
     <div class="stat"><b data-num="${v.likes}">${fmt.format(v.likes)}</b><span>likes</span></div>
     <div class="stat"><b data-num="${v.comments}">${fmt.format(v.comments)}</b><span>commentaires</span></div>`;

  // ---------- render TikTok ----------
  let videos = [];
  const grid = $("#tiktokGrid");
  const moreBtn = $("#moreBtn");
  const PAGE = 8;
  let shown = 0;

  const cardHTML = (v, i) => `
    <img class="card__img" src="${v.cover || ""}" alt="" loading="lazy">
    <div class="card__shine"></div>
    <div class="card__top">${i === 0 ? '<span class="pill pill--new">Nouveau</span>' : `<span class="pill">${shortAgo(v.timestamp)}</span>`}${v.duration ? `<span class="pill">0:${String(v.duration).padStart(2, "0")}</span>` : ""}</div>
    <span class="card__play">${icons.play}</span>
    <div class="card__body">
      <p class="card__desc">${richText(v.description) || "Edit Pedri"}</p>
      <div class="card__meta"><span>${icons.eye}${fmt.format(v.views)}</span><span>${icons.heart}${fmt.format(v.likes)}</span></div>
    </div>`;

  const renderMore = () => {
    const batch = videos.slice(shown, shown + PAGE);
    const els = batch.map((v, k) => {
      const i = shown + k;
      const el = document.createElement("button");
      el.className = "card";
      el.type = "button";
      el.dataset.cursor = "play";
      el.setAttribute("aria-label", `Lire la vidéo : ${v.description.slice(0, 80)}`);
      el.innerHTML = cardHTML(v, i);
      el.addEventListener("click", () => openLightbox(i, el));
      grid.appendChild(el);
      bindTilt(el, 14);
      return el;
    });
    shown += batch.length;
    moreBtn.hidden = shown >= videos.length;
    if (hasGsap && !reduce) {
      gsap.set(els, { opacity: 0, y: 80, rotateX: -25, transformOrigin: "50% 0%" });
      ScrollTrigger.batch(els, {
        start: "top 92%", once: true,
        onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, rotateX: 0, duration: 1.1, ease: "power4.out", stagger: .08 }),
      });
      ScrollTrigger.refresh();
    }
  };
  moreBtn.addEventListener("click", renderMore);

  const renderLatest = (v) => {
    const screen = $("#latestScreen");
    screen.innerHTML = `<img src="${v.cover || ""}" alt="">`;
    $("#latestDesc").innerHTML = richText(v.description);
    $("#latestStats").innerHTML = statsHTML(v);
    $("#latestLink").href = v.url;
    // the real TikTok player is injected when the phone comes into view
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      screen.innerHTML = tiktokPlayer(v.id, false);
      io.disconnect();
    }, { rootMargin: "200px" });
    io.observe(screen);
  };

  // ---------- render Instagram ----------
  const renderInstagram = (ig) => {
    const box = $("#igGrid");
    const posts = (ig?.posts || []).map((u) => u.match(/instagram\.com\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]+)/)).filter(Boolean);
    if (!posts.length) {
      box.innerHTML = `<div class="empty">
        <div class="empty__icon"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1" class="fill"/></svg></div>
        <div><h3>Les reels arrivent bientôt</h3><p>En attendant, retrouve tous les edits directement sur Instagram.</p></div>
        <a class="btn btn--primary magnetic" href="https://www.instagram.com/pedri8lyn_/" target="_blank" rel="noopener"><span>@pedri8lyn_</span></a></div>`;
      $$(".magnetic", box).forEach(bindMagnetic);
      return;
    }
    box.innerHTML = posts.map(([, type, code]) => `<div class="card card--ig">
      <iframe src="https://www.instagram.com/${type === "reels" ? "reel" : type}/${code}/embed/" loading="lazy" scrolling="no" allowtransparency="true" allow="autoplay; encrypted-media" title="Post Instagram de pedri8lyn_"></iframe></div>`).join("");
  };

  // ---------- lightbox ----------
  const lb = $("#lightbox");
  let current = 0, lastFocus = null;
  const showVideo = (i, dir = 0) => {
    current = (i + videos.length) % videos.length;
    const v = videos[current];
    $("#lbScreen").innerHTML = tiktokPlayer(v.id, true);
    $("#lbDate").textContent = ago(v.timestamp);
    $("#lbDesc").innerHTML = richText(v.description);
    $("#lbStats").innerHTML = statsHTML(v);
    $("#lbLink").href = v.url;
    if (hasGsap && dir) gsap.fromTo(".phone--lb", { x: 80 * dir, opacity: 0, rotateY: -20 * dir }, { x: 0, opacity: 1, rotateY: 0, duration: .7, ease: "power3.out" });
  };
  const openLightbox = (i, fromEl) => {
    lastFocus = fromEl;
    lb.hidden = false;
    lenis?.stop();
    document.body.style.overflow = "hidden";
    showVideo(i);
    if (hasGsap) {
      gsap.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: .35 });
      gsap.fromTo(".phone--lb", { scale: .7, y: 80, rotateX: 25, opacity: 0 }, { scale: 1, y: 0, rotateX: 0, opacity: 1, duration: .9, ease: "expo.out" });
      gsap.fromTo(".lightbox__meta > *", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .7, stagger: .07, delay: .2, ease: "power3.out" });
    }
    $("#lbClose").focus();
  };
  const closeLightbox = () => {
    const done = () => { lb.hidden = true; $("#lbScreen").innerHTML = ""; lenis?.start(); document.body.style.overflow = ""; lastFocus?.focus(); };
    if (hasGsap) gsap.to(lb, { opacity: 0, duration: .3, onComplete: done }); else done();
  };
  $("#lbClose").addEventListener("click", closeLightbox);
  $("#lbPrev").addEventListener("click", () => showVideo(current - 1, -1));
  $("#lbNext").addEventListener("click", () => showVideo(current + 1, 1));
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLightbox(); });
  addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") showVideo(current + 1, 1);
    if (e.key === "ArrowLeft") showVideo(current - 1, -1);
  });
  let touchX = null;
  lb.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 60) showVideo(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    touchX = null;
  });

  // ---------- scroll animations ----------
  const scrollFx = () => {
    if (!hasGsap || reduce) return;

    // hero: visual sinks, text lifts, ghost slides (wrappers only — the intro animates their children)
    const heroTl = gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    heroTl.fromTo(".hero__visual", { yPercent: 0, scale: 1 }, { yPercent: 18, scale: 1.12, ease: "none" }, 0)
      .fromTo(".hero__text", { yPercent: 0, opacity: 1 }, { yPercent: -60, opacity: 0, ease: "none" }, 0)
      .fromTo(".hero__ghost", { xPercent: 0 }, { xPercent: -25, ease: "none" }, 0)
      .fromTo(".chip", { yPercent: 0 }, { yPercent: (i) => -300 - i * 200, ease: "none" }, 0);

    // marquee driven by scroll velocity
    const track = $("#marquee");
    track.innerHTML += track.innerHTML + track.innerHTML;
    const loopW = () => track.scrollWidth / 3;
    let xPos = 0, dir = -1;
    const speed = { v: 1 };
    gsap.ticker.add(() => {
      xPos += dir * speed.v * 1.2;
      const w = loopW();
      if (xPos <= -w) xPos += w;
      if (xPos > 0) xPos -= w;
      gsap.set(track, { x: xPos });
    });
    ScrollTrigger.create({
      onUpdate: (self) => {
        dir = self.direction === 1 ? -1 : 1;
        speed.v = 1 + Math.min(8, Math.abs(self.getVelocity()) / 300);
        gsap.to(speed, { v: 1, duration: 1.2, ease: "power2.out", overwrite: true, delay: .05 });
      },
    });

    // section titles: words slide up
    $$("[data-split-words]").forEach((h) => {
      gsap.from($$(".word", h), { yPercent: 110, rotate: 6, duration: 1.1, ease: "power4.out", stagger: .06, scrollTrigger: { trigger: h, start: "top 88%" } });
    });
    $$(".section .eyebrow, .section__sub, .latest__desc, .latest .stats, .latest .btn, .about__body p, .about__links").forEach((el) => {
      gsap.from(el, { y: 30, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 92%" } });
    });

    // latest phone: rotates into place while scrolling
    gsap.fromTo("#latestPhone", { rotateY: -32, rotateX: 12, rotateZ: -6, y: 80 },
      { rotateY: 10, rotateX: -4, rotateZ: 2, y: -40, ease: "none", scrollTrigger: { trigger: ".latest", start: "top bottom", end: "bottom top", scrub: 1 } });

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
      .from(".hero__photo img", { yPercent: 40, scale: .85, opacity: 0, duration: 1.6, ease: "expo.out" }, "<.1")
      .from(".hero__title .char", { yPercent: 120, rotateX: -90, opacity: 0, duration: 1.2, ease: "expo.out", stagger: .045 }, "<.2")
      .from(".hero__eyebrow, .hero__sub, .hero__cta > *", { y: 30, opacity: 0, duration: .9, ease: "power3.out", stagger: .08 }, "<.3")
      .from(".chip", { scale: 0, opacity: 0, duration: 1, ease: "back.out(2)", stagger: .12 }, "<.2")
      .from(".nav", { y: -80, opacity: 0, duration: .9, ease: "power3.out" }, "<")
      .from(".hero__ghost", { opacity: 0, scale: 1.3, duration: 2, ease: "expo.out" }, "<-.4");
  };

  // loader progress — waits for the data and hero image, minimum ~1.4s for the show
  const heroImg = $(".hero__photo img");
  const imgReady = heroImg.complete ? Promise.resolve() : new Promise((r) => { heroImg.onload = heroImg.onerror = r; });
  const minTime = new Promise((r) => setTimeout(r, reduce ? 0 : 1400));
  const prog = { v: 0 };
  if (hasGsap && !reduce) {
    gsap.to(".loader__name .char", { yPercent: 0, duration: .9, ease: "expo.out", stagger: .04 });
    gsap.to(prog, { v: 85, duration: 1.4, ease: "power2.out", onUpdate: () => { $("#loaderCount").textContent = Math.round(prog.v); $("#loaderBar").style.width = `${prog.v}%`; } });
  }

  Promise.all([dataReady, imgReady, minTime]).then(([[tt, ig]]) => {
    if (tt?.videos?.length) {
      videos = tt.videos;
      if (tt.name) $("#displayName").textContent = tt.name;
      renderLatest(videos[0]);
      renderMore();
      const total = videos.reduce((s, v) => s + (v.views || 0), 0);
      $$("[data-count]").forEach((el) => { el.dataset.target = el.dataset.count === "videos" ? videos.length : total; });
    } else {
      grid.innerHTML = `<div class="empty"><div></div><div><h3>Vidéos indisponibles</h3><p>Impossible de charger les vidéos pour le moment.</p></div>
        <a class="btn btn--primary" href="https://www.tiktok.com/@pedri8lyn_" target="_blank" rel="noopener"><span>Voir sur TikTok</span></a></div>`;
    }
    renderInstagram(ig);

    const finish = () => {
      intro();
      scrollFx();
      $$("[data-count]").forEach((el) => countTo(el, +(el.dataset.target || 0), 1.6));
      if (hasGsap) {
        $$(".stats b[data-num]").forEach((b) => ScrollTrigger.create({ trigger: b, start: "top 95%", once: true, onEnter: () => countTo(b, +b.dataset.num) }));
        ScrollTrigger.refresh();
      }
    };
    if (hasGsap && !reduce) {
      gsap.to(prog, { v: 100, duration: .4, overwrite: true, onUpdate: () => { $("#loaderCount").textContent = Math.round(prog.v); $("#loaderBar").style.width = `${prog.v}%`; }, onComplete: finish });
    } else finish();
  });
})();
