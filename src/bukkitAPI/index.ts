import { ipcMain } from "electron";
import { ipcEmit, jarDir } from "..";
import PaperAPI from "./paper";
import PurPurAPI from "./purpur";
import VelocityAPI from "./velocity";
import { Downloader } from "nodejs-file-downloader";

import libpath from "path";
import { readFileSync } from "fs";
import path from "path";

export interface BukkitAPI {
  getVersions: () => Promise<string[]>;
  getBuilds: (version: string) => Promise<string[]>;
  getDownloadURL: (version: string, build: string) => Promise<string>;

  hasVersion: (version: string) => Promise<boolean>;
  hasBuild: (version: string, build: string) => Promise<boolean>;
}

const bukkitAPI: { [key: string]: BukkitAPI } = {
  paper: new PaperAPI(),
  purpur: new PurPurAPI(),
  velocity: new VelocityAPI(),
};

const docsFile = path.join(__dirname, "..", "..", "docs", "bukkit.json");
const docsContent = readFileSync(docsFile, "utf-8").toString();

export const Bukkit_Handler = async (request: Request): Promise<Response> => {
  const path = new URL(request.url).pathname;
  const query = new URL(request.url).searchParams;
  console.log("[Bukkit]", request.method, path + "?" + query.toString());
  if (path == "/") return new Response(docsContent, { status: 200 });
  if (path == "/versions")
    return new Response(
      JSON.stringify(await bukkitAPI[query.get("bukkit")!].getVersions()),
      { status: 200 }
    );
  if (path == "/builds")
    return new Response(
      JSON.stringify(
        await bukkitAPI[query.get("bukkit")!].getBuilds(query.get("version")!)
      ),
      { status: 200 }
    );
  if (path == "/hasVersion")
    return new Response(
      JSON.stringify(
        await bukkitAPI[query.get("bukkit")!].hasVersion(query.get("version")!)
      ),
      { status: 200 }
    );
  if (path == "/hasBuild")
    return new Response(
      JSON.stringify(
        await bukkitAPI[query.get("bukkit")!].hasBuild(
          query.get("version")!,
          query.get("build")!
        )
      ),
      { status: 200 }
    );
  if (path == "/downloadJar") {
    const version = query.get("version")!;
    const build = query.get("build")!;
    if (await bukkitAPI[query.get("bukkit")!].hasBuild(version, build)) {
      return new Response(
        JSON.stringify({
          have: true,
        }),
        {
          status: 200,
        }
      );
    }
    const url = await bukkitAPI[query.get("bukkit")!].getDownloadURL(
      version,
      build
    );
    setTimeout(() => {
      const downloader = new Downloader({
        url,
        directory: libpath.join(jarDir, query.get("bukkit")!, version),
        fileName: build + ".jar",
        onProgress(percentage, chunk, remainingSize) {
          ipcEmit("dlprogress", percentage);
          console.log("Progress", percentage);
        },
      });
      downloader.download().then(() => {
        console.log("Downloaded", url);
        ipcEmit("dlcomp", {
          version,
          build,
        });
      });
    });
    return new Response(
      JSON.stringify({
        have: false,
      }),
      {
        status: 200,
      }
    );
  }
  return new Response("Not Found", { status: 404 });
};
