/**
 * star.js
 * ─────────────────────────────────────────────
 * Máquina de estados para la evolución estelar.
 * Cada fase tiene su propio timescale escalado
 * para que la simulación sea visualmente ágil.
 * ─────────────────────────────────────────────
 */

/* ── Fases ───────────────────────────────────── */
const PHASES = {
  PROTOSTAR:        'protostar',
  MAIN_SEQUENCE:    'main_sequence',
  SUBGIANT:         'subgiant',
  RED_GIANT:        'red_giant',
  HELIUM_BURNING:   'helium_burning',
  AGB:              'agb',
  PLANETARY_NEBULA: 'planetary_nebula',
  WHITE_DWARF:      'white_dwarf',
  CORE_COLLAPSE:    'core_collapse',
  SUPERNOVA:        'supernova',
  NEUTRON_STAR:     'neutron_star',
  BLACK_HOLE:       'black_hole',
};

/* ── Fracción del tiempo de MS para cada fase ── */
// Ajustado para que ninguna fase dure > ~8 seg reales a velocidad normal
const PHASE_DURATION_FACTOR = {
  protostar:        0.008,   // 0.8 % of τ_MS
  main_sequence:    1.000,   // 100 % = base
  subgiant:         0.040,
  red_giant:        0.060,
  helium_burning:   0.035,
  agb:              0.020,
  planetary_nebula: 0.010,   // ~ 50 kyr (visual)
  core_collapse:    0.002,
  supernova:        0.008,
};

/* ── Etiquetas y ecuaciones para la UI ───────── */
const PHASE_META = {
  protostar:        { name: 'Protoestrella',           cssClass: 'protostar' },
  main_sequence:    { name: 'Secuencia Principal',     cssClass: 'main-sequence' },
  subgiant:         { name: 'Subgigante',              cssClass: 'subgiant' },
  red_giant:        { name: 'Gigante Roja',            cssClass: 'red-giant' },
  helium_burning:   { name: 'Quema de Helio',          cssClass: 'helium-burning' },
  agb:              { name: 'Rama AGB',                cssClass: 'agb' },
  planetary_nebula: { name: 'Nebulosa Planetaria',     cssClass: 'planetary-nebula' },
  white_dwarf:      { name: 'Enana Blanca',            cssClass: 'white-dwarf' },
  core_collapse:    { name: 'Colapso de Núcleo',       cssClass: 'core-collapse' },
  supernova:        { name: '☆ SUPERNOVA ☆',          cssClass: 'supernova' },
  neutron_star:     { name: 'Estrella de Neutrones',   cssClass: 'neutron-star' },
  black_hole:       { name: 'Agujero Negro',           cssClass: 'black-hole' },
};

const PHASE_EQUATIONS = {
  protostar:
    'Contracción Kelvin-Helmholtz<br>E<sub>grav</sub>=GM²/R → L<br>τ<sub>KH</sub> ≈ GM²/(RL)',
  main_sequence:
    'dP/dr = −GM(r)ρ/r²<br>dM/dr = 4πr²ρ<br>ε<sub>pp</sub>: 4H→He+γ<br>L ≈ L☉(M/M☉)³·⁵',
  subgiant:
    'Núcleo He isotérmico<br>Shell de quema H<br>Expansión del envelope',
  red_giant:
    'Deg. e⁻ núcleo He<br>Flash de helio<br>dR/dt &gt; 0, dT<sub>eff</sub>/dt &lt; 0',
  helium_burning:
    '3α: 3⁴He → ¹²C + γ<br>¹²C+⁴He → ¹⁶O + γ<br>Rama Horizontal',
  agb:
    'Shell H+He pulsado<br>Dredge-up / s-process<br>Ṁ ~ 10⁻⁵ M☉/yr (superwind)',
  planetary_nebula:
    'Expulsión del envelope<br>Fotoionización UV<br>L ∝ 4πR²σT⁴',
  white_dwarf:
    'P = Kρ⁵/³ (degen. e⁻)<br>M<sub>Ch</sub> ≈ 1.44 M☉<br>Enfriamiento: T ∝ t⁻³/⁷',
  core_collapse:
    'Foto-disintegración Fe→He<br>e⁻+p → n+ν<br>τ<sub>colapso</sub> ~ 0.1 s',
  supernova:
    'E<sub>ν</sub> ~ 3×10⁵³ erg<br>Rebote: choque de rebote<br>E<sub>cin</sub> ~ 10⁵¹ erg',
  neutron_star:
    'TOV: dP/dr = −G(ρ+P/c²)(M+4πr³P/c²)/[r²(1−2GM/rc²)]<br>M<sub>TOV</sub> ≈ 2.17 M☉',
  black_hole:
    'r<sub>s</sub> = 2GM/c²<br>Métrica Schwarzschild<br>ds² = −(1−r<sub>s</sub>/r)dt²+…',
};

