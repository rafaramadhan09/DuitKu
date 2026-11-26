(function () {
  "use strict";

  var ROOT = "https://raw.githubusercontent.com/rafaramadhan09/DuitKu/main/";
  var APP_VERSION = (document.querySelector('meta[name="duitku-version"]') || {}).content || "1.6.0";
  var scriptStarted = false;
  var localScriptStarted = false;
  var cachedManifest = null;

  function parseVersion(value) {
    var match = String(value || "").trim().replace(/^v/i, "").match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
    if (!match) return null;
    return { core: [Number(match[1]), Number(match[2]), Number(match[3])] };
  }

  function compareVersions(left, right) {
    var a = parseVersion(left), b = parseVersion(right);
    if (!a || !b) return String(left).localeCompare(String(right));
    for (var i = 0; i < 3; i++) {
      if (a.core[i] !== b.core[i]) return a.core[i] > b.core[i] ? 1 : -1;
    }
    return 0;
  }

  function isLowPowerDevice() {
    var cores = Number(navigator.hardwareConcurrency) || 0;
    var memory = Number(navigator.deviceMemory) || 0;
    return (cores > 0 && cores <= 4) || (memory > 0 && memory <= 4);
  }

  function applyPerformanceClass() {
    var mode = "auto";
    try { mode = localStorage.getItem("duitku-performance-mode") || "auto"; } catch (error) {}
    var lite = mode === "light" || (mode === "auto" && isLowPowerDevice());
    document.documentElement.classList.toggle("lite-mode", lite);
  }

  function loadLocalScript() {
    if (scriptStarted || localScriptStarted) return;
    localScriptStarted = true;
    var script = document.createElement("script");
    script.src = "./app.js";
    script.onerror = function () {
      var status = document.getElementById("updateStatus");
      if (status) status.textContent = "DuitKu belum dapat memuat fitur lokal. Tutup lalu buka kembali aplikasi.";
    };
    document.body.appendChild(script);
  }

  function fetchText(path) {
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timeout = controller ? setTimeout(function () { controller.abort(); }, 5500) : null;
    var options = { method: "GET", cache: "no-store" };
    if (controller) options.signal = controller.signal;
    return fetch(ROOT + path + (path.indexOf("?") >= 0 ? "&" : "?") + "duitku=" + Date.now(), options)
      .then(function (response) {
        if (!response.ok) throw new Error("Paket update tidak tersedia (" + response.status + ").");
        return response.text();
      })
      .finally(function () {
        if (timeout) clearTimeout(timeout);
      });
  }

  async function check() {
    var source = await fetchText("update.json");
    var manifest;
    try { manifest = JSON.parse(source); } catch (error) {
      throw new Error("Manifest pembaruan DuitKu tidak valid.");
    }
    if (!manifest || !parseVersion(manifest.version)) {
      throw new Error("Versi pembaruan DuitKu tidak valid.");
    }
    cachedManifest = manifest;
    return {
      version: manifest.version,
      available: compareVersions(manifest.version, APP_VERSION) > 0,
      message: manifest.message || "Pembaruan fitur dan tampilan tersedia langsung di dalam DuitKu."
    };
  }

  async function downloadBundle(expectedVersion) {
    var results = await Promise.all([
      fetchText("index.html"),
      fetchText("styles.css"),
      fetchText("app.js")
    ]);
    var remoteDocument = new DOMParser().parseFromString(results[0], "text/html");
    var remoteMeta = remoteDocument.querySelector('meta[name="duitku-version"]');
    var remoteVersion = remoteMeta ? remoteMeta.content : "";
    if (!parseVersion(remoteVersion) || compareVersions(remoteVersion, expectedVersion) !== 0) {
      throw new Error("Versi aset update tidak cocok. Coba periksa lagi.");
    }
    if (!remoteDocument.body || !results[1].trim() || !results[2].trim()) {
      throw new Error("Paket update DuitKu belum lengkap.");
    }
    return {
      document: remoteDocument,
      css: results[1],
      js: results[2],
      version: remoteVersion
    };
  }

  function applyBundle(bundle) {
    var meta = document.querySelector('meta[name="duitku-version"]');
    document.body.innerHTML = bundle.document.body.innerHTML;
    if (meta) meta.content = bundle.version;
    if (bundle.document.title) document.title = bundle.document.title;

    var localStyle = document.querySelector('link[rel="stylesheet"]');
    if (localStyle) localStyle.disabled = true;
    var styleNode = document.getElementById("duitku-ota-style");
    if (!styleNode) {
      styleNode = document.createElement("style");
      styleNode.id = "duitku-ota-style";
      document.head.appendChild(styleNode);
    }
    styleNode.textContent = bundle.css;

    APP_VERSION = bundle.version;
    window.DUITKU_OTA_VERSION = bundle.version;
    window.DUITKU_UPDATE_SOURCE = "in-app";

    var script = document.createElement("script");
    script.text = bundle.js;
    document.body.appendChild(script);
  }

  async function apply() {
    var result = await check();
    if (!result.available) {
      return { applied: false, version: APP_VERSION };
    }
    var bundle = await downloadBundle(result.version);
    applyBundle(bundle);
    return { applied: true, version: bundle.version };
  }

  window.DuitKuUpdater = {
    check: check,
    apply: apply,
    getVersion: function () { return APP_VERSION; }
  };

  async function start() {
    applyPerformanceClass();
    if (!navigator.onLine) {
      loadLocalScript();
      return;
    }
    try {
      var result = await check();
      if (result.available) {
        var bundle = await downloadBundle(result.version);
        applyBundle(bundle);
        return;
      }
    } catch (error) {
      // Offline or slow networks must never block the local application.
    }
    loadLocalScript();
  }

  start();
})();
