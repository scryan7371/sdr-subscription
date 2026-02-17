# sdr-subscription

Reusable Stripe-only subscription capability for API and app clients.

## Scope

This package is intentionally split into two surfaces:

- `api`: shared domain contracts + Stripe status mapping helpers.
- `app`: typed client for subscription endpoints used by mobile/web app frontends.
- `nest`: reusable Nest module/service/controllers/entity for API projects.

## Package Layout

- `src/api/contracts.ts`: canonical request/response and status/provider types.
- `src/api/stripe.ts`: Stripe-to-domain status mapping.
- `src/app/client.ts`: client methods for user/admin subscription API calls.
- `src/nest/*`: Nest module + service + controllers + entity for subscription operations.

## API Integration (Nest)

In your API project:

1. Import the shared Nest surface:

```ts
import { SubscriptionModule } from "@scryan7371/sdr-subscription/nest";
```

2. Register it in your API module:

```ts
SubscriptionModule.forRoot({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
});
```

3. Apply your app-specific guards/auth policies in your API app where needed.

## App Integration (React Native / Web)

In your app project:

1. Build client once:

```ts
import { app as sdrSubscription } from "@scryan7371/sdr-subscription";

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

## Release Process

Use the built-in release scripts (recommended):

```bash
npm run release:patch
npm run release:minor
npm run release:major
```

Each release script:

1. Validates git working tree is clean.
2. Runs tests.
3. Builds the package.
4. Bumps `package.json`/`package-lock.json`.
5. Commits as `chore(release): vX.Y.Z`.
6. Creates tag `sdr-subscription-vX.Y.Z`.
7. Pushes commit and tag.

Tag pushes (`sdr-subscription-v*`) trigger publish workflow in GitHub Actions.

## CI Publish (GitHub Actions)

Tag pushes like `sdr-subscription-v*` trigger `.github/workflows/publish.yml`.

Required repo secret:

- `NPM_TOKEN` (npm granular token with read/write + bypass 2FA for automation).

## Install

Install a pinned version:

```bash
npm install @scryan7371/sdr-subscription@0.1.0
```
