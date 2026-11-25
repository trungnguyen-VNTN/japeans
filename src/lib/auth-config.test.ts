import { describe, expect, it } from "vitest";
import { missingAuthEnv, safeCallbackPath, signInErrorMessage } from "./auth-config";

describe("missingAuthEnv", () => {
  it("lists missing or blank variables", () => {
    expect(missingAuthEnv({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "  " })).toEqual([
      "GOOGLE_CLIENT_SECRET",
      "NEXTAUTH_SECRET",
    ]);
  });

  it("is empty when everything is set", () => {
    expect(missingAuthEnv({ GOOGLE_CLIENT_ID: "a", GOOGLE_CLIENT_SECRET: "b", NEXTAUTH_SECRET: "c" })).toEqual([]);
  });
});

describe("safeCallbackPath", () => {
  it("keeps same-site paths", () => {
    expect(safeCallbackPath("/tai-khoan")).toBe("/tai-khoan");
    expect(safeCallbackPath("/tim-kiem?q=học")).toBe("/tim-kiem?q=học");
    expect(safeCallbackPath(["/kanji", "/x"])).toBe("/kanji");
  });

  it("rejects external and protocol-relative URLs", () => {
    expect(safeCallbackPath("https://evil.example/")).toBe("/");
    expect(safeCallbackPath("//evil.example")).toBe("/");
    expect(safeCallbackPath("/\\evil.example")).toBe("/");
    expect(safeCallbackPath("javascript:alert(1)")).toBe("/");
    expect(safeCallbackPath(undefined)).toBe("/");
  });
});

describe("signInErrorMessage", () => {
  it("maps known codes and falls back to a generic message", () => {
    expect(signInErrorMessage("AccessDenied")).toMatch(/từ chối/);
    expect(signInErrorMessage("SomethingElse")).toMatch(/không thành công/);
    expect(signInErrorMessage(undefined)).toBeNull();
  });
});
