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

/* ══════════════════════════════════════════════
   PANEL EDUCATIVO DE FASE — Contenido y lógica
   ─────────────────────────────────────────────
   PHASE_INFO amplía PHASE_EQUATIONS (star.js) con
   explicación accesible, desglose término a término,
   valores de referencia reales y comparación con
   objetos estelares conocidos, más un SVG ilustrativo.
   ══════════════════════════════════════════════ */

const PHASE_ACCENT = {
  protostar:        '#ff7722',
  main_sequence:    '#88ccff',
  subgiant:         '#ffaa44',
  red_giant:        '#ff6633',
  helium_burning:   '#ffbb33',
  agb:              '#ff8844',
  planetary_nebula: '#44ccff',
  white_dwarf:      '#aaaaff',
  core_collapse:    '#ff4422',
  supernova:        '#ffee22',
  neutron_star:     '#cc88ff',
  black_hole:       '#ff44aa',
};

const PHASE_INFO = {

  /* ── Protoestrella ─────────────────────────── */
  protostar: {
    explanation: 'Una nube de gas y polvo colapsa bajo su propia gravedad. Al contraerse, la energía potencial gravitacional se convierte en calor (mecanismo de Kelvin-Helmholtz), elevando lentamente la temperatura y el brillo de la protoestrella hasta que el núcleo alcanza ~10 millones de K y se enciende la fusión de hidrógeno.',
    equations: [
      { formula: 'E<sub>grav</sub> = GM²/R → L',
        description: 'La energía gravitacional liberada al contraerse (G: constante gravitacional, M: masa, R: radio, que disminuye) se transforma en luminosidad L: cuanto más se comprime la protoestrella, más brilla.' },
      { formula: 'τ<sub>KH</sub> ≈ GM²/(RL)',
        description: 'El tiempo de Kelvin-Helmholtz estima cuánto dura esta fase de contracción antes de encender la fusión estable de hidrógeno.' },
    ],
    realValues: [
      'El Sol tardó ≈30 millones de años en esta fase antes de llegar a la secuencia principal.',
      'La temperatura central debe alcanzar ~10 millones K para encender la fusión protón-protón.',
      'A mayor masa M, menor τ_KH: las protoestrellas masivas colapsan y se encienden mucho más rápido.',
    ],
    comparisons: [
      { name: 'T Tauri (Toro)', blurb: 'Prototipo de estrella joven de baja masa, aún rodeada de disco protoplanetario y con fuerte variabilidad óptica.' },
      { name: 'Trapecio de Orión', blurb: 'Región de formación estelar donde se observan protoestrellas masivas embebidas en gas, muchas visibles solo en infrarrojo.' },
    ],
    svg: `<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="pg1" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff3c4"/><stop offset="55%" stop-color="var(--accent)"/><stop offset="100%" stop-color="#3a1a06" stop-opacity="0"/>
      </radialGradient></defs>
      <ellipse cx="150" cy="80" rx="120" ry="62" fill="none" stroke="#5a8aaa" stroke-width="1" stroke-dasharray="3 4" opacity="0.5"/>
      <path d="M55,60 Q80,25 140,35 Q210,15 245,55 Q265,85 230,110 Q190,140 130,125 Q70,130 50,95 Q40,75 55,60 Z" fill="#0d2540" stroke="#1a4a7a" stroke-width="1" opacity="0.55"/>
      <circle cx="150" cy="80" r="20" fill="url(#pg1)"/>
      <circle cx="150" cy="80" r="7" fill="#fff3c4"/>
      <g stroke="var(--accent)" stroke-width="1.4" opacity="0.85" marker-end="url(#pArrow)">
        <line x1="95" y1="55" x2="128" y2="70"/>
        <line x1="205" y1="55" x2="172" y2="70"/>
        <line x1="95" y1="108" x2="128" y2="92"/>
        <line x1="205" y1="108" x2="172" y2="92"/>
      </g>
      <defs><marker id="pArrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--accent)"/></marker></defs>
      <text x="150" y="150" text-anchor="middle" font-size="9" fill="#7a9ab8" font-family="monospace">colapso gravitacional → calor → luz</text>
    </svg>`,
  },

  /* ── Secuencia Principal ───────────────────── */
  main_sequence: {
    explanation: 'El núcleo fusiona hidrógeno en helio (cadena protón-protón o ciclo CNO en estrellas masivas), liberando energía que sostiene a la estrella contra su propio peso. Es la fase más larga y estable: la presión térmica del plasma equilibra exactamente la gravedad, un estado llamado equilibrio hidrostático.',
    equations: [
      { formula: 'dP/dr = −GM(r)ρ/r²',
        description: 'Equilibrio hidrostático: la presión P debe disminuir hacia afuera lo justo para sostener el peso del gas de las capas superiores, donde M(r) es la masa encerrada hasta el radio r y ρ la densidad local.' },
      { formula: 'dM/dr = 4πr²ρ',
        description: 'Continuidad de masa: cuánta masa se acumula en cada capa esférica de radio r y densidad ρ.' },
      { formula: 'ε<sub>pp</sub>: 4H → He + γ',
        description: 'Cuatro núcleos de hidrógeno se fusionan en uno de helio, liberando fotones γ y neutrinos: la reacción que alimenta al Sol.' },
      { formula: 'L ≈ L☉(M/M☉)<sup>3.5</sup>',
        description: 'Relación masa-luminosidad: pequeños aumentos de masa producen enormes aumentos de brillo, por eso las estrellas masivas agotan su combustible mucho más rápido.' },
    ],
    realValues: [
      'El Sol lleva ≈4.600 millones de años en secuencia principal y permanecerá ≈10.000 millones de años en total (10 Gyr).',
      'Una estrella de 10 M☉ dura solo ≈32 millones de años en secuencia principal (τ ∝ M⁻²·⁵).',
      'Temperatura central típica en el Sol: ~15 millones K.',
    ],
    comparisons: [
      { name: 'El Sol (G2V)', blurb: 'Estrella de referencia: 1 M☉, 1 R☉, T_eff = 5.778 K, τ_MS ≈ 10 Gyr.' },
      { name: 'Sirio A (A1V)', blurb: '2.06 M☉, mucho más caliente (~9.900 K) y luminosa; vivirá solo ~1 Gyr en secuencia principal.' },
    ],
    svg: `<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="mg1" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff8e0"/><stop offset="45%" stop-color="var(--accent)"/><stop offset="100%" stop-color="#0a2a4a"/>
      </radialGradient></defs>
      <circle cx="150" cy="80" r="55" fill="url(#mg1)"/>
      <circle cx="150" cy="80" r="24" fill="none" stroke="#fff3c4" stroke-width="1.5" stroke-dasharray="2 3" opacity="0.8"/>
      <text x="150" y="83" text-anchor="middle" font-size="8" fill="#3a1a06" font-family="monospace" font-weight="bold">4H→He</text>
      <g stroke="#fff3c4" stroke-width="1" opacity="0.7">
        <line x1="150" y1="24" x2="150" y2="8"/><line x1="150" y1="136" x2="150" y2="152"/>
        <line x1="94" y1="80" x2="78" y2="80"/><line x1="206" y1="80" x2="222" y2="80"/>
        <line x1="111" y1="41" x2="99" y2="29"/><line x1="189" y1="41" x2="201" y2="29"/>
        <line x1="111" y1="119" x2="99" y2="131"/><line x1="189" y1="119" x2="201" y2="131"/>
      </g>
      <text x="150" y="12" text-anchor="middle" font-size="8" fill="#5a8aaa" font-family="monospace">energía radiada (L)</text>
    </svg>`,
  },

  /* ── Subgigante ─────────────────────────────── */
  subgiant: {
    explanation: 'El hidrógeno del núcleo se agota. La fusión continúa en una fina capa (shell) alrededor de un núcleo de helio inerte todavía demasiado frío para fusionarse. Sin generación de energía en el centro, el núcleo se contrae mientras el envolvente exterior empieza a expandirse y enfriarse.',
    equations: [
      { formula: 'Núcleo He isotérmico',
        description: 'El núcleo de helio, sin fusión activa, mantiene una temperatura casi uniforme mientras se contrae lentamente por gravedad.' },
      { formula: 'Shell de quema de H',
        description: 'La fusión de hidrógeno continúa en una capa delgada justo encima del núcleo, aportando la energía que empuja el envolvente hacia afuera.' },
      { formula: 'Expansión del envolvente',
        description: 'Al recibir más energía desde la shell, las capas externas se expanden y enfrían, moviendo a la estrella hacia la derecha del diagrama H-R.' },
    ],
    realValues: [
      'Esta fase es relativamente breve: ~10-15% del tiempo que la estrella pasó en secuencia principal.',
      'El radio puede crecer de 1 a más de 5 R☉ en el caso de una estrella como el Sol.',
    ],
    comparisons: [
      { name: 'Procyon A', blurb: 'Subgigante F5, ~1.5 M☉, en transición hacia gigante roja, con núcleo de helio inerte en contracción.' },
    ],
    svg: `<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg">
      <circle cx="150" cy="80" r="60" fill="#1a2a3a" stroke="#0d3055" stroke-width="1"/>
      <circle cx="150" cy="80" r="34" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
      <circle cx="150" cy="80" r="14" fill="#3a2a1a" stroke="#5a4020" stroke-width="1"/>
      <text x="150" y="83" text-anchor="middle" font-size="7" fill="#7a9ab8" font-family="monospace">He</text>
      <text x="150" y="42" text-anchor="middle" font-size="7.5" fill="var(--accent)" font-family="monospace">shell H</text>
      <text x="150" y="152" text-anchor="middle" font-size="8" fill="#5a8aaa" font-family="monospace">envolvente en expansión</text>
    </svg>`,
  },

  /* ── Gigante Roja ───────────────────────────── */
  red_giant: {
    explanation: 'El envolvente se expande dramáticamente mientras la capa de fusión de hidrógeno migra hacia afuera. En estrellas de baja masa, el núcleo de helio se vuelve degenerado (regido por mecánica cuántica, no por la temperatura) y, al llegar a ~100 millones K, se enciende de golpe en el "flash de helio".',
    equations: [
      { formula: 'Degeneración e⁻ del núcleo de He',
        description: 'Los electrones del núcleo quedan tan comprimidos que su presión depende del principio de exclusión de Pauli y ya no de la temperatura: un estado de degeneración cuántica.' },
      { formula: 'Flash de helio',
        description: 'Al no poder expandirse para autorregular la temperatura (por estar degenerado), el núcleo se dispara en fusión de helio casi explosiva, liberando internamente hasta ~10¹¹ L☉ en cuestión de segundos.' },
      { formula: 'dR/dt &gt; 0,  dT<sub>eff</sub>/dt &lt; 0',
        description: 'El radio crece con el tiempo mientras la temperatura superficial baja: la estrella se hincha y enrojece.' },
    ],
    realValues: [
      'El Sol se convertirá en gigante roja en ≈5.000 millones de años, expandiéndose hasta ~200 R☉.',
      'El flash de helio libera, por segundos, una potencia interna comparable a la de toda una galaxia (pero absorbida por la propia estrella, sin observarse desde afuera).',
    ],
    comparisons: [
      { name: 'Betelgeuse (α Orionis)', blurb: 'Supergigante roja masiva (~750 R☉, ~17-19 M☉) en sus etapas finales de fusión; se estima que explotará como supernova en los próximos ~100.000 años, un instante en términos astronómicos.' },
      { name: 'Aldebarán (α Tauri)', blurb: 'Gigante roja de ~1.16 M☉ y ~44 R☉, ya fusionando helio en su núcleo.' },
    ],
    svg: `<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="rg1" cx="45%" cy="45%" r="55%">
        <stop offset="0%" stop-color="#ffd8a0"/><stop offset="55%" stop-color="var(--accent)"/><stop offset="100%" stop-color="#3a0f05"/>
      </radialGradient></defs>
      <circle cx="150" cy="85" r="68" fill="url(#rg1)"/>
      <circle cx="150" cy="85" r="6" fill="#ffee88"/>
      <text x="150" y="87" text-anchor="middle" font-size="14" fill="#ffee88" font-family="monospace">☉</text>
      <text x="150" y="150" text-anchor="middle" font-size="8" fill="#7a9ab8" font-family="monospace">tamaño real vs. el Sol (punto)</text>
    </svg>`,
  },

  /* ── Quema de Helio ─────────────────────────── */
  helium_burning: {
    explanation: 'El núcleo fusiona helio en carbono y oxígeno mediante el proceso triple-alfa: tres núcleos de helio se combinan en uno de carbono. Requiere temperaturas mucho más altas (~100 millones K) porque hay que superar la repulsión eléctrica de tres partículas casi al mismo tiempo.',
    equations: [
      { formula: '3α: 3 ⁴He → ¹²C + γ',
        description: 'Reacción triple-alfa: tres núcleos de helio-4 (partículas alfa) se fusionan en uno de carbono-12, liberando un fotón gamma.' },
      { formula: '¹²C + ⁴He → ¹⁶O + γ',
        description: 'El carbono recién formado puede capturar otra partícula alfa y convertirse en oxígeno-16.' },
      { formula: 'Rama Horizontal',
        description: 'Región del diagrama H-R donde se ubican las estrellas de baja masa quemando helio en el núcleo, con temperatura y luminosidad relativamente estables.' },
    ],
    realValues: [
      'Temperatura central necesaria: ~100 millones K, frente a los ~15 millones K de la fusión de hidrógeno.',
      'Esta fase dura solo ~10% del tiempo que la estrella pasó en secuencia principal.',
    ],
    comparisons: [
      { name: 'Cúmulos globulares (M3, M13)', blurb: 'Albergan poblaciones enteras de estrellas viejas quemando helio, dibujando la característica "rama horizontal" del diagrama H-R.' },
    ],
    svg: `<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg">
      <g fill="var(--accent)" opacity="0.9">
        <circle cx="90" cy="55" r="12"/><circle cx="60" cy="95" r="12"/><circle cx="120" cy="95" r="12"/>
      </g>
      <text x="90" y="59" text-anchor="middle" font-size="7" fill="#01050a" font-family="monospace">He</text>
      <text x="60" y="99" text-anchor="middle" font-size="7" fill="#01050a" font-family="monospace">He</text>
      <text x="120" y="99" text-anchor="middle" font-size="7" fill="#01050a" font-family="monospace">He</text>
      <path d="M140,80 L185,80" stroke="#7a9ab8" stroke-width="1.4" marker-end="url(#hArrow)"/>
      <defs><marker id="hArrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#7a9ab8"/></marker></defs>
      <circle cx="225" cy="80" r="20" fill="#ffbb33"/>
      <text x="225" y="84" text-anchor="middle" font-size="9" fill="#3a1a06" font-family="monospace" font-weight="bold">¹²C</text>
      <text x="150" y="140" text-anchor="middle" font-size="8" fill="#7a9ab8" font-family="monospace">proceso triple-alfa</text>
    </svg>`,
  },

  /* ── Rama AGB ───────────────────────────────── */
  agb: {
    explanation: 'La Rama Asintótica de las Gigantes (AGB) ocurre cuando el núcleo, ya de carbono-oxígeno inerte, queda rodeado por dos capas de fusión (hidrógeno y helio) que se alternan en pulsos térmicos. La estrella pulsa fuertemente y pierde masa a gran velocidad mediante vientos estelares intensos ("superwind").',
    equations: [
      { formula: 'Shell H+He pulsado',
        description: 'Las dos capas de fusión se encienden y apagan alternadamente en ciclos (pulsos térmicos), provocando variaciones de brillo y expulsión de material.' },
      { formula: 'Dredge-up / proceso-s',
        description: 'Convección profunda ("dredge-up") trae a la superficie elementos pesados sintetizados por captura lenta de neutrones (proceso-s), como bario o tecnecio.' },
      { formula: 'Ṁ ~ 10⁻⁵ M☉/yr (superwind)',
        description: 'Tasa de pérdida de masa: la estrella puede perder el equivalente a la masa de la Tierra en pocos años, formando una envoltura circunestelar de polvo y gas.' },
    ],
    realValues: [
      'En pocos cientos de miles de años, una estrella AGB puede perder la mayor parte de su envolvente.',
      'Los pulsos térmicos se repiten cada ~10.000-100.000 años.',
    ],
    comparisons: [
      { name: 'Mira (Omicron Ceti)', blurb: 'Variable AGB prototípica: cambia de brillo por un factor de ~1.500 en un ciclo de ~332 días.' },
      { name: 'IRC+10216 (CW Leonis)', blurb: 'Estrella de carbono AGB envuelta en densísimo polvo; una de las fuentes infrarrojas más brillantes del cielo nocturno.' },
    ],
    svg: `<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg">
      <circle cx="150" cy="80" r="30" fill="var(--accent)"/>
      <circle cx="150" cy="80" r="45" fill="none" stroke="var(--accent)" stroke-width="1" opacity="0.5"/>
      <circle cx="150" cy="80" r="60" fill="none" stroke="var(--accent)" stroke-width="1" opacity="0.3"/>
      <g fill="#c8d8e8" opacity="0.8">
        <circle cx="95" cy="40" r="2"/><circle cx="210" cy="35" r="1.6"/><circle cx="220" cy="110" r="2.2"/>
        <circle cx="80" cy="115" r="1.8"/><circle cx="150" cy="15" r="1.6"/><circle cx="60" cy="70" r="2"/>
      </g>
      <text x="150" y="145" text-anchor="middle" font-size="8" fill="#7a9ab8" font-family="monospace">pulsos + pérdida de masa</text>
    </svg>`,
  },

  /* ── Nebulosa Planetaria ────────────────────── */
  planetary_nebula: {
    explanation: 'La estrella expulsa por completo su envolvente exterior, dejando expuesto el núcleo caliente y denso (futura enana blanca). La radiación ultravioleta del núcleo ioniza el gas expulsado, haciéndolo brillar en vivos colores: eso es una nebulosa planetaria (el nombre es histórico, no tiene relación con planetas).',
    equations: [
      { formula: 'Expulsión del envolvente',
        description: 'Las capas externas, ya débilmente ligadas por gravedad, se separan de la estrella y se expanden al espacio a ~10-50 km/s.' },
      { formula: 'Fotoionización UV',
        description: 'El núcleo remanente, ahora expuesto y muy caliente (~90.000-120.000 K), emite fotones ultravioleta capaces de arrancar electrones a los átomos del gas expulsado.' },
      { formula: 'L ∝ 4πR²σT⁴',
        description: 'Ley de Stefan-Boltzmann: la luminosidad depende del área de la superficie (4πR²) y de la cuarta potencia de la temperatura (T⁴), por eso el núcleo, aunque pequeño, sigue siendo muy luminoso al ser tan caliente.' },
    ],
    realValues: [
      'La nebulosa se dispersa en el espacio en apenas ~10.000-50.000 años, un instante en escala astronómica.',
      'El núcleo remanente alcanza hasta ~100.000-150.000 K antes de empezar a enfriarse como enana blanca.',
    ],
    comparisons: [
      { name: 'Nebulosa del Anillo (M57)', blurb: 'Nebulosa planetaria icónica en Lyra, con una enana blanca central visible en su corazón.' },
      { name: 'Nebulosa Hélice (NGC 7293)', blurb: 'Una de las nebulosas planetarias más cercanas a la Tierra (~650 años luz), apodada "el Ojo de Dios".' },
    ],
    svg: `<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="pn1" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#eaf6ff" stop-opacity="0"/><stop offset="55%" stop-color="var(--accent)" stop-opacity="0.5"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
      </radialGradient></defs>
      <circle cx="150" cy="80" r="65" fill="url(#pn1)"/>
      <circle cx="150" cy="80" r="65" fill="none" stroke="var(--accent)" stroke-width="1" stroke-dasharray="2 5" opacity="0.6"/>
      <circle cx="150" cy="80" r="7" fill="#eaf6ff"/>
      <text x="150" y="150" text-anchor="middle" font-size="8" fill="#7a9ab8" font-family="monospace">gas ionizado alrededor del núcleo</text>
    </svg>`,
  },

  /* ── Enana Blanca ───────────────────────────── */
  white_dwarf: {
    explanation: 'Lo que queda es un núcleo estelar del tamaño de la Tierra pero con la masa del Sol: un remanente sostenido no por fusión, sino por la presión de degeneración de electrones (un efecto puramente cuántico). Ya no genera energía nueva; simplemente se enfría y apaga muy lentamente durante miles de millones de años.',
    equations: [
      { formula: 'P = Kρ<sup>5/3</sup> (degen. e⁻)',
        description: 'La presión que sostiene a la enana blanca ya no depende de la temperatura, solo de la densidad ρ, por el principio de exclusión de Pauli aplicado a los electrones.' },
      { formula: 'M<sub>Ch</sub> ≈ 1.44 M☉',
        description: 'Límite de Chandrasekhar: si una enana blanca supera esta masa (p. ej. acretando materia de una compañera), la presión de degeneración ya no la sostiene y puede colapsar, a veces detonando como supernova tipo Ia.' },
      { formula: 'Enfriamiento: T ∝ t<sup>−3/7</sup>',
        description: 'La temperatura superficial decae lentamente con el tiempo t según esta ley aproximada: pasan miles de millones de años antes de enfriarse de forma apreciable.' },
    ],
    realValues: [
      'Radio típico: ~0.01 R☉, comparable al radio de la Tierra (~6.400 km), pero con la masa del Sol.',
      'Densidad: hasta ~10⁶ g/cm³ (una cucharadita pesaría varias toneladas).',
      'Tiempo hasta volverse invisible ("enana negra"): mucho mayor que la edad actual del universo (~13.800 millones de años).',
    ],
    comparisons: [
      { name: 'Sirio B', blurb: 'La enana blanca más famosa: ~1.02 M☉ comprimida en un radio de apenas ~5.800 km (menor que la Tierra), orbitando junto a Sirio A.' },
      { name: '40 Eridani B', blurb: 'Primera enana blanca descubierta; a menudo llamada "la piedra Rosetta" de la física de degeneración cuántica.' },
    ],
    svg: `<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg">
      <circle cx="115" cy="80" r="46" fill="none" stroke="#3a6a9a" stroke-width="1.2" stroke-dasharray="3 3"/>
      <text x="115" y="140" text-anchor="middle" font-size="7.5" fill="#5a8aaa" font-family="monospace">Tierra (referencia)</text>
      <circle cx="205" cy="80" r="18" fill="var(--accent)"/>
      <text x="205" y="140" text-anchor="middle" font-size="7.5" fill="var(--accent)" font-family="monospace">enana blanca (1 M☉)</text>
    </svg>`,
  },

  /* ── Colapso de Núcleo ──────────────────────── */
  core_collapse: {
    explanation: 'En estrellas masivas, el núcleo de hierro no puede fusionarse para liberar más energía (el hierro tiene la mayor energía de enlace por nucleón de todos los elementos). En fracciones de segundo, la fotodesintegración del hierro y la captura de electrones por los protones colapsan el núcleo desde el tamaño de la Tierra hasta apenas ~20 km.',
    equations: [
      { formula: 'Foto-desintegración Fe→He',
        description: 'Fotones de alta energía rompen los núcleos de hierro en fragmentos más ligeros, un proceso que absorbe energía en lugar de liberarla, acelerando el colapso.' },
      { formula: 'e⁻ + p → n + ν',
        description: 'Captura electrónica: los electrones se combinan con protones para formar neutrones y neutrinos, neutralizando la carga y compactando aún más el núcleo.' },
      { formula: 'τ<sub>colapso</sub> ~ 0.1 s',
        description: 'El colapso completo del núcleo ocurre en apenas una décima de segundo, una de las transiciones más rápidas y violentas conocidas en astrofísica.' },
    ],
    realValues: [
      'El núcleo pasa de ~el tamaño de la Tierra a ~20 km de radio en menos de un segundo.',
      'La velocidad de colapso puede alcanzar ~70.000 km/s (≈25% de la velocidad de la luz).',
    ],
    comparisons: [
      { name: 'Progenitor de SN 1987A', blurb: 'Supergigante azul (Sanduleak −69° 202) de ~20 M☉ cuyo colapso de núcleo en 1987 fue observado, incluyendo la detección directa de neutrinos.' },
    ],
    svg: `<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg">
      <circle cx="150" cy="80" r="55" fill="none" stroke="#5a8aaa" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>
      <circle cx="150" cy="80" r="8" fill="#ff4422"/>
      <g stroke="#ff4422" stroke-width="1.6" marker-end="url(#cArrow)">
        <line x1="150" y1="20" x2="150" y2="65"/><line x1="150" y1="140" x2="150" y2="95"/>
        <line x1="95" y1="80" x2="138" y2="80"/><line x1="205" y1="80" x2="162" y2="80"/>
      </g>
      <defs><marker id="cArrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#ff4422"/></marker></defs>
      <text x="150" y="150" text-anchor="middle" font-size="8" fill="#7a9ab8" font-family="monospace">colapso en ~0.1 s</text>
    </svg>`,
  },

  /* ── Supernova ──────────────────────────────── */
  supernova: {
    explanation: 'El núcleo colapsado rebota, generando una onda de choque que atraviesa las capas externas de la estrella y las expulsa violentamente al espacio. El 99% de la energía liberada se va en neutrinos casi indetectables; solo ~1% se convierte en la energía cinética de la explosión que vemos brillar durante semanas.',
    equations: [
      { formula: 'E<sub>ν</sub> ~ 3×10⁵³ erg',
        description: 'Energía total liberada en neutrinos durante la explosión: equivale a la energía de enlace gravitacional que sostenía al núcleo colapsado; la mayor parte escapa sin interactuar.' },
      { formula: 'Rebote: choque de rebote',
        description: 'Al alcanzar densidades nucleares, la materia se vuelve prácticamente incompresible y "rebota", generando la onda de choque que expulsa el resto de la estrella.' },
      { formula: 'E<sub>cin</sub> ~ 10⁵¹ erg',
        description: 'Solo alrededor de un 1% de la energía total se convierte en energía cinética de la explosión visible (una unidad llamada informalmente "foe").' },
    ],
    realValues: [
      'Una supernova puede brillar tanto como toda una galaxia (~miles de millones de estrellas) durante semanas.',
      'SN 1987A liberó ~3×10⁵³ erg en neutrinos, detectados en la Tierra minutos antes de que llegara la luz visible.',
    ],
    comparisons: [
      { name: 'SN 1054 (Nebulosa del Cangrejo)', blurb: 'Observada por astrónomos en el año 1054; su remanente alberga hoy un púlsar de neutrones.' },
      { name: 'SN 1987A', blurb: 'La supernova más estudiada de la era moderna, visible a simple vista en el hemisferio sur en 1987.' },
    ],
    svg: `<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg">
      <g stroke="#ffee22" stroke-width="1.6" opacity="0.9">
        <line x1="150" y1="80" x2="150" y2="15"/><line x1="150" y1="80" x2="150" y2="145"/>
        <line x1="150" y1="80" x2="85" y2="80"/><line x1="150" y1="80" x2="215" y2="80"/>
        <line x1="150" y1="80" x2="103" y2="33"/><line x1="150" y1="80" x2="197" y2="33"/>
        <line x1="150" y1="80" x2="103" y2="127"/><line x1="150" y1="80" x2="197" y2="127"/>
      </g>
      <circle cx="150" cy="80" r="14" fill="#fff3c4"/>
      <circle cx="150" cy="80" r="45" fill="none" stroke="#ff8844" stroke-width="1" opacity="0.5"/>
      <text x="150" y="155" text-anchor="middle" font-size="8" fill="#7a9ab8" font-family="monospace">onda de choque expulsando el envolvente</text>
    </svg>`,
  },

  /* ── Estrella de Neutrones ──────────────────── */
  neutron_star: {
    explanation: 'Si el núcleo remanente pesa entre ~1.4 y ~2.2 M☉, la presión de degeneración de neutrones (no de electrones) logra detener el colapso. El resultado es un objeto extremadamente denso, del tamaño de una ciudad, que a menudo gira cientos de veces por segundo y emite haces de radiación como un faro cósmico (púlsar).',
    equations: [
      { formula: 'TOV: dP/dr = −G(ρ+P/c²)(M+4πr³P/c²)/[r²(1−2GM/rc²)]',
        description: 'Ecuación de Tolman-Oppenheimer-Volkoff: versión relativista del equilibrio hidrostático, necesaria porque la gravedad es tan intensa que la relatividad general modifica cómo la presión P y la densidad ρ sostienen la estructura.' },
      { formula: 'M<sub>TOV</sub> ≈ 2.17 M☉',
        description: 'Masa máxima aproximada de una estrella de neutrones (el valor exacto depende de la ecuación de estado nuclear usada): por encima, ni la degeneración de neutrones evita el colapso a agujero negro.' },
    ],
    realValues: [
      'Radio típico: ~10-12 km, con la masa de 1.4 soles comprimida en el tamaño de una ciudad.',
      'Densidad comparable a la del núcleo atómico: ~10¹⁴ g/cm³ (una cucharadita pesaría miles de millones de toneladas).',
      'Periodos de rotación: desde milisegundos (púlsares de milisegundo) hasta varios segundos.',
    ],
    comparisons: [
      { name: 'Púlsar del Cangrejo (PSR B0531+21)', blurb: 'Remanente de SN 1054; gira ~30 veces por segundo y emite pulsos regulares de radio y rayos X.' },
      { name: 'PSR J0740+6620', blurb: 'Una de las estrellas de neutrones más masivas medidas con precisión (~2.08 M☉), cerca del límite teórico de estabilidad.' },
    ],
    svg: `<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg">
      <circle cx="150" cy="80" r="12" fill="var(--accent)"/>
      <g stroke="var(--accent)" stroke-width="1" opacity="0.55">
        <path d="M150,80 L60,10 L150,80 L70,150 Z" fill="var(--accent)" opacity="0.18"/>
        <path d="M150,80 L240,150 L150,80 L230,10 Z" fill="var(--accent)" opacity="0.18"/>
      </g>
      <line x1="150" y1="80" x2="60" y2="10" stroke="var(--accent)" stroke-width="1.2"/>
      <line x1="150" y1="80" x2="240" y2="150" stroke="var(--accent)" stroke-width="1.2"/>
      <text x="150" y="150" text-anchor="middle" font-size="8" fill="#7a9ab8" font-family="monospace">haces de radiación (efecto faro)</text>
    </svg>`,
  },

  /* ── Agujero Negro ──────────────────────────── */
  black_hole: {
    explanation: 'Si el núcleo remanente supera el límite de las estrellas de neutrones (~2.2-3 M☉), ninguna fuerza cuántica conocida detiene el colapso: la materia se comprime hasta un punto donde ni la luz puede escapar. Lo que queda no es un "objeto" en el sentido habitual, sino una región del espacio-tiempo delimitada por el horizonte de sucesos.',
    equations: [
      { formula: 'r<sub>s</sub> = 2GM/c²',
        description: 'Radio de Schwarzschild: tamaño del horizonte de sucesos, la frontera de no retorno. Depende solo de la masa M; para el Sol sería de apenas ~3 km si se comprimiera hasta ese punto.' },
      { formula: 'Métrica de Schwarzschild',
        description: 'Describe cómo la gravedad de un agujero negro sin rotación curva el espacio-tiempo a su alrededor, prediciendo efectos como la dilatación temporal extrema cerca del horizonte.' },
      { formula: 'ds² = −(1−r<sub>s</sub>/r)dt² + …',
        description: 'Intervalo espacio-temporal cerca del agujero negro: el término (1−r_s/r) se anula justo en el horizonte, donde el tiempo, visto desde lejos, parece detenerse.' },
    ],
    realValues: [
      'Para un agujero negro de 10 M☉, el radio de Schwarzschild es de solo ~30 km.',
      'Los agujeros negros estelares típicos tienen entre ~5 y ~20 M☉.',
    ],
    comparisons: [
      { name: 'Cygnus X-1', blurb: 'Uno de los primeros candidatos a agujero negro confirmados (~21 M☉), en un sistema binario con una supergigante azul; su disco de acreción brilla intensamente en rayos X.' },
      { name: 'GW150914', blurb: 'La primera onda gravitacional detectada (2015) provino de la fusión de dos agujeros negros de ~36 y ~29 M☉, formando uno de ~62 M☉.' },
    ],
    svg: `<svg viewBox="0 0 300 160" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="150" cy="82" rx="90" ry="18" fill="none" stroke="#ffaa44" stroke-width="2" opacity="0.85"/>
      <ellipse cx="150" cy="82" rx="90" ry="18" fill="none" stroke="#ffee88" stroke-width="1" opacity="0.4"/>
      <circle cx="150" cy="82" r="22" fill="#01050a" stroke="#ff44aa" stroke-width="1.5"/>
      <path d="M60,82 A90,30 0 0 1 150,55" stroke="#ffcc88" stroke-width="1.4" fill="none" opacity="0.6"/>
      <text x="150" y="145" text-anchor="middle" font-size="8" fill="#7a9ab8" font-family="monospace">horizonte de sucesos + disco de acreción</text>
    </svg>`,
  },
};

