/**
 * =========================================================================
 * CORE LOGIQUE L.I.S.A. HUD v2.1 — ARCHITECTURE APPLICATIVE MULTI-PLATEFORME
 * =========================================================================
 * * Ce script orchestre les états graphiques de l'Orbe, génère les animations fluides,
 * assure la gestion de l'interactivité spatiale (Drag & Resize inversé) et prend en 
 * charge la résilience matérielle (sauvegardes d'urgence en cas d'appels téléphoniques).
 */

// --- 1. CONFIGURATION COMPLÈTE DES ÉTATS ET MESSAGES CINÉMATIQUES ---
const states = {
    idle:     { color: '#4a7fc1', glow: 'rgba(74,127,193,0.4)',   speed: 0.02, status: 'IDLE',
                messages: ['Connecté', 'En veille'] },
    listening:{ color: '#00d4ff', glow: 'rgba(0,212,255,0.45)',   speed: 0.06, status: 'LISTENING',
                messages: ['En écoute…', 'Analyse vocale…'] },
    thinking: { color: '#bd00ff', glow: 'rgba(189,0,255,0.45)',   speed: 0.09, status: 'THINKING',
                messages: ['Réflexion…', 'Analyse…', 'Traitement…'] },
    external: { color: '#6366f1', glow: 'rgba(99,102,241,0.45)',  speed: 0.07, status: 'EXTERNAL',
                messages: ['Réseau mondial…', 'Serveurs distants…', 'Bases de connaissances…'] },
    responding:{ color: '#34d399', glow: 'rgba(52,211,153,0.4)',  speed: 0.04, status: 'RESPONDING',
                messages: ['Transmission…', 'Synthèse vocale…'] },
    error:    { color: '#f59e0b', glow: 'rgba(245,158,11,0.4)',   speed: 0.025, status: 'ERROR',
                messages: ['Signal perturbé', 'Connexion instable…'] },
    offline:  { color: '#f59e0b', glow: 'rgba(245,158,11,0.3)',   speed: 0.015, status: 'OFFLINE',
                messages: ['Mode autonome'] }
};

const STATE_CYCLE = ['idle','listening','thinking','external','responding','error'];
let currentState = 'idle';
let isMuted = false;
let statusMsgTimer = null;

/**
 * Commute l'état de l'IA et met à jour toutes les variables CSS + statut cinématique
 */
function setOrbState(stateName) {
    if (!states[stateName]) return;
    currentState = stateName;
    const s = states[stateName];

    document.documentElement.style.setProperty('--state-color', s.color);
    document.documentElement.style.setProperty('--state-glow',  s.glow);
    document.getElementById('orb-status').innerText = s.status;

    // Badge court dans la barre de statut
    const badge = document.getElementById('status-badge');
    if (badge) badge.textContent = s.status;

    // Message court rotatif dans la zone de texte
    const msgs = s.messages;
    const msg  = msgs[Math.floor(Math.random() * msgs.length)];
    const el   = document.getElementById('chat-status-text');
    if (el) {
        el.style.opacity = '0';
        setTimeout(() => {
            el.textContent = msg;
            el.style.opacity = '1';
        }, 150);
    }
}

/** Bascule le bouton Muet et met à jour le statut */
function toggleMute() {
    isMuted = !isMuted;
    const btn = document.getElementById('mute-btn');
    if (btn) {
        btn.classList.toggle('muted', isMuted);
        btn.innerHTML = isMuted ? '🔇 MUET' : '🔊 SON';
    }
}

/** Clic sur l'orbe = toggle TOUS les widgets installés (minimiser / maximiser) */
let widgetsVisible = true;
document.getElementById('orb-click-zone').addEventListener('click', () => {
    widgetsVisible = !widgetsVisible;
    document.querySelectorAll('.spatial-window').forEach(w => {
        if (w.id === 'lisa-master-panel') return; // Ne pas toucher au panneau config
        if (widgetsVisible) {
            w.classList.remove('minimized-state');
        } else {
            w.classList.add('minimized-state');
        }
    });
    // Feedback visuel sur l'orbe
    setOrbState(widgetsVisible ? 'idle' : 'offline');
});

// --- 2. RENDU MATHÉMATIQUE DU NUAGE DE PARTICULES DE L'ORBE (CANVAS RENDERING) ---
const canvas = document.getElementById('orbCanvas');
const ctx = canvas.getContext('2d');
let particles = [];

/**
 * Représentation atomique d'une particule lumineuse gravitant autour du noyau de l'Orbe
 */
class Particle {
    constructor() { this.reset(); }
    
    /** Initialisation ou recyclage d'une particule pour préserver la mémoire (Zero-Garbage-Collection) */
    reset() {
        this.angle = Math.random() * Math.PI * 2;          // Positionnement angulaire initial sur le cercle
        this.radius = 45 + Math.random() * 20;             // Distance de gravitation par rapport au centre absolu
        this.size = 1 + Math.random() * 2;                 // Diamètre vectoriel de l'atome de lumière
        this.alpha = 0.1 + Math.random() * 0.6;            // Niveau d'opacité initial (Effet scintillant)
        this.speed = 0.005 + Math.random() * 0.01;         // Vitesse propre de rotation linéaire
    }
    
    /** Évolution de la trajectoire basée sur le coefficient d'activité de l'état de l'IA */
    update() {
        this.angle += this.speed * (states[currentState].speed * 20); // Accélération cinétique selon l'état (ex: Thinking)
        this.alpha -= 0.0015;                                         // Évanouissement progressif pour éviter les traînées dures
        if(this.alpha <= 0) this.reset();                             // Recyclage immédiat de la particule obsolète
    }
    
