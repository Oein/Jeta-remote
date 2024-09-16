const socket = new io();

socket.on("connect", () => {
  console.log("connected");
});

const API = {
  /**
   *
   * @param {string} id
   * @returns {Promise<{
   *      error: string;
   *       success: boolean;
   *   } | {
   *       error: null;
   *       success: boolean;
   *   }>}
   */
  turnOn: (id) => {
    return fetch(`/api/turnon?id=${id}`, {
      method: "POST",
    }).then((res) => res.json());
  },
  /**
   *
   * @param {string} id
   * @returns {Promise<{
   *  online: boolean;
   * }>}
   */
  isOnline: (id) => {
    return fetch(`/api/isOnline?id=${id}`).then((res) => res.json());
  },
  /**
   *
   * @param {string} id
   * @returns {Promise<{
   *    error: string | null;
   *    success: boolean;
   *    config: any;
   * }>}
   */
  getConfig: (id) => {
    return fetch(`/api/getConfig?id=${id}`).then((res) => res.json());
  },
  /**
   * @returns {Promise<{
   *    id: string;
   *    name: string;
   *    online: boolean;
   * }[]>}
   */
  getInstances: () => {
    return fetch(`/api/getInstances`).then((res) => res.json());
  },
  /**
   *
   * @param {string} bukkit
   * @returns {Promise<string[]>}
   */
  getBukkitVersions: (bukkit) => {
    // return Promise.resolve(
    //   [
    //     "1.8",
    //     "1.9",
    //     "1.10",
    //     "1.11",
    //     "1.12",
    //     "1.13",
    //     "1.14",
    //     "1.15",
    //     "1.16",
    //     "1.17",
    //     "1.18",
    //     "1.19",
    //     "1.20",
    //     "1.21",
    //   ].reverse()
    // );
    return fetch(`/bukkit/versions?bukkit=${bukkit}`).then((res) => res.json());
  },
  /**
   *
   * @param {string} bukkit
   * @param {string} version
   * @returns {Promise<string[]>}
   */
  getBuilds: (bukkit, version) => {
    return fetch(`/bukkit/builds?bukkit=${bukkit}&version=${version}`).then(
      (res) => res.json()
    );
  },
  /**
   * @param {string} bukkit
   * @param {string} version
   * @returns {Promise<{boolean}>}
   */
  hasVersion: (bukkit, version) => {
    return fetch(`/bukkit/hasVersion?bukkit=${bukkit}&version=${version}`).then(
      (res) => res.json()
    );
  },
  /**
   * @param {string} bukkit
   * @param {string} version
   * @param {string} build
   * @returns {Promise<{boolean}>}
   */
  hasBuild: (bukkit, version, build) => {
    return fetch(
      `/bukkit/hasBuild?bukkit=${bukkit}&version=${version}&build=${build}`
    ).then((res) => res.json());
  },
  /**
   *
   * @param {string} bukkit
   * @param {string} version
   * @param {string} build
   * @returns {Promise<{have: boolean;}>}
   */
  downloadJar: (bukkit, version, build) => {
    return fetch(
      `/bukkit/downloadJar?bukkit=${bukkit}&version=${version}&build=${build}`
    ).then((res) => res.json());
  },
  /**
   *
   * @param {{
   *   name: string;
   *   port: string;
   *   ram: string;
   *   java: string;
   *   javaArgs: string;
   *   mcArgs: string;
   *   jar: string;
   * }} data
   * @returns {Promise<{id: string}>}
   */
  createServer: (data) => {
    return fetch(`/api/createInstance`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    }).then((res) => res.json());
  },
  /**
   *
   * @param {string} id
   * @param {string} command
   * @returns {Promise<{error: string; success: false;} | {error: null; success: true;}>}
   */
  runCommand: (id, command) => {
    return fetch(`/api/runCommand`, {
      method: "POST",
      body: JSON.stringify({ id, command }),
      headers: {
        "Content-Type": "application/json",
      },
    }).then((res) => res.json());
  },
  /**
   *
   * @param {string} id
   * @param {{
   *     name: string;
   *     port: string;
   *     ram: string;
   *     java: string;
   *     javaArgs: string;
   *     mcArgs: string;
   *     jar: string;
   *   }} data
   * @returns
   */
  modifyConfig: (id, data) => {
    return fetch(`/api/modifyInstance`, {
      method: "POST",
      body: JSON.stringify({ id, cfg: data }),
      headers: {
        "Content-Type": "application/json",
      },
    }).then((res) => res.json());
  },
  /**
   *
   * @param {string} id
   * @returns {Promise<{success: true; error: null;} | {success: false; error: string;}>}
   */
  removeInstance: (id) => {
    return fetch(`/api/deleteInstance?id=${id}`).then((res) => res.json());
  },
  /**
   *
   * @param {string} id
   * @returns {Promise<string>}
   */
  getLogs: (id) => {
    return fetch(`/api/getlogs?id=${id}`).then((res) => res.text());
  },
};

