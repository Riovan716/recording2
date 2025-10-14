import { app, BrowserWindow, session, ipcMain, desktopCapturer } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

// Cari preload dengan prioritas .cjs (CommonJS)
function findPreload(): string {
  const candidates = [
    path.join(__dirname, "preload.cjs"),
    path.join(__dirname, "preload.js"),
    path.join(__dirname, "preload.mjs"),
    path.join(MAIN_DIST, "preload.cjs"),
    path.join(MAIN_DIST, "preload.js"),
    path.join(MAIN_DIST, "preload.mjs"),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    console.error("[main] Preload NOT FOUND. Tried:");
    candidates.forEach((p) => console.error("  -", p));
    return candidates[0]; // biar errornya kelihatan jelas
  }
  return found;
}

let win: BrowserWindow | null = null;

function createWindow() {
  const preloadPath = findPreload();
  console.log(
    "[main] Using preload:",
    preloadPath,
    "exists?",
    fs.existsSync(preloadPath)
  );

  win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    backgroundColor: "#111111",
    icon: path.join(process.env.VITE_PUBLIC!, "vite.svg"),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // penting agar modul Electron tersedia di preload
      webSecurity: false, // dev only
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      // Allow local network access
      // allowDisplayingInsecureContent: true, // Deprecated property
      // Additional permissions for screen sharing
      additionalArguments: ['--enable-features=VaapiVideoDecoder'],
      // Enable script loading
      // enableRemoteModule: false, // Deprecated property
      // Additional security settings for script loading
      partition: 'persist:main',
      // Allow file access
      // allowFileAccess: true, // Deprecated property
      // allowFileAccessFromFileURLs: true, // Deprecated property
      // allowUniversalAccessFromFileURLs: true, // Deprecated property
      // Ensure proper script execution
      enableBlinkFeatures: 'CSSColorSchemeUARendering',
    },
  });

  win.webContents.on("preload-error", (_e, p, err) => {
    console.error("[main] PRELOAD ERROR at", p, err);
  });

  win.webContents.on("dom-ready", () => {
    console.log("[main] DOM ready, checking preload status");
    win!.webContents
      .executeJavaScript(
        `
        console.log("[renderer] has electronAPI?", !!window.electronAPI);
        console.log("[renderer] electronAPI contents:", window.electronAPI);
        console.log("[renderer] has __PRELOAD_OK__?", !!window.__PRELOAD_OK__);
        console.log("[renderer] __PRELOAD_OK__ value:", window.__PRELOAD_OK__);
        console.log("[renderer] window keys:", Object.keys(window).filter(k => k.includes('PRELOAD') || k.includes('electron')));
        
        // Check if React app is mounting
        console.log("[renderer] Root element exists?", !!document.getElementById('root'));
        console.log("[renderer] Root element children:", document.getElementById('root')?.children.length || 0);
        console.log("[renderer] Document ready state:", document.readyState);
        console.log("[renderer] All scripts loaded:", document.scripts.length);
        console.log("[renderer] Script sources:", Array.from(document.scripts).map(s => s.src));
        console.log("[renderer] Document body HTML:", document.body.innerHTML);
        console.log("[renderer] Document title:", document.title);
        console.log("[renderer] Current URL:", window.location.href);
        
        // Check for any JavaScript errors
        window.addEventListener('error', (e) => {
          console.error('[renderer] JavaScript Error:', e.error, e.message, e.filename, e.lineno);
        });
        
        // Check for unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
          console.error('[renderer] Unhandled Promise Rejection:', e.reason);
        });
        `
      )
      .catch((err) => console.error("[main] executeJavaScript error:", err));
  });

  // Enhanced permission handler for screen capture
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    console.log(`[main] Permission requested: ${permission}`);
    if (permission === "media") {
      console.log(`[main] Granting permission: ${permission}`);
      return cb(true);
    }
    console.log(`[main] Granting permission: ${permission}`);
    cb(true);
  });

  // Set additional permissions for screen capture
  session.defaultSession.setPermissionCheckHandler((_wc, permission, _origin, _details) => {
    console.log(`[main] Permission check: ${permission}`);
    if (permission === "media") {
      return true;
    }
    return true;
  });

  // Always try to load from Vite dev server first
  const devUrl = VITE_DEV_SERVER_URL || 'http://localhost:5173';
  console.log("[main] Attempting to load from dev server:", devUrl);
  
  win.loadURL(devUrl).catch((err) => {
    console.error("[main] Failed to load from dev server:", err);
    
    // Fallback to production build
    const indexPath = path.join(RENDERER_DIST, "index.html");
    console.log("[main] Fallback: Loading index.html from:", indexPath);
    console.log("[main] File exists:", fs.existsSync(indexPath));
    
    if (fs.existsSync(indexPath)) {
      console.log("[main] File size:", fs.statSync(indexPath).size, "bytes");
      
      // Use absolute path and proper protocol
      const fileUrl = `file://${indexPath.replace(/\\/g, '/')}`;
      console.log("[main] Loading with URL:", fileUrl);
      
      win?.loadFile(indexPath).catch((err2) => {
        console.error("[main] Failed to load file:", err2);
        
        // Last resort: try to load the dev server again
        win?.loadURL('http://localhost:5173').catch(() => {
          console.error("[main] All loading attempts failed");
        });
      });
    } else {
      console.error("[main] Production build not found, trying dev server");
      win?.loadURL('http://localhost:5173').catch(() => {
        console.error("[main] Dev server also not available");
      });
    }
  });

  win.webContents.once("did-finish-load", () => {
    console.log("[main] Page finished loading");
    if (!win?.isDestroyed()) {
      win!.show();
      win!.focus();
    }
  });

  // Check if scripts are loading properly
  win.webContents.on('did-start-loading', () => {
    console.log("[main] Started loading page");
  });

  win.webContents.on('did-stop-loading', () => {
    console.log("[main] Stopped loading page");
  });

  win.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error("[main] did-fail-load:");
    console.error("  Error Code:", errorCode);
    console.error("  Error Description:", errorDescription);
    console.error("  Validated URL:", validatedURL);
    
    // Show error page with details
    if (win && !win.isDestroyed()) {
      // Create a temporary HTML file instead of using data URL
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Loading Error</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
            .error-container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .error-title { color: #e74c3c; font-size: 24px; margin-bottom: 16px; }
            .error-details { background: #f8f9fa; padding: 16px; border-radius: 4px; font-family: monospace; }
            .retry-btn { background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <div class="error-title">🚫 Application Loading Failed</div>
            <p>The application failed to load. This might be due to:</p>
            <ul>
              <li>Development server not running</li>
              <li>Network connectivity issues</li>
              <li>Firewall blocking the connection</li>
            </ul>
            <div class="error-details">
              <strong>Error Code:</strong> ${errorCode}<br>
              <strong>Description:</strong> ${errorDescription}<br>
              <strong>URL:</strong> ${validatedURL}
            </div>
            <button class="retry-btn" onclick="window.location.reload()">Retry Loading</button>
          </div>
        </body>
        </html>
      `;
      
      // Write error HTML to a temporary file
      const tempDir = os.tmpdir();
      const errorFilePath = path.join(tempDir, 'electron-error.html');
      fs.writeFileSync(errorFilePath, errorHtml);
      
      // Load the error file
      win?.loadFile(errorFilePath).catch((err) => {
        console.error("[main] Failed to load error file:", err);
        // Last resort: try to load the dev server again
        win?.loadURL('http://localhost:5173').catch(() => {
          console.error("[main] All loading attempts failed");
        });
      });
    }
    win?.show();
  });

  // Add console message handler to catch renderer errors
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level >= 2) { // Error or warning
      console.log(`[renderer-console] ${level}: ${message} (${sourceId}:${line})`);
    }
  });

  // Handle script loading errors
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[main] Script load failed: ${errorCode} - ${errorDescription} for ${validatedURL}`);
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Add command line arguments for better screen capture support
app.commandLine.appendSwitch('--enable-usermedia-screen-capture');
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('--enable-features', 'VaapiVideoDecoder');
app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');

// IPC handlers
ipcMain.on('preload-crashed', (_event, error) => {
  console.error('[main] PRELOAD CRASHED:', error);
});

ipcMain.handle('get-screen-sources', async () => {
  try {
    console.log("[main] Getting screen sources...");
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 150, height: 150 }
    });
    console.log("[main] Found screen sources:", sources.length);
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  } catch (error) {
    console.error("[main] Error getting screen sources:", error);
    throw error;
  }
});

ipcMain.handle('open-external', async (event, url) => {
  try {
    console.log("[main] Opening external URL:", url);
    const { shell } = await import('electron');
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error("[main] Error opening external URL:", error);
    throw error;
  }
});

app.whenReady().then(() => {
  console.log("=== APP STARTING ===");
  createWindow();
});