/* ── Colisiones ──────────────────────────────── */
window.currentCollisionEvent = 'kilonova';

const COLLISION_EVENTS = {
  kilonova: {
    title: '💥 Fusión GW170817',
    facts: [
      ['Fecha',           '17 ago 2017'],
      ['Detectores',      'LIGO + Virgo'],
      ['Galaxia',         'NGC 4993'],
      ['Distancia',       '~130 Mly'],
      ['M₁',              '~1.36 M☉'],
      ['M₂',              '~1.17 M☉'],
      ['E<sub>GW</sub>',  '~0.05 M☉c²'],
    ],
  },
  tde: {
    title: '🌀 Disrupción AT2019qiz',
    facts: [
      ['Fecha',              '19 sep 2019'],
      ['Tipo',               'TDE · Spaghettification'],
      ['Galaxia',            'ESO 548-G081'],
      ['Distancia',          '~215 Mly'],
      ['M<sub>BH</sub>',     '~10⁶ M☉'],
      ['M★',                 '~1 M☉'],
      ['L<sub>pico</sub>',   '~10⁴⁴ erg/s'],
    ],
  },
};

function switchCollisionEvent(type) {
  window.currentCollisionEvent = type;

  document.getElementById('canvas-kilonova-inner').style.display = type === 'kilonova' ? '' : 'none';
  document.getElementById('canvas-tde-inner').style.display      = type === 'tde'      ? '' : 'none';

  document.getElementById('btn-event-kilonova').classList.toggle('active', type === 'kilonova');
  document.getElementById('btn-event-tde').classList.toggle('active', type === 'tde');

  const ev = COLLISION_EVENTS[type];
  document.getElementById('mergerEventTitle').textContent = ev.title;
  document.getElementById('mergerFacts').innerHTML = ev.facts
    .map(([k, v]) => `<div class="merger-fact"><span>${k}</span><span>${v}</span></div>`)
    .join('');

  document.getElementById('mergerPhaseInfo').innerHTML = 'Iniciando simulación…';
  document.getElementById('mergerLiveInfo').innerHTML  = '';

  if (type === 'kilonova' && window._p5Merger) window._p5Merger.triggerResize?.();
  if (type === 'tde'      && window._p5TDE)    window._p5TDE.triggerResize?.();
}

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

