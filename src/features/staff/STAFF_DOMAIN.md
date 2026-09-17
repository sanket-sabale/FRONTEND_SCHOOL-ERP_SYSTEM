# Staff Domain Foundation

Phase 0 establishes Staff as the tenant-owned personnel domain.

## Terminology

- Staff represents a school employee/personnel record.
- User represents authentication and application access.
- A staff member may exist without a user account. The optional `userId` link is only a reference.
- Teaching responsibilities belong to a future Staff Academic Assignment domain, not to the Staff core record.

## Tenant Rule

Staff records are scoped by tenant, school, campus, and academic year in the current mock architecture. Employee numbers are unique within a tenant, not globally across the SaaS platform.

## Lifecycle

Supported statuses:

- active
- on_leave
- suspended
- resigned
- terminated
- retired
- inactive

Status changes are validated by `validateStaffStatusTransition`. Terminal statuses require exit information, and active/on-leave/suspended records cannot carry an exit date.

## Future Boundaries

Staff Attendance, Leave, Documents, Payroll, and Academic Assignments should reference `Staff.id`. They should not create independent employee/person records.
