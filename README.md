# Looky - Simulador de Evolución Estelar

Simulación interactiva en tiempo real del ciclo de vida de una estrella, desde protoestrella hasta objeto compacto. Implementa integración numérica RK4, ecuaciones de estructura estelar y relatividad general, renderizado en WebGL con p5.js.

## Características

### Simulación física
- **Motor RK4 completo**: pérdida de masa (Reimers / de Jager), ecuación TOV, límite de Chandrasekhar / Nauenberg
- **Rango de masa**: 0.5 M☉ — 50 M☉ (cubre todos los destinos: enana blanca, estrella de neutrones, agujero negro)
- **Exportación de datos**: historial de simulación en CSV y trayectoria H-R en JSON

### Vista 2D — Evolución Estelar
- Animación del cuerpo estelar coloreada por temperatura de Planck con convección, prominencias y nebulosa
- **Diagrama H-R en tiempo real** con trayectoria evolutiva y fondo del catálogo Hipparcos (~880 estrellas)
- **Comparador de destinos**: 3 trayectorias simultáneas (1 / 8 / 25 M☉) superpuestas en el H-R

### Vista 3D — Laboratorio WebGL
- Enana blanca, estrella de neutrones (púlsar con jets), agujero negro con disco de acreción
- Lente gravitacional (anillo de Einstein), diagrama de Penrose, sistema binario
- **Vista de Corte TOV**: tomografía animada de la estructura interna de objetos compactos
- Supernova 3D y lanzamiento de sonda

### 📖 Guía Educativa
- Explicación de cada fase estelar, objetos compactos, diagrama H-R y ecuaciones clave
- Listado de las 25 simulaciones disponibles con condiciones de activación

### 💥 Colisiones — Eventos de Alta Energía
- **GW170817 · Kilonova** (17 ago 2017): fusión de estrellas de neutrones con inspiral, ondas gravitacionales (chirp), kilonova y síntesis de elementos pesados por proceso-r
- **AT2019qiz · Disrupción de Marea** (19 sep 2019): estrella spaghettificada por agujero negro supermasivo — aproximación, disruption, disco de acreción con jets relativistas

### ⚖ Comparación de Estrellas
- 3 simulaciones independientes en paralelo con sliders de masa individuales
- Readouts en tiempo real de edad, radio, luminosidad, temperatura y destino final

## Correr localmente

```bash
git clone https://github.com/Dpinzony/Looky.git
cd Looky

# Opción A — servidor local (recomendado)
python -m http.server 8080
# → Abrir http://localhost:8080

# Opción B — abrir directamente
start index.html        # Windows
open index.html         # macOS / Linux
```

> Requiere un navegador moderno con soporte WebGL (Chrome 90+, Firefox 90+, Edge 90+).

## Estructura del proyecto

```
Looky/
├── index.html              # Entrada principal, layout, 5 pestañas de vista
├── css/
│   └── style.css           # Estilos del simulador
├── js/
│   ├── physics.js          # Motor físico: RK4, TOV, EOS, pérdida de masa
│   ├── star.js             # Máquina de estados de evolución estelar
│   ├── particles.js        # Sistema de partículas (nebulosa, supernova)
│   ├── hipparcos.js        # Catálogo procedural Hipparcos (~880 estrellas para H-R)
│   ├── renderer.js         # Sketch 2D: cuerpo estelar, diagrama H-R, comparador
│   ├── compact3d.js        # Sketch WebGL: laboratorio de objetos compactos
│   ├── merger.js           # Sketch 2D: simulación kilonova GW170817
│   ├── tde.js              # Sketch 2D: simulación TDE AT2019qiz (spaghettification)
│   └── main.js             # Bootstrap, loop de simulación, gestión de vistas y UI
├── libraries/
│   └── p5.min.js           # Copia local de p5.js v1.9.0
└── docs/
    ├── ARCHITECTURE.md     # Diagrama de módulos y flujo de datos
    ├── PHYSICS.md          # Ecuaciones físicas implementadas
    ├── LIMITATIONS.md      # Simplificaciones del modelo
    └── CONTRIBUTING.md     # Guía para contribuidores
```

Proyecto académico — Computación Visual, 2026.
