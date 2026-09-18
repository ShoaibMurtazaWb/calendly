import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isApiErrorBody } from "./api-error";

describe("isApiErrorBody", () => {
  it("accepts the API error envelope", () => {
    assert.equal(
      isApiErrorBody({
        error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: { fields: { slug: "taken" } } },
      }),
      true,
    );
  });

  it("rejects unrelated JSON", () => {
    assert.equal(isApiErrorBody({ message: "nope" }), false);
  });
});
