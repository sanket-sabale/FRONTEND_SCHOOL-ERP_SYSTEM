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
const { admissionFinanceService } = loadTsModule(join(root, "src", "features", "finance", "services", "admission-finance-service"));
const { studentService } = loadTsModule(join(root, "src", "lib", "api", "students"));
const { tenantContext } = loadTsModule(join(root, "src", "lib", "tenant-context"));
const { hasPermission } = loadTsModule(join(root, "src", "components", "shared", "permission-gate"));

const scope = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

test("enrollment requires approval, financial clearance, and explicit confirmation", async () => {
  const created = await createReadyApprovedApplication("Enroll", "Candidate", "class-grade-8", "section-grade-8-b-empty");
  let readiness = await admissionService.getEnrollmentReadiness(scope, created.id);
  assert.equal(readiness.eligible, false);
  assert.equal(readiness.blockingReasons.some((reason) => reason.includes("Finance")), true);

  await admissionFinanceService.createAdmissionInvoice({ ...scope, applicationId: created.id, actorId: "current-user", amount: 25000, dueDate: "2026-09-30" });
  await admissionFinanceService.recordPayment({ ...scope, applicationId: created.id, actorId: "current-user", paidAmount: 25000, method: "UPI" });
  await admissionFinanceService.verifyPayment({ ...scope, applicationId: created.id, actorId: "current-user" });
  readiness = await admissionService.getEnrollmentReadiness(scope, created.id);
  assert.equal(readiness.eligible, true);

  const enrollment = await admissionService.confirmAdmission({ ...scope, applicationId: created.id, actorId: "current-user" });
  assert.equal(enrollment.status, "confirmed");
  assert.equal(enrollment.studentId, undefined);

  const repeatedConfirmation = await admissionService.confirmAdmission({ ...scope, applicationId: created.id, actorId: "current-user" });
  assert.equal(repeatedConfirmation.id, enrollment.id);

  const completed = await admissionService.completeEnrollment({ ...scope, applicationId: created.id, actorId: "current-user" });
  assert.equal(completed.status, "enrolled");
  assert.ok(completed.studentId);

  const repeatedCompletion = await admissionService.completeEnrollment({ ...scope, applicationId: created.id, actorId: "current-user" });
  assert.equal(repeatedCompletion.studentId, completed.studentId);

  const student = await studentService.getStudent(scope, completed.studentId);
  assert.equal(student.displayName, "Enroll Candidate");
  assert.equal(student.guardianSummaries.some((guardian) => guardian.guardianId === "guardian-001"), true);
});

test("enrollment is tenant scoped and permission-separated", async () => {
  const created = await createReadyApprovedApplication("Tenant", "Enrollment", "class-grade-9", "section-grade-9-b-empty");
  await admissionFinanceService.createAdmissionInvoice({ ...scope, applicationId: created.id, actorId: "current-user", amount: 10000, dueDate: "2026-09-30" });
  await admissionFinanceService.recordPayment({ ...scope, applicationId: created.id, actorId: "current-user", paidAmount: 10000, method: "Cash" });
  await admissionFinanceService.verifyPayment({ ...scope, applicationId: created.id, actorId: "current-user" });

  await assert.rejects(
    () => admissionService.confirmAdmission({ ...scope, tenantId: "tenant-other", applicationId: created.id, actorId: "current-user" }),
    /could not be found/,
  );
  assert.equal(hasPermission("principal", "admission.confirm"), true);
  assert.equal(hasPermission("principal", "admission.enroll"), true);
  assert.equal(hasPermission("accountant", "admission.enroll"), false);
});

async function createReadyApprovedApplication(firstName, lastName, classId, sectionId) {
  await ensureSeatCapacity(classId, sectionId);
  const created = await admissionService.createApplication({
    ...scope,
    admissionCycleId: "cycle-2026-27-main",
    firstName,
    lastName,
    appliedClassId: classId,
    appliedSectionId: sectionId,
    guardians: [{ applicantId: "pending-applicant", guardianId: "guardian-001", relationshipType: "father", isPrimary: true, isEmergencyContact: true, canReceiveCommunication: true, canPickup: true }],
  });
  await admissionService.submitApplication({ ...scope, applicationId: created.id, actorId: "current-user" });
  await verifyRequiredDocuments(created.id);
  await admissionService.assignReviewer({ ...scope, applicationId: created.id, reviewerId: "staff-admission-001", actorId: "current-user" });
  await admissionService.startReview({ ...scope, applicationId: created.id, reviewerId: "staff-admission-001", actorId: "current-user" });
  await admissionService.completeReview({ ...scope, applicationId: created.id, reviewerId: "staff-admission-001", decision: "proceed", actorId: "current-user" });
  const evaluation = await admissionService.createEvaluation({ ...scope, applicationId: created.id, type: "interview", scheduledAt: "2026-09-12T10:00:00+05:30", evaluatorId: "staff-admission-001", actorId: "current-user" });
  await admissionService.startEvaluation({ ...scope, applicationId: created.id, evaluationId: evaluation.id, actorId: "current-user" });
  await admissionService.recordEvaluationResult({ ...scope, applicationId: created.id, evaluationId: evaluation.id, result: "recommended", actorId: "current-user" });
  await admissionService.shortlistApplication({ ...scope, applicationId: created.id, actorId: "current-user" });
  return admissionService.approveApplication({ ...scope, applicationId: created.id, actorId: "current-user" });
}

async function ensureSeatCapacity(classId, sectionId) {
  try {
    await admissionService.createSeatCapacity({
      ...scope,
      admissionCycleId: "cycle-2026-27-main",
      classId,
      sectionId,
      capacity: 24,
      actorId: "current-user",
    });
  } catch (error) {
    if (!String(error.message).includes("already exists")) throw error;
  }
}

async function verifyRequiredDocuments(applicationId) {
  const detail = await admissionService.getApplication(scope, applicationId);
  for (const document of detail.documents.filter((item) => item.required)) {
    await admissionService.uploadDocument({ ...scope, applicationId, documentId: document.id, actorId: "current-user", fileName: `${document.documentType}.pdf`, mimeType: "application/pdf", fileSize: 1200 });
    await admissionService.verifyDocument({ ...scope, applicationId, documentId: document.id, actorId: "current-user" });
  }
}