/* ══════════════════════════════════════════════
   FÁBRICA DE ESTRELLA
   ══════════════════════════════════════════════ */
function createStar(M_msun) {
  const fate = M_msun < 8  ? 'white_dwarf'  :
               M_msun < 25 ? 'neutron_star'  :
                             'black_hole';

  const tauMS = PHYSICS.mainSequenceLifetime(M_msun); // años
  const R_ms  = PHYSICS.mainSequenceRadius(M_msun);
  const L_ms  = PHYSICS.luminosity(M_msun);
  const T_ms  = PHYSICS.effectiveTemp(L_ms, R_ms);

  return {
    // ── Identidad ──
    M_initial : M_msun,
    M         : M_msun,
    M_core    : 0,
    fate,

    // ── Estructura ──
    R : R_ms * 0.02,        // empieza pequeña (protoestrella)
    L : L_ms * 0.001,
    T : 2500,

    // ── Referencias de MS ──
    R_ms, L_ms, T_ms,

    // ── Composición ──
    H_frac  : 0.74,
    He_frac : 0.24,
    C_frac  : 0.02,

    // ── Evolución ──
    phase        : PHASES.PROTOSTAR,
    age          : 0,           // años
    tauMS        : tauMS,
    phaseTimer   : 0,
    phaseDuration: tauMS * PHASE_DURATION_FACTOR.protostar,

    // ── Objeto compacto ──
    M_compact  : 0,
    R_compact  : 0,
    compactType: '',

    // ── Visual ──
    pulsePhase     : 0,
    accretionAngle : 0,
    massLost       : 0,
    snovaActive    : false,
  };
}

/* ══════════════════════════════════════════════
   PASO DE EVOLUCIÓN
   Recibe dtYears (años simulados por frame × speed)
   ══════════════════════════════════════════════ */
