import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const bootstrap = await readFile(new URL("../app-bootstrap.js", import.meta.url), "utf8");

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
assert.ok(css.includes(".table-wrap table{display:block!important;width:100%!important;min-width:0!important"), "Mobile history fits screen width");
assert.ok(bootstrap.includes("raw.githubusercontent.com/rafaramadhan09/DuitKu/main/"), "OTA loads the owner's repository in-app");

console.log("DuitKu finance logic smoke tests passed.");
