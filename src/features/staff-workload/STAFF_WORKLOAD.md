# Staff Workload & Scheduling Readiness

Phase 8 adds an operational layer around staff academic assignments. It does not create a timetable engine.

## Domain Purpose

Staff academic assignments remain the source of truth for who teaches which class, section, and subject. Staff Workload adds:

- expected weekly teaching load
- optional assignment weekly-period configuration
- assignment workload contribution
- staff academic availability
- deterministic conflict detection
- scheduling readiness indicators

## Calculation Rules

The current period model is weekly.

- `assignedWeeklyPeriods` is the sum of active assignment workload configs that contribute to workload.
- ended, cancelled, planned, and other non-active assignments do not contribute.
- if expected weekly periods are missing, status is `not_configured`.
- utilization is rounded to one decimal place.

Thresholds are centralized in `staff-workload-rules.ts`.

## Readiness

Readiness is derived from staff lifecycle, workload configuration gaps, workload status, and scheduling conflicts.

- `ready`: no blockers or warnings
- `needs_configuration`: expected workload or assignment periods are missing
- `has_warnings`: usable but requires review
- `blocked`: conflicts or lifecycle issues require action before scheduling

## Conflict Rules

Phase 8 detects:

- same staff assigned to the same day/period twice
- same class/section assigned to different responsibilities in the same day/period
- assignment scheduled while staff is unavailable
- active assignment missing weekly-period configuration

The system reports conflicts only. It does not resolve them.

## Tenant Isolation

All workload, assignment config, expected workload, availability, readiness, and conflict evaluation is scoped by the trusted tenant context.

## Permissions

- `hr.view`: dashboard, detail, readiness, availability
- `hr.manage`: assignment workload configuration

UI visibility is not the security boundary. Server actions and services enforce permissions and scope.

## Known Limitations

- no full timetable generation
- no automatic period-slot generation
- no real Subject master integration yet
- no payroll or compensation calculation
- mock/in-memory persistence only

## Future Timetable Integration

Future timetable work can replace the lightweight slot/config records with a real timetable source while preserving workload calculations and readiness summaries as a read model.
