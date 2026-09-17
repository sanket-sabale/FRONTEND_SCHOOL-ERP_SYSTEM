# Staff Academic Assignments

Phase 7 connects Staff Management to Academic Structure through tenant-scoped academic responsibility records.

## Purpose

An assignment links one staff member to an academic year, class, section, subject, and responsibility type. It is not a timetable, substitution, payroll, or scheduling engine.

## Assignment Types

- `class_teacher`
- `subject_teacher`
- `assistant_teacher`
- `co_teacher`
- `academic_coordinator`
- `department_head`

## Statuses

- `planned`
- `active`
- `ended`
- `cancelled`

Allowed transitions are centralized in `staff-academic-assignment-rules.ts`:

- planned -> active, cancelled
- active -> ended, cancelled
- ended/cancelled are terminal

## Validation Rules

The service validates staff, academic year, class, section, and subject references before creating or activating assignments. Staff must belong to the trusted tenant scope, class/section relationships must match, archived/inactive academic entities are rejected for active assignments, duplicate active assignments are blocked, and primary responsibility conflicts are blocked.

## Workload Assumption

Workload is informational and assignment-based only. Weekly periods are reported as "Not configured" until a future timetable module provides reliable period allocation.

## Security

Reads use `hr.view`; mutations use `hr.manage`. Tenant scope comes from the existing trusted request context, not client form fields.

## Future Extension

The model is ready for future timetable, substitution, teacher availability, and academic reporting integration without making Phase 7 responsible for scheduling.
