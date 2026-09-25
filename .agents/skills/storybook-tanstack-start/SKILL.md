---
name: storybook-tanstack-start
description: >
  Storybook addon for TanStack Start apps. Provides a Vite plugin that stubs
  server-side imports (createServerFn, server entries, cookies, routeTree.gen),
  strips TanStack/Nitro Vite plugins, and includes router context (params,
  search, loader data). Use when setting up Storybook in a TanStack Start
  project, when stories fail because of server-side imports, or when
  configuring .storybook/main.ts for a TanStack Start app.
---

# storybook-addon-tanstack-start

Vite plugin + mock stubs + router context that make Storybook work with TanStack Start.

## The Problem

TanStack Start has server-side code (`createServerFn`, SSR entry points, Nitro/Worker
entries) that crashes when Storybook tries to bundle it in the browser. This addon
intercepts those imports and replaces them with safe stubs.

## Install

```bash
pnpm add -D storybook-addon-tanstack-start
```

One package — includes `storybook-addon-tanstack-router` as a dependency.

## Setup

### 1. Add the Vite plugin to `.storybook/main.ts`

```typescript
import { tanstackStartPlugin } from 'storybook-addon-tanstack-start/plugin'
import { mergeConfig } from 'vite'

const config = {
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: [tanstackStartPlugin()],
    })
  },
}
```

### 2. Add the router decorator to `.storybook/preview.ts`

```typescript
export { decorators } from 'storybook-addon-tanstack-start/preview'
```

### 3. Configure route params and loader data per story

```typescript
import { tanstackRouterParameters } from 'storybook-addon-tanstack-start'

export const MyStory: Story = {
  parameters: {
    tanstackRouter: tanstackRouterParameters({
      location: {
        path: '/users/$userId',
        params: { userId: '42' },
        search: { tab: 'settings' },
      },
      loader: { data: { user: { name: 'Alice' } } },
    }),
  },
}
```

## What the Plugin Does

1. **Strips TanStack/Nitro Vite plugins** — prevents them from injecting server
   entries that break with stubbed imports (opt out with `stripTanStackPlugins: false`)
2. **Intercepts server imports** via `resolveId`:
   - `@tanstack/react-start` and all sub-paths
   - `@tanstack/start-server-core`
   - Server/worker entries (`server-entry`, `worker-entry`, `virtual:cloudflare`)
   - `routeTree.gen` (from user code, not node_modules)
   - Any modules in `additionalServerModules` option
3. **Provides mock exports**: `createServerFn` (chainable builder), `createStart`,
   cookie helpers, router stubs, component stubs

## Plugin Options

```typescript
tanstackStartPlugin({
  // Stub additional server modules (e.g. your auth/billing server code)
  additionalServerModules: ['~/lib/auth/server', '~/lib/billing/server'],

  // Keep TanStack Vite plugins in the pipeline (default: true strips them)
  stripTanStackPlugins: false,
})
```

## Double RouterProvider Warning

If you already wrap stories in a custom `withRouter()` decorator, don't also use
the global decorator from the preview export — you'll get nested providers. Either
remove your custom decorator or skip the global one.

## App-Specific Server Mocks

For your app's own server modules (auth, billing, etc.), use `additionalServerModules`
to redirect them to stubs, then create mock files:

```typescript
// .storybook/mocks/auth-server.ts
export async function loginWithPassword({ data }) {
  if (data.email === 'test@example.com' && data.password === 'password123')
    return { ok: true, role: 'parent' }
  return { ok: false, error: 'Invalid credentials' }
}
```

```typescript
// in tanstackStartPlugin config:
additionalServerModules: ['~/lib/auth/server']

// in .storybook/main.ts resolve.alias:
'~/lib/auth/server': path.resolve(__dirname, 'mocks/auth-server.ts')
```
