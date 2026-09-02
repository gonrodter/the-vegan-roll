/* The Vegan Roll — interacciones y animaciones ligadas al scroll.
   Sin dependencias externas: rAF + IntersectionObserver. */

(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mq = window.matchMedia('(max-width: 900px)');
  let mobile = mq.matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* El scrub del hero (la foto crece con el scroll) se mantiene en móvil:
     es la firma del diseño y es un transform sobre un solo elemento.
     Se apagan en móvil: el parallax de las imágenes (se veía raro y descolocado
     en pantalla estrecha), la galería (se pasa con el dedo) y las marquesinas
     (las mueve una animación CSS), que además obligaban a un rAF eterno. */
  const scrub = () => !reduced;
  const heavy = () => !reduced && !mobile;

  /* ---------- Menú ---------- */
  const burger = document.querySelector('[data-burger]');
  const nav = document.querySelector('[data-nav]');
  if (burger && nav) {
    let lockedAt = 0;
    const lock = (on) => {
      // position:fixed en vez de overflow:hidden: es lo único que para
      // el scroll de fondo en iOS Safari.
      if (on) {
        lockedAt = window.scrollY;
        document.body.style.top = `-${lockedAt}px`;
        document.body.classList.add('nav-lock');
      } else if (document.body.classList.contains('nav-lock')) {
        document.body.classList.remove('nav-lock');
        document.body.style.top = '';
        window.scrollTo(0, lockedAt);
      }
    };
    const setOpen = (open) => {
      document.body.classList.toggle('nav-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      nav.setAttribute('aria-hidden', String(!open));
      lock(open);
    };
    burger.addEventListener('click', () => {
      setOpen(!document.body.classList.contains('nav-open'));
    });
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) setOpen(false);
    });
  }

  /* ---------- Menú: imagen por palabra ---------- */
  const navMedia = document.querySelector('[data-nav-media]');
  if (navMedia) {
    const figures = [...navMedia.querySelectorAll('.nav__img')];
    // Sin nada señalado se muestra la imagen base.
    const show = (key) => {
      const target = key || '__base';
      figures.forEach((f) => f.classList.toggle('is-on', f.dataset.img === target));
    };
    show(null);
    if (burger) burger.addEventListener('click', () => show(null));
    const links = [...document.querySelectorAll('.nav__list a')];
    links.forEach((a) => {
      a.addEventListener('mouseenter', () => show(a.dataset.img));
      a.addEventListener('focus', () => show(a.dataset.img));
    });
    const list = document.querySelector('.nav__list');
    if (list) {
      list.addEventListener('mouseleave', () => show(null));
    }

    // La imagen acompaña ligeramente al cursor. Solo con ratón y solo
    // mientras el menú está abierto: antes era un rAF eterno.
    if (!reduced && window.matchMedia('(hover: hover)').matches) {
      let tx = 0, ty = 0, cx = 0, cy = 0, running = false;
      document.addEventListener('mousemove', (e) => {
        if (!document.body.classList.contains('nav-open')) return;
        tx = (e.clientX / window.innerWidth - 0.5) * 26;
        ty = (e.clientY / window.innerHeight - 0.5) * 26;
        if (!running) { running = true; requestAnimationFrame(drift); }
      }, { passive: true });
      const drift = () => {
        if (!document.body.classList.contains('nav-open')) { running = false; return; }
        cx = lerp(cx, tx, 0.06);
        cy = lerp(cy, ty, 0.06);
        navMedia.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
        requestAnimationFrame(drift);
      };
    }
  }

  /* ---------- Año en el footer ---------- */
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Reveal de bloques ---------- */

  /* Las fotos de cortinilla entran con un fundido en cuanto terminan de
     cargar. Así una foto que llega tarde no aparece de golpe, y —esto es lo
     importante— la cortinilla ya no tiene que esperar a la descarga completa:
     esa espera era justo lo que hacía que parecieran lentas.
     La clase va en <html> para que sin JS las imágenes se vean igualmente. */
  document.documentElement.classList.add('img-fade');
  document.querySelectorAll('[data-anim="mask"] > img').forEach((img) => {
    if (img.complete) {
      img.classList.add('is-loaded');
      return;
    }
    const done = () => img.classList.add('is-loaded');
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
  );
  document.querySelectorAll('[data-anim]').forEach((el) => io.observe(el));

  /* ---------- Palabras gigantes: letra a letra con desenfoque ---------- */
  const words = [...document.querySelectorAll('[data-word]')].map((el) => {
    const text = el.textContent.trim();
    el.textContent = '';
    const letters = [...text].map((ch) => {
      const s = document.createElement('span');
      s.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(s);
      return s;
    });
    return { el, letters, block: el.closest('.reveal-block') };
  });

  /* ---------- Elementos con parallax / scroll scrub ---------- */
  const heroMedia = document.querySelector('[data-hero-media]');
  const heroImg = heroMedia ? heroMedia.querySelector('img') : null;
  const parallaxes = [...document.querySelectorAll('[data-parallax]')];
  const galleries = [...document.querySelectorAll('[data-gallery]')];
  const header = document.querySelector('[data-header]');

  /* ---------- Marquees ---------- */
  const marquees = [...document.querySelectorAll('[data-marquee]')].map((track) => {
    // Duplicamos el contenido para que el bucle sea continuo.
    track.innerHTML += track.innerHTML;
    return { track, x: 0, w: 0, speed: parseFloat(track.dataset.marquee) || 0.45 };
  });

  const measure = () => {
    marquees.forEach((m) => { m.w = m.track.scrollWidth / 2; });
  };
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);

  /* ---------- Alto real de la cabecera como variable CSS ----------
     Lo usan el índice pegajoso de la carta y el menú. */
  const setHeaderVar = () => {
    if (header) document.documentElement.style.setProperty('--hh', `${Math.round(header.offsetHeight)}px`);
  };
  setHeaderVar();
  window.addEventListener('resize', setHeaderVar);
  window.addEventListener('load', setHeaderVar);

  /* ---------- Cambios de móvil <-> escritorio ---------- */
  const resetInline = () => {
    // Al cruzar el umbral hay que limpiar lo que dejó el modo anterior.
    if (mobile) {
      parallaxes.forEach((el) => { el.style.transform = ''; });
      galleries.forEach((el) => { el.style.transform = ''; });
      marquees.forEach((m) => { m.track.style.transform = ''; });
    }
  };
  const onMQ = () => {
    const wasMobile = mobile;
    mobile = mq.matches;
    resetInline();
    measure();
    // Al volver a escritorio hay que rearrancar el bucle continuo.
    if (wasMobile && !mobile) requestAnimationFrame(frame);
  };
  mq.addEventListener('change', onMQ);
  resetInline();

  let lastY = window.scrollY;
  let queued = false;

  const frame = () => {
    queued = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const delta = y - lastY;
    lastY = y;

    if (header) {
      header.classList.toggle('is-stuck', y > 12);
      // Se esconde al bajar y reaparece al subir.
      if (!document.body.classList.contains('nav-open') && Math.abs(delta) > 2) {
        header.classList.toggle('is-hidden', delta > 0 && y > 140);
      }
    }

    /* Hero: la foto arranca pequeña y crece con el scroll. También en móvil. */
    if (heroMedia && scrub()) {
      const p = clamp(y / (vh * 0.9));
      heroMedia.style.transform = `scale(${lerp(0.94, 1.14, p)})`;
      if (heroImg) heroImg.style.transform = `scale(${lerp(1.12, 1, p)}) translateY(${p * -3}%)`;
    }

    /* Palabras gigantes: progreso dentro del bloque. */
    if (!reduced) {
      words.forEach(({ letters, block }) => {
        if (!block) return;
        const r = block.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 1.5) return;
        const total = r.height + vh * 0.4;
        const p = clamp((vh * 0.85 - r.top) / total);
        const n = letters.length;
        letters.forEach((s, i) => {
          // Cada letra ocupa una ventana del progreso, con solape.
          const start = (i / n) * 0.5;
          const lp = clamp((p - start) / 0.2);
          s.style.opacity = String(lp);
          s.style.filter = `blur(${(1 - lp) * 16}px)`;
          s.style.transform = `translateY(${(1 - lp) * 0.12}em)`;
        });
      });
    }

    if (heavy()) {
      /* Parallax genérico. Solo en escritorio. */
      parallaxes.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const speed = parseFloat(el.dataset.parallax) || 0.12;
        const p = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.transform = `translate3d(0, ${(-p * speed * 100).toFixed(2)}px, 0)`;
      });

      /* Galería horizontal: se desplaza mientras la sección cruza la pantalla.
         En móvil se pasa con el dedo (scroll-snap), sin JS. */
      galleries.forEach((row) => {
        const sec = row.parentElement;
        const r = sec.getBoundingClientRect();
        if (r.bottom < -vh * 0.3 || r.top > vh * 1.3) return;
        const p = clamp((vh - r.top) / (vh + r.height));
        const travel = Math.max(0, row.scrollWidth - sec.clientWidth + 80) * 0.78;
        row.style.transform = `translate3d(${(-p * travel).toFixed(1)}px, 0, 0)`;
      });

      /* Marquesinas: velocidad base + empuje del scroll.
         En móvil las mueve una animación CSS, así el bucle puede dormir. */
      marquees.forEach((m) => {
        if (!m.w) return;
        m.x -= m.speed + delta * 0.35;
        if (m.x <= -m.w) m.x += m.w;
        if (m.x > 0) m.x -= m.w;
        m.track.style.transform = `translate3d(${m.x.toFixed(1)}px, 0, 0)`;
      });
    }

    // En escritorio el bucle es continuo (lo piden las marquesinas).
    // En móvil solo se despierta con el scroll: sin scroll, sin trabajo.
    if (!mobile) requestAnimationFrame(frame);
  };

  const request = () => {
    if (queued || !mobile) return;
    queued = true;
    requestAnimationFrame(frame);
  };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
  requestAnimationFrame(frame);

  /* ---------- Índice de la carta: sección activa ---------- */
  const menuLinks = [...document.querySelectorAll('[data-menu-nav] a')];
  if (menuLinks.length) {
    const sections = menuLinks
      .map((a) => document.querySelector(a.getAttribute('href')))
      .filter(Boolean);
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          menuLinks.forEach((a) => {
            a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`);
          });
        });
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    sections.forEach((s) => spy.observe(s));
  }
})();