const validateInfo = (info) => {
  const isNumber = (str) => /^\d+$/.test(str);
  if (!isNumber(info.port) || !isNumber(info.ram)) {
    notyf.error("Port and RAM must be numbers");
    return false;
  }
  if (info.jar === "No file selected") {
    notyf.error("Please select a jar file");
    return false;
  }
  if (info.name === "") {
    notyf.error("Please enter a name");
    return false;
  }
  if (info.port < 1024 || info.port > 65535) {
    notyf.error("Port must be between 1024 and 65535");
    return false;
  }
  if (info.ram < 512) {
    notyf.error("RAM must be at least 512MB");
    return false;
  }
  if (info.jar === "") {
    notyf.error("Please select a jar file");
    return false;
  }
  return true;
};

const notyf = new Notyf();
const evkv = {};
const ipcRenderer = {
  on: (event, handler) => {
    console.log("ipcRenderer.on", event);
    const wrp = (...args) => {
      handler(undefined, ...args);
    };
    evkv[event] = wrp;
    socket.on(event, wrp);
  },
  removeListener: (event, handler) => {
    console.log("ipcRenderer.removeListener", event);
    socket.off(event, evkv[handler]);
    delete evkv[handler];
  },
  once: (event, handler) => {
    console.log("ipcRenderer.once", event);
    const wrp = (...args) => {
      handler(undefined, ...args);
      delete evkv[handler];
    };
    evkv[handler] = wrp;
    socket.once(event, wrp);
  },
  off: (event, handler) => {
    console.log("ipcRenderer.off", event);
    const wrp = evkv[handler];
    socket.off(event, wrp);
    delete evkv[handler];
  },
};

/**
 *
 * @returns {Promise<boolean>}
 */
const confirmDel = () => {
  return new Promise((resolve) => {
    const template = document.getElementById("confirmmod");
    const clone = template.content.cloneNode(true);
    const cfmodal = document.getElementById("confirm-modal");
    cfmodal.appendChild(clone);
    let resolved = false;

    document.getElementById("close-moda").addEventListener("click", () => {
      resolved = true;
      resolve(false);
      modal.hide();
    });
    document.getElementById("no-moda").addEventListener("click", () => {
      resolved = true;
      resolve(false);
      modal.hide();
    });
    document.getElementById("yes-moda").addEventListener("click", () => {
      resolved = true;
      resolve(true);
      modal.hide();
    });

    const modal = new Modal(cfmodal, {
      onHide: () => {
        cfmodal.innerHTML = "";
        if (!resolved) resolve(false);
      },
    });
    modal.show();
  });
};

/**
 *
 * @param {{
 *   name: string;
 *   online: boolean;
 *   id: string;
 * }} server
 */
