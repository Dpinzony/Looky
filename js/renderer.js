/**
 * renderer.js
 * ─────────────────────────────────────────────
 * Todo el código de dibujado p5.js.
 * Exporta la función initSketch(containerEl).
 * ─────────────────────────────────────────────
 */

function initSketch(containerEl) {
  window._p5Sketch = new p5(function(p) {

    let W, H, cx, cy;
    let bgStars    = [];
    let hrCanvas;          // mini diagrama H-R
    let hrBgCanvas;        // fondo estático: catálogo Hipparcos
    let hrPoints   = [];   // trayectoria evolutiva

    /* Coordenadas del mini diagrama H-R (compartidas entre build y draw) */
    const HR_W = 220, HR_H = 175;
    const HR_T_MIN = 2800, HR_T_MAX = 55000;
    const HR_L_MIN = 1e-4, HR_L_MAX = 1e7;
    const _hrX = T => HR_W * 0.88 - (Math.log10(T) - Math.log10(HR_T_MIN)) /
                      (Math.log10(HR_T_MAX) - Math.log10(HR_T_MIN)) * HR_W * 0.78;
    const _hrY = L => HR_H * 0.90 - (Math.log10(Math.max(L, HR_L_MIN)) - Math.log10(HR_L_MIN)) /
                      (Math.log10(HR_L_MAX) - Math.log10(HR_L_MIN)) * HR_H * 0.82;

    /* ──────────────────────────────────────────
       SETUP
    ────────────────────────────────────────── */
    p.setup = function() {
      W = containerEl.offsetWidth;
      H = containerEl.offsetHeight;
      const cnv = p.createCanvas(W, H);
      cnv.parent(containerEl);
      cx = W / 2;
      cy = H / 2 - 20;

      _buildBgStars();
      hrCanvas   = p.createGraphics(HR_W, HR_H);
      hrCanvas.colorMode(p.RGB, 255);
      hrBgCanvas = p.createGraphics(HR_W, HR_H);
      hrBgCanvas.colorMode(p.RGB, 255);
      _buildHipparcosBg();
    };

    p.windowResized = function() {
      W = containerEl.offsetWidth;
      H = containerEl.offsetHeight;
      p.resizeCanvas(W, H);
      cx = W / 2;
      cy = H / 2 - 20;
    };

    /* ──────────────────────────────────────────
       DRAW LOOP
    ────────────────────────────────────────── */
    p.draw = function() {
      if (!window.star) return;
      const s = window.star;

      p.background(1, 4, 8);
      _drawBgStars();
      _drawNebulaParticles();
      _drawStarBody(s);
      _drawExplosionParticles();
      _drawHRDiagram(s);
      _drawTimelineBar(s);
      _drawPhaseLabel(s);

      // Registrar punto H-R
      if (p.frameCount % 25 === 0 && s.phase !== PHASES.PROTOSTAR && s.T > 0) {
        hrPoints.push({ T: s.T, L: s.L, c: PHYSICS.tempToColor(s.T) });
        if (hrPoints.length > 600) hrPoints.shift();
      }
    };

    /* ──────────────────────────────────────────
       ESTRELLAS DE FONDO
    ────────────────────────────────────────── */
    function _buildBgStars() {
      bgStars = [];
      for (let i = 0; i < 320; i++) {
        bgStars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          sz: Math.random() * 1.5,
          b0: 100 + Math.random() * 155,
          phi: Math.random() * Math.PI * 2,
        });
      }
    }

    function _drawBgStars() {
      bgStars.forEach(s => {
        s.phi += 0.015;
        const b = s.b0 + 20 * Math.sin(s.phi);
        p.noStroke();
        p.fill(b, b, b, 200);
        p.circle(s.x, s.y, s.sz);
      });
    }

    /* ──────────────────────────────────────────
       FONDO HIPPARCOS (dibujado una sola vez)
    ────────────────────────────────────────── */
    function _buildHipparcosBg() {
      const bg = hrBgCanvas;
      bg.clear();
      const stars = window.HIPPARCOS_STARS;
      if (!stars) return;
      bg.noStroke();
      for (const [T, L] of stars) {
        const x = _hrX(T), y = _hrY(L);
        if (x < 0 || x > HR_W || y < 0 || y > HR_H) continue;
        const c = PHYSICS.tempToColor(T);
        bg.fill(c.r, c.g, c.b, 95);
        bg.circle(x, y, 1.4);
      }
    }

    /* ──────────────────────────────────────────
       PARTÍCULAS
    ────────────────────────────────────────── */
    function _drawNebulaParticles() {
      PARTICLES.updateAndDrawNebula(p, cx, cy);
    }
    function _drawExplosionParticles() {
      PARTICLES.updateAndDrawExplosion(p, cx, cy);
    }

    /* ──────────────────────────────────────────
       CUERPO PRINCIPAL DE LA ESTRELLA
    ────────────────────────────────────────── */
    function _drawStarBody(s) {
      if (s.phase === PHASES.BLACK_HOLE) { _drawBlackHole(s); return; }
      if (s.phase === PHASES.NEUTRON_STAR) { _drawNeutronStar(s); return; }
      if (s.phase === PHASES.PLANETARY_NEBULA) _drawPlanetaryNebula(s);

      const c     = PHYSICS.tempToColor(s.T);
      const logR  = Math.log10(Math.max(s.R, 1e-6));
      // Escala logarítmica: log R ∈ [-6, 3]  →  screenR ∈ [6, ~40% min(W,H)]
      const norm  = (logR + 6) / 9;
      const maxPx = Math.min(W, H) * 0.36;
      const sr    = Math.max(6, norm * maxPx);

      // Halo difuso multicapa
      for (let gi = 6; gi >= 1; gi--) {
        p.noStroke();
        p.fill(c.r, c.g, c.b, 10 + (6 - gi));
        p.circle(cx, cy, sr * (1 + gi * 0.38) * 2);
      }

      // Gradiente radial simulado (capas)
      for (let li = 12; li >= 0; li--) {
        const fr = li / 12;
        const dr = fr * 0.45 + 0.55;
        p.noStroke();
        p.fill(
          Math.min(c.r * dr + (1 - dr) * 255, 255),
          Math.min(c.g * dr + (1 - dr) * 255, 255),
          Math.min(c.b * dr + (1 - dr) * 255, 255),
          li < 2 ? 255 : 195 + li * 4
        );
        p.circle(cx, cy, sr * fr * 2);
      }

      // Borde fotosfera
      p.noFill();
      p.stroke(c.r, c.g, c.b, 160);
      p.strokeWeight(1.5);
      p.circle(cx, cy, sr * 2);

      // Prominencias (gigantes)
      if (s.R > s.R_ms * 8) _drawProminences(sr, c);

      // Células convectivas (AGB / Gigante)
      if ([PHASES.RED_GIANT, PHASES.AGB, PHASES.HELIUM_BURNING].includes(s.phase))
        _drawConvection(sr, c);

      // Flash de colapso
      if (s.phase === PHASES.CORE_COLLAPSE) _drawCollapseEffect(sr, s);

      // Destello supernova
      if (s.phase === PHASES.SUPERNOVA) _drawSupernovaGlow(sr, c, s);

      // Indicador radio
      if (sr > 12) {
        p.noStroke();
        p.fill(60, 120, 180, 160);
        p.textSize(9);
        p.textAlign(p.LEFT);
        p.text(`${s.R.toFixed(sr > 80 ? 0 : 3)} R☉`, cx + sr + 10, cy + 4);
      }
    }

    function _drawProminences(sr, c) {
      const n = 7;
      for (let i = 0; i < n; i++) {
        const base = (i / n) * Math.PI * 2 + p.frameCount * 0.004;
        const h    = sr * (0.12 + 0.08 * Math.sin(p.frameCount * 0.025 + i * 1.3));
        const x1   = cx + Math.cos(base) * sr;
        const y1   = cy + Math.sin(base) * sr;
        const x2   = cx + Math.cos(base) * (sr + h);
        const y2   = cy + Math.sin(base) * (sr + h);
        p.stroke(c.r, Math.min(c.g + 40, 255), c.b, 90);
        p.strokeWeight(1.5);
        p.line(x1, y1, x2, y2);
      }
    }

    function _drawConvection(sr, c) {
      const t = p.frameCount * 0.012;
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2 + t * 0.15;
        const r     = sr * (0.35 + 0.45 * ((i % 3) / 3));
        p.noStroke();
        p.fill(Math.min(c.r + 25, 255), c.g, c.b, 35);
        p.circle(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r,
                 9 + 6 * Math.sin(t + i));
      }
    }

    function _drawCollapseEffect(sr, s) {
      const prog = s.phaseTimer / s.phaseDuration;
      p.noFill();
      p.stroke(255, 80, 0, 160 * (1 - prog));
      p.strokeWeight(2);
      p.circle(cx, cy, sr * 0.5 * (1 - prog * 0.9) * 2);
      // Anillos de implosión
      for (let ring = 3; ring >= 1; ring--) {
        p.stroke(255, 50, 0, 60 * (1 - prog) / ring);
        p.strokeWeight(ring);
        p.circle(cx, cy, sr * ring * 0.55 * (1 - prog * 0.7) * 2);
      }
    }

    function _drawSupernovaGlow(sr, c, s) {
      const prog = s.phaseTimer / s.phaseDuration;
      if (prog < 0.15) {
        for (let gi = 6; gi >= 1; gi--) {
          p.noStroke();
          p.fill(255, 200, 60, (6 - gi + 1) * 18 * (1 - prog * 4));
          p.circle(cx, cy, sr * gi * 4);
        }
      }
    }

    /* ──────────────────────────────────────────
       NEBULOSA PLANETARIA (cáscaras + lóbulos)
    ────────────────────────────────────────── */
    function _drawPlanetaryNebula(s) {
      const prog    = s.phaseTimer / s.phaseDuration;
      const logR    = Math.log10(Math.max(s.R, 1e-6));
      const norm    = (logR + 6) / 9;
      const sr      = Math.max(6, norm * Math.min(W, H) * 0.36);
      const palette = [
        { r:0,   g:200, b:255 },
        { r:255, g:100, b:50  },
        { r:160, g:50,  b:220 },
      ];

      PARTICLES.spawnNebula(2);

      for (let shell = 0; shell < 3; shell++) {
        const shellR = sr * (3.5 + shell * 2.5 + prog * 25);
        const alpha  = Math.max(0, 80 - shell * 22 - prog * 50);
        const sc     = palette[shell];
        p.noFill();
        p.stroke(sc.r, sc.g, sc.b, alpha);
        p.strokeWeight(2 - shell * 0.5);
        p.ellipse(cx, cy, shellR * 2, shellR * 1.55);
      }

      // Lóbulos polares
      for (let lobe = 0; lobe < 2; lobe++) {
        const la = lobe * Math.PI;
        const lx = cx + Math.cos(la) * sr * (5 + prog * 20);
        const ly = cy + Math.sin(la) * sr * (3 + prog * 12);
        for (let r = 4; r >= 1; r--) {
          p.noStroke();
          p.fill(80, 200, 255, 28 - r * 4);
          p.ellipse(lx, ly, 18 * r, 32 * r);
        }
      }
    }

    /* ──────────────────────────────────────────
       ESTRELLA DE NEUTRONES
    ────────────────────────────────────────── */
    function _drawNeutronStar(s) {
      const pulse = 0.5 + 0.5 * Math.sin((s.pulsePhase || 0) * 12);
      const rs    = 18;

      // Líneas de campo magnético
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + p.frameCount * 0.008;
        p.noFill();
        p.stroke(160, 60, 255, 35 + 28 * pulse);
        p.strokeWeight(1);
        p.beginShape();
        for (let t = 0; t <= 1; t += 0.06) {
          const rr = rs + 55 * Math.sin(t * Math.PI) * (0.8 + 0.2 * Math.sin(a));
          const aa = a  + t * Math.PI * 2;
          p.vertex(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr * 0.42);
        }
        p.endShape();
      }

      // Haz pulsar
      const ba = (s.pulsePhase || 0) * 6;
      p.stroke(180, 230, 255, 90 * pulse);
      p.strokeWeight(2);
      p.line(cx, cy, cx + Math.cos(ba) * 240, cy + Math.sin(ba) * 240);
      p.line(cx, cy, cx + Math.cos(ba + Math.PI) * 240, cy + Math.sin(ba + Math.PI) * 240);

      // Halo
      for (let gi = 5; gi >= 1; gi--) {
        p.noStroke();
        p.fill(160, 100, 255, 18 * pulse);
        p.circle(cx, cy, rs * gi * 0.9);
      }

      // Núcleo
      p.noStroke();
      p.fill(220, 190, 255, 240);
      p.circle(cx, cy, rs * 1.1);
      p.fill(255);
      p.circle(cx, cy, rs * 0.55);

      // Label
      p.noStroke();
      p.fill(180, 120, 255, 200);
      p.textAlign(p.CENTER);
      p.textSize(9);
      p.text(`M = ${s.M_compact.toFixed(2)} M☉`, cx, cy + rs * 2.5);
    }

    /* ──────────────────────────────────────────
       AGUJERO NEGRO
    ────────────────────────────────────────── */
    function _drawBlackHole(s) {
      const rs     = 38;
      const angle  = s.accretionAngle || 0;

      // Disco de acreción (elipses concéntricas)
      for (let r = rs * 3.5; r > rs * 1.1; r -= 3) {
        const t  = 1 - (r - rs) / (rs * 2.5);
        const br = t * 255;
        p.noFill();
        p.stroke(br, br * 0.35 + 20, 0, t * 170);
        p.strokeWeight(1.8);
        p.ellipse(cx, cy, r * 2, r * 0.48);
      }

      // Esfera de fotones
      p.noFill();
      p.stroke(255, 120, 0, 55);
      p.strokeWeight(1);
      p.circle(cx, cy, rs * 3.1 * 2);

      // Sombra de lente gravitacional
      for (let gi = 5; gi >= 1; gi--) {
        p.noStroke();
        p.fill(0, 0, 0, 60 - gi * 8);
        p.circle(cx, cy, rs * (1.4 + gi * 0.3) * 2);
      }

      // Horizonte de eventos
      p.noStroke();
      p.fill(0, 0, 0, 255);
      p.circle(cx, cy, rs * 2);

      // Anillo de Einstein
      p.noFill();
      p.stroke(255, 190, 60, 130);
      p.strokeWeight(3);
      p.circle(cx, cy, rs * 2.7 * 2);
      p.stroke(255, 230, 120, 50);
      p.strokeWeight(8);
      p.circle(cx, cy, rs * 2.7 * 2);

      // Labels
      p.noStroke();
      p.fill(255, 80, 150, 200);
      p.textAlign(p.CENTER);
      p.textSize(9);
      const rs_km = (s.R_compact * PHYSICS.R_SUN / 1e5).toFixed(1);
      p.text(`r_s = ${rs_km} km`, cx, cy + rs * 2.2);
      p.text(`M = ${s.M_compact.toFixed(2)} M☉`, cx, cy + rs * 2.8);
    }

    /* ──────────────────────────────────────────
       DIAGRAMA H-R (mini)
    ────────────────────────────────────────── */
    function _drawHRDiagram(s) {
      const hg = hrCanvas;
      hg.background(3, 10, 20, 245);

      // ── Fondo: estrellas reales del catálogo Hipparcos ──
      hg.image(hrBgCanvas, 0, 0);

      // ── Secuencia principal de referencia ──
      hg.stroke(25, 65, 115, 80); hg.strokeWeight(1.2); hg.noFill();
      hg.beginShape();
      for (let M = 0.08; M <= 60; M *= 1.15) {
        const L_m = PHYSICS.luminosity(M);
        const R_m = PHYSICS.mainSequenceRadius(M);
        const T_m = PHYSICS.effectiveTemp(L_m, R_m);
        hg.vertex(_hrX(T_m), _hrY(L_m));
      }
      hg.endShape();

      // ── Trayectorias comparativas (si están activas) ──
      const tracks = window.comparisonTracks;
      if (window.comparisonMode && tracks) {
        const TRACK_COLORS = [
          [80,  160, 255],   // 1 M☉  → azul  (enana blanca)
          [190, 120, 255],   // 8 M☉  → violeta (estrella de neutrones)
          [255, 90,  90 ],   // 25 M☉ → rojo  (agujero negro)
        ];
        const TRACK_LABELS = ['1 M☉', '8 M☉', '25 M☉'];
        tracks.forEach((pts, ti) => {
          if (!pts || pts.length < 2) return;
          const [r, g, b] = TRACK_COLORS[ti];
          hg.strokeWeight(1.2);
          for (let i = 1; i < pts.length; i++) {
            const a = 55 + (i / pts.length) * 100;
            hg.stroke(r, g, b, a);
            hg.line(_hrX(pts[i-1].T), _hrY(pts[i-1].L),
                    _hrX(pts[i  ].T), _hrY(pts[i  ].L));
          }
          // Etiqueta al final del track
          const last = pts[pts.length - 1];
          const lx = _hrX(last.T), ly = _hrY(last.L);
          hg.noStroke(); hg.fill(r, g, b, 200);
          hg.textSize(5.5); hg.textAlign(hg.LEFT);
          hg.text(TRACK_LABELS[ti], Math.min(lx + 2, HR_W - 22), Math.max(ly, 7));
          hg.noFill(); hg.stroke(r, g, b, 160); hg.strokeWeight(1);
          hg.circle(lx, ly, 4);
        });
      }

      // ── Trayectoria evolutiva con gradiente temporal ──
      for (let i = 1; i < hrPoints.length; i++) {
        const prev = hrPoints[i - 1], cur = hrPoints[i];
        const ageFrac = i / hrPoints.length;
        const alpha = 30 + ageFrac * 160;       // antigua=tenue, reciente=brillante
        const wt    = 0.7 + ageFrac * 0.8;      // trazo más grueso al avanzar
        hg.stroke(cur.c.r, cur.c.g, cur.c.b, alpha);
        hg.strokeWeight(wt);
        hg.line(_hrX(prev.T), _hrY(prev.L), _hrX(cur.T), _hrY(cur.L));
      }

      // ── Posición actual ──
      if (s.T > 0) {
        const sx = _hrX(s.T), sy = _hrY(Math.max(s.L, HR_L_MIN));
        const sc = PHYSICS.tempToColor(s.T);
        hg.noStroke(); hg.fill(sc.r, sc.g, sc.b, 55); hg.circle(sx, sy, 11);
        hg.fill(sc.r, sc.g, sc.b, 220);                hg.circle(sx, sy, 5);
        hg.fill(255, 255, 255, 200);                    hg.circle(sx, sy, 2);
      }

      // ── Etiquetas de ejes ──
      hg.noStroke(); hg.textSize(6); hg.textAlign(hg.CENTER);
      hg.fill(45, 95, 145, 190);
      hg.text('← T efectiva', HR_W * 0.5, HR_H - 1);
      hg.textAlign(hg.LEFT); hg.text('L/L☉', 2, 8);

      // ── Indicador "Hipparcos" cuando hay datos ──
      if (window.HIPPARCOS_STARS) {
        hg.textSize(5); hg.fill(30, 70, 110, 150);
        hg.textAlign(hg.RIGHT);
        hg.text('• Hipparcos ESA', HR_W - 2, HR_H - 1);
      }

      // ── Volcar al canvas principal ──
      p.image(hrCanvas, 10, H - 185 - 10, HR_W, HR_H);
      p.noFill(); p.stroke(13, 48, 85); p.strokeWeight(1);
      p.rect(10, H - 195, HR_W, HR_H, 3);
      p.noStroke(); p.fill(30, 100, 150); p.textSize(9); p.textAlign(p.LEFT);
      p.text('DIAGRAMA H-R', 16, H - 195 + 10);
    }

    /* ──────────────────────────────────────────
       BARRA DE PROGRESO TEMPORAL
    ────────────────────────────────────────── */
    function _drawTimelineBar(s) {
      const bx = W / 2 - 190, by = 12, bw = 380, bh = 7;
      p.noStroke(); p.fill(5, 15, 30, 210); p.rect(bx, by, bw, bh, 4);

      const order = [
        PHASES.PROTOSTAR, PHASES.MAIN_SEQUENCE, PHASES.SUBGIANT,
        PHASES.RED_GIANT, PHASES.HELIUM_BURNING, PHASES.AGB,
        PHASES.PLANETARY_NEBULA, PHASES.WHITE_DWARF,
        PHASES.CORE_COLLAPSE, PHASES.SUPERNOVA,
        PHASES.NEUTRON_STAR, PHASES.BLACK_HOLE,
      ];
      const idx   = order.indexOf(s.phase);
      const total = s.fate === 'white_dwarf' ? 8 : 10;
      const phaseP = (s.phaseDuration > 0 && isFinite(s.phaseDuration)) ?
                     s.phaseTimer / s.phaseDuration : 1;
      const prog  = Math.min((idx + phaseP) / total, 1);

      const c = PHYSICS.tempToColor(s.T);
      p.fill(c.r * 0.4, c.g * 0.4, c.b * 0.4);
      p.rect(bx, by, bw * prog, bh, 4);
      p.fill(c.r, c.g, c.b, 220);
      p.rect(bx + bw * prog - 2, by, 3, bh, 1);

      // Texto
      p.fill(70, 130, 185, 170); p.textSize(8); p.textAlign(p.CENTER);
      p.text(
        `t = ${formatAge(s.age)}  ·  M = ${s.M.toFixed(2)} M☉  ·  τ_MS = ${formatAge(s.tauMS)}`,
        W / 2, by + bh + 10
      );
    }

    /* ──────────────────────────────────────────
       ETIQUETA DE FASE
    ────────────────────────────────────────── */
    function _drawPhaseLabel(s) {
      const logR = Math.log10(Math.max(s.R, 1e-6));
      const norm = (logR + 6) / 9;
      const sr   = Math.max(6, norm * Math.min(W, H) * 0.36);
      const c    = PHYSICS.tempToColor(s.T);
      const name = (PHASE_META[s.phase] || {}).name || s.phase;

      p.noStroke(); p.fill(c.r, c.g, c.b, 180);
      p.textSize(12); p.textAlign(p.CENTER);
      const labelY = cy + Math.min(sr + 30, H * 0.38);
      p.text(name, cx, labelY);
    }

    /* ── API pública del sketch ───────────────── */
    p.clearHRTrack    = function() { hrPoints = []; };
    p.getHRPoints     = function() { return hrPoints.map(pt => ({ T: pt.T, L: pt.L })); };
    p.rebuildHRBg     = function() { _buildHipparcosBg(); };

  }, containerEl);
}

