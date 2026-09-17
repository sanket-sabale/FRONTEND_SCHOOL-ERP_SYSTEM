# School ERP System — Architecture

**Project:** School ERP SaaS Platform
**Organization:** Hoofixsoft
**Document:** Architecture Specification
**Status:** Living Document
**Primary Stack:** Next.js 16.3, React 19, TypeScript, Tailwind CSS v4

---

## 1. Purpose

This document defines the architectural structure, boundaries, responsibilities, engineering decisions, and scalability principles of the School ERP platform.

The architecture is designed to support:

* Multi-tenant SaaS operation
* Multiple schools and campuses
* Multiple academic years
* Multiple departments and users
* Large student populations
* Financial workflows
* Admissions
* Attendance
* Academics
* Communication
* Assessments
* Reporting
* Future backend/API integration
* Future Android/iOS applications
* Enterprise-grade security
* High performance
* Long-term maintainability

This document is authoritative for architectural decisions.

---

# 2. Architectural Philosophy

The system follows these principles:

1. Domain-first architecture
2. Separation of concerns
3. Explicit module boundaries
4. Tenant-aware data access
5. Permission-driven operations
6. Platform-independent business logic
7. API-ready service boundaries
8. Performance by default
9. Security by default
10. Mobile readiness by design
11. Strong typing
12. Explicit validation
13. Auditable state changes
14. Minimal unnecessary abstraction
15. Measured optimization

---

# 3. High-Level Architecture

The logical architecture is:

```text
┌───────────────────────────────────────────────┐
│                  Web Application              │
│             Next.js / React / UI              │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│              Presentation Layer               │
│ Pages / Components / Forms / Hooks             │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│              Application Layer                │
│ Use Cases / Services / Actions / Orchestration │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│                 Domain Layer                  │
│ Entities / Value Objects / Rules / Contracts   │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│              Data Access Layer                │
│ Repositories / Queries / Persistence Boundary │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│              Infrastructure                  │
│ Database / API / Storage / External Providers │
└───────────────────────────────────────────────┘
```

The current frontend may use mock repositories and services, but these boundaries must remain compatible with future production infrastructure.

---

# 4. Layer Responsibilities

## 4.1 Presentation Layer

Responsible for:

* Rendering
* User interaction
* Navigation
* Form presentation
* Loading states
* Empty states
* Error states
* Responsive behavior
* Accessibility

Presentation code must not become the source of business rules.

---

## 4.2 Application Layer

Responsible for:

* Use-case orchestration
* Workflow execution
* Permission-aware operations
* Calling domain logic
* Calling repositories
* Coordinating multiple domains where required
* Error translation

Example:

```text
Create Admission
        ↓
Validate Application
        ↓
Verify Permission
        ↓
Create Admission
        ↓
Create Financial Boundary
        ↓
Audit Operation
```

---

## 4.3 Domain Layer

Contains platform-independent business concepts.

Examples:

* Student
* Admission
* Application
* Placement
* Attendance
* Invoice
* Payment
* Assessment
* Staff
* Notice
* Conversation

Domain logic must not depend on:

* React
* DOM
* Browser APIs
* Next.js UI components
* localStorage
* window
* document

---

## 4.4 Data Access Layer

Repositories own persistence behavior.

Example:

```text
StudentService
      ↓
StudentRepository
      ↓
Database / Mock Repository
```

Repositories must enforce tenant-aware access.

---

## 4.5 Infrastructure Layer

Infrastructure contains implementations for:

* Database
* API clients
* File storage
* Email
* SMS
* Push notifications
* Payment providers
* External integrations

Domain code should depend on interfaces rather than provider-specific implementations.

---

# 5. Multi-Tenant Architecture

Tenant isolation is a fundamental security boundary.

Conceptual hierarchy:

```text
Platform
 └── Tenant
      ├── School
      │    ├── Campus
      │    ├── Departments
      │    ├── Users
      │    ├── Students
      │    └── Staff
      │
      └── Subscription
```

Every tenant-owned resource must have an unambiguous ownership relationship.

---

# 6. Tenant Context

The application should establish a trusted tenant context before executing tenant-owned operations.

Conceptually:

```text
Identity
   ↓
Tenant Membership
   ↓
Tenant Context
   ↓
Role
   ↓
Permission
   ↓
Resource Scope
   ↓
Action
```

A client-provided tenant ID must never be treated as sufficient authorization.

---

# 7. Domain Boundaries

Major domains include:

