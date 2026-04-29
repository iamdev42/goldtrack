import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, ExternalLink, Globe, Save } from 'lucide-react'
import { useTenant } from '~/hooks/useTenant'
import { useTenantSettings, useUpdateTenantSettings } from '~/lib/queries/tenants'
import { tenantSettingsSchema } from '~/lib/validations/tenant'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'

export function meta() {
  return [{ title: 'Settings — GoldTrack' }]
}

/**
 * Tenant settings page. Today only manages the public catalogue identity:
 *   - slug (URL: /shop/{slug})
 *   - public display name (overrides internal tenant name)
 *   - public bio (paragraph for the catalogue header)
 *
 * Future home for billing, integrations, etc.
 */
export default function Settings() {
  const { tenantId } = useTenant()
  const { data: tenant, isLoading } = useTenantSettings(tenantId)
  const update = useUpdateTenantSettings(tenantId)

  const [savedFeedback, setSavedFeedback] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(tenantSettingsSchema),
    defaultValues: {
      slug: '',
      public_display_name: '',
      public_bio: '',
      calendar_embed_url: '',
    },
    mode: 'onBlur',
  })

  // Hydrate the form once data loads.
  useEffect(() => {
    if (tenant) {
      reset({
        slug: tenant.slug || '',
        public_display_name: tenant.public_display_name || '',
        public_bio: tenant.public_bio || '',
        calendar_embed_url: tenant.calendar_embed_url || '',
      })
    }
  }, [tenant, reset])

  const slug = watch('slug')
  const publicUrl = slug ? `${window.location.origin}/shop/${slug}` : null

  async function onSubmit(values) {
    setError(null)
    setSavedFeedback(false)
    try {
      await update.mutateAsync(values)
      setSavedFeedback(true)
      // Auto-hide the "saved" pill after a beat.
      setTimeout(() => setSavedFeedback(false), 2000)
    } catch (err) {
      setError(err.message || 'Could not save settings.')
    }
  }

  function copyLink() {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  if (isLoading) {
    return <div className="mx-auto max-w-2xl p-4 text-gray-400">Loading…</div>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-brand-900">Settings</h1>
        <p className="text-sm text-gray-500">
          Configure your public catalogue. Items marked &ldquo;Show in catalogue&rdquo; in your
          inventory will appear at the link below.
        </p>
      </header>

      {/* Public link card — visible at a glance */}
      {publicUrl && (
        <div className="space-y-2 rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-brand-800">
            <Globe className="h-4 w-4" />
            Your public catalogue
          </div>
          <div className="flex items-stretch gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 text-sm text-gray-700">
              {publicUrl}
            </code>
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center gap-1 rounded-lg bg-white px-3 text-sm text-brand-700 hover:bg-brand-100"
              aria-label="Copy link"
            >
              <Copy className="h-4 w-4" />
              {copied ? 'Copied' : 'Copy'}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-lg bg-white px-3 text-sm text-brand-700 hover:bg-brand-100"
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          </div>
        </div>
      )}

      {/* Settings form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl bg-white p-4">
        <div className="space-y-1.5">
          <Label htmlFor="slug">Shop URL</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">/shop/</span>
            <Input
              id="slug"
              autoComplete="off"
              spellCheck={false}
              placeholder="diekrone"
              invalid={!!errors.slug}
              {...register('slug')}
            />
          </div>
          {errors.slug ? (
            <p role="alert" className="text-sm text-red-600">
              {errors.slug.message}
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              Lowercase letters, numbers and hyphens only. This is the link you share with
              customers.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="public_display_name">Display name (optional)</Label>
          <Input
            id="public_display_name"
            placeholder={tenant?.name || 'Your shop name'}
            invalid={!!errors.public_display_name}
            {...register('public_display_name')}
          />
          {errors.public_display_name ? (
            <p role="alert" className="text-sm text-red-600">
              {errors.public_display_name.message}
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              Defaults to your shop name. Override if you want a different headline.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="public_bio">Bio (optional)</Label>
          <Textarea
            id="public_bio"
            rows={4}
            placeholder="A few words about your work…"
            {...register('public_bio')}
          />
          {errors.public_bio && (
            <p role="alert" className="text-sm text-red-600">
              {errors.public_bio.message}
            </p>
          )}
        </div>

        {/* Calendar embed URL — for the Dashboard's Calendar card */}
        <div className="space-y-1.5 border-t border-gray-100 pt-4">
          <Label htmlFor="calendar_embed_url">Calendar embed URL (optional)</Label>
          <Input
            id="calendar_embed_url"
            type="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://calendar.google.com/calendar/embed?src=…"
            invalid={!!errors.calendar_embed_url}
            {...register('calendar_embed_url')}
          />
          {errors.calendar_embed_url ? (
            <p role="alert" className="text-sm text-red-600">
              {errors.calendar_embed_url.message}
            </p>
          ) : (
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer text-brand-700 hover:underline">
                How do I get this URL?
              </summary>
              <div className="mt-2 space-y-1 pl-1 leading-relaxed">
                <p>
                  <strong>Google Calendar:</strong> open calendar.google.com, hover the calendar in
                  &ldquo;My calendars&rdquo;, click the three dots → <em>Settings and sharing</em>.
                  Scroll to <em>Integrate calendar</em> and copy the{' '}
                  <em>Public URL to this calendar</em> or the <em>Embed code</em> (just the URL part
                  starting with <code>https://calendar.google.com/calendar/embed</code>).
                </p>
                <p>
                  <strong>Outlook:</strong> Outlook web → Calendar → Share → Publish a calendar →
                  copy the HTML link.
                </p>
                <p>
                  <strong>Apple iCloud:</strong> share a public iCloud calendar and copy its
                  webcal/https URL.
                </p>
              </div>
            </details>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" disabled={!isDirty || update.isPending}>
            <Save className="h-4 w-4" />
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          {savedFeedback && <span className="text-sm font-medium text-green-700">✓ Saved</span>}
        </div>
      </form>

      <p className="px-1 pt-1 text-xs text-gray-400">
        Manage which items appear in the catalogue from{' '}
        <Link to="/inventory" className="underline">
          Inventory
        </Link>{' '}
        — tick &ldquo;Show in public catalogue&rdquo; on each item you want to publish.
      </p>
    </div>
  )
}
