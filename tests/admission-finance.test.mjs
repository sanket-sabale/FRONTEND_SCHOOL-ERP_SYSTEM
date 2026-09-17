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
  vm.runInNewContext(compiled.outputText, { exports: cjsModule.exports, module: cjsModule, require: localRequire, process, console, FormData }, { filename: resolvedPath });
  return cjsModule.exports;
}

function resolveWithExtension(filePath) {
  const candidates = [filePath, `${filePath}.ts`, `${filePath}.tsx`, join(filePath, "index.ts"), join(filePath, "index.tsx")];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error(`Cannot resolve ${filePath}`);
  return found;
}

const { admissionFinanceService } = loadTsModule(join(root, "src", "features", "finance", "services", "admission-finance-service"));
const { tenantContext } = loadTsModule(join(root, "src", "lib", "tenant-context"));
const { hasPermission } = loadTsModule(join(root, "src", "components", "shared", "permission-gate"));

const scope = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

test("admission finance summary derives invoice, payment, and clearance state", async () => {
  const applicationId = "finance-app-001";
  const empty = await admissionFinanceService.getApplicationFinancialSummary(scope, applicationId);
  assert.equal(empty.paymentStatus, "not_started");
  assert.equal(empty.financialClearanceStatus, "pending");

  const invoiced = await admissionFinanceService.createAdmissionInvoice({ ...scope, applicationId, actorId: "current-user", amount: 25000, dueDate: "2026-09-30" });
  assert.equal(invoiced.invoiceNumber.startsWith("INV-ADM-"), true);
  assert.equal(invoiced.outstandingAmount, 25000);

  const paymentPending = await admissionFinanceService.recordPayment({ ...scope, applicationId, actorId: "current-user", paidAmount: 25000, method: "UPI" });
  assert.equal(paymentPending.verificationStatus, "pending");
  assert.equal(paymentPending.financialClearanceStatus, "pending");

  const cleared = await admissionFinanceService.verifyPayment({ ...scope, applicationId, actorId: "current-user" });
  assert.equal(cleared.paymentStatus, "paid");
  assert.equal(cleared.financialClearanceStatus, "cleared");
  assert.equal(cleared.outstandingAmount, 0);
});

test("admission finance keeps application and tenant references isolated", async () => {
  const applicationId = "finance-app-tenant";
  await admissionFinanceService.createAdmissionInvoice({ ...scope, applicationId, actorId: "current-user", amount: 10000, dueDate: "2026-10-01" });

  const otherTenant = await admissionFinanceService.getApplicationFinancialSummary({ ...scope, tenantId: "tenant-other" }, applicationId);
  assert.equal(otherTenant.invoiceId, undefined);
  assert.equal(otherTenant.amount, 0);

  await assert.rejects(
    () => admissionFinanceService.recordPayment({ ...scope, tenantId: "tenant-other", applicationId, actorId: "current-user", paidAmount: 10000, method: "Cash" }),
    /Create the admission invoice/,
  );
});

test("finance integration reuses existing finance permission boundary", () => {
  assert.equal(hasPermission("principal", "fees.view"), true);
  assert.equal(hasPermission("accountant", "fees.view"), true);
  assert.equal(hasPermission("teacher", "fees.view"), false);
});
