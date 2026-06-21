# Limitaciones y Simplificaciones del Modelo

Este documento describe las simplificaciones adoptadas por razones de rendimiento, complejidad de implementación o alcance del proyecto académico.

---

## Física estelar

### Politrópica n=1 para estructura interna
La estructura radial de la estrella se modela con un perfil de densidad politrópico `ρ(r) = ρ_c·(1 - r²/R²)`. En realidad, el índice politrópico varía con la fase (n ≈ 3 en la secuencia principal, n ≈ 3/2 en convección total). Esta simplificación afecta los perfiles P(r) y ρ(r) mostrados en la Vista de Corte TOV.

### Ecuación de estado nuclear (NS)
El integrador TOV usa la EOS politrópica `P = K·ρ²` (n=1) para toda la estrella de neutrones. Las EOSs reales (APR, SLy, FPS) tienen transiciones de fase entre corteza y núcleo y son sensibles al isospín. La masa máxima TOV simulada (≈ 2.17 M☉) es una aproximación del límite observacional.

### Sin rotación (Schwarzschild, no Kerr)
Los agujeros negros y estrellas de neutrones se modelan como no rotantes. En realidad, el colapso de núcleo conserva el momento angular, produciendo objetos en rotación rápida (púlsares con P ≈ ms, BH de Kerr). La ergosfera, el arrastre de marco y el límite ISCO modificado por spin no están implementados.

### Mezcla de elementos simplificada
Las fracciones H, He, C se evolucionan con modelos lineales por fase. No se modela la difusión, la separación gravitacional de especies, ni la nucleosíntesis de elementos pesados (Ne, O, Si, Fe) que ocurre en las capas de fusión en cascada de estrellas masivas.

### Pérdida de masa de Reimers con η constante
Se usa `η = 0.5` fijo. En la realidad, η varía entre 0.2 y 1.5 dependiendo de la cromosfera y la pulsación de la estrella. Esto afecta la masa final del remanente y el tamaño de la nebulosa planetaria.

---

## Sistema binario

### Órbita kepleriana sin retroalimentación dinámica
La estrella compañera en el Laboratorio 3D sigue una órbita circular a radio fijo. No se simula la precesión orbital, el acortamiento por emisión de ondas gravitacionales, ni el ensanchamiento por transferencia de masa. El sistema binario es puramente visual.

### Transferencia de masa sin física de acreción
El flujo de gas hacia el disco es visual. No se calcula la tasa de acreción real, la luminosidad del disco de acreción (L_disco = G·M·dM/dt / 2R), ni la acumulación de masa que podría llevar a una Nova Clásica o a supernova Tipo Ia.

---

## Renderizado

### Diagrama H-R sin isócronas
El diagrama H-R muestra la trayectoria de la estrella simulada pero no superpone isócronas de referencia ni la región prohibida (banda de inestabilidad de Cepheidas, gap de Hertzsprung). La comparación con datos observacionales es cualitativa.

### Escala de tiempo comprimida
La simulación corre entre ×1 y ×40 veces la velocidad real, lo que implica que cada fase tiene una duración proporcional pero no exacta. El `dt` real se ajusta dinámicamente según la fase para evitar inestabilidades, no para reproducir con fidelidad la cronología.

### Lente gravitacional geométrica
El efecto de lente gravitacional del agujero negro se modela con geometría euclidiana (arcos deformados dibujados manualmente). No se implementa trazado de rayos en el espaciotiempo de Schwarzschild, por lo que la distorsión de las estrellas de fondo no es físicamente precisa.

---

## Lo que queda fuera del alcance

- Fusión de estrellas de neutrones (kilonova, ondas gravitacionales)
- Estrella de Wolf-Rayet como fase evolutiva propia
- Metalicidad inicial (Z) como parámetro de control
- Asterosismología / modos de oscilación estelares
- Efectos de marea en el sistema binario
