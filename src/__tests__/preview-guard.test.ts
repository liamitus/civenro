import { afterEach, describe, expect, it } from "vitest";
import { isPreviewEnv, isWriteMethod } from "../lib/preview-guard";

const originalVercelEnv = process.env.VERCEL_ENV;

afterEach(() => {
  if (originalVercelEnv === undefined) {
    delete process.env.VERCEL_ENV;
  } else {
    process.env.VERCEL_ENV = originalVercelEnv;
  }
});

describe("isPreviewEnv", () => {
  it("returns true only when VERCEL_ENV is preview", () => {
    process.env.VERCEL_ENV = "preview";
    expect(isPreviewEnv()).toBe(true);
  });

  it("returns false on production", () => {
    process.env.VERCEL_ENV = "production";
    expect(isPreviewEnv()).toBe(false);
  });

  it("returns false on local development", () => {
    process.env.VERCEL_ENV = "development";
    expect(isPreviewEnv()).toBe(false);
  });

  it("returns false when VERCEL_ENV is unset", () => {
    delete process.env.VERCEL_ENV;
    expect(isPreviewEnv()).toBe(false);
  });
});

describe("isWriteMethod", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE", "post", "patch"])(
    "treats %s as a write",
    (method) => {
      expect(isWriteMethod(method)).toBe(true);
    }
  );

  it.each(["GET", "HEAD", "OPTIONS", "get", "options"])(
    "treats %s as safe",
    (method) => {
      expect(isWriteMethod(method)).toBe(false);
    }
  );
});
