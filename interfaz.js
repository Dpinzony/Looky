// ============================================================
//  INTERFAZ.JS — Panel de telemetría científicamente correcto
//  - Muestra masa del remanente separada de la masa inicial
//  - Clasificación espectral OBAFGKM
//  - Luminosidad L ∝ M^3.5
//  - Temperatura superficial real
//  - Período del púlsar con frenado magnético
// ============================================================

class InterfazUsuario {
    constructor() {
        this.sliderMasa     = null;
        this.sliderRadio    = null;
        this.sliderRotacion = null;
        this.botonIniciar   = null;
    }

    construirPanel(callbackIniciar) {
        this.aplicarEstilosCSS();

        let titulo = createDiv('STELLAR SIMULATOR v3.0');
        titulo.position(15, 20).addClass('consola-titulo');

        let subtitulo = createDiv('SIMULADOR DE EVOLUCIÓN ESTELAR');
        subtitulo.position(15, 45).addClass('consola-subtitulo');

        createDiv('MASA INICIAL (M<sub>☉</sub>)').position(15, 82).addClass('label-control');
        this.sliderMasa = createSlider(0.5, 8.0, 1.0, 0.1).position(15, 100).addClass('custom-slider');

        createDiv('DIMENSIÓN DE LA NÉBULA (u)').position(15, 148).addClass('label-control');
        this.sliderRadio = createSlider(120, 300, 220, 10).position(15, 166).addClass('custom-slider');

        createDiv('MOMENTO ANGULAR (rad/s)').position(15, 214).addClass('label-control');
        this.sliderRotacion = createSlider(0.2, 2, 1.0, 0.1).position(15, 232).addClass('custom-slider');

        this.botonIniciar = createButton('⚡ INICIAR EVOLUCIÓN').position(15, 285).addClass('custom-button');
        this.botonIniciar.mousePressed(callbackIniciar);
    }

    obtenerValoresConfigurados() {
        return {
            masa:     this.sliderMasa.value(),
            radio:    this.sliderRadio.value(),
            rotacion: this.sliderRotacion.value()
        };
    }

    renderizarTelemetria(sistema) {
        let m = this.sliderMasa.value();

        // ---- Valores junto a sliders ----
        fill(0, 195, 255); noStroke(); textStyle(BOLD); textSize(11);
        text(m.toFixed(1) + " M☉", 198, 93);
        text(this.sliderRadio.value() + " u", 198, 159);
        text(this.sliderRotacion.value().toFixed(1) + " ω", 198, 225);

        // ---- Divisor ----
        stroke(255, 255, 255, 12); line(15, 355, 245, 355); noStroke();

        // ---- CLASIFICACIÓN ESTELAR PREDICTIVA ----
        fill(100, 120, 155); textSize(9); textStyle(NORMAL);
        text("CLASIFICACIÓN ESPECTRAL PREDICTIVA", 15, 378);

        // Tipo espectral + temperatura
        let tipo = this._tipoEspectral(m);
        let temp = this._tempPorMasa(m);
        let lum  = pow(m, 3.5);
        let mr   = this._calcularMasaRemanente(m);

        fill(26, 28, 44); rect(15, 385, 235, 62, 4);
        textSize(18); textStyle(BOLD);
        let colTipo = this._colorPorTipo(tipo);
        fill(colTipo[0], colTipo[1], colTipo[2]);
        text("Tipo " + tipo, 28, 407);

        textSize(10); textStyle(NORMAL); fill(160, 175, 200);
        text("T_ef = " + nf(temp, 0, 0) + " K", 28, 424);
        text("L = " + lum.toFixed(2) + " L☉   |   M_rem = " + mr.toFixed(2) + " M☉", 28, 440);

        // ---- DESTINO FINAL ----
        stroke(255, 255, 255, 12); line(15, 460, 245, 460); noStroke();
        fill(100, 120, 155); textSize(9);
        text("DESTINO DEL REMANENTE (límites aplicados a M_rem)", 15, 478);

        fill(26, 28, 44); rect(15, 484, 235, 30, 4);
        textSize(11); textStyle(BOLD);
        if (mr < 1.4) {
            fill(180, 220, 255);
            text("Enana Blanca  (< 1.4 M☉ Chandrasekhar)", 22, 504);
        } else if (mr <= 2.8) {
            fill(200, 230, 255);
            text("Estrella de Neutrones  (1.4–2.8 M☉ TOV)", 22, 504);
        } else {
            fill(255, 150, 80);
            text("Agujero Negro  (> 2.8 M☉ TOV)", 22, 504);
        }

        // ---- MONITOR DE FASE DINÁMICA ----
        stroke(255, 255, 255, 12); line(15, 530, 245, 530); noStroke();
        fill(100, 120, 155); textSize(9); textStyle(NORMAL);
        text("FASE ESTELAR ACTUAL", 15, 548);

        fill(26, 28, 44); rect(15, 553, 235, 48, 4);
        textSize(11);
        this.dibujarTextoFase(sistema.fase, sistema.masaRemanente);

        // ---- BARRA DE COMBUSTIBLE / INESTABILIDAD ----
        if (sistema.simulando && sistema.fase === "SECUENCIA_PRINCIPAL") {
            noStroke();
            fill(100, 120, 155); textSize(9);
            text("COMBUSTIBLE DE HIDRÓGENO RESTANTE", 15, 618);
            fill(35, 38, 58); rect(15, 625, 235, 7, 3);
            let pct = constrain(sistema.tiempoFase / sistema.limiteTiempoFase, 0, 1);
            fill(0, 195, 255); rect(15, 625, 235 * (1 - pct), 7, 3);
            fill(160); textSize(9);
            text(floor((1 - pct) * 100) + "% H restante", 15, 642);
        }

        // ---- PARÁMETROS DEL PÚLSAR EN TIEMPO REAL ----
        if (sistema.simulando && sistema.fase === "REMANENTE" &&
            sistema.masaRemanente >= 1.4 && sistema.masaRemanente <= 2.8) {
            noStroke();
            fill(100, 120, 155); textSize(9);
            text("PERÍODO DEL PÚLSAR (frenado magnético)", 15, 618);
            fill(150, 200, 255);
            textSize(12); textStyle(BOLD);
            text("P = " + sistema.periodoPulsar.toFixed(4) + " s", 15, 638);
            textSize(9); textStyle(NORMAL); fill(130, 150, 180);
            text("B = " + sistema.campoBMagnetico.toFixed(1) + " (normalizado)", 15, 652);
        }
    }

