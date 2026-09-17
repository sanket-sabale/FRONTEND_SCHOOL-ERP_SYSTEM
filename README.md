# School ERP

## Enterprise Multi-Tenant School ERP SaaS Platform

**School ERP** is a modern, modular, secure, scalable, and mobile-ready school management platform designed to centralize the operational, academic, administrative, communication, student, attendance, admission, finance, staffing, assessment, and reporting needs of schools.

The platform is being engineered as a **long-term SaaS product**, not as a collection of independent school-management screens.

Its architecture prioritizes:

* Multi-tenancy
* Strong tenant isolation
* Role-based access control
* Domain-driven boundaries
* Type safety
* Input validation
* Data integrity
* Performance
* Scalability
* Security
* Reliability
* Observability
* Auditability
* Maintainability
* Responsive UX
* Mobile application readiness
* API readiness
* Long-term extensibility

The current application is a **Next.js web application**. Its domain and service architecture is intentionally designed so that future Android/iOS applications can consume the same business concepts and API contracts without requiring reuse of browser-specific React components.

---

# Table of Contents

1. [Project Identity](#1-project-identity)
2. [Executive Overview](#2-executive-overview)
3. [Product Vision](#3-product-vision)
4. [Product Mission](#4-product-mission)
5. [Core Product Principles](#5-core-product-principles)
6. [Primary Users](#6-primary-users)
7. [Organizational Model](#7-organizational-model)
8. [ERP Domain Map](#8-erp-domain-map)
9. [Current Product Scope](#9-current-product-scope)
10. [Implementation Status](#10-implementation-status)
11. [Technology Stack](#11-technology-stack)
12. [Architecture Overview](#12-architecture-overview)
13. [Architectural Philosophy](#13-architectural-philosophy)
14. [Layered Architecture](#14-layered-architecture)
15. [Domain Architecture](#15-domain-architecture)
16. [Multi-Tenant Architecture](#16-multi-tenant-architecture)
17. [Tenant Isolation](#17-tenant-isolation)
18. [Authentication and Authorization](#18-authentication-and-authorization)
19. [Roles and Permissions](#19-roles-and-permissions)
20. [Data Ownership and Scope](#20-data-ownership-and-scope)
21. [Service and Repository Boundaries](#21-service-and-repository-boundaries)
22. [Validation Architecture](#22-validation-architecture)
23. [Error Handling Architecture](#23-error-handling-architecture)
24. [Frontend Architecture](#24-frontend-architecture)
25. [Next.js Application Architecture](#25-nextjs-application-architecture)
26. [Component Architecture](#26-component-architecture)
27. [State Management Philosophy](#27-state-management-philosophy)
28. [Routing Architecture](#28-routing-architecture)
29. [ERP Module Architecture](#29-erp-module-architecture)
30. [Platform Administration](#30-platform-administration)
31. [Tenant and School Management](#31-tenant-and-school-management)
32. [Academic Structure](#32-academic-structure)
33. [Student Management](#33-student-management)
34. [Student Academic Placement](#34-student-academic-placement)
35. [Attendance](#35-attendance)
36. [Admissions](#36-admissions)
37. [Finance](#37-finance)
38. [Admissions–Finance Boundary](#38-admissionsfinance-boundary)
39. [Communication Center](#39-communication-center)
40. [Staffing and HR](#40-staffing-and-hr)
41. [Assessments](#41-assessments)
42. [Notices and Homework](#42-notices-and-homework)
43. [Notifications](#43-notifications)
44. [Reporting and Analytics](#44-reporting-and-analytics)
45. [Audit and Activity History](#45-audit-and-activity-history)
46. [UI/UX Architecture](#46-uiux-architecture)
47. [Design System](#47-design-system)
48. [Responsive Design](#48-responsive-design)
49. [Mobile Readiness](#49-mobile-readiness)
50. [Web vs Mobile Architecture](#50-web-vs-mobile-architecture)
51. [Browser-Specific Boundaries](#51-browser-specific-boundaries)
52. [Performance Engineering](#52-performance-engineering)
53. [Scalability Strategy](#53-scalability-strategy)
54. [Security Architecture](#54-security-architecture)
55. [Data Integrity](#55-data-integrity)
56. [Reliability and Availability](#56-reliability-and-availability)
57. [Observability](#57-observability)
58. [Testing Strategy](#58-testing-strategy)
59. [Accessibility](#59-accessibility)
60. [Code Quality](#60-code-quality)
61. [Project Structure](#61-project-structure)
62. [Important Directories](#62-important-directories)
63. [Route Inventory](#63-route-inventory)
64. [Development Environment](#64-development-environment)
65. [Installation](#65-installation)
66. [Development Commands](#66-development-commands)
67. [Environment Variables](#67-environment-variables)
68. [Development Workflow](#68-development-workflow)
69. [Feature Development Lifecycle](#69-feature-development-lifecycle)
70. [AI/Codex Engineering Guidelines](#70-aicodex-engineering-guidelines)
71. [Performance Review Checklist](#71-performance-review-checklist)
72. [Security Review Checklist](#72-security-review-checklist)
73. [Tenant-Isolation Checklist](#73-tenant-isolation-checklist)
74. [Production Readiness](#74-production-readiness)
75. [Deployment Architecture](#75-deployment-architecture)
76. [Future Backend Architecture](#76-future-backend-architecture)
77. [Future Mobile Applications](#77-future-mobile-applications)
78. [Integration Strategy](#78-integration-strategy)
79. [Documentation Strategy](#79-documentation-strategy)
80. [Roadmap](#80-roadmap)
81. [Known Limitations](#81-known-limitations)
82. [Architectural Guardrails](#82-architectural-guardrails)
83. [Definition of Done](#83-definition-of-done)
84. [Project Philosophy](#84-project-philosophy)
85. [Final Status](#85-final-status)

---

# 1. Project Identity

| Property               | Value                             |
| ---------------------- | --------------------------------- |
| Product                | School ERP                        |
| Product Type           | Multi-Tenant SaaS ERP             |
| Primary Domain         | School Management                 |
| Web Platform           | Next.js                           |
| UI Framework           | React                             |
| Language               | TypeScript                        |
| Styling                | Tailwind CSS                      |
| Architecture Direction | Modular, domain-oriented monolith |
| Deployment Model       | SaaS-oriented                     |
| Mobile Direction       | React Native / Expo               |
| Brand / Organization   | Hoofixsoft                        |
| Development Status     | Active Development                |

---

# 2. Executive Overview

School ERP is designed to provide schools with a unified platform for managing their day-to-day operations.

Instead of treating admissions, students, attendance, academics, communication, finance, staffing, and reporting as unrelated applications, the ERP establishes a common platform with shared:

* Identity
* Tenant context
* Permissions
* Academic context
* Validation
* Domain contracts
* Service boundaries
* UI standards
* Audit principles
* Performance standards

The system is intended to support the complete lifecycle of a school's operational data.

For example:

```text
Admission Application
        ↓
Admission Decision
        ↓
Student Creation
        ↓
Academic Placement
        ↓
Attendance
        ↓
Assessments
        ↓
Communication
        ↓
Reports
```

At the same time:

```text
Admission
    ↓
Invoice
    ↓
Payment
    ↓
Verification
    ↓
Financial Clearance
```

These workflows are related but intentionally remain separate where their business responsibilities differ.

---

# 3. Product Vision

The long-term vision is to build a **complete digital operating platform for schools**.

The ERP should eventually allow a school to manage:

```text
People
Students
Parents
Teachers
Staff
Academic Structure
Attendance
Admissions
Finance
Communication
Assessments
Reports
Administration
```

from one consistent platform.

The system should be:

### Secure

Sensitive school and student information must be protected through layered security controls.

### Scalable

The architecture must support growth in schools, users, students, records, and modules.

### Fast

Common operations should remain responsive even as datasets grow.

### Maintainable

Developers should be able to understand and modify one module without understanding the entire system.

### Extensible

New ERP modules should be added without destabilizing existing modules.

### Mobile-ready

Business logic and contracts should be reusable by future native mobile clients.

---

# 4. Product Mission

The mission is to create an ERP platform that reduces operational complexity for schools while providing administrators, teachers, accountants, HR staff, students, and parents with appropriate tools for their responsibilities.

The product should progressively move toward:

```text
Manual Processes
      ↓
Digitized Processes
      ↓
Integrated Processes
      ↓
Automated Workflows
      ↓
Intelligent School Operations
```

---

# 5. Core Product Principles

The following principles guide the project.

## 5.1 Security by Design

Security must exist at architectural boundaries.

It must not be treated as a final checklist after development.

---

## 5.2 Tenant Isolation by Default

Tenant-owned data must always execute within an explicit and validated tenant context.

---

## 5.3 Domain Logic Independent of UI

Business rules must not depend on React components.

---

## 5.4 Backend as the Security Authority

Frontend authorization improves UX but cannot be the ultimate security boundary.

---

## 5.5 Strong Types

TypeScript should describe domain entities, service contracts, inputs, outputs, and states wherever practical.

---

## 5.6 Explicit Validation

External data must be validated before entering trusted domain logic.

---

## 5.7 Modular Architecture

Modules should communicate through explicit boundaries rather than directly manipulating one another's internals.

---

## 5.8 Progressive Complexity

The architecture should become more sophisticated only when actual requirements justify it.

Do not introduce:

* microservices
* distributed infrastructure
* complex event systems
* unnecessary caching
* excessive abstraction

without a demonstrated need.

---

## 5.9 Mobile-Aware Architecture

The web application should remain web-native while keeping business contracts reusable for future mobile clients.

---

## 5.10 Documentation as Architecture

Important architectural decisions must be documented.

---

# 6. Primary Users

The ERP is designed around multiple user categories.

### Platform Administrators

Manage:

* Tenants
* Subscriptions
* Packages
* Platform configuration
* Global administration

### School Administrators

Manage:

* Students
* Staff
* Academics
* Admissions
* Finance
* Attendance
* Reports
* Communication

### Principal / Management

Monitor:

* School performance
* Attendance
* Admissions
* Finance
* Staff
* Academic performance
* Reports

### Teachers

Manage:

* Classes
* Attendance
* Academic activities
* Assessments
* Communication

### Accountants

Manage:

* Fees
* Invoices
* Payments
* Verification
* Financial reporting

### HR Staff

Manage:

* Staff
* Attendance
* Salary
* HR operations

### Parents / Guardians

Future mobile-facing capabilities may include:

* Student information
* Attendance
* Notices
* Homework
* Assessments
* Fees
* Payments
* Communication

---

# 7. Organizational Model

The conceptual organizational structure is:

```text
SaaS Platform
│
├── Subscription / Package
│
└── Tenant
     │
     └── School
          │
          ├── Campus
          │
          ├── Academic Years
          │
          ├── Departments
          │
          ├── Users
          │
          ├── Staff
          │
          ├── Students
          │
          ├── Guardians
          │
          ├── Academics
          │
          ├── Attendance
          │
          ├── Admissions
          │
          ├── Finance
          │
          ├── Communication
          │
          ├── Assessments
          │
          └── Reports
```

The actual production database relationship may evolve, but the ownership model must remain explicit.

---

# 8. ERP Domain Map

The platform can be viewed as interconnected domains:

```text
                         PLATFORM
                            │
                ┌───────────┴───────────┐
                │                       │
             TENANTS                 USERS
                │                       │
                └───────────┬───────────┘
                            │
                     AUTHORIZATION
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
   ACADEMICS            STUDENTS             STAFF
       │                    │                    │
       ├──────────┐         │         ┌──────────┤
       │          │         │         │          │
   ATTENDANCE  ASSESSMENTS  │       HR        PAYROLL
                            │
                     ┌──────┴──────┐
                     │             │
                 ADMISSIONS      FINANCE
                     │             │
                     └──────┬──────┘
                            │
                     COMMUNICATION
                            │
                         REPORTS
```

---

# 9. Current Product Scope

The project currently covers or is actively developing:

* ERP dashboard
* Application shell
* Tenant context
* School/campus/year context
* Navigation
* Permissions
* Student Management
* Academic placement concepts
* Attendance
* Admissions
* Finance integration boundaries
* Communication Center
* Notices
* Assessment foundations
* Staffing/HR foundations
* Reporting concepts
* Audit concepts

Some domains are mature, some are foundational, and some remain planned.

The repository source code is always the final authority for implementation status.

---

# 10. Implementation Status

The project is being developed incrementally through architectural phases.

A phase may introduce:

1. Domain models
2. Validation
3. Service boundaries
4. Repository behavior
5. UI
6. Permission integration
7. Tenant integration
8. Error handling
9. Responsive behavior
10. Testing
11. Performance optimization
12. Documentation

A feature should not be considered fully complete merely because a page exists.

A production-ready module requires appropriate:

```text
Domain
+
Validation
+
Authorization
+
Tenant Isolation
+
Service Boundary
+
Data Boundary
+
UI
+
Error Handling
+
Testing
+
Performance
+
Documentation
```

---

# 11. Technology Stack

## Core

* Next.js 16.x
* React 19
* TypeScript
* Tailwind CSS v4

## Web Architecture

* Next.js App Router
* Server Components where appropriate
* Client Components only where interaction/state requires them

## Rich Communication

* Tiptap for web rich-text composition

## Validation

* Schema-based validation

## Future Mobile

* React Native
* Expo
* Shared domain/API contracts

The exact installed versions and dependencies must always be verified against `package.json`.

---

# 12. Architecture Overview

The intended architecture is:

```text
                    WEB CLIENT
                        │
                        ▼
                 NEXT.JS APPLICATION
                        │
                        ▼
                  API / ACTION LAYER
                        │
                        ▼
                  AUTHENTICATION
                        │
                        ▼
                   TENANT CONTEXT
                        │
                        ▼
                  AUTHORIZATION
                        │
                        ▼
                  DOMAIN SERVICE
                        │
                        ▼
                    REPOSITORY
                        │
                        ▼
                  DATA SOURCE
```

Future mobile:

```text
React Native / Expo
        │
        ▼
     API Layer
        │
        ▼
Same Domain Contracts
        │
        ▼
Same Authorization Model
        │
        ▼
Same Tenant Rules
```

---

# 13. Architectural Philosophy

The project follows a **modular-monolith-first** strategy.

The objective is to establish strong module boundaries before introducing distributed systems.

Conceptually:

```text
                    ERP APPLICATION
                          │
      ┌───────────────────┼───────────────────┐
      │                   │                   │
    STUDENT            ACADEMICS           FINANCE
      │                   │                   │
      ├──────────────┐    │    ┌──────────────┤
      │              │    │    │              │
  ATTENDANCE      ADMISSIONS│ PAYMENT       REPORTS
      │              │    │    │              │
      └──────────────┴────┴────┴──────────────┘
                         │
                    Shared Platform
                         │
              Tenant / Auth / Audit
```

Each domain should have clear ownership of its business rules.

---

# 14. Layered Architecture

The architecture can be understood as:

```text
Presentation
    ↓
Application
    ↓
Domain
    ↓
Data Access
    ↓
Infrastructure
```

### Presentation

Responsible for:

* Pages
* Components
* Forms
* Tables
* User interaction

### Application

Responsible for:

* Request orchestration
* Permission checks
* Context resolution
* Calling domain services

### Domain

Responsible for:

* Business rules
* Domain models
* State transitions
* Invariants

### Data Access

Responsible for:

* Queries
* Persistence
* Repositories
* Data mapping

### Infrastructure

Responsible for:

* Database
* Storage
* External services
* Email/SMS/payment providers
* Observability infrastructure

---

# 15. Domain Architecture

Domain models should represent real school concepts.

Examples:

```text
Student
Guardian
Staff
AcademicYear
Class
Section
StudentPlacement
AttendanceRecord
AdmissionApplication
Invoice
Payment
Conversation
Message
Assessment
```

Domain models should not contain UI-specific implementation details.

---

# 16. Multi-Tenant Architecture

Multi-tenancy is a foundational requirement.

Every tenant-owned operation should conceptually follow:

```text
Request
  ↓
Authenticated Identity
  ↓
Allowed Tenant Context
  ↓
Tenant Validation
  ↓
Permission Validation
  ↓
Domain Service
  ↓
Scoped Repository
```

Tenant context may include:

```text
tenantId
schoolId
campusId
academicYearId
```

depending on the operation.

---

# 17. Tenant Isolation

Tenant isolation must be enforced independently of the frontend.

The following is unsafe:

```text
GET /students?tenantId=TENANT_B
```

being trusted simply because the frontend normally sends the correct tenant.

Instead:

```text
Authenticated User
        ↓
Allowed Tenants
        ↓
Requested Context
        ↓
Verify Membership / Permission
        ↓
Create Trusted Scope
        ↓
Execute Query
```

Repositories should not accidentally perform unrestricted tenant queries.

### Never

* Hardcode tenant IDs
* Trust client tenant IDs
* Allow tenant context to bypass authorization
* Return records outside the active scope
* Mix tenant-owned caches
* Mix tenant-owned files

---

# 18. Authentication and Authorization

Authentication answers:

> Who is this user?

Authorization answers:

> What is this user allowed to do?

Tenant isolation answers:

> Which organization's data may this user access?

These concerns must remain conceptually separate.

```text
Identity
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

---

# 19. Roles and Permissions

Current role concepts include:

* Principal
* Teacher
* Accountant
* HR
* System Administrator

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

The exact permission catalog should remain centralized and extensible.

Permissions should be evaluated at:

1. Navigation
2. Route
3. UI action
4. Application/service boundary
5. Backend/data boundary

---

# 20. Data Ownership and Scope

Every entity should have a clear owner.

Examples:

```text
Student
→ Tenant / School

Attendance
→ Tenant / School / Academic Year / Student

Invoice
→ Tenant / School / Financial account

Message
→ Tenant / Conversation

Staff
→ Tenant / School
```

Data ownership must be documented before adding new cross-domain relationships.

---

# 21. Service and Repository Boundaries

A typical domain flow:

```text
UI
 ↓
Hook / Action
 ↓
Service
 ↓
Repository
 ↓
Data Source
```

The service layer should own business orchestration.

The repository should own persistence concerns.

The UI should not:

* directly manipulate persistence
* implement complex financial rules
* implement tenant isolation
* duplicate authorization logic
* become the source of truth for domain state

---

# 22. Validation Architecture

Validation occurs at boundaries.

```text
External Input
      ↓
Schema Validation
      ↓
Business Validation
      ↓
Authorization
      ↓
Tenant Validation
      ↓
Domain Operation
```

Validate:

* IDs
* Dates
* Query parameters
* Form fields
* Enum values
* Relationships
* Amounts
* Status transitions
* Pagination
* Sorting
* Filters

Client-side validation is useful for UX.

Server-side validation remains authoritative.

---

# 23. Error Handling Architecture

Every meaningful feature should explicitly support:

```text
Loading
Success
Empty
Validation Error
Unauthorized
Forbidden
Not Found
Conflict
Server Error
Network Failure
```

Errors should be:

* predictable
* typed where practical
* user-friendly
* safe
* actionable

Internal stack traces and sensitive implementation details must not be exposed to users.

---

# 24. Frontend Architecture

The frontend is organized around:

```text
Routes
Features
Components
Hooks
Schemas
Types
Services
Configuration
Shared UI
Utilities
```

The frontend should remain thin where possible.

Business logic belongs in reusable service/domain layers.

---

# 25. Next.js Application Architecture

The application uses the Next.js App Router.

Pages should use Server Components where they provide architectural or performance benefits.

Client Components should be introduced when required by:

* user interaction
* browser APIs
* local interactive state
* editors
* drag/drop
* client-only libraries

Avoid turning entire routes into Client Components without a reason.

---

# 26. Component Architecture

Components should have focused responsibilities.

Prefer:

```text
StudentDirectory
 ├── StudentFilters
 ├── StudentSummary
 ├── StudentTable
 └── StudentCardList
```

over:

```text
StudentPage.tsx
 └── 1500 lines of everything
```

Shared components should contain reusable presentation behavior.

Domain components should contain feature-specific UI.

Business rules should remain outside visual components whenever practical.

---

# 27. State Management Philosophy

Prefer the simplest state solution that correctly represents the problem.

Use:

* URL state for shareable filters/search
* local component state for isolated UI state
* server state for server-owned data
* domain services for business operations

Avoid global state merely because it is convenient.

Global state should have clear ownership and lifecycle.

---

# 28. Routing Architecture

Routes represent user-facing application capabilities.

A route should generally have:

```text
Permission
Context
Loading State
Error State
Empty State
Main UI
```

Where appropriate.

Route-level authorization must not depend solely on hiding navigation items.

---

# 29. ERP Module Architecture

The ERP is divided into business domains rather than arbitrary UI pages.

Major domains include:

```text
Platform
Tenant
Identity
Authorization
Academics
Students
Admissions
Attendance
Finance
Communication
Staffing
HR
Assessments
Reports
Notifications
Audit
```

---

# 30. Platform Administration

Platform administration will eventually manage:

* SaaS tenants
* Subscription packages
* Feature availability
* Platform users
* Global configuration
* Tenant lifecycle
* Platform-level reporting

Platform-level data must remain distinct from tenant-owned data.

---

# 31. Tenant and School Management

Tenant management provides the foundation for:

* School
* Campus
* Academic year
* Departments
* Configuration
* Users
* Operational context

Tenant configuration should not leak into unrelated global platform state.

---

# 32. Academic Structure

Academic Structure is a foundational domain.

Core concepts:

```text
Academic Year
     ↓
Class
     ↓
Section
```

Potential extensions:

```text
Subject
Teacher Assignment
Timetable
Academic Calendar
Promotion
```

Academic Structure is consumed by:

* Students
* Attendance
* Assessments
* Timetable
* Reports
* Communication targeting

---

# 33. Student Management

Student Management provides the core student lifecycle.

Core models include concepts such as:

```text
Student
StudentSummary
StudentCreateInput
StudentUpdateInput
StudentFilters
StudentListResponse
```

Student management includes:

* Identity
* Admission information
* Status
* Guardians
* Academic context
* Search
* Filtering
* Sorting
* Pagination
* Lifecycle management

The `/students` experience is designed for both desktop and mobile layouts.

---

# 34. Student Academic Placement

Student academic placement should be modeled independently from the student's permanent identity.

Conceptually:

```text
Student
  │
  └── Placement
       ├── Academic Year
       ├── Campus
       ├── Class
       ├── Section
       ├── Start Date
       ├── End Date
       └── Status
```

This enables:

* Historical class membership
* Academic-year transitions
* Promotion
* Transfers
* Withdrawals
* Re-admissions
* Accurate attendance rosters

This is preferable to treating a student's current class/section fields as the complete historical source of truth.

---

# 35. Attendance

Attendance is a tenant-scoped domain.

The marking workflow uses academic context such as:

```text
Date
Class
Section
```

The conceptual workflow is:

```text
Open Attendance
      ↓
Check Permission
      ↓
Resolve Date
      ↓
Resolve Academic Context
      ↓
Load Student Placement
      ↓
Load Roster
      ↓
Load Existing Attendance
      ↓
Mark / Edit
      ↓
Validate
      ↓
Persist
      ↓
Audit
```

Attendance must remain tied to the correct academic placement and tenant scope.

---

# 36. Admissions

Admissions manage the journey from applicant to admitted student.

Potential lifecycle:

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

Admission workflow state must remain separate from financial state.

---

# 37. Finance

Finance is responsible for monetary operations such as:

* Fee structures
* Invoices
* Payments
* Payment verification
* Dues
* Concessions
* Financial clearance
* Payment history
* Financial reporting

Financial operations require stronger data-integrity guarantees than ordinary UI state.

---

# 38. Admissions–Finance Boundary

The system intentionally separates:

```text
Application Status
        ≠
Payment Status
        ≠
Financial Clearance
```

For example:

```text
Admission Application
        │
        ├── Application Workflow
        │
        └── Finance Boundary
              │
              ├── Invoice
              ├── Payment
              ├── Verification
              └── Clearance
```

This prevents admission workflow logic from becoming tightly coupled to payment implementation.

---

# 39. Communication Center

The Communication Center is available at:

```text
/communication
```

It is designed around:

```text
Inbox
Chats
Groups
Channels
Broadcasts
Notices
```

Capabilities include:

* Conversation search
* Unread filters
* Pinned conversations
* Muted conversations
* Unread indicators
* Message history
* System messages
* Rich messages
* Unsupported-message fallback
* Permission-aware sending

---

# 40. Communication Composer

The web rich-text composer supports concepts such as:

* Bold
* Italic
* Underline
* Lists
* Text colors
* Links
* Undo
* Redo
* Conversation-specific drafts

Tiptap is a web-specific implementation.

The future mobile application should use a mobile-native editor while consuming the same message representation.

---

# 41. Attachments

Communication includes attachment handling such as:

* File selection
* Multiple files
* Drag/drop
* Image paste
* Validation
* Preview
* Retry
* Remove
* Image preview

Browser-specific APIs must remain outside platform-neutral domain logic.

---

# 42. Staffing and HR

Staffing/HR is designed to cover:

* Staff records
* Staff roles
* Staff attendance
* Salary
* HR operations
* Employment lifecycle

Future payroll functionality should be separated carefully from general HR data.

---

# 43. Assessments

The assessment domain is expected to support:

```text
Assessment
     ↓
Assessment Group / Exam
     ↓
Student Results
     ↓
Marks
     ↓
Grades
     ↓
Report Card
```

The exact academic grading system should remain configurable.

---

# 44. Notices and Homework

Communication-oriented school workflows may include:

* School notices
* Class notices
* Teacher messages
* Homework
* Announcements
* Targeted broadcasts

Targeting must respect tenant and academic scope.

---

# 45. Notifications

The notification architecture should eventually support:

```text
In-App
Email
SMS
Push
WhatsApp
```

External providers should be hidden behind provider/service boundaries.

The domain should not directly depend on a specific provider.

---

# 46. Reporting and Analytics

Reporting should eventually provide:

* Student reports
* Attendance reports
* Admission reports
* Finance reports
* Assessment reports
* Staff reports
* Operational dashboards
* Export capabilities

Large reports should be designed for efficient server-side processing rather than loading entire datasets into the browser.

---

# 47. Audit and Activity History

Important state-changing operations should eventually generate auditable records.

A useful audit event contains:

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

Audit logs should avoid storing unnecessary secrets or sensitive values.

---

# 48. UI/UX Architecture

The design direction is:

> **Modern Minimalism + Bento/Grid Layout + Layered Depth**

The UI should feel:

* Premium
* Professional
* Clean
* Modern
* Calm
* Consistent
* Efficient

The ERP should prioritize usability over decorative complexity.

---

# 49. Design System

Shared UI primitives should establish consistent:

* Typography
* Spacing
* Radius
* Borders
* Surfaces
* Elevation
* Form controls
* Buttons
* Tables
* Cards
* Dialogs
* Navigation
* Feedback states

Semantic design tokens should be preferred over page-specific hardcoded styling.

---

# 50. Responsive Design

Responsive behavior must be intentional.

Desktop:

```text
Dense information
Tables
Multi-column layouts
Persistent navigation
```

Mobile:

```text
Cards
Lists
Bottom/compact navigation
Progressive disclosure
Touch-friendly actions
Reduced density
```

The objective is not simply:

> "Shrink the desktop page."

Instead, each interaction should be adapted to its device.

---

# 51. Mobile Readiness

The architecture is being prepared for a future native mobile application.

The current mobile-readiness direction is approximately:

> **Partially mobile-ready, with no architectural blocker preventing future React Native/Expo development.**

Areas requiring special care include:

* Rich-text editor
* File handling
* Clipboard
* Drag/drop
* Browser storage
* Browser APIs
* Desktop navigation
* Large tables
* Desktop popovers
* Web-only interactions

---

# 52. Web vs Mobile Architecture

The desired architecture is:

```text
                    Shared Core
                        │
        ┌───────────────┼───────────────┐
        │               │               │
      Types         Validation       Contracts
        │               │               │
        └───────────────┼───────────────┘
                        │
                   Domain Logic
                        │
             ┌──────────┴──────────┐
             │                     │
          Web UI              Mobile UI
         Next.js            React Native
```

The web and mobile applications should share **concepts and contracts**, not necessarily visual components.

---

# 53. Browser-Specific Boundaries

Browser APIs should remain isolated.

Examples:

```text
File
FileList
URL.createObjectURL
Clipboard
Drag and Drop
localStorage
window
document
DOM APIs
```

These should not leak into core domain services.

Instead:

```text
Platform Adapter
       ↓
Shared Contract
       ↓
Domain Service
```

This makes future mobile implementations significantly easier.

---

# 54. Performance Engineering

Performance must be considered at every architectural layer.

## Rendering

Prefer:

* Server Components where appropriate
* Small client boundaries
* Lazy loading
* Minimal hydration
* Stable component trees

## Data

Prefer:

* Pagination
* Efficient queries
* Indexed filters
* Selective fields
* N+1 prevention
* Server-side aggregation

## Client

Avoid:

* unnecessary global state
* excessive effects
* duplicate fetches
* unnecessary rerenders
* huge component trees
* large client bundles

## Assets

Optimize:

* images
* fonts
* icons
* JavaScript
* CSS

---

# 55. Scalability Strategy

The system must scale across multiple dimensions.

### Tenant scalability

More schools.

### User scalability

More users per school.

### Data scalability

More students and historical records.

### Feature scalability

More modules.

### Team scalability

More developers.

### Codebase scalability

More files and domain complexity.

The architecture must therefore optimize not just runtime performance but also **organizational and codebase scalability**.

---

# 56. Security Architecture

Security areas include:

### Authentication

Secure identity and sessions.

### Authorization

Role and permission enforcement.

### Tenant Isolation

Strict organization boundaries.

### Input Validation

Untrusted input validation.

### Data Protection

Minimize sensitive data exposure.

### File Security

Authorized file access and validation.

### Secrets

Never expose secrets to client bundles.

### Logging

Never log passwords, tokens, or unnecessary sensitive information.

### Dependency Security

Regularly review dependencies and vulnerabilities.

---

# 57. Data Integrity

Data integrity is especially important for:

* Finance
* Admissions
* Attendance
* Student lifecycle
* Academic placement

Important concepts include:

```text
Validation
Constraints
Transactions
Idempotency
State Machines
Audit Trails
```

where appropriate.

Financial operations should never depend on optimistic UI state as their source of truth.

---

# 58. Reliability and Availability

Production architecture should eventually support:

* graceful failure
* retry strategies
* timeouts
* transaction safety
* backup/recovery
* monitoring
* health checks
* dependency isolation

External services should fail gracefully without corrupting internal state.

---

# 59. Observability

The production platform should eventually monitor:

```text
Requests
Latency
Errors
Database Performance
Authentication Failures
Authorization Failures
Tenant Isolation Failures
Payments
Background Jobs
External Integrations
```

Observability should provide enough information to diagnose problems without exposing sensitive information.

---

# 60. Testing Strategy

Testing should evolve at multiple levels.

## Unit Tests

Test:

* domain rules
* validation
* transformations
* utilities

## Service Tests

Test:

* workflows
* permission behavior
* tenant scope
* business rules

## Integration Tests

Test:

* API/data boundaries
* repositories
* database behavior
* external integrations

## End-to-End Tests

Test critical user journeys such as:

```text
Login
Student Search
Attendance Marking
Admission
Payment
Communication
```

---

# 61. Accessibility

The ERP should target accessible experiences.

Consider:

* semantic HTML
* keyboard navigation
* focus management
* screen-reader labels
* sufficient contrast
* reduced-motion preferences
* accessible forms
* accessible tables
* meaningful error messages

Accessibility is part of quality, not a cosmetic enhancement.

---

# 62. Code Quality

Code should be:

* readable
* typed
* modular
* predictable
* testable
* documented where necessary

Avoid:

```text
any
giant components
deeply coupled modules
duplicate business logic
magic values
unused dependencies
dead code
unnecessary abstractions
```

---

# 63. Project Structure

The expected architecture is conceptually:

```text
school-erp/
│
├── public/
│
├── src/
│   │
│   ├── app/
│   │   ├── page.tsx
│   │   ├── students/
│   │   ├── attendance/
│   │   ├── communication/
│   │   ├── admissions/
│   │   └── ...
│   │
│   ├── components/
│   │   ├── app-shell.tsx
│   │   ├── navigation/
│   │   ├── shared/
│   │   └── ui/
│   │
│   ├── features/
│   │   ├── students/
│   │   ├── attendance/
│   │   ├── admissions/
│   │   ├── communication/
│   │   └── ...
│   │
│   ├── config/
│   ├── lib/
│   ├── types/
│   └── ...
│
├── package.json
├── tsconfig.json
├── next.config.*
├── eslint.config.*
├── postcss.config.*
└── README.md
```

The actual repository is authoritative.

---

# 64. Important Directories

### `src/app`

Next.js route entry points.

### `src/components`

Reusable UI and application components.

### `src/features`

Feature/domain-specific implementation.

### `src/config`

Navigation, permissions, and application configuration.

### `src/lib`

Shared infrastructure and service utilities.

### `src/types`

Shared domain/application types.

---

# 65. Route Inventory

Known routes include:

| Route              | Responsibility             | Status             |
| ------------------ | -------------------------- | ------------------ |
| `/`                | ERP Dashboard              | Implemented        |
| `/students`        | Student Directory          | Implemented        |
| `/attendance/mark` | Student Attendance Marking | Implemented        |
| `/communication`   | Communication Center       | Implemented        |
| `/unauthorized`    | Authorization Fallback     | Implemented        |
| `/admissions/...`  | Admission workflows        | Active Development |

The actual `src/app` directory is the definitive route inventory.

Whenever routes change, this section should be synchronized.

---

# 66. Development Environment

Recommended environment:

```text
Node.js
npm
Git
Modern Chromium-based browser
VS Code or equivalent IDE
```

The exact supported Node.js version should be taken from the project's configuration when specified.

---

# 67. Installation

Clone the repository and install dependencies:

```bash
npm install
```

Create the appropriate local environment file where required.

Then start development:

```bash
npm run dev
```

---

# 68. Development Commands

Typical commands:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Additional project-specific commands should be documented here as they are introduced.

---

# 69. Environment Variables

Environment variables must never contain committed secrets.

Typical future categories include:

```env
NEXT_PUBLIC_APP_URL=

API_BASE_URL=

AUTH_SECRET=

DATABASE_URL=

STORAGE_ENDPOINT=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
```

These are illustrative categories only.

The actual required environment variables must be derived from the repository configuration.

Never commit:

* passwords
* private keys
* API secrets
* access tokens
* production credentials

---

# 70. Development Workflow

A feature should progress through:

```text
Requirement
    ↓
Domain Analysis
    ↓
Data Model
    ↓
Validation
    ↓
Permission Model
    ↓
Tenant Scope
    ↓
Service Boundary
    ↓
Repository / API Boundary
    ↓
UI
    ↓
Responsive UX
    ↓
Error States
    ↓
Tests
    ↓
Performance Review
    ↓
Security Review
    ↓
Build Verification
    ↓
Documentation
```

---

# 71. Feature Development Lifecycle

Before implementing a feature, determine:

### What domain owns it?

### What entities are affected?

### Who can access it?

### Which tenant owns the data?

### What validation is required?

### What states can exist?

### What other modules depend on it?

### What should happen on failure?

### How will mobile consume it later?

### What needs auditing?

This prevents feature-first development from damaging the architecture.

---

# 72. AI/Codex Engineering Guidelines

AI coding tools are actively used during development.

They must operate under repository architecture rather than inventing new architecture for every task.

Before changing code, AI agents should:

1. Inspect existing implementation.
2. Identify related modules.
3. Identify existing patterns.
4. Preserve established conventions.
5. Check tenant boundaries.
6. Check permission boundaries.
7. Check mobile implications.
8. Check performance implications.
9. Implement the smallest correct architectural change.
10. Validate the result.

AI must not:

* invent nonexistent APIs
* assume production infrastructure
* introduce fake dependencies
* silently replace working architecture
* remove tenant checks
* bypass permissions
* duplicate domain rules
* expose secrets
* rewrite large parts of the project without justification

---

# 73. Performance Review Checklist

Before completing a major feature:

* [ ] Avoid unnecessary Client Components
* [ ] Avoid unnecessary re-renders
* [ ] Avoid duplicate requests
* [ ] Paginate large datasets
* [ ] Avoid loading unnecessary fields
* [ ] Avoid N+1 access patterns
* [ ] Review bundle impact
* [ ] Review expensive computations
* [ ] Review list rendering
* [ ] Review image/font loading
* [ ] Review caching opportunities
* [ ] Verify mobile performance

---

# 74. Security Review Checklist

* [ ] Authentication considered
* [ ] Authorization enforced
* [ ] Tenant scope enforced
* [ ] Input validated
* [ ] IDs validated
* [ ] Sensitive data protected
* [ ] Secrets excluded
* [ ] Error leakage prevented
* [ ] File access secured
* [ ] Audit requirements considered
* [ ] Cross-tenant access tested

---

# 75. Tenant-Isolation Checklist

For every tenant-owned feature:

* [ ] Tenant ownership defined
* [ ] Tenant context available
* [ ] User membership validated
* [ ] Permission checked
* [ ] Repository scoped
* [ ] Queries scoped
* [ ] Mutations scoped
* [ ] Related entities scoped
* [ ] Files scoped
* [ ] Cache keys scoped
* [ ] Audit events scoped
* [ ] Cross-tenant tests considered

---

# 76. Production Readiness

Production readiness requires more than a successful frontend build.

The system should eventually provide:

```text
Secure Authentication
+
Production Database
+
Tenant Isolation
+
Authorization
+
Backups
+
Monitoring
+
Logging
+
Error Tracking
+
Secure File Storage
+
Reliable Integrations
+
Automated Testing
+
CI/CD
+
Performance Monitoring
+
Disaster Recovery
```

---

# 77. Deployment Architecture

The production infrastructure is intentionally kept separate from frontend architectural assumptions.

A future deployment may conceptually look like:

```text
                   Users
                     │
          ┌──────────┴──────────┐
          │                     │
        Web                  Mobile
          │                     │
          └──────────┬──────────┘
                     │
                  API Layer
                     │
          ┌──────────┼──────────┐
          │          │          │
       Auth       Services   Integrations
          │          │          │
          └──────────┼──────────┘
                     │
                  Database
                     │
               File Storage
                     │
              Observability
```

The exact infrastructure should be selected according to actual production requirements.

---

# 78. Future Backend Architecture

The frontend should eventually communicate with a production backend through explicit contracts.

Conceptually:

```text
Web
 │
 ├───────────────┐
 │               │
Mobile          API
                 │
          Authentication
                 │
           Tenant Context
                 │
          Authorization
                 │
           Domain Services
                 │
             Repositories
                 │
              Database
```

The backend should become the authoritative source for:

* authorization
* tenant isolation
* persistence
* financial state
* audit state
* domain invariants

---

# 79. Future Mobile Applications

The planned mobile strategy is:

```text
React Native
+
Expo
+
Native mobile UX
+
Shared contracts
+
Shared validation
+
Shared domain concepts
```

The mobile application should not simply render the web application inside a mobile wrapper.

It should provide mobile-native experiences.

Potential mobile audiences include:

```text
Parents
Teachers
School Administrators
Students
```

depending on product strategy.

---

# 80. Integration Strategy

External services should be isolated behind adapters.

Potential integrations:

```text
Payment Gateway
SMS Provider
Email Provider
WhatsApp Provider
Push Notification Provider
Cloud Storage
Analytics
Identity Provider
```

Domain logic should depend on internal interfaces rather than provider-specific APIs.

Example:

```text
Communication Domain
        ↓
Notification Service
        ↓
Provider Adapter
        ↓
SMS / Email / Push / WhatsApp
```

---

# 81. Documentation Strategy

The repository should maintain documentation at different levels.

### README.md

High-level repository orientation.

### ARCHITECTURE.md

Deep architectural decisions.

### RULES.md

Engineering and implementation rules.

### PRD.md

Product requirements and business scope.

### PHASES.md

Implementation roadmap and phase history.

### DESIGN.md

UI/UX and design system decisions.

### MEMORY.md

Important project continuity information.

Additional documentation may include:

```text
docs/
├── architecture/
├── modules/
├── routes/
├── security/
├── performance/
├── mobile/
├── api/
├── database/
└── development/
```

Documentation should evolve alongside the codebase.

---

# 82. Roadmap

The project is expected to evolve through progressive phases.

A conceptual roadmap:

```text
Foundation
    ↓
Application Shell
    ↓
Tenant / Identity / Permissions
    ↓
Academic Structure
    ↓
Student Management
    ↓
Student Placement
    ↓
Attendance
    ↓
Admissions
    ↓
Finance
    ↓
Communication
    ↓
Assessments
    ↓
HR / Staffing
    ↓
Reports
    ↓
ERP-wide Optimization
    ↓
Security Hardening
    ↓
Production Backend
    ↓
Production Infrastructure
    ↓
Mobile Applications
```

The actual phase status should be maintained separately in the project's phase documentation.

---

# 83. Known Limitations

The project is still under active development.

The following should not be assumed to be production-complete unless implemented and verified:

* Production authentication
* Production database
* Production payment gateway
* Production cloud storage
* External notification providers
* Full backend infrastructure
* Native mobile applications
* Complete observability infrastructure
* Complete automated test coverage
* Disaster recovery infrastructure

The architecture is designed to support these capabilities without requiring unnecessary rewrites.

---

# 84. Architectural Guardrails

## Always

* Keep tenant boundaries explicit.
* Keep permissions centralized.
* Validate external input.
* Keep business logic out of UI.
* Use strong types.
* Reuse shared design primitives.
* Prefer server-side authority.
* Design for large datasets.
* Preserve mobile portability.
* Document important decisions.
* Test important workflows.
* Measure performance before optimizing blindly.

## Never

* Trust client tenant IDs blindly.
* Bypass authorization.
* Hardcode production secrets.
* Put financial invariants in UI code.
* Couple domain logic to browser APIs.
* Create giant components.
* Duplicate business rules.
* Introduce unnecessary global state.
* Add microservices without a real need.
* Replace working architecture merely for stylistic reasons.
* Assume responsive CSS equals mobile readiness.

---

# 85. Definition of Done

A feature is not considered complete merely because the page renders.

A feature should be considered complete when applicable requirements have been addressed across:

```text
┌─────────────────────────────┐
│ Domain                      │
├─────────────────────────────┤
│ Types                       │
├─────────────────────────────┤
│ Validation                  │
├─────────────────────────────┤
│ Tenant Isolation            │
├─────────────────────────────┤
│ Authorization               │
├─────────────────────────────┤
│ Service Boundary            │
├─────────────────────────────┤
│ Data Boundary               │
├─────────────────────────────┤
│ UI                          │
├─────────────────────────────┤
│ Responsive UX               │
├─────────────────────────────┤
│ Loading / Empty / Error     │
├─────────────────────────────┤
│ Accessibility               │
├─────────────────────────────┤
│ Testing                     │
├─────────────────────────────┤
│ Performance                 │
├─────────────────────────────┤
│ Security                    │
├─────────────────────────────┤
│ Auditability                │
├─────────────────────────────┤
│ Documentation               │
└─────────────────────────────┘
```

Not every feature requires every item at the same depth, but each must be consciously evaluated.

---

# 86. Project Philosophy

The central engineering philosophy of School ERP is:

> **Build a strong platform, not merely a large application.**

The objective is not to maximize the number of screens.

The objective is to build a system where additional modules can be introduced without destroying:

* performance
* security
* maintainability
* tenant isolation
* usability
* data integrity
* mobile readiness

The desired evolution is:

```text
Simple Foundation
       ↓
Strong Domain Model
       ↓
Clear Module Boundaries
       ↓
Reusable Services
       ↓
Reliable Data Contracts
       ↓
Secure Multi-Tenancy
       ↓
High Performance
       ↓
Production Infrastructure
       ↓
Native Mobile Clients
       ↓
Large-Scale School SaaS
```

The platform should remain understandable to:

* developers
* architects
* QA engineers
* DevOps engineers
* product teams
* future maintainers
* AI coding agents

---

# 87. Final Status

**Project Status: Active Development**

School ERP is evolving from a frontend application foundation into a complete, production-oriented, multi-tenant school ERP platform.

The project currently prioritizes:

1. Correct domain architecture
2. Tenant isolation
3. Permission architecture
4. Student and academic foundations
5. Admissions and finance separation
6. Attendance
7. Communication
8. Performance
9. Security
10. Mobile readiness
11. Code quality
12. Documentation
13. Production scalability

The repository itself remains the ultimate source of truth for:

* implemented routes
* installed dependencies
* current components
* active services
* data models
* environment variables
* feature status
* build configuration

This README provides the architectural and product-level orientation necessary to understand and contribute to the project.

---

## Maintained By

**Hoofixsoft**

**School ERP Platform**

> Building a secure, scalable, modern digital foundation for school operations.