/* ══════════════════════════════════════════════
   MODO "⚖ Comparar" — hasta 3 estrellas evolucionando
   en paralelo, cada una con su propia máquina de
   estados independiente (createStar/evolveStep de
   star.js), su propio mini-canvas 2D y su propia
   trayectoria en el H-R compartido.
   ══════════════════════════════════════════════ */
const COMPARE_DEFAULT_MASSES = [0.5, 8, 25];
const COMPARE_TRACK_COLORS   = ['#58a0ff', '#cc88ff', '#ff5a5a'];

window.compareStars  = [null, null, null];
window.compareTracks = [[], [], []];
let compareInitialized  = false;
let compareFrameCounter = 0;

function initCompareMode() {
  if (compareInitialized) return;
  compareInitialized = true;

  const container = document.getElementById('compareColumns');
  container.innerHTML = COMPARE_DEFAULT_MASSES.map((m, i) => `
    <div class="compare-column">
      <div class="compare-mass-label">M<sub>ZAMS</sub> = <span id="compareMassLabel${i}">${m.toFixed(1)}</span> M☉</div>
      <input type="range" class="compare-mass-slider" id="compareMassSlider${i}" min="0.1" max="40" step="0.1" value="${m}">
      <div class="compare-canvas-wrap"><canvas id="compareCanvas${i}" width="130" height="130"></canvas></div>
      <div class="compare-phase-badge" id="comparePhaseBadge${i}">—</div>
      <div class="compare-readouts">
        <div class="compare-readout-row"><span>Edad</span><span id="compareAge${i}">t = 0 yr</span></div>
        <div class="compare-readout-row"><span>Radio</span><span id="compareRadius${i}">—</span></div>
        <div class="compare-readout-row"><span>Luminosidad</span><span id="compareLum${i}">—</span></div>
        <div class="compare-readout-row"><span>T superficie</span><span id="compareTemp${i}">—</span></div>
        <div class="compare-readout-row"><span>Destino</span><span id="compareFate${i}">—</span></div>
      </div>
    </div>
  `).join('');

  COMPARE_DEFAULT_MASSES.forEach((m, i) => {
    document.getElementById(`compareMassSlider${i}`).addEventListener('input', function() {
      document.getElementById(`compareMassLabel${i}`).textContent = parseFloat(this.value).toFixed(1);
    });
  });

  syncCompareStars();
}

