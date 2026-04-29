import { Outlet } from 'react-router'

/**
 * Public shop layout for the catalogue.
 *
 * Unlike `_app.jsx` (auth required) or `_auth.jsx` (auth-prohibited), this
 * layout is open to anyone — anonymous visitors AND signed-in users see
 * the same thing. No clientLoader, no auth check.
 *
 * Kept deliberately minimal: just a neutral cream background. Each page
 * renders its own header so the shop name + bio can vary per tenant.
 */
export default function ShopLayout() {
  return (
    <div className="min-h-screen bg-brand-50/40">
      <Outlet />
    </div>
  )
}
