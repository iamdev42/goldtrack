import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, ChevronLeft, ChevronRight, Share2 } from 'lucide-react'
import { useCatalogueTenant, useCatalogueItem } from '~/lib/queries/catalogue'
import { formatCurrency } from '~/lib/utils'

const CATEGORY_LABELS = {
  ring: 'Ring',
  necklace: 'Necklace',
  bracelet: 'Bracelet',
  earrings: 'Earrings',
  other: 'Other',
}

/**
 * SEO meta + Open Graph for the item detail page.
 *
 * React Router v7 calls `meta` at build/render time with the loader data,
 * but we don't have a loader here (we fetch client-side). To still produce
 * good Open Graph previews, we read from the matches argument when
 * available, falling back to generic copy when the data isn't ready yet
 * (e.g. on the very first render before the query resolves).
 *
 * For full SEO this would ideally be SSR'd; with our SPA setup, the meta
 * tags update once data loads but social-media crawlers (which don't run
 * JS) will only see the fallback. That's fine for v1 — the URL still
 * works, and a future migration to SSR would pick this up automatically.
 */
export function meta({ data }) {
  const tenant = data?.tenant
  const item = data?.item

  if (!item || !tenant) {
    return [{ title: 'Catalogue — GoldTrack' }]
  }

  const tenantName = tenant.public_display_name || tenant.name
  const photo = item.photos?.[0]
  const description = item.description?.slice(0, 200) || `Available at ${tenantName}.`

  return [
    { title: `${item.name} — ${tenantName}` },
    { name: 'description', content: description },
    // Open Graph (Facebook, WhatsApp, LinkedIn)
    { property: 'og:type', content: 'product' },
    { property: 'og:title', content: `${item.name} — ${tenantName}` },
    { property: 'og:description', content: description },
    ...(photo ? [{ property: 'og:image', content: photo }] : []),
    // Twitter / X
    { name: 'twitter:card', content: photo ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: `${item.name} — ${tenantName}` },
    { name: 'twitter:description', content: description },
    ...(photo ? [{ name: 'twitter:image', content: photo }] : []),
  ]
}

export default function ShopItemDetail() {
  const { slug, itemId } = useParams()
  const { data: tenant, isLoading: tenantLoading } = useCatalogueTenant(slug)
  const { data: item, isLoading: itemLoading } = useCatalogueItem(tenant?.id, itemId)

  const [activePhoto, setActivePhoto] = useState(0)
  const [shareCopied, setShareCopied] = useState(false)

  if (tenantLoading || itemLoading) {
    return <div className="mx-auto max-w-4xl p-6 text-gray-400">Loading…</div>
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

  if (!item) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-6 text-center">
        <h1 className="text-2xl font-bold text-brand-900">Item not available</h1>
        <p className="text-sm text-gray-500">
          This piece is no longer in the catalogue. It may have been sold or removed.
        </p>
        <Link
          to={`/shop/${slug}`}
          className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to catalogue
        </Link>
      </div>
    )
  }

  const photos = item.photos || []
  const hasPhotos = photos.length > 0
  const tenantName = tenant.public_display_name || tenant.name

  function nextPhoto() {
    setActivePhoto((p) => (p + 1) % photos.length)
  }
  function prevPhoto() {
    setActivePhoto((p) => (p - 1 + photos.length) % photos.length)
  }

  async function share() {
    const url = window.location.href
    // Use the Web Share API on supported devices (mobile mainly), fall back
    // to copying the link to clipboard on desktop browsers.
    if (navigator.share) {
      try {
        await navigator.share({ title: item.name, url })
      } catch {
        // User cancelled — ignore.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 1500)
    } catch {
      /* clipboard blocked — silent */
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      {/* Header: back + share */}
      <div className="flex items-center justify-between">
        <Link
          to={`/shop/${slug}`}
          className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {tenantName}
        </Link>
        <button
          type="button"
          onClick={share}
          className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-sm text-brand-700 shadow-sm hover:bg-brand-50"
        >
          <Share2 className="h-4 w-4" />
          {shareCopied ? 'Link copied' : 'Share'}
        </button>
      </div>

      {/* Photo carousel */}
      {hasPhotos ? (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="relative">
            <img
              src={photos[activePhoto]}
              alt={item.name}
              className="block w-full"
              loading="eager"
            />
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevPhoto}
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2 shadow hover:bg-white"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-700" />
                </button>
                <button
                  type="button"
                  onClick={nextPhoto}
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2 shadow hover:bg-white"
                >
                  <ChevronRight className="h-5 w-5 text-gray-700" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail strip when more than 1 photo */}
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {photos.map((p, i) => (
                <button
                  key={p + i}
                  type="button"
                  onClick={() => setActivePhoto(i)}
                  aria-label={`View photo ${i + 1}`}
                  className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                    i === activePhoto ? 'ring-brand-600' : 'ring-transparent hover:ring-brand-200'
                  }`}
                >
                  <img src={p} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-brand-50 text-5xl text-brand-200">
          ✦
        </div>
      )}

      {/* Body */}
      <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-brand-900 sm:text-3xl">{item.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
            {item.category && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                {CATEGORY_LABELS[item.category] || item.category}
              </span>
            )}
            {Number(item.weight_g) > 0 && <span>{Number(item.weight_g)} g</span>}
          </div>
        </div>

        {Number.isFinite(Number(item.price)) && Number(item.price) > 0 && (
          <p className="text-2xl font-semibold text-brand-800">
            {formatCurrency(Number(item.price))}
          </p>
        )}

        {item.description && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {item.description}
          </p>
        )}
      </div>

      <footer className="pb-8 pt-6 text-center text-xs text-gray-400">Powered by GoldTrack</footer>
    </div>
  )
}
