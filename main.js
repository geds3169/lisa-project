'use strict';

const { app, BrowserWindow, BrowserView, ipcMain, session, screen } = require('electron');
const path = require('path');

// ─── Fenêtre principale L.I.S.A. ──────────────────────────────────
let mainWindow;

// Registre des BrowserViews actives (id → { view, lastBounds })
const views = new Map();

// Fenêtre PiP flottante (YouTube ou appel vidéo)
let pipWindow = null;

// ─── Création de la fenêtre principale ────────────────────────────
function createMainWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width,
        height,
        frame:           false,       // Pas de barre de titre OS — L.I.S.A. gère son propre chrome
        transparent:     false,       // Opaque pour l'instant — transparence activable Phase 2
        backgroundColor: '#020408',   // Couleur de fond avant que le HTML se charge
        resizable:       true,
        webPreferences: {
            nodeIntegration:  false,   // Sécurité — jamais true
            contextIsolation: true,    // Isoler le renderer du main process
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    // Charger le frontend L.I.S.A.
    mainWindow.loadFile(path.join(__dirname, 'frontend', 'index.html'));

    // Accorder toutes les permissions (caméra, micro, notifications, géoloc...)
    session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
        callback(true);
    });

    // Chrome UA pour éviter les blocages "navigateur non supporté"
    const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    session.defaultSession.setUserAgent(ua);

    mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── IPC : Créer un BrowserView YouTube ───────────────────────────
ipcMain.handle('widget:create', (event, { type, x, y, width, height }) => {
    const view = new BrowserView({
        webPreferences: {
            nodeIntegration:  false,
            contextIsolation: true,
        },
    });

    mainWindow.addBrowserView(view);
    view.setBounds({ x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height) });
    view.setAutoResize({ width: false, height: false });

    if (type === 'youtube') {
        view.webContents.loadURL('https://www.youtube.com');
    } else if (type === 'whatsapp') {
        view.webContents.loadURL('https://web.whatsapp.com');

        // ── Intercepter les notifications WhatsApp ──────────────
        view.webContents.on('did-finish-load', () => {
            // Injecter un listener sur l'API Notification du navigateur
            view.webContents.executeJavaScript(`
                const _Notif = window.Notification;
                window.Notification = function(title, opts) {
                    // Relayer la notif vers L.I.S.A. via window.postMessage
                    window.dispatchEvent(new CustomEvent('lisa-wa-notif', {
                        detail: { title, body: opts?.body, icon: opts?.icon }
                    }));
                    return new _Notif(title, opts);
                };
                window.Notification.permission       = _Notif.permission;
                window.Notification.requestPermission = _Notif.requestPermission.bind(_Notif);
            `);
        });

        // Transmettre les notifications WhatsApp au renderer L.I.S.A.
        view.webContents.on('ipc-message', (_, channel, data) => {
            if (channel === 'wa-notif' && mainWindow) {
                mainWindow.webContents.send('whatsapp:notification', data);
            }
        });
    }

    const id = `${type}-${Date.now()}`;
    views.set(id, { view, lastBounds: { x, y, width, height } });
    return id;
});

// ─── IPC : Redimensionner / déplacer un BrowserView ───────────────
ipcMain.on('widget:resize', (event, { id, x, y, width, height }) => {
    const entry = views.get(id);
    if (!entry) return;
    const b = { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
    entry.view.setBounds(b);
    entry.lastBounds = { x, y, width, height };
});

// ─── IPC : Masquer un BrowserView (widget minimisé) ───────────────
ipcMain.on('widget:hide', (event, { id }) => {
    const entry = views.get(id);
    if (!entry) return;
    mainWindow.removeBrowserView(entry.view);
});

// ─── IPC : Afficher un BrowserView (widget restauré) ──────────────
ipcMain.on('widget:show', (event, { id }) => {
    const entry = views.get(id);
    if (!entry) return;
    mainWindow.addBrowserView(entry.view);
    entry.view.setBounds(entry.lastBounds);
});

// ─── IPC : Détruire un BrowserView (widget fermé) ─────────────────
ipcMain.on('widget:destroy', (event, { id }) => {
    const entry = views.get(id);
    if (!entry) return;
    mainWindow.removeBrowserView(entry.view);
    entry.view.webContents.destroy();
    views.delete(id);
});

// ─── IPC : Mode PiP — fenêtre flottante always-on-top ─────────────
ipcMain.on('widget:pip', (event, { id }) => {
    const entry = views.get(id);
    if (!entry) return;

    // Retirer le BrowserView de la fenêtre principale
    mainWindow.removeBrowserView(entry.view);

    // Créer une petite fenêtre PiP flottante
    pipWindow = new BrowserWindow({
        width:       320,
        height:      200,
        frame:       false,
        alwaysOnTop: true,
        resizable:   true,
        transparent: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    pipWindow.addBrowserView(entry.view);
    entry.view.setBounds({ x: 0, y: 0, width: 320, height: 200 });
    entry.view.setAutoResize({ width: true, height: true });

    pipWindow.on('closed', () => {
        // Retour au widget principal quand PiP est fermé
        if (mainWindow && entry) {
            mainWindow.addBrowserView(entry.view);
            entry.view.setBounds(entry.lastBounds);
        }
        pipWindow = null;
    });
});

// ─── IPC : Sortir du PiP ──────────────────────────────────────────
ipcMain.on('widget:pip-close', (event, { id }) => {
    if (pipWindow) pipWindow.close();
});

// ─── IPC : Plein écran pour un BrowserView ────────────────────────
ipcMain.on('widget:fullscreen', (event, { id }) => {
    const entry = views.get(id);
    if (!entry) return;
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    entry.view.setBounds({ x: 0, y: 0, width, height });
    mainWindow.addBrowserView(entry.view);
});

// ─── Démarrage ────────────────────────────────────────────────────
app.whenReady().then(() => {
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
