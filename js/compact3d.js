/**
 * compact3d.js
 * ─────────────────────────────────────────────
 * Visualización 3D interactiva en WEBGL para
 * cadáveres estelares (Enana Blanca, Estrella de
 * Neutrones, Agujero Negro) y sus fenómenos físicos.
 * ─────────────────────────────────────────────
 */

function initSketch3D(containerEl) {
  window._p5Sketch3D = new p5(function(p) {

    // ── Variables de Estado Físico ─────────────
    let remnantMass = 1.40; // M_sun
    let remnantType = 'white_dwarf'; // 'white_dwarf' | 'neutron_star' | 'black_hole'
    
    // Controles e interacción
    let angleY = 0;
    let autoRotate = true;

    // Sonda para Espaguetización
    let probe = null;
    let probeStatusText = "Sonda lista.";

    // Supernova 3D
    let supernovaParticles = [];
    let supernovaActive = false;
    let supernovaTime = 0;
    let supernovaType = 'core_collapse'; // 'type_ia' | 'core_collapse'

    // Estrella compañera binaria
    let binaryOrbitAngle = 0;
    
    // Dimensiones del lienzo
    let W, H;

    // Parámetros visuales GR (modo avanzado de lente)
    const GR = {
      spinA: 0.78,               // parámetro adimensional de Kerr (0..0.998)
      lensingStrength: 1.0,
      redshiftStrength: 0.9,
      gridExtent: 560,
      gridStep: 28,
      gridWarpStrength: 0.62,
      maxLensedStars: 140,
    };

    /* ──────────────────────────────────────────
       SETUP
       ────────────────────────────────────────── */
    p.setup = function() {
      W = containerEl.offsetWidth || (containerEl.parentElement ? containerEl.parentElement.offsetWidth : 800);
      H = containerEl.offsetHeight || (containerEl.parentElement ? containerEl.parentElement.offsetHeight : 600);
      if (W <= 0) W = 800;
      if (H <= 0) H = 600;
      
      const cnv = p.createCanvas(W, H, p.WEBGL);
      cnv.parent(containerEl);
      
      p.colorMode(p.RGB, 255);
      p.noStroke();
    };

    p.windowResized = function() {
      let wVal = containerEl.offsetWidth || (containerEl.parentElement ? containerEl.parentElement.offsetWidth : 800);
      let hVal = containerEl.offsetHeight || (containerEl.parentElement ? containerEl.parentElement.offsetHeight : 600);
      if (wVal > 0 && hVal > 0) {
        W = wVal;
        H = hVal;
        p.resizeCanvas(W, H);
      }
    };

    // Permite forzar el rediseño desde afuera
    p.triggerResize = function() {
      p.windowResized();
    };

    /* ──────────────────────────────────────────
       API PÚBLICA PARA ACTUALIZAR ESTADO
       ────────────────────────────────────────── */
    p.setRemnantMass = function(mass) {
      remnantMass = mass;
      
      // Selección automática según la masa del núcleo / remanente
      if (remnantMass < 1.4) {
        remnantType = 'white_dwarf';
      } else if (remnantMass < 3.0) {
        remnantType = 'neutron_star';
      } else {
        remnantType = 'black_hole';
      }
      
      // Si la enana blanca supera el límite de Chandrasekhar de forma interactiva
      if (remnantType === 'white_dwarf' && remnantMass >= 1.39) {
        // Colapsa automáticamente o estalla
        remnantType = 'neutron_star';
        remnantMass = 1.40;
        
        const remSlider = document.getElementById('remMassSlider');
        if (remSlider) remSlider.value = 1.40;
        const remVal = document.getElementById('remMassVal');
        if (remVal) remVal.textContent = "1.40";
        const remType = document.getElementById('remTypeVal');
        if (remType) remType.textContent = "Estrella de Neutrones";
        
        // Trigger de Supernova tipo Ia de advertencia
        p.triggerSupernova('type_ia');
        updateStatus("¡Límite de Chandrasekhar cruzado! La Enana Blanca colapsa/estalla.");
      }
    };

    p.launchProbe = function() {
      // Inicializar sonda a una distancia segura
      probe = {
        pos: p.createVector(0, -280, 0), // Empezar en órbita alta (Y vertical)
        vel: p.createVector(0, 1.8, 0),   // Cae hacia el centro (gravedad)
        trail: [],
        status: 'active',
        stretch: 1.0,
        compress: 1.0
      };
      updateStatus("Sonda lanzada en trayectoria de caída libre.");
    };

    p.triggerSupernova = function(type) {
      supernovaActive = true;
      supernovaTime = 0;
      supernovaParticles = [];
      supernovaType = type || (remnantType === 'white_dwarf' ? 'type_ia' : 'core_collapse');
      
      // Limpiar partículas previas
      const count = supernovaType === 'type_ia' ? 400 : 500;
      
      for (let i = 0; i < count; i++) {
        let vx, vy, vz;
        let pColor;
        let size = p.random(3, 8);
        let decay = p.random(0.005, 0.015);
        let speed = p.random(1.5, 6.0);

        if (supernovaType === 'type_ia') {
          // Explosión termonuclear simétrica (Enana blanca se desintegra)
          // Geometría esférica uniforme
          const theta = p.random(p.TWO_PI);
          const phi = p.acos(p.random(-1, 1));
          vx = speed * p.sin(phi) * p.cos(theta);
          vy = speed * p.sin(phi) * p.sin(theta);
          vz = speed * p.cos(phi);
          
          pColor = { r: 255, g: p.random(180, 255), b: p.random(200, 255) }; // Muy caliente y brillante
        } else {
          // Colapso de Núcleo (Estrella de Neutrones / Agujero Negro)
          // Geometría "Bagel & Breadstick": Toro ecuatorial + Chorros polares
          if (p.random() < 0.65) {
            // "Bagel" - Toro en el plano ecuatorial (XZ)
            const angle = p.random(p.TWO_PI);
            const rSpeed = speed * p.random(0.8, 1.4);
            vx = rSpeed * p.cos(angle);
            vy = p.random(-0.3, 0.3) * speed; // Aplanado en el eje Y
            vz = rSpeed * p.sin(angle);
            pColor = { r: 255, g: p.random(80, 160), b: 30 }; // Naranja/rojo de polvo interestelar
          } else {
            // "Breadstick" - Chorros polares de alta velocidad a lo largo del eje rotacional Y
            const direction = p.random() > 0.5 ? 1 : -1;
            const jetSpeed = speed * p.random(2.0, 3.5);
            vx = p.random(-0.15, 0.15) * speed;
            vy = direction * jetSpeed;
            vz = p.random(-0.15, 0.15) * speed;
            pColor = { r: 80, g: p.random(160, 255), b: 255 }; // Azul/blanco de alta energía
          }
        }

        supernovaParticles.push({
          pos: p.createVector(0, 0, 0),
          vel: p.createVector(vx, vy, vz),
          c: pColor,
          size: size,
          life: 1.0,
          decay: decay
        });
      }
      
      updateStatus(supernovaType === 'type_ia' ? 
        "¡Supernova Tipo Ia! Desintegración termonuclear completa." : 
        "¡Supernova por Colapso de Núcleo! Geometría Bagel & Breadstick.");
    };

    function updateStatus(txt) {
      probeStatusText = txt;
      const el = document.getElementById('probeStatus');
      if (el) el.textContent = txt;
    }

    /* ──────────────────────────────────────────
       DRAW
       ────────────────────────────────────────── */
    p.draw = function() {
      p.background(1, 4, 8);
      
      // Control de cámara
      p.orbitControl(1.5, 1.5, 0.1);
      
      // Luces
      p.ambientLight(20, 25, 35);
      p.pointLight(255, 255, 255, 0, 0, 0); // Luz central de radiación
      
      // Rotación global automática si no se está arrastrando el ratón
      if (autoRotate && !p.mouseIsPressed) {
        angleY += 0.003;
      }
      p.rotateY(angleY);

      // Leer toggles del DOM defensivamente
      const checkBinaryEl = document.getElementById('checkBinary');
      const checkCrossSectionEl = document.getElementById('checkCrossSection');
      const checkLensingEl = document.getElementById('checkLensing');

      const binaryEnabled = checkBinaryEl ? checkBinaryEl.checked : true;
      const crossSection = checkCrossSectionEl ? checkCrossSectionEl.checked : false;
      const lensing = checkLensingEl ? checkLensingEl.checked : true;

      const rsForLensing = remnantType === 'black_hole' ? 12 * remnantMass : 0;

      // Cuadrícula de espacio-tiempo deformada alrededor del BH
      if (rsForLensing > 0) {
        _drawWarpedGrid(rsForLensing);
      }

      // Dibujar estrellas lejanas de fondo en 3D (con lente simplificada si aplica)
      _draw3DBGStars(lensing && rsForLensing > 0, rsForLensing);

      // ── Renderizar Sistema Binario si está activo ──
      if (binaryEnabled && remnantType !== 'white_dwarf') {
        binaryOrbitAngle += 0.008;
        _drawBinaryCompanion();
      }

      // ── Renderizar la Supernova si está activa ──
      if (supernovaActive) {
        _drawSupernovaRemnant();
      }

      // ── Renderizar Objeto Compacto Central ──
      // Si la supernova acaba de ocurrir, retrasamos o suavizamos el remanente central
      let showRemnant = true;
      if (supernovaActive && supernovaType === 'type_ia') {
        showRemnant = false; // La supernova Tipo Ia destruye la estrella por completo
      } else if (supernovaActive && supernovaTime < 40) {
        showRemnant = false; // Ocultar el remanente en el primer fogonazo
      }

      if (showRemnant) {
        p.push();
        if (remnantType === 'white_dwarf') {
          _drawWhiteDwarf();
        } else if (remnantType === 'neutron_star') {
          _drawNeutronStar(crossSection);
        } else if (remnantType === 'black_hole') {
          _drawBlackHole(lensing);
        }
        p.pop();
      }

      // ── Renderizar Sonda de Prueba y Espaguetización ──
      if (probe) {
        _drawProbe();
      }
    };

    /* ──────────────────────────────────────────
       ESTRELLAS DE FONDO 3D
       ────────────────────────────────────────── */
    let bgStars3D = null;
    function _draw3DBGStars(applyLensing = false, rsRadius = 0) {
      if (!bgStars3D) {
        bgStars3D = [];
        for (let i = 0; i < 200; i++) {
          const theta = p.random(p.TWO_PI);
          const phi = p.acos(p.random(-1, 1));
          const r = 800; // Radio esfera de fondo
          bgStars3D.push({
            pos: p.createVector(
              r * p.sin(phi) * p.cos(theta),
              r * p.sin(phi) * p.sin(theta),
              r * p.cos(phi)
            ),
            tw: p.random(0.7, 1.3),
          });
        }
      }
      
      p.push();
      p.strokeWeight(1.2);
      const einsteinR = rsRadius * 2.7;
      let lensedCount = 0;

      for (let s of bgStars3D) {
        let x = s.pos.x;
        let y = s.pos.y;
        let z = s.pos.z;

        // "Ray tracing" simplificado: deflexión angular dependiente de b
        if (applyLensing && lensedCount < GR.maxLensedStars) {
          const b = Math.sqrt(x * x + z * z);
          if (b > rsRadius * 1.08 && b < rsRadius * 18) {
            const alpha = GR.lensingStrength * (2 * rsRadius) / Math.max(b, 1);
            const tx = -z / b;
            const tz = x / b;
            const bendScale = p.constrain(alpha * 48, 0, 42);
            x += tx * bendScale;
            z += tz * bendScale;

            const ringBoost = Math.max(0, 1 - Math.abs(b - einsteinR) / (rsRadius * 1.2));
            const redshift = _gravitationalRedshiftFactor(Math.max(b, rsRadius * 1.02), rsRadius);
            const c = _applyRelativisticColor(180, 200, 255, redshift, 1 + ringBoost * 0.35);
            p.stroke(c.r, c.g, c.b, 120 + ringBoost * 90);
            p.strokeWeight(1.2 + ringBoost * 1.2);
            lensedCount++;
          } else {
            const twinkle = 0.65 + 0.35 * Math.sin(p.frameCount * 0.02 * s.tw);
            p.stroke(180 * twinkle, 200 * twinkle, 255 * twinkle, 120);
            p.strokeWeight(1.1);
          }
        } else {
          const twinkle = 0.65 + 0.35 * Math.sin(p.frameCount * 0.02 * s.tw);
          p.stroke(180 * twinkle, 200 * twinkle, 255 * twinkle, 120);
          p.strokeWeight(1.1);
        }

        p.point(x, y, z);
      }
      p.pop();
    }

    function _warpHeight(x, z, rsRadius) {
      const r = Math.sqrt(x * x + z * z);
      if (r < rsRadius * 1.05) return -120;

      const eps = 5;
      const invPotential = rsRadius / Math.max(r - rsRadius, eps);
      const falloff = Math.exp(-r / 320);
      const frameDrag = 1 + 0.22 * GR.spinA * Math.sin(Math.atan2(z, x) * 2 + p.frameCount * 0.01);
      const y = -GR.gridWarpStrength * invPotential * falloff * 160 * frameDrag;
      return p.constrain(y, -135, 0);
    }

    function _drawWarpedGrid(rsRadius) {
      const extent = GR.gridExtent;
      const step = GR.gridStep;

      p.push();
      p.noFill();
      p.strokeWeight(0.8);

      for (let x = -extent; x <= extent; x += step) {
        p.stroke(45, 90, 130, 75);
        p.beginShape();
        for (let z = -extent; z <= extent; z += step) {
          p.vertex(x, _warpHeight(x, z, rsRadius), z);
        }
        p.endShape();
      }

      for (let z = -extent; z <= extent; z += step) {
        p.stroke(45, 90, 130, 65);
        p.beginShape();
        for (let x = -extent; x <= extent; x += step) {
          p.vertex(x, _warpHeight(x, z, rsRadius), z);
        }
        p.endShape();
      }

      p.pop();
    }

    function _gravitationalRedshiftFactor(r, rsRadius) {
      if (rsRadius <= 0) return 1;
      if (r <= rsRadius * 1.02) return 0.18;
      const metricTerm = 1 - (rsRadius / r);
      if (metricTerm <= 0) return 0.18;
      const g = Math.sqrt(metricTerm);
      return p.constrain(p.lerp(1, g, GR.redshiftStrength), 0.12, 1.0);
    }

    function _applyRelativisticColor(r, g, b, gravFactor, doppler = 1) {
      const k = p.constrain(gravFactor * doppler, 0.08, 2.2);
      const redBias = Math.max(0, 1 - k);
      return {
        r: p.constrain(r * (1 + redBias * 0.55), 0, 255),
        g: p.constrain(g * k, 0, 255),
        b: p.constrain(b * k * k, 0, 255),
      };
    }

    /* ──────────────────────────────────────────
       SISTEMA BINARIO ( push / pop )
       ────────────────────────────────────────── */
    function _drawBinaryCompanion() {
      const orbitRadius = 240;
      const compX = orbitRadius * p.cos(binaryOrbitAngle);
      const compZ = orbitRadius * p.sin(binaryOrbitAngle);
      
      // Dibujar estrella compañera (Gigante Roja de baja densidad)
      p.push();
      p.translate(compX, 0, compZ);
      p.ambientMaterial(235, 80, 40);
      // Luz emisiva rojiza
      p.directionalLight(255, 100, 50, -compX, 0, -compZ);
      p.sphere(28); // Estrella compañera gigante
      p.pop();

      // Flujo de transferencia de masa (gas atraído hacia el disco)
      p.push();
      p.stroke(255, 120, 50, 110);
      p.strokeWeight(2.0);
      
      // Dibujar filamentos del chorro de gas
      for (let i = 0; i <= 10; i++) {
        let t = i / 10;
        // Trayectoria curva (espiral de acreción)
        let ang = binaryOrbitAngle + t * p.PI * 1.5;
        let r = p.lerp(orbitRadius - 28, 50, t);
        let gx = r * p.cos(ang);
        let gz = r * p.sin(ang);
        let gy = p.sin(t * p.PI) * 15; // Un poco de altura
        
        p.push();
        p.translate(gx, gy, gz);
        p.ambientMaterial(255, 140, 50, 180);
        p.sphere(2 - t * 1.2);
        p.pop();
      }
      p.pop();
    }

    /* ──────────────────────────────────────────
       SUPERNOVA REMNANT 3D
       ────────────────────────────────────────── */
    function _drawSupernovaRemnant() {
      supernovaTime++;
      let allDead = true;

      p.push();
      for (let pt of supernovaParticles) {
        if (pt.life > 0) {
          allDead = false;
          // Actualización de posición: velocidad asimétrica
          // Simula resistencia del CSM (frenado gradual en miles de años)
          let csmDrag = p.lerp(1.0, 0.965, Math.min(supernovaTime / 200, 1));
          pt.pos.add(p5.Vector.mult(pt.vel, csmDrag));
          pt.life -= pt.decay;

          p.push();
          p.translate(pt.pos.x, pt.pos.y, pt.pos.z);
          
          let alpha = pt.life * 230;
          p.ambientMaterial(pt.c.r, pt.c.g, pt.c.b, alpha);
          p.sphere(pt.size * pt.life);
          p.pop();
        }
      }
      p.pop();

      if (allDead) {
        supernovaActive = false;
        updateStatus("Remanente expandido en el medio interestelar (CSM).");
      }
    }

    /* ──────────────────────────────────────────
       ENANA BLANCA (M < 1.4 M☉)
       ────────────────────────────────────────── */
    function _drawWhiteDwarf() {
      // Radio inversamente proporcional a la masa (Nauenberg)
      const r_wd = 22 * p.pow(1.0 - remnantMass/1.44, 0.25) / p.pow(remnantMass, 0.33);
      const radius = p.constrain(r_wd, 8, 30);

      // Núcleo de degeneración azul-blanco brillante
      p.ambientMaterial(220, 240, 255);
      p.emissiveMaterial(180, 210, 255);
      p.sphere(radius);

      // Halo de brillo exterior multicapa
      p.push();
      for (let i = 1; i <= 3; i++) {
        p.ambientMaterial(120, 160, 255, 15 - i * 4);
        p.sphere(radius + i * 4);
      }
      p.pop();
    }

    function rotateVectorZ(v, angle) {
      const cosA = p.cos(angle);
      const sinA = p.sin(angle);
      return p.createVector(
        v.x * cosA - v.y * sinA,
        v.x * sinA + v.y * cosA,
        v.z
      );
    }

    function rotateVectorY(v, angle) {
      const cosA = p.cos(angle);
      const sinA = p.sin(angle);
      return p.createVector(
        v.x * cosA + v.z * sinA,
        v.y,
        -v.x * sinA + v.z * cosA
      );
    }

    /* ──────────────────────────────────────────
       ESTRELLA DE NEUTRONES (Pulsar)
       ────────────────────────────────────────── */
    function _drawNeutronStar(crossSection) {
      // Radio de la estrella de neutrones (compacta, unos 12-14 km físicos)
      const r_ns = 13 * (1.0 + 0.15 / remnantMass);
      
      // Conservación del momento angular: I1 * w1 = I2 * w2. 
      // Spin speed inversamente proporcional al cuadrado del radio
      const spinSpeed = 0.05 * (20 / r_ns) * (20 / r_ns);
      const rotAngle = p.frameCount * spinSpeed;

      // ── Vista de Corte (Estructura TOV) ──
      if (crossSection) {
        p.rotateY(rotAngle);
        
        // Densidad central simulada (TOV) dependiente de la masa
        // Límite de goteo de neutrones (neutron drip) a 4x10^11 g/cm^3
        const rho_c = 1.2e12 * remnantMass;
        const dripRatio = p.sqrt(p.max(0, 1 - 4.0e11 / rho_c));
        const r_drip = r_ns * dripRatio;

        // Dibujar hemisferio trasero (superficie externa de la corteza)
        p.push();
        p.ambientMaterial(100, 100, 110, 100); // Semitransparente
        p.sphere(r_ns);
        p.pop();

        // Dibujar núcleo superfluido interno (Corteza interna superando el neutron drip)
        p.push();
        p.ambientMaterial(140, 80, 255, 230); // Morado brillante
        p.emissiveMaterial(80, 20, 180);
        p.sphere(r_drip);
        p.pop();

        // Anillo de indicación del límite de goteo de neutrones (Corteza Sólida exterior)
        p.push();
        p.rotateX(p.HALF_PI);
        p.stroke(255, 80, 80, 200);
        p.strokeWeight(1.5);
        p.noFill();
        p.ellipse(0, 0, r_ns * 2, r_ns * 2);
        p.ellipse(0, 0, r_drip * 2, r_drip * 2);
        p.noStroke();
        p.pop();
        
      } else {
        // Renderizado normal: Esfera ultra densa magnetizada
        p.rotateY(rotAngle);
        p.ambientMaterial(200, 200, 255);
        p.emissiveMaterial(120, 120, 240);
        p.sphere(r_ns);
        
        // Dibujar patrones de líneas de campo magnético texturizados geométricamente
        p.push();
        p.stroke(150, 100, 255, 60);
        p.strokeWeight(1.0);
        p.noFill();
        for (let i = 0; i < 4; i++) {
          p.rotateY(p.PI / 4);
          p.ellipse(0, 0, r_ns * 2.8, r_ns * 1.5);
        }
        p.noStroke();
        p.pop();
      }

      // ── Haz de Faro del Pulsar (Efecto Faro & Relativistic Beaming) ──
      // Eje magnético inclinado respecto al eje rotacional Y
      p.push();
      p.rotateZ(0.35); // Inclinación magnética (aproximadamente 20 grados)
      p.rotateY(rotAngle); // Sincronizado con la rotación física

      // Vector de dirección del haz norte (en coordenadas locales rotadas)
      // En WebGL, el haz apunta en el eje Y local
      let beamDir = p.createVector(0, 1, 0);
      // Aplicar las mismas rotaciones que el haz para proyectarlo y calcular beaming
      beamDir = rotateVectorZ(beamDir, 0.35);
      beamDir = rotateVectorY(beamDir, rotAngle);
      // Rotar también según el ángulo orbital de la cámara (angleY de la escena global)
      beamDir = rotateVectorY(beamDir, angleY);

      // Relativistic Beaming (Modulación de intensidad por ángulo de visión)
      // Dirección hacia la cámara aproximada (eje Z positivo/negativo)
      // El Doppler boosting factor depende del coseno del ángulo respecto al observador
      let cosTheta = beamDir.z; // Dirección hacia la cámara
      let beta = 0.85; // Velocidad relativista de los chorros (~85% de c)
      let gamma = 1.0 / p.sqrt(1.0 - beta * beta);
      // Factor de beaming: delta = 1 / (gamma * (1 - beta * cosTheta))
      let delta = 1.0 / (gamma * (1.0 - beta * cosTheta));
      let intensityFactor = p.constrain(p.pow(delta, 2.5), 0.05, 5.0);

      // Colores de Radiación de Sincrotrón (azul brillante/blanco)
      let jetAlpha = p.constrain(75 * intensityFactor, 10, 255);
      
      // Dibujar chorro superior (Norte)
      p.push();
      p.translate(0, r_ns, 0);
      p.ambientMaterial(160, 220, 255, jetAlpha);
      p.emissiveMaterial(80, 180, 255);
      p.cylinder(2.5 * (1 + intensityFactor * 0.3), 160);
      p.pop();

      // Dibujar chorro inferior (Sur)
      p.push();
      p.translate(0, -r_ns, 0);
      p.ambientMaterial(160, 220, 255, jetAlpha);
      p.emissiveMaterial(80, 180, 255);
      p.cylinder(2.5 * (1 + intensityFactor * 0.3), -160);
      p.pop();

      p.pop(); // Fin de haz del pulsar
    }

    /* ──────────────────────────────────────────
       AGUJERO NEGRO (M >= 3 M☉)
       ────────────────────────────────────────── */
    function _drawBlackHole(lensing) {
      // Horizonte de Sucesos: Radio de Schwarzschild Rs = 2GM/c^2
      // Escalado visual de Rs proporcional a la masa del remanente
      const rs_radius = 12 * remnantMass;
      const spinA = GR.spinA;

      const r_plus = 0.5 * rs_radius * (1 + Math.sqrt(Math.max(0, 1 - spinA * spinA)));
      
      // ── Horizonte de Sucesos ──
      p.push();
      // Esfera negra pura absorbente
      p.ambientMaterial(0, 0, 0);
      p.emissiveMaterial(0, 0, 0);
      p.sphere(r_plus);
      p.pop();

      // ── Lente Gravitacional (Warped Accretion Disk) ──
      const innerDisk = rs_radius * 1.5;
      const outerDisk = rs_radius * 4.2;

      // 1. Disco Plano Ecuatorial (Normal)
      p.push();
      p.rotateX(p.HALF_PI); // Dibujar en plano XZ
      _drawDiskGeometry(innerDisk, outerDisk, 0.02, rs_radius, spinA);
      p.pop();

      // Ergoesfera para BH de Kerr (visualización del frame dragging)
      if (lensing) {
        _drawErgosphere(rs_radius, spinA);
      }

      // 2. Anillos Curvados por Lente (Efecto Gargantua)
      // Se modela geométricamente dibujando anillos verticales orientados al observador (billboarding)
      if (lensing) {
        // Arco de lente superior (Luz de la parte trasera del disco desviada hacia arriba)
        p.push();
        p.rotateY(-angleY); // Contrarrestar la rotación del mundo para mirar a la cámara
        p.translate(0, 0, -2); // Leve desplazamiento detrás del horizonte
        
        // Dibujar el aro deformado superior
        p.ambientMaterial(255, 140, 0, 160);
        p.emissiveMaterial(220, 90, 0);
        
        // Dibujado manual de arco superior curvado
        p.beginShape(p.QUAD_STRIP);
        const steps = 30;
        for (let i = 0; i <= steps; i++) {
          let theta = p.lerp(-p.PI * 0.75, -p.PI * 0.25, i / steps);
          // Radio del arco deformado
          let r_inner = rs_radius * 1.05;
          let r_outer = rs_radius * 1.65;
          
          let x1 = r_inner * p.cos(theta);
          let y1 = r_inner * p.sin(theta) * 1.8; // Deformación vertical
          let x2 = r_outer * p.cos(theta);
          let y2 = r_outer * p.sin(theta) * 1.8;
          
          p.vertex(x1, y1, 0);
          p.vertex(x2, y2, 0);
        }
        p.endShape();

        // Arco de lente inferior (Luz de la parte trasera desviada hacia abajo)
        p.beginShape(p.QUAD_STRIP);
        for (let i = 0; i <= steps; i++) {
          let theta = p.lerp(p.PI * 0.25, p.PI * 0.75, i / steps);
          let r_inner = rs_radius * 1.05;
          let r_outer = rs_radius * 1.65;
          
          let x1 = r_inner * p.cos(theta);
          let y1 = r_inner * p.sin(theta) * 1.8;
          let x2 = r_outer * p.cos(theta);
          let y2 = r_outer * p.sin(theta) * 1.8;
          
          p.vertex(x1, y1, 0);
          p.vertex(x2, y2, 0);
        }
        p.endShape();
        p.pop();
      }
    }

    function _drawErgosphere(rsRadius, spinA) {
      if (spinA <= 0.01) return;

      const shells = 4;
      p.push();
      p.noFill();

      for (let s = 0; s < shells; s++) {
        const t = s / Math.max(shells - 1, 1);
        p.stroke(90 + 50 * t, 180 + 30 * t, 255, 42 - t * 8);
        p.strokeWeight(1.1 - t * 0.2);
        p.beginShape();
        const steps = 72;
        for (let i = 0; i <= steps; i++) {
          const theta = (i / steps) * p.TWO_PI;
          const cosT = Math.cos(theta);
          const rErg = 0.5 * rsRadius * (1 + Math.sqrt(Math.max(0, 1 - (spinA * spinA * cosT * cosT))));
          const rScaled = rErg * (1.25 + t * 0.8);
          const x = rScaled * Math.cos(theta);
          const z = rScaled * Math.sin(theta) * 1.55;
          const y = Math.sin(theta * 2 + p.frameCount * 0.02) * (3 + t * 3);
          p.vertex(x, y, z);
        }
        p.endShape(p.CLOSE);
      }

      // Líneas de arrastre de marcos (swirl)
      for (let k = 0; k < 3; k++) {
        p.stroke(120, 210, 255, 52);
        p.strokeWeight(1.2);
        p.beginShape();
        for (let i = 0; i <= 110; i++) {
          const t = i / 110;
          const phi = t * p.TWO_PI * 2.2 + p.frameCount * (0.015 + spinA * 0.03) + k * p.TWO_PI / 3;
          const r = p.lerp(rsRadius * 1.05, rsRadius * 2.8, t);
          const x = r * Math.cos(phi);
          const z = r * Math.sin(phi);
          const y = Math.sin(t * p.TWO_PI * 2 + k) * 6;
          p.vertex(x, y, z);
        }
        p.endShape();
      }

      p.pop();
    }

    function _drawDiskGeometry(inner, outer, speed, rsRadius, spinA) {
      p.push();
      p.rotateZ(p.frameCount * speed);

      // Representación por anillos: color modulado por redshift y beaming orbital.
      p.noFill();
      for (let r = inner; r <= outer; r += 2.8) {
        const gravFactor = _gravitationalRedshiftFactor(Math.max(r, rsRadius * 1.03), rsRadius);
        const orbitalPhase = p.frameCount * speed * 8 + r * 0.018;
        const doppler = 1 + 0.28 * spinA * Math.sin(orbitalPhase);
        const c = _applyRelativisticColor(210, 130 + remnantMass * 4, 40, gravFactor, doppler);
        const alpha = p.constrain(90 + (1 - gravFactor) * 120, 70, 210);
        p.stroke(c.r, c.g, c.b, alpha);
        p.strokeWeight(1.0 + (outer - r) / (outer - inner + 1));
        p.ellipse(0, 0, r * 2, r * 0.58);
      }

      p.pop();
    }

    /* ──────────────────────────────────────────
       SONDA & ESPAGUETIZACIÓN
       ────────────────────────────────────────── */
    function _drawProbe() {
      // Avanzar sonda
      probe.pos.add(probe.vel);
      let r = probe.pos.mag(); // Distancia al centro

      // Límite físico de la colisión o evento
      const rs_col = remnantType === 'black_hole' ? 12 * remnantMass : 15;

      if (r <= rs_col) {
        // Límite de Causalidad Cruzado (Cruza el horizonte de sucesos)
        probe = null;
        updateStatus("¡Límite de causalidad cruzado! La sonda cruzó el horizonte de sucesos y desapareció.");
        return;
      }

      // Fuerza de marea: F_tidal = 2*G*M / r^3
      // Estiramiento longitudinal en el eje radial y compresión transversal
      let tidalForce = (45.0 * remnantMass) / (r * r * r);
      probe.stretch = 1.0 + p.constrain(tidalForce * 12000, 0, 50);
      probe.compress = 1.0 / p.sqrt(probe.stretch);

      // Guardar rastro para visualización orbital
      if (p.frameCount % 2 === 0) {
        probe.trail.push(probe.pos.copy());
        if (probe.trail.length > 50) probe.trail.shift();
      }

      // Dibujar rastro
      p.push();
      p.stroke(0, 160, 255, 120);
      p.strokeWeight(1.5);
      p.noFill();
      p.beginShape();
      for (let pt of probe.trail) {
        p.vertex(pt.x, pt.y, pt.z);
      }
      p.endShape();
      p.noStroke();
      p.pop();

      // Dibujar cuerpo de la sonda espaguetizada
      p.push();
      p.translate(probe.pos.x, probe.pos.y, probe.pos.z);
      
      // Alinear el estiramiento en la dirección del centro (vector radial)
      let radialVec = p.createVector(0, 0, 0).sub(probe.pos).normalize();
      
      // Rotar la sonda para orientarla hacia el centro
      // En WebGL de p5, el cilindro se estira por defecto en Y. 
      // Calculamos la rotación para alinear Y con radialVec
      let axis = p.createVector(0, 1, 0).cross(radialVec).normalize();
      let angle = p.acos(p.createVector(0, 1, 0).dot(radialVec));
      if (axis.mag() > 0.001) {
        p.rotate(angle, axis);
      }

      // Aplicar espaguetización
      // Estiramiento radial (eje Y local) y compresión lateral (ejes X y Z locales)
      p.scale(probe.compress, probe.stretch, probe.compress);
      
      p.ambientMaterial(0, 200, 255, 230);
      p.emissiveMaterial(0, 60, 180);
      
      // Dibujar sonda como un cilindro largo
      p.cylinder(2, 6);
      p.pop();
    }

  }, containerEl);
}
