/**
 * main.js
 * ─────────────────────────────────────────────
 * Bootstrap, control de simulación y actualizacion de UI.
 * Depende de: physics.js, star.js, particles.js, renderer.js
 * ─────────────────────────────────────────────
 */

/* ── Estado global de simulación ─────────────── */
window.star     = null;
let simPaused   = false;
let simSpeed    = 8;     // multiplicador de velocidad
let animFrameId = null;
let currentViewMode = '2d';
let hasAutoSwitched = false;

/* ── Paso de simulación por frame ────────────── */
// Con simSpeed=8 se ven ~8× más rápido las fases
function simLoop() {
  if (window.star && !simPaused) {
    const s  = window.star;
    const dt = getSimulationStep(s);

    for (let i = 0; i < simSpeed; i++) {
      evolveStep(s, dt);
    }

    // Nebulosa: spawnear partículas en esa fase
    if (s.phase === PHASES.PLANETARY_NEBULA) {
      PARTICLES.spawnNebula(1);
    }
    // Supernova: reponer partículas mientras dure
    if (s.phase === PHASES.SUPERNOVA) {
      PARTICLES.tickSupernova(2);
    }

    updateUI(s);
  }
  animFrameId = requestAnimationFrame(simLoop);
}

/* ──────────────────────────────────────────────
   CONTROLES
────────────────────────────────────────────── */
function resetStar() {
  const M = parseFloat(document.getElementById('massSlider').value);
  window.star = createStar(M);
  PARTICLES.clear();
  // Limpiar trayectoria H-R si el sketch ya existe
  if (window._p5Sketch) window._p5Sketch.clearHRTrack?.();
  hasAutoSwitched = false;
  switchViewMode('2d');
  updateUI(window.star);
}

function togglePause() {
  simPaused = !simPaused;
  const btn = document.getElementById('btnPause');
  btn.textContent = simPaused ? '▶ Play' : '⏸ Pausa';
  btn.className   = simPaused ? 'active' : '';
}

function skipPhase() {
  if (!window.star) return;
  const s = window.star;
  // Adelantar el timer de la fase actual al 99%
  if (isFinite(s.phaseDuration)) {
    s.phaseTimer = s.phaseDuration * 0.99;
  }
}

function skipToCompact() {
  if (!window.star) return;
  const s = window.star;
  // Forzar avance rápido hasta objeto compacto
  const targetPhases = [PHASES.WHITE_DWARF, PHASES.NEUTRON_STAR, PHASES.BLACK_HOLE];
  if (!targetPhases.includes(s.phase)) {
    // Acelerar temporalmente
    const saved = simSpeed;
    simSpeed = 50;
    let safety = 0;
    const fastForward = () => {
      if (targetPhases.includes(window.star?.phase) || safety++ > 5000) {
        simSpeed = saved;
        return;
      }
      for (let i = 0; i < 30; i++) evolveStep(window.star, getSimulationStep(window.star));
      if (window.star.phase === PHASES.PLANETARY_NEBULA) PARTICLES.spawnNebula(1);
      if (window.star.phase === PHASES.SUPERNOVA) PARTICLES.tickSupernova(2);
      requestAnimationFrame(fastForward);
    };
    fastForward();
  }
}

/* ──────────────────────────────────────────────
   UI
────────────────────────────────────────────── */
function updateUI(s) {
  if (!s) return;

  /* Edad */
  document.getElementById('ageDisplay').textContent = `t = ${formatAge(s.age)}`;

  /* Indicador de fase */
  const meta   = PHASE_META[s.phase] || { name: s.phase, cssClass: s.phase };
  const phEl   = document.getElementById('phaseIndicator');
  phEl.textContent = meta.name;
  phEl.className   = `phase-indicator phase-${meta.cssClass}`;

  /* Parámetros estelares */
  _set('pRadius',  `${s.R.toFixed(s.R > 100 ? 0 : s.R > 1 ? 2 : 5)} R☉`);
  _set('pLum',     s.L > 1e5 ? `${s.L.toExponential(2)} L☉` : `${s.L.toFixed(2)} L☉`);
  _set('pTemp',    s.T > 0 ? `${Math.round(s.T).toLocaleString()} K` : '—');
  _set('pMass',    `${s.M.toFixed(3)} M☉`);
  _set('pCoreMass',`${s.M_core.toFixed(3)} M☉`);
  _set('pFate',    s.fate === 'white_dwarf' ? 'Enana Blanca' :
                   s.fate === 'neutron_star' ? 'Estrella de Neutrones' : 'Agujero Negro');
  _set('pTauMs',   s.tauMS > 1e9 ? `${(s.tauMS/1e9).toFixed(2)} Gyr` :
                                    `${(s.tauMS/1e6).toFixed(1)} Myr`);

  /* Barras de combustible */
  document.getElementById('barH').style.width  = `${Math.max(s.H_frac  / 0.74 * 100, 0).toFixed(1)}%`;
  document.getElementById('barHe').style.width = `${Math.min(s.He_frac / 0.95 * 100, 100).toFixed(1)}%`;
  document.getElementById('barC').style.width  = `${Math.min(s.C_frac  / 0.5  * 100, 100).toFixed(1)}%`;

  /* Panel de objeto compacto */
  const compactPhases = [PHASES.WHITE_DWARF, PHASES.NEUTRON_STAR, PHASES.BLACK_HOLE];
  const compPanel = document.getElementById('compactPanel');
  if (compactPhases.includes(s.phase)) {
    if (!hasAutoSwitched) {
      hasAutoSwitched = true;
      switchViewMode('3d');
    }
    compPanel.style.display = 'block';
    const titles = {
      white_dwarf:  '◽ Enana Blanca',
      neutron_star: '💫 Estrella de Neutrones',
      black_hole:   '⚫ Agujero Negro',
    };
    document.getElementById('compactTitle').textContent = titles[s.phase] || 'Objeto Compacto';
    _set('compactVal1', `${s.M_compact.toFixed(4)} M☉`);

    if (s.phase === PHASES.WHITE_DWARF) {
      _set('compactVal2', `${(s.R_compact * 100).toFixed(3)}% R☉`);
      _set('compactVal3', 'P = Kρ⁵/³ (e⁻ degen.)');
    } else if (s.phase === PHASES.NEUTRON_STAR) {
      const rkm = (s.R_compact * PHYSICS.R_SUN / 1e5).toFixed(1);
      _set('compactVal2', `${rkm} km`);
      _set('compactVal3', 'TOV · P = Kρ⁵/³ (n degen.)');
    } else {
      const rs_km = (s.R_compact * PHYSICS.R_SUN / 1e5).toFixed(1);
      _set('compactVal2', `r_s = ${rs_km} km`);
      _set('compactVal3', 'GR · r_s = 2GM/c²');
    }
  } else {
    compPanel.style.display = 'none';
  }

  /* Ecuaciones activas */
  document.getElementById('equationInfo').innerHTML =
    PHASE_EQUATIONS[s.phase] || '';
}

