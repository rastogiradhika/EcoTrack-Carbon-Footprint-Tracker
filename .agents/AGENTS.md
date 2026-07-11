# EcoTrack — Agent Development Rules
# Applied to every task in this workspace.

## Global Rules (Non-Negotiable)

1. Never modify a file without first reading the complete file.
2. Never assume line numbers.
3. Always show the exact insertion point.
4. Always show surrounding code before modifying.
5. Never replace unrelated code.
6. Minimize changes.
7. Maintain backward compatibility.
8. Reuse existing architecture.
9. Follow existing project conventions.
10. Prefer existing utilities over creating new ones.
11. Do not create new folders unless absolutely necessary.
12. Use only free APIs.
13. Never introduce paid services.
14. Validate every change against existing tests.
15. Explain why every modification is needed.
16. If uncertain, stop and ask rather than guessing.
17. Every feature must pass: Architecture → Dependency → API → Database → Logic → Security → Performance → Testing.

## API Policy

- Always prefer completely free APIs.
- Compare at least 3 alternatives before selecting any external service.
- Never introduce paid APIs when a free alternative exists.
- Prefer: open-source > completely free > generous free tier > paid (last resort).
- AI stack: Gemini 1.5 Flash (primary) → Groq (fallback) → rule-based (offline fallback).
- All services must be student-deployable at ₹0/month.

## 15-Phase Development Process

Every implementation task MUST follow this sequence in order.
No phase may be skipped.

### Phase 0 — Repository Understanding
Before touching any code, answer:
- What project is this?
- What problem does it solve?
- Existing architecture
- Existing folder structure
- Existing conventions
- Existing design language
- Existing API design
- Existing coding standards

### Phase 1 — Architecture Verification
Inspect: Frontend, Backend, Database, Auth, Controllers, Routes, Middleware,
Utilities, Services, Views, Static JS, Public assets, AI integrations,
Third-party APIs, Caching, Deployment.
Then explain: Current Architecture / Weak Architecture / Suggested Architecture / Why.

### Phase 2 — Dependency Verification
Inspect package.json. Find:
- unused packages → remove
- duplicate packages → consolidate
- deprecated packages → upgrade or replace
- missing packages → add
- large packages → justify or replace
- security vulnerabilities → patch
- breaking upgrades → document migration

### Phase 3 — API Verification
For every external API verify:
Free/Paid, Rate limits, Auth method, Caching, Fallback, Error handling,
Retries, Timeouts, Alternatives.
Use only free APIs. EcoTrack AI stack:
  Gemini → Groq fallback → rule-based fallback.

### Phase 4 — Database Verification
Inspect: schemas, relationships, indexes, validation, aggregation, populate,
duplicate data, N+1 queries, ObjectId casting, missing indexes, large documents.

### Phase 5 — Current Implementation Audit
Inspect every feature one by one:
Auth, Dashboard, Emission logging, Analytics, Leaderboard,
Badges, Receipt OCR, Chatbot, Profile, Settings, API, Admin.

### Phase 6 — Bug Analysis
For every bug provide:
Severity, Location, Function, Root Cause, Reproduction Steps,
Expected Behavior, Actual Behavior, Recommended Fix, Complexity, Regression Risk.

### Phase 7 — Logic Analysis
Business logic issues (not just runtime bugs):
Leaderboard ranking, Timezone handling, Badge evaluation, Emission calculation,
Carbon scoring, Streak calculation, Chat history management.

### Phase 8 — Security Review (OWASP)
Check: Session, Cookies, Helmet, Rate limiting, Authorization, Authentication,
NoSQL Injection, XSS, CSRF, File upload, MIME validation, Secrets,
Environment variables, CORS, Input validation.

### Phase 9 — Performance Review
Check: Repeated API calls, Large payloads, Blocking code, Duplicate rendering,
DOM manipulation, Large controllers, Memory leaks, Expensive aggregation,
Cache opportunities, Lazy loading, Pagination, Compression, Indexes, Response size.

### Phase 10 — UX Review
Check: Loading states, Skeletons, Error states, Empty states, Animations,
Accessibility, Keyboard navigation, Mobile, Dark mode, Responsive, Navigation,
User flow, Visual consistency.

### Phase 11 — Implementation Planning
NOW and only now, plan implementation.
For every file provide:
- File path
- Why it is being changed
- Existing code context
- Exact insertion / replacement location
- Dependencies affected
- Tests affected
- Risk assessment
- Exact code to write
- Expected output

No guessing. No replacing unrelated code.

### Phase 12 — Implementation
Rules:
- Never rewrite a file completely.
- Never simplify existing logic.
- Never remove unrelated code.
- Only minimal, targeted changes.
- Explain every change made.

### Phase 13 — Testing
Run: Lint, Build, Unit tests, Integration tests, Manual tests, API tests,
Regression tests, Performance tests, Accessibility tests, Edge cases.

### Phase 14 — Documentation
Automatically update:
README, API docs, Architecture docs, Developer guide, Deployment guide,
Environment variables, Folder documentation, Feature documentation.

### Phase 15 — Pull Request Review
Generate:
- PR Title
- PR Description
- Screenshots
- Test results
- Checklist
- Breaking changes
- Migration guide
- Reviewer notes
- Future improvements