    /** Dessin de la particule dans la matrice Canvas */
    draw() {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const x = cx + Math.cos(this.angle) * this.radius;
        const y = cy + Math.sin(this.angle) * this.radius;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = states[currentState].color;
        ctx.beginPath();
        ctx.arc(x, y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Génération de la réserve immuable de particules pour le cycle de rendu
for(let i=0; i<45; i++) particles.push(new Particle());

/** Boucle d'animation principale — 60 FPS — avec anneaux de halo et respiration */
function animateOrb() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx  = canvas.width  / 2;
    const cy  = canvas.height / 2;
    const s   = states[currentState];
    const t   = Date.now();

    // Respiration : variation douce du rayon selon l'état
    const breatheAmp  = currentState === 'thinking' ? 8 : (currentState === 'idle' ? 4 : 6);
    const breatheSpeed= s.speed * 30;
    const pulse       = Math.sin(t * 0.001 * breatheSpeed) * breatheAmp;

    // ── Anneaux de halo externes ──────────────────────────────────────────
    const ringCount = currentState === 'listening' ? 4 : (currentState === 'idle' ? 2 : 3);
    for (let r = 0; r < ringCount; r++) {
        const ringR = 52 + pulse + r * 18 + Math.sin(t * 0.0008 + r) * 5;
        const alpha = (0.13 - r * 0.03) * (0.7 + 0.3 * Math.sin(t * 0.001 + r));
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = s.color + Math.round(alpha * 255).toString(16).padStart(2,'0');
        ctx.lineWidth   = currentState === 'thinking' ? 0.8 : 1;
        ctx.stroke();
    }

    // ── Halo radial derrière les particules ──────────────────────────────
    const haloGrad = ctx.createRadialGradient(cx, cy, 28, cx, cy, 75 + pulse);
    haloGrad.addColorStop(0,   'transparent');
    haloGrad.addColorStop(0.5, s.glow);
    haloGrad.addColorStop(1,   'transparent');
    ctx.beginPath();
    ctx.arc(cx, cy, 100, 0, Math.PI * 2);
    ctx.fillStyle = haloGrad;
    ctx.fill();

    // ── Arc de scan (Listening uniquement) ───────────────────────────────
    if (currentState === 'listening') {
        const scanAngle = (t * 0.003) % (Math.PI * 2);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(scanAngle);
        const scanGrad = ctx.createLinearGradient(0, 0, 80, 0);
        scanGrad.addColorStop(0, s.color + 'cc');
        scanGrad.addColorStop(1, 'transparent');
        ctx.strokeStyle = scanGrad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(80, 0);
        ctx.stroke();
        ctx.restore();
    }

    // ── Bruit visuel (Thinking / External) ───────────────────────────────
    if (currentState === 'thinking' || currentState === 'external') {
        for (let i = 0; i < 4; i++) {
            const nx = cx + (Math.random() - 0.5) * 100;
            const ny = cy + (Math.random() - 0.5) * 100;
            const d  = Math.hypot(nx - cx, ny - cy);
            if (d < 60) {
                ctx.beginPath();
                ctx.arc(nx, ny, Math.random() * 1.5, 0, Math.PI * 2);
                ctx.fillStyle = s.color + Math.round((0.5 * (1 - d/60)) * 255).toString(16).padStart(2,'0');
                ctx.fill();
            }
        }
    }

    // ── Particules orbitales ─────────────────────────────────────────────
    particles.forEach(p => { p.update(); p.draw(); });

    requestAnimationFrame(animateOrb);
}
animateOrb();

// --- 3. RENDU DES ARRIÈRE-PLANS LIQUIDES ADAPTATIFS (ORGANIC GLASS MATERIAL) ---
/**
 * Injecte un comportement de fluide en mouvement lent dans le canvas d'arrière-plan d'une fenêtre
 * @param {HTMLCanvasElement} canvasEl - Le composant canvas cible imbriqué sous le texte
 */
function injectLiquidBackground(canvasEl) {
    const lCtx = canvasEl.getContext('2d');
    let frameId;
    
    /** Recalcule les dimensions internes du calque de dessin selon les déformations imposées par l'utilisateur */
    function resize() {
        canvasEl.width = canvasEl.parentElement.clientWidth;
        canvasEl.height = canvasEl.parentElement.clientHeight;
    }
    resize();

    let angles = [0, Math.PI/3, (2*Math.PI)/3]; // Décalages de phases initiaux pour la collision des couleurs
    
    /** Boucle interne du rendu fluide */
    function render() {
        lCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        const w = canvasEl.width;
        const h = canvasEl.height;
        
        // Progression lente des angles pour simuler un mouvement de convection thermique de liquide
        angles = angles.map(a => a + 0.003);
        const x = (w/2) + Math.cos(angles[0]) * (w*0.15);
        const y = (h/2) + Math.sin(angles[1]) * (h*0.1);
        
        // Création d'un dégradé radial mouvant imitant une aurore boréale confinée sous le verre dépoli
        let grad = lCtx.createRadialGradient(x, y, 5, w/2, h/2, Math.max(w,h));
        grad.addColorStop(0, 'rgba(0, 212, 255, 0.12)');  // Teinte active cyan infiltrée
        grad.addColorStop(0.5, 'rgba(189, 0, 255, 0.08)'); // Teinte violette intermédiaire
        grad.addColorStop(1, 'transparent');
        
        lCtx.fillStyle = grad;
        lCtx.fillRect(0, 0, w, h);
        frameId = requestAnimationFrame(render);
    }
    render();
    // Exposer la fonction de recalibrage directement sur l'élément canvas pour accès dans initMultiResize
    canvasEl._lisaResize = resize;
    return { resize: resize, stop: () => cancelAnimationFrame(frameId) };
}

// Initialisation immédiate de la texture fluide sous la console du Chat Maître
injectLiquidBackground(document.querySelector('#lisa-chat-master .window-liquid-bg'));

// --- 4. ENGINE DE MANIPULATION SPATIALE MULTI-ÉCRANS (DRAG & RESIZE INVERSÉ) ---
/**
 * Initialise un comportement de relocalisation spatiale fluide par glisser-déplacer (Drag & Drop)
 * @param {HTMLElement} element - La fenêtre globale à mouvoir
 * @param {HTMLElement} handle - La zone d'en-tête ou de saisie qui capte l'action de déplacement
 */
// ─── SVG ICONS HUD ────────────────────────────────────────────────
// Réticule de visée style HUD — verrouillé (cercle + croix + point central)
const SVG_PIN_LOCKED = `<svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="6" cy="6" r="3.5" stroke="currentColor" stroke-width="1"/>
  <circle cx="6" cy="6" r="1.2" fill="currentColor"/>
  <line x1="6" y1="0.5" x2="6" y2="2.5" stroke="currentColor" stroke-width="1"/>
  <line x1="6" y1="9.5" x2="6" y2="11.5" stroke="currentColor" stroke-width="1"/>
  <line x1="0.5" y1="6" x2="2.5" y2="6" stroke="currentColor" stroke-width="1"/>
  <line x1="9.5" y1="6" x2="11.5" y2="6" stroke="currentColor" stroke-width="1"/>
</svg>`;

// Réticule ouvert style HUD — libre (croix seule, centre vide)
const SVG_PIN_FREE = `<svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="6" cy="6" r="3.5" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2"/>
  <line x1="6" y1="0.5" x2="6" y2="4" stroke="currentColor" stroke-width="1"/>
  <line x1="6" y1="8" x2="6" y2="11.5" stroke="currentColor" stroke-width="1"/>
  <line x1="0.5" y1="6" x2="4" y2="6" stroke="currentColor" stroke-width="1"/>
  <line x1="8" y1="6" x2="11.5" y2="6" stroke="currentColor" stroke-width="1"/>
</svg>`;

/**
 * Initialise le drag — vérifie l'état du pin avant d'autoriser
 */
function initHUDDraggable(element, handle) {
    let isDragging = false;
    let ox = 0, oy = 0;

    handle.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.classList.contains('window-close-btn')) return;
        // Bloquer le drag si le widget est verrouillé (pin actif)
        if (element._isPinned) return;

        document.querySelectorAll('.spatial-window').forEach(w => w.style.zIndex = '100');
        element.style.zIndex = '999';

        isDragging = true;
        ox = e.clientX - element.getBoundingClientRect().left;
        oy = e.clientY - element.getBoundingClientRect().top;

        const r = element.getBoundingClientRect();
        element.style.right = 'auto';
        element.style.left  = r.left + 'px';
        element.style.top   = r.top  + 'px';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        element.style.left = (e.clientX - ox) + 'px';
        element.style.top  = (e.clientY - oy) + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) { isDragging = false; return; }
        isDragging = false;
        // ── Sauvegarde automatique de la position en mémoire à chaque fin de drag ──
        if (element.id) autoSavePosition(element);
    });
}

/**
 * Ajoute le bouton Pin HUD à un widget
 * — verrouillé par défaut, un clic libère, un second clic reverrouille + persiste
 */
function initPinButton(el, startPinned = true) {
    const btn = document.createElement('button');
    el.style.position = 'absolute';
    el.appendChild(btn);
    el._isPinned = startPinned;
    if (startPinned) {
        btn.className = 'pin-btn is-pinned';
        btn.innerHTML = SVG_PIN_LOCKED;
        btn.title = 'Verrouillé — cliquez pour déplacer';
    } else {
        btn.className = 'pin-btn is-free';
        btn.innerHTML = SVG_PIN_FREE;
        btn.title = 'Libre — déplacez puis recliquez pour verrouiller';
    }

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        el._isPinned = !el._isPinned;
        if (el._isPinned) {
            btn.className = 'pin-btn is-pinned';
            btn.innerHTML = SVG_PIN_LOCKED;
            btn.title = 'Verrouillé — cliquez pour déplacer';
            // Sauvegarde mémoire immédiate
            autoSavePosition(el);
            // Tentative de persistance sur disque (Tauri ou prompt JSON)
            tauriPersist();
        } else {
            btn.className = 'pin-btn is-free';
            btn.innerHTML = SVG_PIN_FREE;
            btn.title = 'Libre — déplacez puis recliquez pour verrouiller';
        }
    });
}

/**
 * Sauvegarde la position courante d'un widget dans widgetConfigs (mémoire)
 * Appelée automatiquement à chaque mouseup après drag ET au re-pin
 */
function autoSavePosition(el) {
    if (!el || !el.id) return;
    const r = el.getBoundingClientRect();
    if (!widgetConfigs[el.id]) widgetConfigs[el.id] = {};
    widgetConfigs[el.id].x = r.left;
    widgetConfigs[el.id].y = r.top;
    widgetConfigs[el.id].w = el.offsetWidth;
    widgetConfigs[el.id].h = el.offsetHeight;
}

/**
 * Tente d'écrire dans le Tauri Store si disponible (app packagée),
 * sinon ne fait rien — l'export JSON manuel reste disponible dans le panneau.
 * Sauvegarde : positions + styles + liste des widgets actifs (pour re-spawn au démarrage)
 */
async function tauriPersist() {
    try {
        if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
            const { Store } = await import('@tauri-apps/plugin-store');
            const store = await Store.load('lisa-layout.json', { autoSave: true });

            // Snapshot complet des widgets actifs pour re-création au démarrage
            const activeWidgets = [];
            document.querySelectorAll('.spatial-window.hud-element').forEach(el => {
                if (el.id === 'lisa-master-panel') return; // Panneau config = pas persisté
                const r = el.getBoundingClientRect();
                activeWidgets.push({
                    id:      el.id,
                    type:    el.dataset.widgetType || null, // ex: 'meteo', 'youtube'
                    title:   el.querySelector('.window-title')?.textContent || '',
                    x: r.left, y: r.top,
                    w: el.offsetWidth, h: el.offsetHeight,
                    isPinned: el._isPinned !== false,
                    styles: {
                        bgOpacity:       el.style.getPropertyValue('--sys-bg-opacity'),
                        contentOpacity:  el.style.getPropertyValue('--sys-content-opacity'),
                        radius:          el.style.getPropertyValue('--sys-radius'),
                        borderIntensity: el.style.getPropertyValue('--border-intensity'),
                        borderR:         el.style.getPropertyValue('--border-r'),
                        borderG:         el.style.getPropertyValue('--border-g'),
                        borderB:         el.style.getPropertyValue('--border-b'),
                    },
                });
            });

            await store.set('activeWidgets', activeWidgets);
            await store.set('globalStyles', {
                radius:     document.getElementById('cfg-radius')?.value,
                glassOp:    document.getElementById('cfg-glass-op')?.value,
                contentOp:  document.getElementById('cfg-content-op')?.value,
                blur:       document.getElementById('cfg-blur')?.value,
                borderInt:  document.getElementById('cfg-border-int')?.value,
                borderColor:document.getElementById('cfg-border-color')?.value,
                ledEffect:  currentLedEffect,
            });
            console.info('[L.I.S.A.] Layout persisté dans le Tauri Store.');
        }
    } catch (err) {
        console.warn('[L.I.S.A.] Persistance Tauri non disponible :', err.message);
    }
}

/**
 * Restaure le layout complet depuis le Tauri Store au démarrage :
 * — repositionne les widgets natifs (orbe, chat)
 * — re-crée et repositionne les widgets dynamiques (météo, youtube…)
 */
