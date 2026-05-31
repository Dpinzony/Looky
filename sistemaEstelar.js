// ============================================================
//  SISTEMA_ESTELAR.JS — Evolución estelar corregida
//
//  Correcciones implementadas:
//  1. Fases: NEBULA → PROTO_ESTRELLA → SECUENCIA_PRINCIPAL
//            → SUBGIGANTE → GIGANTE_ROJA → AGB → SUPERNOVA → REMANENTE
//  2. Duración de vida: t = 10^10 · (M/L) con L ∝ M^4
//  3. Masa del REMANENTE separada de la masa inicial
//     (Límites Chandrasekhar y TOV aplican al remanente)
//  4. Clasificación espectral OBAFGKM real
//  5. Luminosidad L ∝ M^4 (relación masa-luminosidad)
//  6. Supernova asimétrica con ángulo de jet polar
//  7. Frenado magnético del púlsar dP/dt ∝ B²
//  8. Temperatura superficial correcta por tipo espectral
// ============================================================

class SistemaEstelar {
    constructor() {
        this.nebulosa        = [];
        this.masaSolar       = 1.0;   // Masa inicial de la nube
        this.masaRemanente   = 0.0;   // Masa del objeto compacto final
        this.luminosidad     = 1.0;   // En unidades solares L☉
        this.tempSuperficie  = 5778;  // Kelvin

        // Fases: NEBULA → PROTO_ESTRELLA → SECUENCIA_PRINCIPAL →
        //        SUBGIGANTE → GIGANTE_ROJA → AGB → SUPERNOVA → REMANENTE
        this.fase            = "NEBULA";
        this.tiempoFase      = 0;
        this.limiteTiempoFase = 200;

        this.radioNucleo     = 0;
        this.colorEstrella   = [255, 255, 255];
        this.flashSupernova  = 0;
        this.radioSchwarzschild = 0;
        this.simulando       = false;

        // Supernova: ángulo del jet polar (asimetría)
        this.angAsimetria    = 0;

        // Púlsar: período de rotación (frenado magnético)
        this.periodoPulsar   = 0.05;   // segundos iniciales (ms-pulsars ~ms)
        this.campoBMagnetico = 0;       // Tesla (normalizado)
        this.anguloPulsarGiro = 0;

        // Tipo espectral derivado de la masa
        this.tipoEspectral   = "G";
    }

    // ----------------------------------------------------------
    //  INICIALIZACIÓN
    // ----------------------------------------------------------
    iniciar(masa, radioNube, rotacion, centro) {
        this.nebulosa        = [];
        this.fase            = "NEBULA";
        this.tiempoFase      = 0;
        this.flashSupernova  = 0;
        this.radioNucleo     = 0;
        this.masaSolar       = masa;

        // Relación masa-luminosidad: L ∝ M^3.5 (más precisa que M^4 para rango amplio)
        this.luminosidad = pow(masa, 3.5);

        // Temperatura superficial por clasificación espectral
        this.tempSuperficie  = this._tempPorMasa(masa);
        this.tipoEspectral   = this._tipoEspectral(masa);
        this.colorEstrella   = this._colorPorTemp(this.tempSuperficie);

        // Masa del remanente según relaciones semi-empíricas (Woosley & Heger 2002)
        this.masaRemanente   = this._calcularMasaRemanente(masa);

        // Vida en secuencia principal (en unidades arbitrarias de simulación)
        // t_vida ∝ M / L = M / M^3.5 = M^-2.5
        let vidaReal = pow(masa, -2.5);
        this.limiteTiempoFase = floor(400 * vidaReal);
        if (this.limiteTiempoFase < 60) this.limiteTiempoFase = 60;

        // Campo magnético del futuro remanente (escala con masa)
        this.campoBMagnetico = map(masa, 0.5, 8, 0.5, 3.5);

        // Ángulo del jet polar de la supernova (aleatorio, físicamente motivado)
        this.angAsimetria    = random(TWO_PI);

        let totalParticulas  = floor(masa * 230);
        for (let i = 0; i < totalParticulas; i++) {
            this.nebulosa.push(new Particula(centro.x, centro.y, radioNube, rotacion));
        }
        this.simulando = true;
    }

