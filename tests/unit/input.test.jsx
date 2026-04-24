import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Input } from '~/components/ui/input'

describe('Input (smart number handling)', () => {
  it('renders a plain text input by default', () => {
    render(<Input aria-label="example" />)
    const el = screen.getByLabelText('example')
    expect(el).toHaveAttribute('type', 'text')
    expect(el).not.toHaveAttribute('inputmode')
  })

  it('upgrades type="number" to text + decimal inputMode (no spinner arrows)', () => {
    render(<Input type="number" aria-label="qty" />)
    const el = screen.getByLabelText('qty')
    // Real `type="number"` has ± spinners and wheel-hijack. Our smart default
    // renders as text with a numeric mobile keyboard instead.
    expect(el).toHaveAttribute('type', 'text')
    expect(el).toHaveAttribute('inputmode', 'decimal')
  })

  it('honours nativeNumber={true} escape hatch', () => {
    render(<Input type="number" nativeNumber aria-label="native" />)
    const el = screen.getByLabelText('native')
    expect(el).toHaveAttribute('type', 'number')
  })

  it('forwards explicit inputMode instead of overriding', () => {
    render(<Input type="number" inputMode="numeric" aria-label="int" />)
    const el = screen.getByLabelText('int')
    expect(el).toHaveAttribute('inputmode', 'numeric')
  })

  it('passes through other input types (email, password, search)', () => {
    render(<Input type="email" aria-label="mail" />)
    expect(screen.getByLabelText('mail')).toHaveAttribute('type', 'email')
  })

  it('applies red border when invalid={true}', () => {
    render(<Input invalid aria-label="broken" />)
    expect(screen.getByLabelText('broken').className).toContain('border-red-400')
  })

  it('does not apply red border when invalid is omitted', () => {
    render(<Input aria-label="fine" />)
    expect(screen.getByLabelText('fine').className).not.toContain('border-red-400')
  })

  it('still accepts a custom className alongside smart defaults', () => {
    render(<Input type="number" className="custom-xyz" aria-label="styled" />)
    const el = screen.getByLabelText('styled')
    expect(el.className).toContain('custom-xyz')
    expect(el).toHaveAttribute('type', 'text')
  })
})
