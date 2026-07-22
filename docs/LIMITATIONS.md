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
Las fracciones H, He, C se evolucionan con modelos lineales por fase. No se modela la difusión, la separación gravitacional de especies, ni la nucleosíntesis de elementos pesados (Ne, O, Si, Fe) en cascada de fusión de estrellas masivas.

### Pérdida de masa de Reimers con η constante
Se usa `η = 0.5` fijo. En la realidad, η varía entre 0.2 y 1.5 dependiendo de la cromosfera y la pulsación de la estrella.

---

## Sistema binario

### Órbita kepleriana sin retroalimentación dinámica
La estrella compañera en el Laboratorio 3D sigue una órbita circular a radio fijo. No se simula la precesión orbital, el acortamiento por emisión de ondas gravitacionales, ni el ensanchamiento por transferencia de masa.

### Transferencia de masa sin física de acreción
El flujo de gas hacia el disco es visual. No se calcula la tasa de acreción real, la luminosidad del disco (L_disco = G·M·Ṁ / 2R), ni la acumulación que podría llevar a Nova Clásica o Supernova Tipo Ia.

---

## Colisiones de estrellas de neutrones (GW170817)

### Inspiral paramétrico, no ecuaciones de Peters
La reducción orbital se modela con una ley de potencia empírica `r(t) ∝ (1-t)^0.65` para visualización. Las ecuaciones reales de Peters (1964) requieren integración numérica del decaimiento de la separación orbital, acoplado con la frecuencia de GW.

### Kilonova sin modelo de opacidad
Las partículas coloreadas por elemento (Au, Pt, Sr, lantánidos) son visualizaciones cualitativas. No se modela la curva de luz real de la kilonova (componente azul rápida vs. componente roja lenta por lantánidos con alta opacidad κ ≈ 10 cm²/g).

### Remanente como agujero negro
La simulación asume que GW170817 terminó en BH. Algunos modelos predicen un remanente de estrella de neutrones masiva de corta vida antes del colapso, que no está modelado.

---

## Disrupción de Marea (AT2019qiz — TDE)

### Órbita parabólica parametrizada
La trayectoria de la estrella es una interpolación suave, no la solución kepleriana de una órbita parabólica real con `r(θ) = p/(1 + cos θ)`. La velocidad de la estrella al acercarse no sigue la conservación de energía/momento angular exacta.

### Spaghettification simplificada
El estiramiento de la estrella se modela como una elipse de proporción creciente. En realidad, la disruption es un proceso tridimensional con caos hidrodinámico, formación de choques y emisión de radiación en múltiples bandas durante el proceso.

### Decaimiento del disco no modelado
El disco de acreción se mantiene estable indefinidamente en la simulación. La curva de luz real decae como `L ∝ t^(-5/3)` tras el pico y el sistema regresa a la quiescencia en semanas a meses.

---

## Renderizado

### Diagrama H-R sin isócronas
El diagrama H-R muestra la trayectoria de la estrella simulada pero no superpone isócronas de referencia ni la banda de inestabilidad de Cepheidas. La comparación con datos observacionales es cualitativa.

### Escala de tiempo comprimida
La simulación corre entre ×1 y ×40. El `dt` se ajusta dinámicamente según la fase para evitar inestabilidades, no para reproducir la cronología real.

### Lente gravitacional geométrica
El efecto de lente se modela con geometría euclidiana. No se implementa trazado de rayos en el espaciotiempo de Schwarzschild.

### Catálogo Hipparcos procedural
Las ~880 estrellas del fondo son generadas con un RNG de semilla fija que imita la distribución del catálogo Hipparcos ESA. No son las coordenadas reales del catálogo.

---

## Fuera del alcance actual

- Metalicidad inicial (Z) como parámetro de control
- Estrella de Wolf-Rayet como fase evolutiva propia
- Asterosismología / modos de oscilación estelares
- Efectos de marea en el sistema binario
- Nucleosíntesis completa (Ne, O, Si, Fe) en estrellas masivas
