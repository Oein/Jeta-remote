import { configDB, ipcEmit, serverDB } from "./index";
import { ChildProcess, spawn } from "child_process";
import { Instance } from "./type";
import path, { join } from "path";
import ensureDir from "./utils/ensureDir";
import { readFileSync, rmSync } from "fs";

const childProcesses: { [key: string]: ChildProcess } = {};
const buffer: { [key: string]: string } = {};

const isOnline = (instanceID: string) => {
  return (
    childProcesses[instanceID] != undefined &&
    !childProcesses[instanceID].killed
  );
};

const turnOn = (instanceID: string) => {
  if (serverDB.get(instanceID) == undefined)
    return {
      error: "Instance not found",
      success: false,
    };

  if (isOnline(instanceID))
    return {
      error: "Instance already running",
      success: false,
    };

  const instance: Instance = serverDB.get(instanceID);

  const serverDir = configDB.get("serverDir");
  const jarDir = configDB.get("jarDir");
  const jarPath = path.join(jarDir, instance.config.jar);
  const serverPath = path.join(serverDir, instanceID);

  const port = instance.config.port;

  const child = spawn(
    instance.config.javaCommand == ""
      ? "java"
      : instance.config.javaCommand || "java",
    [
      "-Xmx" + instance.config.ram + "M",
      `-Dcom.mojang.eula.agree=true`,
      ...(instance.config.javaArgs || "").split(" "),
      "-jar",
      jarPath,
      "--nogui",
      `-p${port || 25565}`,
      ...(instance.config.mcArgs || "").split(" "),
    ].filter((x) => x),
    {
      cwd: serverPath,
    }
  );

  console.log(
    instance.config.javaCommand == ""
      ? "java"
      : instance.config.javaCommand || "java",
    [
      "-Xmx" + instance.config.ram + "M",
      instance.config.javaArgs || "",
      "-jar",
      jarPath,
      "--nogui",
      `-p${port || 25565}`,
      instance.config.mcArgs || "",
    ].filter((x) => x),
    {
      cwd: serverPath,
      shell: true,
    }
  );

  ipcEmit("instance", instanceID, "on");

  buffer[instanceID] = "";

  child.stdout.on("data", (data) => {
    console.log(`[${instanceID}] ${data}`);
    buffer[instanceID] += data
      .toString()
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((x: string) => x.trim())
      .join("\r\n");
    ipcEmit(`instance:${instanceID}:stdout`, data.toString());

    if (buffer[instanceID].length > 10000) {
      buffer[instanceID] = buffer[instanceID].slice(-10000);
    }
  });
  child.stderr.on("data", (data) => {
    console.error(`[${instanceID}] ${data}`);
    buffer[instanceID] += data
      .toString()
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((x: string) => x.trim())
      .join("\r\n");
    ipcEmit(`instance:${instanceID}:stderr`, data.toString());

    if (buffer[instanceID].length > 10000) {
      buffer[instanceID] = buffer[instanceID].slice(-10000);
    }
  });
  child.on("close", (code) => {
    console.log(`[${instanceID}] Child process exited with code ${code}`);
    ipcEmit("instance", instanceID, "off");
    ipcEmit(`instance:${instanceID}:off`);
    delete childProcesses[instanceID];
  });
  child.on("error", (err) => {
    console.error(`[${instanceID}] Child process error ${err}`);
  });
  ipcEmit("instance", instanceID, "on");
  ipcEmit(`instance:${instanceID}:on`);

  childProcesses[instanceID] = child;
  return {
    error: null,
    success: true,
  };
};

const getConfig = (instanceID: string) => {
  const cfg = serverDB.get(instanceID);
  // # Mock Data
  //   return {
  //     error: null,
  //     success: true,
  //     config: {
  //       info: {
  //         name: "test",
  //         id: "id",
  //       },
  //       config: {
  //         ram: 1024,
  //         jar: "1.19.2-paper.jar",
  //         port: 25565,
  //       },
  //     } as Instance,
  //   };
  return {
    error: cfg == undefined ? "Instance not found" : null,
    success: cfg != undefined,
    config: cfg as Instance,
  };
};

const runCommand = (instanceID: string, command: string) => {
  if (serverDB.get(instanceID) == undefined)
    return {
      error: "Instance not found",
      success: false,
    };
  if (!isOnline(instanceID))
    return {
      error: "Instance is not running",
      success: false,
    };

  childProcesses[instanceID].stdin?.write(command + "\n");
  return {
    error: null,
    success: true,
  };
};

