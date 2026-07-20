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

/* ── Modo comparación de destinos ────────────── */
window.comparisonMode   = false;
window.comparisonTracks = null;   // null = no calculado aún

function toggleComparison() {
  window.comparisonMode = !window.comparisonMode;
  const btn = document.getElementById('btnCompare');
  if (btn) btn.classList.toggle('active', window.comparisonMode);

  if (window.comparisonMode && !window.comparisonTracks) {
    window.comparisonTracks = [
      _computeCompTrack(1.0),
      _computeCompTrack(8.0),
      _computeCompTrack(25.0),
    ];
  }
}

function _computeCompTrack(mass) {
  const s = createStar(mass);
  const pts = [];
  const COMPACT = [PHASES.WHITE_DWARF, PHASES.NEUTRON_STAR, PHASES.BLACK_HOLE];
  for (let i = 0; i < 18000; i++) {
    const dt = getSimulationStep(s);
    evolveStep(s, dt);
    if (i % 25 === 0 && s.T > 0 && s.phase !== PHASES.PROTOSTAR) {
      pts.push({ T: s.T, L: s.L });
    }
    if (COMPACT.includes(s.phase)) { pts.push({ T: s.T, L: s.L }); break; }
  }
  return pts;
}

/* ── Buffer de exportación (SCRUM-14) ─────────── */
const SIM_EXPORT_INTERVAL = 120; // acumular cada N pasos de evolución
let   simExportCounter    = 0;
let   simHistory          = [];   // snapshots para CSV

function _recordSnapshot(s) {
  simHistory.push({
    age_yr  : s.age,
    phase   : s.phase,
    R_Rsun  : s.R,
    L_Lsun  : s.L,
    T_K     : s.T,
    M_Msun  : s.M,
    H_frac  : s.H_frac,
    He_frac : s.He_frac,
    C_frac  : s.C_frac,
  });
}

/* ── Paso de simulación por frame ────────────── */
// Con simSpeed=8 se ven ~8× más rápido las fases
function simLoop() {
  if (window.star && !simPaused) {
    const s  = window.star;
    const dt = getSimulationStep(s);

    for (let i = 0; i < simSpeed; i++) {
      evolveStep(s, dt);
      simExportCounter++;
      if (simExportCounter >= SIM_EXPORT_INTERVAL) {
        simExportCounter = 0;
        _recordSnapshot(s);
      }
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
  if (window._p5Sketch) window._p5Sketch.clearHRTrack?.();
  simHistory = [];
  simExportCounter = 0;
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
  document.getElementById('btn-tab-guide').classList.toggle('active', mode === 'guide');
  document.getElementById('btn-tab-merger').classList.toggle('active', mode === 'merger');

  // Cambiar visibilidad de las capas de canvas
  document.getElementById('canvas-2d-view').classList.toggle('active', mode === '2d');
  document.getElementById('canvas-3d-view').classList.toggle('active', mode === '3d');
  document.getElementById('canvas-guide-view').classList.toggle('active', mode === 'guide');
  document.getElementById('canvas-merger-view').classList.toggle('active', mode === 'merger');

  // Mostrar/ocultar paneles en el sidebar
  document.getElementById('panel-2d').style.display     = mode === '2d'     ? 'block' : 'none';
  document.getElementById('panel-3d').style.display     = mode === '3d'     ? 'block' : 'none';
  document.getElementById('panel-merger').style.display = mode === 'merger' ? 'block' : 'none';

  // Redimensionar el canvas correspondiente para asegurar que se dibuje bien
  if (mode === '2d' && window._p5Sketch) {
    window._p5Sketch.windowResized?.();
  } else if (mode === '3d' && window._p5Sketch3D) {
    window._p5Sketch3D.triggerResize?.();
    syncStarTo3D();
  } else if (mode === 'merger' && window._p5Merger) {
    window._p5Merger.triggerResize?.();
  }
}

function restartMerger() {
  if (window._p5Merger) window._p5Merger.restartMerger();
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
   EXPORTACIÓN (SCRUM-14)
────────────────────────────────────────────── */
function _triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  const s = window.star;
  if (!s) return;
  if (simHistory.length === 0) {
    alert('Aún no hay datos acumulados. Deja correr la simulación unos segundos.');
    return;
  }

  const meta = [
    `# Looky — Simulación de Evolución Estelar`,
    `# masa_inicial_Msun=${s.M_initial}`,
    `# destino_final=${s.fate}`,
    `# tau_MS_yr=${s.tauMS.toExponential(4)}`,
    `# exportado=${new Date().toISOString()}`,
  ].join('\n');

  const header = 'age_yr,phase,R_Rsun,L_Lsun,T_K,M_Msun,H_frac,He_frac,C_frac';
  const rows   = simHistory.map(r =>
    [r.age_yr.toExponential(6), r.phase,
     r.R_Rsun.toFixed(6), r.L_Lsun.toExponential(6), Math.round(r.T_K),
     r.M_Msun.toFixed(6), r.H_frac.toFixed(4), r.He_frac.toFixed(4), r.C_frac.toFixed(4)
    ].join(',')
  );

  const csv = [meta, header, ...rows].join('\n');
  _triggerDownload(csv, `looky_simulacion_${s.M_initial}Msun.csv`, 'text/csv');
}

function exportJSON() {
  const s = window.star;
  if (!s) return;

  const hrPoints = window._p5Sketch?.getHRPoints?.() ?? [];

  const payload = {
    metadata: {
      proyecto       : 'Looky — Simulador de Evolución Estelar',
      masa_inicial   : s.M_initial,
      destino_final  : s.fate,
      tau_MS_yr      : s.tauMS,
      exportado      : new Date().toISOString(),
    },
    trayectoria_hr: hrPoints.map(pt => ({
      T_K   : Math.round(pt.T),
      L_Lsun: parseFloat(pt.L.toExponential(6)),
    })),
    historial_simulacion: simHistory,
  };

  _triggerDownload(JSON.stringify(payload, null, 2),
    `looky_hr_${s.M_initial}Msun.json`, 'application/json');
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

  const containerMerger = document.getElementById('canvas-merger-view');
  initSketchMerger(containerMerger);

  /* Arrancar bucle de simulación */
  simLoop();
});
