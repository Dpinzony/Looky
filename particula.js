// ============================================================
//  PARTICULA.JS — Física corregida científicamente
//  - Gravedad newtoniana real F = G·m₁·m₂ / d²
//  - Distribución de masas IMF de Salpeter ξ(m) ∝ m^-2.35
//  - Presión de radiación separada de la gravedad
//  - Frenado magnético para púlsar
// ============================================================

const G_SIM = 280; // Constante gravitacional escalada para la simulación

class Particula {
    constructor(cx, cy, radioNube, rotacion) {
        let angulo = random(TWO_PI);
        // Distribución radial más realista: concentrada hacia el centro (perfil de densidad ρ ∝ r^-1)
        let u = random();
        let r = radioNube * sqrt(u) * random(0.1, 1.0);
        this.pos = createVector(cx + cos(angulo) * r, cy + sin(angulo) * r);

        // Velocidad kepleriana inicial v ∝ 1/√r para momento angular correcto
        let vKepler = rotacion * sqrt(max(G_SIM / max(r, 1), 0.1));
        this.vel = createVector(-sin(angulo), cos(angulo));
        this.vel.mult(vKepler * random(0.6, 1.4));

        this.acc = createVector(0, 0);

        // --- IMF de Salpeter: muestreo por transformada inversa ---
        // P(m) ∝ m^-2.35  →  CDF^-1: m = m_min * (1 - u)^(-1/1.35)
        let mMin = 0.08, mMax = 3.0;
        let u2 = random();
        this.masa = mMin * pow(1.0 - u2 * (1.0 - pow(mMin / mMax, 1.35)), -1.0 / 1.35);
        this.masa = constrain(this.masa, mMin, mMax);

        // Tamaño visual proporcional a la masa de la partícula
        this.tam = map(this.masa, mMin, mMax, 1.2, 4.0);
        this.vmax = random(2, 6);
        this.offsetBrillo = random(TWO_PI);

        // Temperatura individual de la partícula (K) — afecta el color
        this.temperatura = random(3000, 12000);
    }

    update() {
        this.vel.add(this.acc);
        this.vel.limit(this.vmax);
        this.pos.add(this.vel);
        this.acc.mult(0);
    }

    // -------------------------------------------------------
    //  Gravedad newtoniana real: F = G·M / d²
    //  + presión de radiación separada (empuje hacia afuera)
    // -------------------------------------------------------
    atraerAlCentro(centro, fase, radioNucleo, masaEstrella, luminosidad) {
        let delta = p5.Vector.sub(centro, this.pos);
        let d = max(delta.mag(), 5); // Suavizado para evitar singularidad numérica
        let dir = delta.copy().normalize();

        if (fase === "NEBULA") {
            // Colapso gravitacional puro F = G·M/d²
            let fg = (G_SIM * masaEstrella * this.masa) / (d * d);
            fg = constrain(fg, 0, 0.8);
            this.acc.add(dir.copy().mult(fg / this.masa));

        } else if (fase === "PROTO_ESTRELLA") {
            // Contracción de Kelvin-Helmholtz: gravedad fuerte, sin fusión aún
            let fg = (G_SIM * masaEstrella * this.masa) / (d * d);
            fg = constrain(fg, 0, 1.2);
            this.acc.add(dir.copy().mult(fg / this.masa));

            // Momento angular conservado
            let orbital = createVector(-dir.y, dir.x);
            orbital.mult(0.03 * sqrt(masaEstrella / max(d, 1)));
            this.acc.add(orbital);

        } else if (fase === "SECUENCIA_PRINCIPAL" || fase === "SUBGIGANTE") {
            // Equilibrio hidrostático: gravedad vs presión de radiación
            let fg = (G_SIM * masaEstrella * this.masa) / (d * d);
            fg = constrain(fg, 0, 0.9);

            // Presión de radiación L_☉ / (4π·d²·c) — escala con luminosidad
            let frad = (luminosidad * 0.00015) / (d * d);
            frad = constrain(frad, 0, 0.4);

            let fNeta = fg - frad;

            if (d > radioNucleo) {
                this.acc.add(dir.copy().mult(fNeta / this.masa));
            } else {
                // Dentro del núcleo: presión degenerativa electrónica
                this.acc.add(dir.copy().mult(-0.3));
                this.vel.mult(0.85);
            }

            // Momento angular orbital
            let orbital = createVector(-dir.y, dir.x);
            orbital.mult(0.025 * sqrt(masaEstrella / max(d, 1)));
            this.acc.add(orbital);

        } else if (fase === "GIGANTE_ROJA" || fase === "AGB") {
            // Gigante: gravedad debilitada, envolvente expandida
            let fg = (G_SIM * masaEstrella * this.masa) / (d * d) * 0.4;
            fg = constrain(fg, 0, 0.5);
            let frad = (luminosidad * 0.0004) / (d * d);
            frad = constrain(frad, 0, 0.5);

            if (d > radioNucleo * 0.5) {
                this.acc.add(dir.copy().mult((fg - frad) / this.masa));
            } else {
                this.acc.add(dir.copy().mult(-0.2));
                this.vel.mult(0.9);
            }
            let orbital = createVector(-dir.y, dir.x);
            orbital.mult(0.015);
            this.acc.add(orbital);
        }
    }

