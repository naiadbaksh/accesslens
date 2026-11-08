import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { withRetry, HttpError } from "./retry.ts";

const noSleep = async () => {};

describe("withRetry", () => {
  it("retries temporary failures, then succeeds", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new HttpError(529, "overloaded");
        return "ok";
      },
      { sleep: noSleep },
    );
    assert.equal(result, "ok");
    assert.equal(calls, 3);
  });

  it("doesn't retry mistakes like a bad request", async () => {
    let calls = 0;
    await assert.rejects(
      withRetry(
        async () => {
          calls++;
          throw new HttpError(400, "bad");
        },
        { sleep: noSleep },
      ),
    );
    assert.equal(calls, 1);
  });

  it("gives up after the last attempt", async () => {
    let calls = 0;
    await assert.rejects(
      withRetry(
        async () => {
          calls++;
          throw new HttpError(503, "down");
        },
        { attempts: 2, sleep: noSleep },
      ),
    );
    assert.equal(calls, 2);
  });
});
