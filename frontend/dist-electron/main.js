import { app as l, BrowserWindow as u, ipcMain as w, desktopCapturer as R, session as g } from "electron";
import { fileURLToPath as _ } from "node:url";
import i from "node:path";
import a from "node:fs";
const c = i.dirname(_(import.meta.url));
process.env.APP_ROOT = i.join(c, "..");
const m = process.env.VITE_DEV_SERVER_URL, d = i.join(process.env.APP_ROOT, "dist-electron"), p = i.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = m ? i.join(process.env.APP_ROOT, "public") : p;
function P() {
  const r = [
    i.join(c, "preload.cjs"),
    i.join(c, "preload.js"),
    i.join(c, "preload.mjs"),
    i.join(d, "preload.cjs"),
    i.join(d, "preload.js"),
    i.join(d, "preload.mjs")
  ], o = r.find((e) => a.existsSync(e));
  return o || (console.error("[main] Preload NOT FOUND. Tried:"), r.forEach((e) => console.error("  -", e)), r[0]);
}
let n = null;
function h() {
  const r = P();
  if (console.log(
    "[main] Using preload:",
    r,
    "exists?",
    a.existsSync(r)
  ), n = new u({
    width: 1280,
    height: 800,
    show: !1,
    backgroundColor: "#111111",
    icon: i.join(process.env.VITE_PUBLIC, "vite.svg"),
    webPreferences: {
      preload: r,
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1,
      // penting agar modul Electron tersedia di preload
      webSecurity: !1,
      // dev only
      allowRunningInsecureContent: !0,
      experimentalFeatures: !0,
      // Allow local network access
      // allowDisplayingInsecureContent: true, // Deprecated property
      // Additional permissions for screen sharing
      additionalArguments: ["--enable-features=VaapiVideoDecoder"],
      // Enable script loading
      // enableRemoteModule: false, // Deprecated property
      // Additional security settings for script loading
      partition: "persist:main"
      // Allow file access
      // allowFileAccess: true, // Deprecated property
      // allowFileAccessFromFileURLs: true, // Deprecated property
      // allowUniversalAccessFromFileURLs: true, // Deprecated property
    }
  }), n.webContents.on("preload-error", (o, e, t) => {
    console.error("[main] PRELOAD ERROR at", e, t);
  }), n.webContents.on("dom-ready", () => {
    console.log("[main] DOM ready, checking preload status"), n.webContents.executeJavaScript(
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
    ).catch((o) => console.error("[main] executeJavaScript error:", o));
  }), g.defaultSession.setPermissionRequestHandler((o, e, t) => {
    if (console.log(`[main] Permission requested: ${e}`), e === "media")
      return console.log(`[main] Granting permission: ${e}`), t(!0);
    console.log(`[main] Granting permission: ${e}`), t(!0);
  }), g.defaultSession.setPermissionCheckHandler((o, e, t, s) => (console.log(`[main] Permission check: ${e}`), !0)), m)
    n.loadURL(m);
  else {
    const o = i.join(p, "index.html");
    console.log("[main] RENDERER_DIST:", p), console.log("[main] Loading index.html from:", o), console.log("[main] File exists:", a.existsSync(o)), console.log("[main] File size:", a.statSync(o).size, "bytes");
    const e = `file://${o.replace(/\\/g, "/")}`;
    console.log("[main] Loading with URL:", e), n.loadURL(e).catch((t) => {
      console.error("[main] Failed to load URL:", t), n && !n.isDestroyed() && n.loadFile(o).catch((s) => {
        console.error("[main] Failed to load file:", s);
      });
    });
  }
  n.webContents.once("did-finish-load", () => {
    console.log("[main] Page finished loading"), n?.isDestroyed() || (n.show(), n.focus());
  }), n.webContents.on("did-start-loading", () => {
    console.log("[main] Started loading page");
  }), n.webContents.on("did-stop-loading", () => {
    console.log("[main] Stopped loading page");
  }), n.webContents.on("did-fail-load", (o, e, t, s) => {
    console.error("[main] did-fail-load:"), console.error("  Error Code:", e), console.error("  Error Description:", t), console.error("  Validated URL:", s), n?.show();
  }), n.webContents.on("console-message", (o, e, t, s, f) => {
    e >= 2 && console.log(`[renderer-console] ${e}: ${t} (${f}:${s})`);
  }), n.webContents.on("did-fail-load", (o, e, t, s) => {
    console.error(`[main] Script load failed: ${e} - ${t} for ${s}`);
  });
}
l.on("window-all-closed", () => {
  process.platform !== "darwin" && l.quit();
});
l.on("activate", () => {
  u.getAllWindows().length === 0 && h();
});
l.commandLine.appendSwitch("--enable-usermedia-screen-capture");
l.commandLine.appendSwitch("--disable-features", "VizDisplayCompositor");
l.commandLine.appendSwitch("--enable-features", "VaapiVideoDecoder");
l.commandLine.appendSwitch("--autoplay-policy", "no-user-gesture-required");
w.on("preload-crashed", (r, o) => {
  console.error("[main] PRELOAD CRASHED:", o);
});
w.handle("get-screen-sources", async () => {
  try {
    console.log("[main] Getting screen sources...");
    const r = await R.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 150, height: 150 }
    });
    return console.log("[main] Found screen sources:", r.length), r.map((o) => ({
      id: o.id,
      name: o.name,
      thumbnail: o.thumbnail.toDataURL()
    }));
  } catch (r) {
    throw console.error("[main] Error getting screen sources:", r), r;
  }
});
l.whenReady().then(() => {
  console.log("=== APP STARTING ==="), h();
});
export {
  d as MAIN_DIST,
  p as RENDERER_DIST,
  m as VITE_DEV_SERVER_URL
};
