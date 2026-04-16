import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTenant } from '../hooks/useTenant'

const CATEGORIES = ['ring', 'necklace', 'bracelet', 'earrings', 'other']
const STATUSES = ['for_sale', 'sold', 'reserved']
const MATERIALS = ['Yellow Gold', 'White Gold', 'Rose Gold', 'Platinum', 'Silver', 'Palladium', 'Titanium', 'Stainless Steel']

const STATUS_LABELS = {
  for_sale: 'For Sale',
  sold: 'Sold',
  reserved: 'Reserved',
}

const STATUS_COLORS = {
  for_sale: 'bg-green-100 text-green-700',
  sold: 'bg-gray-100 text-gray-500',
  reserved: 'bg-amber-100 text-amber-700',
}

const FILTERS = [
  { key: null, label: 'All' },
  { key: 'for_sale', label: 'For Sale' },
  { key: 'sold', label: 'Sold' },
  { key: 'reserved', label: 'Reserved' },
]

const EMPTY_FORM = {
  name: '',
  description: '',
  category: '',
  material: '',
  weight_g: '',
  price: '',
  status: 'for_sale',
  customer_id: '',
}

function photoPathFromUrl(url) {
  try {
    const pathname = new URL(url).pathname
    const parts = pathname.split('/item-photos/')
    return parts.length > 1 ? parts[1] : null
  } catch {
    return null
  }
}