const i = serverDB.get("instances");
if (i == undefined) serverDB.set("instances", []);

const getInstances = () => {
  return serverDB.get("instances").map((id: string) => {
    return {
      id: id,
      name: serverDB.get(id).info.name,
      online: isOnline(id),
    };
  });
};

const docsFile = path.join(__dirname, "..", "docs", "api.json");
const docsContent = readFileSync(docsFile, "utf-8").toString();

export const API_Handler = async (request: Request) => {
  const path = new URL(request.url).pathname;
  const query = new URL(request.url).searchParams;
  console.log("[API]", request.method, path + "?" + query.toString());

  if (path == "/") {
    return new Response(docsContent, { status: 200 });
  }
  if (path == "/turnon")
    return new Response(JSON.stringify(turnOn(query.get("id")!)), {
      status: 200,
    });
  if (path == "/isOnline")
    return new Response(
      JSON.stringify({
        online: isOnline(query.get("id")!),
      }),
      {
        status: 200,
      }
    );
  if (path == "/getConfig")
    return new Response(JSON.stringify(getConfig(query.get("id")!)), {
      status: 200,
    });
  if (path == "/getInstances")
    return new Response(JSON.stringify(getInstances()), {
      status: 200,
    });
  if (path == "/createInstance") {
    const body = (await request.json()) as {
      name: string;
      port: string;
      ram: string;
      java: string;
      javaArgs: string;
      mcArgs: string;
      jar: string;
    };
    const id =
      Math.random().toString(36).substring(7) +
      "-" +
      Math.random().toString(36).substring(7);

    serverDB.set(id, {
      info: {
        name: body.name,
        id: id,
      },
      config: {
        ram: parseInt(body.ram),
        jar: body.jar,
        port: parseInt(body.port),
        javaCommand: body.java,
        javaArgs: body.javaArgs,
        mcArgs: body.mcArgs,
      },
    });
    serverDB.set("instances", [...serverDB.get("instances"), id]);
    const svdir = join(configDB.get("serverDir"), id);
    ensureDir(svdir);
    ensureDir(join(svdir, "plugins"));

    return new Response(JSON.stringify({ id: id }), { status: 200 });
  }
  if (path == "/modifyInstance") {
    const body = (await request.json()) as {
      cfg: {
        name: string;
        port: string;
        ram: string;
        java: string;
        javaArgs: string;
        mcArgs: string;
        jar: string;
      };
      id: string;
    };

    const id = body.id;
    const cfg = body.cfg;
    if (serverDB.get(id) == undefined)
      return new Response(JSON.stringify({ error: "Instance not found" }), {
        status: 200,
      });
    if (isOnline(id))
      return new Response(JSON.stringify({ error: "Instance is running" }), {
        status: 200,
      });
    serverDB.set(id, {
      info: {
        name: cfg.name,
        id: id,
      },
      config: {
        ram: parseInt(cfg.ram),
        jar: cfg.jar,
        port: parseInt(cfg.port),
        javaCommand: cfg.java,
        javaArgs: cfg.javaArgs,
        mcArgs: cfg.mcArgs,
      },
    });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }
  if (path == "/runCommand") {
    const body = (await request.json()) as {
      id: string;
      command: string;
    };
    return new Response(JSON.stringify(runCommand(body.id, body.command)), {
      status: 200,
    });
  }
  if (path == "/getlogs")
    return new Response(buffer[query.get("id")!], {
      status: 200,
    });
  if (path == "/deleteInstance") {
    const id = query.get("id")!;
    if (serverDB.get(id) == undefined)
      return new Response(
        JSON.stringify({ error: "Instance not found", success: false }),
        {
          status: 200,
        }
      );
    if (isOnline(id))
      return new Response(
        JSON.stringify({ error: "Instance is running", success: false }),
        {
          status: 200,
        }
      );
    serverDB.set(
      "instances",
      serverDB.get("instances").filter((x: string) => x != id)
    );
    serverDB.delete(id);
    rmSync(join(configDB.get("serverDir"), id), {
      recursive: true,
      force: true,
    });
    return new Response(JSON.stringify({ error: null, success: true }), {
      status: 200,
    });
  }
  return new Response("Not Found", { status: 404 });
};
