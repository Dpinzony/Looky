# Ecuaciones Físicas Implementadas

## 1. Integrador Runge-Kutta de 4° orden (RK4)

Usado para evolucionar luminosidad `L`, radio `R` y temperatura `T` en cada paso de tiempo.

```
k1 = f(t, y)
k2 = f(t + dt/2, y + k1·dt/2)
k3 = f(t + dt/2, y + k2·dt/2)
k4 = f(t + dt,   y + k3·dt)

y(t+dt) = y(t) + (k1 + 2k2 + 2k3 + k4) · dt/6
```

El error local es O(dt⁵), lo que permite pasos de tiempo grandes sin divergencia. En `physics.js:rk4Step()` se aplica a las relaciones de estructura estelar polítropicas escaladas.

---

## 2. Ecuación de Tolman-Oppenheimer-Volkoff (TOV)

Describe el equilibrio hidrostático relativista de objetos compactos (estrellas de neutrones).

```
dP/dr = -G(ρ + P/c²)(M + 4πr³P/c²) / [r²(1 - 2GM/rc²)]

dM/dr = 4πr²ρ
```

Los términos `P/c²` y `2GM/rc²` son correcciones relativistas que hacen la ecuación más restrictiva que el caso newtoniano, resultando en la masa máxima TOV ≈ 2.17 M☉ (límite blando). Implementado en `physics.js:tovStep()` con un integrador de Euler-Heun de 2 etapas.

---

## 3. Pérdida de masa — Reimers (1975)

Para gigantes frías (T_eff < 15 000 K, M < 15 M☉):

```
dM/dt = -η · (4×10⁻¹³) · L · R / M    [M☉/yr]
```

Con eficiencia `η = 0.5`. Modela el viento estelar impulsado por presión de radiación en la envoltura convectiva. A mayor luminosidad y radio, mayor pérdida de masa, lo que determina cuánta envoltura queda antes del colapso.

---

## 4. Pérdida de masa — de Jager et al. (1988)

Para estrellas masivas (T_eff > 15 000 K o M ≥ 15 M☉):

```
log(dM/dt) = 1.769·log(L) - 1.676·log(T_eff) - 8.158    [M☉/yr]
```

Basada en datos observacionales de vientos de estrellas OB. Tasas de pérdida típicas: 10⁻⁷ a 10⁻⁵ M☉/yr. Crítica para determinar si una estrella masiva llega al colapso de núcleo con suficiente masa para formar un agujero negro.

---

## 5. Relación masa-radio de Nauenberg (enana blanca)

Radio de una enana blanca en función de su masa, derivado de la ecuación de estado de gas de Fermi:

```
R_WD = R₀ · (M/M_Ch)^(-1/3) · [1 - (M/M_Ch)^(4/3)]^(1/2)
```

Con `R₀ ≈ 0.0126 R☉` y límite de Chandrasekhar `M_Ch = 1.44 M☉`. Al acercarse a `M_Ch`, el radio tiende a cero (colapso). Implementado en `compact3d.js` para escalar visualmente el radio de la enana blanca en el Laboratorio 3D.

---

## 6. Presión de degeneración electrónica (enana blanca)

**No-relativista** (baja densidad, M << M_Ch):
```
P = K_nr · ρ^(5/3)    con K_nr = 1.004×10¹³ cgs
```

**Ultra-relativista** (alta densidad, M → M_Ch):
```
P = K_ur · ρ^(4/3)    con K_ur = 1.244×10¹⁵ cgs
```

La transición entre regímenes ocurre cerca de ρ ≈ 10⁶ g/cm³. El índice politrópico γ = 4/3 hace el gas más compresible, reduciendo la presión de soporte y acercando la estrella al colapso. Implementado en `physics.js:degeneratePressureWD()`.

---

## 7. Tiempo de vida en la secuencia principal

```
τ_MS ≈ (M/L) · τ_☉    con τ_☉ ≈ 10 Gyr
```

Usando la relación masa-luminosidad `L ∝ M^4` para estrellas de masa media:

```
τ_MS ≈ τ_☉ · (M/M_☉)^(-2.5)    [años]
```

Una estrella de 10 M☉ vive ~30 Myr; una de 0.5 M☉ viviría ~80 Gyr. Implementado en `physics.js:mainSequenceLifetime()`.

---

## 8. Radio de Schwarzschild (agujero negro)

```
r_s = 2GM/c²
```

Para 10 M☉: r_s ≈ 29.5 km. En la visualización 3D, el horizonte de sucesos se escala como `r_s = 12 · M_rem` unidades visuales. La fotosfera (radio de la órbita de fotones) queda en `r_ph = 1.5 · r_s` y la ISCO en `r_ISCO = 3 · r_s`.

---

## 9. Temperatura de color (aproximación de Planck)

La temperatura efectiva se mapea a un color RGB mediante interpolación de la curva de cuerpo negro:

```
T < 3 500 K  →  rojo oscuro
T ≈ 5 778 K  →  blanco amarillento (Sol)
T > 30 000 K →  azul-blanco
```

Implementado en `physics.js:tempToColor(T)` como tabla de control con interpolación lineal entre puntos de referencia espectrales.
