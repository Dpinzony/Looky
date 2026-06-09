/**
 * particles.js
 * ─────────────────────────────────────────────
 * Sistema de partículas para:
 *   · Nebulosa planetaria
 *   · Onda de choque de supernova
 * ─────────────────────────────────────────────
 */

const PARTICLES = (() => {

  let _pool      = [];   // partículas supernova/explosión
  let _nebula    = [];   // partículas nebulosa planetaria
  let _shockRing = null; // onda de choque expandiéndose

  /* ── Spawn ───────────────────────────────────── */

  function spawnNebula(n = 3) {
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 1.6;
      _nebula.push({
        x : 0, y : 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        size: 2 + Math.random() * 5,
        r: 80  + Math.floor(Math.random() * 80),
        g: 40  + Math.floor(Math.random() * 100),
        b: 140 + Math.floor(Math.random() * 115),
      });
    }
  }

  function spawnSupernova(n = 40) {
    _pool = [];
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 10;
      _pool.push({
        x : 0, y : 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life : 1.0,
        decay: 0.002 + Math.random() * 0.004,
        size : 1.5 + Math.random() * 4,
        r: 255,
        g: Math.floor(Math.random() * 220),
        b: Math.floor(Math.random() * 60),
      });
    }
    // Onda de choque
    _shockRing = { r: 0, maxR: 900, speed: 2.5, alpha: 1.0 };
  }

  function tickSupernova(n = 2) {
    // Reponer unas pocas partículas mientras dure la fase
    if (Math.random() > 0.5) return;
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 6;
      _pool.push({
        x:0, y:0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8, decay: 0.004 + Math.random() * 0.006,
        size: 1 + Math.random() * 3,
        r: 255, g: Math.floor(Math.random() * 180), b: 0,
      });
    }
  }

  /* ── Actualizar & dibujar (requiere p5 context) ─ */

  function updateAndDrawExplosion(p, cx, cy) {
    // Pool de partículas
    for (let i = _pool.length - 1; i >= 0; i--) {
      const pt = _pool[i];
      pt.x    += pt.vx * 0.45;
      pt.y    += pt.vy * 0.45;
      pt.life -= pt.decay;
      if (pt.life <= 0) { _pool.splice(i, 1); continue; }
      p.noStroke();
      const fade = Math.pow(pt.life, 0.5);
      p.fill(pt.r, pt.g, Math.floor(pt.b + (1-pt.life)*120), fade * 220);
      p.circle(cx + pt.x * 12, cy + pt.y * 12, pt.size * pt.life * 1.5);
    }

    // Onda de choque
    if (_shockRing) {
      _shockRing.r     += _shockRing.speed;
      _shockRing.alpha  = Math.max(0, 1 - _shockRing.r / _shockRing.maxR);
      if (_shockRing.alpha > 0) {
        p.noFill();
        p.stroke(255, 200, 100, _shockRing.alpha * 180);
        p.strokeWeight(2.5);
        p.circle(cx, cy, _shockRing.r * 2);
        // halo interior
        p.stroke(255, 240, 180, _shockRing.alpha * 80);
        p.strokeWeight(6);
        p.circle(cx, cy, (_shockRing.r - 12) * 2);
      } else {
        _shockRing = null;
      }
    }
  }

  function updateAndDrawNebula(p, cx, cy) {
    for (let i = _nebula.length - 1; i >= 0; i--) {
      const np = _nebula[i];
      np.x    += np.vx * 0.4;
      np.y    += np.vy * 0.4;
      np.life -= 0.0008;
      if (np.life <= 0) { _nebula.splice(i, 1); continue; }
      p.noStroke();
      const alpha = np.life * 90;
      p.fill(np.r, np.g, np.b, alpha);
      const sz = np.size * (2 - np.life) * 9;
      p.circle(cx + np.x * 28, cy + np.y * 28, sz);
    }
  }

  /* ── Getters de estado ───────────────────────── */
  function hasExplosion() { return _pool.length > 0 || _shockRing !== null; }
  function clear()        { _pool = []; _nebula = []; _shockRing = null; }

  return {
    spawnNebula,
    spawnSupernova,
    tickSupernova,
    updateAndDrawExplosion,
    updateAndDrawNebula,
    hasExplosion,
    clear,
  };
})();
