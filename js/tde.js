/**
 * tde.js
 * Simulación visual de Disrupción de Marea (TDE — Tidal Disruption Event).
 * Basada en el evento real AT2019qiz — 19 de septiembre de 2019.
 * Fases: Aproximación → Spaghettification → Disruption → Acreción → Disco
 */

function initSketchTDE(containerEl) {
  window._p5TDE = new p5(function(p) {

    let W, H, cx, cy;
    let bgStars = [];

    /* ── Fases ─────────────────────────────────── */
    const SIM = { APPROACH: 0, STRETCH: 1, DISRUPTION: 2, ACCRETION: 3, DISK: 4 };
    let simPhase, time, phaseTime;

    const APPROACH_DUR   = 170;
    const STRETCH_DUR    = 145;
    const DISRUPTION_DUR = 115;
    const ACCRETION_DUR  = 500;

    /* ── Radios visuales ────────────────────────── */
    let bhRadius, tidalR;

    /* ── Estado de la estrella ──────────────────── */
    let starX, starY, starAngle, starStretch;
    const STAR_BASE_R = 22;

    /* ── Estela de la estrella ──────────────────── */
    let starTrail = [];

    /* ── Partículas ─────────────────────────────── */
    let boundParticles   = [];
    let unboundParticles = [];
    let jetParticles     = [];

    /* ── Disco ──────────────────────────────────── */
    let diskAlpha  = 0;
    let flarePhase = 0;

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
      p.resizeCanvas(containerEl.offsetWidth || 800, containerEl.offsetHeight || 600);
      _resize();
    };

    function _resize() {
      W = p.width; H = p.height;
      cx = W * 0.50; cy = H * 0.50;
      bhRadius = Math.min(W, H) * 0.082;
      tidalR   = Math.min(W, H) * 0.27;
    }

    /* ─────────────────────────────────────────────
       RESET
    ───────────────────────────────────────────── */
    function _reset() {
      simPhase  = SIM.APPROACH;
      time      = 0;
      phaseTime = 0;
      starStretch = 1;
      starTrail        = [];
      boundParticles   = [];
      unboundParticles = [];
      jetParticles     = [];
      diskAlpha  = 0;
      flarePhase = 0;

      const d0 = Math.min(W, H) * 0.43;
      starX = cx + d0 * 0.72;
      starY = cy - d0 * 0.52;
      starAngle = 0;

      _updateSidebar('Aproximación',
        'Una estrella solar entra en la zona gravitacional de<br>' +
        'un agujero negro supermasivo (M<sub>BH</sub> ≈ 10⁶ M☉).<br><br>' +
        'El radio de disruption de marea:<br>' +
        'r<sub>t</sub> = R★ · (M<sub>BH</sub>/M★)<sup>1/3</sup> ≈ 100 R☉'
      );
    }

    function _buildBgStars() {
      bgStars = [];
      for (let i = 0; i < 270; i++) {
        bgStars.push({
          x : Math.random(),
          y : Math.random(),
          sz: Math.random() * 1.4 + 0.3,
          b : 50 + Math.random() * 100,
        });
      }
    }

    /* ─────────────────────────────────────────────
       DRAW LOOP
    ───────────────────────────────────────────── */
    p.draw = function() {
      p.background(0, 2, 7);
      _drawBgStars();
      _drawLensGlow();
      _drawAccretionDisk();
      _drawBHCore();

      time++;
      phaseTime++;

      switch (simPhase) {
        case SIM.APPROACH:   _stepApproach();   break;
        case SIM.STRETCH:    _stepStretch();    break;
        case SIM.DISRUPTION: _stepDisruption(); break;
        case SIM.ACCRETION:  _stepAccretion();  break;
        case SIM.DISK:       _stepDisk();       break;
      }

      _drawHUD();
    };

    /* ─────────────────────────────────────────────
       FONDO
    ───────────────────────────────────────────── */
    function _drawBgStars() {
      p.noStroke();
      for (const s of bgStars) {
        const dx = s.x * W - cx, dy = s.y * H - cy;
        const d  = Math.sqrt(dx * dx + dy * dy);
        const dimFactor = d < bhRadius * 2.5 ? 0.15 : 1;
        p.fill(s.b, s.b, Math.min(s.b + 18, 255), 155 * dimFactor);
        p.circle(s.x * W, s.y * H, s.sz);
      }
    }

    function _drawLensGlow() {
      for (let gi = 9; gi >= 1; gi--) {
        const r = bhRadius * (1.6 + gi * 0.55);
        p.noFill();
        p.stroke(10 + gi * 3, 4 + gi, 30 + gi * 7, 14 - gi * 1.2);
        p.strokeWeight(bhRadius * 0.5);
        p.circle(cx, cy, r * 2);
      }
    }

    /* ─────────────────────────────────────────────
       AGUJERO NEGRO
    ───────────────────────────────────────────── */
    function _drawAccretionDisk() {
      const intensity = simPhase >= SIM.ACCRETION ? diskAlpha : 0.12;
      if (intensity <= 0.01) return;

      const dOuter = bhRadius * 3.9;
      const dInner = bhRadius * 1.22;
      const tilt   = 0.30;

      // Back half of disk (drawn before BH core)
      for (let r = dOuter; r > dInner; r -= 2.8) {
        const t   = 1 - (r - dInner) / (dOuter - dInner);
        const col_r = Math.round(255 * Math.pow(t, 0.55));
        const col_g = Math.round(70 * t + 15);
        const col_b = 6;
        p.noFill();
        p.stroke(col_r, col_g, col_b, t * 125 * intensity);
        p.strokeWeight(2.4);
        p.ellipse(cx, cy, r * 2, r * tilt * 2);
      }

      // Bright inner rim
      if (intensity > 0.25) {
        p.noFill();
        p.stroke(255, 200, 80, 75 * intensity);
        p.strokeWeight(3);
        p.ellipse(cx, cy, dInner * 2.05, dInner * tilt * 2.05);
      }

      // X-ray flare pulse
      if (simPhase === SIM.DISK) {
        flarePhase += 0.038;
        const fl = Math.sin(flarePhase);
        if (fl > 0.82) {
          const fi = (fl - 0.82) / 0.18;
          p.noFill();
          p.stroke(210, 100, 255, fi * 55);
          p.strokeWeight(bhRadius * 0.7);
          p.circle(cx, cy, bhRadius * 3.4);
        }
      }
    }

    function _drawBHCore() {
      // Horizonte de eventos (negro)
      p.noStroke(); p.fill(0);
      p.circle(cx, cy, bhRadius * 2);

      // Anillo de fotones
      p.noFill();
      p.stroke(255, 130, 15, 42);
      p.strokeWeight(2);
      p.circle(cx, cy, bhRadius * 1.50 * 2);

      // Anillo de Einstein
      p.stroke(170, 130, 55, 32);
      p.strokeWeight(2.5);
      p.circle(cx, cy, bhRadius * 2.12 * 2);

      // Etiqueta
      p.noStroke(); p.fill(255, 55, 145, 135);
      p.textAlign(p.CENTER);
      p.textSize(7.5);
      p.textFont('Share Tech Mono, monospace');
      p.text('M ≈ 10⁶ M☉', cx, cy + bhRadius + 15);
    }

    function _drawTidalRadius() {
      if (simPhase > SIM.STRETCH) return;
      p.drawingContext.save();
      p.drawingContext.setLineDash([4, 5]);
      p.noFill();
      p.stroke(255, 165, 50, 26);
      p.strokeWeight(0.9);
      p.circle(cx, cy, tidalR * 2);
      p.drawingContext.setLineDash([]);
      p.drawingContext.restore();

      p.noStroke(); p.fill(255, 165, 50, 38);
      p.textSize(7); p.textAlign(p.RIGHT);
      p.text('rₜ', cx + tidalR - 5, cy - 4);
    }

    /* ─────────────────────────────────────────────
       FASE 1 — APROXIMACIÓN
    ───────────────────────────────────────────── */
    function _stepApproach() {
      _drawTidalRadius();
      const prog = phaseTime / APPROACH_DUR;
      // Ease acelerado: empieza rápido, desacelera al llegar al radio de disruption
      const ease = Math.pow(prog, 0.60);

      // Arco más amplio: empieza más lejos y con mayor deflexión angular
      const theta0 = -1.20, theta1 = 0.25;
      const d0     = tidalR * 1.85;
      const theta  = theta0 + (theta1 - theta0) * ease;
      const dist   = d0 - (d0 - tidalR) * Math.pow(prog, 0.75);

      starX     = cx + Math.cos(theta) * dist;
      starY     = cy + Math.sin(theta) * dist;
      starAngle = theta;

      // Estiramiento por marea (crece como r⁻³ al acercarse)
      const distBH   = Math.sqrt((starX - cx)**2 + (starY - cy)**2);
      const radAngle = Math.atan2(cy - starY, cx - starX);
      starStretch    = 1 + 0.5 * Math.pow(tidalR / distBH, 3.0);

      // Estela tipo cometa (trail)
      starTrail.push({ x: starX, y: starY });
      if (starTrail.length > 30) starTrail.shift();
      _drawStarTrail();

      // Líneas de fuerza gravitacional BH → estrella
      _drawGravityLines(starX, starY, prog);

      _drawStar(starX, starY, starStretch, radAngle);

      _updateSidebarLive(`d ≈ ${(distBH / tidalR * 100).toFixed(0)}% r<sub>t</sub> · Δf<sub>tidal</sub> creciente`);

      if (phaseTime >= APPROACH_DUR) {
        starTrail = [];
        simPhase = SIM.STRETCH; phaseTime = 0;
        _updateSidebar('Spaghettification',
          'La fuerza de marea supera la autogravedad:<br>' +
          '<b>F<sub>tidal</sub> ∝ G · M<sub>BH</sub> · R★ / r³</b><br><br>' +
          'La estrella se estira en un filamento — el<br>' +
          'fenómeno llamado <b>Spaghettification</b>.'
        );
      }
    }

    function _drawStarTrail() {
      const n = starTrail.length;
      for (let i = 0; i < n; i++) {
        const t = i / n;               // 0 = oldest, 1 = newest
        const sz = STAR_BASE_R * 1.4 * t;
        p.noStroke(); p.fill(255, 200, 90, t * 90);
        p.circle(starTrail[i].x, starTrail[i].y, sz);
      }
    }

    function _drawGravityLines(sx, sy, prog) {
      if (prog < 0.1) return;
      const alpha = Math.min((prog - 0.1) / 0.4, 1) * 55;
      const numLines = 5;
      p.stroke(255, 165, 40, alpha);
      p.strokeWeight(0.8);
      p.noFill();
      for (let i = 0; i < numLines; i++) {
        // Lines from BH toward star, spread slightly
        const spread = (i - (numLines - 1) / 2) * 0.12;
        const angBase = Math.atan2(sy - cy, sx - cx);
        const ang = angBase + spread;
        const bx  = cx + Math.cos(ang) * bhRadius * 1.4;
        const by  = cy + Math.sin(ang) * bhRadius * 1.4;
        p.line(bx, by, sx, sy);
      }
    }

    /* ─────────────────────────────────────────────
       FASE 2 — SPAGHETTIFICATION
    ───────────────────────────────────────────── */
    function _stepStretch() {
      _drawTidalRadius();
      const prog = phaseTime / STRETCH_DUR;

      const theta = 0.22 + prog * 0.60;
      const dist  = tidalR * (1.0 - prog * 0.38);
      starX = cx + Math.cos(theta) * dist;
      starY = cy + Math.sin(theta) * dist;
      starAngle = theta;

      // Elongación dramática en dirección radial (hacia BH)
      starStretch  = 1 + prog * 15;
      const radAngle = Math.atan2(cy - starY, cx - starX);

      _drawStar(starX, starY, starStretch, radAngle);

      // Filamento ligado que apunta hacia el BH
      if (prog > 0.28) {
        const fa = (prog - 0.28) / 0.72;
        const tipX = starX + Math.cos(radAngle) * STAR_BASE_R * Math.min(starStretch, 16) * 0.85;
        const tipY = starY + Math.sin(radAngle) * STAR_BASE_R * Math.min(starStretch, 16) * 0.85;

        p.noFill();
        p.stroke(255, 185, 75, fa * 85);
        p.strokeWeight(2.8);
        p.bezier(
          tipX, tipY,
          tipX + (cx - tipX) * 0.4, tipY + (cy - tipY) * 0.25,
          cx + Math.cos(theta - 0.5) * bhRadius * 2.8,
          cy + Math.sin(theta - 0.5) * bhRadius * 2.8,
          cx + Math.cos(theta - 0.9) * bhRadius * 1.4,
          cy + Math.sin(theta - 0.9) * bhRadius * 1.4
        );
      }

      _updateSidebarLive(`Elongación: ${starStretch.toFixed(1)}× — r ≈ ${(dist/tidalR*100).toFixed(0)}% r<sub>t</sub>`);

      if (phaseTime >= STRETCH_DUR) {
        _spawnDisruptionParticles();
        simPhase = SIM.DISRUPTION; phaseTime = 0;
        _updateSidebar('Disruption Completa',
          '~50% cae ligado al BH (forma el disco).<br>' +
          '~50% escapa como flujo no ligado.<br><br>' +
          'El material ligado retorna en ~40 días,<br>' +
          'formando el <b>disco de acreción brillante</b>.'
        );
      }
    }

    /* ─────────────────────────────────────────────
       SPAWN DE PARTÍCULAS
    ───────────────────────────────────────────── */
    function _spawnDisruptionParticles() {
      const radAngle = Math.atan2(cy - starY, cx - starX);
      const starA    = STAR_BASE_R * Math.min(starStretch, 16);

      // Material ligado → espiral hacia BH → disco
      for (let i = 0; i < 230; i++) {
        const t      = (i / 230); // posición a lo largo del filamento
        const fAngle = radAngle + (Math.random() - 0.5) * Math.PI * 0.65;
        const spd    = 0.4 + Math.random() * 2.0;
        const c      = _tempColor(5000 + Math.random() * 2500);
        boundParticles.push({
          x : starX + Math.cos(radAngle) * (t - 0.5) * starA * 1.6,
          y : starY + Math.sin(radAngle) * (t - 0.5) * starA * 1.6,
          vx: Math.cos(fAngle) * spd,
          vy: Math.sin(fAngle) * spd,
          r  : c.r, g: c.g, b: c.b,
          life : 1.0,
          decay: 0.0020 + Math.random() * 0.0018,
          sz   : 1.5 + Math.random() * 2.5,
        });
      }

      // Material no ligado → escapa
      const escapeAngle = radAngle + Math.PI;
      for (let i = 0; i < 190; i++) {
        const spread = (Math.random() - 0.5) * Math.PI * 0.85;
        const spd    = 2.2 + Math.random() * 5;
        const ang    = escapeAngle + spread;
        const c      = _tempColor(8000 + Math.random() * 4000);
        unboundParticles.push({
          x : starX + (Math.random() - 0.5) * 22,
          y : starY + (Math.random() - 0.5) * 22,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          r  : c.r, g: c.g, b: c.b,
          life : 1.0,
          decay: 0.0038 + Math.random() * 0.004,
          sz   : 1.0 + Math.random() * 1.8,
        });
      }
    }

    /* ─────────────────────────────────────────────
       FASES 3-5
    ───────────────────────────────────────────── */
    function _stepDisruption() {
      _updateParticles();
      if (phaseTime >= DISRUPTION_DUR) {
        simPhase = SIM.ACCRETION; phaseTime = 0;
        _updateSidebar('Acreción — Disco X',
          'Material cayendo calienta el disco:<br>' +
          'T<sub>disco</sub> ≈ 10⁵–10⁷ K → emisión en <b>rayos X</b>.<br><br>' +
          'Jets relativistas emergen de los polos<br>' +
          'a &gt; 0.9c, visibles como GRB corto.'
        );
      }
    }

    function _stepAccretion() {
      const prog = phaseTime / ACCRETION_DUR;
      diskAlpha  = Math.min(prog * 2.8, 1);

      _updateParticles();
      if (p.frameCount % 3 === 0 && prog > 0.12) _spawnJetParticle();
      _updateJetParticles();
      if (prog > 0.08) _drawJets(Math.min((prog - 0.08) / 0.55, 1));

      const lum = (1e44 * diskAlpha).toExponential(1);
      _updateSidebarLive(`L ≈ ${lum} erg/s · T ≈ ${(1 + diskAlpha * 9).toFixed(0)}×10⁵ K`);

      if (phaseTime >= ACCRETION_DUR) {
        simPhase = SIM.DISK; phaseTime = 0;
        _updateSidebar('Disco Estable — TDE',
          'Disco de acreción estable observable.<br>' +
          'L<sub>pico</sub> ≈ 10⁴⁴ erg/s ≈ 10¹⁰ L☉.<br><br>' +
          'AT2019qiz duró ~100 días antes de<br>' +
          'desvanecerse gradualmente.'
        );
      }
    }

    function _stepDisk() {
      diskAlpha = Math.min(diskAlpha + 0.003, 1.0);
      _updateParticles();
      if (p.frameCount % 4 === 0) _spawnJetParticle();
      _updateJetParticles();
      _drawJets(1);

      _updateSidebarLive('Disco activo · Destellos X periódicos');
    }

    /* ─────────────────────────────────────────────
       FÍSICA DE PARTÍCULAS
    ───────────────────────────────────────────── */
    function _updateParticles() {
      // Ligadas: gravedad hacia BH → disco
      for (let i = boundParticles.length - 1; i >= 0; i--) {
        const pt = boundParticles[i];
        const dx = cx - pt.x, dy = cy - pt.y;
        const d  = Math.sqrt(dx * dx + dy * dy) || 1;
        const g  = 880 / (d * d);
        pt.vx += (dx / d) * g;
        pt.vy += (dy / d) * g;
        const spd = Math.sqrt(pt.vx * pt.vx + pt.vy * pt.vy);
        if (spd > 9) { pt.vx *= 9 / spd; pt.vy *= 9 / spd; }
        pt.x += pt.vx; pt.y += pt.vy;
        pt.life -= pt.decay;
        if (pt.life <= 0 || d < bhRadius * 0.75) { boundParticles.splice(i, 1); continue; }
        p.noStroke(); p.fill(pt.r, pt.g, pt.b, pt.life * 215);
        p.circle(pt.x, pt.y, pt.sz * Math.max(pt.life, 0.25));
      }

      // No ligadas: escapan
      for (let i = unboundParticles.length - 1; i >= 0; i--) {
        const pt = unboundParticles[i];
        pt.x += pt.vx; pt.y += pt.vy;
        pt.life -= pt.decay;
        if (pt.life <= 0 || pt.x < -70 || pt.x > W + 70 || pt.y < -70 || pt.y > H + 70) {
          unboundParticles.splice(i, 1); continue;
        }
        p.noStroke(); p.fill(pt.r, pt.g, pt.b, pt.life * 175);
        p.circle(pt.x, pt.y, pt.sz * pt.life);
      }
    }

    function _spawnJetParticle() {
      for (const dir of [-1, 1]) {
        const spread = (Math.random() - 0.5) * 9;
        jetParticles.push({
          x  : cx + spread,
          y  : cy,
          vx : spread * 0.07,
          vy : dir * (4.2 + Math.random() * 2.8),
          life : 1.0,
          decay: 0.011 + Math.random() * 0.006,
          sz   : 1.5 + Math.random() * 2.2,
        });
      }
    }

    function _updateJetParticles() {
      for (let i = jetParticles.length - 1; i >= 0; i--) {
        const pt = jetParticles[i];
        pt.x += pt.vx; pt.y += pt.vy;
        pt.life -= pt.decay;
        if (pt.life <= 0) { jetParticles.splice(i, 1); continue; }
        const t = 1 - pt.life;
        p.noStroke(); p.fill(95 + t * 85, 165 + t * 65, 255, pt.life * 205);
        p.circle(pt.x, pt.y, pt.sz * pt.life);
      }
    }

    function _drawJets(intensity) {
      if (intensity <= 0) return;
      const jLen = Math.min(W, H) * 0.44 * intensity;
      for (let gi = 5; gi >= 1; gi--) {
        p.noFill();
        p.stroke(75, 145, 255, 18 * intensity * (gi / 5));
        p.strokeWeight(gi * 4.5);
        p.line(cx, cy - bhRadius * 1.05, cx, cy - bhRadius - jLen * (gi * 0.22));
        p.line(cx, cy + bhRadius * 1.05, cx, cy + bhRadius + jLen * (gi * 0.22));
      }
      p.stroke(195, 228, 255, 88 * intensity);
      p.strokeWeight(1.8);
      p.line(cx, cy - bhRadius, cx, cy - bhRadius - jLen);
      p.line(cx, cy + bhRadius, cx, cy + bhRadius + jLen);
    }

    /* ─────────────────────────────────────────────
       DIBUJAR ESTRELLA (ELIPSE ELONGADA)
    ───────────────────────────────────────────── */
    function _drawStar(x, y, stretch, rotation) {
      const a = STAR_BASE_R * Math.min(stretch, 16);
      const b = STAR_BASE_R / Math.max(Math.sqrt(stretch), 1);

      p.push();
      p.translate(x, y);
      p.rotate(rotation);
      // Halo luminoso
      for (let gi = 5; gi >= 1; gi--) {
        p.noStroke(); p.fill(255, 195, 85, 6 * gi);
        p.ellipse(0, 0, a * (1 + gi * 0.30) * 2, b * (1 + gi * 0.45) * 2);
      }
      // Cuerpo
      p.noStroke(); p.fill(255, 218, 105, 238);
      p.ellipse(0, 0, a * 2, b * 2);
      // Núcleo caliente
      p.fill(255, 255, 205, 205);
      p.ellipse(0, 0, a * 0.52 * 2, b * 0.52 * 2);
      p.pop();
    }

    /* ─────────────────────────────────────────────
       HUD
    ───────────────────────────────────────────── */
    function _drawHUD() {
      const LABELS = ['Aproximación', 'Spaghettification', 'Disruption', 'Acreción', 'Disco'];
      const COLORS = [
        [75, 195, 255],
        [255, 200, 65],
        [255, 105, 35],
        [255, 65, 155],
        [255, 125, 45],
      ];
      const DURS = [APPROACH_DUR, STRETCH_DUR, DISRUPTION_DUR, ACCRETION_DUR, 9999];

      const [r, g, b] = COLORS[simPhase];
      const prog = Math.min(phaseTime / DURS[simPhase], 1);

      p.noStroke(); p.fill(r, g, b, 195);
      p.textAlign(p.CENTER); p.textSize(11);
      p.textFont('Share Tech Mono, monospace');
      p.text(`AT2019qiz · TDE — ${LABELS[simPhase]}`, cx, 30);

      const bw = 235, bx = cx - bw / 2, by = 38;
      p.noStroke(); p.fill(3, 10, 22); p.rect(bx, by, bw, 3.5, 2);
      p.fill(r, g, b, 200); p.rect(bx, by, bw * prog, 3.5, 2);

      // Texto icónico de "Spaghettification" en fase STRETCH
      if (simPhase === SIM.STRETCH && phaseTime > 35) {
        const fa = Math.min((phaseTime - 35) / 45, 1);
        p.fill(255, 235, 80, fa * 195);
        p.textSize(15);
        p.textFont('Orbitron, sans-serif');
        p.text('Spaghettification', cx, H - 28);
        p.textFont('Share Tech Mono, monospace');
      }
    }

    /* ─────────────────────────────────────────────
       SIDEBAR DOM
    ───────────────────────────────────────────── */
    function _updateSidebar(phase, html) {
      if (window.currentCollisionEvent !== 'tde') return;
      const el = document.getElementById('mergerPhaseInfo');
      if (!el) return;
      el.innerHTML =
        `<span style="color:#ffcc44;font-family:'Share Tech Mono',monospace;font-size:0.54rem;` +
        `letter-spacing:.1em;">${phase}</span><br><br>${html}`;
    }

    function _updateSidebarLive(html) {
      if (window.currentCollisionEvent !== 'tde') return;
      const el = document.getElementById('mergerLiveInfo');
      if (el) el.innerHTML = html;
    }

    /* ─────────────────────────────────────────────
       COLORES POR TEMPERATURA
    ───────────────────────────────────────────── */
    function _tempColor(T) {
      if (T < 4000) return { r: 255, g: 100,  b: 20  };
      if (T < 6000) return { r: 255, g: 185,  b: 75  };
      if (T < 9000) return { r: 255, g: 245,  b: 155 };
      return                { r: 175, g: 210,  b: 255 };
    }

    /* ─────────────────────────────────────────────
       API PÚBLICA
    ───────────────────────────────────────────── */
    p.restartTDE = _reset;

  }, containerEl);
}