async function tauriRestoreLayout() {
    try {
        if (!(window.__TAURI_INTERNALS__ || window.__TAURI__)) return;
        const { Store } = await import('@tauri-apps/plugin-store');
        const store = await Store.load('lisa-layout.json');

        // 1. Restaurer les styles globaux
        const gs = await store.get('globalStyles');
        if (gs) {
            const r = document.documentElement;
            if (gs.radius)      { r.style.setProperty('--sys-radius',          gs.radius + 'px');  const el = document.getElementById('cfg-radius');    if (el) el.value = gs.radius; }
            if (gs.glassOp)     { r.style.setProperty('--sys-bg-opacity',      gs.glassOp / 100);  const el = document.getElementById('cfg-glass-op');  if (el) el.value = gs.glassOp; }
            if (gs.contentOp)   { r.style.setProperty('--sys-content-opacity', gs.contentOp / 100);const el = document.getElementById('cfg-content-op');if (el) el.value = gs.contentOp; }
            if (gs.blur)        { r.style.setProperty('--glass-blur',          gs.blur + 'px');    const el = document.getElementById('cfg-blur');       if (el) el.value = gs.blur; }
            if (gs.borderInt)   { r.style.setProperty('--border-intensity',    gs.borderInt / 100);const el = document.getElementById('cfg-border-int'); if (el) el.value = gs.borderInt; }
            if (gs.borderColor) { updateBorderColor(gs.borderColor); const el = document.getElementById('cfg-border-color'); if (el) el.value = gs.borderColor; }
            if (gs.ledEffect)   applyLedEffect(gs.ledEffect);
        }

        // 2. Restaurer les widgets actifs
        const saved = await store.get('activeWidgets');
        if (!Array.isArray(saved)) return;

        saved.forEach(cfg => {
            let el = document.getElementById(cfg.id);

            // Widgets natifs (orbe, chat) : repositionner seulement
            if (el) {
                applyRestoredPosition(el, cfg);
                return;
            }

            // Widgets dynamiques : re-créer depuis le type enregistré
            if (cfg.type && cfg.type !== 'native') {
                const def = {
                    meteo:     { title: 'Météo',    html: METEO_HTML,   init: initWeatherWidget },
                    youtube:   { title: 'YouTube',  html: YOUTUBE_HTML, init: initYouTubeWidget },
                    domotique: { title: 'Domotique',html: '💡 Salon 40%<br>🌡️ PAC : OK<br>🔒 Verrous actifs' },
                    systeme:   { title: 'Système',  html: '🖥 CPU : —%<br>💾 RAM : — Go<br>🌐 Réseau : —' },
                }[cfg.type];
                if (!def) return;

                // Spawn avec l'ID original pour cohérence des références
                el = spawnWidget('left', def.title, def.html, def.init, cfg.w + 'px');
                el.id = cfg.id; // Restaurer l'ID exact
            }

            if (el) applyRestoredPosition(el, cfg);
        });

    } catch (err) {
        console.warn('[L.I.S.A.] Restauration layout :', err.message);
    }
}

/** Applique la position et les styles d'un widget restauré */
function applyRestoredPosition(el, cfg) {
    if (cfg.x !== undefined) {
        el.style.left   = cfg.x + 'px';
        el.style.top    = cfg.y + 'px';
        el.style.right  = 'auto';
        el.style.bottom = 'auto';
    }
    if (cfg.w) el.style.width  = cfg.w + 'px';
    if (cfg.h) el.style.height = cfg.h + 'px';

    // Styles individuels
    const s = cfg.styles || {};
    if (s.bgOpacity)        el.style.setProperty('--sys-bg-opacity',      s.bgOpacity);
    if (s.contentOpacity)   el.style.setProperty('--sys-content-opacity', s.contentOpacity);
    if (s.radius)           el.style.setProperty('--sys-radius',          s.radius);
    if (s.borderIntensity)  el.style.setProperty('--border-intensity',    s.borderIntensity);
    if (s.borderR)          { el.style.setProperty('--border-r', s.borderR); el.style.setProperty('--border-g', s.borderG); el.style.setProperty('--border-b', s.borderB); }

    // Restaurer l'état pin
    if (cfg.isPinned !== undefined) {
        el._isPinned = cfg.isPinned;
        const btn = el.querySelector('.pin-btn');
        if (btn) {
            btn.className = cfg.isPinned ? 'pin-btn is-pinned' : 'pin-btn is-free';
            btn.innerHTML = cfg.isPinned ? SVG_PIN_LOCKED : SVG_PIN_FREE;
        }
    }
}

// Restauration au chargement (Tauri uniquement — silencieux en browser)
tauriRestoreLayout();

// ─── Touch support pour mobile ─────────────────────────────────────
function initHUDDraggableTouch(element, handle) {
    handle.addEventListener('touchstart', (e) => {
        if (element._isPinned) return;
        const t = e.touches[0];
        const r = element.getBoundingClientRect();
        element.style.right = 'auto';
        element.style.left  = r.left + 'px';
        element.style.top   = r.top  + 'px';
        element._touchOx = t.clientX - r.left;
        element._touchOy = t.clientY - r.top;
    }, { passive: true });

    handle.addEventListener('touchmove', (e) => {
        if (element._isPinned) return;
        e.preventDefault();
        const t = e.touches[0];
        element.style.left = (t.clientX - element._touchOx) + 'px';
        element.style.top  = (t.clientY - element._touchOy) + 'px';
    }, { passive: false });
}

/* initHUDResizable remplacé par initMultiResize — voir ci-dessous */

// Armement des contrôles spatiaux sur les éléments natifs du HUD
initHUDDraggable(document.getElementById('lisa-orb-hud'), document.getElementById('orb-click-zone'));
initHUDDraggable(document.getElementById('lisa-chat-master'), document.querySelector('#lisa-chat-master .window-header'));
initHUDDraggable(document.getElementById('lisa-master-panel'), document.querySelector('#lisa-master-panel .window-header'));

// Pin buttons sur les composants natifs
initPinButton(document.getElementById('lisa-chat-master'), false);
initPinButton(document.getElementById('lisa-orb-hud'), false);

// Touch support pour mobile
initHUDDraggableTouch(document.getElementById('lisa-chat-master'), document.querySelector('#lisa-chat-master .window-header'));
initHUDDraggableTouch(document.getElementById('lisa-orb-hud'), document.getElementById('orb-click-zone'));

// Resize multi-directionnel du chat
initMultiResize(document.getElementById('lisa-chat-master'));

/**
 * Redimensionnement libre sur 4 coins + bords — contenu adaptatif
 * @param {HTMLElement} el — La fenêtre à équiper
 */
function initMultiResize(el) {
    const handles = el.querySelectorAll('.resize-handle');
    handles.forEach(h => {
        h.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const startW = el.offsetWidth;
            const startH = el.offsetHeight;
            const startX = e.clientX;
            const startY = e.clientY;
            const rect   = el.getBoundingClientRect();
            const startL = rect.left;
            const startT = rect.top;

            // Détecter la direction depuis la classe CSS
            const isL = h.classList.contains('left-handle')  || h.classList.contains('tl') || h.classList.contains('bl');
            const isR = h.classList.contains('right-handle') || h.classList.contains('tr') || h.classList.contains('br');
            const isT = h.classList.contains('top-handle')   || h.classList.contains('tl') || h.classList.contains('tr');
            const isB = h.classList.contains('bot-handle')   || h.classList.contains('bl') || h.classList.contains('br');

            // Fixer les ancres opposées pour éviter les sauts
            el.style.right  = 'auto';
            el.style.bottom = 'auto';
            el.style.left   = startL + 'px';
            el.style.top    = startT + 'px';

            const MIN = 180;

            function onMove(ev) {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;

                if (isR) el.style.width  = Math.max(MIN, startW + dx)  + 'px';
                if (isB) el.style.height = Math.max(MIN, startH + dy)  + 'px';

                if (isL) {
                    const nw = Math.max(MIN, startW - dx);
                    el.style.left  = (startL + startW - nw) + 'px';
                    el.style.width = nw + 'px';
                }
                if (isT) {
                    const nh = Math.max(MIN, startH - dy);
                    el.style.top    = (startT + startH - nh) + 'px';
                    el.style.height = nh + 'px';
                }

                // Notifier le liquid bg
                const liqCanvas = el.querySelector('.window-liquid-bg');
                if (liqCanvas?._lisaResize) liqCanvas._lisaResize();
            }

            function onUp() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup',  onUp);
            }

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup',   onUp);
        });
    });
}

// --- 5. LOGIQUE MÉMOIRE DU CHAT & DOUBLE GESTION DES SCROLLBARS ÉTANCHES ---
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('chat-messages');
const clearInputBtn = document.getElementById('clear-input-btn');

/** Extrait et injecte l'intention saisie par l'utilisateur dans le flux persistant */
function sendMessage() {
    const txt = chatInput.value.trim();
    if(!txt) return; // Rejet immédiat des requêtes vides pour économiser les cycles processeur
    
    appendMessage('user', txt);
    chatInput.value = ''; // Vidage de l'input post-expédition
    chatInput.style.height = 'auto'; // Reset de l'extension de hauteur dynamique
    setOrbState('thinking'); // Mutation visuelle immédiate de l'Orbe (Mode calcul violet)
    
    // Simulation réseau d'une réponse synaptique de l'IA
    setTimeout(() => {
        setOrbState('listening');
        appendMessage('lisa', "Analyse et traitement de l'intention réussis. Alignement du gabarit Aero Glass.");
    }, 1000);
}

/** Injecte une bulle de dialogue et force le défilement de la scrollbar fine */
function appendMessage(sender, text) {
    const m = document.createElement('div');
    m.className = `msg ${sender}`;
    m.innerText = text;
    messagesContainer.appendChild(m);
    
    // AUTO-SCROLL ÉTANCHE : Aligne instantanément la vue sur le message le plus récent
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ACTION LOCALE VALIDÉE : Bouton de purge rapide de la zone de texte sans rupture de session
clearInputBtn.addEventListener('click', () => {
    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatInput.focus(); // Maintient le clavier virtuel actif sur mobile
});

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => { 
    // Capture de la touche Entrée pour valider l'intention, sauf si Shift est enfoncé (saut de ligne autorisé)
    if(e.key === 'Enter' && !e.shiftKey) { 
        e.preventDefault(); 
        sendMessage(); 
    } 
});