    dibujarTextoFase(fase, masaRemanente) {
        textStyle(BOLD); textSize(12);
        if (fase === "NEBULA") {
            fill(255, 170, 0); text("● Colapso Gravitacional", 25, 576);
            textSize(9); textStyle(NORMAL); fill(160); text("Fragmentación de nube molecular", 25, 591);
        } else if (fase === "PROTO_ESTRELLA") {
            fill(255, 130, 50); text("● Proto-estrella", 25, 576);
            textSize(9); textStyle(NORMAL); fill(160); text("Contracción Kelvin-Helmholtz", 25, 591);
        } else if (fase === "SECUENCIA_PRINCIPAL") {
            fill(0, 255, 150); text("● Secuencia Principal", 25, 576);
            textSize(9); textStyle(NORMAL); fill(160); text("Fusión H → He en el núcleo", 25, 591);
        } else if (fase === "SUBGIGANTE") {
            fill(200, 255, 100); text("● Subgigante", 25, 576);
            textSize(9); textStyle(NORMAL); fill(160); text("Agotamiento del H central", 25, 591);
        } else if (fase === "GIGANTE_ROJA") {
            fill(255, 100, 60); text("● Gigante Roja / RGB", 25, 576);
            textSize(9); textStyle(NORMAL); fill(160); text("Fusión He → C, O en el núcleo", 25, 591);
        } else if (fase === "AGB") {
            fill(255, 70, 130); text("● Rama AGB", 25, 576);
            textSize(9); textStyle(NORMAL); fill(160); text("Pulsaciones térmicas + viento estelar", 25, 591);
        } else if (fase === "SUPERNOVA") {
            fill(255, 255, 255); text("⚡ EVENTO SUPERNOVA", 25, 576);
            textSize(9); textStyle(NORMAL); fill(220); text("Rebote del núcleo + onda de choque", 25, 591);
        } else if (fase === "REMANENTE") {
            fill(150, 180, 255); textStyle(BOLD);
            if (masaRemanente < 1.4) {
                text("⚙ Enana Blanca", 25, 576);
                textSize(9); textStyle(NORMAL); fill(160); text("Presión degenerativa electrónica", 25, 591);
            } else if (masaRemanente <= 2.8) {
                text("🛸 Estrella de Neutrones / Púlsar", 25, 576);
                textSize(9); textStyle(NORMAL); fill(160); text("Presión degenerativa de neutrones", 25, 591);
            } else {
                fill(255, 140, 60); text("🕳 Agujero Negro", 25, 576);
                textSize(9); textStyle(NORMAL); fill(160); text("Singularidad espacio-temporal", 25, 591);
            }
        }
    }

