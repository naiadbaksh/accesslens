import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isPrivateAddress } from "./fetchPage.ts";

describe("isPrivateAddress", () => {
  it("blocks internal addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.5",
      "192.168.1.1",
      "172.20.0.1",
      "169.254.169.254",
      "::1",
      "::ffff:127.0.0.1",
    ]) {
      assert.equal(isPrivateAddress(ip), true, ip);
    }
  });
  it("allows public addresses", () => {
    for (const ip of [
      "8.8.8.8",
      "142.250.80.46",
      "172.32.0.1",
      "2606:4700::1111",
    ]) {
      assert.equal(isPrivateAddress(ip), false, ip);
    }
  });
});