/* Botón "🔄 Sincronizar": recrea las 3 estrellas a la vez
   (mismo instante t=0, fase Protoestrella) con la masa
   actual de cada slider. */
function syncCompareStars() {
  for (let i = 0; i < 3; i++) {
    const slider = document.getElementById(`compareMassSlider${i}`);
    const M = slider ? parseFloat(slider.value) : COMPARE_DEFAULT_MASSES[i];
    window.compareStars[i]  = createStar(M);
    window.compareTracks[i] = [];
  }
  compareFrameCounter = 0;
  renderCompareFrame();
}

/* Avanza las 3 simulaciones un frame (solo si la pestaña
   Comparar está activa) y repinta. Se llama desde simLoop(). */
function compareTick() {
  if (currentViewMode !== 'compare') return;
  if (!window.compareStars[0]) return;

  compareFrameCounter++;

  for (let i = 0; i < 3; i++) {
    const s = window.compareStars[i];
    if (!s) continue;
    const dt = getSimulationStep(s);
    for (let k = 0; k < simSpeed; k++) evolveStep(s, dt);

    if (compareFrameCounter % 4 === 0 && s.T > 0) {
      window.compareTracks[i].push({ T: s.T, L: s.L });
      if (window.compareTracks[i].length > 400) window.compareTracks[i].shift();
    }
  }

  renderCompareFrame();
}

