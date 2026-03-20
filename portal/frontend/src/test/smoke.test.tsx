import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

function Placeholder() {
  return <h1>OpenFGC Portal</h1>
}

describe('test setup', () => {
  it('renders a basic React component with RTL', () => {
    render(<Placeholder />)

    expect(screen.getByRole('heading', { name: /openfgc portal/i })).toBeInTheDocument()
  })
})
