#!/usr/bin/env node
/**
 * GoldTrack — legacy customer import
 * ────────────────────────────────────
 *
 * Reads `legacy-customers.xlsx`, transforms each row into a
 * GoldTrack `customers` row, and bulk-inserts into Supabase.
 *
 * Runs in 3 modes (set via the MODE env var):
 *   - dry-run      → transform + write CSV reports, NO database writes (default)
 *   - delete-tests → DELETE the 6 test customers from production (one-off)
 *   - import       → actually insert rows into Supabase
 *
 * Required env vars (in .env.import next to this script):
 *   SUPABASE_URL              → https://xxx.supabase.co
 *   SUPABASE_SERVICE_KEY      → service_role key (bypasses RLS — keep secret)
 *   TENANT_ID                 → UUID of the Die Krone Goldschmiede tenant
 *
 * Usage:
 *   node scripts/import-customers.mjs                  # dry run, generates reports
 *   MODE=delete-tests node scripts/import-customers.mjs
 *   MODE=import       node scripts/import-customers.mjs
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import 'dotenv/config'

// ── Config ────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
const MODE = (process.env.MODE || 'dry-run').toLowerCase()
// The script lives in migration/, so xlsx + reports are siblings
const XLSX_PATH = join(__dirname, 'legacy-customers.xlsx')
const REPORT_DIR = join(__dirname, 'reports')

const TENANT_ID = process.env.TENANT_ID
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

// Test customers to delete in delete-tests mode (matched by exact name)
const TEST_CUSTOMER_NAMES = [
  'Dusan Skerget',
  'Dusan Skerget21',
  'Ily Illiev',
  'John Doe',
  'Lara Skerget',
  'Mozeg',
]

// Country code mapping — the legacy file uses ISO short codes
const COUNTRY_MAP = {
  CH: 'Switzerland',
  DE: 'Germany',
  AT: 'Austria',
  FR: 'France',
  IT: 'Italy',
  LI: 'Liechtenstein',
}

// ── Helpers ───────────────────────────────────────────────────

function clean(value) {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  return str === '' ? null : str
}

/** Format Swiss postcode: 8340.0 → "8340", "1008" → "1008", DE 79761 → "79761" */
function formatPostcode(plz, country) {
  if (plz === null || plz === undefined || plz === '') return null
  // Excel turns numeric postcodes into floats — strip the decimal
  const num = String(plz).split('.')[0].trim()
  if (!num) return null
  // Swiss postcodes are 4 digits — pad with leading zero if shorter
  if (country === 'CH' && /^\d{1,4}$/.test(num)) return num.padStart(4, '0')
  return num
}

/** Combine multiple phone columns into one comma-separated string. */
function combinePhones(...vals) {
  const parts = vals.map(clean).filter(Boolean)
  if (!parts.length) return null
  return [...new Set(parts)].join(', ')
}

/** Validate email; lenient — accepts whitespace inside, trims it. */
function cleanEmail(value) {
  const str = clean(value)
  if (!str) return null
  const trimmed = str.replace(/\s+/g, '')
  // Very basic shape check; mirror the Zod schema's permissiveness
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed) ? trimmed : null
}

/** Build the display `name` field from first/last/company. */
function buildDisplayName(firstName, lastName, company) {
  const parts = [firstName, lastName].filter(Boolean).join(' ').trim()
  if (parts) return parts
  if (company) return company
  return 'Unknown'
}

/** Build a `notes` block carrying anything we couldn't fit into structured fields. */
function buildNotes(row, flags) {
  const lines = []
  if (clean(row['Zusatz'])) lines.push(`Zusatz: ${clean(row['Zusatz'])}`)
  if (clean(row['Tel. 4'])) lines.push(`Tel. 4: ${clean(row['Tel. 4'])}`)
  if (clean(row['Tel. 5'])) lines.push(`Tel. 5: ${clean(row['Tel. 5'])}`)
  if (clean(row['Fax'])) lines.push(`Fax: ${clean(row['Fax'])}`)
  if (clean(row['Kundenstatus'])) lines.push(`Status: ${clean(row['Kundenstatus'])}`)
  if (clean(row['Kundentyp'])) lines.push(`Typ: ${clean(row['Kundentyp'])}`)
  if (flags.length) lines.push(`\n⚠ Migration flags: ${flags.join('; ')}`)
  return lines.length ? lines.join('\n') : null
}

// ── Transform ─────────────────────────────────────────────────

function transformRow(row) {
  const flags = []

  // Names — Vorname is first name, Name is last name. The legacy field "Name"
  // sometimes contains a company/atelier name with no person attached.
  let firstName = clean(row['Vorname'])
  let lastName = clean(row['Name'])
  let company = null

  // Heuristic: if there's no Vorname AND the Name contains words like
  // "Atelier", "AG", "GmbH", "&", treat it as a company name.
  if (!firstName && lastName && /\b(Atelier|AG|GmbH|&|Co\.?|SA|Sàrl)\b/i.test(lastName)) {
    company = lastName
    lastName = null
  }

  if (!firstName && !lastName && !company) {
    flags.push('no name')
    company = 'Unknown'
  }

  // Address fields
  const street = clean(row['Strasse'])
  let country = clean(row['Land'])
  const postcode = formatPostcode(row['PLZ'], country)
  const city = clean(row['Ort'])

  // Data fix: 5-digit postcodes can't be Swiss. Auto-correct CH→DE.
  if (country === 'CH' && postcode && postcode.length === 5) {
    country = 'DE'
    flags.push('country auto-corrected CH→DE from 5-digit postcode')
  }

  const fullCountry = country ? COUNTRY_MAP[country] || country : null

  if (!street) flags.push('missing street')
  if (!postcode) flags.push('missing postcode')
  if (!city) flags.push('missing city')
  if (!country) flags.push('missing country')

  // Phones — primary combines G + P, extras go to notes via buildNotes
  const phone = combinePhones(row['Tel. G.'], row['Tel. P.'])

  const email = cleanEmail(row['E-Mail'])
  if (clean(row['E-Mail']) && !email) flags.push('invalid email format')

  return {
    tenant_id: TENANT_ID,
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
    notes: buildNotes(row, flags),
    _flags: flags, // internal — stripped before insert
  }
}

