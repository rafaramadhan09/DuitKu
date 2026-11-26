(function () {
  "use strict";

  var STORAGE_KEY = "duitku-transactions-v1";
  var categories = {
    income: ["Gaji", "Bonus", "Hadiah", "Usaha", "Investasi", "Lainnya"],
    expense: ["Makanan", "Transportasi", "Belanja", "Tagihan", "Kesehatan", "Pendidikan", "Hiburan", "Rumah", "Lainnya"]
  };
  var icons = {
    Gaji: "▤", Bonus: "✦", Hadiah: "◇", Usaha: "▣", Investasi: "⌁",
    Makanan: "☕", Transportasi: "↗", Belanja: "▧", Tagihan: "▤",
    Kesehatan: "✚", Pendidikan: "▱", Hiburan: "♫", Rumah: "⌂", Lainnya: "•"
  };
  var currency = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  });

  var transactions = loadTransactions();
  var activeFilter = "all";
  var searchTerm = "";
  var editingTransactionId = null;
  var chartRange = 6;
  var walletSelect = document.getElementById("transactionWallet");

  var form = document.getElementById("transactionForm");
  var typeInputs = document.querySelectorAll('input[name="type"]');
  var categorySelect = document.getElementById("transactionCategory");
  var transactionRows = document.getElementById("transactionRows");
  var emptyState = document.getElementById("emptyState");
  var searchInput = document.getElementById("searchInput");
  var feedback = document.getElementById("formFeedback");

  function localDateString(date) {
    var d = date || new Date();
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function isValidDateString(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var date = new Date(value + "T00:00:00");
    return !Number.isNaN(date.getTime()) && localDateString(date) === value;
  }

  function monthKey(dateString) {
    return String(dateString || "").slice(0, 7);
  }

  function monthLabel(date) {
    return new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date);
  }

  function formatDate(dateString) {
    var date = new Date(dateString + "T00:00:00");
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  function money(value) {
    return currency.format(Number(value) || 0);
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function loadTransactions() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      var parsed = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (item) {
        return item && typeof item.id === "string" && item.id.length > 0 &&
          (item.type === "income" || item.type === "expense" || item.type === "transfer") &&
          (item.type !== "transfer" || (
            (item.fromWallet === "bank" || item.fromWallet === "cash") &&
            (item.toWallet === "bank" || item.toWallet === "cash") &&
            item.fromWallet !== item.toWallet
          )) &&
          typeof item.name === "string" && item.name.trim().length > 0 &&
          Number.isSafeInteger(Number(item.amount)) && Number(item.amount) > 0 &&
          isValidDateString(item.date) &&
          typeof item.category === "string" && item.category.trim().length > 0;
      }).map(function (item) {
        item.amount = Number(item.amount);
        item.wallet = item.wallet === "cash" ? "cash" : "bank";
        if (item.type === "transfer") {
          item.fromWallet = item.fromWallet === "cash" ? "cash" : "bank";
          item.toWallet = item.toWallet === "cash" ? "cash" : "bank";
          item.wallet = item.fromWallet;
        }
        item.note = typeof item.note === "string" ? item.note : "";
        return item;
      });
    } catch (error) { return []; }
  }

  function saveTransactions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
      return true;
    } catch (error) {
      showFeedback("Penyimpanan browser penuh atau tidak tersedia.", true);
      showToast("Data belum tersimpan. Periksa ruang penyimpanan perangkat.", true);
      return false;
    }
  }

  function showFeedback(message, isError) {
    feedback.textContent = message || "";
    feedback.style.color = isError ? "#c96058" : "";
  }

  var toastTimer = null;

  function showToast(message, isError) {
    var toast = document.getElementById("appToast");
    if (!toast) return;
    toast.textContent = message || "";
    toast.classList.toggle("is-error", Boolean(isError));
    toast.classList.add("visible");
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("visible");
    }, 2800);
  }

  function selectedType() {
    var checked = document.querySelector('input[name="type"]:checked');
    return checked ? checked.value : "income";
  }

  function updateCategoryOptions() {
    var type = selectedType();
    var previous = categorySelect.value;
    categorySelect.innerHTML = "";
    categories[type].forEach(function (category) {
      var option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categorySelect.appendChild(option);
    });
    if (categories[type].indexOf(previous) !== -1) categorySelect.value = previous;

    document.getElementById("incomeOption").classList.toggle("selected", type === "income");
    document.getElementById("expenseOption").classList.toggle("selected", type === "expense");
  }

  function totalsForMonth(key) {
    return transactions.reduce(function (totals, item) {
      if (item.type !== "transfer" && monthKey(item.date) === key) totals[item.type] += Number(item.amount);
      return totals;
    }, { income: 0, expense: 0 });
  }

  function walletBalances() {
    return transactions.reduce(function (totals, item) {
      var amount = Number(item.amount) || 0;
      if (item.type === "transfer") {
        var from = item.fromWallet === "cash" ? "cash" : "bank";
        var to = item.toWallet === "cash" ? "cash" : "bank";
        totals[from] -= amount;
        totals[to] += amount;
      } else {
        var wallet = item.wallet === "cash" ? "cash" : "bank";
        totals[wallet] += item.type === "income" ? amount : -amount;
      }
      return totals;
    }, { bank: 0, cash: 0 });
  }

  function renderSummary() {
    var now = new Date();
    var currentMonth = monthKey(localDateString());
    var totals = totalsForMonth(currentMonth);
    var allIncome = 0;
    var allExpense = 0;
    var monthTransactionCount = 0;
    transactions.forEach(function (item) {
      if (item.type === "income") allIncome += Number(item.amount);
      else if (item.type === "expense") allExpense += Number(item.amount);
      if (item.type !== "transfer" && monthKey(item.date) === currentMonth) monthTransactionCount++;
    });

    document.getElementById("balanceValue").textContent = money(allIncome - allExpense);
    var wallets = walletBalances();
    ["bankBalance", "bankBalancePage"].forEach(function (id) {
      var node = document.getElementById(id);
      if (node) node.textContent = money(wallets.bank);
    });
    ["cashBalance", "cashBalancePage"].forEach(function (id) {
      var node = document.getElementById(id);
      if (node) node.textContent = money(wallets.cash);
    });
    document.getElementById("incomeValue").textContent = money(totals.income);
    document.getElementById("expenseValue").textContent = money(totals.expense);

    var net = totals.income - totals.expense;
    var elapsedDays = Math.max(1, now.getDate());
    var rate = totals.income > 0 ? net / totals.income * 100 : 0;
    var netNode = document.getElementById("netFlowValue");
    var avgNode = document.getElementById("averageExpenseValue");
    var rateNode = document.getElementById("savingsRateValue");
    var rateMeter = document.getElementById("savingsRateMeter");
    var netFoot = document.getElementById("netFlowFoot");
    var countNode = document.getElementById("monthlyTransactionCount");
    if (netNode) {
      netNode.textContent = (net > 0 ? "+" : net < 0 ? "−" : "") + money(Math.abs(net));
      netNode.classList.toggle("is-negative", net < 0);
    }
    if (avgNode) avgNode.textContent = money(totals.expense / elapsedDays);
    if (rateNode) rateNode.textContent = totals.income > 0 ? Math.round(rate) + "%" : "—";
    if (rateMeter) rateMeter.style.width = Math.max(0, Math.min(100, rate)) + "%";
    if (netFoot) netFoot.textContent = net >= 0 ? "Arus kas bulan ini positif" : "Pengeluaran melebihi pemasukan";
    if (countNode) countNode.textContent = String(monthTransactionCount);

    function setStatRing(ringId, labelId, percentage, color, label) {
      var ring = document.getElementById(ringId);
      var ringLabel = document.getElementById(labelId);
      var bounded = Math.max(0, Math.min(100, Number(percentage) || 0));
      if (ring) {
        ring.style.setProperty("--ring-pct", bounded.toFixed(1) + "%");
        ring.style.setProperty("--ring-color", color);
      }
      if (ringLabel) ringLabel.textContent = label || Math.round(bounded) + "%";
    }
    var netRatio = totals.income > 0 ? Math.abs(net) / totals.income * 100 : 0;
    var averageDaily = totals.expense / elapsedDays;
    var peakDailyAverage = averageDaily;
    for (var monthOffset = 0; monthOffset < 6; monthOffset++) {
      var monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      var monthTotals = totalsForMonth(monthDate.getFullYear() + "-" +
        String(monthDate.getMonth() + 1).padStart(2, "0"));
      var daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
      peakDailyAverage = Math.max(peakDailyAverage, monthTotals.expense / daysInMonth);
    }
    var averageRing = peakDailyAverage > 0 ? averageDaily / peakDailyAverage * 100 : 0;
    setStatRing("netFlowRing", "netFlowRingLabel", netRatio,
      net < 0 ? "#c27b70" : "#4c956c", Math.round(Math.min(100, netRatio)) + "%");
    setStatRing("averageExpenseRing", "averageExpenseRingLabel", averageRing,
      "#c09a61", Math.round(averageRing) + "%");
    setStatRing("savingsRateRing", "savingsRateRingLabel", Math.max(0, rate),
      "#4c956c", Math.round(Math.max(0, Math.min(100, rate))) + "%");
    setStatRing("monthlyTransactionRing", "monthlyTransactionRingLabel",
      Math.min(100, monthTransactionCount / 30 * 100), "#b79a66",
      String(Math.min(30, monthTransactionCount)));
  }

  function renderCashflow() {
    var chart = document.getElementById("cashflowChart");
    var now = new Date();
    var months = [];
    for (var i = chartRange - 1; i >= 0; i--) {
      var date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
      months.push({ key: key, label: monthLabel(date), totals: totalsForMonth(key) });
    }

    var hasValues = months.some(function (item) {
      return item.totals.income > 0 || item.totals.expense > 0;
    });
    if (!hasValues) {
      chart.innerHTML = '<p class="chart-empty">Grafik akan terbentuk setelah ada transaksi pemasukan atau pengeluaran.</p>';
      return;
    }

    var maxValue = Math.max.apply(null, months.map(function (item) {
      return Math.max(item.totals.income, item.totals.expense);
    }).concat([1]));
    var left = 42, right = 430, top = 18, bottom = 137;
    var xStep = (right - left) / Math.max(1, months.length - 1);
    function yFor(value) { return bottom - (value / maxValue) * 104; }
    function pathFor(type) {
      return months.map(function (item, index) {
        return (index === 0 ? "M" : "L") + (left + xStep * index).toFixed(1) + "," +
          yFor(item.totals[type]).toFixed(1);
      }).join(" ");
    }
    function areaFor(type) {
      return "M" + left + "," + bottom + " " +
        months.map(function (item, index) {
          return "L" + (left + xStep * index).toFixed(1) + "," + yFor(item.totals[type]).toFixed(1);
        }).join(" ") + " L" + right + "," + bottom + " Z";
    }
    var incomePath = pathFor("income");
    var expensePath = pathFor("expense");
    var grid = [0, 1, 2, 3].map(function (index) {
      var y = top + index * 34;
      return '<line x1="' + left + '" y1="' + y + '" x2="' + right + '" y2="' + y +
        '" stroke="#edf1ed" stroke-width="1" stroke-dasharray="3 5"/>';
    }).join("");
    var incomePoints = months.map(function (item, index) {
      var x = (left + xStep * index).toFixed(1);
      var y = yFor(item.totals.income).toFixed(1);
      return '<circle cx="' + x + '" cy="' + y + '" r="3.8" fill="#245f45" stroke="#fff" stroke-width="2"><title>' +
        escapeHTML(item.label + " • Pemasukan " + money(item.totals.income)) + '</title></circle>';
    }).join("");
    var expensePoints = months.map(function (item, index) {
      var x = (left + xStep * index).toFixed(1);
      var y = yFor(item.totals.expense).toFixed(1);
      return '<circle cx="' + x + '" cy="' + y + '" r="3.8" fill="#c18e68" stroke="#fff" stroke-width="2"><title>' +
        escapeHTML(item.label + " • Pengeluaran " + money(item.totals.expense)) + '</title></circle>';
    }).join("");
    var labels = months.map(function (item, index) {
      if (chartRange === 12 && index % 2 !== 0 && index !== months.length - 1) return "";
      var x = (left + xStep * index).toFixed(1);
      var fontSize = chartRange === 12 ? 8 : 10;
      return '<text x="' + x + '" y="163" text-anchor="middle" fill="#8b978e" font-size="' + fontSize + '">' +
        escapeHTML(item.label) + '</text>';
    }).join("");

    chart.innerHTML = '<div class="trend-chart-wrap"><svg class="trend-chart" viewBox="0 0 450 176" role="img" aria-label="Grafik arus kas ' + chartRange + ' bulan terakhir">' +
      '<defs><linearGradient id="incomeArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#245f45" stop-opacity=".18"/><stop offset="100%" stop-color="#245f45" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="expenseArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#c18e68" stop-opacity=".14"/><stop offset="100%" stop-color="#c18e68" stop-opacity="0"/></linearGradient></defs>' +
      grid + '<path d="' + areaFor("income") + '" fill="url(#incomeArea)"/>' +
      '<path d="' + areaFor("expense") + '" fill="url(#expenseArea)"/>' +
      '<path d="' + incomePath + '" fill="none" stroke="#245f45" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + expensePath + '" fill="none" stroke="#c18e68" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/>' +
      incomePoints + expensePoints + labels + '</svg></div>';
  }

  function renderCategories() {
    var container = document.getElementById("categoryBreakdown");
    var currentKey = monthKey(localDateString());
    var totals = {};
    var overall = 0;
    var palette = ["#245f45", "#bd9b68", "#8da99a", "#c88978", "#778ca5"];

    transactions.forEach(function (item) {
      if (item.type === "expense" && monthKey(item.date) === currentKey) {
        totals[item.category] = (totals[item.category] || 0) + Number(item.amount);
        overall += Number(item.amount);
      }
    });

    document.getElementById("categoryTotal").textContent = money(overall);
    var allEntries = Object.keys(totals).map(function (name) {
      return { name: name, amount: totals[name] };
    }).sort(function (a, b) { return b.amount - a.amount; });
    var entries = allEntries.slice(0, 5);
    if (allEntries.length > 5) {
      var remainder = allEntries.slice(4).reduce(function (sum, item) { return sum + item.amount; }, 0);
      entries = allEntries.slice(0, 4).concat([{ name: "Lainnya", amount: remainder }]);
    }

    if (!entries.length || overall <= 0) {
      container.innerHTML = '<p class="chart-empty">Belum ada pengeluaran bulan ini. Distribusi kategori akan muncul di sini.</p>';
      return;
    }

    var angle = 0;
    var slices = entries.map(function (entry, index) {
      var percent = entry.amount / overall * 100;
      var next = angle + percent * 3.6;
      var part = palette[index % palette.length] + " " + angle.toFixed(2) + "deg " + next.toFixed(2) + "deg";
      angle = next;
      entry.percent = percent;
      entry.color = palette[index % palette.length];
      return part;
    });
    var legend = entries.map(function (entry) {
      return '<div class="donut-legend-item"><span class="donut-swatch" style="background:' + entry.color + '"></span>' +
        '<span class="donut-legend-name">' + escapeHTML(entry.name) + '</span>' +
        '<span class="donut-legend-percent">' + entry.percent.toFixed(0) + '%</span>' +
        '<strong>' + escapeHTML(money(entry.amount)) + '</strong></div>';
    }).join("");

    container.innerHTML = '<div class="donut-layout"><div class="donut-chart" role="img" aria-label="Distribusi pengeluaran berdasarkan kategori" style="background:conic-gradient(' +
      slices.join(",") + ')"><div class="donut-hole"><span>Total</span><strong>' + escapeHTML(money(overall)) +
      '</strong><small>Bulan ini</small></div></div><div class="donut-legend">' + legend + '</div></div>';
  }

  function renderTransactions() {
    var filtered = transactions.slice().sort(function (a, b) {
      return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
    }).filter(function (item) {
      var matchesType = activeFilter === "all" || item.type === activeFilter;
      var text = (item.name + " " + item.category + " " + (item.note || "")).toLowerCase();
      return matchesType && text.indexOf(searchTerm) !== -1;
    });

    transactionRows.innerHTML = filtered.map(function (item) {
      var income = item.type === "income";
      var transfer = item.type === "transfer";
      var icon = transfer ? "⇄" : (icons[item.category] || "•");
      var note = item.note ? '<span class="transaction-note">' + escapeHTML(item.note) + '</span>' : "";
      var walletName = transfer
        ? (item.fromWallet === "cash" ? "Cash" : "M-Banking") + " → " + (item.toWallet === "cash" ? "Cash" : "M-Banking")
        : (item.wallet === "cash" ? "Cash" : "M-Banking");
      var typeLabel = transfer ? "Transfer" : (income ? "Pemasukan" : "Pengeluaran");
      var actions = '<div class="transaction-actions">';
      if (!transfer) {
        actions += '<button class="edit-button" type="button" data-edit="' + escapeHTML(item.id) +
          '" aria-label="Ubah transaksi ' + escapeHTML(item.name) + '">Ubah</button>';
      }
      actions += '<button class="delete-button" type="button" data-delete="' + escapeHTML(item.id) +
        '" aria-label="Hapus transaksi ' + escapeHTML(item.name) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v6m4-6v6"/></svg><span>Hapus</span></button></div>';
      return '<tr>' +
        '<td><div class="transaction-name"><span class="transaction-symbol ' + (income ? "income" : (transfer ? "transfer" : "expense")) + '">' +
        escapeHTML(icon) + '</span><span>' + escapeHTML(item.name) + note + '</span></div></td>' +
        '<td><span class="category-pill">' + escapeHTML(transfer ? typeLabel : item.category) + '</span></td>' +
        '<td><span class="wallet-pill">' + walletName + '</span></td>' +
        '<td>' + escapeHTML(formatDate(item.date)) + '</td>' +
        '<td class="amount-cell ' + (transfer ? "transfer-amount" : (income ? "" : "negative")) + '">' +
        (transfer ? "⇄ " : (income ? "+" : "−")) + escapeHTML(money(item.amount)) + '</td>' +
        '<td>' + actions + '</td>' +
        '</tr>';
    }).join("");

    emptyState.classList.toggle("visible", filtered.length === 0);
    if (filtered.length === 0) {
      var noTransactions = transactions.length === 0;
      emptyState.querySelector("strong").textContent = noTransactions ? "Belum ada transaksi" : "Tidak ada transaksi yang cocok";
      emptyState.querySelector("p").textContent = noTransactions
        ? "Mulai catat pemasukan atau pengeluaran pertamamu."
        : "Coba ubah kata kunci atau filter pencarian.";
      emptyState.querySelector(".text-link").style.display = noTransactions ? "inline" : "none";
    }
  }

  function renderAll() {
    renderSummary();
    renderCashflow();
    renderCategories();
    renderTransactions();
  }

  var installedVersion = (document.querySelector('meta[name="duitku-version"]') || {}).content || "1.5.1";
  var updateCheckButton = document.getElementById("checkUpdateButton");
  var updateApplyButton = document.getElementById("applyUpdateButton");
  var updateStatus = document.getElementById("updateStatus");
  var updateNotes = document.getElementById("updateNotes");
  var installedVersionLabel = document.getElementById("installedVersion");
  if (installedVersionLabel) installedVersionLabel.textContent = "v" + installedVersion;

  function parseVersion(value) {
    var match = String(value || "").trim().replace(/^v/i, "")
      .match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
    if (!match) return null;
    return {
      core: [Number(match[1]), Number(match[2]), Number(match[3])],
      prerelease: match[4] ? match[4].split(".") : null
    };
  }

  function compareVersions(left, right) {
    var a = parseVersion(left);
    var b = parseVersion(right);
    if (!a || !b) return String(left).localeCompare(String(right));
    for (var i = 0; i < 3; i++) {
      if (a.core[i] !== b.core[i]) return a.core[i] > b.core[i] ? 1 : -1;
    }
    if (a.prerelease === null && b.prerelease === null) return 0;
    if (a.prerelease === null) return 1;
    if (b.prerelease === null) return -1;
    var length = Math.max(a.prerelease.length, b.prerelease.length);
    for (var j = 0; j < length; j++) {
      if (a.prerelease[j] === undefined) return -1;
      if (b.prerelease[j] === undefined) return 1;
      if (a.prerelease[j] === b.prerelease[j]) continue;
      var aNumeric = /^\d+$/.test(a.prerelease[j]);
      var bNumeric = /^\d+$/.test(b.prerelease[j]);
      if (aNumeric && bNumeric) {
        return Number(a.prerelease[j]) > Number(b.prerelease[j]) ? 1 : -1;
      }
      if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
      return a.prerelease[j] > b.prerelease[j] ? 1 : -1;
    }
    return 0;
  }

  // Compatibility bridge for installations whose bundled bootstrap predates the in-app updater API.
  if (!window.DuitKuUpdater) {
    window.DuitKuUpdater = {
      check: async function () {
        var response = await fetch("https://raw.githubusercontent.com/rafaramadhan09/DuitKu/main/update.json?check=" + Date.now(), {
          method: "GET",
          cache: "no-store"
        });
        if (!response.ok) throw new Error("Server update DuitKu belum dapat dijangkau.");
        var manifest = await response.json();
        if (!manifest || !parseVersion(manifest.version)) throw new Error("Manifest update DuitKu tidak valid.");
        return {
          version: manifest.version,
          available: compareVersions(manifest.version, installedVersion) > 0,
          message: manifest.message || "Fitur terbaru tersedia di dalam DuitKu."
        };
      },
      apply: async function () {
        // The legacy bootstrap re-checks the remote version during its next app start.
        window.location.reload();
        return { applied: true };
      }
    };
  }

  async function checkForAppUpdate(silent) {
    if (!updateCheckButton || !updateStatus || !updateApplyButton) return;
    updateCheckButton.disabled = true;
    var originalLabel = updateCheckButton.textContent;
    updateCheckButton.textContent = "Memeriksa...";
    updateApplyButton.hidden = true;
    updateNotes.hidden = true;
    if (!silent) updateStatus.textContent = "Memeriksa versi terbaru di dalam DuitKu...";

    try {
      var updater = window.DuitKuUpdater;
      if (!updater || typeof updater.check !== "function") {
        throw new Error("Layanan update internal belum siap. Tutup lalu buka kembali DuitKu saat online.");
      }
      var result = await updater.check();
      if (!result || !parseVersion(result.version)) throw new Error("Informasi versi pembaruan tidak valid.");
      if (!result.available) {
        updateStatus.textContent = "DuitKu sudah versi terbaru (v" + installedVersion + ").";
        return;
      }
      updateStatus.textContent = "Versi baru tersedia: v" + result.version + ".";
      updateApplyButton.textContent = "Pasang update sekarang ↻";
      updateApplyButton.hidden = false;
      updateNotes.textContent = result.message || "Fitur dan tampilan akan diperbarui langsung di dalam DuitKu. Tidak perlu membuka browser atau memasang APK.";
      updateNotes.hidden = false;
    } catch (error) {
      updateStatus.textContent = error && error.message
        ? error.message
        : "Belum dapat memeriksa update. Periksa koneksi internet.";
    } finally {
      updateCheckButton.disabled = false;
      updateCheckButton.textContent = originalLabel;
    }
  }

  function resetTransactionForm() {
    editingTransactionId = null;
    form.reset();
    document.getElementById("transactionDate").value = localDateString();
    document.querySelector('input[name="type"][value="income"]').checked = true;
    updateCategoryOptions();
    var submitButton = form.querySelector(".submit-button");
    if (submitButton) submitButton.innerHTML = 'Simpan transaksi <span>→</span>';
    var cancelButton = document.getElementById("cancelEditButton");
    if (cancelButton) cancelButton.hidden = true;
    var heading = document.getElementById("transactionFormTitle");
    if (heading) heading.textContent = "Detail transaksi";
    showFeedback("");
  }

  function beginTransactionEdit(transaction) {
    editingTransactionId = transaction.id;
    document.getElementById("transactionName").value = transaction.name;
    document.getElementById("transactionAmount").value = transaction.amount;
    document.getElementById("transactionWallet").value = transaction.wallet === "cash" ? "cash" : "bank";
    document.querySelector('input[name="type"][value="' + transaction.type + '"]').checked = true;
    updateCategoryOptions();
    categorySelect.value = transaction.category;
    document.getElementById("transactionDate").value = transaction.date;
    document.getElementById("transactionNote").value = transaction.note || "";
    var submitButton = form.querySelector(".submit-button");
    if (submitButton) submitButton.innerHTML = 'Simpan perubahan <span>✓</span>';
    var cancelButton = document.getElementById("cancelEditButton");
    if (cancelButton) cancelButton.hidden = false;
    var heading = document.getElementById("transactionFormTitle");
    if (heading) heading.textContent = "Ubah transaksi";
    showFeedback("Mode ubah aktif. Koreksi data lalu simpan perubahan.");
    switchPage("add");
    document.getElementById("transactionName").focus();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var data = new FormData(form);
    var name = String(data.get("name") || "").trim();
    var amount = Number(data.get("amount"));
    var date = String(data.get("date") || "");
    var type = selectedType();
    var category = String(data.get("category") || "");
    var note = String(data.get("note") || "").trim();
    var wallet = String(data.get("wallet") || "bank");

    if (!name || !Number.isSafeInteger(amount) || amount <= 0 || !isValidDateString(date) || categories[type].indexOf(category) === -1) {
      showFeedback("Periksa kembali nama, jumlah, tanggal, dan kategori.", true);
      return;
    }

    var previous = transactions.slice();
    var isEditing = Boolean(editingTransactionId);
    var updatedTransaction = {
      id: editingTransactionId || ((window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : String(Date.now()) + "-" + Math.random().toString(16).slice(2)),
      type: type,
      name: name,
      amount: amount,
      category: category,
      wallet: wallet === "cash" ? "cash" : "bank",
      date: date,
      note: note
    };

    if (isEditing) {
      var index = transactions.findIndex(function (item) { return item.id === editingTransactionId; });
      if (index < 0) {
        resetTransactionForm();
        showToast("Transaksi yang akan diubah tidak ditemukan.", true);
        return;
      }
      transactions[index] = updatedTransaction;
    } else {
      transactions.push(updatedTransaction);
    }

    if (!saveTransactions()) {
      transactions = previous;
      return;
    }

    resetTransactionForm();
    renderAll();
    switchPage("home");
    showToast(isEditing ? "Perubahan transaksi berhasil disimpan." : "Transaksi berhasil disimpan.");
    document.getElementById("transactionName").focus();
  });

  var cancelEditButton = document.getElementById("cancelEditButton");
  if (cancelEditButton) cancelEditButton.addEventListener("click", resetTransactionForm);

  typeInputs.forEach(function (input) {
    input.addEventListener("change", updateCategoryOptions);
  });

  document.querySelectorAll(".chart-range-button").forEach(function (button) {
    button.addEventListener("click", function () {
      chartRange = Number(button.getAttribute("data-chart-range")) === 12 ? 12 : 6;
      document.querySelectorAll(".chart-range-button").forEach(function (item) {
        item.classList.toggle("active", item === button);
      });
      renderCashflow();
    });
  });

  document.querySelectorAll(".filter-tab").forEach(function (button) {
    button.addEventListener("click", function () {
      activeFilter = button.getAttribute("data-filter");
      document.querySelectorAll(".filter-tab").forEach(function (tab) {
        tab.classList.toggle("active", tab === button);
      });
      renderTransactions();
    });
  });

  searchInput.addEventListener("input", function () {
    searchTerm = searchInput.value.trim().toLowerCase();
    renderTransactions();
  });

  if (updateCheckButton) {
    updateCheckButton.addEventListener("click", function () {
      checkForAppUpdate(false);
    });
  }
  if (updateApplyButton) {
    updateApplyButton.addEventListener("click", async function () {
      updateApplyButton.disabled = true;
      updateApplyButton.textContent = "Memasang di DuitKu...";
      updateStatus.textContent = "Mengunduh komponen fitur terbaru langsung ke aplikasi...";
      try {
        if (!window.DuitKuUpdater || typeof window.DuitKuUpdater.apply !== "function") {
          throw new Error("Layanan update internal belum siap. Buka ulang aplikasi.");
        }
        await window.DuitKuUpdater.apply();
        showToast("DuitKu berhasil diperbarui.");
      } catch (error) {
        updateStatus.textContent = error && error.message ? error.message : "Update belum berhasil dipasang.";
        updateApplyButton.disabled = false;
        updateApplyButton.textContent = "Coba pasang lagi";
        showToast("Update gagal. Data transaksi tetap aman.", true);
      }
    });
  }

  var transferForm = document.getElementById("transferForm");
  if (transferForm) {
    transferForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var amount = Number(document.getElementById("transferAmount").value);
      var date = String(document.getElementById("transferDate").value || "");
      var note = String(document.getElementById("transferNote").value || "").trim();
      var balances = walletBalances();
      if (!Number.isSafeInteger(amount) || amount <= 0 || !isValidDateString(date)) {
        showToast("Masukkan jumlah dan tanggal penarikan yang valid.", true);
        return;
      }
      if (amount > balances.bank) {
        showToast("Saldo M-Banking tidak cukup untuk penarikan ini.", true);
        return;
      }
      if (!window.confirm("Tarik " + money(amount) + " dari M-Banking ke Cash? Saldo kedua dompet akan diperbarui.")) return;
      var transfer = {
        id: (window.crypto && window.crypto.randomUUID)
          ? window.crypto.randomUUID()
          : String(Date.now()) + "-transfer-" + Math.random().toString(16).slice(2),
        type: "transfer",
        name: "Tarik tunai",
        amount: amount,
        category: "Transfer",
        wallet: "bank",
        fromWallet: "bank",
        toWallet: "cash",
        date: date,
        note: note
      };
      transactions.push(transfer);
      if (!saveTransactions()) {
        transactions.pop();
        return;
      }
      transferForm.reset();
      document.getElementById("transferDate").value = localDateString();
      renderAll();
      showToast("Penarikan berhasil. Saldo Cash bertambah dan M-Banking berkurang.");
    });
  }

  function switchPage(page) {
    if (!document.querySelector('[data-page-panel="' + page + '"]')) page = "home";
    document.querySelectorAll("[data-page-panel]").forEach(function (panel) { panel.classList.toggle("active", panel.getAttribute("data-page-panel") === page); });
    document.querySelectorAll("[data-page]").forEach(function (nav) { nav.classList.toggle("active", nav.getAttribute("data-page") === page); });
    var titles = {home:"Ringkasan",transactions:"Transaksi",add:"Catat transaksi",wallets:"Dompet",export:"Export & data"};
    var title = document.getElementById("pageTitle"); if (title) title.textContent = titles[page] || "DuitKu";
    window.scrollTo({top:0,behavior:"smooth"});
  }
  document.querySelectorAll("[data-page]").forEach(function (link) {
    link.addEventListener("click", function (event) { event.preventDefault(); switchPage(link.getAttribute("data-page")); });
  });

  transactionRows.addEventListener("click", function (event) {
    var button = event.target.closest("[data-edit], [data-delete]");
    if (!button) return;
    var id = button.getAttribute("data-edit") || button.getAttribute("data-delete");
    var selected = transactions.find(function (item) { return item.id === id; });
    if (!selected) return;

    if (button.hasAttribute("data-edit")) {
      beginTransactionEdit(selected);
      return;
    }

    if (!window.confirm('Hapus transaksi "' + selected.name + '" senilai ' + money(selected.amount) + '?\\nSaldo dompet dan statistik akan dihitung ulang.')) return;
    var previous = transactions.slice();
    transactions = transactions.filter(function (item) { return item.id !== id; });
    if (!saveTransactions()) {
      transactions = previous;
      return;
    }
    if (editingTransactionId === id) resetTransactionForm();
    renderAll();
    showToast("Transaksi berhasil dihapus. Saldo dan statistik diperbarui.");
  });

  document.getElementById("exportButton").addEventListener("click", async function () {
    var feedbackNode = document.getElementById("exportFeedback");
    function report(message, isError) {
      if (feedbackNode) feedbackNode.textContent = message;
      showFeedback(message, Boolean(isError));
      if (isError) showToast("Ekspor belum berhasil. Coba lagi.", true);
    }

    if (!transactions.length) {
      report("Belum ada transaksi untuk diekspor.", true);
      return;
    }

    function xml(value) {
      return String(value == null ? "" : value)
        .replace(/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]/g, "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function cell(value, type) {
      return "<Cell><Data ss:Type=\"" + (type || "String") + "\">" +
        xml(value) + "</Data></Cell>";
    }

    var sorted = transactions.slice().sort(function (a, b) {
      return String(a.date || "").localeCompare(String(b.date || ""));
    });
    var rows = "<Row>" + ["Tanggal", "Jenis", "Nama transaksi", "Kategori", "Dompet / Alur", "Jumlah (IDR)", "Catatan"]
      .map(function (value) { return cell(value); }).join("") + "</Row>";
    sorted.forEach(function (item) {
      var transfer = item.type === "transfer";
      var walletLabel = transfer
        ? (item.fromWallet === "cash" ? "Cash" : "M-Banking") + " → " + (item.toWallet === "cash" ? "Cash" : "M-Banking")
        : (item.wallet === "cash" ? "Cash" : "M-Banking");
      var typeLabel = transfer ? "Transfer" : (item.type === "income" ? "Pemasukan" : "Pengeluaran");
      rows += "<Row>" + [
        item.date, typeLabel, item.name, item.category, walletLabel,
        Number(item.amount) || 0, item.note || ""
      ].map(function (value, index) {
        return cell(value, index === 5 ? "Number" : "String");
      }).join("") + "</Row>";
    });

    var balances = walletBalances();
    var totalIncome = transactions.filter(function (item) { return item.type === "income"; })
      .reduce(function (sum, item) { return sum + (Number(item.amount) || 0); }, 0);
    var totalExpense = transactions.filter(function (item) { return item.type === "expense"; })
      .reduce(function (sum, item) { return sum + (Number(item.amount) || 0); }, 0);
    var totalTransfer = transactions.filter(function (item) { return item.type === "transfer"; })
      .reduce(function (sum, item) { return sum + (Number(item.amount) || 0); }, 0);
    var summary = "<Row>" + cell("Ringkasan") + cell("Nilai") + "</Row>" +
      "<Row>" + cell("Total Saldo") + cell(balances.bank + balances.cash, "Number") + "</Row>" +
      "<Row>" + cell("Saldo M-Banking") + cell(balances.bank, "Number") + "</Row>" +
      "<Row>" + cell("Saldo Cash") + cell(balances.cash, "Number") + "</Row>" +
      "<Row>" + cell("Total Pemasukan") + cell(totalIncome, "Number") + "</Row>" +
      "<Row>" + cell("Total Pengeluaran") + cell(totalExpense, "Number") + "</Row>" +
      "<Row>" + cell("Total Transfer") + cell(totalTransfer, "Number") + "</Row>";
    var workbook = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>' +
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
      '<Worksheet ss:Name="Transaksi"><Table>' + rows + '</Table></Worksheet>' +
      '<Worksheet ss:Name="Ringkasan"><Table>' + summary + '</Table></Worksheet></Workbook>';
    var fileName = "DuitKu-Laporan-" + localDateString() + ".xls";
    var fileBlob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });

    try {
      var capacitor = window.Capacitor;
      var isNative = Boolean(capacitor &&
        typeof capacitor.isNativePlatform === "function" &&
        capacitor.isNativePlatform());

      if (isNative) {
        if (typeof capacitor.registerPlugin !== "function") {
          throw new Error("Fitur penyimpanan Excel Android belum tersedia. Pasang versi aplikasi terbaru.");
        }
        var exportPlugin = capacitor.registerPlugin("DuitKuExport");
        if (!exportPlugin || typeof exportPlugin.shareSpreadsheet !== "function") {
          throw new Error("Jembatan ekspor Excel Android tidak ditemukan. Tutup lalu buka ulang aplikasi.");
        }
        var saveResult = await exportPlugin.shareSpreadsheet({ fileName: fileName, content: workbook });
        if (saveResult && saveResult.cancelled) {
          report("Penyimpanan dibatalkan. File belum dibuat.", false);
          return;
        }
        if (!saveResult || saveResult.saved !== true) {
          throw new Error("Android belum mengonfirmasi penyimpanan file Excel.");
        }
        report("File Excel berhasil disimpan ke folder yang kamu pilih.", false);
        showToast("Laporan Excel berhasil disimpan.");
        return;
      }

      if (typeof File === "function" && navigator.share && typeof navigator.canShare === "function") {
        var file = new File([fileBlob], fileName, { type: "application/vnd.ms-excel" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: "Laporan DuitKu", files: [file] });
          report("File Excel berhasil dibagikan.", false);
          return;
        }
      }

      if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
        var url = URL.createObjectURL(fileBlob);
        var link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
        report("File Excel disiapkan. Periksa folder Unduhan perangkatmu.", false);
        return;
      }
      throw new Error("Perangkat ini tidak mendukung penyimpanan file. Coba gunakan menu berbagi file.");
    } catch (error) {
      if (error && error.name === "AbortError") {
        report("Penyimpanan dibatalkan.", false);
        return;
      }
      var message = error && error.message ? error.message : "Tidak dapat membuat file Excel.";
      report(message, true);
    }
  });

  document.getElementById("todayLabel").textContent = new Intl.DateTimeFormat("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }).format(new Date());
  document.getElementById("yearLabel").textContent = String(new Date().getFullYear());
  document.getElementById("transactionDate").value = localDateString();
  var transferDateInput = document.getElementById("transferDate");
  if (transferDateInput) transferDateInput.value = localDateString();

  var performanceModeSelect = document.getElementById("performanceMode");
  var performanceStatus = document.getElementById("performanceStatus");

  function isLowPowerDevice() {
    var cores = Number(navigator.hardwareConcurrency) || 0;
    var memory = Number(navigator.deviceMemory) || 0;
    return (cores > 0 && cores <= 4) || (memory > 0 && memory <= 4);
  }

  function applyPerformanceMode(mode, persist) {
    var selected = mode === "light" || mode === "full" ? mode : "auto";
    var lite = selected === "light" || (selected === "auto" && isLowPowerDevice());
    document.documentElement.classList.toggle("lite-mode", lite);
    if (performanceModeSelect && performanceModeSelect.value !== selected) {
      performanceModeSelect.value = selected;
    }
    if (performanceStatus) {
      performanceStatus.textContent = lite
        ? "Mode ringan aktif: animasi berat, blur, dan efek dekoratif dikurangi agar HP lebih lancar dan hemat baterai."
        : "Visual lengkap aktif: seluruh animasi halus dan efek dekoratif digunakan.";
      if (selected === "auto" && !lite) {
        performanceStatus.textContent = "Mode otomatis: efek visual menyesuaikan kemampuan perangkat.";
      }
    }
    if (persist) {
      try { localStorage.setItem("duitku-performance-mode", selected); } catch (error) {}
    }
  }

  var savedPerformanceMode = "auto";
  try { savedPerformanceMode = localStorage.getItem("duitku-performance-mode") || "auto"; } catch (error) {}
  applyPerformanceMode(savedPerformanceMode, false);
  if (performanceModeSelect) {
    performanceModeSelect.addEventListener("change", function () {
      applyPerformanceMode(performanceModeSelect.value, true);
      showToast(performanceModeSelect.value === "light"
        ? "Mode ringan diaktifkan."
        : performanceModeSelect.value === "full"
          ? "Visual lengkap diaktifkan."
          : "Mode otomatis diaktifkan.");
    });
  }

  updateCategoryOptions();
  renderAll();

  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(function () {
      document.documentElement.classList.add("ui-ready");
    });
  } else {
    document.documentElement.classList.add("ui-ready");
  }

  function runWhenReady(callback) {
    if (document.readyState === "complete") callback();
    else window.addEventListener("load", callback, { once: true });
  }

  if (updateCheckButton && navigator.onLine) {
    runWhenReady(function () { checkForAppUpdate(true); });
  }

  if ("serviceWorker" in navigator) {
    runWhenReady(function () {
      navigator.serviceWorker.register("./service-worker.js").catch(function (error) {
        console.warn("DuitKu offline support could not be registered:", error);
      });
    });
  }
})();