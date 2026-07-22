# Guía de Contribución

## Requisitos previos

- Navegador moderno con soporte WebGL (Chrome/Firefox/Edge 90+)
- Git
- Editor de código (recomendado: VS Code)

No se requieren herramientas de build, bundlers ni dependencias de npm. El proyecto corre directamente desde archivos estáticos.

---

## Correr localmente

```bash
# Opción A — servidor local (recomendado para evitar restricciones CORS)
python -m http.server 8080
# → Abrir http://localhost:8080

# Opción B — abrir directamente en el navegador
start index.html    # Windows
```

---

## Flujo de trabajo con ramas

```bash
# Crear rama desde main
git checkout main
git pull origin main
git checkout -b feature/SCRUM-XX-mi-tarea

# Trabajar y hacer commits
git add js/archivo-modificado.js
git commit -m "feat(SCRUM-XX): descripción del cambio"

# Subir rama y mergear a main
git push -u origin feature/SCRUM-XX-mi-tarea
git checkout main
git merge feature/SCRUM-XX-mi-tarea
git push origin main
```

---

## Dónde tocar cada cosa

| Si quieres cambiar...                          | Archivo(s) a editar             |
|------------------------------------------------|---------------------------------|
| Una ecuación física                            | `js/physics.js`                 |
| Una fase de evolución o transición estelar     | `js/star.js`                    |
| La apariencia visual 2D de la estrella         | `js/renderer.js`                |
| El diagrama H-R o el fondo Hipparcos           | `js/renderer.js`, `js/hipparcos.js` |
| El Laboratorio 3D (WebGL)                      | `js/compact3d.js`               |
| La simulación de kilonova GW170817             | `js/merger.js`                  |
| La simulación de TDE AT2019qiz                 | `js/tde.js`                     |
| El modo comparación de estrellas               | `js/main.js` (función `compareTick`) |
| Sistema de partículas (nebulosa, supernova)    | `js/particles.js`               |
| Controles UI, loop de simulación, vistas       | `js/main.js`                    |
| Estilos visuales                               | `css/style.css`                 |
| Estructura HTML, paneles, pestañas             | `index.html`                    |
| Contenido de la Guía educativa                 | `index.html` (sección `canvas-guide-view`) |
| Documentación técnica                          | `docs/*.md`, `README.md`        |

---

## Añadir una nueva fase estelar

1. Declarar la fase en `star.js` dentro del objeto `PHASES`
2. Añadir metadatos en `PHASE_META` (nombre visible, clase CSS)
3. Añadir las ecuaciones activas en `PHASE_EQUATIONS`
4. Implementar la lógica de evolución en `evolveStep()` dentro del `switch(s.phase)`
5. Añadir el renderizado visual en `renderer.js:_drawStarBody()`
6. Actualizar `LIMITATIONS.md` si hay simplificaciones nuevas
7. Añadir la fase a la Guía en `index.html`

---

## Añadir un efecto al Laboratorio 3D

Todas las funciones de renderizado 3D viven dentro del closure `new p5(function(p) {...})` en `compact3d.js`:

1. Definir `_drawMiEfecto()` dentro del closure
2. Llamarla desde `p.draw()` en el lugar apropiado
3. Exponer un parámetro vía `p.setMiParametro()` si la UI necesita controlarlo
4. Conectar el control desde `main.js` o `index.html`

---

## Añadir una nueva simulación de colisión

1. Crear `js/mi-evento.js` con `function initSketchMiEvento(containerEl)` que exponga `p.restartMiEvento` y `p.triggerResize`
2. Añadir `<script src="js/mi-evento.js"></script>` en `index.html` antes de `main.js`
3. Añadir un `<div id="canvas-mi-evento-inner">` dentro de `#canvas-merger-view`
4. Registrar el evento en `COLLISION_EVENTS` en `main.js` con título y datos
5. Actualizar `switchCollisionEvent()` para inicializar y alternar el nuevo sketch
6. Añadir el botón en `#collision-subnav` en `index.html`
7. Añadir la simulación a la lista de la Guía y actualizar el contador

---

## Convenciones de código

- Variables locales en `camelCase`; constantes físicas en `UPPER_SNAKE_CASE`
- Funciones privadas del sketch con prefijo `_` (ejemplo: `_drawNeutronStar`)
- No añadir comentarios que expliquen *qué* hace el código — solo *por qué* cuando no es obvio
- Mantener las funciones cortas y con una sola responsabilidad

---

## Verificar antes de hacer commit

```bash
# Abrir en el navegador y verificar:
# 1. La simulación arranca sin errores en la consola
# 2. El slider de masa cubre el rango completo (0.5 - 50 M☉)
# 3. El laboratorio 3D abre al llegar a objeto compacto
# 4. Los botones de exportación generan archivos descargables
# 5. La pestaña Colisiones muestra ambos eventos (GW170817 y AT2019qiz)
# 6. La Guía carga sin errores de layout
# 7. El modo Comparación inicia 3 simulaciones en paralelo
```

No hay suite de tests automatizados — la verificación es manual en el navegador.