    // ---- Helpers locales (espejo de sistemaEstelar para preview ----
    _tipoEspectral(m) {
        if (m < 0.45) return "M"; if (m < 0.8)  return "K";
        if (m < 1.04) return "G"; if (m < 1.4)  return "F";
        if (m < 2.1)  return "A"; if (m < 3.2)  return "B";
        return "O";
    }
    _tempPorMasa(m) {
        if (m < 0.45) return 2800; if (m < 0.8)  return floor(3800 + (m-0.45)*4000);
        if (m < 1.04) return floor(5200 + (m-0.8)*4200); if (m < 1.4) return floor(6200 + (m-1.04)*5500);
        if (m < 2.1)  return floor(7200 + (m-1.4)*5700); if (m < 3.2) return floor(8700 + (m-2.1)*5000);
        if (m < 6.0)  return floor(14200 + (m-3.2)*6000);
        return floor(30000 + (m-6)*5000);
    }
    _calcularMasaRemanente(m) {
        if (m < 4.0) {
            let mr = 0.28 + (m - 0.5) * (1.07 / 3.5);
            return +Math.min(Math.max(mr, 0.17), 1.35).toFixed(3);
        }
        if (m < 6.5) {
            let mr = 1.4 + (m - 4.0) * (1.4 / 2.5);
            return +Math.min(Math.max(mr, 1.4), 2.8).toFixed(3);
        }
        let mr = 2.81 + (m - 6.5) * (1.5 / 1.5);
        return +Math.min(Math.max(mr, 2.81), 4.5).toFixed(3);
    }
    _colorPorTipo(tipo) {
        const mapa = {
            "O": [130,180,255], "B": [160,200,255], "B-A": [200,220,255],
            "A": [220,235,255], "F": [255,250,220], "G": [255,240,180],
            "K": [255,200,120], "M": [255,130,80]
        };
        return mapa[tipo] || [255,255,255];
    }

    aplicarEstilosCSS() {
        let css = `
            @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Exo+2:wght@300;600&display=swap');
            body { font-family: 'Exo 2', sans-serif; background-color: #080810; margin: 0; }
            .consola-titulo { font-family: 'Share Tech Mono', monospace; font-size: 13px; font-weight: bold; color: #00c3ff; letter-spacing: 2px; text-shadow: 0 0 10px rgba(0,195,255,0.7); }
            .consola-subtitulo { font-family: 'Exo 2', sans-serif; font-size: 9px; color: #4a5a78; letter-spacing: 1px; }
            .label-control { font-family: 'Share Tech Mono', monospace; font-size: 9px; color: #6a7c98; letter-spacing: 0.8px; }
            .custom-slider { width: 225px !important; height: 4px; -webkit-appearance: none; background: linear-gradient(to right, #1a2035, #25263a); border-radius: 2px; outline: none; }
            .custom-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 13px; height: 13px; border-radius: 50%; background: radial-gradient(circle, #00e5ff, #0052d4); cursor: pointer; box-shadow: 0 0 8px rgba(0,195,255,0.9); transition: transform 0.1s; }
            .custom-slider::-webkit-slider-thumb:hover { transform: scale(1.25); }
            .custom-button { width: 235px; padding: 11px; background: linear-gradient(135deg, #003d99, #0066ff, #33aaff); border: 1px solid rgba(0,195,255,0.3); border-radius: 3px; color: white; font-family: 'Share Tech Mono', monospace; font-size: 11px; font-weight: bold; letter-spacing: 2px; cursor: pointer; box-shadow: 0 4px 18px rgba(0,100,255,0.4), inset 0 1px 0 rgba(255,255,255,0.1); transition: all 0.2s ease; }
            .custom-button:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,195,255,0.6); filter: brightness(1.15); }
            .custom-button:active { transform: translateY(0px); }
        `;
        let styleEl = createElement('style');
        styleEl.html(css);
    }
}