(function () {
  "use strict";
  var ROOT = "https://raw.githubusercontent.com/rafaramadhan09/DuitKu/main/";
  var scriptStarted = false;

  function compare(left, right) {
    function parts(value) {
      var match = String(value || "").replace(/^v/i, "").match(/^(\d+)\.(\d+)\.(\d+)/);
      return match ? match.slice(1).map(Number) : [0, 0, 0];
    }
    var a = parts(left), b = parts(right);
    for (var i = 0; i < 3; i++) {
      if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
    }
    return 0;
  }

  function loadScript(source) {
    if (scriptStarted) return;
    scriptStarted = true;
    var script = document.createElement("script");
    script.src = source;
    script.onerror = function () {
      if (source !== "app.js") {
        scriptStarted = false;
        loadScript("app.js");
      }
    };
    document.body.appendChild(script);
  }

  async function start() {
    var meta = document.querySelector('meta[name="duitku-version"]');
    var localVersion = meta ? meta.content : "1.4.0";
    try {
      var response = await fetch(ROOT + "index.html?ota=" + Date.now(), { cache: "no-store" });
      if (!response.ok) throw new Error("OTA server unavailable");
      var remoteHtml = await response.text();
      var remoteDoc = new DOMParser().parseFromString(remoteHtml, "text/html");
      var remoteMeta = remoteDoc.querySelector('meta[name="duitku-version"]');
      var remoteVersion = remoteMeta ? remoteMeta.content : "";
      if (!remoteVersion || compare(remoteVersion, localVersion) <= 0) {
        loadScript("app.js");
        return;
      }

      document.body.innerHTML = remoteDoc.body.innerHTML;
      if (meta) meta.content = remoteVersion;
      if (remoteDoc.title) document.title = remoteDoc.title;
      var remoteStyle = ROOT + "styles.css?ota=" + encodeURIComponent(remoteVersion);
      var styleLink = document.querySelector('link[rel="stylesheet"]');
      if (styleLink) styleLink.href = remoteStyle;
      else {
        styleLink = document.createElement("link");
        styleLink.rel = "stylesheet";
        styleLink.href = remoteStyle;
        document.head.appendChild(styleLink);
      }
      window.DUITKU_OTA_VERSION = remoteVersion;
      loadScript(ROOT + "app.js?ota=" + encodeURIComponent(remoteVersion));
    } catch (error) {
      loadScript("app.js");
    }
  }

  start();
})();
