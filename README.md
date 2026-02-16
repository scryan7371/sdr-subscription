# sdr-subscription

Reusable Stripe-only subscription capability for API and app clients.

## Scope

This package is intentionally split into two surfaces:

- `api`: shared domain contracts + Stripe status mapping helpers.
- `app`: typed client for subscription endpoints used by mobile/web app frontends.

## Package Layout

- `src/api/contracts.ts`: canonical request/response and status/provider types.
- `src/api/stripe.ts`: Stripe-to-domain status mapping.
- `src/app/client.ts`: client methods for user/admin subscription API calls.

## API Integration (Nest)

In your API project:

1. Reuse exported types from `sdr-subscription/src/api/contracts.ts` in controllers.
2. Reuse `mapStripeStatus` from `sdr-subscription/src/api/stripe.ts` in Stripe webhook/service logic.
3. Keep project-specific concerns local:
   - persistence (TypeORM entities/repositories)
   - auth/guards
   - Stripe SDK client instantiation
   - webhook signature verification

## App Integration (React Native / Web)

In your app project:

1. Build client once:

```ts
import { app as sdrSubscription } from '@scryan7371/sdr-subscription';

const subscriptionClient = sdrSubscription.createSubscriptionClient({
  baseUrl,
  getAccessToken: () => accessToken,
});
```

2. Use methods in screens/services:

- `getMySubscriptionStatus()`
- `getMySubscriptions()`
- `cancelMySubscription(subscriptionId)`
- `cancelSubscriptionAsAdmin(subscriptionId)`
- `reactivateSubscriptionAsAdmin(subscriptionId)`

## Notes

- This is Stripe-only by design.
- Keep versions pinned in consumers.

## Publish (npmjs)

1. Configure project-local npm auth (`.npmrc`):

```ini
registry=https://registry.npmjs.org/
@scryan7371:registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

2. Set token, bump version, and publish:

```bash
export NPM_TOKEN=xxxx
npm version patch
npm publish --access public --registry=https://registry.npmjs.org --userconfig .npmrc
```

3. Push commit and tags:

```bash
git push
git push --tags
```

## CI Publish (GitHub Actions)

Tag pushes like `sdr-subscription-v*` trigger `.github/workflows/publish.yml`.

Required repo secret:

- `NPM_TOKEN` (npm granular token with read/write + bypass 2FA for automation).

## Install

Install a pinned version:

```bash
npm install @scryan7371/sdr-subscription@0.1.0
```
