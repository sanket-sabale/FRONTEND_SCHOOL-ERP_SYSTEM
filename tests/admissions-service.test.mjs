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
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: false,
    },
  });
  const cjsModule = { exports: {} };
  cache.set(resolvedPath, cjsModule);

  function localRequire(specifier) {
    if (specifier.startsWith("@/")) {
      return loadTsModule(join(root, "src", specifier.slice(2)));
    }
    if (specifier.startsWith(".")) {
      return loadTsModule(join(dirname(resolvedPath), specifier));
    }
    return nativeRequire(specifier);
  }

  vm.runInNewContext(
    compiled.outputText,
    { exports: cjsModule.exports, module: cjsModule, require: localRequire, process, console, FormData },
    { filename: resolvedPath },
  );
  return cjsModule.exports;
}

function resolveWithExtension(filePath) {
  const candidates = [filePath, `${filePath}.ts`, `${filePath}.tsx`, join(filePath, "index.ts"), join(filePath, "index.tsx")];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error(`Cannot resolve ${filePath}`);
  return found;
}

const { admissionService } = loadTsModule(join(root, "src", "features", "admissions", "services", "admission-service"));
const { hasPermission } = loadTsModule(join(root, "src", "components", "shared", "permission-gate"));
const { tenantContext } = loadTsModule(join(root, "src", "lib", "tenant-context"));

const scope = {
  tenantId: tenantContext.tenantId,
  schoolId: tenantContext.schoolId,
  campusId: tenantContext.campusId,
  academicYearId: tenantContext.academicYearId,
};

test("application queries are tenant scoped, searchable, filterable, and paginated", async () => {
  const firstPage = await admissionService.getApplications(scope, { page: 1, pageSize: 1 });
  assert.equal(firstPage.items.length, 1);
  assert.equal(firstPage.total >= 2, true);
  assert.equal(firstPage.items[0].tenantId, scope.tenantId);

  const search = await admissionService.getApplications(scope, { query: "Riya", page: 1, pageSize: 10 });
  assert.equal(search.items.some((item) => item.applicantName === "Riya Sharma"), true);

  const filtered = await admissionService.getApplications(scope, { status: "document_pending", page: 1, pageSize: 10 });
  assert.equal(filtered.items.every((item) => item.status === "document_pending"), true);

  const crossTenant = await admissionService.getApplication({ ...scope, tenantId: "tenant-other" }, "admission-app-001");
  assert.equal(crossTenant, null);
});

test("application create, edit, and submit use service lifecycle rules", async () => {
  const created = await admissionService.createApplication({
    ...scope,
    admissionCycleId: "cycle-2026-27-main",
    firstName: "Mira",
    lastName: "Patil",
    appliedClassId: "class-grade-1",
    appliedSectionId: "section-grade-1-a",
    phone: "+91 90000 88001",
    source: "website",
    priority: "normal",
    guardians: [],
  });
  assert.equal(created.status, "draft");

  const updated = await admissionService.updateApplication({
    ...scope,
    id: created.id,
    firstName: "Meera",
    assignedReviewerId: "staff-admission-001",
  });
  assert.equal(updated.applicantName, "Meera Patil");

  const submitted = await admissionService.submitApplication({ ...scope, applicationId: created.id, actorId: "current-user" });
  assert.equal(submitted.status, "submitted");

  await assert.rejects(
    () => admissionService.transitionApplicationStatus({ ...scope, applicationId: created.id, actorId: "current-user", nextStatus: "approved" }),
    /Cannot move admission application/,
  );
});

test("document lifecycle supports upload, verification, rejection reason, and re-upload versioning", async () => {
  const created = await admissionService.createApplication({
    ...scope,
    admissionCycleId: "cycle-2026-27-main",
    firstName: "Dev",
    lastName: "Iyer",
    appliedClassId: "class-grade-1",
    source: "walk_in",
    priority: "normal",
    guardians: [],
  });
  const detail = await admissionService.getApplication(scope, created.id);
  const document = detail.documents.find((item) => item.required);
  assert.equal(document.status, "required");

  const uploaded = await admissionService.uploadDocument({ ...scope, applicationId: created.id, documentId: document.id, actorId: "current-user", fileName: "birth.pdf", mimeType: "application/pdf", fileSize: 1000 });
  assert.equal(uploaded.status, "uploaded");

  const underVerification = await admissionService.startDocumentVerification({ ...scope, applicationId: created.id, documentId: document.id, actorId: "current-user" });
  assert.equal(underVerification.status, "under_verification");

  const verified = await admissionService.verifyDocument({ ...scope, applicationId: created.id, documentId: document.id, actorId: "current-user" });
  assert.equal(verified.status, "verified");

  const secondDocument = detail.documents.find((item) => item.id !== document.id && item.required);
  await admissionService.uploadDocument({ ...scope, applicationId: created.id, documentId: secondDocument.id, actorId: "current-user", fileName: "address.pdf", mimeType: "application/pdf", fileSize: 1000 });
  await assert.rejects(
    () => admissionService.rejectDocument({ ...scope, applicationId: created.id, documentId: secondDocument.id, actorId: "current-user", rejectionReason: "unclear" }),
    /Too small/,
  );
  const rejected = await admissionService.rejectDocument({ ...scope, applicationId: created.id, documentId: secondDocument.id, actorId: "current-user", rejectionReason: "Document is unclear. Please upload a readable copy." });
  assert.equal(rejected.status, "rejected");
  const reuploaded = await admissionService.uploadDocument({ ...scope, applicationId: created.id, documentId: secondDocument.id, actorId: "current-user", fileName: "address-v2.pdf", mimeType: "application/pdf", fileSize: 1000 });
  assert.equal(reuploaded.version, rejected.version + 1);
});

