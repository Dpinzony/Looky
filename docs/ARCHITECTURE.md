# Arquitectura de Looky

## Diagrama de módulos

```
┌─────────────────────────────────────────────────────────┐
│                        index.html                        │
│            Layout, UI elements, script tags              │
└──────────────────────────┬──────────────────────────────┘
                           │ carga y conecta
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌──────────┐    ┌─────────────┐   ┌──────────────┐
    │physics.js│    │  particles  │   │   main.js    │
    │          │    │    .js      │   │              │
    │ RK4      │    │             │   │ simLoop()    │
    │ TOV      │◄───│ spawnNebula │◄──│ resetStar()  │
    │ EOS      │    │ tickSuper.. │   │ updateUI()   │
    │ massloss │    │             │   │ exportCSV()  │
    └────┬─────┘    └─────────────┘   │ exportJSON() │
         │                            └──────┬───────┘
         │ PHYSICS.*                         │ window.star
         ▼                                   ▼
    ┌──────────┐                      ┌─────────────┐
    │  star.js │                      │ renderer.js │
    │          │                      │             │
    │createStar│─────── s.T, s.L ────►│ initSketch()│
    │evolveStep│                      │ H-R diagram │
    │ PHASES   │                      │ star body   │
    │ PHASE_   │                      │ particles   │
    │ META     │                      └─────────────┘
    └──────────┘
         │ s.M_compact, s.fate
         ▼
    ┌────────────────┐
    │  compact3d.js  │
    │                │
    │ initSketch3D() │
    │ _drawWhiteDwarf│
    │ _drawNeutron.. │
    │ _drawBlackHole │
    │ Vista Corte TOV│
    └────────────────┘
```

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
        └─► updateUI(star)  [main.js]
                │
                └─► DOM update (barras, parámetros, fase)

p5.draw() [renderer.js]   ← corre en paralelo a 60fps
        │
        ├─► _drawStarBody(star)
        ├─► _drawHRDiagram(star)
        └─► hrPoints.push(...)

p5.draw() [compact3d.js]  ← solo activo en modo 3D
        │
        ├─► _drawWhiteDwarf / _drawNeutronStar / _drawBlackHole
        └─► lensing, binary companion, TOV cross-section
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
Máquina de estados de la evolución estelar. Estado inicial vía `createStar(M)`. Transiciones entre fases con `evolveStep(s, dt)`. Fases: `protostar → main_sequence → subgiant → red_giant → helium_burning → agb → planetary_nebula / core_collapse → white_dwarf / neutron_star / black_hole`.

### `particles.js`
Pool de partículas para nebulosa planetaria y supernova. Desacoplado del renderizado: `spawnNebula()` y `tickSupernova()` actualizan posiciones; `updateAndDrawNebula()` y `updateAndDrawExplosion()` dibujan con el contexto p5 dado.

### `renderer.js`
Sketch p5.js en modo 2D. Dibuja el cuerpo estelar, prominencias, convección, nebulosa planetaria y el mini diagrama H-R. Acumula `hrPoints[]` para la trayectoria evolutiva. API pública: `clearHRTrack()`, `getHRPoints()`.

### `compact3d.js`
Sketch p5.js en modo WebGL. Recibe la masa del remanente vía `setRemnantMass(mass)`. Renderiza enana blanca, estrella de neutrones con pulsar y jets, agujero negro con disco de acreción y lente gravitacional. Implementa Vista de Corte TOV con animación de tomografía progresiva.

### `main.js`
Bootstrap y orquestador. Inicializa los dos sketches p5, el estado global `window.star` y el loop de animación. Maneja los eventos de la UI (sliders, botones), sincroniza el estado de la estrella con el laboratorio 3D y gestiona el buffer de exportación de datos.
