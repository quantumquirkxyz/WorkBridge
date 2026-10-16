import { describe, expect, it } from "vitest";
import { verificationConfigFromEnv } from "../src/verification/index.js";

describe("verificationConfigFromEnv", () => {
  it("reads the Certo deployment boundary from the environment", () => {
    const config = verificationConfigFromEnv({
      CERTO_BASE_URL: "https://certo.example",
      CERTO_API_TOKEN: "certo-token",
      ACCREDIBLE_API_TOKEN: "accredible-token",
      CREDLY_API_TOKEN: "credly-token",
    });

    expect(config).toEqual({
      certoBaseUrl: "https://certo.example",
      certoApiToken: "certo-token",
      accredibleApiToken: "accredible-token",
    });
    expect(JSON.stringify(config)).not.toContain("credly-token");
  });

  it("treats blank deployment values as unset", () => {
    expect(verificationConfigFromEnv({ CERTO_BASE_URL: "  ", CERTO_API_TOKEN: "" })).toEqual({
      certoBaseUrl: undefined,
      certoApiToken: undefined,
      accredibleApiToken: undefined,
    });
  });
});