function renderCompareFrame() {
  for (let i = 0; i < 3; i++) {
    const s = window.compareStars[i];
    const canvas = document.getElementById(`compareCanvas${i}`);
    if (canvas) drawCompareStar(canvas.getContext('2d'), canvas.width, canvas.height, s);
    if (!s) continue;

    const meta  = PHASE_META[s.phase] || { name: s.phase };
    const color = PHASE_ACCENT[s.phase] || '#4a9acc';
    const badge = document.getElementById(`comparePhaseBadge${i}`);
    if (badge) {
      badge.textContent    = meta.name;
      badge.style.background = color + '22';
      badge.style.color      = color;
      badge.style.border     = `1px solid ${color}`;
    }

    _set(`compareAge${i}`,    `t = ${formatAge(s.age)}`);
    _set(`compareRadius${i}`, `${s.R.toFixed(s.R > 100 ? 0 : s.R > 1 ? 2 : 5)} R☉`);
    _set(`compareLum${i}`,    s.L > 1e5 ? `${s.L.toExponential(2)} L☉` : `${s.L.toFixed(2)} L☉`);
    _set(`compareTemp${i}`,   s.T > 0 ? `${Math.round(s.T).toLocaleString()} K` : '—');
    _set(`compareFate${i}`,   s.fate === 'white_dwarf' ? 'Enana Blanca' :
                               s.fate === 'neutron_star' ? 'Estrella de Neutrones' : 'Agujero Negro');
  }

  const hrCanvas = document.getElementById('compareHRCanvas');
  if (hrCanvas) {
    drawCompareHR(hrCanvas.getContext('2d'), hrCanvas.width, hrCanvas.height,
                  window.compareTracks, COMPARE_TRACK_COLORS);
  }
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
  compareTick();
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

  /* Si el panel educativo está abierto, refrescarlo cuando cambie de fase */
  const drawerEl = document.getElementById('phaseDrawer');
  if (drawerEl && drawerEl.classList.contains('active') && s.phase !== window._drawerLastPhase) {
    window._drawerLastPhase = s.phase;
    renderPhaseDrawer(s.phase);
  }
}