// SURVEILLANCE ET EXTENSIBILITÉ CONTRÔLÉE DE LA ZONE DE SAISIE
chatInput.addEventListener('input', function() {
    this.style.height = 'auto';
    // S'étend de manière élastique jusqu'à un seuil de blocage de 80px (Évite la saturation visuelle sur Smartphone/TV)
    this.style.height = Math.min(this.scrollHeight, 80) + 'px';
});

/** Déploie ou escamote le panneau de configuration système global */
function toggleMasterPanel() {
    const panel = document.getElementById('lisa-master-panel');
    panel.classList.toggle('modal-hidden');
    if (!panel.classList.contains('modal-hidden')) refreshMasterPanel();
}
document.getElementById('master-panel-trigger').addEventListener('click', toggleMasterPanel);

// Catalogue fixe de tous les types de widgets disponibles
const WIDGET_CATALOG = [
    { type: 'lisa-orb-hud',    title: 'Orbe L.I.S.A.',        icon: '◉', native: true },
    { type: 'lisa-chat-master',title: 'Console Chat',          icon: '💬', native: true },
    { type: 'meteo',           title: 'Météo',                 icon: '🌤' },
    { type: 'youtube',         title: 'YouTube',               icon: '▶' },
    { type: 'domotique',       title: 'Domotique',             icon: '🏠' },
    { type: 'systeme',         title: 'Surveillance Système',  icon: '🖥' },
];

/**
 * Construit la liste de widgets sous forme de checkboxes.
 * Cocher = déployer. Décocher = supprimer.
 * Appelée à chaque ouverture du panneau.
 */
function refreshMasterPanel() {
    const list = document.getElementById('mp-widget-list');
    if (!list) return;
    list.innerHTML = '';

    WIDGET_CATALOG.forEach(def => {
        // Widget natif : chercher par ID. Widget dynamique : chercher par data-widget-type
        const existing = def.native
            ? document.getElementById(def.type)
            : document.querySelector(`[data-widget-type="${def.type}"]`);
        const isActive = !!existing && !existing.classList.contains('minimized-state');

        const row = document.createElement('div');
        row.className = 'mp-widget-row';
        row.dataset.widgetType = def.type;

        const chkId = `wchk-${def.type}`;
        row.innerHTML = `
            <label for="${chkId}" style="display:flex;align-items:center;gap:8px;flex:1;cursor:${def.native ? 'default' : 'pointer'}">
                <input type="checkbox" id="${chkId}"
                    ${isActive ? 'checked' : ''}
                    ${def.native ? 'disabled title="Composant natif — toujours actif"' : ''}
                    style="accent-color:var(--state-color);width:13px;height:13px;cursor:pointer">
                <span>${def.icon} ${def.title}</span>
            </label>
            ${isActive && !def.native && existing
                ? `<button class="mp-widget-btn" onclick="toggleWidgetConfig('${existing.id}');refreshMasterPanel()" title="Configurer">⚙</button>
                   <button class="mp-widget-btn remove" onclick="removeWidgetType('${def.type}');refreshMasterPanel()" title="Supprimer">✕</button>`
                : ''
            }
        `;

        if (!def.native) {
            const chk = row.querySelector('input[type="checkbox"]');
            chk.addEventListener('change', () => {
                if (chk.checked) {
                    launchWidget(def.type);
                } else {
                    removeWidgetType(def.type);
                }
                // Mettre à jour la row sans fermer le panneau
                setTimeout(() => refreshMasterPanel(), 80);
            });
        }

        list.appendChild(row);
    });
}

/** Supprime tous les widgets d'un type donné */
function removeWidgetType(type) {
    document.querySelectorAll(`[data-widget-type="${type}"]`).forEach(el => el.remove());
}

/** Sauvegarde globale + persistance Tauri */
async function saveAllAndPersist() {
    saveAllPositions();
    await tauriPersist();
    await saveSettingsToJSON();
}

/** Applique le thème du système d'exploitation (dark/light + couleur accent) */
/**
 * Applique le thème du système d'exploitation en lisant les vraies valeurs système.
 * Utilise les CSS System Colors (Highlight, Canvas, CanvasText) que le navigateur
 * traduit depuis le registre OS — fonctionne sur Windows, macOS, Linux.
 */
function applyOsTheme() {
    const r = document.documentElement;

    // ── 1. Lire les couleurs système réelles via un élément temporaire ────
    const probe = (color) => {
        const el = document.createElement('div');
        el.style.cssText = `position:absolute;left:-9999px;visibility:hidden;color:${color}`;
        document.body.appendChild(el);
        const rgb = getComputedStyle(el).color; // → "rgb(X, Y, Z)"
        el.remove();
        return rgb;
    };

    const accentRgb   = probe('Highlight');      // Couleur d'accent OS (bleu Windows, rouge macOS...)
    const canvasRgb   = probe('Canvas');         // Couleur de fond OS
    const canvasText  = probe('CanvasText');     // Couleur de texte OS

    // Extraire les composantes R,G,B depuis "rgb(X, Y, Z)"
    const toRgb = (rgbStr) => {
        const m = rgbStr.match(/(\d+),\s*(\d+),\s*(\d+)/);
        return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null;
    };

    const accent = toRgb(accentRgb);
    const canvas = toRgb(canvasRgb);

    // ── 2. Détecter dark / light ──────────────────────────────────────────
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isHighContrast = window.matchMedia('(prefers-contrast: high)').matches;

    // ── 3. Appliquer la couleur d'accent de l'OS ──────────────────────────
    if (accent) {
        r.style.setProperty('--border-r', accent[0]);
        r.style.setProperty('--border-g', accent[1]);
        r.style.setProperty('--border-b', accent[2]);
        r.style.setProperty('--state-color', `rgb(${accent.join(',')})`);
        // Sync du color picker dans le panneau
        const picker = document.getElementById('cfg-border-color');
        if (picker) {
            const hex = '#' + accent.map(v => v.toString(16).padStart(2,'0')).join('');
            picker.value = hex;
        }
    }

    // ── 4. Fond du verre selon mode sombre/clair ─────────────────────────
    if (canvas) {
        // Utiliser la couleur de fond OS comme teinte du verre
        r.style.setProperty('--glass-tint', `${canvas[0]}, ${canvas[1]}, ${canvas[2]}`);
    } else {
        r.style.setProperty('--glass-tint', isDark ? '10, 15, 30' : '240, 245, 255');
    }
    r.style.setProperty('--sys-bg-opacity', isDark ? '0.06' : '0.10');

    // ── 5. Contraste élevé ────────────────────────────────────────────────
    if (isHighContrast) {
        r.style.setProperty('--sys-bg-opacity', '0.25');
        r.style.setProperty('--border-intensity', '0.9');
    }

    // ── 6. Police système (hérite de Windows/macOS/Linux) ─────────────────
    r.style.setProperty('--sys-font', "system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', sans-serif");
    document.body.style.fontFamily = 'var(--sys-font)';

    // ── 7. color-scheme : les éléments natifs (scrollbars, inputs) suivent l'OS
    r.style.colorScheme = isDark ? 'dark' : 'light';

    // ── 8. accent-color : boutons radio, checkboxes, range suivent l'accent OS
    r.style.setProperty('accent-color', accentRgb !== 'rgb(0, 0, 0)' ? accentRgb : 'auto');

    const modes = [];
    if (isDark) modes.push('🌙 Mode sombre');
    if (isHighContrast) modes.push('◈ Contraste élevé');
    if (accent) modes.push(`🎨 Accent OS appliqué`);
    showToast(modes.length ? modes.join(' · ') : '✓ Thème système appliqué');
}

/** Cycle les états de l'orbe pour la démo (barre de simulation) */
function cycleOrbState() {
    const idx  = STATE_CYCLE.indexOf(currentState);
    const next = STATE_CYCLE[(idx + 1) % STATE_CYCLE.length];
    setOrbState(next);
}

/** Extrait les données des curseurs et écrase les variables CSS racines */
function updateSystemStyles() {
    const r   = document.documentElement;
    r.style.setProperty('--sys-radius',          document.getElementById('cfg-radius').value + 'px');
    r.style.setProperty('--sys-content-opacity', document.getElementById('cfg-content-op').value / 100);
    r.style.setProperty('--sys-bg-opacity',      document.getElementById('cfg-glass-op').value / 100);
    r.style.setProperty('--glass-blur',          document.getElementById('cfg-blur').value + 'px');
    r.style.setProperty('--border-intensity',    document.getElementById('cfg-border-int').value / 100);
    // Vitesse LED : slider va de 3 (rapide) à 40 (lent) — on inverse pour l'UX "lent à droite"
    const rawSpeed = document.getElementById('cfg-led-speed')?.value ?? 20;
    r.style.setProperty('--led-speed',           (44 - rawSpeed * 0.9).toFixed(1) + 's');
}

/** Met à jour la couleur du liseré depuis le color picker */
function updateBorderColor(hex) {
    const r = document.documentElement;
    const [rv, gv, bv] = hexToRgb(hex);
    r.style.setProperty('--border-r', rv);
    r.style.setProperty('--border-g', gv);
    r.style.setProperty('--border-b', bv);
}

function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Applique un effet LED à toutes les fenêtres */
let currentLedEffect = 'static';
function applyLedEffect(effect) {
    currentLedEffect = effect;
    document.querySelectorAll('.spatial-window').forEach(w => {
        w.classList.remove('led-pulse','led-wave','led-snake');
        if (effect !== 'static') w.classList.add(`led-${effect}`);
    });
    // Mise en évidence du bouton actif
    document.querySelectorAll('.led-select-btn').forEach(b => {
        b.style.borderColor = b.dataset.effect === effect
            ? 'rgba(var(--border-r),var(--border-g),var(--border-b),0.8)' : '';
    });
}

/* ── CONFIG INDIVIDUELLE PAR WIDGET ── */