const opemMenuDrawer = (server) => {
  const template = document.getElementById("servermenuformtemp");
  const clone = template.content.cloneNode(true);
  // append to drawer-server
  document.getElementById("drawer-server").appendChild(clone);
  document.getElementById("serverJarFile").addEventListener("click", () => {
    selectJAR().then((jar) => {
      if (jar == null)
        document.getElementById("serverJarFile").innerText = "No file selected";
      else document.getElementById("serverJarFile").innerText = jar.name;
    });
  });
  document
    .getElementById("submit-server-data")
    .addEventListener("click", () => {
      const v = (id) => document.getElementById(id).value;
      const data = {
        name: v("serverName"),
        port: v("serverPort"),
        ram: v("serverRamAlloc"),
        java: v("serverJavaCommand"),
        javaArgs: v("serverJavaArgs"),
        mcArgs: v("serverMinecraftArgs"),
        jar: document.getElementById("serverJarFile").innerText,
      };

      if (!validateInfo(data)) return;
      API.modifyConfig(server.id, data).then((res) => {
        if (res.success) {
          notyf.success("Server config updated");
        } else {
          notyf.error(res.error);
        }
      });
    });
  document
    .getElementById("delete-server-data")
    .addEventListener("click", () => {
      confirmDel().then((res) => {
        if (!res) return;
        drawer.hide();
        API.removeInstance(server.id).then((res) => {
          if (res.success) {
            notyf.success("Server deleted");
            document
              .querySelector(`tr[data-server-id="${server.id}"]`)
              .remove();
            loadServers();
          } else {
            notyf.error(res.error);
          }
        });
      });
    });
  const drawer = new Drawer(document.getElementById("drawer-server"), {
    onHide: () => {
      document.getElementById("servermenuform").remove();
    },
  });
  drawer.show();
  API.getConfig(server.id).then((res) => {
    if (!res.config) return;
    /**
     * @type {{
     *   info: {
     *     name: string;
     *     id: string;
     *   };
     *   config: {
     *     ram: number;
     *     jar: string;
     *     port: number;
     *     javaCommand?: string;
     *     javaArgs?: string;
     *     mcArgs?: string;
     *   };
     * }}
     */
    const cfg = res.config;
    document.getElementById("serverName").value = cfg.info.name;
    document.getElementById("serverPort").value = cfg.config.port;
    document.getElementById("serverRamAlloc").value = cfg.config.ram;
    document.getElementById("serverJavaCommand").value =
      cfg.config.javaCommand || "";
    document.getElementById("serverJavaArgs").value = cfg.config.javaArgs || "";
    document.getElementById("serverMinecraftArgs").value =
      cfg.config.mcArgs || "";
    document.getElementById("serverJarFile").innerText = cfg.config.jar;
  });
};

/**
 *
 * @param {{
 *   name: string;
 *   online: boolean;
 *   id: string;
 * }} server
 */
