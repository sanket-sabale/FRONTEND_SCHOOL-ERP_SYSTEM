# Admissions Phase 8-10 Integration

## Finance Boundary

Admissions reads admission fee state through `admissionFinanceService`. The finance contract exposes only admissions-facing fields: invoice reference, fee amount, paid/outstanding amount, payment verification, financial clearance, due date, and payment history.

Finance state remains separate from `AdmissionApplication.status`. Application approval, payment verification, financial clearance, and enrollment are modeled as separate lifecycle concerns.

## Enrollment Bridge

Enrollment is explicit. The flow is:

`Application -> Approval -> Finance Clearance -> Admission Confirmation -> Enrollment -> Student`

`confirmAdmission()` creates the enrollment bridge only after service-side readiness checks pass. `completeEnrollment()` then creates or links the downstream student through `studentService`; the UI never converts an application directly into a student.

## Communication

Admission communication uses `admissionCommunicationService` to create scoped communication intents and dispatches messages through the existing `communicationService`. Recipient resolution is based on communication-enabled guardian relationships attached to the application.

## Audit

State-changing admission operations continue to write scoped admission audit events. Application 360 combines workflow audit records with section summaries for finance, communication, and enrollment.

## Backend Compatibility Notes

The current implementation is mock-backed. A Spring Boot/PostgreSQL backend should enforce:

- database-level tenant isolation and authorization
- transaction-safe seat allocation
- invoice/payment ownership constraints
- idempotent confirmation and enrollment requests
- unique admission number constraints
- durable audit and communication persistence
- real payment gateway and communication provider integrations
