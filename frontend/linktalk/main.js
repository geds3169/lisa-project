const { app, BrowserWindow, session, globalShortcut } = require('electron');

let mainWindow;

// 🔥 Flags Chromium pour stabilité WebRTC / WhatsApp
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#111',
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // 🧠 Spoof Chrome (corrige "Chrome requis")
  const chromeUA =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  mainWindow.webContents.setUserAgent(chromeUA);

  // 🌐 Charge WhatsApp Web
  mainWindow.loadURL("https://web.whatsapp.com");

  // 📷 Permissions caméra / micro (IMPORTANT pour appels futurs)
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  // 🧪 DevTools automatique (pour debug immédiat)
  mainWindow.webContents.openDevTools({ mode: 'detach' });

  // 🧠 Log de debug
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[LinkTalk] WhatsApp loaded');
  });

  mainWindow.webContents.on('dom-ready', () => {
    console.log('[LinkTalk] DOM ready - engine ready for V1.1');
  });

  // 🧠 Raccourci DevTools manuel
  app.whenReady().then(() => {
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      if (mainWindow) {
        mainWindow.webContents.toggleDevTools();
      }
    });
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
