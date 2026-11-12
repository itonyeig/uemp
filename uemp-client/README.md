# UEMP Student Portal

A responsive Angular frontend for the UEMP assessment’s **Student workflow**. Students can sign in, manage contact details, register eligible courses, review registration summaries, and view approved results with semester GPA and CGPA. Registration summaries and result statements support browser printing and Save as PDF.

## Stack and setup

Angular 21 standalone components, TypeScript, Tailwind CSS 4, Angular Router, HttpClient, Reactive Forms, signals, RxJS, and Vitest. No UI or state-management libraries were added.

Use a Node.js version supported by Angular 21 (Node 22.12+ is suitable) and npm:

```sh
npm ci
npm start
```

Open `http://localhost:4200/student`. 
The backend must be running separately. This frontend does not start or seed the API.

## Configuration and API integration

Set `UEMP_API_URL` to the public API base URL, including `/api/v1`. For local development, copy `.env.example` to `.env` and set the value before running `npm start`. The default is `https://uemp-z9pi.onrender.com/api/v1`.

Configure the frontend host to serve `/index.html` with HTTP 200 for Angular routes such as `/student/profile` and `/student/results`. Use a rewrite that keeps the requested path and query string. This lets Angular handle direct links and reloads. A valid student session survives a reload in the same tab. If the session has expired, sign-in returns the student to the requested page.

The API wraps successful responses as `{ success, statusCode, message, data }`. Errors contain a string or array in `message`. Services unwrap `data`, and pages show backend validation errors without inventing academic rules.

| Method | Endpoint (relative to API URL)    | Usage                                                              |
| ------ | --------------------------------- | ------------------------------------------------------------------ |
| POST   | `/auth/login`                     | `{ email, password }` → student, bearer token, expiry              |
| POST   | `/auth/logout`                    | Revoke the active session                                          |
| GET    | `/students/me`                    | Student profile and academic placement                             |
| PATCH  | `/students/me`                    | Changed `phoneNumber` and/or `address` only                        |
| GET    | `/registration/available-courses` | Eligible offerings, registered flags, current semester, unit limit |
| POST   | `/registration`                   | `{ offeringIds: string[] }` → registration summary                 |
| GET    | `/registration`                   | Current registered courses and total units                         |
| GET    | `/students/me/results`            | Approved semester results, GPA, CGPA, grading scale                |

Authentication follows the existing backend: an eight-hour JWT backed by a server session, no refresh-token endpoint. Only the token and expiry are kept in tab-scoped `sessionStorage`; profile data stays in memory. The interceptor attaches tokens only to this API and sends expired/revoked sessions back to login. Signing out revokes the server session before clearing local state. A new login replaces the account’s previous session.

## Pages and architecture

All application pages are under `/student`:

- `/student/login` — sign in and invalid/expired-session feedback.
- `/student/dashboard` — identity, current semester, registered units and CGPA.
- `/student/profile` — academic records and permitted contact updates.
- `/student/courses` — eligible course selection and registration.
- `/student/registered-courses` — confirmed registrations and printing.
- `/student/results` — approved history, semester filtering and printing.

`core/` contains API models/services, authentication, guards, and the interceptor. `features/` contains lazily loaded standalone pages. `layouts/` provides the responsive student shell; `shared/` holds the reusable print identity heading. Tailwind utilities and small shared styles live in `src/styles.css`.

Academic records are read-only. Eligibility, duplicate checks, credit limits, grades, GPA, and CGPA remain authoritative on the server. Current registration and results refresh from the API; the app has no mock-data fallback.

## Build and verification

```sh
npm run build
npm test -- --watch=false
```

Production output: `dist/uemp-client/browser`. Unit tests cover token boundaries, session revocation, API payloads/wrappers, validation feedback, and registration refresh after success or conflicts.

For an assessment demo, the backend’s seeded `demo.student2@example.test` account includes two historical semesters. See the backend’s seed/setup instructions for demo credentials.

## Scope and backend limits

Student workflow only. Registration APIs cover the current semester; historical results are available through the results endpoint. There is no student course-withdrawal, historical registration lookup, password-reset, or certified transcript endpoint, so those actions are not offered. Profile editing supports phone numbers (7–15 digits, optional `+`) and addresses (up to 300 characters); blank phone values are omitted unless edited, and an existing phone cannot be cleared in this UI. Printing uses the browser’s print dialog, without a PDF dependency.