```text
Platform
Subscription
Tenant
School
Campus
Academic Year
User
Staff
Student
Admission
Attendance
Academics
Finance
Communication
Assessment
Notice
Reporting
Audit
```

Each domain should own its:

* Types
* Validation
* Services
* Repository contracts
* Business rules
* State transitions

---

# 8. Student Architecture

Student identity is separated from academic placement.

Conceptual model:

```text
Student
   │
   └── Placement History
          ├── Academic Year
          ├── Campus
          ├── Class
          ├── Section
          ├── Start Date
          ├── End Date
          └── Status
```

This enables:

* Promotion
* Transfer
* Withdrawal
* Re-admission
* Historical records
* Accurate attendance rosters
* Historical reporting

Current class information must not become the only source of truth for historical placement.

---

# 9. Admission Architecture

Admission workflow:

```text
Applicant
   ↓
Application
   ↓
Review
   ↓
Verification
   ↓
Decision
   ↓
Admission
   ↓
Student Creation
   ↓
Academic Placement
```

Admission state must remain separate from financial state.

```text
Application Status
        ≠
Payment Status
        ≠
Financial Clearance
```

---

# 10. Finance Architecture

Finance is a separate domain boundary.

Core concepts include:

* Fee structure
* Invoice
* Payment
* Payment verification
* Concession
* Dues
* Financial clearance
* Payment history

Financial workflows should support:

* Validation
* State transitions
* Idempotency
* Transaction safety
* Auditability
* Reconciliation

Financial calculations must not be implemented only inside React components.

---

# 11. Attendance Architecture

Attendance must be based on academic placement.

Conceptual workflow:

```text
Permission
   ↓
Date
   ↓
Academic Context
   ↓
Placement Roster
   ↓
Existing Attendance
   ↓
Mark / Edit
   ↓
Validate
   ↓
Persist
   ↓
Audit
```

Attendance must respect:

* Tenant
* Academic year
* Campus
* Class
* Section
* Student placement

---

# 12. Communication Architecture

Communication is designed around a platform-independent message model.

Supported concepts include:

* Inbox
* Chats
* Groups
* Channels
* Broadcasts
* Notices
* Rich text
* Attachments

The web editor may use Tiptap, but the underlying rich-message representation should remain portable.

Future mobile applications should use a native editor against the same message contract.

---

# 13. Authorization Architecture

Authorization follows:

```text
User
 ↓
Tenant Membership
 ↓
Role
 ↓
Permission
 ↓
Resource Scope
 ↓
Action
```

Permissions should be centrally defined.

Examples:

```text
student.view
student.create
student.update
student.archive

attendance.view
attendance.mark
attendance.update

admission.view
admission.manage

finance.view
finance.manage

communication.view
communication.send
```

UI hiding is not considered a security boundary.

---

# 14. Service Architecture

Services represent application capabilities.

Example:

```text
studentService
admissionService
attendanceService
financeService
communicationService
assessmentService
```

Services should:

* Validate inputs
* Apply business rules
* Establish tenant scope
* Check authorization
* Call repositories
* Return typed results
* Produce appropriate audit events where required

---

# 15. Repository Architecture

Repositories abstract persistence.

Example:

```ts
interface StudentRepository {
  list(filters: StudentFilters): Promise<StudentListResponse>;
  getById(id: string): Promise<Student | null>;
  create(input: StudentCreateInput): Promise<Student>;
  update(id: string, input: StudentUpdateInput): Promise<Student>;
}
```

Repository implementations may initially be mocked.

Future implementations may use:

* PostgreSQL
* REST APIs
* GraphQL
* RPC
* Other persistence infrastructure

without changing domain/UI contracts unnecessarily.

---

# 16. Validation Architecture

Validation occurs at boundaries.

```text
User Input
    ↓
Schema Validation
    ↓
Application Service
    ↓
Domain Rules
    ↓
Repository
```

Client validation improves UX.

Authoritative validation must eventually exist on the backend.

---

# 17. Error Architecture

Errors should be structured and categorized.

Conceptual categories:

```text
ValidationError
AuthenticationError
AuthorizationError
NotFoundError
ConflictError
BusinessRuleError
TenantIsolationError
InfrastructureError
UnknownError
```

User-facing messages must not expose internal implementation details.

---

# 18. State Management

State should remain local unless there is a clear reason to share it.

Preferred hierarchy:

```text
Component State
      ↓
Feature State
      ↓
Server/Data State
      ↓
Global State
```

