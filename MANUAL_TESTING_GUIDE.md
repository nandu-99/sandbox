# Developer Sandbox Bootstrapper — Manual Testing Guide

This guide explains how to manually test the complete user flow from request creation through planning, approval, mock execution, smoke-login verification, manifest generation, and the four official test cases.

The application uses a simulated sandbox and synthetic data. It does not create real cloud resources or access production systems.

## 1. Prerequisites

Install:

- Node.js 20 or newer
- npm

From the project root, install dependencies:

```bash
npm install
npm --prefix server install
```

Create the frontend environment file:

```bash
cp .env.example .env.local
```

Create the backend environment file:

```bash
cp server/.env.example server/.env
```

The expected local configuration is:

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```

```env
# server/.env
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=file:./data/bootstrapper.db
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
```

`GEMINI_API_KEY` is optional. Without it, the application generates the same deterministic plan and uses a built-in explanation.

## 2. Prepare the database

Run all SQLite migrations:

```bash
npm --prefix server run db:migrate
```

If your terminal is already inside the `server` folder, use `npm run db:migrate` instead. Do not include `--prefix server` there, because that would look for `server/server/package.json`.

Expected result:

```text
migrations applied successfully
```

## 3. Start the application

Open two terminals in the project root.

Terminal 1 — Express API:

```bash
npm run dev:api
```

Expected API address:

```text
http://localhost:4000
```

Terminal 2 — Next.js frontend:

```bash
npm run dev
```

Expected frontend address:

```text
http://localhost:3000
```

Open `http://localhost:3000` in a browser.

## 4. Confirm application health

Open the API health endpoint:

```text
http://localhost:4000/api/health
```

Expected result:

```json
{
  "status": "ok",
  "service": "sandbox-bootstrapper-api",
  "timestamp": "..."
}
```

On the frontend home page, confirm that you can see:

- Production target block: Enforced
- Human approval gate: Enforced
- Smoke login: Independent
- Secret scan: Required
- Links for **How it works**, a new request, and official tests

If this is your first run, open **How it works** before creating a request. It explains the complete workflow, confirms that the sandbox is simulated, and clarifies the difference between the requested and assigned roles.

## 5. Complete happy-path user flow

This flow covers request creation, planning, approval, execution, verification, and manifest generation.

### Step 5.1 — Create a setup request

1. Select **New request**.
2. Wait for the repository and sandbox sources to load.
3. Enter the following values:

| Field | Value |
|---|---|
| Project template | Node.js API |
| Demo repository | payments-api-demo |
| Target environment | Sandbox |
| Requested permission | Administrator (preselected) |
| Seed-data profile | Demo customers |

4. Confirm the evidence panel shows:

   - Repository ID: `repo-payments-api`
   - Existing sandbox: `None`
   - A source ID and retrieval time

5. Select **Create request**.

Expected result:

- A stable request ID such as `REQ-XXXXXXXXXX` is created.
- The request opens automatically.
- Status is **Needs approval**.
- No sandbox has been created yet.

### Step 5.2 — Review the generated plan

1. In the workflow menu, select **Agent plan**.
2. Confirm the AI panel shows either:

   - **Gemini connected** and **AI-generated reasoning** when a valid API key is configured, or
   - **Gemini fallback** and **Deterministic reasoning used** when no key is configured.

3. Expand **Inspect the ordered plan and evidence**. Confirm the page states whether Gemini or the deterministic fallback selected the order. Even a Gemini-selected order must say it was safety-validated by the server.

Confirm the plan shows:

- Sandbox decision: **Create new sandbox**
- Requested role: `admin`
- Assigned role: `developer`
- Permission was reduced by policy
- Six ordered setup steps
- Evidence IDs and decision reasons
- Plan version `1`

Expected status sequence so far:

```text
CAPTURED -> NEEDS_APPROVAL
```

### Step 5.3 — Approve the plan

1. In the workflow menu, select **Human decision**.
2. Keep or enter the reviewer ID:

   ```text
   demo-team-lead
   ```

3. Select **Approve plan**.

Expected result:

- Request status becomes **Approved**.
- The page shows who approved the plan and when.
- Plan version `1` is shown as locked.
- The execution control becomes available.

### Step 5.4 — Execute the approved setup

1. Confirm **Sandbox setup** opens as the current stage.
2. Select **Execute approved plan**.
3. Wait for the result page to refresh.

Expected result:

- The simulated sandbox is created.
- Assigned role is `developer`.
- Five synthetic records are seeded.
- Production access is disabled.
- An idempotency key is displayed.
- Request status becomes **Ready to verify**.

Expected status transition:

```text
APPROVED -> VERIFYING
```

### Step 5.5 — Test duplicate-execution protection

1. In the execution result, select **Retry safely**.

Expected result:

- The original execution is returned.
- The UI reports that no sandbox or seed data was duplicated.
- The sandbox ID remains unchanged.
- The execution ID remains unchanged.

### Step 5.6 — Run smoke-login verification

1. Confirm **Smoke login** opens as the current stage.
2. Select **Run smoke login**.
3. Wait for the verification results.

Expected checks:

| Check | Intended | Observed | Result |
|---|---|---|---|
| Sandbox availability | READY | READY | Pass |
| Mock authentication | accepted | accepted | Pass |
| Landing page access | `/dashboard` | `/dashboard` | Pass |
| Synthetic seed records | 5 | 5 | Pass |
| Production access | false | false | Pass |

Expected result:

- Smoke-login status is **Passed**.
- Request status becomes **Completed**.
- No real password, OTP, or CAPTCHA is used.

Expected status transition:

```text
VERIFYING -> COMPLETED
```

### Step 5.7 — Generate the Setup Manifest