test("document queue and RBAC separate view, edit, submit, and verify permissions", async () => {
  const queue = await admissionService.getDocumentQueue(scope, { status: "required", page: 1, pageSize: 10 });
  assert.equal(queue.items.every((item) => item.tenantId === scope.tenantId && item.status === "required"), true);

  assert.equal(hasPermission("principal", "admission.view"), true);
  assert.equal(hasPermission("principal", "admission.edit"), true);
  assert.equal(hasPermission("principal", "admission.submit"), true);
  assert.equal(hasPermission("principal", "admission.verify_documents"), true);
  assert.equal(hasPermission("accountant", "admission.view"), true);
  assert.equal(hasPermission("accountant", "admission.edit"), false);
  assert.equal(hasPermission("accountant", "admission.verify_documents"), false);
});

test("review queue is tenant scoped and supports assignment, start, and completion", async () => {
  const created = await admissionService.createApplication({
    ...scope,
    admissionCycleId: "cycle-2026-27-main",
    firstName: "Review",
    lastName: "Candidate",
    appliedClassId: "class-grade-1",
    appliedSectionId: "section-grade-1-a",
    guardians: [],
  });
  await admissionService.submitApplication({ ...scope, applicationId: created.id, actorId: "current-user" });

  const assigned = await admissionService.assignReviewer({ ...scope, applicationId: created.id, reviewerId: "staff-admission-001", actorId: "current-user" });
  assert.equal(assigned.status, "assigned");

  const started = await admissionService.startReview({ ...scope, applicationId: created.id, reviewerId: "staff-admission-001", actorId: "current-user" });
  assert.equal(started.status, "in_progress");

  const completed = await admissionService.completeReview({
    ...scope,
    applicationId: created.id,
    reviewerId: "staff-admission-001",
    decision: "proceed",
    score: 88,
    remarks: "Ready for evaluation.",
    actorId: "current-user",
  });
  assert.equal(completed.status, "completed");

  const queue = await admissionService.getReviewQueue(scope, { query: "Review Candidate", page: 1, pageSize: 10 });
  assert.equal(queue.items.some((item) => item.id === created.id && item.reviewStatus === "completed"), true);

  const crossTenantQueue = await admissionService.getReviewQueue({ ...scope, tenantId: "tenant-other" }, { page: 1, pageSize: 100 });
  assert.equal(crossTenantQueue.items.some((item) => item.id === created.id), false);
});

test("evaluation lifecycle supports create, start, complete, and scoped queue results", async () => {
  const created = await createSubmittedApplication("Evaluation", "Candidate");
  await admissionService.assignReviewer({ ...scope, applicationId: created.id, reviewerId: "staff-admission-001", actorId: "current-user" });
  await admissionService.startReview({ ...scope, applicationId: created.id, reviewerId: "staff-admission-001", actorId: "current-user" });

  const evaluation = await admissionService.createEvaluation({
    ...scope,
    applicationId: created.id,
    type: "interaction",
    scheduledAt: "2026-09-10T10:00:00+05:30",
    evaluatorId: "staff-admission-001",
    actorId: "current-user",
  });
  assert.equal(evaluation.status, "scheduled");

  const started = await admissionService.startEvaluation({ ...scope, applicationId: created.id, evaluationId: evaluation.id, actorId: "current-user" });
  assert.equal(started.status, "in_progress");

  const completed = await admissionService.recordEvaluationResult({
    ...scope,
    applicationId: created.id,
    evaluationId: evaluation.id,
    score: 91,
    result: "recommended",
    actorId: "current-user",
  });
  assert.equal(completed.status, "completed");

  const queue = await admissionService.getEvaluationQueue(scope, { query: "Evaluation Candidate", page: 1, pageSize: 10 });
  assert.equal(queue.items.some((item) => item.id === evaluation.id && item.status === "completed"), true);
});

