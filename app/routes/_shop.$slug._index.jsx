import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Search } from 'lucide-react'
import { useCatalogueItems, useCatalogueTenant } from '~/lib/queries/catalogue'
import { Input } from '~/components/ui/input'
import { ITEM_CATEGORIES } from '~/lib/validations/item'
import { formatCurrency } from '~/lib/utils'

const CATEGORY_LABELS = {
  ring: 'Ring',
  necklace: 'Necklace',
  bracelet: 'Bracelet',
  earrings: 'Earrings',
  other: 'Other',
}

export function meta({ data }) {
  const tenant = data?.tenant
  if (!tenant) return [{ title: 'Catalogue — GoldTrack' }]
  const name = tenant.public_display_name || tenant.name
  return [{ title: `${name} — Catalogue` }]
}

export default function ShopCatalogue() {
  const { slug } = useParams()
  const { data: tenant, isLoading: tenantLoading } = useCatalogueTenant(slug)
  const { data: items = [], isLoading: itemsLoading } = useCatalogueItems(tenant?.id)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  // The price slider's upper bound is the most expensive item, rounded up to
  // the nearest 100 for a friendlier slider scale. Recomputed when the items
  // load. If everything is unpriced, the filter hides itself.
  const priceCeiling = useMemo(() => {
    const prices = items.map((i) => Number(i.price)).filter((n) => Number.isFinite(n) && n > 0)
    if (prices.length === 0) return 0
    return Math.ceil(Math.max(...prices) / 100) * 100
  }, [items])

  // Filter pipeline: search → category → price.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const max = Number(maxPrice)
    return items.filter((it) => {
      if (q) {
        const hay = [it.name, it.description, it.category].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (category && it.category !== category) return false
      if (Number.isFinite(max) && max > 0) {
        const p = Number(it.price)
        if (!Number.isFinite(p) || p > max) return false
      }
      return true
    })
  }, [items, search, category, maxPrice])

  if (tenantLoading) {
    return <div className="mx-auto max-w-5xl p-6 text-gray-400">Loading…</div>
  }

  if (!tenant) {
    return (
      <div className="mx-auto max-w-2xl space-y-2 p-6 text-center">
        <h1 className="text-2xl font-bold text-brand-900">Shop not found</h1>
        <p className="text-sm text-gray-500">
          The link you followed doesn&rsquo;t match any shop on GoldTrack.
        </p>
      </div>
    )
  }

  const displayName = tenant.public_display_name || tenant.name

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <header className="space-y-2 pt-2 sm:pt-6">
        <h1 className="text-3xl font-bold text-brand-900 sm:text-4xl">{displayName}</h1>
        {tenant.public_bio && (
          <p className="max-w-2xl whitespace-pre-wrap text-sm text-gray-600 sm:text-base">
            {tenant.public_bio}
          </p>
        )}
      </header>

      {/* Filter bar — only renders if there are items to filter */}
      {items.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-brand-100 bg-white/80 p-4 backdrop-blur-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name or keywords…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              <option value="">All categories</option>
              {ITEM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          {/* Price ceiling slider — only when at least one priced item */}
          {priceCeiling > 0 && (
            <div className="flex items-center gap-3 px-1 text-sm">
              <span className="text-gray-500">Price up to</span>
              <input
                type="range"
                min="0"
                max={priceCeiling}
                step="50"
                value={maxPrice || priceCeiling}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="flex-1 accent-brand-600"
              />
              <span className="w-28 text-right font-medium tabular-nums text-brand-800">
                {maxPrice && Number(maxPrice) > 0 ? formatCurrency(Number(maxPrice)) : 'No limit'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      {itemsLoading ? (
        <p className="text-sm text-gray-400">Loading items…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white/60 p-10 text-center text-sm text-gray-500">
          No items in the catalogue yet.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white/60 p-10 text-center text-sm text-gray-500">
          No items match your filters.
        </div>
      ) : (
        <CatalogueGrid items={filtered} slug={slug} />
      )}

      <footer className="pb-8 pt-6 text-center text-xs text-gray-400">Powered by GoldTrack</footer>
    </div>
  )
}

/**
 * Masonry layout via CSS columns. Photos drive the row heights — no JS
 * measurement required, performant on mobile.
 *
 * Trade-off: column-fill order is top-to-bottom-then-next-column, not
 * left-to-right reading order. For a Pinterest-style catalogue this is
 * fine (the visual is what matters, not ordering).
 */
function CatalogueGrid({ items, slug }) {
  return (
    <div className="columns-2 gap-3 [column-fill:_balance] sm:columns-3 sm:gap-4">
      {items.map((item) => (
        <CatalogueCard key={item.id} item={item} slug={slug} />
      ))}
    </div>
  )
}

function CatalogueCard({ item, slug }) {
  const photo = item.photos?.[0]
  return (
    <Link
      to={`/shop/${slug}/items/${item.id}`}
      className="mb-3 block break-inside-avoid overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:mb-4"
    >
      {photo ? (
        <img
          src={photo}
          alt={item.name}
          loading="lazy"
          className="block w-full"
          // Don't crop or letterbox — keep natural aspect ratios for masonry.
        />
      ) : (
        <div className="flex aspect-square items-center justify-center bg-brand-50 text-3xl text-brand-200">
          ✦
        </div>
      )}
      <div className="space-y-1 p-3">
        <p className="line-clamp-2 text-sm font-semibold text-gray-900">{item.name}</p>
        {Number.isFinite(Number(item.price)) && Number(item.price) > 0 && (
          <p className="text-sm font-medium text-brand-800">{formatCurrency(Number(item.price))}</p>
        )}
      </div>
    </Link>
  )
}
