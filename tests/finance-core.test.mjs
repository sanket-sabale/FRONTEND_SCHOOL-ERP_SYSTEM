import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const nativeRequire = createRequire(import.meta.url);
const root = process.cwd();
const cache = new Map();

function loadTsModule(filePath) {
  const resolvedPath = resolveWithExtension(filePath);
  if (cache.has(resolvedPath)) return cache.get(resolvedPath).exports;
  const source = readFileSync(resolvedPath, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: false } });
  const cjsModule = { exports: {} };
  cache.set(resolvedPath, cjsModule);
  function localRequire(specifier) {
    if (specifier.startsWith("@/")) return loadTsModule(join(root, "src", specifier.slice(2)));
    if (specifier.startsWith(".")) return loadTsModule(join(dirname(resolvedPath), specifier));
    return nativeRequire(specifier);
  }
  vm.runInNewContext(compiled.outputText, { exports: cjsModule.exports, module: cjsModule, require: localRequire, process, console, FormData, Intl }, { filename: resolvedPath });
  return cjsModule.exports;
}

function resolveWithExtension(filePath) {
  const candidates = [filePath, `${filePath}.ts`, `${filePath}.tsx`, join(filePath, "index.ts"), join(filePath, "index.tsx")];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error(`Cannot resolve ${filePath}`);
  return found;
}

const { financeService } = loadTsModule(join(root, "src", "lib", "api", "finance"));
const { addMoney, money, subtractMoney, compareMoney } = loadTsModule(join(root, "src", "lib", "platform", "money"));
const { tenantContext } = loadTsModule(join(root, "src", "lib", "tenant-context"));

const scope = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

const accountantContext = {
  ...scope,
  actorId: "user-priya-kulkarni",
  role: "accountant",
};

test("money helpers use decimal string contracts and deterministic arithmetic", () => {
  assert.deepEqual(addMoney(money("10.25"), money("2.75")), money("13.00"));
  assert.deepEqual(subtractMoney(money("10.25"), money("2.75")), money("7.50"));
  assert.equal(compareMoney(money("10.25"), money("10.24")), 1);
});

test("finance lists and summaries remain tenant scoped", async () => {
  const invoices = await financeService.listInvoices(scope, { page: 1, pageSize: 20 });
  assert.equal(invoices.items.some((invoice) => invoice.id === "inv-west"), false);
  assert.equal(await financeService.getInvoice({ ...scope, tenantId: "tenant-demo-west" }, "inv-001"), null);

  const dashboard = await financeService.getDashboard(scope);
  assert.equal(Number(dashboard.totalBilled.amount) > 0, true);
  assert.equal(dashboard.recentInvoices.some((invoice) => invoice.tenantId !== scope.tenantId), false);
});

test("payment lifecycle prevents duplicates and issues receipt after verification", async () => {
  const payment = await financeService.recordPayment({
    ...accountantContext,
    invoiceId: "inv-001",
    amount: money("1000.00"),
    method: "upi",
    externalReference: "PHASE12-UPI-001",
    idempotencyKey: "phase12-payment-001",
  });
  assert.equal(payment.status, "pending_verification");

  await assert.rejects(
    () => financeService.recordPayment({
      ...accountantContext,
      invoiceId: "inv-001",
      amount: money("1000.00"),
      method: "upi",
      idempotencyKey: "phase12-payment-001",
    }),
    /idempotency key/,
  );

  const verified = await financeService.verifyPayment({ ...accountantContext, paymentId: payment.id });
  assert.equal(verified.payment.status, "verified");
  assert.equal(verified.receipt.paymentId, payment.id);
  assert.equal(verified.invoice.balance.amount, "23000.00");
});

test("dues are finance-owned and refund requests are controlled", async () => {
  const dues = await financeService.listDues(scope, { page: 1, pageSize: 20 });
  assert.equal(dues.items.every((due) => Number(due.outstanding.amount) > 0), true);

  const refund = await financeService.requestRefund({
    ...accountantContext,
    paymentId: "pay-002",
    amount: money("1000.00"),
    reason: "Admission cancellation adjustment",
    refundId: "phase12-refund-001",
  });
  assert.equal(refund.status, "requested");

  await assert.rejects(
    () => financeService.requestRefund({
      ...accountantContext,
      paymentId: "pay-002",
      amount: money("50000.00"),
      reason: "Invalid excessive refund",
    }),
    /cannot exceed/,
  );
});
