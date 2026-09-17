# Dashboard Baseline

## Current Component Tree

- `src/app/page.tsx`
  - `AppShell`
  - `PageHero`
  - `PrincipalDashboard`
  - `StudentManagement`
  - `AttendanceGrid`
  - `AdmissionPipeline`
  - `ModuleSummaries`
  - `PaymentsTable`
  - `ReportFramework`
  - `AuditLog`

## Data Sources

- `PrincipalDashboard`, admissions, finance, module summaries, and audit rows use deterministic mock data.
- Student and attendance previews use mock-backed service boundaries.
- `apiClient.get` explicitly throws while the mock API is active, so the dashboard is not backend-integrated yet.

## Client / Server Boundaries

- `src/app/page.tsx` is a Server Component.
- `AppShell`, command palette, notification center, and some module pages are Client Components because they use state, browser storage, and interactive controls.
- The dashboard itself can remain server-rendered because the upgraded executive summary does not need local component state.

## API / Service Boundaries

- Existing modules expose services under `src/lib/api` and domain logic under `src/features/*/services`.
- Before this upgrade, dashboard-specific business logic was mixed between `principal-dashboard.tsx` and `mock-data.ts`.
- The dashboard needed an explicit service boundary so future endpoints such as `/dashboard/principal-summary` can replace mocks without changing presentation components.

## Accessibility And Responsive Issues

- Existing cards use semantic sections and reusable headers, but the home page was dense and mixed multiple module previews.
- Drill-down links were inconsistent: some metrics were static text while others had module links.
- The dashboard lacked textual chart summaries for progress bars and did not clearly describe comparison periods.
- Mobile layout worked generally, but putting large feature previews on the home page created scanning fatigue.

## Performance Risks

- The home page rendered several independent module surfaces at once, including tables and forms that belong on detailed module pages.
- Dashboard metrics were not consolidated, causing presentation components to own too much business meaning.
- The best optimization is architectural: keep the dashboard as server-rendered summary UI, avoid chart libraries, and link to detailed module routes.

## Tenant / RBAC Risks

- The app has tenant context and role permissions, but dashboard mock data was not modeled as a scoped dashboard contract.
- Some finance, admissions, audit, and reports surfaces were visible through the home composition rather than a dashboard permission model.
- The upgraded dashboard should filter widgets through the existing permission matrix and carry the current tenant/school/campus/academic-year scope through the service layer.

## Keep / Refactor / Extract

- Keep: `AppShell`, navigation, tenant context, permission helpers, UI primitives, existing module routes, existing module components.
- Refactor: `PrincipalDashboard` from static card collection into modular executive dashboard presentation.
- Extract: dashboard types, mock data, calculations, config, and service contract.
- Keep server-rendered: dashboard summary, KPI cards, comparison sections, intelligence panels, action summaries.
- Keep detailed module pages separate: students, attendance reports, finance preview, communication, staff, and audit workflows.