/**
 * ══════════════════════════════════════════════
 * Vista "⚖ Comparar" — dibujo en Canvas2D plano
 * ─────────────────────────────────────────────
 * A diferencia del resto de este archivo, estas dos
 * funciones NO usan p5.js: se llaman directamente
 * sobre el contexto 2D de <canvas> nativos, una vez
 * por frame, para cada una de las 3 estrellas del
 * modo de comparación (ver main.js: compareTick()).
 * Mantenerlas fuera de p5 evita instanciar 3 sketches
 * adicionales solo para una vista de mini-comparación.
 * ══════════════════════════════════════════════
 */

/**
 * Dibuja una representación simplificada de una estrella
 * (o remanente compacto) en un <canvas> 2D nativo.
 */
function drawCompareStar(ctx, w, h, star) {
  ctx.clearRect(0, 0, w, h);
  if (!star) return;
  const cx = w / 2, cy = h / 2;
  const phase = star.phase;

  if (phase === 'black_hole') {
    // Disco de acreción + horizonte de sucesos
    ctx.strokeStyle = 'rgba(255,170,68,0.85)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.34, h * 0.10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#01050a';
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(w, h) * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff44aa';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    return;
  }

  if (phase === 'neutron_star') {
    const c = PHYSICS.tempToColor(star.T || 20000);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, `rgb(${c.r},${c.g},${c.b})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    // Haces de radiación (efecto faro)
    ctx.strokeStyle = 'rgba(204,136,255,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - w * 0.4, cy - h * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + w * 0.4, cy + h * 0.4); ctx.stroke();
    return;
  }

  // Estrella "normal": protoestrella … enana blanca, esfera coloreada por temperatura
  const c = PHYSICS.tempToColor(star.T || 5778);
  const R = Math.max(star.R || 1, 0.0005);
  let radiusPx = 10 + (Math.log10(R) + 3) * 9; // log10(R) ∈ [-3, 3.3] aprox → [10, ~65] px
  radiusPx = Math.max(6, Math.min(radiusPx, Math.min(w, h) * 0.42));

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radiusPx);
  grad.addColorStop(0,    'rgba(255,255,255,0.95)');
  grad.addColorStop(0.35, `rgb(${c.r},${c.g},${c.b})`);
  grad.addColorStop(1,    `rgba(${c.r},${c.g},${c.b},0.15)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Dibuja el mini diagrama H-R compartido del modo comparación,
 * con hasta 3 trayectorias en colores distintos.
 * tracks: [[{T,L}, ...], [{T,L}, ...], [{T,L}, ...]]
 * colors: ['#rrggbb', '#rrggbb', '#rrggbb']
 */
function drawCompareHR(ctx, w, h, tracks, colors) {
  ctx.clearRect(0, 0, w, h);

  const T_MIN = 2800, T_MAX = 55000;
  const L_MIN = 1e-4, L_MAX = 1e7;
  const padL = 34, padR = 12, padT = 10, padB = 22;
  const plotW = w - padL - padR, plotH = h - padT - padB;

  const hx = T => padL + plotW - (Math.log10(T) - Math.log10(T_MIN)) /
                  (Math.log10(T_MAX) - Math.log10(T_MIN)) * plotW;
  const hy = L => padT + plotH - (Math.log10(Math.max(L, L_MIN)) - Math.log10(L_MIN)) /
                  (Math.log10(L_MAX) - Math.log10(L_MIN)) * plotH;

  // Ejes
  ctx.strokeStyle = '#0d3055';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, padT); ctx.lineTo(padL, h - padB); ctx.lineTo(w - padR, h - padB);
  ctx.stroke();
  ctx.fillStyle = '#4a7a9a';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('← T efectiva (K)', w / 2, h - 6);
  ctx.save();
  ctx.translate(12, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Luminosidad (L☉) →', 0, 0);
  ctx.restore();

  // Secuencia principal de referencia (curva tenue de fondo)
  ctx.strokeStyle = 'rgba(25,65,115,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  let first = true;
  for (let M = 0.08; M <= 60; M *= 1.15) {
    const Lm = PHYSICS.luminosity(M);
    const Rm = PHYSICS.mainSequenceRadius(M);
    const Tm = PHYSICS.effectiveTemp(Lm, Rm);
    const x = hx(Tm), y = hy(Lm);
    if (first) { ctx.moveTo(x, y); first = false; } else { ctx.lineTo(x, y); }
  }
  ctx.stroke();

  // Trayectorias de las 3 estrellas en comparación
  tracks.forEach((pts, i) => {
    if (!pts || pts.length < 2) return;
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    pts.forEach((pt, j) => {
      const x = hx(pt.T), y = hy(pt.L);
      if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Punto de posición actual
    const last = pts[pts.length - 1];
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.arc(hx(last.T), hy(last.L), 3.5, 0, Math.PI * 2);
    ctx.fill();
  });
}