const openServerDrawer = (server) => {
  document.getElementById("drawer-server").style.width = "80vw";
  const template = document.getElementById("serverterminaltemp");
  const clone = template.content.cloneNode(true);
  // append to drawer-server
  document.getElementById("drawer-server").appendChild(clone);
  // Init terminal with id terminal
  const terminal = new Terminal({
    cursorBlink: false,
    cursorInactiveStyle: "none",
  });
  const fitAddon = new FitAddon.FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.open(document.getElementById("terminal"));

  const resizeHandler = () => {
    let proposedDimensions = fitAddon.proposeDimensions();
    terminal.resize(proposedDimensions.cols + 1, proposedDimensions.rows + 1);
  };

  /**
   *
   * @param {boolean} turnedon
   */
  const setOverlay = (turnedon) => {
    const offlineOverlay = document.getElementById("offlineOverlay");

    if (turnedon) {
      offlineOverlay.classList.add("hidden");
    } else {
      offlineOverlay.classList.remove("hidden");
    }
  };

  const onHandler = () => setOverlay(true);
  const offHandler = () => setOverlay(false);
  const stdHandler = (event, data) =>
    terminal.write(
      data
        .toString()
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((x) => x.trim())
        .join("\r\n")
    );

  API.getLogs(server.id).then((logs) => {
    terminal.write(logs);
  });

  ipcRenderer.on(`instance:${server.id}:on`, onHandler);
  ipcRenderer.on(`instance:${server.id}:off`, offHandler);
  ipcRenderer.on(`instance:${server.id}:stderr`, stdHandler);
  ipcRenderer.on(`instance:${server.id}:stdout`, stdHandler);

  const drawer = new Drawer(document.getElementById("drawer-server"), {
    onHide: () => {
      terminal.dispose();
      document.getElementById("serverterminal").remove();
      window.removeEventListener("resize", resizeHandler);
      ipcRenderer.removeListener(`instance:${server.id}:on`, onHandler);
      ipcRenderer.removeListener(`instance:${server.id}:off`, offHandler);
      ipcRenderer.removeListener(`instance:${server.id}:stderr`, stdHandler);
      ipcRenderer.removeListener(`instance:${server.id}:stdout`, stdHandler);
      document.getElementById("drawer-server").style.width = null;
    },
  });

  drawer.show();
  setOverlay(server.online);
  API.isOnline(server.id).then((res) => {
    setOverlay(res.online);
  });
  fitAddon.fit();
  window.addEventListener("resize", resizeHandler);

  document.getElementById("turnOnButton").addEventListener("click", () => {
    API.turnOn(server.id).then((res) => {
      if (res.success) {
        setOverlay(true);
      }
    });
  });
  document.getElementById("sendButton").addEventListener("click", () => {
    const inp = document.getElementById("userInput");
    API.runCommand(server.id, inp.value);
    inp.value = "";
  });
  document.getElementById("userInput").addEventListener("keyup", (e) => {
    if (e.repeat) return;
    if (e.key === "Enter") {
      document.getElementById("sendButton").click();
      document.getElementById("userInput").focus();
    }
  });
};

/**
 *
 * @param {{
 *   name: string;
 *   online: boolean;
 *   id: string;
 * }} server
 */
const createServerRow = (server) => {
  const tr = document.createElement("tr");
  tr.classList.add(
    "bg-white",
    "border-b",
    "dark:bg-gray-800",
    "dark:border-gray-700"
  );
  tr.setAttribute("data-server-id", server.id);

  const th = document.createElement("th");
  th.setAttribute("scope", "row");
  th.classList.add(
    "px-6",
    "py-4",
    "font-medium",
    "text-gray-900",
    "whitespace-nowrap",
    "dark:text-white"
  );
  th.innerText = server.name;

  const td0 = document.createElement("td");
  td0.classList.add("px-6", "py-4");
  td0.innerText = server.id;

  tr.appendChild(td0);
  tr.appendChild(th);

  const td1 = document.createElement("td");
  td1.classList.add("px-6", "py-4", "select-none");

  const div1 = document.createElement("div");
  div1.classList.add("rounded-full", "px-3", "py-1", "text-white", "w-fit");
  div1.innerText = server.online ? "Online" : "Offline";
  div1.classList.add(server.online ? "bg-green-500" : "bg-red-500");

  td1.appendChild(div1);
  tr.appendChild(td1);

  const td2 = document.createElement("td");
  td2.classList.add("px-6", "py-4");

  const div2 = document.createElement("div");
  div2.classList.add("flex", "gap-1");

  const consoleButton = document.createElement("div");
  consoleButton.setAttribute("data-drawer-target", "drawer-server");
  consoleButton.setAttribute("data-drawer-show", "drawer-server");
  consoleButton.setAttribute("aria-controls", "drawer-server");
  consoleButton.classList.add("w-fit", "cursor-pointer", "select-none");

  consoleButton.innerHTML = `<svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M3 4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H3Zm4.293 5.707a1 1 0 0 1 1.414-1.414l3 3a1 1 0 0 1 0 1.414l-3 3a1 1 0 0 1-1.414-1.414L9.586 12 7.293 9.707ZM13 14a1 1 0 1 0 0 2h3a1 1 0 1 0 0-2h-3Z" clip-rule="evenodd" /></svg>`;
  consoleButton.addEventListener("click", () => {
    openServerDrawer(server);
  });
  div2.appendChild(consoleButton);

  const settingsButton = document.createElement("div");
  settingsButton.setAttribute("data-drawer-target", "drawer-server");
  settingsButton.setAttribute("data-drawer-show", "drawer-server");
  settingsButton.setAttribute("aria-controls", "drawer-server");
  settingsButton.classList.add("w-fit", "cursor-pointer", "select-none");
  settingsButton.addEventListener("click", () => {
    opemMenuDrawer(server);
  });

  settingsButton.innerHTML = `<svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M20 6H10m0 0a2 2 0 1 0-4 0m4 0a2 2 0 1 1-4 0m0 0H4m16 6h-2m0 0a2 2 0 1 0-4 0m4 0a2 2 0 1 1-4 0m0 0H4m16 6H10m0 0a2 2 0 1 0-4 0m4 0a2 2 0 1 1-4 0m0 0H4"/></svg>`;
  div2.appendChild(settingsButton);

  td2.appendChild(div2);
  tr.appendChild(td2);

  return tr;
};

