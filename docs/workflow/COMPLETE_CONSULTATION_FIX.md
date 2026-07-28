# Complete Consultation Bug Fix

## Symptom
Completing a consultation from the doctor session page returned a generic failure:
`Failed to complete consultation`

No useful error was surfaced, and the workflow engine trace showed no guard evaluation.

## Root Cause
`SessionService.completeSession` was executing the `COMPLETE_CONSULTATION` workflow command with an empty/incomplete guard context. The workflow guards (G-041–G-050) require real data to validate the transition, but the service was not populating:

- `appointment`
- `consultation`
- `patientId`
- `doctorId`
- `notes`
- `outcomeType`
- `documentationWorkflowState`
- `consultationWorkflowState`
- `user` (including doctor identity)

In addition, guard `G-049` was comparing the appointment’s `doctorId` (Doctor record ID) against `ctx.user.id` (User ID), which are different identifiers in this schema.

Finally, the completion guards accessed `ctx.metadata.userConfirmUnsaved`, `ctx.metadata.billingSummary`, and `ctx.metadata.advisoryWarnings` without null checks, causing crashes when `metadata` was absent.

## Fix
- `application/services/SessionService.ts`
  - `completeSession` now fetches the appointment and doctor record, builds the full guard context, calls `coordinator.updateContext(...)`, and resets the consultation state to `COMPLETING` before executing the command.
  - Added explicit logging for workflow and API results to expose failures.
  - `userId` is now passed through from the factory/shim into `completeSession`.

- `application/orchestrators/WorkflowCoordinator.ts`
  - Exposed `updateContext()` and `resetConsultationState()` so `SessionService` can drive the workflow engine.

- `domain/workflows/GuardContext.ts`
  - Added optional `doctorId` to the `user` object to support doctor-vs-user identity checks.

- `domain/workflows/guards/completionGuards.ts`
  - `G-049` now compares `appointment.doctorId` with `ctx.user.doctorId ?? ctx.user.id`.
  - `G-042`, `G-043`, `G-048`, and `G-050` now use optional chaining on `ctx.metadata`.

- `infrastructure/factories/ConsultationSessionFactory.ts`
  - Passes `config.user.id` into `SessionService.completeSession`.

- `application/shims/SessionOperationsShim.ts`
  - Passes `this.user.id` into `SessionService.completeSession`.

- `actions/doctor/consultation-session.ts`
  - Propagates the actual error message instead of the generic `'Failed to complete consultation'`.

## Verification
- TypeScript: `npx tsc --noEmit` passes.
- Lint: `npm run lint` passes.
- Unit tests: `npm test -- --run` — 1731 tests pass.