function formatPrice(value) {
  if (value == null || value === '') return null
  return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Inventory() {
  const { tenantId, loading: tenantLoading } = useTenant()
  const [items, setItems] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [pendingPhoto, setPendingPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (tenantId) {
      fetchItems()
      fetchCustomers()
    } else if (!tenantLoading) {
      setLoading(false)
    }
  }, [tenantId, tenantLoading])

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase
      .from('items')
      .select('*, customer:customers(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function fetchCustomers() {
    const { data } = await supabase
      .from('customers')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .order('name')
    setCustomers(data || [])
  }

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setPendingPhoto(null)
    setPhotoPreview(null)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({
      name: item.name || '',
      description: item.description || '',
      category: item.category || '',
      material: item.material || '',
      weight_g: item.weight_g != null ? String(item.weight_g) : '',
      price: item.price != null ? String(item.price) : '',
      status: item.status || 'for_sale',
      customer_id: item.customer_id || '',
    })
    setPendingPhoto(null)
    setPhotoPreview(null)
    setError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPendingPhoto(null)
    setPhotoPreview(null)
    setError(null)
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPendingPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  async function uploadPhoto(itemId, file) {
    const ext = file.name.split('.').pop().toLowerCase()
    const path = `${tenantId}/${itemId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('item-photos')
      .upload(path, file, { upsert: false })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage
      .from('item-photos')
      .getPublicUrl(path)
    return publicUrl
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      category: form.category || null,
      material: form.material || null,
      weight_g: form.weight_g ? parseFloat(form.weight_g) : null,
      price: form.price ? parseFloat(form.price) : null,
      status: form.status,
      customer_id: form.customer_id || null,
    }

    let itemId = editing?.id
    let currentPhotos = editing?.photos || []

    if (editing) {
      const { error } = await supabase
        .from('items')
        .update(payload)
        .eq('id', editing.id)
      if (error) { setError(error.message); setSaving(false); return }
    } else {
      const { data, error } = await supabase
        .from('items')
        .insert({ ...payload, tenant_id: tenantId })
        .select()
        .single()
      if (error) { setError(error.message); setSaving(false); return }
      itemId = data.id
      currentPhotos = []
    }

    if (pendingPhoto && itemId) {
      try {
        const url = await uploadPhoto(itemId, pendingPhoto)
        const newPhotos = [...currentPhotos, url]
        await supabase.from('items').update({ photos: newPhotos }).eq('id', itemId)
      } catch (err) {
        console.error('Photo upload failed:', err.message)
      }
    }

    setSaving(false)
    closeModal()
    fetchItems()
  }

  async function handleDelete() {
    if (!editing) return
    if (!confirm(`Delete "${editing.name}"? This cannot be undone.`)) return
    if (editing.photos?.length) {
      const paths = editing.photos.map(photoPathFromUrl).filter(Boolean)
      if (paths.length) {
        await supabase.storage.from('item-photos').remove(paths)
      }
    }
    await supabase.from('items').delete().eq('id', editing.id)
    closeModal()
    fetchItems()
  }

  const filteredItems = filter ? items.filter(i => i.status === filter) : items
  const totalValue = filteredItems.reduce((sum, i) => sum + (i.price || 0), 0)

  if (tenantLoading || loading) {
    return <div className="p-6 text-gray-400">Loading…</div>
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-amber-800">Inventory</h2>
        <button
          onClick={openAdd}
          disabled={!tenantId}
          className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-2.5 rounded-xl text-base transition-colors disabled:opacity-50"
        >
          + Add
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-3">
        {FILTERS.map(f => (
          <button
            key={String(f.key)}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-amber-600 text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-amber-300 hover:text-amber-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="bg-white rounded-2xl px-5 py-3 mb-4 flex items-center justify-between shadow-sm">
        <span className="text-sm text-gray-500">
          {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
        </span>
        <span className="text-sm font-semibold text-amber-800">
          Total: {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">{filter ? `No ${STATUS_LABELS[filter].toLowerCase()} items.` : 'No items yet.'}</p>
          {!filter && <p className="text-sm mt-1">Tap + Add to create your first item.</p>}
        </div>
      )}

      {/* Item list */}
      <ul className="space-y-2">
        {filteredItems.map(item => (
          <li
            key={item.id}
            onClick={() => openEdit(item)}
            className="bg-white rounded-2xl shadow-sm flex items-center gap-4 px-4 py-3 cursor-pointer active:bg-amber-50 hover:bg-amber-50 transition-colors"
          >
            {/* Thumbnail */}
            {item.photos?.[0] ? (
              <img
                src={item.photos[0]}
                alt={item.name}
                onClick={e => { e.stopPropagation(); setLightboxSrc(item.photos[0]) }}
                className="w-14 h-14 rounded-xl object-cover flex-shrink-0 cursor-zoom-in"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-gray-800 truncate">{item.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {item.category && (
                  <span className="text-xs text-gray-400 capitalize">{item.category}</span>
                )}
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status]}`}>
                  {STATUS_LABELS[item.status]}
                </span>
              </div>
              {item.customer?.name && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{item.customer.name}</p>
              )}
            </div>

            {/* Price */}
            <div className="flex-shrink-0 text-right">
              {item.price != null && (
                <p className="text-sm font-semibold text-gray-700">{formatPrice(item.price)}</p>
              )}
              <span className="text-gray-300 text-xl">›</span>
            </div>
          </li>
        ))}
      </ul>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-amber-800">
                {editing ? 'Edit Item' : 'New Item'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="px-6 py-4 space-y-3">
              {/* Photo upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-amber-200 rounded-xl p-3 flex items-center gap-4 hover:border-amber-400 transition-colors"
              >
                {(photoPreview || editing?.photos?.[0]) ? (
                  <img
                    src={photoPreview || editing.photos[0]}
                    alt="preview"
                    onClick={e => {
                      const src = photoPreview || editing?.photos?.[0]
                      if (src) { e.stopPropagation(); setLightboxSrc(src) }
                    }}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0 cursor-zoom-in"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-amber-700">
                    {photoPreview ? 'Change photo' : editing?.photos?.[0] ? 'Replace photo' : 'Add photo'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Tap to select an image</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <input
                type="text"
                placeholder="Item name *"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  <option value="" disabled>Category</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              {/* Material + weight row */}
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.material}
                  onChange={e => setForm(f => ({ ...f, material: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  <option value="" disabled>Material</option>
                  {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                  <option value="Other">Other</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Weight (g)"
                  value={form.weight_g}
                  onChange={e => setForm(f => ({ ...f, weight_g: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Price"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
              />

              <select
                value={form.customer_id}
                onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              >
                <option value="">No customer linked</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <textarea
                placeholder="Description / notes / stones"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex gap-3 pt-1 pb-2">
                {editing && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex-1 border border-red-200 text-red-500 hover:bg-red-50 font-semibold py-3 rounded-xl text-base transition-colors"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-xl text-base transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc(null)}
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 cursor-zoom-out"
        >
          <img
            src={lightboxSrc}
            alt="Full size"
            className="max-w-full max-h-full rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  )
}
