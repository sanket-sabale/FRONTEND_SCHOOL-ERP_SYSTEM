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

const { admissionService } = loadTsModule(join(root, "src", "features", "admissions", "services", "admission-service"));
const { admissionCommunicationService } = loadTsModule(join(root, "src", "features", "admissions", "services", "admission-communication-service"));
const { tenantContext } = loadTsModule(join(root, "src", "lib", "tenant-context"));
const { hasPermission } = loadTsModule(join(root, "src", "components", "shared", "permission-gate"));

const scope = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

test("admission communication resolves guardians and dispatches through communication center", async () => {
  const intent = await admissionService.sendAdmissionCommunication({
    ...scope,
    applicationId: "admission-app-001",
    actorId: "current-user",
    event: "evaluation_scheduled",
    message: "Please attend the scheduled admission interaction.",
  });
  assert.equal(intent.status, "sent");
  assert.equal(intent.conversationId, "conv-fee-reminders");
  assert.equal(intent.recipientGuardianIds.includes("guardian-001"), true);

  const summary = await admissionCommunicationService.getApplicationCommunicationSummary(scope, "admission-app-001");
  assert.equal(summary.some((item) => item.id === intent.id), true);

  const detail = await admissionService.getApplication(scope, "admission-app-001");
  assert.equal(detail.auditEvents.some((event) => event.action === "communication_sent"), true);
});

test("admission communication is scoped and permission-separated", async () => {
  await assert.rejects(
    () => admissionService.sendAdmissionCommunication({ ...scope, tenantId: "tenant-other", applicationId: "admission-app-001", actorId: "current-user", event: "approved" }),
    /could not be found/,
  );
  assert.equal(hasPermission("principal", "communication.send"), true);
  assert.equal(hasPermission("accountant", "communication.send"), true);
  assert.equal(hasPermission("teacher", "communication.broadcast"), false);
});
