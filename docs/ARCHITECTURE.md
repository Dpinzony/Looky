# Arquitectura de Looky

## Diagrama de módulos

```
┌──────────────────────────────────────────────────────────────┐
│                         index.html                            │
│      Layout, 5 tabs de vista, script tags, panels sidebar     │
└───────────────────────────┬──────────────────────────────────┘
                            │ carga y conecta
     ┌──────────────────────┼───────────────────────┐
     ▼                      ▼                       ▼
┌──────────┐         ┌─────────────┐         ┌──────────────┐
│physics.js│         │  particles  │         │   main.js    │
│          │         │    .js      │         │              │
│ RK4      │         │             │         │ simLoop()    │
│ TOV      │◄────────│ spawnNebula │◄────────│ resetStar()  │
│ EOS      │         │ tickSuper.. │         │ updateUI()   │
│ massloss │         │             │         │ switchView() │
└────┬─────┘         └─────────────┘         │ compareTick()│
     │                                       └──────┬───────┘
     │ PHYSICS.*                                    │ window.star
     ▼                                              ▼
┌──────────┐                               ┌─────────────┐
│  star.js │                               │ renderer.js │
│          │                               │             │
│createStar│──── s.T, s.L ────────────────►│ initSketch()│
│evolveStep│                               │ H-R diagram │
│ PHASES   │                               │ Hipparcos bg│
│ PHASE_   │                               │ comp.tracks │
│ META     │                               └─────────────┘
└──────────┘
     │ s.M_compact, s.fate
     ▼
┌────────────────┐    ┌───────────────┐    ┌───────────────┐
│  compact3d.js  │    │   merger.js   │    │    tde.js     │
│                │    │               │    │               │
│ initSketch3D() │    │initSketchMer- │    │ initSketchTDE │
│ WD / NS / BH   │    │ger(): GW170817│    │ (): AT2019qiz │
│ lensing, TOV   │    │ Kilonova sim. │    │ TDE sim.      │
│ binary, probe  │    └───────────────┘    └───────────────┘
└────────────────┘

┌──────────────┐
│ hipparcos.js │   Catálogo procedural ~880 estrellas
│              │   window.HIPPARCOS_STARS → renderer.js
└──────────────┘
```

## Vistas y su sketch p5.js

| Tab | Modo | Sketch activo | Archivo |
|-----|------|---------------|---------|
| 🎨 Evolución 2D | `'2d'` | `window._p5Sketch` | `renderer.js` |
| 🌌 Laboratorio 3D | `'3d'` | `window._p5Sketch3D` | `compact3d.js` |
| 📖 Guía | `'guide'` | HTML estático | `index.html` |
| 💥 Colisiones | `'merger'` | `window._p5Merger` / `window._p5TDE` | `merger.js` / `tde.js` |
| ⚖ Comparación | `'compare'` | Canvas 2D nativos (×3) | `main.js` |

Los sketches de `renderer.js`, `compact3d.js`, `merger.js` y `tde.js` corren en paralelo desde el inicio; solo el activo es visible. `compareTick()` en `main.js` gestiona las 3 simulaciones paralelas del modo comparación.

## Flujo de datos por frame

```
requestAnimationFrame
        │
        ▼
   simLoop() [main.js]
        │
        ├─► evolveStep(star, dt)  [star.js]
        │       │
        │       └─► RK4 / TOV / massloss  [physics.js]
        │
        ├─► PARTICLES.spawnNebula / tickSupernova  [particles.js]
        │
        ├─► compareTick()  [main.js] — solo en modo 'compare'
        │       └─► evolveStep × 3 + renderizado en canvas nativo
        │
        └─► updateUI(star)  [main.js]
                └─► DOM update (barras, parámetros, fase)

p5.draw() [renderer.js]   ← corre siempre a 60fps
        ├─► _drawStarBody(star)
        ├─► _drawHRDiagram(star)
        │       ├─► hg.image(hrBgCanvas)   ← Hipparcos (pre-renderizado)
        │       ├─► comparisonTracks       ← comparador de destinos
        │       └─► hrPoints.push(...)
        └─► PARTICLES.updateAndDraw*()

p5.draw() [compact3d.js]  ← solo visible en modo 3D
        ├─► _drawWhiteDwarf / _drawNeutronStar / _drawBlackHole
        └─► lensing, binary companion, TOV cross-section, probe

p5.draw() [merger.js]     ← solo visible en modo merger + kilonova
        └─► Inspiral → Collision → Kilonova → Remnant

p5.draw() [tde.js]        ← solo visible en modo merger + tde
        └─► Approach → Stretch → Disruption → Accretion → Disk
```

