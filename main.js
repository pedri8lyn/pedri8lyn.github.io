(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  document.getElementById("year").textContent = new Date().getFullYear();

  // --- Hero parallax (2.5D layers) ---
  const scene = document.getElementById("scene");
  const layers = [...scene.querySelectorAll(".layer")];
  const jersey = document.getElementById("jersey");
  let mx = 0, my = 0, cx = 0, cy = 0, scrollY = 0;

  if (!reduceMotion) {
    window.addEventListener("pointermove", (e) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    window.addEventListener("deviceorientation", (e) => {
      if (e.gamma == null) return;
      mx = Math.max(-1, Math.min(1, e.gamma / 30));
      my = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
    });
    window.addEventListener("scroll", () => { scrollY = window.scrollY; }, { passive: true });

    const tick = () => {
      cx += (mx - cx) * 0.08;
      cy += (my - cy) * 0.08;
      for (const layer of layers) {
        const d = parseFloat(layer.dataset.depth);
        layer.style.transform =
          `translate3d(${cx * d * 40}px, ${cy * d * 30 - scrollY * d * 0.4}px, 0)`;
      }
      jersey.style.transform =
        `rotateY(${-14 + cx * 18}deg) rotateX(${8 - cy * 14}deg) translateZ(60px)`;
      jersey.style.setProperty("--mx", `${50 + cx * 40}%`);
      jersey.style.setProperty("--my", `${40 + cy * 40}%`);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // --- Tilt cards ---
  const bindTilt = (el, max = 10) => {
    if (reduceMotion || !finePointer) return;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transitionDelay = "0ms";
      el.style.transform = `rotateY(${x * max}deg) rotateX(${-y * max}deg)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  };
  document.querySelectorAll(".tilt").forEach((el) => bindTilt(el, 6));

  // --- Scroll reveal ---
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
  }, { threshold: 0.12 });
  const observe = (el) => io.observe(el);
  document.querySelectorAll(".reveal").forEach(observe);

  // --- Script loader for official embeds ---
  const loaded = {};
  const loadScript = (src) => loaded[src] ||= new Promise((res) => {
    const s = document.createElement("script");
    s.src = src; s.async = true; s.onload = res; s.onerror = res;
    document.body.appendChild(s);
  });

  // --- Tabs ---
  const tabs = [...document.querySelectorAll(".tab")];
  const pill = document.querySelector(".tabs__pill");
  const movePill = (tab) => {
    pill.style.width = `${tab.offsetWidth}px`;
    pill.style.transform = `translateX(${tab.offsetLeft - 6}px)`;
  };
  const activate = (name) => {
    tabs.forEach((t) => {
      const on = t.dataset.tab === name;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on);
      if (on) movePill(t);
    });
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("is-active", p.dataset.panel === name));
    if (name === "instagram") {
      const iframe = document.querySelector(".frame--ig iframe");
      if (!iframe.src) iframe.src = iframe.dataset.src;
    }
  };
  tabs.forEach((t) => t.addEventListener("click", () => activate(t.dataset.tab)));
  window.addEventListener("resize", () => movePill(document.querySelector(".tab.is-active")));
  requestAnimationFrame(() => movePill(tabs[0]));

  // --- Featured edits ---
  const grid = document.getElementById("editsGrid");
  const posts = (window.FEATURED_POSTS || []).filter(Boolean);
  const playIcon = '<svg viewBox="0 0 24 24"><path d="M6 4l15 8-15 8z"/></svg>';

  const card = (inner, badge, delay) => {
    const el = document.createElement("article");
    el.className = "edit reveal";
    el.style.transitionDelay = `${delay * 80}ms`;
    el.innerHTML = `<span class="edit__badge">${badge}</span>${inner}`;
    grid.appendChild(el);
    observe(el);
    return el;
  };

  if (posts.length) {
    posts.forEach((url, i) => {
      const tiktok = url.match(/tiktok\.com\/.*\/video\/(\d+)/);
      if (tiktok) {
        card(`<blockquote class="tiktok-embed" cite="${url}" data-video-id="${tiktok[1]}" style="max-width:605px;min-width:0;">
          <section><a href="${url}" target="_blank" rel="noopener">Voir sur TikTok</a></section></blockquote>`, "TikTok", i);
      } else if (/instagram\.com/.test(url)) {
        card(`<blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14"
          style="background:#fff;border:0;border-radius:14px;margin:0;width:100%;min-width:0;">
          <a href="${url}" target="_blank" rel="noopener">Voir sur Instagram</a></blockquote>`, "Instagram", i);
      }
    });
    if (posts.some((u) => /instagram\.com/.test(u))) {
      loadScript("https://www.instagram.com/embed.js").then(() => window.instgrm?.Embeds.process());
    }
  } else {
    const ph = [
      ["TikTok", "Derniers edits sur TikTok", "Transitions, slow-mo et sound design.", "https://www.tiktok.com/@pedri8lyn_", "#a50044", "#2a0a3a"],
      ["Instagram", "Les reels Instagram", "Le meilleur du numéro 8 en vertical.", "https://www.instagram.com/pedri8lyn_/", "#004d98", "#0b1138"],
      ["Nouveau", "Le prochain edit arrive", "Abonne-toi pour ne rien rater.", "https://www.tiktok.com/@pedri8lyn_", "#6b1f7a", "#a50044"],
    ];
    ph.forEach(([badge, title, sub, href, c1, c2], i) => {
      const el = card(`<a class="placeholder" href="${href}" target="_blank" rel="noopener" style="--c1:${c1};--c2:${c2}">
        <span class="placeholder__play">${playIcon}</span><h3>${title}</h3><p>${sub}</p></a>`, badge, i);
      bindTilt(el, 12);
    });
  }

  // TikTok embed.js scans the page once on load — load it after all blockquotes exist.
  loadScript("https://www.tiktok.com/embed.js");
})();