/** Bascule le panneau de config inline d'un widget */
function toggleWidgetConfig(id) {
    const panel = document.getElementById(`wcfg-${id}`);
    if (panel) panel.classList.toggle('open');
}

/** Applique un style individuel à un widget (scope local via custom property inline) */
function applyWidgetStyle(id, prop, val) {
    const el = document.getElementById(id);
    if (!el) return;
    const map = {
        'radius':          '--sys-radius',
        'bg-opacity':      '--sys-bg-opacity',
        'content-opacity': '--sys-content-opacity',
        'border-intensity':'--border-intensity',
    };
    if (map[prop]) el.style.setProperty(map[prop], val);
}

/** Applique la couleur de liseré sur un widget individuel */
function applyWidgetBorderColor(id, hex) {
    const el = document.getElementById(id);
    if (!el) return;
    const [rv,gv,bv] = hexToRgb(hex);
    el.style.setProperty('--border-r', rv);
    el.style.setProperty('--border-g', gv);
    el.style.setProperty('--border-b', bv);
}

/** Sauvegarde la config d'un widget dans le registre en mémoire */
const widgetConfigs = {};
function saveWidgetConfig(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    widgetConfigs[id] = {
        x: r.left, y: r.top, w: el.offsetWidth, h: el.offsetHeight,
        bgOpacity:       el.style.getPropertyValue('--sys-bg-opacity')      || '0.08',
        contentOpacity:  el.style.getPropertyValue('--sys-content-opacity') || '1',
        radius:          el.style.getPropertyValue('--sys-radius')           || '16px',
        borderIntensity: el.style.getPropertyValue('--border-intensity')     || '0.55',
        borderR:         el.style.getPropertyValue('--border-r')             || '80',
        borderG:         el.style.getPropertyValue('--border-g')             || '120',
        borderB:         el.style.getPropertyValue('--border-b')             || '200',
    };
    showToast(`✓ Config "${id}" enregistrée`);
}

/** Enregistre les positions de TOUS les widgets dans le registre */
function saveAllPositions() {
    document.querySelectorAll('.spatial-window').forEach(w => {
        if (!widgetConfigs[w.id]) widgetConfigs[w.id] = {};
        const r = w.getBoundingClientRect();
        widgetConfigs[w.id].x = r.left;
        widgetConfigs[w.id].y = r.top;
        widgetConfigs[w.id].w = w.offsetWidth;
        widgetConfigs[w.id].h = w.offsetHeight;
    });
    showToast('✓ Positions de tous les widgets enregistrées');
}

/* ── JSON SAVE / LOAD (pas de localStorage — fichier dédié) ── */

/** Applique un effet LED sur un widget individuel */
function applyWidgetLed(id, effect) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('led-pulse', 'led-wave', 'led-snake');
    if (effect !== 'static') el.classList.add(`led-${effect}`);
    if (!widgetConfigs[id]) widgetConfigs[id] = {};
    widgetConfigs[id].ledEffect = effect;
}

/** Applique la vitesse d'effet LED sur un widget individuel */
function applyWidgetLedSpeed(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    const speed = (44 - val * 0.9).toFixed(1) + 's';
    el.style.setProperty('--led-speed', speed);
    if (!widgetConfigs[id]) widgetConfigs[id] = {};
    widgetConfigs[id].ledSpeed = speed;
}

/** Collecte l'état complet pour la sauvegarde JSON */
function buildSettingsPayload() {
    saveAllPositions();
    return {
        version: '2.1',
        savedAt: new Date().toISOString(),
        global: {
            radius:     document.getElementById('cfg-radius')?.value,
            glassOp:    document.getElementById('cfg-glass-op')?.value,
            contentOp:  document.getElementById('cfg-content-op')?.value,
            blur:       document.getElementById('cfg-blur')?.value,
            borderInt:  document.getElementById('cfg-border-int')?.value,
            borderColor:document.getElementById('cfg-border-color')?.value,
            ledEffect:  currentLedEffect,
            ledSpeed:   document.getElementById('cfg-led-speed')?.value,
        },
        widgets: widgetConfigs,
        activeWidgets: Array.from(document.querySelectorAll('[data-widget-type]')).map(el => ({
            type:    el.dataset.widgetType,
            id:      el.id,
            x:       parseFloat(el.style.left),
            y:       parseFloat(el.style.top),
            w:       el.offsetWidth,
            h:       el.offsetHeight,
            isPinned: el._isPinned !== false,
            ledEffect: el.className.match(/led-(\w+)/)?.[1] || 'static',
            ledSpeed:  el.style.getPropertyValue('--led-speed') || '',
            styles: {
                bgOpacity:       el.style.getPropertyValue('--sys-bg-opacity'),
                contentOpacity:  el.style.getPropertyValue('--sys-content-opacity'),
                radius:          el.style.getPropertyValue('--sys-radius'),
                borderIntensity: el.style.getPropertyValue('--border-intensity'),
                borderR:         el.style.getPropertyValue('--border-r'),
                borderG:         el.style.getPropertyValue('--border-g'),
                borderB:         el.style.getPropertyValue('--border-b'),
            },
        })),
    };
}

/**
 * Enregistre la configuration dans un fichier JSON.
 * Utilise l'API File System Access (Chrome/Tauri) pour sauvegarder
 * directement dans le dossier frontend — simule le comportement Tauri Store.
 * Fallback : téléchargement automatique.
 */
async function saveSettingsToJSON() {
    const payload = buildSettingsPayload();
    const json    = JSON.stringify(payload, null, 2);

    // Tentative via File System Access API (Chrome, Tauri) — sauvegarde directe dans le dossier
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'lisa-settings.json',
                types: [{ description: 'L.I.S.A. Configuration', accept: { 'application/json': ['.json'] } }],
            });
            const writable = await handle.createWritable();
            await writable.write(json);
            await writable.close();
            showToast('💾 lisa-settings.json enregistré');
            return;
        } catch(e) {
            if (e.name === 'AbortError') return; // Annulé par l'utilisateur
        }
    }

    // Fallback : téléchargement
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lisa-settings.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('💾 lisa-settings.json téléchargé');
}

/**
 * Charge la configuration depuis un fichier JSON.
 * Utilise l'API File System Access si disponible.
 */
async function loadSettingsFromJSON(input) {
    let text;

    if (input) {
        // Via <input type="file">
        const file = input.files[0];
        if (!file) return;
        text = await file.text();
        input.value = '';
    } else if (window.showOpenFilePicker) {
        // Via File System Access API
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{ description: 'L.I.S.A. Configuration', accept: { 'application/json': ['.json'] } }],
            });
            const file = await handle.getFile();
            text = await file.text();
        } catch(e) { return; }
    }

    if (!text) return;

    try {
        const data = JSON.parse(text);
        // Appliquer les styles globaux
        if (data.global) {
            const g = data.global, r = document.documentElement;
            if (g.radius)     { r.style.setProperty('--sys-radius', g.radius+'px'); document.getElementById('cfg-radius').value = g.radius; }
            if (g.glassOp)    { r.style.setProperty('--sys-bg-opacity', g.glassOp/100); document.getElementById('cfg-glass-op').value = g.glassOp; }
            if (g.contentOp)  { r.style.setProperty('--sys-content-opacity', g.contentOp/100); document.getElementById('cfg-content-op').value = g.contentOp; }
            if (g.blur)       { r.style.setProperty('--glass-blur', g.blur+'px'); document.getElementById('cfg-blur').value = g.blur; }
            if (g.borderInt)  { r.style.setProperty('--border-intensity', g.borderInt/100); document.getElementById('cfg-border-int').value = g.borderInt; }
            if (g.borderColor){ document.getElementById('cfg-border-color').value = g.borderColor; updateBorderColor(g.borderColor); }
            if (g.ledEffect)  applyLedEffect(g.ledEffect);
        }
        // Restaurer les widgets dynamiques
        if (Array.isArray(data.activeWidgets)) {
            data.activeWidgets.forEach(cfg => {
                if (!cfg.type) return;
                // Éviter les doublons
                if (document.querySelector(`[data-widget-type="${cfg.type}"]`)) return;
                const def = WIDGET_CATALOG.find(d => d.type === cfg.type && !d.native);
                if (!def) return;
                const w = launchWidget(cfg.type);
                if (!w) return;
                if (cfg.x) { w.style.left = cfg.x+'px'; w.style.top = cfg.y+'px'; w.style.right = 'auto'; }
                if (cfg.w) { w.style.width = cfg.w+'px'; }
                if (cfg.h) { w.style.height = cfg.h+'px'; }
                if (cfg.ledEffect && cfg.ledEffect !== 'static') w.classList.add(`led-${cfg.ledEffect}`);
                if (cfg.ledSpeed) w.style.setProperty('--led-speed', cfg.ledSpeed);
                if (cfg.styles?.bgOpacity) w.style.setProperty('--sys-bg-opacity', cfg.styles.bgOpacity);
            });
        }
        // Repositionner les éléments natifs
        if (data.widgets) {
            ['lisa-orb-hud','lisa-chat-master'].forEach(id => {
                const cfg = data.widgets[id];
                const el  = document.getElementById(id);
                if (!cfg || !el) return;
                if (cfg.x !== undefined) { el.style.left = cfg.x+'px'; el.style.top = cfg.y+'px'; el.style.right = 'auto'; }
            });
        }
        showToast('✓ Configuration restaurée depuis lisa-settings.json');
        refreshMasterPanel();
    } catch { showToast('⚠ Fichier JSON invalide'); }
}

/** Toast de notification non bloquant */
function showToast(msg) {
    let toast = document.getElementById('lisa-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'lisa-toast';
        toast.style.cssText = `
            position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
            background:rgba(10,20,50,0.9); backdrop-filter:blur(12px);
            border:1px solid rgba(80,120,200,0.35); border-radius:20px;
            color:#c8d8f0; font-family:'JetBrains Mono',monospace; font-size:11px;
            padding:8px 18px; z-index:9999; letter-spacing:0.1em;
            transition:opacity 0.3s;`;
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.style.opacity = '0', 2500);
}
// ═══════════════════════════════════════════════════════════════
// REGISTRE DES TYPES DE WIDGETS & LAUNCHER
// ═══════════════════════════════════════════════════════════════

