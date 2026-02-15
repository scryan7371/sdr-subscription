import type {
  AdminUpdateSubscriptionResponse,
  SubscriptionHistoryResponse,
  SubscriptionStatusResponse,
} from '../api/contracts';

type FetchLike = typeof fetch;

export type SubscriptionClientOptions = {
  baseUrl: string;
  getAccessToken: () => string | null;
  fetchImpl?: FetchLike;
};

export const createSubscriptionClient = (
  options: SubscriptionClientOptions,
) => {
  const fetchImpl = options.fetchImpl ?? fetch;

  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const token = options.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init?.headers ? (init.headers as Record<string, string>) : {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetchImpl(`${options.baseUrl}${path}`, {
      ...init,
      headers,
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const message =
        typeof body?.message === 'string'
          ? body.message
          : `Request failed: ${response.status}`;
      throw new Error(message);
    }

    return body as T;
  };

  return {
    getMySubscriptionStatus: () =>
      request<SubscriptionStatusResponse>('/subscriptions/status'),

    getMySubscriptions: () =>
      request<SubscriptionHistoryResponse>('/subscriptions/history'),

    cancelMySubscription: (subscriptionId: string) =>
      request<AdminUpdateSubscriptionResponse>(
        `/subscriptions/${subscriptionId}/cancel`,
        {
          method: 'POST',
        },
      ),

    cancelSubscriptionAsAdmin: (subscriptionId: string) =>
      request<AdminUpdateSubscriptionResponse>(
        `/admin/subscriptions/${subscriptionId}/cancel`,
        {
          method: 'PATCH',
        },
      ),

    reactivateSubscriptionAsAdmin: (subscriptionId: string) =>
      request<AdminUpdateSubscriptionResponse>(
        `/admin/subscriptions/${subscriptionId}/reactivate`,
        {
          method: 'PATCH',
        },
      ),
  };
};
