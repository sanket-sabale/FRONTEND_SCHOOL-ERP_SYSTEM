import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const sourcePath = join(process.cwd(), "src", "features", "admissions", "services", "admission-rules.ts");
const source = readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    verbatimModuleSyntax: false,
  },
});

const cjsModule = { exports: {} };
vm.runInNewContext(compiled.outputText, { exports: cjsModule.exports, module: cjsModule, require }, { filename: sourcePath });

const {
  canTransitionApplicationStatus,
  deriveSeatAvailability,
  hasVerifiedRequiredDocuments,
  isInAdmissionScope,
  summarizeAdmissionDocuments,
  validateAdmissionTransition,
  validateEnrollmentPrerequisites,
  validatePermission,
  validateScopeMatch,
} = cjsModule.exports;

const scope = {
  tenantId: "tenant-1",
  schoolId: "school-1",
  campusId: "campus-1",
  academicYearId: "ay-1",
};

test("admission status machine allows only configured transitions", () => {
  assert.equal(canTransitionApplicationStatus("draft", "submitted"), true);
  assert.equal(canTransitionApplicationStatus("submitted", "approved"), false);
  assert.equal(validateAdmissionTransition("submitted", "under_review").valid, true);
  assert.equal(validateAdmissionTransition("rejected", "approved").valid, false);
});

test("tenant scope validation blocks cross-campus admission records", () => {
  assert.equal(validateScopeMatch(scope, scope).valid, true);
  assert.equal(validateScopeMatch({ ...scope, campusId: "campus-2" }, scope).valid, false);
  assert.equal(isInAdmissionScope({ ...scope, admissionCycleId: "cycle-1" }, { ...scope, admissionCycleId: "cycle-1" }), true);
  assert.equal(isInAdmissionScope({ ...scope, admissionCycleId: "cycle-2" }, { ...scope, admissionCycleId: "cycle-1" }), false);
});

test("document summary and enrollment prerequisites require verified documents", () => {
  const documents = [
    { ...scope, id: "doc-1", applicationId: "app-1", documentType: "birth_certificate", status: "verified", required: true },
    { ...scope, id: "doc-2", applicationId: "app-1", documentType: "address_proof", status: "required", required: true },
  ];

  const summary = summarizeAdmissionDocuments(documents);
  assert.equal(summary.required, 2);
  assert.equal(summary.verified, 1);
  assert.equal(summary.pending, 0);
  assert.equal(summary.missing, 1);
  assert.equal(summary.rejected, 0);
  assert.equal(hasVerifiedRequiredDocuments(documents), false);
  assert.equal(
    validateEnrollmentPrerequisites({
      application: { ...scope, id: "app-1", status: "confirmed" },
      documents,
      seatAvailable: 1,
    }).valid,
    false,
  );
});

test("seat availability and permission checks are deterministic", () => {
  assert.equal(deriveSeatAvailability(40, { approved: 5, enrolled: 10, reserved: 2 }), 23);
  assert.equal(deriveSeatAvailability(10, { approved: 8, enrolled: 4, reserved: 1 }), 0);
  assert.equal(validatePermission({ userId: "user-1", scope, permissions: ["admission.view"] }, "admission.view").valid, true);
  assert.equal(validatePermission({ userId: "user-1", scope, permissions: ["admission.view"] }, "admission.approve").valid, false);
});
