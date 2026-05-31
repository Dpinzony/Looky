// ============================================================
//  SKETCH.JS — Renderizador principal
//  - Todas las fases nuevas: PROTO_ESTRELLA, SUBGIGANTE,
//    GIGANTE_ROJA, AGB, etc.
//  - Disco de acreción T ∝ r^(-3/4) para agujero negro
//  - Jets bipolares del púlsar con período real
//  - Nebulosa planetaria para enana blanca (fase AGB)
// ============================================================

let motorEstelar;
let ui;
let centro;
let estrellasFondo = [];
let tiempoGlobal   = 0;

function setup() {
    let canvas = createCanvas(980, 680);
    canvas.parent('canvas-container');
    centro = createVector(630, height / 2);

    // Generar campo de estrellas de fondo estático
    for (let i = 0; i < 320; i++) {
        estrellasFondo.push({
            x: random(265, width),
            y: random(height),
            tam: random(0.4, 1.8),
            brillo: random(60, 180),
            fase: random(TWO_PI)
        });
    }

    motorEstelar = new SistemaEstelar();
    ui           = new InterfazUsuario();
    ui.construirPanel(manejadorDisparoEstelar);
}

function draw() {
    tiempoGlobal++;
    background(8, 8, 16);

    // ---- Fondo: campo estelar con parpadeo ----
    blendMode(BLEND);
    noStroke();
    for (let s of estrellasFondo) {
        let b = s.brillo + sin(tiempoGlobal * 0.02 + s.fase) * 25;
        fill(200, 210, 255, b);
        ellipse(s.x, s.y, s.tam);
    }

    // ---- Panel izquierdo ----
    fill(14, 15, 26); rect(0, 0, 262, height);
    stroke(0, 195, 255, 35); strokeWeight(1); line(262, 0, 262, height); noStroke();

    // ---- Estela de movimiento en el área de simulación ----
    blendMode(BLEND);
    fill(8, 8, 16, 28); noStroke();
    rect(262, 0, width - 262, height);

    // ---- Lógica de física ----
    motorEstelar.actualizarLógica(centro);

    // ---- Telemetría del panel ----
    resetMatrix();
    ui.renderizarTelemetria(motorEstelar);

    // ---- Renderizado del espacio ----
    if (motorEstelar.simulando) {

        // Partículas con blend aditivo (luz)
        blendMode(ADD);
        let col = motorEstelar.colorEstrella;
        for (let p of motorEstelar.nebulosa) {
            p.display(motorEstelar.fase, color(col[0], col[1], col[2]));
        }

        // Cuerpo estelar central
        blendMode(BLEND);
        dibujarCuerpoEstelarCentral();

        // Efectos de fase especiales
        dibujarEfectosEspeciales();

    } else {
        // Estado de reposo: retícula de calibración
        blendMode(BLEND);
        stroke(0, 195, 255, 20); noFill();
        for (let r of [30, 90, 180]) ellipse(centro.x, centro.y, r * 2);
        stroke(0, 195, 255, 15);
        line(centro.x - 120, centro.y, centro.x + 120, centro.y);
        line(centro.x, centro.y - 120, centro.x, centro.y + 120);
        noStroke(); fill(0, 195, 255, 30);
        textSize(11); textAlign(CENTER);
        text("CONFIGURE Y PRESIONE INICIAR", centro.x, centro.y + 145);
        textAlign(LEFT);
    }
}

// ----------------------------------------------------------
//  Manejador del botón
// ----------------------------------------------------------
function manejadorDisparoEstelar() {
    let d = ui.obtenerValoresConfigurados();
    motorEstelar.iniciar(d.masa, d.radio, d.rotacion, centro);
}

// ----------------------------------------------------------
//  Renderizado del cuerpo estelar central por fase
// ----------------------------------------------------------
function dibujarCuerpoEstelarCentral() {
    let col  = motorEstelar.colorEstrella;
    let r    = motorEstelar.radioNucleo;
    let fase = motorEstelar.fase;

    if (fase === "NEBULA") return; // Solo partículas en esta fase

    if (fase === "REMANENTE") {
        let mr = motorEstelar.masaRemanente;

        if (mr > 2.8) {
            // ---- AGUJERO NEGRO + Disco de Acreción T ∝ r^(-3/4) ----
            dibujarAgujeroNegro();

        } else if (mr >= 1.4) {
            // ---- ESTRELLA DE NEUTRONES / PÚLSAR ----
            dibujarPulsar(col, r);

        } else {
            // ---- ENANA BLANCA + Nebulosa Planetaria ----
            dibujarEnanaBlanca(col, r);
        }

    } else if (fase === "SUPERNOVA") {
        // Destello central residual
        if (r > 2) {
            noStroke();
            for (let i = 5; i > 0; i--) {
                fill(255, 230, 180, 20 * i);
                ellipse(centro.x, centro.y, r * (1 + i * 0.35));
            }
        }

    } else if (fase === "AGB") {
        // AGB: estrella grande y pulsante con halo difuso
        noStroke();
        for (let i = 6; i > 0; i--) {
            let alfa = 18 / i;
            fill(col[0], col[1] * 0.5, col[2] * 0.3, alfa * 12);
            ellipse(centro.x, centro.y, r * (1 + i * 0.3));
        }
        fill(col[0], col[1], col[2]);
        ellipse(centro.x, centro.y, r);

    } else {
        // Fases normales: halo de corona + núcleo
        noStroke();
        // Corona: capas concéntricas de brillo decreciente
        for (let i = 6; i > 0; i--) {
            fill(col[0], col[1], col[2], 22 / i);
            ellipse(centro.x, centro.y, r * (1 + i * 0.22));
        }
        // Núcleo sólido
        fill(col[0], col[1], col[2]);
        ellipse(centro.x, centro.y, r);

        // Manchas solares para estrellas en secuencia principal (masa < 2)
        if (fase === "SECUENCIA_PRINCIPAL" && motorEstelar.masaSolar < 2.0) {
            dibujarManchasSolares(col, r);
        }
    }
}