function _set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ── Integración de Vistas 2D / 3D ──────────────── */
function switchViewMode(mode) {
  currentViewMode = mode;
  
  // Actualizar botones de pestaña
  document.getElementById('btn-tab-2d').classList.toggle('active', mode === '2d');
  document.getElementById('btn-tab-3d').classList.toggle('active', mode === '3d');
  
  // Cambiar visibilidad de las capas de canvas
  document.getElementById('canvas-2d-view').classList.toggle('active', mode === '2d');
  document.getElementById('canvas-3d-view').classList.toggle('active', mode === '3d');
  
  // Mostrar/ocultar paneles en el sidebar
  document.getElementById('panel-2d').style.display = mode === '2d' ? 'block' : 'none';
  document.getElementById('panel-3d').style.display = mode === '3d' ? 'block' : 'none';
  
  // Redimensionar el canvas correspondiente para asegurar que se dibuje bien
  if (mode === '2d' && window._p5Sketch) {
    window._p5Sketch.windowResized?.();
  } else if (mode === '3d' && window._p5Sketch3D) {
    window._p5Sketch3D.triggerResize?.();
    syncStarTo3D();
  }
}

function syncStarTo3D() {
  if (!window.star) return;
  const s = window.star;
  const slider = document.getElementById('remMassSlider');
  
  // Obtener la masa del remanente si ya colapsó, o estimar a partir del estado actual
  let mass = s.M_compact;
  if (mass <= 0) {
    if (s.M_initial < 8) {
      mass = 0.5 + (s.M_initial * 0.11); // WD mass approximation
    } else if (s.M_initial < 25) {
      mass = 1.2 + (s.M_initial * 0.04); // NS mass approximation
    } else {
      mass = Math.max(3.0, s.M_initial * 0.08); // BH mass approximation
    }
  }
  
  slider.value = mass.toFixed(2);
  document.getElementById('remMassVal').textContent = mass.toFixed(2);
  
  // Actualizar etiqueta del tipo de remanente
  const remTypeVal = document.getElementById('remTypeVal');
  if (mass < 1.4) {
    remTypeVal.textContent = 'Enana Blanca';
  } else if (mass < 3.0) {
    remTypeVal.textContent = 'Estrella de Neutrones';
  } else {
    remTypeVal.textContent = 'Agujero Negro';
  }
  
  if (window._p5Sketch3D) {
    window._p5Sketch3D.setRemnantMass(mass);
  }
}

/* ── Acciones de Laboratorio 3D ─────────────────── */
function launch3DProbe() {
  if (window._p5Sketch3D) {
    window._p5Sketch3D.launchProbe();
  }
}

function trigger3DSupernova() {
  if (window._p5Sketch3D) {
    window._p5Sketch3D.triggerSupernova();
  }
}

/* ──────────────────────────────────────────────
   INIT
────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  /* Sliders */
  const massSlider  = document.getElementById('massSlider');
  const speedSlider = document.getElementById('speedSlider');
  const remMassSlider = document.getElementById('remMassSlider');

  massSlider.addEventListener('input', function() {
    document.getElementById('massVal').textContent = parseFloat(this.value).toFixed(1);
    resetStar();
  });

  speedSlider.addEventListener('input', function() {
    simSpeed = parseInt(this.value);
    document.getElementById('speedVal').textContent = `×${simSpeed}`;
  });

  remMassSlider.addEventListener('input', function() {
    const val = parseFloat(this.value);
    document.getElementById('remMassVal').textContent = val.toFixed(2);
    
    const remTypeVal = document.getElementById('remTypeVal');
    if (val < 1.4) {
      remTypeVal.textContent = 'Enana Blanca';
    } else if (val < 3.0) {
      remTypeVal.textContent = 'Estrella de Neutrones';
    } else {
      remTypeVal.textContent = 'Agujero Negro';
    }
    
    if (window._p5Sketch3D) {
      window._p5Sketch3D.setRemnantMass(val);
    }
  });

  /* Iniciar estrella y sketchs */
  resetStar();

  const container2D = document.getElementById('canvas-2d-view');
  initSketch(container2D);

  const container3D = document.getElementById('canvas-3d-view');
  initSketch3D(container3D);

  /* Arrancar bucle de simulación */
  simLoop();
});
