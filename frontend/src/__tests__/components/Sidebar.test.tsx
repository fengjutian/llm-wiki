import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('Sidebar', () => {
  it('renders navigation links', () => {
    renderWithRouter(<Sidebar />)
    expect(screen.getByText(/LLM Wiki/)).toBeInTheDocument()
    expect(screen.getByText('Wiki')).toBeInTheDocument()
    expect(screen.getByText('Graph')).toBeInTheDocument()
    expect(screen.getByText('Ingest')).toBeInTheDocument()
    expect(screen.getByText('Query')).toBeInTheDocument()
  })

  it('has working navigation links', () => {
    renderWithRouter(<Sidebar />)
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(5)
    links.forEach(link => {
      expect(link).toHaveAttribute('href')
    })
  })
})
