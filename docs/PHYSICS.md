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

El error local es O(dt⁵), lo que permite pasos de tiempo grandes sin divergencia. En `physics.js:rk4Step()` se aplica a las relaciones de estructura estelar politrópicas escaladas.

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

Con eficiencia `η = 0.5`. Modela el viento estelar impulsado por presión de radiación en la envoltura convectiva. A mayor luminosidad y radio, mayor pérdida de masa.

---

## 4. Pérdida de masa — de Jager et al. (1988)

Para estrellas masivas (T_eff > 15 000 K o M ≥ 15 M☉):

```
log(dM/dt) = 1.769·log(L) - 1.676·log(T_eff) - 8.158    [M☉/yr]
```

Basada en datos observacionales de vientos de estrellas OB. Tasas típicas: 10⁻⁷ a 10⁻⁵ M☉/yr.

---

## 5. Relación masa-radio de Nauenberg (enana blanca)

Radio de una enana blanca en función de su masa, derivado de la ecuación de estado de gas de Fermi:

```
R_WD = R₀ · (M/M_Ch)^(-1/3) · [1 - (M/M_Ch)^(4/3)]^(1/2)
```

Con `R₀ ≈ 0.0126 R☉` y límite de Chandrasekhar `M_Ch = 1.44 M☉`. Al acercarse a `M_Ch`, el radio tiende a cero. Implementado en `compact3d.js`.

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

El índice politrópico γ = 4/3 hace el gas más compresible, reduciendo la presión de soporte. Implementado en `physics.js:degeneratePressureWD()`.

---

## 7. Tiempo de vida en la secuencia principal

```
τ_MS ≈ (M/L) · τ_☉    con τ_☉ ≈ 10 Gyr
```

Usando `L ∝ M^4`:

```
τ_MS ≈ τ_☉ · (M/M_☉)^(-2.5)    [años]
```

Una estrella de 10 M☉ vive ~30 Myr; una de 0.5 M☉ viviría ~80 Gyr. Implementado en `physics.js:mainSequenceLifetime()`.

---

## 8. Radio de Schwarzschild (agujero negro)

```
r_s = 2GM/c²
```

Para 10 M☉: r_s ≈ 29.5 km. En el Laboratorio 3D: horizonte en `r_s`, fotosfera en `1.5·r_s`, ISCO en `3·r_s`.

---

## 9. Temperatura de color (aproximación de Planck)

La temperatura efectiva se mapea a un color RGB mediante interpolación de la curva de cuerpo negro:

```
T < 3 500 K  →  rojo oscuro
T ≈ 5 778 K  →  blanco amarillento (Sol)
T > 30 000 K →  azul-blanco
```

Implementado en `physics.js:tempToColor(T)`. También usado en `hipparcos.js` para colorear las ~880 estrellas del catálogo.

---

## 10. Disrupción de Marea — Spaghettification (TDE)

Cuando la fuerza de marea supera la autogravedad estelar, la estrella se desintegra. El **radio de disruption de marea** es:

```
r_t = R★ · (M_BH / M★)^(1/3)
```

Para un BH de 10⁶ M☉ y una estrella solar: `r_t ≈ 100 R☉ ≈ 0.005 AU`.

La condición de disruption se da cuando la fuerza de marea supera la gravedad superficial de la estrella:

```
F_tidal ∝ G · M_BH · R★ / r³  >  F_self ∝ G · M★ / R★²
```

Tras la disruption, aproximadamente el 50% del material queda ligado al BH y cae de vuelta en escala de tiempo:

```
t_fall ∝ (M_BH)^(1/2) · (M★)^(-1) · (R★)^(3/2)    [~ semanas a meses]
```

El material ligado forma un disco de acreción brillante con temperatura pico:

```
T_disco ≈ 10⁵ – 10⁷ K    →    emisión UV y rayos X
L_pico ≈ 10⁴⁴ erg/s ≈ 10¹⁰ L☉
```

La curva de luz decae como `L ∝ t^(-5/3)` tras el pico (decaimiento de Rees 1988). Implementado en `tde.js` con 5 fases visuales basadas en AT2019qiz (2019).

---

## 11. Ondas Gravitacionales y Kilonova (NS Merger)

### Inspiral y chirp (GW170817)

Dos estrellas de neutrones en órbita decreciente emiten ondas gravitacionales. La frecuencia crece con el tiempo (chirp):

```
f_GW = 2 · f_orbital
```

La separación orbital evoluciona por pérdida de energía en GW:

```
dE/dt = -(32/5) · G⁴/c⁵ · (M₁·M₂)²·(M₁+M₂) / r⁵
```

La **chirp mass** (parámetro medido por LIGO) es:

```
M_chirp = (M₁·M₂)^(3/5) / (M₁+M₂)^(1/5)
```

Para GW170817: M₁ = 1.36 M☉, M₂ = 1.17 M☉ → M_chirp ≈ 1.188 M☉.

### Kilonova y proceso-r

La fusión produce condiciones extremas de neutrones libres que permiten la nucleosíntesis por **proceso-r** (rapid neutron capture):

```
(Z, A) + n → (Z, A+1) + γ    →    elementos pesados (A > 100)
```

Elementos sintetizados observados en AT2017gfo (contraparte óptica de GW170817):
- Oro (Au, Z=79), Platino (Pt, Z=78)
- Estroncio (Sr, Z=38) — identificado en espectro
- Lantánidos y actínidos (opacidad alta → componente roja del transiente)

Implementado en `merger.js` con partículas coloreadas por elemento.

---

## 12. Catálogo Hipparcos (fondo del diagrama H-R)

Las ~880 estrellas del fondo se generan proceduralmente con una semilla fija, siguiendo la **función de masa inicial de Salpeter**:

```
dN/dM ∝ M^(-2.35)
```

Las coordenadas (T_eff, L/L☉) se asignan según grupos observacionales con dispersión gaussiana calibrada a los datos ESA Hipparcos. Implementado en `hipparcos.js`, precalculado en un offscreen buffer al inicio en `renderer.js`.