// ── CSV writer (no dependency, simple quoting) ────────────────

function toCsv(rows, headers) {
  const escape = (val) => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }
  const head = headers.join(',')
  const body = rows.map((r) => headers.map((h) => escape(r[h])).join(',')).join('\n')
  return head + '\n' + body
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log(`\n[migrate] Mode: ${MODE}\n`)

  // Load and transform
  console.log('[migrate] Reading Excel file...')
  const buf = await readFile(XLSX_PATH)
  const wb = XLSX.read(buf, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: null })
  console.log(`[migrate] Loaded ${raw.length} rows from ${wb.SheetNames[0]}`)

  console.log('[migrate] Transforming rows...')
  const transformed = raw.map(transformRow)

  const flagged = transformed.filter((r) => r._flags.length > 0)
  const clean = transformed.filter((r) => r._flags.length === 0)
  console.log(
    `[migrate] ${clean.length} rows clean, ${flagged.length} rows have data quality flags`
  )

  // Always write reports for human review
  await mkdir(REPORT_DIR, { recursive: true })
  await writeFile(
    join(REPORT_DIR, 'all-rows-preview.csv'),
    toCsv(transformed, [
      'legacy_id',
      'name',
      'first_name',
      'last_name',
      'company',
      'street',
      'postcode',
      'city',
      'country',
      'phone',
      'email',
      '_flags',
    ])
  )
  await writeFile(
    join(REPORT_DIR, 'flagged-rows.csv'),
    toCsv(
      flagged.map((r) => ({ ...r, _flags: r._flags.join('; ') })),
      ['legacy_id', 'name', 'street', 'postcode', 'city', 'country', '_flags']
    )
  )
  console.log(`[migrate] Reports written to migration/reports/`)
  console.log(`           - all-rows-preview.csv  (${transformed.length} rows — review this)`)
  console.log(`           - flagged-rows.csv       (${flagged.length} rows — fix later)\n`)

  if (MODE === 'dry-run') {
    console.log('[migrate] Dry run complete. No database writes performed.')
    console.log(
      '[migrate] Review migration/reports/all-rows-preview.csv, then run with MODE=delete-tests, then MODE=import.\n'
    )
    return
  }

  // From here we need the DB
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !TENANT_ID) {
    throw new Error('Missing SUPABASE_URL, SUPABASE_SERVICE_KEY or TENANT_ID env vars')
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  if (MODE === 'delete-tests') {
    console.log('[migrate] Deleting test customers from tenant', TENANT_ID)
    const { data, error } = await supabase
      .from('customers')
      .delete()
      .eq('tenant_id', TENANT_ID)
      .in('name', TEST_CUSTOMER_NAMES)
      .select('name')
    if (error) throw error
    console.log(`[migrate] Deleted ${data.length} rows:`, data.map((d) => d.name).join(', '))
    console.log('[migrate] Done. Next: MODE=import\n')
    return
  }

  if (MODE === 'import') {
    // Safety check — ensure tenant exists and is empty (or near empty)
    const { count, error: countErr } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', TENANT_ID)
    if (countErr) throw countErr
    console.log(`[migrate] Current customer count in tenant: ${count}`)
    if (count > 10) {
      throw new Error(
        `Refusing to import — tenant already has ${count} customers. ` +
          `Run MODE=delete-tests first or expand this safety check.`
      )
    }

    // Strip internal _flags field before insert
    const toInsert = transformed.map(({ _flags, ...row }) => row)

    // Insert in chunks of 200 — Supabase rejects very large single payloads
    const CHUNK = 200
    let inserted = 0
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const slice = toInsert.slice(i, i + CHUNK)
      const { data, error } = await supabase.from('customers').insert(slice).select('id')
      if (error) {
        console.error(`[migrate] FAILED on chunk ${i / CHUNK + 1}:`, error.message)
        console.error(`[migrate] First row of failing chunk:`, slice[0])
        throw error
      }
      inserted += data.length
      console.log(`[migrate] Inserted chunk ${i / CHUNK + 1} — ${inserted}/${toInsert.length}`)
    }

    console.log(`\n[migrate] ✅ Imported ${inserted} customers into tenant ${TENANT_ID}`)
    console.log('[migrate] Next: run scripts/verify-import.sql in Supabase SQL Editor.\n')
    return
  }

  throw new Error(`Unknown MODE: ${MODE}. Use dry-run, delete-tests, or import.`)
}

main().catch((err) => {
  console.error('\n[migrate] FATAL:', err.message)
  if (err.stack) console.error(err.stack)
  process.exit(1)
})
