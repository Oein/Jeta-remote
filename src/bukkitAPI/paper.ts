import { BukkitAPI } from "./index";
import axios from "axios";

import fs from "fs";
import path from "path";
import { jarDir } from "..";
import ensureDir from "../utils/ensureDir";

export default class PaperAPI implements BukkitAPI {
  cache: { [key: string]: boolean } = {};
  constructor() {
    ensureDir(path.join(jarDir, "paper"));
  }

  async getVersions() {
    const res = await axios.get("https://api.papermc.io/v2/projects/paper");
    return res.data.versions.reverse();
  }
  async getBuilds(version: string) {
    const res = await axios.get(
      `https://api.papermc.io/v2/projects/paper/versions/${version}`
    );
    return res.data.builds.reverse();
  }
  async getDownloadURL(version: string, build: string) {
    return `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${build}/downloads/paper-${version}-${build}.jar`;
  }

  hasVersion(version: string) {
    return new Promise<boolean>((resolve) => {
      if (this.cache[version] === true) resolve(true);
      fs.readdir(path.join(jarDir, "paper"), (err, files) => {
        if (err) {
          resolve(false);
        }
        const inc = files.includes(version);
        if (inc) this.cache[version] = true;
        resolve(inc);
      });
    });
  }
  hasBuild(version: string, build: string) {
    return new Promise<boolean>((resolve) => {
      if (this.cache[version + ":" + build] === true) resolve(true);
      this.hasVersion(version).then((res) => {
        if (!res) return resolve(false);

        fs.readdir(path.join(jarDir, "paper", version), (err, files) => {
          if (err) return resolve(false);

          const inc = files.includes(build + ".jar");
          if (inc) this.cache[version + ":" + build] = true;
          resolve(inc);
        });
      });
    });
  }
}
