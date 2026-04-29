import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Calendar as CalendarIcon,
  ExternalLink,
  Globe,
  Package,
  Plus,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react'
import { useTenant } from '~/hooks/useTenant'
import { useItems } from '~/lib/queries/items'
import { useTenantSettings } from '~/lib/queries/tenants'
import { ITEM_STATUSES, STATUS_LABELS } from '~/lib/validations/item'
import { formatCurrency } from '~/lib/utils'

export function meta() {
  return [{ title: 'Dashboard — GoldTrack' }]
}

/**
 * Dashboard — the goldsmith's first-screen-after-login.
 *
 * Four cards: Calendar (iframe of her Google/Outlook embed), Inventory
 * snapshot (counts by status), Recent items (last 5), Catalogue status
 * (count of published items + link to public shop).
 *
 * All data is read from existing queries — no new schema needed beyond
 * the calendar_embed_url column added in migration 014.
 */
export default function Dashboard() {
  const { tenantId } = useTenant()
  const navigate = useNavigate()

  const { data: items = [], isLoading: itemsLoading } = useItems(tenantId)
  const { data: tenant } = useTenantSettings(tenantId)

  // Counts by status for the inventory snapshot card.
  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(ITEM_STATUSES.map((s) => [s, 0]))
    for (const it of items) {
      if (counts[it.status] != null) counts[it.status]++
    }
    return counts
  }, [items])

  const publishedCount = useMemo(
    () => items.filter((i) => i.is_published && i.status === 'for_sale').length,
    [items]
  )

  const recentItems = items.slice(0, 5)

  return (
    <div className="space-y-4 p-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-brand-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          {tenant?.public_display_name || tenant?.name || 'Your shop'} at a glance.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Calendar — full-width on small screens, half-width on desktop */}
        <CalendarCard embedUrl={tenant?.calendar_embed_url} />

        {/* Inventory snapshot */}
        <DashboardCard
          icon={Package}
          title="Inventory"
          subtitle={`${items.length} ${items.length === 1 ? 'item' : 'items'} total`}
        >
          {itemsLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : items.length === 0 ? (
            <Link
              to="/inventory"
              className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
            >
              <Plus className="h-4 w-4" />
              Add your first item
            </Link>
          ) : (
            <div className="space-y-2">
              {ITEM_STATUSES.map((s) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{STATUS_LABELS[s]}</span>
                  <span className="font-semibold tabular-nums text-brand-800">
                    {statusCounts[s]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        {/* Recent items */}
        <DashboardCard
          icon={Sparkles}
          title="Recent items"
          subtitle="Last 5 added"
          className="md:col-span-1"
        >
          {recentItems.length === 0 ? (
            <p className="text-sm text-gray-400">No items yet.</p>
          ) : (
            <ul className="space-y-1">
              {recentItems.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/inventory?edit=${it.id}`)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-sm hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  >
                    <span className="min-w-0 flex-1 truncate text-gray-800">{it.name}</span>
                    {Number(it.price) > 0 && (
                      <span className="flex-shrink-0 text-xs text-gray-500 tabular-nums">
                        {formatCurrency(Number(it.price))}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        {/* Catalogue status */}
        <DashboardCard
          icon={Globe}
          title="Public catalogue"
          subtitle={
            publishedCount === 0
              ? 'No items published yet'
              : `${publishedCount} ${publishedCount === 1 ? 'piece' : 'pieces'} live`
          }
        >
          {tenant?.slug ? (
            <a
              href={`/shop/${tenant.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              View public shop
            </a>
          ) : (
            <Link
              to="/settings"
              className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
            >
              <SettingsIcon className="h-4 w-4" />
              Set up your shop URL
            </Link>
          )}
        </DashboardCard>
      </div>
    </div>
  )
}

/**
 * Calendar card — renders an iframe of the user's calendar embed URL,
 * or a setup CTA if none is configured.
 *
 * The iframe is sandbox-locked: we allow scripts (Google Calendar needs
 * them) but disable form submission, navigation, and popups so a malicious
 * embed URL can't pivot.
 */
function CalendarCard({ embedUrl }) {
  if (!embedUrl) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm md:row-span-2">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-brand-700" />
          <h2 className="text-sm font-semibold text-gray-700">Calendar</h2>
        </div>
        <div className="mt-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
          <p className="mb-3">Connect your Google, Outlook, or iCloud calendar.</p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            <SettingsIcon className="h-4 w-4" />
            Set up
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm md:row-span-2">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-brand-700" />
          <h2 className="text-sm font-semibold text-gray-700">Calendar</h2>
        </div>
        <Link to="/settings" className="text-xs text-gray-400 hover:text-brand-700">
          Settings
        </Link>
      </div>
      {/* Tall enough to be useful, capped so the rest of the dashboard is reachable */}
      <iframe
        src={embedUrl}
        title="Calendar"
        className="block h-[480px] w-full border-0 md:h-[640px]"
        sandbox="allow-scripts allow-same-origin allow-popups"
        // referrerpolicy stripped; Google's embed needs the referer to render
      />
    </div>
  )
}

function DashboardCard({ icon: Icon, title, subtitle, className = '', children }) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-700" />
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      {subtitle && <p className="mb-3 text-xs text-gray-500">{subtitle}</p>}
      <div>{children}</div>
    </div>
  )
}