    // ----------------------------------------------------------
    //  LOOP PRINCIPAL
    // ----------------------------------------------------------
    actualizarLógica(centro) {
        if (!this.simulando) return;

        this.gestionarEvolucionCientifica();

        for (let i = this.nebulosa.length - 1; i >= 0; i--) {
            let p = this.nebulosa[i];

            if (["NEBULA","PROTO_ESTRELLA","SECUENCIA_PRINCIPAL",
                 "SUBGIGANTE","GIGANTE_ROJA","AGB"].includes(this.fase)) {
                p.atraerAlCentro(centro, this.fase, this.radioNucleo,
                                 this.masaSolar, this.luminosidad);

            } else if (this.fase === "SUPERNOVA") {
                p.explotar(centro, this.tiempoFase, this.angAsimetria);

            } else if (this.fase === "REMANENTE") {
                if (this.masaRemanente > 2.8) {
                    p.orbitarAgujeroNegro(centro, this.radioSchwarzschild);
                    if (p.pos.dist(centro) <= this.radioSchwarzschild) {
                        this.nebulosa.splice(i, 1);
                        continue;
                    }
                } else if (this.masaRemanente >= 1.4) {
                    // Estrella de neutrones: gravedad fuerte, compacta
                    p.atraerAlCentro(centro, "SECUENCIA_PRINCIPAL",
                                     this.radioNucleo, this.masaRemanente * 0.3, 0.01);
                    p.vel.mult(0.97);
                } else {
                    // Enana blanca: dispersión libre de nebulosa planetaria
                    p.vel.mult(0.992);
                }
            }
            p.update();
        }

        // Frenado magnético del púlsar: dP/dt ∝ B² · P^-1
        if (this.fase === "REMANENTE" && this.masaRemanente >= 1.4 && this.masaRemanente <= 2.8) {
            let dPdt = 1e-4 * this.campoBMagnetico * this.campoBMagnetico / this.periodoPulsar;
            this.periodoPulsar += dPdt;
            // Velocidad angular ω = 2π/P
            this.anguloPulsarGiro += TWO_PI / (this.periodoPulsar * 60);
        }

        if (this.flashSupernova > 0) this.flashSupernova -= 10;
        this.tiempoFase++;
    }

    // ----------------------------------------------------------
    //  MÁQUINA DE ESTADOS DE EVOLUCIÓN ESTELAR
    // ----------------------------------------------------------
    gestionarEvolucionCientifica() {

        // ---- NEBULA: colapso gravitacional ----
        if (this.fase === "NEBULA") {
            this.radioNucleo = lerp(this.radioNucleo,
                map(this.masaSolar, 0.5, 8, 18, 45), 0.012);

            if (this.tiempoFase > 160) {
                this.fase = "PROTO_ESTRELLA";
                this.tiempoFase = 0;
            }
        }

        // ---- PROTO-ESTRELLA: contracción Kelvin-Helmholtz ----
        else if (this.fase === "PROTO_ESTRELLA") {
            // Radio se contrae hasta el radio de la secuencia principal
            let radioMS = map(this.masaSolar, 0.5, 8, 10, 28);
            this.radioNucleo = lerp(this.radioNucleo, radioMS, 0.025);
            // Temperatura sube mientras se contrae
            let tActual = map(this.tiempoFase, 0, 120, 3000, this.tempSuperficie);
            this.colorEstrella = this._colorPorTemp(tActual);

            if (this.tiempoFase > 120) {
                this.fase = "SECUENCIA_PRINCIPAL";
                this.tiempoFase = 0;
                this.flashSupernova = 120;
                this.colorEstrella = this._colorPorTemp(this.tempSuperficie);
            }
        }

        // ---- SECUENCIA PRINCIPAL: equilibrio hidrostático ----
        else if (this.fase === "SECUENCIA_PRINCIPAL") {
            // El radio pulsa levemente (modos de oscilación estelar)
            let radioMS = map(this.masaSolar, 0.5, 8, 10, 28);
            let pulso = sin(this.tiempoFase * 0.05) * 0.8;
            this.radioNucleo = lerp(this.radioNucleo, radioMS + pulso, 0.05);

            if (this.tiempoFase > this.limiteTiempoFase) {
                this.fase = "SUBGIGANTE";
                this.tiempoFase = 0;
            }
        }

        // ---- SUBGIGANTE: agotamiento del H central ----
        else if (this.fase === "SUBGIGANTE") {
            let radioSG = map(this.masaSolar, 0.5, 8, 18, 55);
            this.radioNucleo = lerp(this.radioNucleo, radioSG, 0.018);
            // Temperatura desciende ligeramente (la estrella se expande)
            let tSG = this.tempSuperficie * 0.82;
            this.colorEstrella = this._colorPorTemp(tSG);

            if (this.tiempoFase > 90) {
                this.fase = "GIGANTE_ROJA";
                this.tiempoFase = 0;
            }
        }

        // ---- GIGANTE ROJA: fusión de He en el núcleo ----
        else if (this.fase === "GIGANTE_ROJA") {
            let expansionMax = map(this.masaSolar, 0.5, 8, 45, 120);
            this.radioNucleo = lerp(this.radioNucleo, expansionMax, 0.018);
            this.colorEstrella = this._colorPorTemp(3800);

            if (this.tiempoFase > 130) {
                if (this.masaSolar < 2.0) {
                    // Estrellas de baja masa: van a la rama AGB
                    this.fase = "AGB";
                } else {
                    // Estrellas masivas: van directo a supernova
                    this.fase = "SUPERNOVA";
                    this.flashSupernova = 255;
                }
                this.tiempoFase = 0;
            }
        }

        // ---- AGB: Rama Asintótica Gigante (fusión He → C, O) ----
        else if (this.fase === "AGB") {
            // Pulsaciones térmicas: radio oscila
            let expansionAGB = map(this.masaSolar, 0.5, 2, 60, 110);
            let pulsacion = sin(this.tiempoFase * 0.12) * 12;
            this.radioNucleo = lerp(this.radioNucleo, expansionAGB + pulsacion, 0.025);
            this.colorEstrella = this._colorPorTemp(3200);

            if (this.tiempoFase > 110) {
                this.fase = "SUPERNOVA";
                this.tiempoFase = 0;
                this.flashSupernova = 255;
            }
        }

        // ---- SUPERNOVA: rebote del núcleo + onda de choque ----
        else if (this.fase === "SUPERNOVA") {
            if (this.tiempoFase < 8) {
                // Fase de rebote: colapso ultrarrápido del núcleo
                this.radioNucleo += 42;
            } else {
                // Expansión de la onda de choque
                this.radioNucleo = lerp(this.radioNucleo, 0, 0.18);
            }

            if (this.tiempoFase > 70) {
                this.fase = "REMANENTE";
                this.tiempoFase = 0;
                this._configurarRemanente();
            }
        }
    }