const YOUTUBE_HTML = `
<div class="yt-widget">
    <div class="yt-search-row">
        <input class="yt-input yt-q" type="text" placeholder="Rechercher ou coller une URL YouTube…">
        <button class="yt-btn yt-red yt-go-btn">🔍</button>
    </div>
    <div class="yt-filters">
        <button class="yt-filter active" data-cat="video">Tous</button>
        <button class="yt-filter" data-cat="video&videoCategoryId=10">🎵 Musique</button>
        <button class="yt-filter" data-cat="video&eventType=live">🔴 Live</button>
        <button class="yt-filter" data-cat="video&videoCategoryId=30">🎬 Films</button>
        <button class="yt-filter" data-cat="playlist">📂 Playlists</button>
    </div>
    <div class="yt-screen yt-home active">
        <div class="yt-home-msg">
            <div class="yt-home-icon">▶</div>
            <div class="yt-home-line">Recherchez une vidéo, un artiste, un live…</div>
            <div class="yt-home-sub">Collez une URL YouTube pour lancer directement</div>
            <div class="yt-api-notice">🔑 Ajoutez votre clé API YouTube (⚙) pour la recherche intégrée</div>
        </div>
    </div>
    <div class="yt-screen yt-results">
        <div class="yt-results-scroll"></div>
    </div>
    <div class="yt-screen yt-player-screen">
        <button class="yt-back-btn">← Retour</button>
        <div class="yt-player-wrap">
            <iframe class="yt-iframe" frameborder="0"
                allowfullscreen
                allow="autoplay; encrypted-media; picture-in-picture; web-share">
            </iframe>
        </div>
        <div class="yt-now-playing"></div>
    </div>
</div>`;

// ═══════════════════════════════════════════════════════════════
// WIDGET YOUTUBE — 3 ÉCRANS : ACCUEIL / RÉSULTATS / PLAYER
// ═══════════════════════════════════════════════════════════════

/** Extrait un ID vidéo YouTube depuis toutes les formes d'URL connues */
function extractYouTubeId(str) {
    str = str.trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(str)) return str;
    const patterns = [
        /[?&]v=([A-Za-z0-9_-]{11})/,
        /youtu\.be\/([A-Za-z0-9_-]{11})/,
        /embed\/([A-Za-z0-9_-]{11})/,
        /shorts\/([A-Za-z0-9_-]{11})/,
        /live\/([A-Za-z0-9_-]{11})/,
    ];
    for (const p of patterns) {
        const m = str.match(p);
        if (m) return m[1];
    }
    return null;
}