// ----------------------------------------------------------
//  Disco de acreción: temperatura T ∝ r^(-3/4)
//  Color interno: blanco-azulado (~20000K)
//  Color externo: rojo-naranja (~3000K)
// ----------------------------------------------------------
function dibujarAgujeroNegro() {
    let rs = motorEstelar.radioSchwarzschild;

    // Disco de acreción: bandas anulares con color por temperatura
    let rMax = rs * 6.5;
    let pasos = 28;
    for (let i = pasos; i > 0; i--) {
        let r1 = rs + (rMax - rs) * (i / pasos);
        let t  = 20000 * pow(r1 / rs, -0.75); // T ∝ r^(-3/4)
        let c  = temperaturAColor(constrain(t, 1500, 25000));
        let alfa = map(i, 0, pasos, 180, 30);
        noStroke();
        fill(red(c), green(c), blue(c), alfa);
        // Disco elíptico (inclinación de ~30°)
        ellipse(centro.x, centro.y, r1 * 2, r1 * 0.55);
    }

    // Horizonte de eventos: negro absoluto
    fill(0);
    ellipse(centro.x, centro.y, rs * 2);

    // Fotosfera de luz doblada (einstein ring simplificado)
    noFill(); stroke(255, 200, 120, 80); strokeWeight(1.5);
    ellipse(centro.x, centro.y, rs * 2.5, rs * 2.5);
    noStroke();
}

// ----------------------------------------------------------
//  Púlsar: jets bipolares con período físico
// ----------------------------------------------------------
function dibujarPulsar(col, r) {
    let angulo = motorEstelar.anguloPulsarGiro;

    // Núcleo compacto
    noStroke(); fill(col[0], col[1], col[2]);
    ellipse(centro.x, centro.y, r * 2);

    // Halo de campo magnético
    noFill(); stroke(180, 210, 255, 40); strokeWeight(1);
    ellipse(centro.x, centro.y, r * 5, r * 5);
    noStroke();

    // Jets bipolares: conos en dirección del eje magnético
    push();
    translate(centro.x, centro.y);
    rotate(angulo);
    fill(160, 210, 255, 55);
    // Jet norte
    beginShape();
    vertex(-3, 0); vertex(3, 0);
    vertex(30, -280); vertex(-30, -280);
    endShape(CLOSE);
    // Jet sur
    beginShape();
    vertex(-3, 0); vertex(3, 0);
    vertex(30, 280); vertex(-30, 280);
    endShape(CLOSE);
    // Núcleo del jet (más brillante)
    fill(200, 230, 255, 90);
    beginShape();
    vertex(-1.5, 0); vertex(1.5, 0);
    vertex(8, -280); vertex(-8, -280);
    endShape(CLOSE);
    beginShape();
    vertex(-1.5, 0); vertex(1.5, 0);
    vertex(8, 280); vertex(-8, 280);
    endShape(CLOSE);
    pop();
}

// ----------------------------------------------------------
//  Enana Blanca + nebulosa planetaria (anillos difusos)
// ----------------------------------------------------------
function dibujarEnanaBlanca(col, r) {
    // Anillos de nebulosa planetaria
    let capas = [
        { rFactor: 5.0, alfa: 18, colMod: [0.5, 0.8, 1.5] },
        { rFactor: 3.5, alfa: 28, colMod: [0.7, 1.0, 1.2] },
        { rFactor: 2.2, alfa: 45, colMod: [1.0, 0.9, 1.0] }
    ];
    noStroke();
    for (let c of capas) {
        fill(col[0] * c.colMod[0], col[1] * c.colMod[1], col[2] * c.colMod[2], c.alfa);
        ellipse(centro.x, centro.y, r * c.rFactor * 2);
    }
    // Núcleo brillante
    fill(col[0], col[1], col[2]);
    ellipse(centro.x, centro.y, r * 2);
}

// ----------------------------------------------------------
//  Manchas solares en la superficie (para G/K/M en MS)
// ----------------------------------------------------------
function dibujarManchasSolares(col, r) {
    let seed = floor(frameCount / 180); // Cambian lentamente
    randomSeed(seed);
    for (let i = 0; i < 3; i++) {
        let ang = random(TWO_PI);
        let d   = random(r * 0.2, r * 0.42);
        let mx  = centro.x + cos(ang) * d;
        let my  = centro.y + sin(ang) * d;
        fill(col[0] * 0.55, col[1] * 0.45, col[2] * 0.35, 150);
        ellipse(mx, my, random(3, 7));
    }
    randomSeed(); // Restaurar aleatoriedad
}

// ----------------------------------------------------------
//  Efectos especiales por fase
// ----------------------------------------------------------
function dibujarEfectosEspeciales() {
    // Flash de supernova
    if (motorEstelar.flashSupernova > 0) {
        blendMode(ADD);
        fill(255, 220, 150, motorEstelar.flashSupernova * 0.6);
        rect(262, 0, width - 262, height);
        blendMode(BLEND);
    }

    // Halo de plasma para proto-estrella
    if (motorEstelar.fase === "PROTO_ESTRELLA") {
        blendMode(ADD);
        noStroke();
        let alfa = 20 + sin(tiempoGlobal * 0.1) * 10;
        fill(255, 140, 50, alfa);
        ellipse(centro.x, centro.y, motorEstelar.radioNucleo * 3.5);
        blendMode(BLEND);
    }
}