/**
 *
 * @returns {Promise<{
 *    name: string; // aka filename
 * } | null>}
 */
const selectJAR = () => {
  return new Promise((resolve) => {
    const template = document.getElementById("jarsel");
    const clone = template.content.cloneNode(true);
    // append to #jarselbody
    document.getElementById("jarselbody").appendChild(clone);

    const jartabs = document.querySelectorAll("#jartabs > *");
    /**
     *
     * @param {string} id
     */
    jartabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        jartabs.forEach(
          (tab) =>
            (tab.children[0].className =
              "inline-block p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300")
        );
        tab.children[0].className =
          "inline-block p-4 text-blue-600 border-b-2 border-transparent rounded-t-lg dark:text-blue-500 dark:border-blue-500";
        loadTab(tab.getAttribute("data-tab"));
      });
    });

    const SVG = {
      now: `<svg class="rtl:rotate-180 w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9"/>
</svg>`,
      done: `<svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 12">
<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5.917 5.724 10.5 15 1.5"/>
</svg>`,
    };
    const SKELETON = `<div class="flex flex-col gap-2 p-2 border-b dark:border-gray-700 cursor-pointer"><div class="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-$w"></div></div>`;
    const jarcontent = document.getElementById("jarcontent");
    let canClose = true;

    const setupSkeleton = () => {
      jarcontent.innerHTML = "";
      for (let i = 0; i < Math.floor(Math.random() * 10) + 5; i++) {
        const wItems = ["16", "12", "20", "24", "32"];
        jarcontent.innerHTML += SKELETON.replace(
          "$w",
          wItems[Math.floor(Math.random() * wItems.length)]
        );
      }
    };

    /**
     *
     * @param {number} step
     */
    const focusOnStep = (stepNum) => {
      const classes = {
        unsel:
          "w-full px-3 py-2 text-gray-900 bg-gray-100 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400",
        now: "w-full px-3 py-2 text-blue-700 bg-blue-100 border border-blue-300 rounded-lg dark:bg-gray-800 dark:border-blue-800 dark:text-blue-400",
        done: "w-full px-3 py-2 text-green-700 border border-green-300 rounded-lg bg-green-50 dark:bg-gray-800 dark:border-green-800 dark:text-green-400",
      };

      const steps = document.querySelectorAll("ol#jarsteps > li > div");
      steps.forEach((step, i) => {
        step.querySelectorAll("svg").forEach((svg) => svg.remove());
        if (i === stepNum) {
          step.className = classes.now;
          step.children[0].innerHTML += SVG.now;
        } else if (i < stepNum) {
          step.className = classes.done;
          step.children[0].innerHTML += SVG.done;
        } else step.className = classes.unsel;
      });
    };

    const modal = new Modal(document.getElementById("jar-modal"), {
      onHide: () => {
        document.getElementById("jarselbody").innerHTML = "";
        if (canClose) return resolve(null);
      },
      closable: false,
    });

    const DOWNLOADVIEW_HTML = {
      DONE: `<div
            class="flex flex-col items-center justify-center space-y-4 p-4 w-full h-full"
          >
            <h4>Done!</h4>
            <div class="w-full">
              <div class="w-full bg-gray-200 rounded-full dark:bg-gray-700">
                <div
                  class="bg-green-500 text-xs font-medium text-green-100 text-center p-0.5 leading-none rounded-full"
                  style="width: 100%"
                >
                  100%
                </div>
              </div>
            </div>
            <p class="text-center text-gray-500 dark:text-gray-400 text-sm">
              Your jar file has been downloaded successfully.
            </p>
          </div>`,
      WORK: `<div
            class="flex flex-col items-center justify-center space-y-4 p-4 w-full h-full"
          >
            <h4>Downloading...</h4>
            <div class="w-full">
              <div class="w-full bg-gray-200 rounded-full dark:bg-gray-700">
                <div
                  class="bg-blue-600 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full"
                  style="width: 0%"
                  id="projarbar"
                >
                  0%
                </div>
              </div>
            </div>
          </div>`,
    };

    const setupDownloadView = (bukkit, version, build) => {
      canClose = false;
      jarcontent.innerHTML = DOWNLOADVIEW_HTML.WORK;
      const projarbar = document.getElementById("projarbar");

      const setPercentage = (percentage) => {
        projarbar.style.width = `${percentage}%`;
        projarbar.innerText = `${percentage}%`;
      };

      const evListener = (event, percentage) => {
        setPercentage(percentage);
      };
      ipcRenderer.on("dlprogress", evListener);
      const dlcomp = () => {
        ipcRenderer.off("dlprogress", evListener);
        jarcontent.innerHTML = DOWNLOADVIEW_HTML.DONE;
        setTimeout(() => {
          modal.hide();
          resolve({
            name: `${bukkit}/${version}/${build}.jar`,
          });
        }, 3000);
      };
      ipcRenderer.once("dlcomp", dlcomp);

      API.downloadJar(bukkit, version, build).then((res) => {
        if (res.have) {
          ipcRenderer.off("dlprogress", evListener);
          jarcontent.innerHTML = DOWNLOADVIEW_HTML.DONE;
          resolve({
            name: `${bukkit}/${version}/${build}.jar`,
          });
          modal.hide();
        }
      });
    };

    /**
     *
     * @param {string} bukkit
     * @param {string} version
     */
    const setupBuildView = (bukkit, version) => {
      API.getBuilds(bukkit, version).then((builds) => {
        jarcontent.innerHTML = "";
        builds.forEach((build) => {
          const div = document.createElement("div");
          div.className =
            "p-2 border-b dark:border-gray-700 cursor-pointer flex items-center gap-2";
          div.innerText = build;
          jarcontent.appendChild(div);
          API.hasBuild(bukkit, version, build).then((has) => {
            if (has) div.innerHTML = SVG.done + div.innerHTML;
          });

          div.addEventListener("click", () => {
            focusOnStep(2);
            setupDownloadView(bukkit, version, build);
          });
        });
      });
    };

    /**
     *
     * @param {string} bukkit
     */
    const setupVersionView = (bukkit) => {
      API.getBukkitVersions(bukkit).then((versions) => {
        jarcontent.innerHTML = "";
        versions.forEach((version) => {
          const div = document.createElement("div");
          div.className =
            "p-2 border-b dark:border-gray-700 cursor-pointer flex items-center gap-2";
          div.innerText = version;
          jarcontent.appendChild(div);
          API.hasVersion(bukkit, version).then((has) => {
            if (has) div.innerHTML = SVG.done + div.innerHTML;
          });

          div.addEventListener("click", () => {
            focusOnStep(1);
            setupSkeleton();
            setupBuildView(bukkit, version);
          });
        });
      });
    };

    /**
     *
     * @param {string} bukkit
     */
    const loadTab = (bukkit) => {
      focusOnStep(0);
      setupSkeleton();
      setupVersionView(bukkit);
    };

    document.getElementById("jar-modal-close").addEventListener("click", () => {
      if (canClose) modal.hide();
      else return;
    });

    loadTab("paper");

    modal.show();
  });
};

