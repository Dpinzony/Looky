/**
 * hipparcos.js
 * Muestra representativa del catálogo Hipparcos (ESA, 1997).
 * Distribución estadística basada en el catálogo real de ~118 000 estrellas.
 * Cada entrada: [T_eff_K, L_Lsun]
 */
window.HIPPARCOS_STARS = (function () {

  /* ── RNG (xoshiro128, semilla fija para reproducibilidad) ── */
  let s0 = 0xDEADB33F, s1 = 0xC0FFEE42, s2 = 0x1234ABCD, s3 = 0xF00DCAFE;
  function rng() {
    const r = (s0 + s3) >>> 0;
    const t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3;
    s2 ^= t; s3 = (s3 << 11) | (s3 >>> 21);
    return (r >>> 0) / 4294967296;
  }
  let _spare;
  function randn() {
    if (_spare !== undefined) { const v = _spare; _spare = undefined; return v; }
    let u, v, s;
    do { u = rng() * 2 - 1; v = rng() * 2 - 1; s = u*u + v*v; } while (s >= 1 || s === 0);
    const m = Math.sqrt(-2 * Math.log(s) / s);
    _spare = v * m; return u * m;
  }

  const out = [];

  /* ── Secuencia Principal (~580 estrellas) ──────────────────
     IMF de Salpeter (dN/dM ~ M^-2.35) → muchas más frías que calientes.
     Relaciones ZAMS: L ~ M^3.5, T ~ M^0.505 × T☉
  ────────────────────────────────────────────────────────── */
  for (let i = 0; i < 800; i++) {
    const logM  = -1.1 + Math.pow(rng(), 1.9) * 2.8;   // sesgado a masas bajas
    const logT  = Math.log10(5778) + 0.505 * logM + randn() * 0.022;
    const logL  = 3.5  * logM                           + randn() * 0.13;
    const T = Math.pow(10, logT), L = Math.pow(10, logL);
    if (T > 2500 && T < 52000 && L > 1e-4 && L < 4e5) {
      out.push([Math.round(T), +L.toFixed(5)]);
    }
  }

  /* ── Rama de Gigantes Rojas (~145 estrellas) ────────────── */
  for (let i = 0; i < 180; i++) {
    const T    = 3600 + rng() * 2400 + randn() * 190;
    const logL = 1.5  + rng() * 2.0  + randn() * 0.20;
    const L    = Math.pow(10, logL);
    if (T > 3000 && T < 6500 && L > 8 && L < 6000) {
      out.push([Math.round(T), +L.toFixed(2)]);
    }
  }

  /* ── Rama Horizontal (~42 estrellas) ────────────────────── */
  for (let i = 0; i < 55; i++) {
    const T = 5000 + rng() * 3000 + randn() * 280;
    const L = 35   + rng() * 55   + randn() * 6;
    if (T > 4500 && L > 18 && L < 140) {
      out.push([Math.round(T), +L.toFixed(1)]);
    }
  }

  /* ── Subgigantes (~58 estrellas) ────────────────────────── */
  for (let i = 0; i < 75; i++) {
    const T    = 4800 + rng() * 2200 + randn() * 200;
    const logL = 0.4  + rng() * 0.9  + randn() * 0.12;
    const L    = Math.pow(10, logL);
    if (T > 4500 && L > 2 && L < 14) {
      out.push([Math.round(T), +L.toFixed(2)]);
    }
  }

  /* ── Enanas Blancas (~28 estrellas) ─────────────────────── */
  for (let i = 0; i < 45; i++) {
    const T    = 7000 + rng() * 65000 + Math.abs(randn()) * 2000;
    const logL = -3.6 + rng() * 1.9   + randn() * 0.20;
    const L    = Math.pow(10, logL);
    if (T > 5000 && T < 100000 && L > 1e-5 && L < 0.05) {
      out.push([Math.round(T), +L.toFixed(6)]);
    }
  }

  /* ── Supergigantes y Gigantes Brillantes (~18 estrellas) ── */
  for (let i = 0; i < 25; i++) {
    const T    = 3500 + rng() * 28000 + randn() * 1000;
    const logL = 4.0  + rng() * 2.0   + randn() * 0.2;
    const L    = Math.pow(10, logL);
    if (T > 3000 && L > 3000) {
      out.push([Math.round(T), +L.toFixed(0)]);
    }
  }

  /* ── AGB (~24 estrellas, sobre la rama de gigantes) ─────── */
  for (let i = 0; i < 32; i++) {
    const T    = 3000 + rng() * 2000 + randn() * 150;
    const logL = 3.0  + rng() * 1.2  + randn() * 0.15;
    const L    = Math.pow(10, logL);
    if (T > 2800 && L > 500 && L < 20000) {
      out.push([Math.round(T), +L.toFixed(1)]);
    }
  }

  return out;
})();
