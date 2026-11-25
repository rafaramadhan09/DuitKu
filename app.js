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
    var totals = totalsForMonth(monthKey(localDateString()));
    var allIncome = 0;
    var allExpense = 0;
    transactions.forEach(function (item) {
      if (item.type === "income") allIncome += Number(item.amount);
      else if (item.type === "expense") allExpense += Number(item.amount);
    });

    document.getElementById("balanceValue").textContent = money(allIncome - allExpense);
    var wt=walletBalances();
    ["bankBalance","bankBalancePage"].forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=money(wt.bank);});
    ["cashBalance","cashBalancePage"].forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=money(wt.cash);});
    document.getElementById("incomeValue").textContent = money(totals.income);
    document.getElementById("expenseValue").textContent = money(totals.expense);
  }

  function renderCashflow() {
    var chart = document.getElementById("cashflowChart");
    var now = new Date();
    var months = [];
    for (var i = 5; i >= 0; i--) {
      var date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
      months.push({
        key: key,
        label: monthLabel(date),
        totals: totalsForMonth(key)
      });
    }

    var maxValue = Math.max.apply(null, months.map(function (item) {
      return Math.max(item.totals.income, item.totals.expense);
    }).concat([1]));

    if (!transactions.length) {
      chart.innerHTML = '<p class="chart-empty">Belum ada data transaksi untuk ditampilkan.</p>';
      return;
    }

    chart.innerHTML = months.map(function (item) {
      var incomeHeight = Math.max(3, item.totals.income / maxValue * 108);
      var expenseHeight = Math.max(3, item.totals.expense / maxValue * 108);
      return '<div class="chart-column" title="' + escapeHTML(item.label) + ': pemasukan ' +
        escapeHTML(money(item.totals.income)) + ', pengeluaran ' + escapeHTML(money(item.totals.expense)) + '">' +
        '<div class="bar-pair">' +
        '<div class="chart-bar income-bar" style="height:' + incomeHeight + 'px"></div>' +
        '<div class="chart-bar expense-bar" style="height:' + expenseHeight + 'px"></div>' +
        '</div><span class="chart-month">' + escapeHTML(item.label) + '</span></div>';
    }).join("");
  }

  function renderCategories() {
    var container = document.getElementById("categoryBreakdown");
    var currentKey = monthKey(localDateString());
    var totals = {};
    var overall = 0;

    transactions.forEach(function (item) {
      if (item.type === "expense" && monthKey(item.date) === currentKey) {
        totals[item.category] = (totals[item.category] || 0) + Number(item.amount);
        overall += Number(item.amount);
      }
    });

    document.getElementById("categoryTotal").textContent = money(overall);
    var entries = Object.keys(totals).map(function (key) {
      return { name: key, amount: totals[key] };
    }).sort(function (a, b) { return b.amount - a.amount; }).slice(0, 5);

    if (!entries.length) {
      container.innerHTML = '<p class="chart-empty">Kategori pengeluaran akan muncul setelah kamu mencatat transaksi.</p>';
      return;
    }

    container.innerHTML = entries.map(function (entry) {
      var percent = overall ? entry.amount / overall * 100 : 0;
      return '<div class="category-item"><div class="category-item-top"><span>' +
        escapeHTML(entry.name) + '</span><strong>' + escapeHTML(money(entry.amount)) +
        '</strong></div><div class="category-track"><div class="category-fill" style="width:' +
        percent + '%"></div></div></div>';
    }).join("");
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
      return '<tr>' +
        '<td><div class="transaction-name"><span class="transaction-symbol ' + (income ? "income" : (transfer ? "transfer" : "expense")) + '">' +
        escapeHTML(icon) + '</span><span>' + escapeHTML(item.name) + note + '</span></div></td>' +
        '<td><span class="category-pill">' + escapeHTML(transfer ? typeLabel : item.category) + '</span></td>' +
        '<td><span class="wallet-pill">' + walletName + '</span></td>' +
        '<td>' + escapeHTML(formatDate(item.date)) + '</td>' +
        '<td class="amount-cell ' + (transfer ? "transfer-amount" : (income ? "" : "negative")) + '">' +
        (transfer ? "⇄ " : (income ? "+" : "−")) + escapeHTML(money(item.amount)) + '</td>' +
        '<td><button class="delete-button" type="button" data-delete="' + escapeHTML(item.id) +
        '" aria-label="Hapus transaksi ' + escapeHTML(item.name) + '" title="Hapus transaksi">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v6m4-6v6"/></svg><span>Hapus</span></button></td>' +
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

  var installedVersion = (document.querySelector('meta[name="duitku-version"]') || {}).content || "1.3.0";
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

  async function checkForAppUpdate(silent) {
    if (!updateCheckButton || !updateStatus || !updateApplyButton) return;
    updateCheckButton.disabled = true;
    var originalLabel = updateCheckButton.textContent;
    updateCheckButton.textContent = "Memeriksa...";
    updateApplyButton.hidden = true;
    updateNotes.hidden = true;
    if (!silent) updateStatus.textContent = "Memeriksa pembaruan fitur DuitKu...";

    try {
      var response = await fetch(
        "https://raw.githubusercontent.com/rafaramadhan09/DuitKu/main/index.html?check=" + Date.now(),
        { method: "GET", cache: "no-store" }
      );
      if (!response.ok) throw new Error("Server pembaruan belum dapat dijangkau (HTTP " + response.status + ").");
      var html = await response.text();
      var remoteDocument = new DOMParser().parseFromString(html, "text/html");
      var remoteMeta = remoteDocument.querySelector('meta[name="duitku-version"]');
      var latestVersion = remoteMeta ? remoteMeta.content : "";
      if (!parseVersion(latestVersion)) throw new Error("Informasi versi pembaruan tidak valid.");

      if (compareVersions(latestVersion, installedVersion) <= 0) {
        updateStatus.textContent = "DuitKu sudah menggunakan fitur terbaru (v" + installedVersion + ").";
        return;
      }

      updateStatus.textContent = "Pembaruan fitur tersedia: v" + latestVersion + ".";
      updateApplyButton.textContent = "Perbarui sekarang ↻";
      updateApplyButton.hidden = false;
      updateNotes.textContent = "Fitur dan tampilan akan diterapkan langsung di dalam aplikasi. Tidak perlu memasang APK untuk pembaruan web.";
      updateNotes.hidden = false;
    } catch (error) {
      updateStatus.textContent = error && error.message
        ? error.message
        : "Tidak dapat memeriksa pembaruan. Periksa koneksi internet.";
    } finally {
      updateCheckButton.disabled = false;
      updateCheckButton.textContent = originalLabel;
    }
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

    var transaction = {
      id: (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : String(Date.now()) + "-" + Math.random().toString(16).slice(2),
      type: type,
      name: name,
      amount: Math.round(amount),
      category: category,
      wallet: wallet === "cash" ? "cash" : "bank",
      date: date,
      note: note
    };

    transactions.push(transaction);
    if (!saveTransactions()) {
      transactions.pop();
      return;
    }

    form.reset();
    document.getElementById("transactionDate").value = localDateString();
    document.querySelector('input[name="type"][value="income"]').checked = true;
    updateCategoryOptions();
    showFeedback("Transaksi berhasil disimpan.");
    renderAll();
    switchPage("home");
    showToast("Transaksi berhasil disimpan.");
    document.getElementById("transactionName").focus();
  });

  typeInputs.forEach(function (input) {
    input.addEventListener("change", updateCategoryOptions);
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
    updateApplyButton.addEventListener("click", function () {
      updateApplyButton.disabled = true;
      updateApplyButton.textContent = "Menerapkan pembaruan...";
      window.location.reload();
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
    var button = event.target.closest("[data-delete]");
    if (!button) return;
    var id = button.getAttribute("data-delete");
    var selected = transactions.find(function (item) { return item.id === id; });
    if (!selected) return;
    if (!window.confirm('Hapus transaksi "' + selected.name + '" senilai ' + money(selected.amount) + '?\\nSaldo dompet akan dihitung ulang.')) return;

    var oldTransactions = transactions;
    transactions = transactions.filter(function (item) { return item.id !== id; });
    if (!saveTransactions()) {
      transactions = oldTransactions;
      return;
    }
    showFeedback("Transaksi berhasil dihapus.");
    renderAll();
    showToast("Transaksi dihapus. Saldo dompet sudah diperbarui.");
  });

  document.getElementById("exportButton").addEventListener("click", async function () {
    var feedbackNode = document.getElementById("exportFeedback");
    if (!transactions.length) {
      if (feedbackNode) feedbackNode.textContent = "Belum ada transaksi untuk diekspor.";
      showFeedback("Belum ada transaksi untuk diekspor.", true);
      return;
    }

    function xml(value) {
      return String(value == null ? "" : value).replace(/&/g, "&amp;")
        .replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function cell(value, type) {
      return "<Cell><Data ss:Type=\"" + (type || "String") + "\">" + xml(value) + "</Data></Cell>";
    }

    var sorted = transactions.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
    var rows = "<Row>" + ["Tanggal", "Jenis", "Nama transaksi", "Kategori", "Dompet / Alur", "Jumlah (IDR)", "Catatan"]
      .map(function (value) { return cell(value); }).join("") + "</Row>";
    sorted.forEach(function (item) {
      var transfer = item.type === "transfer";
      var walletLabel = transfer
        ? (item.fromWallet === "cash" ? "Cash" : "M-Banking") + " → " + (item.toWallet === "cash" ? "Cash" : "M-Banking")
        : (item.wallet === "cash" ? "Cash" : "M-Banking");
      var typeLabel = transfer ? "Transfer" : (item.type === "income" ? "Pemasukan" : "Pengeluaran");
      rows += "<Row>" + [
        item.date, typeLabel, item.name, item.category, walletLabel, Number(item.amount), item.note || ""
      ].map(function (value, index) { return cell(value, index === 5 ? "Number" : "String"); }).join("") + "</Row>";
    });

    var balances = walletBalances();
    var totalIncome = transactions.filter(function (item) { return item.type === "income"; })
      .reduce(function (sum, item) { return sum + Number(item.amount); }, 0);
    var totalExpense = transactions.filter(function (item) { return item.type === "expense"; })
      .reduce(function (sum, item) { return sum + Number(item.amount); }, 0);
    var totalTransfer = transactions.filter(function (item) { return item.type === "transfer"; })
      .reduce(function (sum, item) { return sum + Number(item.amount); }, 0);
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
      var isNative = Boolean(capacitor && typeof capacitor.isNativePlatform === "function" && capacitor.isNativePlatform());
      if (isNative && typeof capacitor.registerPlugin === "function") {
        var exportPlugin = capacitor.registerPlugin("DuitKuExport");
        await exportPlugin.shareSpreadsheet({ fileName: fileName, content: workbook });
        if (feedbackNode) feedbackNode.textContent = "Laporan siap dibagikan. Pilih Excel, Drive, atau Simpan di perangkat pada menu Android.";
        showFeedback("File Excel berhasil dibuat.");
        showToast("Pilih aplikasi tujuan untuk menyimpan laporan Excel.");
        return;
      }

      var file = new File([fileBlob], fileName, { type: "application/vnd.ms-excel" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: "Laporan DuitKu", files: [file] });
      } else {
        var url = URL.createObjectURL(fileBlob);
        var link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      }
      if (feedbackNode) feedbackNode.textContent = "File Excel berhasil disiapkan.";
      showFeedback("File Excel berhasil diekspor.");
    } catch (error) {
      var message = error && error.message ? error.message : "Tidak dapat membuat file Excel.";
      if (feedbackNode) feedbackNode.textContent = message;
      showFeedback(message, true);
      showToast("Ekspor belum berhasil. Coba lagi.", true);
    }
  });

  document.getElementById("todayLabel").textContent = new Intl.DateTimeFormat("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }).format(new Date());
  document.getElementById("yearLabel").textContent = String(new Date().getFullYear());
  document.getElementById("transactionDate").value = localDateString();
  var transferDateInput = document.getElementById("transferDate");
  if (transferDateInput) transferDateInput.value = localDateString();

  updateCategoryOptions();
  renderAll();

  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(function () {
      document.documentElement.classList.add("ui-ready");
    });
  } else {
    document.documentElement.classList.add("ui-ready");
  }

  if (updateCheckButton && navigator.onLine) {
    window.addEventListener("load", function () {
      checkForAppUpdate(true);
    });
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./service-worker.js").catch(function (error) {
        console.warn("DuitKu offline support could not be registered:", error);
      });
    });
  }
})();