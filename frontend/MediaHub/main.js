const { app, BrowserWindow, session } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    kiosk: true,
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    resizable: false,
    webPreferences: {
      devTools: false,
    },
  });

  // Supprime menu
  win.setMenu(null);

  // Bloque clic droit
  win.webContents.on("context-menu", (e) => {
    e.preventDefault();
  });

  // Bloque DevTools
  win.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F12" || (input.control && input.shift && input.key === "I")) {
      event.preventDefault();
    }
  });

  // Permissions (YouTube etc.)
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
    callback(true);
  });

  win.loadURL("https://www.youtube.com");
}

app.whenReady().then(createWindow);