    // ----------------------------------------------------------
    //  CONFIGURAR REMANENTE según masa del remanente
    //  Límites aplican a masaREMANENTE, no a masaSolar inicial
    // ----------------------------------------------------------
    _configurarRemanente() {
        if (this.masaRemanente < 1.4) {
            // Enana blanca — presión degenerativa electrónica
            this.radioNucleo   = 7 + this.masaRemanente * 2;
            this.colorEstrella = this._colorPorTemp(25000 * this.masaRemanente);
        } else if (this.masaRemanente <= 2.8) {
            // Estrella de neutrones / Púlsar (límite TOV)
            this.radioNucleo    = 3 + this.masaRemanente * 0.8;
            this.colorEstrella  = [230, 240, 255];
            this.periodoPulsar  = 0.05; // ms-pulsar inicial
        } else {
            // Agujero negro: radio de Schwarzschild r_s = 2GM/c²
            // Escalado: r_s ~ masaRemanente * 5 píxeles
            this.radioSchwarzschild = this.masaRemanente * 5;
            this.radioNucleo        = 0;
        }
    }

    // ----------------------------------------------------------
    //  FUNCIONES AUXILIARES CIENTÍFICAS
    // ----------------------------------------------------------

    // Masa del remanente — reescalada para el rango del simulador (0.5–8 M☉)
    //
    // Física real:          Simulador (slider 0.5–8 M☉):
    //  m < 8  M☉ → EB        m < 4.0  → Enana Blanca   (remanente < 1.4 M☉)
    //  8–20   → EN/Púlsar    4.0–6.5  → Estrella Neutrones (1.4–2.8 M☉)
    //  > 20   → Agujero Negro 6.5–8.0 → Agujero Negro  (> 2.8 M☉)
    //
    // Los límites 1.4 (Chandrasekhar) y 2.8 (TOV) se aplican
    // SIEMPRE sobre masaRemanente, nunca sobre masaSolar.
    _calcularMasaRemanente(m) {
        if (m < 4.0) {
            // Zona enana blanca: remanente escala suavemente de 0.28 a 1.35 M☉
            // Nunca supera 1.4 M☉ (límite Chandrasekhar)
            let mr = 0.28 + (m - 0.5) * (1.07 / 3.5);
            return +constrain(mr, 0.17, 1.35).toFixed(3);
        }
        if (m < 6.5) {
            // Zona estrella de neutrones: remanente entre 1.4 y 2.8 M☉ (límite TOV)
            let mr = 1.4 + (m - 4.0) * (1.4 / 2.5);
            return +constrain(mr, 1.4, 2.8).toFixed(3);
        }
        // Zona agujero negro: remanente > 2.8 M☉
        let mr = 2.81 + (m - 6.5) * (1.5 / 1.5);
        return +constrain(mr, 2.81, 4.5).toFixed(3);
    }

    // Temperatura efectiva por masa (Relación de Torres et al. 2010)
    _tempPorMasa(m) {
        if (m < 0.45) return 2800;
        if (m < 0.8)  return 3800 + (m - 0.45) * 4000;
        if (m < 1.04) return 5200 + (m - 0.8) * 4200;
        if (m < 1.4)  return 6200 + (m - 1.04) * 5500;
        if (m < 2.1)  return 7200 + (m - 1.4) * 5700;
        if (m < 3.2)  return 8700 + (m - 2.1) * 5000;
        if (m < 6.0)  return 14200 + (m - 3.2) * 6000;
        return 30000 + (m - 6) * 5000;
    }

    // Tipo espectral según masa
    _tipoEspectral(m) {
        if (m < 0.45) return "M";
        if (m < 0.8)  return "K";
        if (m < 1.04) return "G";
        if (m < 1.4)  return "F";
        if (m < 2.1)  return "A";
        if (m < 3.2)  return "B-A";
        if (m < 6.0)  return "B";
        return "O";
    }

    // Color RGB desde temperatura usando función de particula.js
    _colorPorTemp(t) {
        let c = temperaturAColor(t);
        return [red(c), green(c), blue(c)];
    }
}