const serverlist = document.getElementById("serverlist");

let servers = [];

const loadServers = () => {
  API.getInstances().then((res) => {
    servers = res;
    serverlist.innerHTML = "";
    servers.forEach((server) => {
      serverlist.appendChild(createServerRow(server));
    });
  });
};

loadServers();

ipcRenderer.on(
  "instance",
  /**
   *
   * @param {*} event
   * @param {string} instanceid
   * @param {"on" | "off"} onoff
   */
  (event, instanceid, onoff) => {
    const server = servers.find((server) => server.id === instanceid);
    if (!server) return;
    server.online = onoff === "on";
    const row = serverlist.querySelector(`tr[data-server-id="${instanceid}"]`);
    if (!row) return;
    row.querySelector("div").innerText = server.online ? "Online" : "Offline";
    row.querySelector("div").classList.remove("bg-green-500", "bg-red-500");
    row
      .querySelector("div")
      .classList.add(server.online ? "bg-green-500" : "bg-red-500");
  }
);

document.getElementById("createServer").addEventListener("click", () => {
  let closeable = true;
  // copy from #servermenuformtemp
  const template = document.getElementById("servermenuformtemp");
  const clone = template.content.cloneNode(true);
  // append to #server-modal
  document.getElementById("modal-body").appendChild(clone);
  document.getElementById("submit-server-data").remove();
  document.getElementById("delete-server-data").remove();
  document.getElementById("serverJarFile").innerText = "No file selected";
  const sjf = () => {
    selectJAR().then((jar) => {
      if (jar == null)
        document.getElementById("serverJarFile").innerText = "No file selected";
      else document.getElementById("serverJarFile").innerText = jar.name;
    });
  };
  document.getElementById("serverJarFile").addEventListener("click", sjf);
  const jc = () => {
    const v = (id) => document.getElementById(id).value;
    const info = {
      name: v("serverName").trim(),
      port: v("serverPort").trim(),
      ram: v("serverRamAlloc").trim(),
      java: v("serverJavaCommand").trim(),
      javaArgs: v("serverJavaArgs").trim(),
      mcArgs: v("serverMinecraftArgs").trim(),
      jar: document.getElementById("serverJarFile").innerText,
    };

    if (!validateInfo(info)) return;
    closeable = false;
    API.createServer(info).then((res) => {
      loadServers();
      console.log(res);
      notyf.success("Server created successfully");
      closeable = true;
      modal.hide();
    });
  };
  document.getElementById("jar-create").addEventListener("click", jc);

  const closeButton = document.getElementById("hide-server-modal");
  const closeHandler = () => {
    if (!closeable) return;
    modal.hide();
  };
  // show modal
  const modal = new Modal(document.getElementById("server-modal"), {
    onHide: () => {
      closeButton.removeEventListener("click", closeHandler);
      document
        .getElementById("serverJarFile")
        .removeEventListener("click", sjf);
      document.getElementById("jar-create").removeEventListener("click", jc);

      document.getElementById("modal-body").innerHTML = "";
    },
    closable: false,
  });
  closeButton.addEventListener("click", closeHandler);
  modal.show();
});

console.log("index.js loaded");