Avoid global state for data that belongs to one page or feature.

---

# 19. Next.js Architecture

Use:

* Server Components by default
* Client Components only when required
* Server-side data fetching where appropriate
* Small client boundaries
* Route-level loading/error handling
* Dynamic imports for expensive features
* URL state for shareable filters
* Streaming where beneficial

Avoid turning entire application trees into Client Components unnecessarily.

---

# 20. Mobile Architecture

Future mobile application:

```text
Shared
├── Domain Models
├── Validation
├── API Contracts
├── Permission Definitions
├── Formatting
└── Business Concepts

Web
├── Next.js
├── React DOM
└── Browser APIs

Mobile
├── React Native
├── Expo
└── Native APIs
```

Web and mobile should share contracts and concepts, not DOM components.

---

# 21. Browser Boundary

The following must remain inside platform-specific adapters:

* `window`
* `document`
* `localStorage`
* `File`
* `FileList`
* `URL.createObjectURL`
* Clipboard APIs
* Drag/drop APIs
* Browser-specific storage

---

# 22. Performance Architecture

Performance principles:

* Minimize JavaScript shipped to browser
* Minimize hydration
* Prefer Server Components
* Avoid unnecessary re-renders
* Avoid duplicate fetching
* Paginate large datasets
* Virtualize very large lists when required
* Select only required fields
* Prevent N+1 queries
* Cache safely
* Lazy-load expensive features
* Optimize images/fonts/icons
* Measure before optimizing

Performance must be measurable rather than based solely on intuition.

---

# 23. Scalability

The system must scale across:

### Tenant scalability

Many independent schools.

### Data scalability

Large:

* student populations
* attendance records
* financial records
* messages
* assessments
* audit records

### User scalability

Multiple concurrent staff and administrators.

### Feature scalability

New ERP modules should not require rewriting existing domains.

### Team scalability

Different developers should be able to work on modules independently.

---

# 24. Security Architecture

Security principles:

* Least privilege
* Explicit authorization
* Tenant isolation
* Strong validation
* Secure file access
* Secret protection
* Safe logging
* Dependency security
* Secure session handling
* Protection against unauthorized resource access

Never store:

* Passwords
* API secrets
* Access tokens
* Private credentials

in source code.

---

# 25. Audit Architecture

Important state-changing operations should be auditable.

Conceptual event:

```text
Actor
Tenant
Timestamp
Action
Entity
Entity ID
Previous State
New State
Metadata
```

Logs must avoid unnecessary sensitive information.

---

# 26. Observability

Production architecture should eventually support:

* Request metrics
* Error metrics
* Latency
* Database performance
* Authentication failures
* Authorization failures
* Tenant-isolation violations
* Payment failures
* Integration failures
* Background job failures

---

# 27. Architectural Decision Rules

When adding functionality:

1. Identify the domain.
2. Identify ownership.
3. Define the domain model.
4. Define validation.
5. Define permissions.
6. Define service boundary.
7. Define repository boundary.
8. Define UI.
9. Define audit requirements.
10. Consider mobile compatibility.
11. Consider performance.
12. Validate implementation.

---

# 28. Anti-Patterns

Avoid:

* Business logic inside JSX
* Direct database access from UI
* Direct external-provider calls from components
* Trusting client tenant IDs
* Giant components
* Giant service files
* Global state without justification
* Duplicate validation
* `any`
* Uncontrolled browser APIs in shared code
* Premature microservices
* Premature abstraction
* Unnecessary dependencies
* Full-page client rendering without justification

---

# 29. Architecture Evolution

The architecture should evolve incrementally.

Preferred sequence:

```text
Modular Frontend
      ↓
Service Boundaries
      ↓
API Contracts
      ↓
Production Backend
      ↓
Database
      ↓
Background Jobs
      ↓
External Integrations
      ↓
Mobile Clients
```

Do not introduce distributed complexity before it is required.

---

# 30. Definition of Architectural Quality

A feature is architecturally acceptable when:

* Its domain is clear.
* Its ownership is clear.
* Tenant scope is explicit.
* Authorization is explicit.
* Validation is defined.
* Business rules are outside UI.
* Persistence is abstracted.
* Errors are handled.
* State transitions are controlled.
* Audit requirements are considered.
* Performance is acceptable.
* Mobile implications are considered.
* Tests can be written without rendering the entire application.

---

# 31. Living Document

This document must evolve whenever a major architectural decision changes.

New architectural decisions should be documented rather than silently introduced.
