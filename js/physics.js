/**
 * physics.js
 * ─────────────────────────────────────────────
 * Constantes físicas (CGS) y ecuaciones de
 * estructura estelar, objetos compactos y
 * relatividad general simplificada.
 * ─────────────────────────────────────────────
 */

const PHYSICS = (() => {

  /* ── Constantes fundamentales (CGS) ───────── */
  const M_SUN  = 1.989e33;   // g
  const R_SUN  = 6.96e10;    // cm
  const L_SUN  = 3.828e33;   // erg/s
  const G      = 6.674e-8;   // cm³ g⁻¹ s⁻²
  const C      = 2.998e10;   // cm/s
  const K_B    = 1.38e-16;   // erg/K
  const M_H    = 1.67e-24;   // g
  const SIGMA  = 5.67e-5;    // erg cm⁻² s⁻¹ K⁻⁴

  /* ── Límites de objetos compactos ──────────── */
  const CHANDRASEKHAR_LIMIT = 1.44;  // M_sun
  const TOV_LIMIT_SOFT      = 2.17;  // M_sun
  const TOV_LIMIT_HARD      = 3.0;   // M_sun

  /* ── Relación Masa-Luminosidad ─────────────── */
  function luminosity(M) {
    // M en M_sun, retorna L en L_sun
    if (M <= 0.10) return 0.001 * Math.pow(M / 0.1, 2.5);
    if (M <= 0.43) return 0.23  * Math.pow(M, 2.3);
    if (M <= 2.0)  return        Math.pow(M, 4.0);
    if (M <= 55)   return 1.4   * Math.pow(M, 3.5);
    return 32000 * M;
  }

  /* ── Radio en Secuencia Principal ──────────── */
  function mainSequenceRadius(M) {
    // retorna R en R_sun
    if (M < 1) return Math.pow(M, 0.80);
    return         Math.pow(M, 0.57);
  }

  /* ── Temperatura efectiva (Stefan-Boltzmann) ── */
  function effectiveTemp(L_lsun, R_rsun) {
    const L = L_lsun * L_SUN;
    const R = R_rsun * R_SUN;
    return Math.pow(L / (4 * Math.PI * R * R * SIGMA), 0.25);
  }

  /* ── Tiempo de vida en Secuencia Principal ─── */
  function mainSequenceLifetime(M) {
    // años — τ ∝ M/L ∝ M^-2.5
    return 1e10 * Math.pow(M, -2.5);
  }

  /* ── Radio de Schwarzschild ─────────────────── */
  function schwarzschildRadius(M_msun) {
    // en R_sun
    return 2 * G * (M_msun * M_SUN) / (C * C) / R_SUN;
  }

  /* ── Radio de Enana Blanca (Nauenberg 1972) ─── */
  function whiteDwarfRadius(M_msun) {
    if (M_msun >= CHANDRASEKHAR_LIMIT) return 0;
    const x = M_msun / CHANDRASEKHAR_LIMIT;
    return 0.0126 * Math.sqrt(1 - Math.pow(x, 4/3)) / Math.pow(M_msun, 1/3);
  }

  /* ── Radio de Estrella de Neutrones ─────────── */
  function neutronStarRadius(M_msun) {
    // ~10-14 km en R_sun (≈ 1.44e-5 R_sun)
    const R_ref = 1.2e-4;
    return R_ref * (1 + 0.15 * (1.4 / Math.max(M_msun, 0.5)));
  }

  /* ── Integrador Runge-Kutta 4 ───────────────── */
  // Resuelve dM/dr = 4π r² ρ  y  dP/dr = -G M(r) ρ / r²
  // un solo paso dr desde (r, M_r, P)
  function rk4Step(r, M_r, P, rho, dr) {
    function dM(ri)      { return 4 * Math.PI * ri * ri * rho; }
    function dP(ri, Mi)  { return -(G * Mi * rho) / (ri * ri); }

    const k1M = dM(r);
    const k1P = dP(r, M_r);

    const r2  = r   + dr/2;
    const M2  = M_r + k1M * dr/2;
    const k2M = dM(r2);
    const k2P = dP(r2, M2);

    const k3M = dM(r2);
    const k3P = dP(r2, M_r + k2M * dr/2);

    const r4  = r   + dr;
    const M4  = M_r + k3M * dr;
    const k4M = dM(r4);
    const k4P = dP(r4, M4);

    return {
      dM: (k1M + 2*k2M + 2*k3M + k4M) * dr / 6,
      dP: (k1P + 2*k2P + 2*k3P + k4P) * dr / 6
    };
  }

  /* ── TOV (versión relativista simplificada) ── */
  // dP/dr = -G(ρ + P/c²)(M + 4πr³P/c²) / [r²(1 - 2GM/rc²)]
  function tovStep(r, M_r, P, rho, dr) {
    const c2 = C * C;
    function dM(ri)        { return 4 * Math.PI * ri * ri * rho; }
    function dP(ri, Mi, Pi) {
      const num = G * (rho + Pi/c2) * (Mi + 4*Math.PI*ri*ri*ri*Pi/c2);
      const den = ri*ri * (1 - 2*G*Mi/(ri*c2));
      return -num / Math.max(den, 1e-30);
    }

    const k1M = dM(r);
    const k1P = dP(r, M_r, P);
    const r2  = r   + dr/2;
    const M2  = M_r + k1M * dr/2;
    const P2  = P   + k1P * dr/2;
    const k2M = dM(r2);
    const k2P = dP(r2, M2, P2);

    return {
      dM: k2M * dr,
      dP: k2P * dr
    };
  }

  /* ── Tasa de pérdida de masa (vientos) ──────── */
  // Retorna dM/dt en M_sun/yr
  function massLossRate(M_msun, L_lsun, R_rsun, T_eff) {
    if (T_eff > 15000 || M_msun >= 15) {
      // de Jager et al. (1988) para estrellas masivas
      const logMdot = 1.769 * Math.log10(L_lsun) - 1.676 * Math.log10(T_eff) - 8.158;
      return Math.pow(10, Math.max(logMdot, -15));
    }
    // Reimers (1975) para gigantes frías: η ~ 0.5
    const eta = 0.5;
    return Math.max(4e-13 * eta * L_lsun * R_rsun / M_msun, 0);
  }

  /* ── Presión de degeneración (estado politrópico) */
  // Enana blanca no-relativista:   P = K_nr · ρ^(5/3)
  // Enana blanca ultra-relativista: P = K_ur · ρ^(4/3)
  function degeneratePressureWD(rho_cgs, relativistic = false) {
    const K_nr = 1.004e13;  // cgs, μ_e = 2
    const K_ur = 1.244e15;
    return relativistic ?
      K_ur * Math.pow(rho_cgs, 4/3) :
      K_nr * Math.pow(rho_cgs, 5/3);
  }

  /* ── Mapeo Temperatura → Color RGB ──────────── */
  // Aproximación de la curva de Planck
  function tempToColor(T) {
    if (!T || T <= 0) return { r:0, g:0, b:0 };
    // Tabla de puntos de control
    const table = [
      [3000,  255,  80,  20],
      [3500,  255, 100,  35],
      [4000,  255, 130,  55],
      [4500,  255, 160,  80],
      [5000,  255, 195, 110],
      [5800,  255, 230, 175],
      [6500,  255, 248, 215],
      [7500,  255, 252, 235],
      [10000, 220, 235, 255],
      [15000, 185, 215, 255],
      [20000, 165, 200, 255],
      [30000, 140, 175, 255],
      [40000, 120, 160, 255],
      [80000, 100, 140, 255],
    ];
    if (T <= table[0][0]) return { r: table[0][1], g: table[0][2], b: table[0][3] };
    const last = table[table.length - 1];
    if (T >= last[0]) return { r: last[1], g: last[2], b: last[3] };

    for (let i = 0; i < table.length - 1; i++) {
      if (T >= table[i][0] && T < table[i+1][0]) {
        const t = (T - table[i][0]) / (table[i+1][0] - table[i][0]);
        return {
          r: Math.round(table[i][1] + t * (table[i+1][1] - table[i][1])),
          g: Math.round(table[i][2] + t * (table[i+1][2] - table[i][2])),
          b: Math.round(table[i][3] + t * (table[i+1][3] - table[i][3])),
        };
      }
    }
    return { r: 100, g: 140, b: 255 };
  }

  /* ── API pública ─────────────────────────────── */
  return {
    M_SUN, R_SUN, L_SUN, G, C, SIGMA,
    CHANDRASEKHAR_LIMIT, TOV_LIMIT_SOFT, TOV_LIMIT_HARD,
    luminosity,
    mainSequenceRadius,
    effectiveTemp,
    mainSequenceLifetime,
    schwarzschildRadius,
    whiteDwarfRadius,
    neutronStarRadius,
    rk4Step,
    tovStep,
    massLossRate,
    degeneratePressureWD,
    tempToColor,
  };
})();
