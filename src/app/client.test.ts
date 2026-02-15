import { describe, expect, it, vi } from "vitest";
import { createSubscriptionClient } from "./client";

describe("createSubscriptionClient", () => {
  it("sends auth header and parses success response", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      text: async () =>
        JSON.stringify({ hasActiveSubscription: true, subscription: null }),
    }));

    const client = createSubscriptionClient({
      baseUrl: "https://api.example.com",
      getAccessToken: () => "token-123",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await client.getMySubscriptionStatus();

    expect(result.hasActiveSubscription).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/subscriptions/status",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("throws API message on non-OK response", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({ message: "Forbidden" }),
    }));

    const client = createSubscriptionClient({
      baseUrl: "https://api.example.com",
      getAccessToken: () => null,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.getMySubscriptions()).rejects.toThrow("Forbidden");
  });

  it("uses correct admin routes and HTTP methods", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ success: true, subscription: {} }),
    }));

    const client = createSubscriptionClient({
      baseUrl: "https://api.example.com",
      getAccessToken: () => "token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.cancelSubscriptionAsAdmin("sub_1");
    await client.reactivateSubscriptionAsAdmin("sub_1");

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://api.example.com/admin/subscriptions/sub_1/cancel",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://api.example.com/admin/subscriptions/sub_1/reactivate",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});