test("decisions enforce readiness, seats, and audit-backed status changes", async () => {
  const created = await createSubmittedApplication("Decision", "Candidate");
  await assert.rejects(
    () => admissionService.shortlistApplication({ ...scope, applicationId: created.id, actorId: "current-user" }),
    /Required documents|review|evaluation|workflow/,
  );

  await verifyRequiredDocuments(created.id);
  await admissionService.assignReviewer({ ...scope, applicationId: created.id, reviewerId: "staff-admission-001", actorId: "current-user" });
  await admissionService.startReview({ ...scope, applicationId: created.id, reviewerId: "staff-admission-001", actorId: "current-user" });
  await admissionService.completeReview({ ...scope, applicationId: created.id, reviewerId: "staff-admission-001", decision: "proceed", actorId: "current-user" });
  const evaluation = await admissionService.createEvaluation({
    ...scope,
    applicationId: created.id,
    type: "interview",
    scheduledAt: "2026-09-11T10:00:00+05:30",
    evaluatorId: "staff-admission-001",
    actorId: "current-user",
  });
  await admissionService.startEvaluation({ ...scope, applicationId: created.id, evaluationId: evaluation.id, actorId: "current-user" });
  await admissionService.recordEvaluationResult({ ...scope, applicationId: created.id, evaluationId: evaluation.id, result: "recommended", actorId: "current-user" });

  const readiness = await admissionService.getDecisionReadiness(scope, created.id);
  assert.equal(readiness.eligible, true);

  const shortlisted = await admissionService.shortlistApplication({ ...scope, applicationId: created.id, actorId: "current-user", reason: "Strong fit." });
  assert.equal(shortlisted.status, "shortlisted");

  const waitlisted = await admissionService.waitlistApplication({ ...scope, applicationId: created.id, actorId: "current-user", reason: "Capacity review.", waitlistPosition: 1 });
  assert.equal(waitlisted.status, "waitlisted");

  const approved = await admissionService.approveApplication({ ...scope, applicationId: created.id, actorId: "current-user", reason: "Seat opened." });
  assert.equal(approved.status, "approved");

  const detail = await admissionService.getApplication(scope, created.id);
  assert.equal(detail.decisions.some((decision) => decision.decision === "approved"), true);
  assert.equal(detail.auditEvents.some((event) => event.action === "application_approved"), true);
});

test("seat capacity list, create, and update stay scoped", async () => {
  const before = await admissionService.getSeatAvailabilityList(scope, { page: 1, pageSize: 100 });
  assert.equal(before.items.every((item) => item.tenantId === scope.tenantId), true);

  const created = await admissionService.createSeatCapacity({
    ...scope,
    admissionCycleId: "cycle-2026-27-main",
    classId: "class-grade-9",
    capacity: 24,
    actorId: "current-user",
  });
  assert.equal(created.available, 24);

  const updated = await admissionService.updateSeatCapacity({
    ...scope,
    id: created.id,
    admissionCycleId: "cycle-2026-27-main",
    classId: "class-grade-9",
    capacity: 28,
    actorId: "current-user",
  });
  assert.equal(updated.capacity, 28);

  await assert.rejects(
    () => admissionService.updateSeatCapacity({ ...scope, tenantId: "tenant-other", id: created.id, admissionCycleId: "cycle-2026-27-main", classId: "class-grade-9", capacity: 30, actorId: "current-user" }),
    /not be found/,
  );
});

async function createSubmittedApplication(firstName, lastName) {
  const created = await admissionService.createApplication({
    ...scope,
    admissionCycleId: "cycle-2026-27-main",
    firstName,
    lastName,
    appliedClassId: "class-grade-1",
    appliedSectionId: "section-grade-1-a",
    guardians: [],
  });
  await admissionService.submitApplication({ ...scope, applicationId: created.id, actorId: "current-user" });
  return created;
}

async function verifyRequiredDocuments(applicationId) {
  const detail = await admissionService.getApplication(scope, applicationId);
  for (const document of detail.documents.filter((item) => item.required)) {
    await admissionService.uploadDocument({
      ...scope,
      applicationId,
      documentId: document.id,
      actorId: "current-user",
      fileName: `${document.documentType}.pdf`,
      mimeType: "application/pdf",
      fileSize: 1200,
    });
    await admissionService.verifyDocument({ ...scope, applicationId, documentId: document.id, actorId: "current-user" });
  }
}
