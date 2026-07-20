/**
 * merger.js
 * Simulación interactiva de la fusión de estrellas de neutrones.
 * Basada en el evento real GW170817 — 17 de agosto de 2017.
 * Fases: Inspiral → Colisión → Kilonova → Remanente (Agujero Negro)
 */

function initSketchMerger(containerEl) {
  window._p5Merger = new p5(function(p) {

    let W, H, cx, cy;
    let bgStars = [];

    /* ── Fases ────────────────────────────────── */
    const SIM = { INSPIRAL: 0, COLLISION: 1, KILONOVA: 2, REMNANT: 3 };
    let simPhase, time, phaseTime;

    const INSPIRAL_DUR  = 540;
    const COLLISION_DUR = 80;
    const KILONOVA_DUR  = 500;

    /* ── Órbita ───────────────────────────────── */
    let orbitR0, orbitAngle;
    const NS1_MASS = 1.36, NS2_MASS = 1.17;

    /* ── Ondas gravitacionales ────────────────── */
    let gwRings = [], gwTimer = 0;

    /* ── Partículas kilonova ──────────────────── */
    let kParticles = [];

    /* ── Remanente ────────────────────────────── */
    let remnantAlpha = 0;

    /* ─────────────────────────────────────────────
       SETUP / RESIZE
    ───────────────────────────────────────────── */
    p.setup = function() {
      const cnv = p.createCanvas(
        containerEl.offsetWidth  || 800,
        containerEl.offsetHeight || 600
      );
      cnv.parent(containerEl);
      _resize();
      _buildBgStars();
      _reset();
    };

    p.triggerResize = function() {
      p.resizeCanvas(
        containerEl.offsetWidth  || 800,
        containerEl.offsetHeight || 600
      );
      _resize();
    };

    function _resize() {
      W = p.width; H = p.height;
      cx = W / 2;  cy = H / 2;
    }

    function _reset() {
      simPhase   = SIM.INSPIRAL;
      time       = 0;
      phaseTime  = 0;
      orbitR0    = Math.min(W, H) * 0.26;
      orbitAngle = 0;
      gwRings    = [];
      gwTimer    = 0;
      kParticles = [];
      remnantAlpha = 0;
      _updateSidebar('Inspiral',
        'Dos estrellas de neutrones en espiral convergente.<br>' +
        'Pierden energía emitiendo <b>ondas gravitacionales</b>.<br>' +
        'La órbita se contrae y acelera (chirp).');
    }

    function _buildBgStars() {
      bgStars = [];
      for (let i = 0; i < 300; i++) {
        bgStars.push({
          x:  Math.random(),
          y:  Math.random(),
          sz: Math.random() * 1.4 + 0.3,
          b:  Math.random() * 130 + 70,
        });
      }
    }

    /* ─────────────────────────────────────────────
       DRAW LOOP
    ───────────────────────────────────────────── */
    p.draw = function() {
      p.background(1, 3, 8);
      _drawBgStars();

      time++;
      phaseTime++;

      /* Emitir anillos GW durante inspiral y colisión */
      if (simPhase === SIM.INSPIRAL || simPhase === SIM.COLLISION) {
        gwTimer++;
        const prog     = phaseTime / INSPIRAL_DUR;
        const interval = simPhase === SIM.COLLISION
          ? 2
          : Math.max(3, Math.round(20 - prog * 16));
        if (gwTimer >= interval) {
          gwTimer = 0;
          gwRings.push({ r: 0, maxA: 170, freq: prog });
        }
      }

      _drawGWRings();

      switch (simPhase) {
        case SIM.INSPIRAL:  _stepInspiral();  break;
        case SIM.COLLISION: _stepCollision(); break;
        case SIM.KILONOVA:  _stepKilonova();  break;
        case SIM.REMNANT:   _stepRemnant();   break;
      }

      _drawHUD();
    };

    /* ─────────────────────────────────────────────
       FONDO
    ───────────────────────────────────────────── */
    function _drawBgStars() {
      p.noStroke();
      for (const s of bgStars) {
        p.fill(s.b, s.b, Math.min(s.b + 30, 255), 190);
        p.circle(s.x * W, s.y * H, s.sz);
      }
    }

    /* ─────────────────────────────────────────────
       ONDAS GRAVITACIONALES
    ───────────────────────────────────────────── */
    function _drawGWRings() {
      const diagonal = Math.sqrt(W * W + H * H);
      for (let i = gwRings.length - 1; i >= 0; i--) {
        const rg  = gwRings[i];
        const spd = 3.2 + rg.freq * 3;
        rg.r += spd;
        const alpha = rg.maxA * (1 - rg.r / (diagonal * 0.7));
        if (alpha <= 0) { gwRings.splice(i, 1); continue; }

        const t  = rg.freq;
        const cr = Math.round(20  + t * 50);
        const cg = Math.round(90  + t * 80);
        const cb = Math.round(200 + t * 55);

        /* Anillo principal */
        p.noFill();
        p.stroke(cr, cg, cb, alpha);
        p.strokeWeight(1.2 + rg.freq * 0.8);
        p.circle(cx, cy, rg.r * 2);

        /* Armónico interior */
        p.stroke(cr, cg, cb, alpha * 0.28);
        p.strokeWeight(0.6);
        p.circle(cx, cy, rg.r * 1.85);
      }
    }

    /* ─────────────────────────────────────────────
       INSPIRAL
    ───────────────────────────────────────────── */
    function _stepInspiral() {
      const prog = phaseTime / INSPIRAL_DUR;

      /* Radio orbital decreciente (pérdida de E ∝ r^-1) */
      const curR  = orbitR0 * Math.pow(Math.max(1 - prog, 0.02), 0.65);

      /* Velocidad angular creciente: ω ∝ r^(-3/2) */
      const omega = 0.016 * Math.pow(orbitR0 / Math.max(curR, 1), 0.75);
      orbitAngle += omega;

      /* Posiciones (centro de masa) */
      const ratio = NS2_MASS / (NS1_MASS + NS2_MASS);
      const x1 = cx + Math.cos(orbitAngle)           * curR * (1 - ratio);
      const y1 = cy + Math.sin(orbitAngle)           * curR * (1 - ratio) * 0.52;
      const x2 = cx - Math.cos(orbitAngle)           * curR * ratio;
      const y2 = cy - Math.sin(orbitAngle)           * curR * ratio * 0.52;

      /* Línea de marea entre las NS */
      p.stroke(80, 120, 220, 12 + prog * 30);
      p.strokeWeight(curR * 0.06);
      p.line(x1, y1, x2, y2);

      _drawNS(x1, y1, NS1_MASS, orbitAngle * 9,   [155, 90,  255]);
      _drawNS(x2, y2, NS2_MASS, -orbitAngle * 11,  [80,  190, 255]);

      /* Frecuencia GW para sidebar */
      const fGW = (omega / Math.PI * 60).toFixed(0);
      _updateSidebarLive(`f<sub>GW</sub> ≈ ${fGW} Hz · r ≈ ${(curR * 2).toFixed(0)} px`);

      if (phaseTime >= INSPIRAL_DUR) {
        _spawnKilonovaParticles();
        simPhase  = SIM.COLLISION;
        phaseTime = 0;
        gwTimer   = 0;
        _updateSidebar('¡Fusión!',
          'Las dos estrellas de neutrones chocan en <b>milisegundos</b>.<br>' +
          'Temperatura: ~10 GK · Densidad: &gt; densidad nuclear.<br>' +
          'Se libera una ráfaga de rayos gamma (GRB 170817A).');
      }
    }

    /* ─────────────────────────────────────────────
       COLISIÓN
    ───────────────────────────────────────────── */
    function _stepCollision() {
      const prog = phaseTime / COLLISION_DUR;

      /* Flash expansivo multicapa */
      for (let r = 6; r >= 1; r--) {
        const frac = prog * r * 0.18;
        p.noStroke();
        p.fill(255, 220 - r * 15, 80, (7 - r) * 22 * (1 - prog * 0.7));
        p.circle(cx, cy, Math.min(W, H) * frac);
      }
      /* Núcleo blanco */
      p.noStroke();
      p.fill(255, 255, 255, 255 * (1 - prog * 0.55));
      p.circle(cx, cy, 22 + prog * 50);

      _updateSidebarLive(`t = ${(phaseTime / 60 * 16).toFixed(0)} ms tras contacto`);

      if (phaseTime >= COLLISION_DUR) {
        simPhase  = SIM.KILONOVA;
        phaseTime = 0;
        _updateSidebar('Kilonova AT2017gfo',
          'Nube en expansión rica en elementos pesados.<br>' +
          'Proceso-r: <b>Au, Pt, Sr, Pb, U</b> sintetizados.<br>' +
          'Detectada en UV/óptico/IR por telescopios en tierra y espacio.');
      }
    }

    /* ─────────────────────────────────────────────
       KILONOVA
    ───────────────────────────────────────────── */
    const KPALETTE = [
      { r: 255, g: 210, b:  40, label: 'Au — Oro'          },
      { r: 220, g: 220, b: 220, label: 'Pt — Platino'       },
      { r:  80, g: 180, b: 255, label: 'Sr — Estroncio'     },
      { r: 200, g:  80, b: 255, label: 'Proceso-r (pesados)' },
      { r: 255, g:  90, b:  40, label: 'GRB / calor'        },
      { r: 140, g: 255, b: 180, label: 'Neutrinos'          },
    ];

    function _spawnKilonovaParticles() {
      for (let i = 0; i < 480; i++) {
        const pal   = KPALETTE[Math.floor(Math.random() * KPALETTE.length)];
        const angle = Math.random() * Math.PI * 2;
        const spd   = 0.6 + Math.random() * 5;
        kParticles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd * 0.52,
          r: pal.r, g: pal.g, b: pal.b,
          life:  1.0,
          decay: 0.0025 + Math.random() * 0.004,
          sz:    1.5 + Math.random() * 3.5,
        });
      }
    }

    function _stepKilonova() {
      const prog = phaseTime / KILONOVA_DUR;

      /* Resplandor central enfriándose */
      const glowR = 55 + prog * 200;
      for (let gi = 5; gi >= 1; gi--) {
        p.noStroke();
        p.fill(
          255,
          Math.round(180 - prog * 110),
          Math.round(40  + prog * 40),
          (6 - gi) * 11 * (1 - prog * 0.75)
        );
        p.circle(cx, cy, glowR * gi * 0.38);
      }

      /* Partículas */
      for (let i = kParticles.length - 1; i >= 0; i--) {
        const pt = kParticles[i];
        pt.x    += pt.vx;
        pt.y    += pt.vy;
        pt.life -= pt.decay;
        if (pt.life <= 0) { kParticles.splice(i, 1); continue; }
        p.noStroke();
        p.fill(pt.r, pt.g, pt.b, pt.life * 210);
        p.circle(pt.x, pt.y, pt.sz * Math.sqrt(pt.life));
      }

      /* Centro emergente */
      p.noStroke();
      p.fill(255, 80, 160, Math.min(prog * 300, 160));
      p.circle(cx, cy, 8 + prog * 10);

      _updateSidebarLive(`${kParticles.length} partículas · t = ${(phaseTime / 60).toFixed(1)} s`);

      if (phaseTime >= KILONOVA_DUR || kParticles.length === 0) {
        simPhase  = SIM.REMNANT;
        phaseTime = 0;
        _updateSidebar('Remanente: Agujero Negro',
          'La masa combinada supera el límite de TOV.<br>' +
          `M ≈ ${(NS1_MASS + NS2_MASS - 0.05).toFixed(2)} M☉ · r<sub>s</sub> ≈ 7 km.<br>` +
          'Detectado por ondas GW de "ringdown".');
      }
    }

    /* ─────────────────────────────────────────────
       REMANENTE (Agujero Negro)
    ───────────────────────────────────────────── */
    function _stepRemnant() {
      remnantAlpha = Math.min(remnantAlpha + 0.012, 1);
      const rs = 26;
      const t  = p.frameCount * 0.022;

      /* Disco de acreción residual */
      for (let r = rs * 3.2; r > rs * 1.1; r -= 2.2) {
        const frac = 1 - (r - rs) / (rs * 2.2);
        p.noFill();
        p.stroke(255 * frac, 70 * frac, 0, frac * 110 * remnantAlpha);
        p.strokeWeight(1.6);
        p.ellipse(cx, cy, r * 2, r * 0.40);
      }

      /* Sombra de la singularidad */
      for (let gi = 5; gi >= 1; gi--) {
        p.noStroke();
        p.fill(0, 0, 0, 45 * remnantAlpha);
        p.circle(cx, cy, rs * (1.35 + gi * 0.22) * 2);
      }
      p.noStroke(); p.fill(0); p.circle(cx, cy, rs * 2);

      /* Anillo de Einstein */
      p.noFill();
      p.stroke(255, 160, 50, 85 * remnantAlpha);
      p.strokeWeight(2.5 + Math.sin(t) * 0.5);
      p.circle(cx, cy, rs * 2.55 * 2);
      p.stroke(255, 200, 100, 28 * remnantAlpha);
      p.strokeWeight(7);
      p.circle(cx, cy, rs * 2.55 * 2);

      /* Etiqueta */
      p.noStroke();
      p.fill(255, 80, 160, 180 * remnantAlpha);
      p.textAlign(p.CENTER);
      p.textSize(9);
      const rskm = ((NS1_MASS + NS2_MASS - 0.05) * 2 * 1.48).toFixed(1);
      p.text(`r_s ≈ ${rskm} km · M ≈ ${(NS1_MASS + NS2_MASS - 0.05).toFixed(2)} M☉`, cx, cy + rs * 2.6);

      _updateSidebarLive('Agujero negro en ringdown');
    }

    /* ─────────────────────────────────────────────
       ESTRELLA DE NEUTRONES
    ───────────────────────────────────────────── */
    function _drawNS(x, y, mass, beamAngle, col) {
      const rs    = 11 + mass * 3.5;
      const [r, g, b] = col;
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.18 + mass * 8);

      /* Campo magnético */
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + beamAngle * 0.04;
        p.noFill();
        p.stroke(r, g, b, 18 + 14 * pulse);
        p.strokeWeight(0.7);
        p.beginShape();
        for (let t = 0; t <= 1; t += 0.09) {
          const rr = rs + 32 * Math.sin(t * Math.PI) * 0.65;
          const aa = a  + t  * Math.PI * 1.5;
          p.vertex(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr * 0.42);
        }
        p.endShape();
      }

      /* Haz pulsar */
      p.stroke(r, g, b, 55 * pulse);
      p.strokeWeight(1.4);
      p.line(x, y,
             x + Math.cos(beamAngle) * 110,
             y + Math.sin(beamAngle) * 55);
      p.line(x, y,
             x - Math.cos(beamAngle) * 110,
             y - Math.sin(beamAngle) * 55);

      /* Halo */
      for (let gi = 4; gi >= 1; gi--) {
        p.noStroke();
        p.fill(r, g, b, 14 * pulse);
        p.circle(x, y, rs * gi * 0.78);
      }
      /* Cuerpo */
      p.noStroke();
      p.fill(r, g, b, 225);
      p.circle(x, y, rs);
      p.fill(255, 255, 255, 200);
      p.circle(x, y, rs * 0.48);
    }

    /* ─────────────────────────────────────────────
       HUD EN CANVAS
    ───────────────────────────────────────────── */
    const HUD_LABELS = ['Inspiral', 'Fusión', 'Kilonova', 'Remanente'];
    const HUD_COLORS = [
      [100, 180, 255],
      [255, 255, 180],
      [255, 170,  40],
      [255,  80, 160],
    ];
    const HUD_DUR    = [INSPIRAL_DUR, COLLISION_DUR, KILONOVA_DUR, 9999];

    function _drawHUD() {
      const [r, g, b] = HUD_COLORS[simPhase];
      const prog = Math.min(phaseTime / HUD_DUR[simPhase], 1);

      /* Etiqueta de fase */
      p.noStroke();
      p.fill(r, g, b, 190);
      p.textAlign(p.CENTER);
      p.textSize(11);
      p.text(`GW170817 · ${HUD_LABELS[simPhase]}`, cx, 32);

      /* Barra de progreso */
      const bw = 220, bx = cx - bw / 2, by = 40, bh = 3;
      p.noStroke(); p.fill(8, 20, 40); p.rect(bx, by, bw, bh, 2);
      p.fill(r, g, b, 200);            p.rect(bx, by, bw * prog, bh, 2);

      /* Leyenda de colores kilonova */
      if (simPhase === SIM.KILONOVA && phaseTime < 60) {
        let ly = H - 80;
        for (const pal of KPALETTE) {
          p.noStroke(); p.fill(pal.r, pal.g, pal.b, 160);
          p.circle(20, ly, 5);
          p.fill(pal.r, pal.g, pal.b, 130);
          p.textAlign(p.LEFT); p.textSize(8);
          p.text(pal.label, 28, ly + 3);
          ly += 12;
        }
      }
    }

    /* ─────────────────────────────────────────────
       SIDEBAR (DOM)
    ───────────────────────────────────────────── */
    function _updateSidebar(phase, html) {
      if (window.currentCollisionEvent !== 'kilonova') return;
      const el = document.getElementById('mergerPhaseInfo');
      if (!el) return;
      el.innerHTML =
        `<span style="color:#ffcc44;font-family:'Orbitron',sans-serif;font-size:0.54rem;` +
        `letter-spacing:.1em;">${phase}</span><br><br>${html}`;
    }
    function _updateSidebarLive(html) {
      if (window.currentCollisionEvent !== 'kilonova') return;
      const el = document.getElementById('mergerLiveInfo');
      if (el) el.innerHTML = html;
    }

    /* ─────────────────────────────────────────────
       API PÚBLICA
    ───────────────────────────────────────────── */
    p.restartMerger = _reset;

  }, containerEl);
}