function _set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ══════════════════════════════════════════════
   PANEL EDUCATIVO DE FASE — apertura / cierre
   ══════════════════════════════════════════════ */
function renderPhaseDrawer(phase) {
  const meta = PHASE_META[phase] || { name: phase };
  const info = PHASE_INFO[phase];
  if (!info) return;

  const accent = PHASE_ACCENT[phase] || '#4a9acc';
  document.getElementById('phaseDrawer').style.setProperty('--accent', accent);

  document.getElementById('drawerPhaseBadge').textContent = `Fase actual`;
  document.getElementById('drawerTitle').textContent = meta.name;
  document.getElementById('drawerExplanation').textContent = info.explanation;
  document.getElementById('drawerDiagram').innerHTML = info.svg;

  document.getElementById('drawerEquations').innerHTML = info.equations.map(eq => `
    <div class="drawer-eq-item">
      <div class="drawer-eq-formula">${eq.formula}</div>
      <div class="drawer-eq-desc">${eq.description}</div>
    </div>
  `).join('');

  document.getElementById('drawerRealValues').innerHTML = info.realValues.map(v => `<li>${v}</li>`).join('');

  document.getElementById('drawerComparisons').innerHTML = info.comparisons.map(c => `
    <div class="comparison-card">
      <div class="comparison-name">${c.name}</div>
      <div class="comparison-blurb">${c.blurb}</div>
    </div>
  `).join('');
}

