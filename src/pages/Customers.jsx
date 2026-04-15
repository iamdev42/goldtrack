import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTenant } from '../hooks/useTenant'

const EMPTY_FORM = { name: '', phone: '', email: '', address: '', notes: '' }

export default function Customers() {
  const { tenantId, loading: tenantLoading } = useTenant()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null) // customer object or null
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (tenantId) fetchCustomers()
    else if (!tenantLoading) setLoading(false)
  }, [tenantId, tenantLoading])

  async function fetchCustomers() {
    setLoading(true)
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name')
    setCustomers(data || [])
    setLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(customer) {
    setEditing(customer)
    setForm({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || '',
    })
    setError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)

    if (editing) {
      const { error } = await supabase
        .from('customers')
        .update({ ...form })
        .eq('id', editing.id)
      if (error) { setError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase
        .from('customers')
        .insert({ ...form, tenant_id: tenantId })
      if (error) { setError(error.message); setSaving(false); return }
    }

    setSaving(false)
    closeModal()
    fetchCustomers()
  }

  async function handleDelete() {
    if (!editing) return
    if (!confirm(`Delete ${editing.name}? This cannot be undone.`)) return
    await supabase.from('customers').delete().eq('id', editing.id)
    closeModal()
    fetchCustomers()
  }

  if (tenantLoading || loading) {
    return <div className="p-6 text-gray-400">Loading…</div>
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-amber-800">Customers</h2>
        <button
          onClick={openAdd}
          className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-2.5 rounded-xl text-base transition-colors"
        >
          + Add
        </button>
      </div>

      {/* Empty state */}
      {customers.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No customers yet.</p>
          <p className="text-sm mt-1">Tap + Add to create your first one.</p>
        </div>
      )}

      {/* Customer list */}
      <ul className="space-y-2">
        {customers.map(c => (
          <li
            key={c.id}
            onClick={() => openEdit(c)}
            className="bg-white rounded-2xl shadow-sm px-5 py-4 flex items-center justify-between cursor-pointer active:bg-amber-50 hover:bg-amber-50 transition-colors"
          >
            <div>
              <p className="text-lg font-semibold text-gray-800">{c.name}</p>
              {c.phone && <p className="text-sm text-gray-500">{c.phone}</p>}
              {c.email && <p className="text-sm text-gray-400">{c.email}</p>}
            </div>
            <span className="text-gray-300 text-xl">›</span>
          </li>
        ))}
      </ul>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
              <h3 className="text-xl font-bold text-amber-800">
                {editing ? 'Edit Customer' : 'New Customer'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="px-6 py-4 space-y-3">
              <input
                type="text"
                placeholder="Full name *"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <input
                type="text"
                placeholder="Address"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <textarea
                placeholder="Notes"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />

              {error && <p className="text-red-500 text-sm">{error}</p>}

              {/* Actions */}
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
    </div>
  )
}
