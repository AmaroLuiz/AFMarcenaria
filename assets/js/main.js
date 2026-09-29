/* =========================================================
   Amarus Freire Marcenaria - interações e movimento

   Dependências (CDN, carregadas com defer no <head>):
   GSAP 3.15 + ScrollTrigger + SplitText, Lenis 1.3.
   Tudo aqui é progressivo: sem as bibliotecas, sem JS ou com
   "reduzir movimento" ativo, o conteúdo aparece completo e estático.

   00. Configuração
   01. Utilidades
   02. Base (sem dependências): ano, nav, menu, âncoras, formulário
   03. Movimento: Lenis, entrada, reveals, projetos, materiais,
       processo, números, cursor
   ========================================================= */
(() => {
  'use strict';

  window.__afBoot = true;

  /* ---------- 00. Configuração: troque aqui ---------- */
  const CONFIG = {
    // WhatsApp da marcenaria: DDI 55 + DDD 44 + número, só dígitos.
    // Troque também nos links do index.html (procure por 5544900000000).
    whatsapp: '5544900000000',
    // Endpoint opcional para receber o formulário (Formspree, Getform, backend próprio).
    // Vazio: o pedido é montado e aberto direto no WhatsApp.
    formEndpoint: '',
  };


  /* ---------- 01. Utilidades ---------- */
  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqDesktop = window.matchMedia('(min-width: 1024px)');
  const mqFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const hasGSAP = Boolean(window.gsap && window.ScrollTrigger);
  const hasSplit = Boolean(window.SplitText);

  let lenis = null;           // instância de rolagem suave (só com movimento)
  let lenisTick = null;       // função registrada no ticker do GSAP
  let closeMenu = () => {};   // definido em initMenu

  // Máscaras de revelação de imagem (clip-path), por direção.
  const INSETS = {
    up: 'inset(100% 0% 0% 0%)',
    left: 'inset(0% 100% 0% 0%)',
    right: 'inset(0% 0% 0% 100%)',
  };


  /* ---------- 02. Base ---------- */
  setYear();
  initNavState();
  initMenu();
  initAnchors();
  initForm();
  primeProjectImages();

  if (hasGSAP) {
    try {
      initMotion();
    } catch (err) {
      console.error('[motion]', err);
      root.classList.remove('motion');
    }
  } else {
    root.classList.remove('motion');
  }


  /* Fotos dos projetos: no trilho horizontal elas ficam fora da tela na lateral,
     onde o lazy loading nativo pode atrasar. Ao se aproximar da seção, carrega todas. */
  function primeProjectImages() {
    const section = $('.projects');
    if (!section) return;
    const imgs = $$('.project__frame img', section);
    const load = () => imgs.forEach((img) => { img.loading = 'eager'; });
    if (!('IntersectionObserver' in window)) { load(); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { load(); io.disconnect(); }
    }, { rootMargin: '150% 0px 150% 0px' });
    io.observe(section);
  }

  function setYear() {
    const year = String(new Date().getFullYear());
    $$('[data-year]').forEach((el) => { el.textContent = year; });
  }

  /* Nav sólida quando sai de cima da foto de entrada.
     Observa o painel claro do hero: assim a nav nunca fica clara sobre claro. */
  function initNavState() {
    const nav = $('[data-nav]');
    const panel = $('[data-hero-panel]');
    if (!nav) return;
    if (!panel || !('IntersectionObserver' in window)) {
      nav.classList.add('is-solid');
      return;
    }
    let io = null;
    const observe = () => {
      if (io) io.disconnect();
      const navH = nav.offsetHeight;
      io = new IntersectionObserver(([entry]) => {
        nav.classList.toggle('is-solid', entry.boundingClientRect.top < navH);
      }, { rootMargin: `-${navH}px 0px 0px 0px`, threshold: [0, 1] });
      io.observe(panel);
    };
    observe();
    window.addEventListener('resize', debounce(observe, 200));

    // Se alguém navega pelo teclado até a nav escondida, ela reaparece.
    nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));
  }

  /* Menu em tela cheia (celular/tablet), padrão disclosure: o botão da nav abre e fecha,
     o conteúdo atrás fica inerte, o foco fica preso no menu, Esc fecha. */
  function initMenu() {
    const toggle = $('.nav__toggle');
    const menu = $('#menu');
    if (!toggle || !menu) return;

    const background = [$('main'), $('.footer'), $('.skip-link')].filter(Boolean);
    const setBackgroundInert = (value) => background.forEach((el) => { el.inert = value; });
    const focusables = () => [toggle, ...$$('a, button', menu)];

    const onKeydown = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
      if (e.key !== 'Tab') return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    function open() {
      menu.inert = false;
      setBackgroundInert(true);
      menu.classList.add('is-open');
      root.classList.add('menu-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Fechar menu');
      if (lenis) lenis.stop();
      document.addEventListener('keydown', onKeydown);
      const firstLink = $('a', menu);
      if (firstLink) firstLink.focus({ preventScroll: true });
    }

    function close(returnFocus = false) {
      if (!menu.classList.contains('is-open')) return;
      menu.classList.remove('is-open');
      root.classList.remove('menu-open');
      menu.inert = true;
      setBackgroundInert(false);
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menu');
      if (lenis) lenis.start();
      document.removeEventListener('keydown', onKeydown);
      if (returnFocus) toggle.focus({ preventScroll: true });
    }

    closeMenu = close;
    toggle.addEventListener('click', () => {
      if (menu.classList.contains('is-open')) close(true); else open();
    });
    mqDesktop.addEventListener('change', (e) => { if (e.matches) close(false); });
  }

  /* Âncoras internas: rolagem suave (Lenis quando ativo) e foco no destino. */
  function initAnchors() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const hash = link.getAttribute('href');
      if (hash.length < 2) return;
      const target = document.getElementById(hash.slice(1));
      if (!target) return;

      e.preventDefault();
      if (link.dataset.prefill) applyPrefill(link.dataset.prefill);
      closeMenu(false);
      scrollToTarget(target);
      if (history.pushState) history.pushState(null, '', hash);
    });
  }

  function scrollToTarget(target) {
    const focusTarget = () => {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    };
    if (lenis) {
      lenis.scrollTo(target, { duration: 1.6, onComplete: focusTarget });
    } else {
      target.scrollIntoView({ behavior: mqReduce.matches ? 'auto' : 'smooth', block: 'start' });
      focusTarget();
    }
  }

  /* Pré-preenche o formulário a partir de um link (ex.: bloco para arquitetos). */
  function applyPrefill(spec) {
    const [name, value] = spec.split(':');
    const form = $('[data-quote-form]');
    if (!form || !name) return;
    const radio = $$(`input[name="${name}"]`, form).find((input) => input.value.toLowerCase() === String(value).toLowerCase());
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }


  /* ---------- 02b. Formulário de orçamento ---------- */
  function initForm() {
    const form = $('[data-quote-form]');
    if (!form) return;

    const success = $('[data-form-success]');
    const status = $('[data-form-status]', form);
    const submitBtn = $('[data-submit]', form);
    const submitLabel = $('[data-submit-label]', form);
    const phone = form.elements.whatsapp;

    const rules = {
      nome: (v) => (v.trim().length >= 2 ? '' : 'Informe seu nome.'),
      whatsapp: (v) => {
        const digits = v.replace(/\D/g, '');
        if (!digits) return 'Informe seu WhatsApp.';
        return digits.length >= 10 && digits.length <= 11 ? '' : 'Informe um número com DDD, como (44) 99999-9999.';
      },
      cidade: (v) => (v.trim().length >= 2 ? '' : 'Informe sua cidade.'),
      ambiente: (v) => (v ? '' : 'Escolha o ambiente.'),
      projeto: (v) => (v ? '' : 'Selecione sim ou não.'),
    };

    const valueOf = (name) => {
      const el = form.elements[name];
      if (!el) return '';
      return typeof el.value === 'string' ? el.value : '';
    };

    const fieldWrap = (name) => {
      const el = form.elements[name];
      const node = el instanceof RadioNodeList ? el[0] : el;
      return node ? node.closest('.field') : null;
    };

    const setError = (name, message) => {
      const wrap = fieldWrap(name);
      const errorEl = $(`[data-error-for="${name}"]`, form);
      const el = form.elements[name];
      const inputs = el instanceof RadioNodeList ? Array.from(el) : [el];
      if (wrap) wrap.classList.toggle('is-invalid', Boolean(message));
      if (errorEl) errorEl.textContent = message;
      inputs.forEach((input) => {
        if (!input) return;
        if (message) input.setAttribute('aria-invalid', 'true');
        else input.removeAttribute('aria-invalid');
      });
      if (el instanceof RadioNodeList && wrap) {
        if (message) wrap.setAttribute('aria-invalid', 'true');
        else wrap.removeAttribute('aria-invalid');
      }
    };

    const validate = (name) => {
      const message = rules[name](valueOf(name));
      setError(name, message);
      return !message;
    };

    // Máscara do WhatsApp: (44) 99999-9999
    if (phone) {
      phone.addEventListener('input', () => { phone.value = maskPhone(phone.value); });
    }

    // Validação: no blur (depois do primeiro contato) e ao corrigir.
    Object.keys(rules).forEach((name) => {
      const el = form.elements[name];
      const isGroup = el instanceof RadioNodeList;
      const inputs = isGroup ? Array.from(el) : [el];
      const isInvalid = () => fieldWrap(name)?.classList.contains('is-invalid');
      inputs.forEach((input) => {
        if (!input) return;
        if (isGroup) {
          // Sim/Não: valida só ao escolher (passar pelo Tab não gera erro).
          input.addEventListener('change', () => validate(name));
          return;
        }
        input.addEventListener('blur', () => {
          if (input.dataset.touched || input.value) { input.dataset.touched = '1'; validate(name); }
        });
        input.addEventListener('input', () => { if (isInvalid()) validate(name); });
        input.addEventListener('change', () => { if (isInvalid()) validate(name); });
      });
    });

    const setStatus = (message, isError = false) => {
      status.classList.toggle('is-error', isError);
      status.innerHTML = message;
    };

    const setLoading = (loading) => {
      submitBtn.disabled = loading;
      submitBtn.setAttribute('aria-busy', String(loading));
      submitLabel.textContent = loading ? 'Enviando...' : 'Pedir orçamento';
    };

    const collect = () => ({
      nome: valueOf('nome').trim(),
      whatsapp: valueOf('whatsapp').trim(),
      cidade: valueOf('cidade').trim(),
      ambiente: valueOf('ambiente'),
      projeto: valueOf('projeto'),
      prazo: valueOf('prazo') || 'Não informado',
      mensagem: valueOf('mensagem').trim(),
    });

    const buildMessage = (d) => [
      'Olá! Gostaria de pedir um orçamento.',
      '',
      `Nome: ${d.nome}`,
      `WhatsApp: ${d.whatsapp}`,
      `Cidade: ${d.cidade}`,
      `Ambiente: ${d.ambiente}`,
      `Já tem projeto? ${d.projeto}`,
      `Prazo desejado: ${d.prazo}`,
      d.mensagem ? `Mensagem: ${d.mensagem}` : '',
    ].filter((line, i, arr) => line !== '' || (i > 0 && arr[i - 1] !== '')).join('\n').trim();

    const whatsappUrl = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;

    const showSuccess = (mode, url) => {
      const title = $('[data-success-title]', success);
      const text = $('[data-success-text]', success);
      const link = $('[data-success-link]', success);
      if (mode === 'endpoint') {
        title.textContent = 'Pedido recebido.';
        text.textContent = 'Obrigado. Em breve falamos com você pelo WhatsApp para marcar a conversa inicial.';
        link.href = `https://wa.me/${CONFIG.whatsapp}`;
      } else {
        title.textContent = 'Pedido pronto.';
        text.textContent = 'Abrimos o WhatsApp com o seu pedido já escrito. É só enviar a mensagem por lá. Se a janela não abriu, use o link abaixo.';
        link.href = url;
      }
      form.hidden = true;
      success.hidden = false;
      success.focus({ preventScroll: true });
      if (hasGSAP) ScrollTrigger.refresh();
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      setStatus('');

      // Anti-spam: campo invisível preenchido = robô.
      if (form.elements.empresa && form.elements.empresa.value) return;

      const invalid = Object.keys(rules).filter((name) => !validate(name));
      if (invalid.length) {
        setStatus('Revise os campos destacados para continuar.', true);
        const first = form.elements[invalid[0]];
        const focusEl = first instanceof RadioNodeList ? first[0] : first;
        if (focusEl) focusEl.focus();
        return;
      }

      const data = collect();

      if (!CONFIG.formEndpoint) {
        const url = whatsappUrl(buildMessage(data));
        window.open(url, '_blank', 'noopener');
        showSuccess('whatsapp', url);
        return;
      }

      setLoading(true);
      fetch(CONFIG.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          showSuccess('endpoint');
        })
        .catch(() => {
          const url = whatsappUrl(buildMessage(data));
          setStatus(`Não foi possível enviar agora. Tente de novo ou <a href="${url}" target="_blank" rel="noopener">envie pelo WhatsApp</a>.`, true);
        })
        .finally(() => setLoading(false));
    });

    // "Fazer outro pedido"
    const resetBtn = $('[data-form-reset]', success);
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        form.reset();
        Object.keys(rules).forEach((name) => setError(name, ''));
        $$('[data-touched]', form).forEach((el) => delete el.dataset.touched);
        setStatus('');
        success.hidden = true;
        form.hidden = false;
        form.elements.nome.focus();
        if (hasGSAP) ScrollTrigger.refresh();
      });
    }
  }

  function maskPhone(value) {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }


  /* =========================================================
     03. MOVIMENTO
     gsap.matchMedia reverte tudo automaticamente se a pessoa
     ativar "reduzir movimento" ou mudar de breakpoint.
     ========================================================= */
  function initMotion() {
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    if (hasSplit) gsap.registerPlugin(window.SplitText);

    gsap.defaults({ ease: 'expo.out', duration: 1.2 });
    ScrollTrigger.config({ ignoreMobileResize: true });

    const mm = gsap.matchMedia();

    /* --- 03a. Trilho de projetos + parallax + cursor (desktop) ---
       Criado primeiro: o pin precisa ser calculado antes das seções abaixo. */
    mm.add({
      desktop: '(min-width: 1024px)',
      motion: '(prefers-reduced-motion: no-preference)',
    }, (ctx) => {
      const { desktop, motion } = ctx.conditions;
      if (!motion) return undefined;
      const section = $('.projects');
      if (!desktop) {
        if (section) projectsVertical(section);
        return undefined;
      }
      const cleanups = [];
      if (section) cleanups.push(projectsHorizontal(section));
      cleanups.push(parallax());
      requestAnimationFrame(() => ScrollTrigger.refresh());
      return () => cleanups.forEach((fn) => fn && fn());
    });

    /* --- 03b. Tudo o que vale para qualquer tela --- */
    mm.add({ motion: '(prefers-reduced-motion: no-preference)' }, (ctx) => {
      if (!ctx.conditions.motion) {
        root.classList.remove('motion');
        return undefined;
      }
      initLenis();
      heroIntro(ctx);
      splitReveals();
      manifestoScrub();
      fadeReveals();
      imageReveals();
      materialsZoom();
      const offProcess = processProgress();
      const offCounters = counters();
      navAutoHide();

      return () => {
        destroyLenis();
        offProcess();
        offCounters();
        root.classList.remove('motion');
      };
    });

    // Recalcula posições quando as fontes terminam de carregar.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
  }

  /* ---------- Lenis (rolagem suave) ---------- */
  function initLenis() {
    if (!window.Lenis || lenis) return;
    lenis = new window.Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
    });
    lenis.on('scroll', window.ScrollTrigger.update);
    lenisTick = (time) => lenis.raf(time * 1000);
    window.gsap.ticker.add(lenisTick);
    window.gsap.ticker.lagSmoothing(0);
  }
  function destroyLenis() {
    if (!lenis) return;
    window.gsap.ticker.remove(lenisTick);
    window.gsap.ticker.lagSmoothing(500, 33);
    lenis.destroy();
    lenis = null;
  }

  /* ---------- Entrada: foto se abre, título sobe em linhas, painel desliza ---------- */
  function heroIntro(ctx) {
    const { gsap } = window;
    const hero = $('.hero');
    if (!hero) { root.classList.remove('motion'); return; }

    const media = $('[data-hero-media]', hero);
    const parallaxLayer = $('[data-hero-parallax]', hero);
    const img = $('img', media);
    const content = $('[data-hero-content]', hero);
    const title = $('.hero__title', hero);
    const eyebrow = $('.hero__eyebrow', hero);
    const lines = $$('.hero__line', hero);
    const panel = $('[data-hero-panel]', hero);
    const nav = $('[data-nav]');

    const imgReady = img && img.decode ? img.decode().catch(() => {}) : Promise.resolve();
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    // Em conexão lenta a entrada não espera mais que isso: o CTA precisa chegar cedo.
    const timeout = new Promise((resolve) => setTimeout(resolve, 1400));

    Promise.race([Promise.all([imgReady, fontsReady]), timeout]).then(() => {
      ctx.add(() => {
        const small = !mqDesktop.matches;
        const split = hasSplit
          ? window.SplitText.create(lines, { type: 'lines', mask: 'lines', linesClass: 'split-line', tag: 'span' })
          : null;
        const lineTargets = split ? split.lines : lines;

        // Durante a abertura, o entorno da foto é o fundo claro da página.
        hero.classList.add('is-intro');
        const tl = gsap.timeline({
          defaults: { ease: 'expo.out' },
          onComplete: () => {
            hero.classList.remove('is-intro');
            if (split) split.revert();
          },
        });

        // Uma abertura lenta, mas com o CTA disponível em cerca de 2 s.
        tl.fromTo(media,
          { clipPath: small ? 'inset(16% 12% 16% 12%)' : 'inset(24% 33% 24% 33%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: small ? 1.4 : 1.7, ease: 'expo.inOut' }, 0)
          .fromTo(img, { scale: 1.45 }, { scale: 1, duration: small ? 1.9 : 2.4, ease: 'expo.inOut' }, 0)
          .from(eyebrow, { yPercent: 60, opacity: 0, duration: 1.2 }, small ? 0.8 : 1.0)
          .from(lineTargets, { yPercent: 118, duration: 1.4, stagger: 0.1 }, small ? 0.85 : 1.05)
          .fromTo(panel, { yPercent: 101 }, { yPercent: 0, duration: 1.2, ease: 'expo.inOut', clearProps: 'transform' }, small ? 0.8 : 0.95)
          .from(panel.children, { y: 24, opacity: 0, duration: 1.1, stagger: 0.08, clearProps: 'transform,opacity' }, '>-0.55')
          .from(nav, { yPercent: -100, opacity: 0, duration: 1.2, clearProps: 'transform,opacity' }, small ? 1.0 : 1.25);

        gsap.set([media, title, panel, nav], { visibility: 'visible' });
        root.classList.remove('motion');

        // Parallax sutil na saída da entrada.
        gsap.to(parallaxLayer, {
          yPercent: 14,
          ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
        });
        gsap.to(content, {
          yPercent: -18,
          ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
        });
      });
    });
  }

  /* ---------- Títulos entram em linhas (máscara) ---------- */
  function splitReveals() {
    const { gsap } = window;
    $$('[data-split]').forEach((el) => {
      if (!hasSplit) {
        gsap.from(el, { y: 30, opacity: 0, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
        return;
      }
      window.SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'split-line',
        tag: 'span',
        autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, {
          yPercent: 115,
          duration: 1.3,
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }),
      });
    });
  }

  /* ---------- Manifesto revelado linha a linha, preso à rolagem ---------- */
  function manifestoScrub() {
    const { gsap } = window;
    const el = $('[data-split-scrub]');
    if (!el) return;
    if (!hasSplit) {
      gsap.from(el, { y: 40, opacity: 0, scrollTrigger: { trigger: el, start: 'top 80%', once: true } });
      return;
    }
    window.SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      tag: 'span',
      autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, {
        yPercent: 100,
        opacity: 0,
        ease: 'power2.out',
        stagger: 0.3,
        scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 58%', scrub: 1 },
      }),
    });
  }

  /* ---------- Textos de apoio sobem com fade ---------- */
  function fadeReveals() {
    const { gsap, ScrollTrigger } = window;
    const items = $$('[data-fade]');
    if (!items.length) return;
    gsap.set(items, { y: 28, opacity: 0 });
    ScrollTrigger.batch(items, {
      start: 'top 90%',
      once: true,
      onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 1.2, stagger: 0.08, overwrite: true }),
    });
  }

  /* ---------- Imagens reveladas por máscara (clip-path) ---------- */
  function revealFrame(frame, dir = 'up', scrollTrigger = null) {
    const { gsap } = window;
    const img = $('img', frame);
    const tl = gsap.timeline({ scrollTrigger: scrollTrigger || { trigger: frame, start: 'top 88%', once: true } });
    tl.fromTo(frame, { clipPath: INSETS[dir] || INSETS.up }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut' });
    // Texturas já têm zoom próprio (materialsZoom), então não recebem escala aqui.
    if (img && !frame.hasAttribute('data-texture')) {
      tl.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 2, ease: 'expo.out' }, 0);
    }
    return tl;
  }
  function imageReveals() {
    $$('[data-reveal]').forEach((frame) => revealFrame(frame, frame.dataset.reveal || 'up'));
  }

  /* ---------- Parallax sutil em fotos selecionadas (desktop) ---------- */
  function parallax() {
    const { gsap } = window;
    const frames = $$('[data-parallax]');
    frames.forEach((frame) => {
      frame.classList.add('has-parallax');
      const img = $('img', frame);
      gsap.fromTo(img, { yPercent: -6 }, {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
    return () => frames.forEach((frame) => frame.classList.remove('has-parallax'));
  }

  /* ---------- Materiais: zoom lento na textura ---------- */
  function materialsZoom() {
    const { gsap } = window;
    const small = !mqDesktop.matches;
    $$('[data-texture]').forEach((frame) => {
      const img = $('img', frame);
      gsap.fromTo(img, { scale: small ? 1.18 : 1.32 }, {
        scale: 1.02,
        ease: 'none',
        scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  }

  /* ---------- Projetos: trilho horizontal fixado (desktop) ---------- */
  function projectsHorizontal(section) {
    const { gsap } = window;
    const pin = $('[data-projects-pin]', section);
    const track = $('[data-projects-track]', section);
    const bar = $('.projects__progress span', section);

    section.classList.add('is-horizontal');
    const distance = () => Math.max(0, track.scrollWidth - pin.clientWidth);

    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        refreshPriority: 1,
      },
      onUpdate() { if (bar) bar.style.transform = `scaleX(${this.progress()})`; },
    });

    const viewport = window.innerWidth;
    $$('.project', track).forEach((fig) => {
      const frame = $('.project__frame', fig);
      const img = $('img', frame);
      const info = $('.project__info', fig);

      // Parallax lateral dentro da moldura.
      gsap.fromTo(img, { xPercent: -6 }, {
        xPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: frame, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
      });

      // As que já aparecem ao chegar na seção revelam pela rolagem vertical;
      // as demais, conforme entram pela direita.
      const visibleAtStart = fig.getBoundingClientRect().left < viewport;
      const trigger = visibleAtStart
        ? { trigger: section, start: 'top 45%', once: true }
        : { trigger: frame, containerAnimation: tween, start: 'left 88%', once: true };
      const tl = revealFrame(frame, 'right', trigger);
      tl.from(info.children, { y: 16, opacity: 0, duration: 1, stagger: 0.08 }, 0.7);
    });

    const offCursor = initCursor(section, pin, tween.scrollTrigger);

    // Teclado: ao focar algo dentro do trilho (ex.: o botão final), rola a página até
    // a posição horizontal correspondente, em vez de deixar o foco fora da tela.
    const onFocusIn = (e) => {
      if (!track.contains(e.target)) return;
      const st = tween.scrollTrigger;
      const x = e.target.getBoundingClientRect().left - track.getBoundingClientRect().left;
      const target = st.start + gsap.utils.clamp(0, distance(), x - window.innerWidth * 0.3);
      if (lenis) lenis.scrollTo(target, { immediate: true });
      else window.scrollTo(0, target);
    };
    pin.addEventListener('focusin', onFocusIn);

    return () => {
      pin.removeEventListener('focusin', onFocusIn);
      offCursor();
      section.classList.remove('is-horizontal');
      if (bar) bar.style.transform = '';
    };
  }

  /* ---------- Projetos: sequência vertical (celular) ---------- */
  function projectsVertical(section) {
    $$('.project', section).forEach((fig) => {
      const frame = $('.project__frame', fig);
      const tl = revealFrame(frame, 'up');
      tl.from($('.project__info', fig).children, { y: 16, opacity: 0, duration: 1, stagger: 0.08 }, 0.6);
    });
  }

  /* ---------- Cursor discreto sobre os projetos + arrastar para navegar ---------- */
  function initCursor(section, pin, st) {
    const { gsap } = window;
    const cursor = $('.cursor');
    if (!cursor || !mqFinePointer.matches) return () => {};

    const frames = $$('.project__frame', section);
    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.55, ease: 'power3' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.55, ease: 'power3' });

    let dragging = false;
    let startX = 0;
    let startScroll = 0;

    const onMove = (e) => {
      xTo(e.clientX);
      yTo(e.clientY);
      if (!dragging) return;
      const target = gsap.utils.clamp(st.start, st.end, startScroll + (startX - e.clientX) * 1.6);
      if (lenis) lenis.scrollTo(target, { immediate: true });
      else window.scrollTo(0, target);
    };
    const onEnter = (e) => {
      gsap.set(cursor, { x: e.clientX, y: e.clientY });
      xTo(e.clientX);
      yTo(e.clientY);
      cursor.classList.add('is-active');
    };
    const onLeave = () => cursor.classList.remove('is-active');
    const onDown = (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('a, button')) return;
      dragging = true;
      startX = e.clientX;
      startScroll = lenis ? lenis.scroll : window.scrollY;
      section.classList.add('is-dragging');
      cursor.classList.add('is-pressed');
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      section.classList.remove('is-dragging');
      cursor.classList.remove('is-pressed');
    };

    section.classList.add('has-cursor');
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('blur', onUp);
    pin.addEventListener('pointerdown', onDown);
    frames.forEach((f) => {
      f.addEventListener('pointerenter', onEnter);
      f.addEventListener('pointerleave', onLeave);
    });

    return () => {
      section.classList.remove('has-cursor', 'is-dragging');
      cursor.classList.remove('is-active', 'is-pressed');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onUp);
      pin.removeEventListener('pointerdown', onDown);
      frames.forEach((f) => {
        f.removeEventListener('pointerenter', onEnter);
        f.removeEventListener('pointerleave', onLeave);
      });
    };
  }

  /* ---------- Processo: fio preenchido e etapas acendendo ---------- */
  function processProgress() {
    const { gsap, ScrollTrigger } = window;
    const section = $('.process');
    const list = $('.process__list');
    const fill = $('.process__fill');
    if (!section || !list || !fill) return () => {};

    section.classList.add('is-live');
    gsap.fromTo(fill, { scaleY: 0 }, {
      scaleY: 1,
      ease: 'none',
      scrollTrigger: { trigger: list, start: 'top 65%', end: 'bottom 65%', scrub: true },
    });
    const steps = $$('.step', list);
    steps.forEach((step) => {
      ScrollTrigger.create({
        trigger: step,
        start: 'top 65%',
        onEnter: () => step.classList.add('is-reached'),
        onLeaveBack: () => step.classList.remove('is-reached'),
      });
    });
    return () => {
      section.classList.remove('is-live');
      steps.forEach((step) => step.classList.remove('is-reached'));
    };
  }

  /* ---------- Números: contagem animada ---------- */
  function counters() {
    const { gsap, ScrollTrigger } = window;
    const items = $$('[data-count]');
    const finals = items.map((el) => $('.stat__live', el).textContent);

    items.forEach((el) => {
      const live = $('.stat__live', el);
      const to = Number(el.dataset.count) || 0;
      const prefix = el.dataset.prefix || '';
      const state = { v: 0 };
      live.textContent = `${prefix}0`;
      gsap.from(el, { yPercent: 18, opacity: 0, duration: 1.4, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => gsap.to(state, {
          v: to,
          duration: to > 10 ? 2.4 : 1.6,
          ease: 'power3.out',
          onUpdate: () => { live.textContent = `${prefix}${Math.round(state.v)}`; },
        }),
      });
    });

    return () => items.forEach((el, i) => { $('.stat__live', el).textContent = finals[i]; });
  }

  /* ---------- Nav some ao descer e volta ao subir ---------- */
  function navAutoHide() {
    const { ScrollTrigger } = window;
    const nav = $('[data-nav]');
    if (!nav) return;
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        if (root.classList.contains('menu-open')) return;
        const goingDown = self.direction === 1;
        nav.classList.toggle('is-hidden', goingDown && self.scroll() > window.innerHeight * 0.6);
      },
    });
  }
})();
