/**
 * Pure transform functions extracted from import-customers.mjs.
 * Kept dependency-free so they can be unit tested without hitting the network.
 */

const COUNTRY_MAP = {
  CH: 'Switzerland',
  DE: 'Germany',
  AT: 'Austria',
  FR: 'France',
  IT: 'Italy',
  LI: 'Liechtenstein',
}

export function clean(value) {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  return str === '' ? null : str
}

export function formatPostcode(plz, country) {
  if (plz === null || plz === undefined || plz === '') return null
  const num = String(plz).split('.')[0].trim()
  if (!num) return null
  if (country === 'CH' && /^\d{1,4}$/.test(num)) return num.padStart(4, '0')
  return num
}

export function combinePhones(...vals) {
  const parts = vals.map(clean).filter(Boolean)
  if (!parts.length) return null
  return [...new Set(parts)].join(', ')
}

export function cleanEmail(value) {
  const str = clean(value)
  if (!str) return null
  const trimmed = str.replace(/\s+/g, '')
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed) ? trimmed : null
}

export function buildDisplayName(firstName, lastName, company) {
  const parts = [firstName, lastName].filter(Boolean).join(' ').trim()
  if (parts) return parts
  if (company) return company
  return 'Unknown'
}

export function transformRow(row, tenantId) {
  const flags = []

  let firstName = clean(row['Vorname'])
  let lastName = clean(row['Name'])
  let company = null

  if (!firstName && lastName && /\b(Atelier|AG|GmbH|&|Co\.?|SA|Sàrl)\b/i.test(lastName)) {
    company = lastName
    lastName = null
  }

  if (!firstName && !lastName && !company) {
    flags.push('no name')
    company = 'Unknown'
  }

  const street = clean(row['Strasse'])
  let country = clean(row['Land'])
  const postcode = formatPostcode(row['PLZ'], country)
  const city = clean(row['Ort'])

  // Data fix: a 5-digit postcode cannot be Swiss. The legacy file has at least
  // one row labelled CH that's actually a German address (Waldshut-Tiengen).
  // Auto-correct the country code and flag for review.
  if (country === 'CH' && postcode && postcode.length === 5) {
    country = 'DE'
    flags.push('country auto-corrected CH→DE from 5-digit postcode')
  }

  const fullCountry = country ? COUNTRY_MAP[country] || country : null

  if (!street) flags.push('missing street')
  if (!postcode) flags.push('missing postcode')
  if (!city) flags.push('missing city')
  if (!country) flags.push('missing country')

  const phone = combinePhones(row['Tel. G.'], row['Tel. P.'])
  const email = cleanEmail(row['E-Mail'])
  if (clean(row['E-Mail']) && !email) flags.push('invalid email format')

  const lines = []
  if (clean(row['Zusatz'])) lines.push(`Zusatz: ${clean(row['Zusatz'])}`)
  if (clean(row['Tel. 4'])) lines.push(`Tel. 4: ${clean(row['Tel. 4'])}`)
  if (clean(row['Tel. 5'])) lines.push(`Tel. 5: ${clean(row['Tel. 5'])}`)
  if (clean(row['Fax'])) lines.push(`Fax: ${clean(row['Fax'])}`)
  if (clean(row['Kundenstatus'])) lines.push(`Status: ${clean(row['Kundenstatus'])}`)
  if (clean(row['Kundentyp'])) lines.push(`Typ: ${clean(row['Kundentyp'])}`)
  if (flags.length) lines.push(`\n⚠ Migration flags: ${flags.join('; ')}`)
  const notes = lines.length ? lines.join('\n') : null

  return {
    tenant_id: tenantId,
    legacy_id: Number(row['Nummer']),
    first_name: firstName,
    last_name: lastName,
    company,
    name: buildDisplayName(firstName, lastName, company),
    phone,
    email,
    street,
    postcode,
    city,
    country: fullCountry,
    address: [street, postcode, city, fullCountry].filter(Boolean).join(', ') || null,
    notes,
    _flags: flags,
  }
}
