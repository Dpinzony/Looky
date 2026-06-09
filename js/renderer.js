/**
 * renderer.js
 * ─────────────────────────────────────────────
 * Todo el código de dibujado p5.js.
 * Exporta la función initSketch(containerEl).
 * ─────────────────────────────────────────────
 */

function initSketch(containerEl) {
  new p5(function(p) {

    let W, H, cx, cy;
    let bgStars    = [];
    let hrCanvas;          // mini diagrama H-R
    let hrPoints   = [];   // trayectoria evolutiva

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
      hrCanvas = p.createGraphics(220, 175);
      hrCanvas.colorMode(p.RGB, 255);
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
      const HW = hg.width, HH = hg.height;
      hg.background(3, 10, 20, 245);

      const T_min = 2800, T_max = 55000;
      const L_min = 1e-4,  L_max = 1e7;
      const toX = T => HW * 0.88 - (Math.log10(T) - Math.log10(T_min)) /
                       (Math.log10(T_max) - Math.log10(T_min)) * HW * 0.78;
      const toY = L => HH * 0.90 - (Math.log10(Math.max(L, L_min)) - Math.log10(L_min)) /
                       (Math.log10(L_max) - Math.log10(L_min)) * HH * 0.82;

      // Secuencia principal de referencia
      hg.stroke(25, 65, 115, 90); hg.strokeWeight(1.2); hg.noFill();
      hg.beginShape();
      for (let M = 0.08; M <= 60; M *= 1.15) {
        const L_m = PHYSICS.luminosity(M);
        const R_m = PHYSICS.mainSequenceRadius(M);
        const T_m = PHYSICS.effectiveTemp(L_m, R_m);
        hg.vertex(toX(T_m), toY(L_m));
      }
      hg.endShape();

      // Trayectoria evolutiva
      for (let i = 1; i < hrPoints.length; i++) {
        const prev = hrPoints[i - 1], cur = hrPoints[i];
        hg.stroke(cur.c.r, cur.c.g, cur.c.b, 100);
        hg.strokeWeight(1);
        hg.line(toX(prev.T), toY(prev.L), toX(cur.T), toY(cur.L));
      }

      // Posición actual
      if (s.T > 0) {
        const sx = toX(s.T), sy = toY(Math.max(s.L, L_min));
        const sc = PHYSICS.tempToColor(s.T);
        hg.noStroke(); hg.fill(sc.r, sc.g, sc.b, 55); hg.circle(sx, sy, 11);
        hg.fill(sc.r, sc.g, sc.b, 220);                hg.circle(sx, sy, 5);
        hg.fill(255, 255, 255, 200);                    hg.circle(sx, sy, 2);
      }

      // Etiquetas de ejes
      hg.noStroke(); hg.textSize(6); hg.textAlign(hg.CENTER);
      hg.fill(45, 95, 145, 190);
      hg.text('← T efectiva', HW * 0.5, HH - 1);
      hg.textAlign(hg.LEFT); hg.text('L/L☉', 2, 8);

      // Volcar al canvas principal
      p.image(hrCanvas, 10, H - 185 - 10, 220, 175);
      p.noFill(); p.stroke(13, 48, 85); p.strokeWeight(1);
      p.rect(10, H - 195, 220, 175, 3);
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
    p.clearHRTrack = function() { hrPoints = []; };

  }, containerEl);
}
