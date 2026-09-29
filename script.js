/* Vero — Portfólio · Hero (fundo) */
(() => {
  const hero = document.getElementById('hero');
  const img = document.getElementById('hero-img');
  const canvas = document.getElementById('sparkles');
  if (!hero || !img) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Entrada: revela a imagem quando estiver decodificada ---------- */
  const ready = () => hero.classList.add('is-ready');
  if (img.complete && img.naturalWidth) {
    (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(ready);
  } else {
    img.addEventListener('load', ready, { once: true });
    img.addEventListener('error', ready, { once: true });
  }

  /* ---------- Brilhos na grama (canvas) ---------- */
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    const IMG_W = 1490;
    const IMG_H = 1055;

    let W = 0, H = 0, dpr = 1;
    let particles = [];
    let running = true;

    // posição do object-position da imagem (ex.: "52% 64%")
    const objectPos = () => {
      const s = getComputedStyle(img).objectPosition.split(' ');
      return [parseFloat(s[0]) / 100 || 0.5, parseFloat(s[1]) / 100 || 0.5];
    };

    // mapeia coordenadas normalizadas da imagem (u, v) → pixels do canvas,
    // reproduzindo o recorte do object-fit: cover
    let map = { sx: 1, sy: 1, ox: 0, oy: 0 };
    const computeMap = () => {
      const scale = Math.max(W / IMG_W, H / IMG_H);
      const w = IMG_W * scale;
      const h = IMG_H * scale;
      const [px, py] = objectPos();
      map = { sx: w, sy: h, ox: (W - w) * px, oy: (H - h) * py };
    };

    // a estrada em S (coordenadas normalizadas da imagem): [v, centro, meia-largura]
    const ROAD = [
      [0.50, 0.60, 0.040],
      [0.52, 0.60, 0.045],
      [0.55, 0.63, 0.050],
      [0.60, 0.55, 0.065],
      [0.65, 0.49, 0.065],
      [0.75, 0.46, 0.075],
      [0.85, 0.45, 0.110],
      [1.00, 0.50, 0.200],
    ];
    const onRoad = (u, v) => {
      if (v < ROAD[0][0]) return false;
      for (let i = 1; i < ROAD.length; i++) {
        const [v0, c0, w0] = ROAD[i - 1];
        const [v1, c1, w1] = ROAD[i];
        if (v <= v1) {
          const t = (v - v0) / (v1 - v0);
          const c = c0 + (c1 - c0) * t;
          const w = w0 + (w1 - w0) * t + 0.015;   // margem
          return Math.abs(u - c) < w;
        }
      }
      return false;
    };

    const rand = (a, b) => a + Math.random() * (b - a);

    const build = () => {
      const count = Math.min(280, Math.round((W * H) / 7500));
      particles = [];
      let guard = 0;
      while (particles.length < count && guard++ < count * 6) {
        const u = Math.random();
        // mais densidade nas colinas próximas (parte baixa da imagem)
        const v = 0.46 + 0.54 * Math.sqrt(Math.random());
        if (onRoad(u, v)) continue;
        const near = (v - 0.46) / 0.54;        // 0 longe, 1 perto
        particles.push({
          u, v,
          r: rand(0.6, 1.1) + near * rand(0.4, 1.4),
          phase: Math.random() * Math.PI * 2,
          speed: rand(0.5, 1.5),
          glint: Math.random() < 0.14,
          warm: Math.random() < 0.35,
        });
      }
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.round(r.width);
      H = Math.round(r.height);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      computeMap();
      build();
    };

    const draw = (now) => {
      if (!running) return;
      const t = now / 1000;
      ctx.clearRect(0, 0, W, H);

      for (const p of particles) {
        const s = 0.5 + 0.5 * Math.sin(t * p.speed + p.phase);
        const a = 0.18 + 0.82 * s * s;
        const x = map.ox + p.u * map.sx;
        const y = map.oy + p.v * map.sy;
        if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;

        const col = p.warm ? '255, 236, 214' : '255, 255, 255';

        // halo
        ctx.beginPath();
        ctx.fillStyle = `rgba(${col}, ${(a * 0.22).toFixed(3)})`;
        ctx.arc(x, y, p.r * 2.6, 0, Math.PI * 2);
        ctx.fill();

        // núcleo
        ctx.beginPath();
        ctx.fillStyle = `rgba(${col}, ${a.toFixed(3)})`;
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fill();

        // faísca em cruz quando está no pico
        if (p.glint && a > 0.75) {
          const len = p.r * (2 + (a - 0.75) * 14);
          ctx.strokeStyle = `rgba(${col}, ${((a - 0.75) * 3).toFixed(3)})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(x - len, y); ctx.lineTo(x + len, y);
          ctx.moveTo(x, y - len); ctx.lineTo(x, y + len);
          ctx.stroke();
        }
      }
      requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', () => {
      const wasRunning = running;
      running = !document.hidden;
      if (running && !wasRunning) requestAnimationFrame(draw);
    });
    requestAnimationFrame(draw);
  }
})();

/* ---------- Serviços: cards anteriores encolhem conforme o próximo cobre ---------- */
(() => {
  const cards = Array.from(document.querySelectorAll('#stack .card'));
  if (cards.length < 2) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  let ticking = false;
  const update = () => {
    ticking = false;
    for (let i = 0; i < cards.length - 1; i++) {
      const cur = cards[i].getBoundingClientRect();
      const next = cards[i + 1].getBoundingClientRect();
      // 0 = próximo ainda abaixo; 1 = próximo cobriu este card
      const p = Math.min(1, Math.max(0, (cur.bottom - next.top) / cur.height));
      const s = 1 - p * 0.06;
      cards[i].style.transform = `scale(${s.toFixed(4)})`;
      cards[i].style.filter = `brightness(${(1 - p * 0.35).toFixed(3)})`;
    }
    const last = cards[cards.length - 1];
    last.style.transform = '';
    last.style.filter = '';
  };
  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
})();


/* ---------- Resultados: chips posicionados sobre os arcos (estáticos) ---------- */
(() => {
  const chips = Array.from(document.querySelectorAll('.results .chip'));
  if (!chips.length) return;

  // geometria (em % da largura do palco): centro dos arcos e raios
  const CY = 53.3;
  const R = { outer: 46.7, mid: 35.8, inner: 25 };

  for (const el of chips) {
    const r = R[el.dataset.ring] || R.mid;
    const a = (parseFloat(el.dataset.angle) || 0) * Math.PI / 180;
    el.style.setProperty('--x', (50 + r * Math.sin(a)).toFixed(2));
    el.style.setProperty('--y', (CY - r * Math.cos(a)).toFixed(2));
    el.style.setProperty('--o', '1');
  }
})();


/* ---------- Trabalhos: carrossel em arco ---------- */
(() => {
  const wrap = document.querySelector('.marquee');
  const track = wrap && wrap.querySelector('.marquee-track');
  if (!track) return;
  const items = Array.from(track.children);
  const shots = items.map((li) => li.querySelector('.shot'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let offset = 0;          // deslocamento da faixa (px)
  let half = 0;            // largura de meia faixa (a lista está duplicada)
  let paused = false;
  let last = 0;
  const SPEED = 42;        // px por segundo

  const measure = () => {
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    // a lista está duplicada: meia faixa = metade da soma das larguras + gaps
    // offsetWidth (layout) e não getBoundingClientRect, que já vem com o 3D aplicado
    let w = 0;
    for (const li of items) w += li.offsetWidth;
    half = (w + gap * items.length) / 2;
  };

  const layout = () => {
    const vw = wrap.clientWidth;
    const mid = vw / 2;
    for (let i = 0; i < items.length; i++) {
      const li = items[i];
      const c = li.offsetLeft + li.offsetWidth / 2 - offset;
      // -1 (borda esquerda) … 0 (centro) … 1 (borda direita)
      let n = (c - mid) / mid;
      n = Math.max(-1.6, Math.min(1.6, n));
      // fade suave nas bordas, para o card não surgir/sumir de repente
      const fade = Math.max(0, Math.min(1, (1.45 - Math.abs(n)) / 0.35));
      shots[i].style.setProperty('--n', n.toFixed(4));
      shots[i].style.setProperty('--fade', fade.toFixed(3));
    }
    track.style.transform = `translate3d(${(-offset).toFixed(2)}px, 0, 0)`;
  };

  const tick = (now) => {
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!paused && !reduceMotion) {
      offset += SPEED * dt;
      if (offset >= half) offset -= half;
    }
    layout();
    requestAnimationFrame(tick);
  };

  wrap.addEventListener('pointerenter', () => { paused = true; });
  wrap.addEventListener('pointerleave', () => { paused = false; });
  window.addEventListener('resize', measure, { passive: true });

  measure();
  layout();
  requestAnimationFrame(tick);
})();

/* ---------- Header: menu mobile + estado ao rolar ---------- */
(() => {
  const header = document.getElementById('header');
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('site-nav');
  if (!header) return;

  const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 24);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (!toggle || !nav) return;
  const setOpen = (open) => {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };
  toggle.addEventListener('click', () => setOpen(!header.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.tagName === 'A') setOpen(false); });
  document.addEventListener('click', (e) => { if (!header.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
})();
