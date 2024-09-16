import path from "path";
import simpleDB from "simple-json-db";
import ensureDir from "./utils/ensureDir";

export let ipcEmit: (channel: string, ...args: any[]) => void = (c, a) => {
  console.log("[Unhandled] <Socket.io>", c, a);
};

const appDataPath = path.join(__dirname, "..", "appdata");
console.log("[Path]", "AppDataPath", appDataPath);

// protocol.registerSchemesAsPrivileged([
//   {
//     scheme: "jeta",
//     privileges: { secure: true, standard: true, supportFetchAPI: true },
//   },
// ]);

ensureDir(appDataPath);

export const configDB = new simpleDB(path.join(appDataPath, "config.json"), {
  syncOnWrite: true,
});

if (configDB.get("serverDir") == undefined)
  configDB.set("serverDir", path.join(appDataPath, "server"));
if (configDB.get("jarDir") == undefined)
  configDB.set("jarDir", path.join(appDataPath, "jar"));

if (configDB.get("ftpuser") == undefined) configDB.set("ftpuser", "ftpuser");
if (configDB.get("ftppass") == undefined)
  configDB.set("ftppass", "strongpsssword");

ensureDir(configDB.get("serverDir"));
ensureDir(configDB.get("jarDir"));

console.log("[Path]", "ServerDir", configDB.get("serverDir"));
console.log("[Path]", "JarDir", configDB.get("jarDir"));

export const serverDir = configDB.get("serverDir");
export const jarDir = configDB.get("jarDir");

export const serverDB = new simpleDB(path.join(appDataPath, "server.json"), {
  syncOnWrite: true,
});

import express from "express";
import socketIO from "socket.io";

const expressServer = express();
expressServer.use(express.json());
expressServer.use(express.static(path.join(__dirname, "..", "static")));

import { API_Handler } from "./instanceManager";
import { Bukkit_Handler } from "./bukkitAPI";

import FtpSrv from "ftp-srv";

function main() {
  // expressServer.use(wdv.extensions.express("/webdav", wdvsv));
  expressServer.use("/api", async (req, res) => {
    console.log(req.body);
    const sp = new URLSearchParams(req.query as any);
    const handler = await API_Handler(req.path, sp, req.body);
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

  const httpServer = expressServer.listen(PORT, () => {
    console.log(
      `[Express] Server Started on port ${PORT}.\n[Express] See Docs at http://localhost:${PORT}/api, http://localhost:${PORT}/bukkit`
    );
  });

  const io = new socketIO.Server(httpServer);

  io.on("connection", (socket) => {
    console.log("[SocketIO] A user connected:", socket.id);
  });
  ipcEmit = (channel, ...args) => {
    io.emit(channel, ...args);
  };

  const port = PORT + 1;
  const ftpServer = new FtpSrv({
    url: "ftp://0.0.0.0:" + port,
    anonymous: true,
  });

  ftpServer.on(
    "login",
    ({ connection, username, password }, resolve, reject) => {
      if (
        username != configDB.get("ftpuser") ||
        password != configDB.get("ftppass")
      ) {
        console.log(
          "[FTP] A user failed to connect:",
          connection.id,
          username,
          password
        );
        return reject(new Error("Invalid username or password"));
      }
      console.log("[FTP] A user connected:", connection.id);
      return resolve({ root: serverDir, cwd: "/" });
    }
  );

  ftpServer.listen().then(() => {
    console.log("Ftp server is starting...");
  });
}

main();