function openPhaseDrawer() {
  if (!window.star) return;
  window._drawerLastPhase = window.star.phase;
  renderPhaseDrawer(window.star.phase);
  document.getElementById('phaseDrawer').classList.add('active');
  document.getElementById('phaseDrawer').setAttribute('aria-hidden', 'false');
  document.getElementById('phaseDrawerOverlay').classList.add('active');
}

function closePhaseDrawer() {
  document.getElementById('phaseDrawer').classList.remove('active');
  document.getElementById('phaseDrawer').setAttribute('aria-hidden', 'true');
  document.getElementById('phaseDrawerOverlay').classList.remove('active');
}

/* ── Integración de Vistas 2D / 3D ──────────────── */
function switchViewMode(mode) {
  currentViewMode = mode;

  // Actualizar botones de pestaña
  document.getElementById('btn-tab-2d').classList.toggle('active', mode === '2d');
  document.getElementById('btn-tab-3d').classList.toggle('active', mode === '3d');
  document.getElementById('btn-tab-guide').classList.toggle('active', mode === 'guide');
  document.getElementById('btn-tab-merger').classList.toggle('active', mode === 'merger');
  document.getElementById('btn-tab-compare').classList.toggle('active', mode === 'compare');

  // Cambiar visibilidad de las capas de canvas
  document.getElementById('canvas-2d-view').classList.toggle('active', mode === '2d');
  document.getElementById('canvas-3d-view').classList.toggle('active', mode === '3d');
  document.getElementById('canvas-guide-view').classList.toggle('active', mode === 'guide');
  document.getElementById('canvas-merger-view').classList.toggle('active', mode === 'merger');
  document.getElementById('canvas-compare-view').classList.toggle('active', mode === 'compare');

  // Mostrar/ocultar paneles en el sidebar
  document.getElementById('panel-2d').style.display     = mode === '2d'     ? 'block' : 'none';
  document.getElementById('panel-3d').style.display     = mode === '3d'     ? 'block' : 'none';
  document.getElementById('panel-merger').style.display = mode === 'merger' ? 'block' : 'none';

  // Inicializar de forma perezosa la pestaña Comparar la primera vez que se visita
  if (mode === 'compare') initCompareMode();

  // Redimensionar el canvas correspondiente para asegurar que se dibuje bien
  if (mode === '2d' && window._p5Sketch) {
    window._p5Sketch.windowResized?.();
  } else if (mode === '3d' && window._p5Sketch3D) {
    window._p5Sketch3D.triggerResize?.();
    syncStarTo3D();
  } else if (mode === 'merger') {
    if (window.currentCollisionEvent === 'kilonova' && window._p5Merger) window._p5Merger.triggerResize?.();
    if (window.currentCollisionEvent === 'tde'      && window._p5TDE)    window._p5TDE.triggerResize?.();
  }
}

function restartMerger() {
  if (window.currentCollisionEvent === 'kilonova' && window._p5Merger) {
    window._p5Merger.restartMerger();
  } else if (window.currentCollisionEvent === 'tde' && window._p5TDE) {
    window._p5TDE.restartTDE();
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

  /* Panel educativo de fase */
  document.getElementById('phaseIndicator').addEventListener('click', openPhaseDrawer);
  document.getElementById('phaseDrawerClose').addEventListener('click', closePhaseDrawer);
  document.getElementById('phaseDrawerOverlay').addEventListener('click', closePhaseDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePhaseDrawer();
  });

  /* Iniciar estrella y sketchs */
  resetStar();

  const container2D = document.getElementById('canvas-2d-view');
  initSketch(container2D);

  const container3D = document.getElementById('canvas-3d-view');
  initSketch3D(container3D);

  const containerKilonova = document.getElementById('canvas-kilonova-inner');
  initSketchMerger(containerKilonova);

  const containerTDE = document.getElementById('canvas-tde-inner');
  initSketchTDE(containerTDE);

  // Poblar el panel lateral con los datos del evento inicial (kilonova)
  switchCollisionEvent('kilonova');

  /* Arrancar bucle de simulación */
  simLoop();
});
