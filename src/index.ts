import { app, BrowserWindow, ipcMain, protocol } from "electron";
import path from "path";
import simpleDB from "simple-json-db";
import ensureDir from "./utils/ensureDir";

export let ipcEmit: (channel: string, ...args: any[]) => void = () => {};

const appDataPath = app.getPath("userData");
console.log("[Path]", "AppDataPath", appDataPath);

protocol.registerSchemesAsPrivileged([
  {
    scheme: "jeta",
    privileges: { secure: true, standard: true, supportFetchAPI: true },
  },
]);

ensureDir(appDataPath);

export const configDB = new simpleDB(path.join(appDataPath, "config.json"), {
  syncOnWrite: true,
});

if (configDB.get("serverDir") == undefined)
  configDB.set("serverDir", path.join(appDataPath, "server"));
if (configDB.get("jarDir") == undefined)
  configDB.set("jarDir", path.join(appDataPath, "jar"));

ensureDir(configDB.get("serverDir"));
ensureDir(configDB.get("jarDir"));

console.log("[Path]", "ServerDir", configDB.get("serverDir"));
console.log("[Path]", "JarDir", configDB.get("jarDir"));

export const serverDir = configDB.get("serverDir");
export const jarDir = configDB.get("jarDir");

export const serverDB = new simpleDB(path.join(appDataPath, "server.json"), {
  syncOnWrite: true,
});

const staticDir = path.join(__dirname, "..", "static");

import { API_Handler } from "./instanceManager";
import { Bukkit_Handler } from "./bukkitAPI";
import express from "express";

const expressServer = express();
expressServer.use(express.json());

function createWindow() {
  const handleRequest = (request: Request) => {
    const url = new URL(request.url);
    if (url.hostname == "api") return API_Handler(request);
    if (url.hostname == "bukkit") return Bukkit_Handler(request);
    else return new Response("Not Found", { status: 404 });
  };
  protocol.handle("jeta", handleRequest);
  expressServer.use("/api", async (req, res) => {
    const url = new URL("http://api.jeta" + req.url);
    const handler = await API_Handler(
      new Request(url, {
        method: req.method,
        ...(!(req.method == "GET" || req.method == "HEAD")
          ? {
              body: req.body,
            }
          : {}),
      })
    );
    res.status(handler.status).send(await handler.text());
  });
  expressServer.use("/bukkit", async (req, res) => {
    const url = new URL("http://bukkit.jeta" + req.url);
    const handler = await Bukkit_Handler(
      new Request(url, {
        method: req.method,
        ...(!(req.method == "GET" || req.method == "HEAD")
          ? {
              body: req.body,
            }
          : {}),
      })
    );
    res.status(handler.status).send(await handler.text());
  });
  const PORT = serverDB.get("port") || 19827;
  serverDB.set("port", PORT);
  expressServer.listen(PORT, () => {
    console.log(
      `[Express] Server Started on port ${PORT}.\n[Express] See Docs at http://localhost:${PORT}/api, http://localhost:${PORT}/bukkit`
    );
  });

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  win.loadFile(path.join(staticDir, "index.html"));
  ipcEmit = win.webContents.send.bind(win.webContents);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
