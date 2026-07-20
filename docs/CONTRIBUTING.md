# Guía de Contribución

## Requisitos previos

- Navegador moderno con soporte WebGL (Chrome/Firefox/Edge 90+)
- Git
- Editor de código (recomendado: VS Code)

No se requieren herramientas de build, bundlers ni dependencias de npm. El proyecto corre directamente desde archivos estáticos.

---

## Flujo de trabajo con ramas

Cada tarea del proyecto sigue la convención:

```
feature/SCRUM-<número>-descripcion-corta
```

Ejemplo: `feature/SCRUM-14-exportar-csv-json`

```bash
# Crear rama desde main
git checkout main
git checkout -b feature/SCRUM-XX-mi-tarea

# Trabajar y hacer commits
git add js/archivo-modificado.js
git commit -m "feat(SCRUM-XX): descripción del cambio"

# Subir rama
git push -u origin feature/SCRUM-XX-mi-tarea
```

---

## Dónde tocar cada cosa

| Si quieres cambiar... | Archivo(s) a editar |
|---|---|
| Una ecuación física | `js/physics.js` |
| Una fase de evolución o transición | `js/star.js` |
| La apariencia visual 2D de la estrella | `js/renderer.js` |
| El Laboratorio 3D (WebGL) | `js/compact3d.js` |
| Sistema de partículas | `js/particles.js` |
| Controles UI, loop de simulación | `js/main.js` |
| Estilos visuales | `css/style.css` |
| Estructura HTML o nuevos paneles | `index.html` |

---

## Añadir una nueva fase estelar

1. Declarar la fase en `star.js` dentro del objeto `PHASES`
2. Añadir metadatos en `PHASE_META` (nombre visible, clase CSS)
3. Añadir las ecuaciones activas en `PHASE_EQUATIONS`
4. Implementar la lógica de evolución en `evolveStep()` dentro del `switch(s.phase)`
5. Añadir el renderizado visual en `renderer.js:_drawStarBody()`
6. Actualizar `LIMITATIONS.md` si hay simplificaciones nuevas

---

## Añadir un efecto visual al Laboratorio 3D

Todas las funciones de renderizado 3D viven dentro del closure `new p5(function(p) {...})` en `compact3d.js`. Para añadir un nuevo efecto:

1. Definir la función `_drawMiEfecto()` dentro del closure
2. Llamarla desde `p.draw()` en el lugar apropiado
3. Exponer un parámetro de control vía `p.setMiParametro()` si la UI necesita controlarlo
4. Conectar el control desde `main.js` o `index.html`

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
# 3. El laboratorio 3D abre correctamente al llegar a objeto compacto
# 4. Los botones de exportación generan archivos descargables
```

No hay suite de tests automatizados actualmente — la verificación es manual en el navegador. Ver `LIMITATIONS.md` para el alcance del modelo.