function initYouTubeWidget(containerEl) {
    // ── Récupère les éléments une seule fois ──────────────────
    const body        = containerEl.querySelector('.window-body');
    const qInput      = body.querySelector('.yt-q');
    const goBtn       = body.querySelector('.yt-go-btn');
    const homeScreen  = body.querySelector('.yt-home');
    const resultsScr  = body.querySelector('.yt-results');
    const playerScr   = body.querySelector('.yt-player-screen');
    const resultsGrid = body.querySelector('.yt-results-scroll');
    const iframe      = body.querySelector('.yt-iframe');
    const backBtn     = body.querySelector('.yt-back-btn');
    const nowPlaying  = body.querySelector('.yt-now-playing');

    let activeType = 'video';
    let lastResults = [];
    let apiKey = '';

    // ── Ajouter le champ clé API dans le panneau config ───────
    const cfgPanel = containerEl.querySelector('.widget-config-panel');
    if (cfgPanel) {
        const apiRow = document.createElement('div');
        apiRow.className = 'wcfg-row';
        apiRow.innerHTML = `
            <label>CLÉ API YOUTUBE (DATA V3)</label>
            <input class="yt-input yt-apikey-field" type="password"
                placeholder="AIza…  (Google Cloud Console)"
                style="font-size:10px;padding:6px 8px">
            <div style="font-size:9px;color:rgba(200,216,240,0.35);margin-top:3px;font-family:'JetBrains Mono',monospace;letter-spacing:0.05em">
                Quota gratuit : ~100 recherches/jour<br>
                Sans clé : lecture directe via URL/ID uniquement
            </div>`;
        const saveBtn = cfgPanel.querySelector('.wcfg-save-btn');
        cfgPanel.insertBefore(apiRow, saveBtn);

        const apiInput = apiRow.querySelector('.yt-apikey-field');
        apiInput.addEventListener('change', () => { apiKey = apiInput.value.trim(); });
    }

    // ── Navigation entre écrans ───────────────────────────────
    function showScreen(name) {
        [homeScreen, resultsScr, playerScr].forEach(s => s.classList.remove('active'));
        ({ home: homeScreen, results: resultsScr, player: playerScr })[name].classList.add('active');
    }

    // ── Mise à jour de la notice ──────────────────────────────
    function refreshApiNotice() {
        const n = body.querySelector('.yt-api-notice');
        if (!n) return;
        n.textContent = '🔍 Recherche via Piped (open source, sans compte)';
        n.style.color = 'rgba(52,211,153,0.7)';
    }

    // ── Filtres catégorie ─────────────────────────────────────
    body.querySelectorAll('.yt-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            body.querySelectorAll('.yt-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeType = btn.dataset.cat;
        });
    });

    // ── Lancer la recherche ou charger une URL ────────────────
    function doSearch() {
        const val = qInput.value.trim();
        if (!val) return;

        const videoId = extractYouTubeId(val);
        if (videoId) {
            playVideo(videoId, val);
            return;
        }

        // Recherche via Piped API — open source, sans clé, sans compte
        showScreen('results');
        resultsGrid.innerHTML = '<div class="yt-loading">⟳ Recherche en cours…</div>';
        searchYouTubePiped(val, activeType)
            .then(items => { lastResults = items; renderResults(items); })
            .catch(err => { resultsGrid.innerHTML = `<div class="yt-loading">⚠ ${err.message}</div>`; });
    }

    goBtn.addEventListener('click', doSearch);
    qInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

    // ── Afficher les résultats ────────────────────────────────
    function renderResults(items) {
        if (!items.length) {
            resultsGrid.innerHTML = '<div class="yt-loading">Aucun résultat</div>';
            return;
        }
        resultsGrid.innerHTML = '';
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'yt-card';
            card.innerHTML = `
                <img class="yt-card-thumb" src="${item.thumb}" alt="" loading="lazy">
                <div class="yt-card-info">
                    <div class="yt-card-title">${escHtml(item.title)}</div>
                    <div class="yt-card-channel">${escHtml(item.channel)}</div>
                    ${item.type === 'playlist'
                        ? `<div class="yt-card-tag">📂 Playlist</div>`
                        : `<div class="yt-card-tag">${item.live ? '🔴 Live' : '▶'}</div>`}
                </div>`;
            card.addEventListener('click', () => {
                if (item.type === 'playlist') {
                    // Les playlists ne peuvent pas être embarquées directement
                    // On joue la première vidéo si possible, sinon on affiche un message
                    resultsGrid.innerHTML = `<div class="yt-loading">📂 ${escHtml(item.title)}<br><small style="opacity:0.5">Les playlists nécessitent une navigation dans le widget YouTube complet (Phase 3)</small></div>`;
                    showScreen('results');
                } else {
                    playVideo(item.id, item.title);
                }
            });
            resultsGrid.appendChild(card);
        });
    }

    // ── Lancer la lecture dans le player ─────────────────────
    function playVideo(id, title) {
        const origin = location.origin || 'https://localhost';
        iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&origin=${encodeURIComponent(origin)}`;
        nowPlaying.textContent = title || id;
        showScreen('player');
    }

    // ── Retour aux résultats ──────────────────────────────────
    backBtn.addEventListener('click', () => {
        iframe.src = '';
        showScreen(lastResults.length ? 'results' : 'home');
    });

    // Init
    refreshApiNotice();
    showScreen('home');
}

/**
 * Recherche YouTube via l'API Piped (frontend YouTube open source)
 * Aucun compte, aucune clé, aucun quota commercial.
 * Plusieurs instances de secours pour la résilience.
 */
async function searchYouTubePiped(query, typeParam) {
    const filterMap = {
        'video':                        'all',
        'video&videoCategoryId=10':     'music_songs',
        'video&eventType=live':         'live',
        'video&videoCategoryId=30':     'all',
        'playlist':                     'playlists',
    };
    const filter = filterMap[typeParam] || 'all';

    // Instances Piped publiques — essayées dans l'ordre
    const instances = [
        'https://pipedapi.kavin.rocks',
        'https://piped-api.garudalinux.org',
        'https://api.piped.projectsegfau.lt',
    ];

    for (const base of instances) {
        try {
            const res = await fetch(
                `${base}/search?q=${encodeURIComponent(query)}&filter=${filter}`,
                { signal: AbortSignal.timeout(6000) }
            );
            if (!res.ok) continue;
            const data = await res.json();
            const items = (data.items || []).slice(0, 14);
            return items.map(i => ({
                id:      (i.url || '').replace('/watch?v=', ''),
                type:    i.type === 'playlist' ? 'playlist' : 'video',
                title:   i.title || '—',
                channel: i.uploaderName || i.uploader || '',
                thumb:   i.thumbnail || '',
                live:    !!i.isLive || (i.type === 'stream' && i.duration === -1),
            })).filter(i => i.id);
        } catch { continue; }
    }
    throw new Error('Service de recherche indisponible — vérifiez votre connexion');
}

/** Échappe le HTML pour éviter les injections dans les titres */
function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const METEO_HTML = `
<div class="wx-widget">
    <div class="wx-search-row">
        <input class="wx-city-input" type="text" placeholder="Ville, pays…">
        <button class="wx-search-btn">🔍</button>
    </div>
    <div class="wx-display">
        <div class="wx-status">Entrez une ville pour afficher la météo</div>
    </div>
</div>`;

/** Lance un widget typé depuis le registre */
function launchWidget(type) {
    const def = {
        youtube:   { title: 'YouTube',    anchor: 'left', html: YOUTUBE_HTML, init: initYouTubeWidget,  w: '320px' },
        meteo:     { title: 'Météo',      anchor: 'left', html: METEO_HTML,   init: initWeatherWidget,  w: '280px' },
        domotique: { title: 'Domotique',  anchor: 'left', html: '💡 Salon 40%<br>🌡️ PAC : OK<br>🔒 Verrous actifs', w: '240px' },
        systeme:   { title: 'Système',    anchor: 'left', html: '🖥 CPU : —%<br>💾 RAM : — Go<br>🌐 Réseau : —',     w: '240px' },
    }[type];
    if (!def) return null;
    const w = spawnWidget(def.anchor, def.title, def.html, def.init, def.w);
    if (w) w.dataset.widgetType = type;
    return w;
}

// Compteur de spawn pour décaler les positions et éviter l'empilement
let _spawnOffset = 0;

function spawnWidget(anchor, title, contentHTML, postInit, forcedWidth) {
    const id  = `widget-${Date.now()}`;
    const w   = document.createElement('div');
    w.className = `spatial-window hud-element anchor-${anchor}`;
    w.id = id;
    w.style.width  = forcedWidth || '260px';
    // Position décalée en grille pour éviter l'empilement
    const col = _spawnOffset % 3;
    const row = Math.floor(_spawnOffset / 3);
    w.style.left  = (30 + col * 290) + 'px';
    w.style.top   = (80 + row * 50)  + 'px';
    w.style.right = 'auto';
    _spawnOffset++;
    if (currentLedEffect !== 'static') w.classList.add(`led-${currentLedEffect}`);

    w.innerHTML = `
        <canvas class="window-liquid-bg"></canvas>
        <div class="window-header">
            <span class="window-title">${title.toUpperCase()}</span>
            <div style="display:flex;gap:6px;align-items:center">
                <button class="widget-gear-btn" onclick="toggleWidgetConfig('${id}')" title="Config">⚙</button>
                <span class="window-close-btn" onclick="document.getElementById('${id}').remove()">✕</span>
            </div>
        </div>
        <div class="window-body">${contentHTML}</div>
        <div class="widget-config-panel" id="wcfg-${id}">
            <div class="wcfg-row"><label>ARRONDI</label><input type="range" min="0" max="28" value="16" oninput="applyWidgetStyle('${id}','radius',this.value+'px')"></div>
            <div class="wcfg-row"><label>OPACITÉ FOND</label><input type="range" min="1" max="40" value="6" oninput="applyWidgetStyle('${id}','bg-opacity',this.value/100)"></div>
            <div class="wcfg-row"><label>OPACITÉ CONTENU</label><input type="range" min="20" max="100" value="100" oninput="applyWidgetStyle('${id}','content-opacity',this.value/100)"></div>
            <div class="wcfg-row" style="flex-direction:row;align-items:center;gap:8px"><label>COULEUR LISERÉ</label><input type="color" value="#4a7fc1" oninput="applyWidgetBorderColor('${id}',this.value)"></div>
            <div class="wcfg-row"><label>INTENSITÉ LISERÉ</label><input type="range" min="0" max="100" value="55" oninput="applyWidgetStyle('${id}','border-intensity',this.value/100)"></div>
            <div class="wcfg-row">
                <label>EFFET LISERÉ</label>
                <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">
                    <button class="master-btn" style="font-size:9px;padding:3px 8px" onclick="applyWidgetLed('${id}','static')">◻ Statique</button>
                    <button class="master-btn" style="font-size:9px;padding:3px 8px" onclick="applyWidgetLed('${id}','pulse')">💓 Pulse</button>
                    <button class="master-btn" style="font-size:9px;padding:3px 8px" onclick="applyWidgetLed('${id}','wave')">〰 Vague</button>
                    <button class="master-btn" style="font-size:9px;padding:3px 8px" onclick="applyWidgetLed('${id}','snake')">🐍 Serpent</button>
                </div>
            </div>
            <div class="wcfg-row"><label>VITESSE EFFET</label><input type="range" min="3" max="40" value="20" oninput="applyWidgetLedSpeed('${id}',this.value)"></div>
            <button class="wcfg-save-btn" onclick="saveWidgetConfig('${id}')">💾 Enregistrer ce widget</button>
        </div>
        <div class="resize-handle left-handle"></div>
        <div class="resize-handle right-handle"></div>
        <div class="resize-handle top-handle"></div>
        <div class="resize-handle bot-handle"></div>
        <div class="resize-handle tl"></div>
        <div class="resize-handle tr"></div>
        <div class="resize-handle bl"></div>
        <div class="resize-handle br"></div>
    `;
    document.body.appendChild(w);
    injectLiquidBackground(w.querySelector('.window-liquid-bg'));
    initHUDDraggable(w, w.querySelector('.window-header'));
    initHUDDraggableTouch(w, w.querySelector('.window-header'));
    initMultiResize(w);
    initPinButton(w, false); // Spawn déverrouillé — l'utilisateur positionne puis verrouille
    if (postInit) postInit(w);
    return w;
}

// ═══════════════════════════════════════════════════════════════
// WIDGET MÉTÉO — OPEN-METEO (GRATUIT, SANS CLÉ)
// ═══════════════════════════════════════════════════════════════

/** Table de correspondance WMO → emoji + libellé */
const WMO = {
    0:'☀️|Ciel dégagé', 1:'🌤️|Principalement dégagé', 2:'⛅|Partiellement nuageux',
    3:'☁️|Couvert', 45:'🌫️|Brouillard', 48:'🌫️|Brouillard givrant',
    51:'🌦️|Bruine légère', 53:'🌦️|Bruine modérée', 55:'🌧️|Bruine dense',
    61:'🌧️|Pluie légère', 63:'🌧️|Pluie modérée', 65:'🌧️|Pluie forte',
    71:'🌨️|Neige légère', 73:'🌨️|Neige modérée', 75:'❄️|Neige forte',
    77:'🌨️|Grésil', 80:'🌦️|Averses légères', 81:'🌧️|Averses modérées',
    82:'⛈️|Averses violentes', 85:'🌨️|Averses neigeuses', 86:'❄️|Averses neigeuses fortes',
    95:'⛈️|Orage', 96:'⛈️|Orage avec grêle', 99:'⛈️|Orage violent avec grêle',
};
function wmo(code) { const v = WMO[code] || '🌡️|Inconnu'; return v.split('|'); }

const DAYS_FR = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

async function fetchWeatherData(cityName) {
    // 1. Géocodage
    const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=fr&format=json`
    );
    const geo = await geoRes.json();
    if (!geo.results?.length) throw new Error('Ville non trouvée');
    const { latitude: lat, longitude: lon, name, country } = geo.results[0];

    // 2. Météo courante + prévisions 3 jours
    const wxRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m,apparent_temperature` +
        `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
        `&timezone=auto&forecast_days=4`
    );
    const wx = await wxRes.json();
    return { name, country, lat, lon, wx };
}

function renderWeather({ name, country, wx }) {
    const c    = wx.current;
    const d    = wx.daily;
    const [icon, label] = wmo(c.weathercode);

    const forecastHtml = [1,2,3].map(i => {
        const date  = new Date(d.time[i]);
        const dayLbl= DAYS_FR[date.getDay()];
        const [fi]  = wmo(d.weathercode[i]);
        return `<div class="wx-day">
            <div>${dayLbl}</div>
            <div class="wx-day-icon">${fi}</div>
            <div class="wx-day-temp">${Math.round(d.temperature_2m_max[i])}°</div>
            <div class="wx-day-range">${Math.round(d.temperature_2m_min[i])}° / ${Math.round(d.temperature_2m_max[i])}°</div>
        </div>`;
    }).join('');

    return `
    <div class="wx-current">
        <div class="wx-main-row">
            <div class="wx-icon">${icon}</div>
            <div class="wx-temp-block">
                <div class="wx-temp">${Math.round(c.temperature_2m)}°C</div>
                <div class="wx-city-name">${name}, ${country}</div>
            </div>
        </div>
        <div class="wx-condition">${label} · Ressenti ${Math.round(c.apparent_temperature)}°C</div>
        <div class="wx-details">
            <div class="wx-detail">💨 ${Math.round(c.windspeed_10m)} km/h</div>
            <div class="wx-detail">💧 ${c.relative_humidity_2m}%</div>
        </div>
        <div class="wx-forecast">${forecastHtml}</div>
        <div class="wx-source-row">Source : <a href="https://open-meteo.com" target="_blank">Open-Meteo</a> · libre & sans clé</div>
    </div>`;
}

