(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // navegação
  const nav = document.getElementById('nav');
  const toggle = nav.querySelector('.nav-toggle');
  const menu = document.getElementById('menu');
  const heroPhoto = document.querySelector('.hero-photo');

  const closeMenu = () => {
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu');
  };
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  let ticking = false;
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('scrolled', y > 40);
    if (!reduce && y < innerHeight) heroPhoto.style.transform = `translateY(${y * 0.18}px) scale(1.04)`;
    ticking = false;
  };
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  // abertura: as fotos se revezam com fusão lenta
  const slides = [...document.querySelectorAll('.hero-slide')];
  if (slides.length > 1 && !reduce) {
    let cur = 0;
    const load = (el) => new Promise((res) => {
      if (!el.dataset.bg) return res();
      const im = new Image();
      im.onload = im.onerror = () => { el.style.backgroundImage = `url(${el.dataset.bg})`; delete el.dataset.bg; res(); };
      im.src = el.dataset.bg;
    });
    load(slides[1]);
    setInterval(async () => {
      if (document.hidden || scrollY > innerHeight) return;
      const next = (cur + 1) % slides.length;
      await load(slides[next]);
      const prev = slides[cur];
      slides[next].classList.add('on', 'kb');
      prev.classList.remove('on');
      setTimeout(() => prev.classList.remove('kb'), 2000);
      cur = next;
      load(slides[(cur + 1) % slides.length]);
    }, 6500);
  }

  // fumaça da abertura: nuvens macias subindo devagar, só enquanto o topo está na tela
  const smoke = document.querySelector('.hero-smoke');
  if (smoke && !reduce) {
    const ctx = smoke.getContext('2d');
    const puff = document.createElement('canvas');
    puff.width = puff.height = 128;
    const pc = puff.getContext('2d');
    const g = pc.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(92,92,94,.95)');
    g.addColorStop(0.45, 'rgba(70,70,72,.42)');
    g.addColorStop(1, 'rgba(48,48,50,0)');
    pc.fillStyle = g;
    pc.fillRect(0, 0, 128, 128);

    let w = 0, h = 0, running = false, last = 0;
    const parts = [];
    const spawn = (anywhere) => ({
      x: Math.random() * w * 1.1 - w * 0.05,
      y: anywhere ? h * (0.35 + Math.random() * 0.75) : h + Math.random() * h * 0.15,
      r: w * (0.07 + Math.random() * 0.1),
      grow: 1 + Math.random() * 1.2,
      vx: 4 + Math.random() * 10,
      vy: -(9 + Math.random() * 16),
      life: anywhere ? Math.random() : 0,
      span: 9 + Math.random() * 9,
      a: 0.16 + Math.random() * 0.2,
      sway: Math.random() * 6.28,
    });
    const resize = () => {
      w = smoke.width = Math.max(1, Math.round(smoke.clientWidth / 3));
      h = smoke.height = Math.max(1, Math.round(smoke.clientHeight / 3));
      parts.length = 0;
      const n = w > 300 ? 34 : 20;
      for (let i = 0; i < n; i++) parts.push(spawn(true));
    };
    const frame = (now) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.life += dt / p.span;
        if (p.life >= 1) { parts[i] = spawn(false); continue; }
        p.sway += dt * 0.5;
        p.x += (p.vx + Math.sin(p.sway) * 6) * dt / 3;
        p.y += p.vy * dt / 3;
        const r = p.r * (1 + p.grow * p.life);
        ctx.globalAlpha = p.a * Math.sin(p.life * Math.PI);
        ctx.drawImage(puff, p.x - r, p.y - r, r * 2, r * 2);
      }
      requestAnimationFrame(frame);
    };
    resize();
    addEventListener('resize', resize);
    new IntersectionObserver(([en]) => {
      const on = en.isIntersecting;
      if (on && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
      else if (!on) running = false;
    }).observe(smoke);
  }

  // revelação no scroll
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  // lightbox dos quadros
  const lb = document.getElementById('lightbox');
  const lbImg = lb.querySelector('img');
  const lbCap = lb.querySelector('figcaption');
  const frames = [...document.querySelectorAll('[data-full]')];
  let current = 0;

  const show = (i) => {
    current = (i + frames.length) % frames.length;
    const f = frames[current];
    lbImg.src = f.dataset.full;
    lbImg.alt = f.querySelector('img').alt;
    lbCap.textContent = f.querySelector('figcaption').textContent;
  };
  frames.forEach((f, i) => {
    f.tabIndex = 0;
    f.setAttribute('role', 'button');
    f.setAttribute('aria-label', `Ampliar foto: ${f.querySelector('img').alt}`);
    const open = (e) => {
      if (e.target.closest('a')) return;
      show(i);
      lb.showModal();
    };
    f.addEventListener('click', open);
    f.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); }
    });
  });
  lb.querySelector('.lb-close').addEventListener('click', () => lb.close());
  lb.querySelector('.lb-prev').addEventListener('click', () => show(current - 1));
  lb.querySelector('.lb-next').addEventListener('click', () => show(current + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
})();