## Responsabilidades por módulo

### `physics.js`
Núcleo matemático sin estado. Expone el objeto global `PHYSICS` con:
- `rk4Step(s, dt)` — integrador de 4to orden para L, R, T
- `tovStep(r, M_r, P, rho, dr)` — ecuación Tolman-Oppenheimer-Volkoff
- `massLossRate(M, L, R, T)` — Reimers (1975) y de Jager (1988)
- `degeneratePressureWD(rho)` — politrópica de degeneración electrónica
- `mainSequenceLifetime(M)` — τ_MS ≈ (M/L) escalado
- `tempToColor(T)` — aproximación de curva de Planck → RGB

### `star.js`
Máquina de estados de la evolución estelar. Estado inicial vía `createStar(M)`. Transiciones entre fases con `evolveStep(s, dt)`. Cadena de fases:
```
protostar → main_sequence → subgiant → red_giant → helium_burning
         → agb → planetary_nebula → white_dwarf
                → core_collapse → supernova → neutron_star / black_hole
```

### `particles.js`
Pool de partículas para nebulosa planetaria y supernova. `spawnNebula()` y `tickSupernova()` actualizan posiciones; `updateAndDrawNebula()` y `updateAndDrawExplosion()` dibujan con el contexto p5 recibido.

### `hipparcos.js`
Catálogo procedural de ~880 estrellas tipo Hipparcos. Usa RNG con semilla fija (`xoshiro128`) y distribución de masa IMF Salpeter para generar coordenadas (T_eff, L/L☉) en grupos: secuencia principal, gigantes rojas, subgigantes, enanas blancas, supergigantes y rama horizontal. Expone `window.HIPPARCOS_STARS`.

### `renderer.js`
Sketch p5.js en modo 2D. Dibuja el cuerpo estelar, prominencias, convección, nebulosa planetaria y el mini diagrama H-R. Precalcula el fondo Hipparcos en un offscreen buffer (`hrBgCanvas`) en setup. Superpone las trayectorias de comparación (`window.comparisonTracks`). API pública: `clearHRTrack()`, `getHRPoints()`, `rebuildHRBg()`.

### `compact3d.js`
Sketch p5.js en modo WebGL. Recibe la masa del remanente vía `setRemnantMass(mass)`. Renderiza enana blanca, estrella de neutrones con púlsar y jets, agujero negro con disco de acreción y lente gravitacional. Vista de Corte TOV con animación de tomografía. Expone: `setRemnantMass()`, `launchProbe()`, `triggerSupernova()`, `triggerResize()`.

### `merger.js`
Sketch p5.js para la simulación del evento GW170817. Cuatro fases: **Inspiral** (dos estrellas de neutrones en espiral decreciente con emisión de anillos de ondas gravitacionales chirp), **Colisión** (flash de fusión), **Kilonova** (480 partículas en 6 colores de síntesis r-process: Au, Pt, Sr, pesados, GRB, neutrinos), **Remanente** (agujero negro con disco y anillo de Einstein). Expone: `restartMerger()`, `triggerResize()`.

### `tde.js`
Sketch p5.js para la simulación del evento AT2019qiz (TDE). Cinco fases: **Aproximación** (estrella en órbita parabólica con estela cometa y líneas de fuerza gravitacional), **Spaghettification** (elongación dramática de la estrella), **Disruption** (partículas ligadas y no ligadas), **Acreción** (disco brillante con jets X relativistas), **Disco estable** (destellos X periódicos). Expone: `restartTDE()`, `triggerResize()`.

### `main.js`
Bootstrap y orquestador. Gestiona el estado global (`window.star`, `currentViewMode`, `currentCollisionEvent`), el loop de animación, la alternancia entre 5 vistas, la sub-navegación de colisiones, el modo comparación de estrellas y el buffer de exportación CSV/JSON.