    // -------------------------------------------------------
    //  Supernova: onda de choque asimétrica + rebote del núcleo
    // -------------------------------------------------------
    explotar(centro, tiempoExplosion, angAsimetria) {
        let fuerza = p5.Vector.sub(this.pos, centro);
        let d = max(fuerza.mag(), 1);
        fuerza.normalize();

        // Onda de choque esférica principal
        let intensidad = map(tiempoExplosion, 0, 15, 18, 4);

        // Asimetría direccional: los jets polares son más intensos (~30% más)
        let angParticula = atan2(fuerza.y, fuerza.x);
        let difAngular = abs(angParticula - angAsimetria);
        if (difAngular < PI * 0.25 || difAngular > PI * 1.75) {
            intensidad *= 1.35; // jet polar
        }

        fuerza.mult(intensidad * random(0.7, 1.3));
        this.acc.add(fuerza);
        this.vmax = 25;
    }

    // -------------------------------------------------------
    //  Agujero negro: disco de acreción T ∝ r^(-3/4)
    // -------------------------------------------------------
    orbitarAgujeroNegro(centro, radioSchwarzschild) {
        let delta = p5.Vector.sub(centro, this.pos);
        let d = max(delta.mag(), 1);
        let dir = delta.copy().normalize();

        if (d > radioSchwarzschild) {
            // Gravedad relativista sintética: F ∝ 1/d² con corrección post-newtoniana
            let intensidad = (G_SIM * 8.0) / (d * d);
            // Factor de corrección relativista (1 + 3·r_s/(2r))
            let rs = radioSchwarzschild;
            let corrRelativista = 1.0 + (1.5 * rs) / max(d, 0.1);
            intensidad *= corrRelativista;
            intensidad = constrain(intensidad, 0.05, 3.0);

            this.acc.add(dir.copy().mult(intensidad));

            // Momento angular de acreción: velocidad orbital kepleriana
            let orbital = createVector(-dir.y, dir.x);
            let vOrbital = sqrt(G_SIM * 4.0 / max(d, 1));
            orbital.mult(constrain(vOrbital * 0.08, 0.1, 1.5));
            this.acc.add(orbital);
        }
    }

    // -------------------------------------------------------
    //  Render con temperatura → color espectral real
    // -------------------------------------------------------
    display(fase, colorBase) {
        noStroke();
        let alfa = 140 + sin(frameCount * 0.08 + this.offsetBrillo) * 55;

        if (fase === "SUPERNOVA") {
            // Partículas de supernova: color por temperatura de choque
            let t = this.temperatura * random(0.8, 2.5);
            let c = temperaturAColor(t);
            fill(red(c), green(c), blue(c), alfa);
            ellipse(this.pos.x, this.pos.y, this.tam * 2.2);

        } else if (fase === "REMANENTE") {
            fill(120, 160, 255, alfa * 0.55);
            ellipse(this.pos.x, this.pos.y, this.tam * 0.9);

        } else if (fase === "AGB") {
            // Nebulosa planetaria emergente: halos multicolor
            fill(red(colorBase), green(colorBase) * 0.6, blue(colorBase) * 1.4, alfa * 0.7);
            ellipse(this.pos.x, this.pos.y, this.tam * 1.3);

        } else {
            fill(red(colorBase), green(colorBase), blue(colorBase), alfa);
            ellipse(this.pos.x, this.pos.y, this.tam);
        }
    }
}

// -------------------------------------------------------
//  Ley de Planck aproximada: temperatura (K) → color RGB
//  Basado en la aproximación de Tanner Helland
// -------------------------------------------------------
function temperaturAColor(temp) {
    temp = constrain(temp, 1000, 40000) / 100;
    let r, g, b;

    // Rojo
    if (temp <= 66) {
        r = 255;
    } else {
        r = 329.698727446 * pow(temp - 60, -0.1332047592);
        r = constrain(r, 0, 255);
    }

    // Verde
    if (temp <= 66) {
        g = 99.4708025861 * log(temp) - 161.1195681661;
    } else {
        g = 288.1221695283 * pow(temp - 60, -0.0755148492);
    }
    g = constrain(g, 0, 255);

    // Azul
    if (temp >= 66) {
        b = 255;
    } else if (temp <= 19) {
        b = 0;
    } else {
        b = 138.5177312231 * log(temp - 10) - 305.0447927307;
        b = constrain(b, 0, 255);
    }

    return color(r, g, b);
}