function initWeatherWidget(el) {
    const body      = el.querySelector('.window-body');
    const wxWidget  = body.querySelector('.wx-widget');
    const cityInput = body.querySelector('.wx-city-input');
    const searchBtn = body.querySelector('.wx-search-btn');
    const display   = body.querySelector('.wx-display');

    // État de la source — Open-Meteo par défaut
    let wxSource = 'open-meteo';
    let wxApiKey = '';
    let wxCustomUrl = '';

    // ── Recherche météo (uniquement en mode API) ──────────────────────────
    async function doSearch() {
        const city = cityInput.value.trim();
        if (!city) return;
        display.innerHTML = '<div class="wx-status">⟳ Chargement…</div>';
        try {
            let data;
            if (wxSource === 'owm' && wxApiKey) {
                data = await fetchWeatherOWM(city, wxApiKey);
            } else {
                data = await fetchWeatherData(city);
            }
            display.innerHTML = renderWeather(data);
        } catch (e) {
            display.innerHTML = `<div class="wx-status">⚠ ${e.message}</div>`;
        }
    }

    searchBtn.addEventListener('click', doSearch);
    cityInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

    // ── Panneau de configuration de la source (dans le ⚙ du widget) ──────
    const cfgPanel = el.querySelector('.widget-config-panel');
    if (!cfgPanel) return;

    // Retirer le bouton save générique pour le replacer après nos options
    const genericSave = cfgPanel.querySelector('.wcfg-save-btn');

    const sourceBlock = document.createElement('div');
    sourceBlock.innerHTML = `
        <div class="wcfg-row" style="margin-top:6px">
            <label>SOURCE MÉTÉO</label>
            <select class="wx-src-select" style="background:rgba(0,0,0,0.35);border:1px solid rgba(80,120,200,0.3);color:#fff;border-radius:4px;padding:5px 8px;font-family:'JetBrains Mono',monospace;font-size:10px;width:100%;margin-top:4px">
                <option value="open-meteo">Open-Meteo — libre, sans clé</option>
                <option value="owm">OpenWeatherMap — clé API requise</option>
                <option value="url">URL personnalisée — site ou iframe</option>
            </select>
        </div>
        <div class="wx-src-owm" style="display:none">
            <div class="wcfg-row">
                <label>CLÉ API OPENWEATHERMAP</label>
                <input class="yt-input wx-owm-key" type="password" placeholder="Votre clé API OWM…" style="font-size:10px;padding:6px 8px">
                <div style="font-size:9px;color:rgba(200,216,240,0.3);margin-top:3px;font-family:'JetBrains Mono',monospace">openweathermap.org/api — gratuit jusqu'à 60 appels/min</div>
            </div>
        </div>
        <div class="wx-src-url" style="display:none">
            <div class="wcfg-row">
                <label>URL DU SITE MÉTÉO</label>
                <input class="yt-input wx-custom-url" type="url" placeholder="https://exemple-meteo.fr" style="font-size:10px;padding:6px 8px">
                <div style="font-size:9px;color:rgba(200,216,240,0.3);margin-top:3px;font-family:'JetBrains Mono',monospace">Le site s'affichera dans le widget.<br>Certains sites bloquent l'intégration (X-Frame-Options) — contourné nativement dans Tauri.</div>
            </div>
        </div>
        <button class="wcfg-save-btn wx-src-apply" style="margin-top:8px">✓ Appliquer la source</button>
    `;

    cfgPanel.insertBefore(sourceBlock, genericSave);

    const select    = sourceBlock.querySelector('.wx-src-select');
    const owmBlock  = sourceBlock.querySelector('.wx-src-owm');
    const urlBlock  = sourceBlock.querySelector('.wx-src-url');
    const owmKey    = sourceBlock.querySelector('.wx-owm-key');
    const customUrl = sourceBlock.querySelector('.wx-custom-url');
    const applyBtn  = sourceBlock.querySelector('.wx-src-apply');

    select.addEventListener('change', () => {
        owmBlock.style.display  = select.value === 'owm' ? 'block' : 'none';
        urlBlock.style.display  = select.value === 'url' ? 'block' : 'none';
    });

    applyBtn.addEventListener('click', () => {
        wxSource    = select.value;
        wxApiKey    = owmKey.value.trim();
        wxCustomUrl = customUrl.value.trim();

        if (wxSource === 'url' && wxCustomUrl) {
            // Basculer le widget en mode iframe
            wxWidget.innerHTML = `
                <div style="width:100%;height:300px;border-radius:8px;overflow:hidden">
                    <iframe src="${wxCustomUrl}" style="width:100%;height:100%;border:none;border-radius:8px"
                        sandbox="allow-scripts allow-same-origin allow-forms">
                    </iframe>
                </div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(200,216,240,0.3);margin-top:4px;text-align:center;letter-spacing:0.06em">
                    ${wxCustomUrl}
                </div>`;
            showToast('✓ Source météo : URL personnalisée');
        } else if (wxSource === 'open-meteo') {
            // Restaurer le widget Open-Meteo
            wxWidget.innerHTML = `
                <div class="wx-search-row">
                    <input class="wx-city-input" type="text" placeholder="Ville, pays…">
                    <button class="wx-search-btn">🔍</button>
                </div>
                <div class="wx-display"><div class="wx-status">Entrez une ville pour afficher la météo</div></div>`;
            // Rebrancher les événements sur les nouveaux éléments
            const newCity = wxWidget.querySelector('.wx-city-input');
            const newBtn  = wxWidget.querySelector('.wx-search-btn');
            const newDisp = wxWidget.querySelector('.wx-display');
            const refetch = async () => {
                const city = newCity.value.trim(); if (!city) return;
                newDisp.innerHTML = '<div class="wx-status">⟳ Chargement…</div>';
                try { newDisp.innerHTML = renderWeather(await fetchWeatherData(city)); }
                catch(e) { newDisp.innerHTML = `<div class="wx-status">⚠ ${e.message}</div>`; }
            };
            newBtn.addEventListener('click', refetch);
            newCity.addEventListener('keydown', ev => { if (ev.key === 'Enter') refetch(); });
            showToast('✓ Source météo : Open-Meteo');
        } else if (wxSource === 'owm') {
            if (!wxApiKey) { showToast('⚠ Entrez votre clé API OpenWeatherMap'); return; }
            showToast('✓ Source météo : OpenWeatherMap');
        }
        toggleWidgetConfig(el.id); // Fermer le panneau config
    });
}

/**
 * Récupère les données météo depuis OpenWeatherMap (API v2.5)
 */
async function fetchWeatherOWM(city, apiKey) {
    const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=fr`
    );
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || `Erreur OWM ${res.status}`); }
    const d = await res.json();
    // Adapter au format attendu par renderWeather
    return {
        name: d.name, country: d.sys.country,
        wx: {
            current: {
                temperature_2m:         d.main.temp,
                apparent_temperature:   d.main.feels_like,
                weathercode:            owmCodeToWmo(d.weather[0].id),
                windspeed_10m:          d.wind.speed * 3.6,
                relative_humidity_2m:   d.main.humidity,
            },
            daily: {
                time:                [new Date().toISOString()],
                weathercode:         [owmCodeToWmo(d.weather[0].id)],
                temperature_2m_max:  [d.main.temp_max],
                temperature_2m_min:  [d.main.temp_min],
            }
        }
    };
}

/** Convertit un code météo OWM vers un code WMO approximatif */
function owmCodeToWmo(id) {
    if (id === 800) return 0;
    if (id >= 801 && id <= 804) return [1,2,3,3][id-801];
    if (id >= 300 && id < 400) return 51;
    if (id >= 500 && id < 510) return [61,61,63,65][Math.min(id-500,3)];
    if (id >= 600 && id < 700) return 71;
    if (id >= 200 && id < 300) return 95;
    if (id === 741) return 45;
    return 3;
}

// --- 7. SIMULATION DE RÉSILIENCE MATÉRIELLE FACE AUX INTERRUPTIONS SYSTÈME REELLES ---
let isMinimized = false;
let savedInputCache = ""; // Cellule de mémoire tampon sécurisée pour le texte en cours de rédaction

/** Alterne l'affichage du chat en simulant graphiquement une aspiration cinétique vers le cœur de l'Orbe */
function simulateMinimizeToggle() {
    const chat = document.getElementById('lisa-chat-master');
    if(!isMinimized) {
        // MISE EN SOMMEIL : Capture d'urgence du texte non envoyé avant masquage
        savedInputCache = chatInput.value;
        chat.classList.add('minimized-state');
        isMinimized = true;
    } else {
        // RESTAURATION TRANSPARENTE : Restitution intégrale du contexte utilisateur sans perte d'un caractère
        chat.classList.remove('minimized-state');
        chatInput.value = savedInputCache;
        isMinimized = false;
    }
}

/** INTERCEPTION ET RÉSILIENCE FACE AU SYNDROME GEMINI (Simulation d'appel téléphonique entrant) */
function simulateIncomingCall() {
    // 1. DÉCLENCHEMENT IMMÉDIAT DE LA SAUVEGARDE D'URGENCE (Équivalent natif du signal mobile onPause)
    savedInputCache = chatInput.value;
    const chat = document.getElementById('lisa-chat-master');
    chat.classList.add('minimized-state'); // Escamotage d'office pour céder la place absolue à l'appel entrant
    isMinimized = true;
    
    alert("[ÉVÉNEMENT SYSTÈME PRIORITAIRE] : L'appareil mobile reçoit un appel téléphonique.\nL.I.S.A. intercepte le signal de mise en pause, freeze l'instance JavaScript et sauvegarde le texte saisi en zone locale sécurisée.");
    
    // 2. SIMULATION DU RETOUR AU PREMIER PLAN (Équivalent natif du signal mobile onResume)
    setTimeout(() => {
        setOrbState('listening'); // L'Orbe s'allume en bleu cyan pour notifier visuellement la disponibilité de la mémoire
        alert("[RETABLISSEMENT CONTEXTUEL] : L'appel est interrompu.\nLISA détecte le retour d'activité. Le cache de votre discussion est préservé intact. Cliquez sur le bouton de bascule ou sur l'Orbe pour reprendre là où vous vous étiez arrêté.");
    }, 1500);
}

/** RESET ABSOLU DE SESSION (Déclenché exclusivement par la croix maîtresse de la console de chat) */
function triggerSessionReset() {
    chatInput.value = "";
    savedInputCache = ""; // Purge absolue et irréversible de la mémoire tampon
    document.getElementById('lisa-chat-master').classList.add('minimized-state');
    isMinimized = true;
    appendMessage('lisa', "Session réinitialisée.");
}
