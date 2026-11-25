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
        return item && typeof item.id === "string" &&
          (item.type === "income" || item.type === "expense") &&
          typeof item.name === "string" &&
          Number.isFinite(Number(item.amount)) &&
          Number(item.amount) > 0 &&
          typeof item.date === "string";
      });
    } catch (error) {
      return [];
    }
  }

  function saveTransactions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
      return true;
    } catch (error) {
      showFeedback("Penyimpanan browser penuh atau tidak tersedia.", true);
      return false;
    }
  }

  function showFeedback(message, isError) {
    feedback.textContent = message || "";
    feedback.style.color = isError ? "#c96058" : "";
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
      if (monthKey(item.date) === key) totals[item.type] += Number(item.amount);
      return totals;
    }, { income: 0, expense: 0 });
  }

  function renderSummary() {
    var totals = totalsForMonth(monthKey(localDateString()));
    var allIncome = 0;
    var allExpense = 0;
    transactions.forEach(function (item) {
      if (item.type === "income") allIncome += Number(item.amount);
      else allExpense += Number(item.amount);
    });

    document.getElementById("balanceValue").textContent = money(allIncome - allExpense);
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
      var icon = icons[item.category] || "•";
      var note = item.note ? '<span class="transaction-note">' + escapeHTML(item.note) + '</span>' : "";
      return '<tr>' +
        '<td><div class="transaction-name"><span class="transaction-symbol ' + (income ? "income" : "expense") + '">' +
        escapeHTML(icon) + '</span><span>' + escapeHTML(item.name) + note + '</span></div></td>' +
        '<td><span class="category-pill">' + escapeHTML(item.category) + '</span></td>' +
        '<td>' + escapeHTML(formatDate(item.date)) + '</td>' +
        '<td class="amount-cell ' + (income ? "" : "negative") + '">' + (income ? "+" : "−") +
        escapeHTML(money(item.amount)) + '</td>' +
        '<td><button class="delete-button" type="button" data-delete="' + escapeHTML(item.id) +
        '" aria-label="Hapus transaksi ' + escapeHTML(item.name) + '" title="Hapus transaksi">×</button></td>' +
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

  var installedVersion = (document.querySelector('meta[name="duitku-version"]') || {}).content || "0.1.0-beta.3";
  var updateCheckButton = document.getElementById("checkUpdateButton");
  var updateDownloadButton = document.getElementById("downloadUpdateButton");
  var updateStatus = document.getElementById("updateStatus");
  var updateNotes = document.getElementById("updateNotes");

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
    if (!updateCheckButton || !updateStatus || !updateDownloadButton) return;
    updateCheckButton.disabled = true;
    var originalLabel = updateCheckButton.textContent;
    updateCheckButton.textContent = "Memeriksa...";
    updateDownloadButton.hidden = true;
    updateNotes.hidden = true;
    if (!silent) updateStatus.textContent = "Sedang memeriksa versi DuitKu terbaru...";

    try {
      var response = await fetch(
        "https://api.github.com/repos/rafaramadhan09/DuitKu/releases?per_page=30",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
          }
        }
      );
      if (!response.ok) {
        throw new Error(response.status === 403
          ? "GitHub sedang membatasi permintaan. Coba periksa lagi nanti."
          : "Belum bisa menghubungi server pembaruan (HTTP " + response.status + ").");
      }

      var releases = await response.json();
      var candidates = releases.filter(function (release) {
        return release && !release.draft && Array.isArray(release.assets) &&
          release.assets.some(function (asset) { return /\.apk$/i.test(asset.name || ""); });
      });
      candidates.sort(function (a, b) {
        return compareVersions(b.tag_name, a.tag_name);
      });

      if (!candidates.length) {
        updateStatus.textContent = "Belum ada paket pembaruan yang tersedia.";
        return;
      }

      var latest = candidates[0];
      if (compareVersions(latest.tag_name, installedVersion) <= 0) {
        updateStatus.textContent = "DuitKu sudah versi terbaru (" + installedVersion + ").";
        return;
      }

      var apk = latest.assets.find(function (asset) {
        return /\.apk$/i.test(asset.name || "");
      });
      if (!apk || !apk.browser_download_url) {
        updateStatus.textContent = "Versi " + latest.tag_name + " tersedia, tetapi file APK belum ditemukan.";
        return;
      }

      updateStatus.textContent = "Pembaruan tersedia: " + latest.tag_name + ". Unduh untuk mendapatkan versi terbaru.";
      updateDownloadButton.href = apk.browser_download_url;
      updateDownloadButton.setAttribute("download", "DuitKu-" + latest.tag_name + ".apk");
      updateDownloadButton.hidden = false;

      var notes = String(latest.body || "").trim();
      if (notes) {
        updateNotes.textContent = notes.length > 900 ? notes.slice(0, 900) + "..." : notes;
        updateNotes.hidden = false;
      }
    } catch (error) {
      updateStatus.textContent = error && error.message
        ? error.message
        : "Tidak dapat memeriksa pembaruan. Periksa koneksi internet lalu coba lagi.";
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

    if (!name || !Number.isFinite(amount) || amount <= 0 || !date || categories[type].indexOf(category) === -1) {
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

  document.querySelectorAll(".side-nav .nav-link").forEach(function (link) {
    link.addEventListener("click", function () {
      document.querySelectorAll(".side-nav .nav-link").forEach(function (item) {
        item.classList.toggle("active", item === link);
      });
    });
  });

  transactionRows.addEventListener("click", function (event) {
    var button = event.target.closest("[data-delete]");
    if (!button) return;
    var id = button.getAttribute("data-delete");
    var selected = transactions.find(function (item) { return item.id === id; });
    if (!selected) return;
    if (!window.confirm('Hapus transaksi "' + selected.name + '"?')) return;

    var oldTransactions = transactions;
    transactions = transactions.filter(function (item) { return item.id !== id; });
    if (!saveTransactions()) {
      transactions = oldTransactions;
      return;
    }
    showFeedback("Transaksi berhasil dihapus.");
    renderAll();
  });

  document.getElementById("exportButton").addEventListener("click", function () {
    if (!transactions.length) {
      showFeedback("Belum ada transaksi untuk diekspor.", true);
      return;
    }
    var rows = [["Tanggal", "Jenis", "Nama", "Kategori", "Jumlah", "Catatan"]];
    transactions.slice().sort(function (a, b) { return a.date.localeCompare(b.date); }).forEach(function (item) {
      rows.push([
        item.date,
        item.type === "income" ? "Pemasukan" : "Pengeluaran",
        item.name,
        item.category,
        String(item.amount),
        item.note || ""
      ]);
    });
    var csv = "\uFEFF" + rows.map(function (row) {
      return row.map(function (cell) {
        return '"' + String(cell).replace(/"/g, '""') + '"';
      }).join(",");
    }).join("\r\n");

    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "duitku-transaksi-" + localDateString() + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showFeedback("File CSV berhasil disiapkan.");
  });

  document.getElementById("todayLabel").textContent = new Intl.DateTimeFormat("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }).format(new Date());
  document.getElementById("yearLabel").textContent = String(new Date().getFullYear());
  document.getElementById("transactionDate").value = localDateString();

  updateCategoryOptions();
  renderAll();

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