function evolveStep(star, dtYears) {
  star.age        += dtYears;
  star.phaseTimer += dtYears;

  const s    = star;
  const lerp = (a, b, t) => a + (b - a) * Math.min(Math.max(t, 0), 1);
  const prog = () => Math.min(s.phaseTimer / s.phaseDuration, 1);

  switch (s.phase) {

    /* ── Protoestrella ───────────────────────── */
    case PHASES.PROTOSTAR: {
      const p = prog();
      s.R = lerp(s.M_initial * 4, s.R_ms,  Math.pow(p, 0.45));
      s.T = lerp(2500,             s.T_ms,  p);
      s.L = lerp(s.L_ms * 0.001,  s.L_ms,  p);
      if (p >= 1) _transition(s, PHASES.MAIN_SEQUENCE, s.tauMS);
      break;
    }

    /* ── Secuencia Principal ─────────────────── */
    case PHASES.MAIN_SEQUENCE: {
      const p = prog();

      // Consumo de H → He
      s.H_frac   = Math.max(0.74 * (1 - p) + 0.04, 0);
      s.He_frac  = Math.min(0.24 + 0.70 * p, 0.95);
      s.M_core   = s.M * p * 0.12;

      // Expansión leve + sobreluminosidad (mirror)
      s.R = s.R_ms * (1 + 0.3 * p);
      s.L = s.L_ms * (1 + 0.5 * p);
      s.T = PHYSICS.effectiveTemp(s.L, s.R);

      // Pérdida de masa por viento
      const dMdt = PHYSICS.massLossRate(s.M, s.L, s.R, s.T);
      s.M = Math.max(s.M - dMdt * dtYears, 0.1);
      s.massLost += dMdt * dtYears;

      if (p >= 1 || s.H_frac < 0.05) {
        const nextDur = s.tauMS * (s.M_initial < 8 ?
          PHASE_DURATION_FACTOR.subgiant :
          PHASE_DURATION_FACTOR.red_giant);
        _transition(s, s.M_initial < 8 ? PHASES.SUBGIANT : PHASES.RED_GIANT, nextDur);
      }
      break;
    }

    /* ── Subgigante ──────────────────────────── */
    case PHASES.SUBGIANT: {
      const p = prog();
      s.R = lerp(s.R_ms * 1.3,   s.R_ms * 5,    p);
      s.T = lerp(s.T_ms,          5000,           p);
      s.L = lerp(s.L_ms * 1.5,   s.L_ms * 10,   p);
      s.H_frac = Math.max(0.05 - 0.04 * p, 0.01);
      if (p >= 1) _transition(s, PHASES.RED_GIANT,
        s.tauMS * PHASE_DURATION_FACTOR.red_giant);
      break;
    }

    /* ── Gigante Roja ────────────────────────── */
    case PHASES.RED_GIANT: {
      const p = prog();
      const maxR = s.M_initial < 3  ? s.R_ms * 50 :
                   s.M_initial < 8  ? s.R_ms * 150 :
                   s.M_initial < 20 ? s.R_ms * 600 :
                                      s.R_ms * 1500;
      s.R = lerp(s.R_ms * 5, maxR,        Math.pow(p, 0.65));
      s.T = lerp(5000,        3200,        p);
      s.L = lerp(s.L_ms * 10, s.L_ms * 3000, p);
      s.H_frac = Math.max(0.05 - 0.05 * p, 0);
      s.M_core = s.M * (0.1 + 0.35 * p);

      // Viento RGB intensificado
      const dMdt = PHYSICS.massLossRate(s.M, s.L, s.R, s.T) * 8;
      s.M = Math.max(s.M - dMdt * dtYears, 0.15);
      s.massLost += dMdt * dtYears;

      if (p >= 1) {
        const nextPhase = s.M_initial < 8 ? PHASES.HELIUM_BURNING : PHASES.AGB;
        _transition(s, nextPhase, s.tauMS * PHASE_DURATION_FACTOR[nextPhase === PHASES.HELIUM_BURNING ? 'helium_burning' : 'agb']);
        if (nextPhase === PHASES.HELIUM_BURNING) s.He_frac = 0.95;
      }
      break;
    }

    /* ── Quema de Helio ──────────────────────── */
    case PHASES.HELIUM_BURNING: {
      const p = prog();
      s.He_frac = Math.max(0.95 - 0.90 * p, 0.05);
      s.C_frac  = Math.min(0.02 + 0.45 * p, 0.50);
      // Rama horizontal: ligera contracción
      s.R = lerp(s.R, s.R_ms * 10, 0.008);
      s.T = lerp(s.T, 8000,         0.006);
      s.L = lerp(s.L, s.L_ms * 50,  0.006);
      s.M_core = s.M * (0.4 + 0.25 * p);
      if (p >= 1) _transition(s, PHASES.AGB,
        s.tauMS * PHASE_DURATION_FACTOR.agb);
      break;
    }

    /* ── AGB (Rama Asintótica de Gigantes) ────── */
    case PHASES.AGB: {
      const p = prog();
      s.C_frac  = Math.min(0.50 + 0.48 * p, 0.98);
      s.He_frac = Math.max(0.05 - 0.04 * p, 0.01);
      const maxR_agb = s.M_initial < 8 ? s.R_ms * 250 : s.R_ms * 1200;
      s.R = lerp(s.R, maxR_agb,    0.018);
      s.T = lerp(s.T, 2800,         0.012);
      s.L = lerp(s.L, s.L_ms * 6000, 0.010);
      s.M_core = Math.min(s.M * 0.85, s.M - 0.08);

      // Superwind
      const dMdt = PHYSICS.massLossRate(s.M, s.L, s.R, s.T) * 60;
      s.M = Math.max(s.M - dMdt * dtYears, s.M_core + 0.05);
      s.massLost += dMdt * dtYears;

      if (p >= 1 || s.M <= s.M_core + 0.06) {
        if (s.M_initial < 8) {
          _transition(s, PHASES.PLANETARY_NEBULA,
            s.tauMS * PHASE_DURATION_FACTOR.planetary_nebula);
        } else {
          _transition(s, PHASES.CORE_COLLAPSE,
            s.tauMS * PHASE_DURATION_FACTOR.core_collapse);
        }
      }
      break;
    }

    /* ── Nebulosa Planetaria ─────────────────── */
    case PHASES.PLANETARY_NEBULA: {
      const p = prog();
      s.R = lerp(s.R, s.R_ms * 0.008, 0.006 * (1 + p * 4));
      s.T = lerp(s.T, 120000,          0.012);
      s.L = lerp(s.L, s.L_ms * 800,   0.006);
      if (p >= 1) {
        const Mwd = Math.min(s.M_core, PHYSICS.CHANDRASEKHAR_LIMIT * 0.97);
        s.M_compact  = Mwd;
        s.R_compact  = PHYSICS.whiteDwarfRadius(Mwd);
        s.compactType = 'Enana Blanca';
        _transition(s, PHASES.WHITE_DWARF, Infinity);
        s.R = s.R_compact;
        s.T = 90000;
        s.L = s.L_ms * 15;
        s.M = Mwd;
      }
      break;
    }

    /* ── Enana Blanca ────────────────────────── */
    case PHASES.WHITE_DWARF: {
      // Enfriamiento: T ∝ t^{-3/7}
      const tCool = Math.max(s.phaseTimer, 1);
      s.T = Math.max(90000 * Math.pow(tCool / s.tauMS + 1, -3/7), 3500);
      s.L = Math.max(s.L_ms * 0.0001 * Math.pow(s.T / 5000, 4), 1e-5);
      s.R = s.R_compact;
      s.M = s.M_compact;
      // Chandrasekhar (por acreción) — no ocurre en esta sim
      break;
    }

    /* ── Colapso de Núcleo ───────────────────── */
    case PHASES.CORE_COLLAPSE: {
      const p = prog();
      s.R = Math.max(s.R * Math.pow(0.92, 1 + p * 15), 5e-5);
      s.T = Math.min(s.T * (1 + 8 * p), 5e10);
      s.L = s.L_ms * 5e5 * p;
      if (p >= 1) {
        s.snovaActive = true;
        _transition(s, PHASES.SUPERNOVA,
          s.tauMS * PHASE_DURATION_FACTOR.supernova);
        PARTICLES.spawnSupernova(60);
      }
      break;
    }

    /* ── Supernova ───────────────────────────── */
    case PHASES.SUPERNOVA: {
      const p = prog();
      s.L = s.L_ms * 1e8 * Math.exp(-p * 6);
      s.T = 2e9 * Math.exp(-p * 4);
      s.R = Math.max(s.R_ms * 0.00005, s.R * 0.98);

      if (p >= 1) {
        // Masa del remanente
        const M_rem = s.M_initial < 25 ?
          1.2 + s.M_initial * 0.04 :   // NS candidate
          s.M_initial * 0.08;           // BH candidate

        s.M_compact = M_rem;
        s.M = M_rem;

        const isNS = s.fate === 'neutron_star' && M_rem < PHYSICS.TOV_LIMIT_SOFT;
        if (isNS) {
          s.R_compact  = PHYSICS.neutronStarRadius(M_rem);
          s.compactType = 'Estrella de Neutrones';
          _transition(s, PHASES.NEUTRON_STAR, Infinity);
          s.R = s.R_compact;
          s.T = 1e7;
          s.L = s.L_ms * 0.005;
        } else {
          s.R_compact  = PHYSICS.schwarzschildRadius(M_rem);
          s.compactType = 'Agujero Negro';
          _transition(s, PHASES.BLACK_HOLE, Infinity);
          s.R = Math.max(s.R_compact * 0.005, 1e-5);
          s.T = 0;
          s.L = 0;
        }
      }
      break;
    }

    /* ── Estrella de Neutrones ───────────────── */
    case PHASES.NEUTRON_STAR: {
      const tCool = Math.max(s.phaseTimer, 1);
      s.T = Math.max(1e7 * Math.exp(-tCool / (s.tauMS * 0.01)), 5e5);
      s.L = s.L_ms * 0.003 * (s.T / 1e7);
      s.pulsePhase = (s.pulsePhase || 0) + 0.015;
      break;
    }

    /* ── Agujero Negro ───────────────────────── */
    case PHASES.BLACK_HOLE: {
      s.accretionAngle = (s.accretionAngle || 0) + 0.008;
      break;
    }
  }
}

/* ── helper privado: transicionar fase ───────── */
function _transition(s, newPhase, duration) {
  s.phase        = newPhase;
  s.phaseTimer   = 0;
  s.phaseDuration = duration;
}

/* ── Formateo de edad para la UI ─────────────── */
function formatAge(years) {
  if (years < 1e3) return `${years.toFixed(0)} yr`;
  if (years < 1e6) return `${(years / 1e3).toFixed(2)} kyr`;
  if (years < 1e9) return `${(years / 1e6).toFixed(3)} Myr`;
  return `${(years / 1e9).toFixed(3)} Gyr`;
}
