# Admissions Phase 0-2 Status

## Current Scope

- Phase 0 audit confirmed student, guardian, academic structure, tenant context, API error handling, RBAC, and navigation patterns already exist.
- Phase 1 foundation now has its own `admission.*` permissions and a real `/admissions` entry instead of relying on student creation permissions.
- Phase 2 domain foundation now includes admission cycles, applicants, applications, guardians, documents, reviews, evaluations, decisions, enrollment readiness, seat capacity, audit events, Zod schemas, mock data, and a service boundary.

## Implemented Contracts

- Tenant scope: `tenantId`, `schoolId`, `campusId`, and `academicYearId` are required across admission records.
- Admission cycle scope: optional `admissionCycleId` filters and validates cycle-specific work.
- Status machine: draft, submitted, under review, document pending, documents verified, shortlisted, interview scheduled, approved, waitlisted, rejected, fee pending, confirmed, enrolled.
- Safety rules: invalid transitions are rejected, cross-scope records are blocked, enrollment requires confirmed status, verified required documents, and available seats.
- Dashboard/nav integration: admissions dashboard links and action permissions now use `admission.view` / `admission.review`.

## Remaining Work

- Phase 3 application UI: application list, detail page, create/edit forms, filters, assignment workflow, and review workspace.
- Document workflow: upload integration, document versioning UI, verifier actions, rejection notes, and storage provider integration.
- Guardian integration: map applicant guardians to real guardian profiles instead of mock guardian IDs.
- Student enrollment conversion: convert confirmed applications into student records through the existing student service with duplicate checks.
- Fees integration: create invoices and payment gates for `fee_pending` to `confirmed`.
- Notifications: trigger communication events for submission, missing documents, interviews, decisions, and enrollment.
- Backend persistence: replace in-memory mock arrays with API/database calls and server-side authorization.
