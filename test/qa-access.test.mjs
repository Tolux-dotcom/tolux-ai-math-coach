import test from "node:test";
import assert from "node:assert/strict";

import { isPreviewQaUser } from "../qa-access.mjs";

const qaUser = {
  id: "cefac2b0-5c7c-46ca-bc63-58900aacb001",
  app_metadata: { internal_qa: true }
};

test("immutable app metadata enables QA only on Vercel previews", () => {
  assert.equal(isPreviewQaUser(qaUser, { VERCEL_ENV: "preview" }), true);
  assert.equal(isPreviewQaUser(qaUser, { VERCEL_ENV: "production" }), false);
  assert.equal(isPreviewQaUser(qaUser, { VERCEL_ENV: "development" }), false);
});

test("ordinary users and user-editable metadata cannot enable QA", () => {
  assert.equal(
    isPreviewQaUser(
      { id: qaUser.id, app_metadata: {}, user_metadata: { internal_qa: true } },
      { VERCEL_ENV: "preview" }
    ),
    false
  );
  assert.equal(isPreviewQaUser(null, { VERCEL_ENV: "preview" }), false);
});
