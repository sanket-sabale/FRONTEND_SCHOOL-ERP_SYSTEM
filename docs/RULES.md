# School ERP System — Engineering & Implementation Rules

**Project:** School ERP SaaS Platform
**Organization:** Hoofixsoft
**Status:** Living Engineering Standard

---

# 1. Purpose

These rules define how the School ERP codebase must be developed, modified, reviewed, optimized, and extended.

They apply to:

* Human developers
* AI coding agents
* Codex
* Code reviewers
* Future contributors

---

# 2. Golden Rules

1. Do not break existing functionality.
2. Do not invent infrastructure that does not exist.
3. Inspect existing architecture before changing code.
4. Reuse established patterns.
5. Keep business logic outside UI.
6. Keep tenant boundaries explicit.
7. Never trust client authorization.
8. Prefer strong typing.
9. Validate at boundaries.
10. Optimize based on measurement.
11. Keep mobile compatibility in mind.
12. Avoid unnecessary dependencies.
13. Keep changes focused.
14. Test every meaningful change.
15. Update documentation when architecture changes.

---

# 3. TypeScript Rules

Prefer:

```ts
type
interface
enum / const objects where appropriate
generics
discriminated unions
```

Avoid:

```ts
any
as any
unknown without narrowing
implicit nullable behavior
unsafe casts
```

Every type assertion must have a reason.

---

# 4. Component Rules

Components should have one clear responsibility.

Avoid:

```text
1,500-line page component
```

Prefer:

```text
Page
 ├── Header
 ├── Filters
 ├── Table
 ├── Summary
 ├── Dialog
 └── Feature Actions
```

---

# 5. Business Logic Rules

Business rules must not live primarily in:

* JSX
* click handlers
* styling files
* table rendering
* page components

Business logic belongs in:

* domain
* service
* application layer

---

# 6. Validation Rules

Every external input must be considered untrusted.

Validate:

* Forms
* Query parameters
* Route parameters
* API payloads
* Imported data
* File metadata
* Filter objects

---

# 7. Tenant Rules

Every tenant-owned query must be tenant-scoped.

Never do:

```ts
studentRepository.findById(studentId)
```

if the repository cannot guarantee tenant isolation.

Prefer:

```text
Trusted Tenant Context
        ↓
Repository
        ↓
Tenant-scoped Query
```

---

# 8. Authorization Rules

Permissions must be checked at the operation boundary.

Do not rely only on:

```text
hide button
```

or:

```text
hide navigation item
```

Authorization should exist in:

* navigation
* route
* application/service layer
* backend

where applicable.

---

# 9. Data Rules

Do not duplicate the source of truth unnecessarily.

For example:

Student identity:

```text
Student
```

Academic membership:

```text
Placement
```

Do not turn temporary UI state into permanent domain truth.

---

# 10. State Rules

Use the smallest appropriate state scope.

Prefer:

```text
local state
```

over:

```text
global state
```

unless multiple independent features genuinely need the state.

---

# 11. Fetching Rules

Avoid:

* duplicate requests
* request waterfalls
* fetching entire datasets unnecessarily
* fetching data that the page does not use

Prefer:

* pagination
* selective fields
* server fetching
* caching where safe
* parallel requests where independent

---

# 12. Performance Rules

Performance work must be measured.

Before optimizing:

```text
Identify bottleneck
↓
Measure
↓
Optimize
↓
Measure again
```

Do not optimize code solely because it "looks slow".

---

# 13. Client Component Rules

Use `"use client"` only when required.

Typical reasons:

* interaction
* browser API
* local interactive state
* client-only library

Do not make parent trees client-side unnecessarily.

---

# 14. Browser API Rules

Browser-specific APIs must not leak into shared domain code.

Examples:

```text
window
document
localStorage
File
FileList
URL.createObjectURL
Clipboard
DragEvent
```

Use adapters where required.

---

# 15. Mobile Rules

Shared code must remain React Native compatible where it is intended to be shared.

Never introduce DOM-specific assumptions into:

* domain
* validation
* contracts
* business logic
* shared utilities

---

# 16. API Rules

Services should be designed as if a real API will eventually exist.

Avoid UI-specific service contracts.

Prefer:

```text
StudentCreateInput
StudentUpdateInput
StudentFilters
StudentListResponse
```

over arbitrary component-shaped objects.

---

# 17. Error Rules

Never silently swallow important errors.

Bad:

```ts
try {
  await save();
} catch {}
```

Good:

```text
capture
classify
log appropriately
show safe message
recover where possible
```

---

# 18. Financial Rules

Finance is high-integrity functionality.

Financial operations should consider:

* duplicate payments
* idempotency
* transaction boundaries
* state transitions
* reconciliation
* auditability
* authorization

Never calculate critical financial truth only in UI.

---

# 19. Audit Rules

Audit important mutations.

Examples:

* payment verification
* admission approval
* student archival
* permission changes
* financial clearance
* major configuration changes

---

# 20. Security Rules

Never commit:

* passwords
* API keys
* private keys
* tokens
* production secrets

Avoid logging:

* credentials
* tokens
* unnecessary personal data
* sensitive financial data

---

# 21. Dependency Rules

Before adding a package:

1. Check whether existing code can solve the problem.
2. Check whether the package is necessary.
3. Check bundle impact.
4. Check maintenance status.
5. Check security implications.
6. Check mobile compatibility if shared.
7. Check license compatibility.

---

# 22. File Organization Rules

Organize by feature/domain where practical.

Avoid dumping unrelated utilities into generic folders.

A feature should be discoverable.

---

# 23. Naming Rules

Names must express intent.

Prefer:

```text
studentService
attendanceService
financialClearance
academicPlacement
```

Avoid:

```text
data
helper
misc
temp
stuff
manager2
```

---

# 24. Routing Rules

Routes should represent meaningful product capabilities.

Each protected route must define:

* access requirements
* loading state
* error state
* empty state where appropriate
* responsive behavior

---

# 25. UI Rules

Use semantic design tokens.

Do not randomly introduce:

* arbitrary colors
* inconsistent spacing
* inconsistent radius
* inconsistent typography

Reuse shared primitives.

---

# 26. Accessibility Rules

Interactive elements must support:

* keyboard navigation
* focus visibility
* accessible labels
* semantic HTML
* appropriate ARIA where needed
* reasonable contrast
* screen-reader usability

---

# 27. Testing Rules

At minimum, meaningful features should validate:

```text
TypeScript
ESLint
Build
Route behavior
Core service behavior
Critical business rules
```

High-risk domains should eventually receive stronger automated testing.

---

# 28. Codex Rules

When Codex modifies the repository:

1. Inspect first.
2. Understand architecture.
3. Identify existing patterns.
4. Search before creating.
5. Reuse existing utilities.
6. Make minimal coherent changes.
7. Avoid speculative refactors.
8. Preserve public contracts unless necessary.
9. Run validation.
10. Report exactly what changed.

---

# 29. Refactoring Rules

Refactor when it improves:

* correctness
* maintainability
* performance
* security
* scalability

Do not refactor merely for personal stylistic preference.

---

# 30. Definition of Done

A change is complete when:

* functionality works
* types are correct
* lint passes
* build passes
* authorization is considered
* tenant isolation is considered
* errors are handled
* responsive behavior works
* performance is acceptable
* mobile implications are considered
* documentation is updated when necessary
