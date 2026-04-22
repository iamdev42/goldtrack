/**
 * Test suite for the legacy customer transformer.
 *
 * We can't reach Supabase from here, but we CAN prove the transform layer
 * is bulletproof by feeding it every category of weird row from the source
 * file and asserting the output matches what we want in the DB.
 *
 * Run with: node migration/transform.test.mjs
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  transformRow,
  formatPostcode,
  combinePhones,
  cleanEmail,
  clean,
  buildDisplayName,
} from './transform.mjs'

const T = '00000000-0000-0000-0000-000000000001'

// ── clean() ───────────────────────────────────────────────────

test('clean — null / undefined / empty / whitespace all become null', () => {
  assert.equal(clean(null), null)
  assert.equal(clean(undefined), null)
  assert.equal(clean(''), null)
  assert.equal(clean('   '), null)
  assert.equal(clean('  hello  '), 'hello')
  assert.equal(clean(123), '123')
})

// ── formatPostcode() ──────────────────────────────────────────

test('formatPostcode — Excel float 8340.0 becomes "8340"', () => {
  assert.equal(formatPostcode(8340.0, 'CH'), '8340')
})

test('formatPostcode — string "1008" stays as "1008"', () => {
  assert.equal(formatPostcode('1008', 'CH'), '1008')
})

test('formatPostcode — short Swiss postcode pads to 4 digits', () => {
  assert.equal(formatPostcode(800, 'CH'), '0800')
})

test('formatPostcode — German 5-digit postcode preserved as-is', () => {
  assert.equal(formatPostcode(79761, 'DE'), '79761')
})

test('formatPostcode — null / empty → null', () => {
  assert.equal(formatPostcode(null, 'CH'), null)
  assert.equal(formatPostcode('', 'CH'), null)
})

// ── combinePhones() ───────────────────────────────────────────

test('combinePhones — concatenates non-null entries with comma', () => {
  assert.equal(
    combinePhones('+41 79 111 22 33', '+41 44 444 55 66'),
    '+41 79 111 22 33, +41 44 444 55 66'
  )
})

test('combinePhones — skips nulls and empty strings', () => {
  assert.equal(combinePhones('+41 79 111 22 33', null, '', '   '), '+41 79 111 22 33')
})

test('combinePhones — deduplicates identical numbers', () => {
  assert.equal(combinePhones('+41 79 111', '+41 79 111'), '+41 79 111')
})

test('combinePhones — all-null input returns null', () => {
  assert.equal(combinePhones(null, null, undefined), null)
})

// ── cleanEmail() ──────────────────────────────────────────────

test('cleanEmail — valid email passes through', () => {
  assert.equal(cleanEmail('user@example.com'), 'user@example.com')
})

test('cleanEmail — trailing whitespace stripped (the actual bug from the source file)', () => {
  assert.equal(cleanEmail('info@lustart.ch '), 'info@lustart.ch')
})

test('cleanEmail — internal whitespace stripped', () => {
  assert.equal(cleanEmail('  user @ example.com  '), 'user@example.com')
})

test('cleanEmail — malformed email becomes null (we do not store junk)', () => {
  assert.equal(cleanEmail('not an email'), null)
  assert.equal(cleanEmail('@nodomain'), null)
  assert.equal(cleanEmail('no-at-sign.com'), null)
})

// ── buildDisplayName() ────────────────────────────────────────

test('buildDisplayName — first + last → "First Last"', () => {
  assert.equal(buildDisplayName('Sophie', 'Hartmann', null), 'Sophie Hartmann')
})

test('buildDisplayName — last only → "Last"', () => {
  assert.equal(buildDisplayName(null, 'Aemisegger', null), 'Aemisegger')
})

test('buildDisplayName — falls back to company when no person name', () => {
  assert.equal(buildDisplayName(null, null, 'Taylor & Co Jewellery'), 'Taylor & Co Jewellery')
})

test('buildDisplayName — last resort is "Unknown"', () => {
  assert.equal(buildDisplayName(null, null, null), 'Unknown')
})

// ── transformRow() — full-row integration tests ───────────────

test('transformRow — typical Swiss private customer (Abegg Rudolf)', () => {
  const row = {
    Nummer: 2951,
    Name: 'Abegg',
    Vorname: 'Rudolf',
    Strasse: 'Neuacherstr. 28',
    Land: 'CH',
    PLZ: 8340.0,
    Ort: 'Hinwil',
    'Tel. G.': '+4144-9373696',
    'Tel. P.': null,
    Kundenstatus: 'Kunde',
    Kundentyp: 'Privatkunde',
  }
  const out = transformRow(row, T)

  assert.equal(out.tenant_id, T)
  assert.equal(out.legacy_id, 2951)
  assert.equal(out.first_name, 'Rudolf')
  assert.equal(out.last_name, 'Abegg')
  assert.equal(out.name, 'Rudolf Abegg')
  assert.equal(out.company, null)
  assert.equal(out.street, 'Neuacherstr. 28')
  assert.equal(out.postcode, '8340')
  assert.equal(out.city, 'Hinwil')
  assert.equal(out.country, 'Switzerland')
  assert.equal(out.phone, '+4144-9373696')
  assert.equal(out.email, null)
  assert.equal(out.address, 'Neuacherstr. 28, 8340, Hinwil, Switzerland')
  assert.deepEqual(out._flags, [])
})

test('transformRow — single-name customer (Aemisegger, no Vorname)', () => {
  const row = {
    Nummer: 1793,
    Name: 'Aemisegger',
    Vorname: null,
    Strasse: 'Oberstofel',
    Land: 'CH',
    PLZ: 9127.0,
    Ort: 'St. Peterzell',
    Kundenstatus: 'Kunde',
    Kundentyp: 'Privatkunde',
  }
  const out = transformRow(row, T)

  assert.equal(out.first_name, null)
  assert.equal(out.last_name, 'Aemisegger')
  assert.equal(out.name, 'Aemisegger')
  assert.equal(out.company, null)
  assert.deepEqual(out._flags, [])
})

test('transformRow — company name is detected and stored separately (Taylor & Co Jewellery)', () => {
  const row = {
    Nummer: 99999,
    Name: 'Taylor & Co Jewellery',
    Vorname: null,
    Strasse: 'Test St 1',
    Land: 'CH',
    PLZ: 8000,
    Ort: 'Zürich',
  }
  const out = transformRow(row, T)

  assert.equal(out.company, 'Taylor & Co Jewellery')
  assert.equal(out.first_name, null)
  assert.equal(out.last_name, null)
  assert.equal(out.name, 'Taylor & Co Jewellery')
})

test('transformRow — missing address fields produce flags but still import', () => {
  const row = {
    Nummer: 5555,
    Name: 'Müller',
    Vorname: 'Hans',
    Strasse: null,
    Land: null,
    PLZ: null,
    Ort: null,
  }
  const out = transformRow(row, T)

  assert.equal(out.first_name, 'Hans')
  assert.equal(out.last_name, 'Müller')
  assert.equal(out.name, 'Hans Müller')
  assert.equal(out.street, null)
  assert.equal(out.postcode, null)
  assert.equal(out.city, null)
  assert.equal(out.country, null)
  assert.equal(out.address, null)
  assert.deepEqual(out._flags.sort(), [
    'missing city',
    'missing country',
    'missing postcode',
    'missing street',
  ])
  assert.match(out.notes, /Migration flags/)
})

test('transformRow — invalid email gets dropped, flag added', () => {
  const row = {
    Nummer: 6666,
    Name: 'Test',
    Vorname: 'User',
    Strasse: 'X',
    Land: 'CH',
    PLZ: 8000,
    Ort: 'Zürich',
    'E-Mail': 'not-a-real-email',
  }
  const out = transformRow(row, T)

  assert.equal(out.email, null)
  assert.ok(out._flags.includes('invalid email format'))
})

test('transformRow — multiple phones combined; tel.4/tel.5/fax preserved in notes', () => {
  const row = {
    Nummer: 7777,
    Name: 'Test',
    Vorname: 'User',
    Strasse: 'X',
    Land: 'CH',
    PLZ: 8000,
    Ort: 'Zürich',
    'Tel. G.': '+41 44 111 11 11',
    'Tel. P.': '+41 79 222 22 22',
    'Tel. 4': '+41 79 333 33 33',
    Fax: '+41 44 999 99 99',
  }
  const out = transformRow(row, T)

  assert.equal(out.phone, '+41 44 111 11 11, +41 79 222 22 22')
  assert.match(out.notes, /Tel\. 4: \+41 79 333 33 33/)
  assert.match(out.notes, /Fax: \+41 44 999 99 99/)
})

test('transformRow — Zusatz field is captured into notes', () => {
  const row = {
    Nummer: 8888,
    Name: 'Forrer',
    Vorname: 'Susanne',
    Zusatz: 'Degersheimerstrasse 3',
    Strasse: 'Other St',
    Land: 'CH',
    PLZ: 9000,
    Ort: 'St Gallen',
  }
  const out = transformRow(row, T)
  assert.match(out.notes, /Zusatz: Degersheimerstrasse 3/)
})

test('transformRow — 5-digit postcode mislabeled as CH gets corrected to DE', () => {
  // Real case: legacy_id 2974 in the source file (H. Kohl, Waldshut-Tiengen 79761)
  const row = {
    Nummer: 2974,
    Name: 'Kohl',
    Vorname: 'H.',
    Strasse: 'Breitenfeldstrasse 15',
    Land: 'CH',
    PLZ: 79761,
    Ort: 'Waldshut-Tiengen',
  }
  const out = transformRow(row, T)
  assert.equal(out.country, 'Germany', 'should be auto-corrected to Germany')
  assert.equal(out.postcode, '79761')
  assert.ok(
    out._flags.some((f) => f.includes('CH→DE')),
    'should be flagged for review'
  )
})

test('transformRow — totally empty row gets "Unknown" as name and flagged', () => {
  const out = transformRow({ Nummer: 9999 }, T)
  assert.equal(out.name, 'Unknown')
  assert.equal(out.company, 'Unknown')
  assert.ok(out._flags.includes('no name'))
})

// ── Run integration test against the real source file ────────

test('integration — transforms all 766 rows from the actual source file without throwing', async () => {
  const XLSX = await import('xlsx')
  const { readFile } = await import('node:fs/promises')
  const buf = await readFile(new URL('./legacy-customers.xlsx', import.meta.url))
  const wb = XLSX.read(buf, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: null })

  assert.equal(raw.length, 766, 'source file should contain 766 rows')

  const transformed = raw.map((r) => transformRow(r, T))
  assert.equal(transformed.length, 766)

  // Every row must have a non-empty name and a numeric legacy_id
  for (const row of transformed) {
    assert.ok(row.name && row.name.length > 0, `row ${row.legacy_id} has no name`)
    assert.equal(typeof row.legacy_id, 'number', `row ${row.legacy_id} legacy_id not numeric`)
    assert.ok(!Number.isNaN(row.legacy_id), `row legacy_id is NaN`)
  }

  // No legacy_id should appear twice
  const ids = transformed.map((r) => r.legacy_id)
  assert.equal(new Set(ids).size, ids.length, 'legacy_ids must be unique')

  // Every postcode for a CH customer should be exactly 4 digits OR null
  const badCh = transformed.filter(
    (r) => r.country === 'Switzerland' && r.postcode && !/^\d{4}$/.test(r.postcode)
  )
  assert.equal(badCh.length, 0, `${badCh.length} CH customers have non-4-digit postcodes`)

  // Every email present must be valid format
  const badEmails = transformed.filter(
    (r) => r.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email)
  )
  assert.equal(
    badEmails.length,
    0,
    `${badEmails.length} customers have malformed emails after cleaning`
  )

  console.log(
    `   ✓ 766 rows transformed | ` +
      `${transformed.filter((r) => r._flags.length).length} flagged | ` +
      `${transformed.filter((r) => r.email).length} with email | ` +
      `${transformed.filter((r) => r.phone).length} with phone`
  )
})