1. Confirm **Setup manifest** opens as the current stage.
2. Select **Generate manifest**.
3. Confirm the manifest summary appears.

Expected manifest summary:

- Overall status: `COMPLETED`
- Sandbox action: `created`
- Smoke login: `PASSED`
- Secret scan: `PASSED · 0 findings`

3. Expand **View manifest JSON**.
4. Confirm it contains:

   - Request and project identifiers
   - Source evidence IDs and retrieval times
   - Sandbox and permission decisions
   - Approval information
   - Actual execution result
   - Actual verification checks
   - Secret-scan result

5. Select **Download JSON**.
6. Confirm a file named similarly to the following downloads:

   ```text
   REQ-XXXXXXXXXX-setup-manifest.json
   ```

7. Search the downloaded file for:

   ```text
   password
   api_key
   token
   private_key
   connection_string
   ```

Expected result: no sensitive values are present.

## 6. Test production blocking

1. Create another request.
2. Use the Node.js API template and `payments-api-demo` repository.
3. Set **Target environment** to **Production (blocked)**.
4. Submit the request.

Expected result:

- Status is **Aborted**.
- The page explains that production is outside the permitted workflow.
- No plan is created.
- No approval controls appear.
- No execution or verification controls appear.

Expected status:

```text
ABORTED
```

## 7. Test existing sandbox reuse

1. Create another request.
2. Enter these values:

| Field | Value |
|---|---|
| Project template | Next.js web application |
| Demo repository | catalog-web-demo |
| Target environment | Sandbox |
| Requested permission | Developer |
| Seed-data profile | Demo customers |

3. Confirm the source evidence shows:

   ```text
   Existing sandbox: sbx-catalog-001
   ```

4. Create the request.
5. Confirm the plan says **Reuse existing sandbox**.
6. Approve and execute the plan.

Expected result:

- Sandbox action is `reused`.
- Sandbox ID remains `sbx-catalog-001`.
- No new sandbox record is created for this request.
- Retrying execution returns the original execution.

## 8. Test plan rejection

1. Create a normal sandbox request.
2. In the approval section, enter a rejection reason such as:

   ```text
   Use the empty seed-data profile instead.
   ```

3. Select **Reject plan**.

Expected result:

- Status becomes **Rejected**.
- Reviewer, timestamp, and rejection reason remain visible.
- No execution control appears.
- Calling execution directly would be rejected by the API.

## 9. Run all official test cases

1. Open **Test cases** from the top navigation.
2. Select **Run all official tests**.
3. Wait for TC1–TC4 to finish.

Expected results:

| Test | Expected result |
|---|---|
| TC1 | Sandbox created and smoke login passes |
| TC2 | Production setup aborted before planning |
| TC3 | Existing sandbox reused with zero duplicates |
| TC4 | Manifest generated with zero secret findings |

Each result card must show:

- Test-case label
- `PASSED` or `FAILED`
- Expected result
- Actual result
- Stable run ID
- Link to its related request when applicable

Select the request links and confirm the stored evidence matches the displayed test result.

## 10. Optional failed-verification test

The normal UI intentionally runs the successful smoke-login path. To verify that failures remain visible, create, approve, and execute a request, then call the verification API before using the UI verification button:

```bash
curl -X POST http://localhost:4000/api/requests/REQUEST_ID/verify \
  -H "Content-Type: application/json" \
  -d '{"simulateLoginFailure":true}'
```

Replace `REQUEST_ID` with the actual request ID.

Refresh the request page.

Expected result:

- Request status is **Verification failed**.
- Mock authentication shows intended `accepted` and observed `rejected`.
- Landing-page access shows observed `not reached`.
- The failed checks remain visible.
- Setup execution is not falsely presented as verified success.
- A manifest can still be generated and records `VERIFICATION_FAILED`.

## 11. API safety spot checks

### Attempt execution before approval

```bash
curl -X POST http://localhost:4000/api/requests/REQUEST_ID/execute
```

Expected response:

```text
409 EXECUTION_NOT_APPROVED
```

### Attempt verification before execution

```bash
curl -X POST http://localhost:4000/api/requests/REQUEST_ID/verify \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response:

```text
409 EXECUTION_REQUIRED
```

### Attempt manifest generation before verification

```bash
curl -X POST http://localhost:4000/api/requests/REQUEST_ID/manifest
```

Expected response:

```text
409 VERIFICATION_REQUIRED
```

## 12. Expected complete status flow

Successful request:

```text
CAPTURED
  -> NEEDS_APPROVAL
  -> APPROVED
  -> VERIFYING
  -> COMPLETED
  -> Manifest generated
```

Production request:

```text
ABORTED
```

Rejected plan:

```text
NEEDS_APPROVAL -> REJECTED
```

Failed verification:

```text
VERIFYING -> VERIFICATION_FAILED
```

## 13. Evidence to capture for the final demo

Capture screenshots or a short recording of:

1. Request inputs and source evidence.
2. Create/reuse decision and least-privilege reduction.
3. Human approval with locked plan version.
4. Mock execution result and idempotency key.
5. Safe execution retry message.
6. Smoke-login intended-versus-observed checks.
7. Setup Manifest with zero secret findings.
8. Downloaded JSON manifest.
9. TC1–TC4 showing `PASSED`.
10. Production request showing `ABORTED`.

## 14. Final pass criteria

Manual testing is complete when:

- The complete happy path reaches `COMPLETED`.
- Production requests stop at `ABORTED`.
- Administrator access is reduced to developer access.
- Existing sandbox `sbx-catalog-001` is reused.
- Execution retry creates no duplicate.
- Smoke-login results are stored separately from execution.
- Failed verification remains visible.
- Manifest secret scan reports zero findings.
- Manifest JSON downloads successfully.
- TC1, TC2, TC3, and TC4 all show `PASSED`.
