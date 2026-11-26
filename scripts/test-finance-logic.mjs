import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const bootstrap = await readFile(new URL("../app-bootstrap.js", import.meta.url), "utf8");
const androidBranding = await readFile(new URL("../scripts/apply-android-branding.mjs", import.meta.url), "utf8");
const update = JSON.parse(await readFile(new URL("../update.json", import.meta.url), "utf8"));
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

function extractFunction(source, signature, nextSignature) {
  const start = source.indexOf("  function " + signature + "(");
  const end = source.indexOf("  function " + nextSignature + "(", start);
  assert.ok(start >= 0 && end > start, "Function exists: " + signature);
  return source.slice(start, end).trim();
}

const transactions = [
  { id: "income-1", type: "income", amount: 1000000, wallet: "bank", date: "2026-11-02" },
  { id: "transfer-1", type: "transfer", amount: 200000, fromWallet: "bank", toWallet: "cash", date: "2026-11-03" },
  { id: "expense-1", type: "expense", amount: 50000, wallet: "cash", date: "2026-11-04" }
];
const monthKey = (date) => String(date).slice(0, 7);
const walletBalancesSource = extractFunction(app, "walletBalances", "renderSummary");
const walletBalances = vm.runInNewContext("(" + walletBalancesSource + ")", { transactions });
const balances = walletBalances();
assert.equal(balances.bank, 800000, "M-Banking decreases after cash withdrawal");
assert.equal(balances.cash, 150000, "Cash increases after withdrawal, then reflects cash spending");
assert.equal(balances.bank + balances.cash, 950000, "Internal transfer preserves total money");

const monthlySource = extractFunction(app, "totalsForMonth", "walletBalances");
const totalsForMonth = vm.runInNewContext("(" + monthlySource + ")", { transactions, monthKey });
const monthly = totalsForMonth("2026-11");
assert.equal(monthly.income, 1000000, "Internal transfer is not counted as income");
assert.equal(monthly.expense, 50000, "Internal transfer is not counted as expense");

assert.ok(app.includes("function beginTransactionEdit"), "Transaction edit flow is present");
assert.ok(app.includes("cancelEditButton"), "Transaction edit can be cancelled");
assert.ok(app.includes('button.hasAttribute("data-edit")'), "Edit action is handled");
assert.ok(app.includes('button.getAttribute("data-delete")'), "Delete action is handled");
assert.ok(html.includes('id="cancelEditButton"'), "Edit cancellation control is rendered");
assert.ok(html.includes('id="savingsRateValue"'), "Statistics cards are rendered");
assert.ok(html.includes('id="monthlyTransactionCount"'), "Monthly transaction count statistic is rendered");
assert.ok(html.includes('id="netFlowRing"') && html.includes('id="savingsRateRing"'), "Circular statistic indicators are rendered");
assert.ok(app.includes("ACTION_CREATE_DOCUMENT") === false, "Android saving is delegated to the native document picker");
assert.ok(app.includes('saveSpreadsheet({ fileName: fileName, content: workbook })'), "Excel file is sent to the Android save bridge");
assert.ok(androidBranding.includes("Intent.ACTION_CREATE_DOCUMENT"), "Android export opens the system Save As picker");
assert.ok(androidBranding.includes("@ActivityCallback"), "Android export waits for the document picker result");
assert.ok(androidBranding.includes('openOutputStream(targetUri, "w")'), "Android export writes the workbook to the chosen file URI");
assert.ok(app.includes("new Blob([workbook]"), "Browser export creates an Excel-compatible workbook");
assert.ok(css.includes(".stat-ring{"), "Circular stat indicators have dedicated styling");
assert.ok(css.includes(".app-page>.page-heading{"), "Every page has a consistent premium page header");

assert.ok(html.includes('data-chart-range="12"'), "Twelve-month chart range is available");
assert.ok(html.includes('id="performanceMode"'), "User can choose device performance mode");
assert.ok(app.includes("duitku-performance-mode"), "Performance preference is saved");
assert.ok(bootstrap.includes("window.DuitKuUpdater"), "The in-app updater API is exposed at startup");
assert.ok(app.includes("window.DuitKuUpdater.apply"), "The update button applies assets inside the app");
assert.ok(css.includes("html.lite-mode"), "Low-power rendering profile is present");
assert.ok(!css.includes("fonts.googleapis.com"), "No remote Google Fonts request is required");
assert.ok(css.includes(".table-wrap table{display:block!important;width:100%!important;min-width:0!important"), "Mobile history fits screen width");

const htmlVersion = html.match(/<meta name="duitku-version" content="([^"]+)"/);
assert.ok(htmlVersion, "HTML version metadata exists");
assert.equal(update.version, packageJson.version, "Update manifest matches package version");
assert.equal(update.version, htmlVersion[1], "Update manifest matches HTML version");

console.log("DuitKu finance, update, statistics, and performance smoke tests passed.");
