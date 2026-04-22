import { index, layout, prefix, route } from '@react-router/dev/routes'

/**
 * Route configuration — the single source of truth for the URL structure.
 *
 * Pattern:
 *  - `layout(file, [children])` — wraps children in a layout component
 *  - `index(file)` — matches the parent URL exactly
 *  - `route(path, file)` — matches a subpath
 *  - `prefix(path, [children])` — prefixes all children with path
 *
 * Adding a new screen:
 *  1. Create `app/routes/whatever.jsx`
 *  2. Add `route('whatever', 'routes/whatever.jsx')` under the right layout
 */
export default [
  // Root-level entry — redirects to /customers or /login
  index('routes/_index.jsx'),

  // Public auth layout (login, forgot password, etc.)
  layout('routes/_auth.jsx', [route('login', 'routes/_auth.login.jsx')]),

  // Protected app layout (everything behind auth)
  layout('routes/_app.jsx', [
    ...prefix('customers', [index('routes/_app.customers._index.jsx')]),
    ...prefix('inventory', [index('routes/_app.inventory._index.jsx')]),
  ]),
]
