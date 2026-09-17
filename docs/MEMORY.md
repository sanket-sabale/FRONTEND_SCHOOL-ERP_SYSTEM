# School ERP System — Project Memory

**Organization:** Hoofixsoft
**Purpose:** Long-term project continuity

---

# 1. Project Identity

Project:

**School ERP SaaS Platform**

Organization:

**Hoofixsoft**

Primary objective:

Build a modern, enterprise-grade, multi-tenant School ERP platform.

---

# 2. Current Technology

```text
Next.js 16.3
React 19
TypeScript
Tailwind CSS v4
```

Architecture:

```text
Next.js App Router
+
Modular ERP Architecture
+
Service / Repository Boundaries
```

---

# 3. Core Product Model

```text
Platform
 ↓
Subscription
 ↓
Tenant
 ↓
School
 ↓
Campus
 ↓
Academic Year
 ↓
Departments
 ↓
Users
 ↓
Staff / Students / Guardians
```

---

# 4. Major Domains

Current/target domains:

* Dashboard
* Students
* Admissions
* Attendance
* Academics
* Staffing
* HR
* Finance
* Communication
* Notices
* Assessments
* Reports
* Audit
* Platform Administration

---

# 5. Architectural Philosophy

The project must remain:

* modular
* tenant-aware
* permission-aware
* API-ready
* mobile-ready
* strongly typed
* performance-oriented
* secure
* maintainable

---

# 6. Backend Assumption

Do not assume production backend infrastructure unless explicitly implemented.

Current architecture may use:

* mock repositories
* mock services
* frontend domain models
* future API contracts

---

# 7. Mobile Strategy

Future mobile application:

```text
React Native
+
Expo
```

Shared:

* domain
* validation
* permissions
* API contracts
* formatting
* design language

Not shared:

* DOM components
* browser-specific APIs
* web navigation
* web-only editors

---

# 8. Known Mobile Watch Areas

Current areas requiring future platform adapters:

* Tiptap
* File/FileList
* URL.createObjectURL
* drag and drop
* clipboard
* localStorage
* browser APIs
* desktop tables
* desktop popovers
* desktop navigation patterns

---

# 9. Communication Center Status

Communication Center exists at:

```text
/communication
```

Implemented concepts:

* Inbox
* Chats
* Groups
* Channels
* Broadcasts
* Notices
* Conversation list
* Conversation view
* Rich messages
* Attachments
* Drafts
* Responsive UI

Tiptap remains web-specific.

---

# 10. Student Management Status

Student domain foundation exists.

Core concepts:

```text
Student
StudentSummary
StudentCreateInput
StudentUpdateInput
StudentFilters
StudentListResponse
```

Student directory exists at:

```text
/students
```

Current capabilities include:

* search
* filtering
* sorting
* pagination
* metrics
* responsive list/table
* loading
* errors
* empty state
* refresh

Future:

* student profile
* CRUD
* archive
* placement history UI

---

# 11. Student Placement Rule

Never model academic history solely through mutable current class fields.

Preferred:

```text
Student
 ↓
Placement History
 ↓
Academic Year / Campus / Class / Section
```

---

# 12. Admissions Status

Admissions have progressed through multiple phases.

Important rule:

```text
Application Status
≠
Payment Status
≠
Financial Clearance
```

Finance integration includes boundaries for:

* admission invoices
* payments
* verification
* financial clearance

---

# 13. Permission Model

Known role concepts:

```text
principal
teacher
accountant
HR
system admin
```

Permission examples:

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

---

# 14. App Shell

AppShell provides:

* header
* sidebar
* mobile navigation
* tenant selector
* school selector
* campus selector
* academic year selector
* theme
* notifications
* command palette
* profile menu

---

# 15. Design Direction

Primary UI language:

```text
Modern Minimalism
+
Bento/Grid Layout
+
Layered Depth
```

---

# 16. Performance Philosophy

Performance is a first-class requirement.

Priorities:

* Server Components
* minimal hydration
* small client boundaries
* efficient data fetching
* pagination
* minimal rerenders
* lazy loading
* optimized assets
* efficient large-data handling
* measured optimization

---

# 17. Security Philosophy

Security priorities:

```text
Tenant Isolation
+
Authentication
+
Authorization
+
Validation
+
Audit
+
Secure Data Handling
```

Never treat frontend visibility as security.

---

# 18. Code Quality Philosophy

Avoid:

* `any`
* giant files
* duplicate business logic
* duplicated validation
* unnecessary dependencies
* unnecessary global state
* speculative abstractions
* browser APIs in shared layers

---

# 19. Codex Continuity Rules

Before modifying the project, Codex should:

1. Inspect repository.
2. Read README.
3. Read architecture documentation.
4. Read rules.
5. Inspect relevant module.
6. Identify existing patterns.
7. Preserve architecture.
8. Implement smallest coherent change.
9. Run validation.
10. Update documentation where necessary.

---

# 20. Validation Baseline

After meaningful changes, run appropriate:

```text
TypeScript
ESLint
Build
Route checks
Tests
```

Do not claim completion without validation.

---

# 21. Current Strategic Direction

The project should evolve toward:

```text
Enterprise School ERP
        ↓
Production Backend
        ↓
Production Database
        ↓
Secure Multi-Tenant SaaS
        ↓
Observability
        ↓
React Native Mobile Apps
        ↓
External Integrations
```

---

# 22. Important Non-Goals

Do not introduce prematurely:

* microservices
* unnecessary distributed systems
* unnecessary global state
* provider-specific business logic
* excessive abstraction
* production infrastructure assumptions

---

# 23. Source of Truth

When information conflicts:

```text
Actual source code
        ↓
Current architecture
        ↓
Current implementation
        ↓
Documentation
        ↓
Historical phase notes
```

Documentation must be updated when implementation changes.

---

# 24. Memory Maintenance

This document should be updated when:

* architecture changes
* a major module is completed
* technology changes
* mobile strategy changes
* security rules change
* important constraints are introduced
* major implementation decisions are made

Do not allow this document to become a dumping ground for temporary details.

---

# 25. Final Principle

The School ERP should be developed as a long-lived platform rather than a short-lived frontend project.

Every significant implementation decision should consider:

```text
Correctness
Security
Tenant Isolation
Performance
Scalability
Maintainability
Mobile Readiness
Observability
User Experience
```

These principles should guide future development.
