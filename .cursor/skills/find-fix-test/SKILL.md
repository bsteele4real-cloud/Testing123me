---
name: find-fix-test
description: >-
  Find a real defect, prove it with a failing test, fix it, and re-run checks.
  Use for bug fixes in this repo, follow-up review on an open pull request,
  or when a reported flaw needs to be verified before changing code.
---

# Find, fix, test

Verify the flaw in the current code before editing. Skip a report that does not match the code and say why.

## Loop

1. Read the function that owns the behavior. Name the wrong output.
2. Add the smallest test that fails for that reason. API tests live in `artifacts/api-server/src/lib/*.test.ts` and import `./module.ts`.
3. Run that file and confirm the new assertion fails.
4. Change the production code. Do not weaken the test to match the bug.
5. Re-run the file, then `pnpm run typecheck` and `pnpm --filter @workspace/api-server test`.
6. For a visible UI change, screenshot before and after with Chrome headless. Use a fresh `--user-data-dir` and `timeout`, because Chrome can hang after writing the png.
7. Commit the fix on its own. Push the existing feature branch. Update the open pull request. Do not open a second PR for the same effort, and do not merge.

## Commands

```bash
node --experimental-strip-types --test src/lib/<file>.test.ts
pnpm --filter @workspace/api-server test
PORT=5000 BASE_PATH=/ pnpm run typecheck
```

Dashboard screenshots need `PORT` and `BASE_PATH`. A missing API still returns the SPA HTML for `/api/*`, so an error state is a valid screenshot.

## Stop

Do not add a test that only mocks the line you are about to write. Do not commit `.env` files or key values. Do not deploy.
