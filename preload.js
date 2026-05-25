'use strict';

/**
 * preload.js — Pont IPC sécurisé entre le renderer (L.I.S.A. frontend)
 * et le main process Electron.
 * contextIsolation: true → on expose uniquement ce qui est nécessaire.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lisa', {

    // ── Créer un widget média (YouTube ou WhatsApp) ──────────────
    createWidget: (type, bounds) =>
        ipcRenderer.invoke('widget:create', { type, ...bounds }),

    // ── Redimensionner / déplacer ──────────────────────────────
    resizeWidget: (id, bounds) =>
        ipcRenderer.send('widget:resize', { id, ...bounds }),

    // ── Masquer (widget minimisé) ──────────────────────────────
    hideWidget: (id) =>
        ipcRenderer.send('widget:hide', { id }),

    // ── Afficher (widget restauré) ────────────────────────────
    showWidget: (id) =>
        ipcRenderer.send('widget:show', { id }),

    // ── Détruire (widget fermé) ────────────────────────────────
    destroyWidget: (id) =>
        ipcRenderer.send('widget:destroy', { id }),

    // ── PiP — fenêtre flottante ────────────────────────────────
    pipWidget: (id) =>
        ipcRenderer.send('widget:pip', { id }),

    closePip: (id) =>
        ipcRenderer.send('widget:pip-close', { id }),

    // ── Plein écran ────────────────────────────────────────────
    fullscreenWidget: (id) =>
        ipcRenderer.send('widget:fullscreen', { id }),

    // ── Notifications WhatsApp → reçues dans app.js ───────────
    onWhatsAppNotification: (callback) =>
        ipcRenderer.on('whatsapp:notification', (_, data) => callback(data)),

    // ── Détection contexte Electron (app.js peut vérifier) ────
    isElectron: true,
});
