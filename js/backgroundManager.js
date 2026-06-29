/* ============================================================
   backgroundManager.js — reescrito para 60 fps estables
   Optimizaciones:
   - Un único mousemove listener, lecturas en rAF
   - Cursor via transform (no left/top → sin layout)
   - updateNearbyCards() usa rects cacheados, refrescados con
     ResizeObserver + debounce (no getBoundingClientRect en rAF)
   - globalLight usa CSS custom properties (no string rebuild)
   - 3D tilt sólo corre en el frame; no escribe en mousemove
   - will-change declarado sólo durante hover
   ============================================================ */
class BackgroundManager {
  constructor() {
    this.fog        = document.getElementById('ambientFog');
    this.particles  = document.getElementById('particles');
    this.globalLight= document.getElementById('globalLight');
    this.cursorRing = document.getElementById('cursorRing');
    this.cursorGlow = document.getElementById('cursorGlow');
    this.cards      = [];

    // Posición cruda del ratón (escrita en mousemove)
    this.mouseX = window.innerWidth  / 2;
    this.mouseY = window.innerHeight / 2;

    // Valores pendientes de aplicar en el frame (dirty flag)
    this._mouseDirty    = false;
    this._tiltCard      = null;   // card bajo el cursor
    this._tiltPx        = 0;
    this._tiltPy        = 0;

    // Caché de rects de las cartas
    this._cardRects = [];

    this.running = false;
  }

  init() {
    this.running = true;
    this.cards   = [...document.querySelectorAll('.game-card')];

    this._buildRectCache();
    this._initMouseListener();
    this._initHoverEffects();
    this._init3DCards();
    this._initResizeObserver();
    this._loop();
  }

  /* ── Caché de rects ── */
  _buildRectCache() {
    this._cardRects = this.cards.map(c => c.getBoundingClientRect());
  }

  _initResizeObserver() {
    // Actualizar rects cuando el layout cambie (scroll también)
    const refresh = () => this._buildRectCache();
    window.addEventListener('scroll', refresh, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(refresh).observe(document.body);
    } else {
      window.addEventListener('resize', refresh, { passive: true });
    }
  }

  /* ── Listener único de ratón ── */
  _initMouseListener() {
    document.addEventListener('mousemove', e => {
      this.mouseX      = e.clientX;
      this.mouseY      = e.clientY;
      this._mouseDirty = true;
    }, { passive: true });
  }

  /* ── rAF loop principal ── */
  _loop() {
    if (!this.running) return;

    if (this._mouseDirty) {
      this._mouseDirty = false;
      this._applyMouse();
    }

    requestAnimationFrame(() => this._loop());
  }

  /* ── Todo lo que depende del ratón, en un solo frame ── */
  _applyMouse() {
    const x = this.mouseX;
    const y = this.mouseY;

    // 1. Cursor ring / glow — transform en vez de left/top
    const tx = x - window.innerWidth  / 2;
    const ty = y - window.innerHeight / 2;
    if (this.cursorRing)
      this.cursorRing.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    if (this.cursorGlow)
      this.cursorGlow.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;

    // 2. Global light — custom props en lugar de reconstruir el string
    if (this.globalLight) {
      const px = (x / window.innerWidth)  * 100;
      const py = (y / window.innerHeight) * 100;
      this.globalLight.style.setProperty('--lx', px + '%');
      this.globalLight.style.setProperty('--ly', py + '%');
    }

    // 3. Nearby cards glow — usa rects cacheados
    const rects = this._cardRects;
    for (let i = 0; i < this.cards.length; i++) {
      const r = rects[i];
      if (!r) continue;
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      const dx = x - cx, dy = y - cy;
      const dist     = Math.sqrt(dx * dx + dy * dy);
      const strength = Math.max(0, 1 - dist / 420);
      if (strength > 0) {
        this.cards[i].style.setProperty('--proximity', strength);
      } else {
        this.cards[i].style.removeProperty('--proximity');
      }
    }

    // 4. 3D tilt — escribe sólo en el frame, no en el listener
    if (this._tiltCard) {
      const inner = this._tiltCard._inner;
      const glare = this._tiltCard._glare;
      if (inner) {
        const r   = this._tiltCard.getBoundingClientRect();
        const px  = (x - r.left) / r.width;
        const py  = (y - r.top)  / r.height;
        const rx  = (0.5 - py) * 10;
        const ry  = (px - 0.5) * 10;
        inner.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(10px)`;
        if (glare) {
          glare.style.background = `radial-gradient(circle at ${px*100}% ${py*100}%,rgba(255,255,255,.18),rgba(255,255,255,.04) 30%,transparent 68%)`;
        }
      }
    }
  }

  /* ── 3D tilt — sólo activa will-change y guarda la card actual ── */
  _init3DCards() {
    this.cards.forEach(card => {
      card._inner = card.querySelector('.card-3d');
      card._glare = card.querySelector('.card-glare');

      card.addEventListener('mouseenter', () => {
        this._tiltCard = card;
        if (card._inner) card._inner.style.willChange = 'transform';
      });

      card.addEventListener('mouseleave', () => {
        this._tiltCard = null;
        if (card._inner) {
          card._inner.style.willChange = '';
          card._inner.style.transform  = 'rotateX(0deg) rotateY(0deg) translateZ(0)';
        }
        if (card._glare) card._glare.style.background = '';
      });
    });
  }

  /* ── Hover effects (cursor class + energy particles) ── */
  _initHoverEffects() {
    const activate = e => {
      this.cursorGlow?.classList.add('cursor-hover');
      this.cursorRing?.classList.add('cursor-hover');
      const card = e.currentTarget;
      if (card.classList.contains('game-card')) this._createParticles(card);
    };
    const deactivate = () => {
      this.cursorGlow?.classList.remove('cursor-hover');
      this.cursorRing?.classList.remove('cursor-hover');
    };
    document.querySelectorAll('.game-card, button').forEach(el => {
      el.addEventListener('mouseenter', activate);
      el.addEventListener('mouseleave', deactivate);
    });
  }

  /* ── Energy particles al entrar en una card ── */
  _createParticles(card) {
    for (let i = 0; i < 6; i++) {  // reducido de 8 a 6
      const p     = document.createElement('div');
      p.className = 'energy-particle';
      const angle = Math.random() * Math.PI * 2;
      const dist  = 35 + Math.random() * 40;
      p.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
      p.style.left = '50%';
      p.style.top  = '50%';
      card.appendChild(p);
      p.addEventListener('animationend', () => p.remove(), { once: true });
    }
  }

  pulse() {
    if (!this.fog) return;
    this.fog.animate(
      [
        { opacity: .08 },
        { opacity: .13 },
        { opacity: .08 }
      ],
      { duration: 600, easing: 'ease-out' }
    );
  }
}

const backgroundManager = new BackgroundManager();
window.backgroundManager = backgroundManager;
