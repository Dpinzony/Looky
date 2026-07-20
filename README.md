# Looky — Simulador de Evolución Estelar

Simulación interactiva en tiempo real del ciclo de vida de una estrella, desde protoestrella hasta objeto compacto. Implementa integración numérica RK4, ecuaciones de estructura estelar y relatividad general, renderizado en WebGL con p5.js.

![Vista de la simulación](docs/screenshot.png)

## Características

- **Simulación física completa**: integración RK4, pérdida de masa (Reimers / de Jager), ecuación TOV, límite de Chandrasekhar / Nauenberg
- **Diagrama H-R en tiempo real**: trayectoria evolutiva coloreada por temperatura de Planck
- **Laboratorio 3D WebGL**: enana blanca, estrella de neutrones (pulsar), agujero negro con lente gravitacional y espaguetización
- **Vista de Corte TOV**: estructura interna de objetos compactos con animación tipo tomografía
- **Exportación de datos**: historial de simulación en CSV y trayectoria H-R en JSON
- **Rango de masa**: 0.5 M☉ — 50 M☉ (cubre todos los destinos finales)

## Correr localmente

No se necesita servidor ni dependencias adicionales. Solo:

```bash
# Clonar el repositorio
git clone https://github.com/YamidGT/Looky.git
cd Looky

# Abrir directamente en el navegador
start index.html        # Windows
open index.html         # macOS
xdg-open index.html     # Linux
```

> Requiere un navegador moderno con soporte WebGL (Chrome 90+, Firefox 90+, Edge 90+).

## Estructura del proyecto

```
Looky/
├── index.html          # Entrada principal y layout de la UI
├── css/
│   └── style.css       # Estilos del simulador
├── js/
│   ├── physics.js      # Motor físico: RK4, TOV, EOS, pérdida de masa
│   ├── star.js         # Máquina de estados de evolución estelar
│   ├── particles.js    # Sistema de partículas (nebulosa, supernova)
│   ├── renderer.js     # Renderizado 2D con p5.js y diagrama H-R
│   ├── compact3d.js    # Renderizado 3D WebGL de objetos compactos
│   └── main.js         # Bootstrap, loop de simulación y controles UI
└── docs/
    ├── ARCHITECTURE.md # Diagrama de módulos y flujo de datos
    ├── PHYSICS.md      # Ecuaciones físicas implementadas
    ├── LIMITATIONS.md  # Simplificaciones del modelo
    └── CONTRIBUTING.md # Guía para contribuidores
```

## Equipo

| Integrante | Responsabilidades |
|---|---|
| Yamid González (yagonzalez) | Vista de Corte TOV, exportación de datos, documentación |
| Diego Pinzón (dpinzony) | Sistema binario, lente gravitacional, optimización |
| Sharick Torres (shtorres) | Panel educativo, modo comparación |
| Andrés Montaña (andramirezm) | Sonificación, exportación CSV/JSON |

## Licencia

Proyecto académico — Computación Visual, 2026.
