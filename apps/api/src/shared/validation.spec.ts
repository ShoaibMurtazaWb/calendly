import { usernameSchema, slugSchema, timezoneSchema, durationMinutesSchema, registerBodySchema } from "@sched/api-contract";

describe("api-contract validation", () => {
  it("normalizes usernames to lowercase slugs", () => {
    expect(usernameSchema.parse("Ada-Lovelace")).toBe("ada-lovelace");
  });

  it("rejects reserved usernames", () => {
    expect(usernameSchema.safeParse("admin").success).toBe(false);
  });

  it("rejects invalid slugs", () => {
    expect(slugSchema.safeParse("Hello World").success).toBe(false);
    expect(slugSchema.parse("15-min")).toBe("15-min");
  });

  it("accepts IANA timezones and rejects unknown ids", () => {
    expect(timezoneSchema.parse("Asia/Karachi")).toBe("Asia/Karachi");
    expect(timezoneSchema.safeParse("Karachi").success).toBe(false);
  });

  it("bounds duration in minutes", () => {
    expect(durationMinutesSchema.parse(30)).toBe(30);
    expect(durationMinutesSchema.safeParse(4).success).toBe(false);
    expect(durationMinutesSchema.safeParse(481).success).toBe(false);
  });

  it("requires a sufficiently long password on register", () => {
    const result = registerBodySchema.safeParse({
      email: "a@b.com",
      password: "short",
      name: "Ada",
      username: "ada",
      timezone: "UTC",
    });
    expect(result.success).toBe(false);
  });
});
