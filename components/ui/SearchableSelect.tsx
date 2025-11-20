import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X } from 'lucide-react'

interface Option {
  value: string
  label: string
  category?: string
}

interface SearchableSelectProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  disabled = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Group options by category if they have categories
  const groupedOptions = filteredOptions.reduce((acc, option) => {
    const category = option.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(option)
    return acc
  }, {} as Record<string, Option[]>)

  // Get selected option label
  const selectedOption = options.find(option => option.value === value)

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside both the trigger button and the portal dropdown
      const target = event.target as Element
      const isOutsideTrigger = containerRef.current && !containerRef.current.contains(target)
      const isOutsideDropdown = !target.closest('[data-searchable-select-dropdown]')

      if (isOutsideTrigger && isOutsideDropdown) {
        setIsOpen(false)
        setSearchTerm('')
        setHighlightedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
      setHighlightedIndex(-1)
    }
  }, [isOpen])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Calculate dropdown position
  const updateDropdownPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
  }

  const handleToggleDropdown = () => {
    if (!disabled) {
      if (!isOpen) {
        updateDropdownPosition()
      }
      setIsOpen(!isOpen)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true)
        e.preventDefault()
      }
      return
    }

    const flatOptions = Object.values(groupedOptions).flat()

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < flatOptions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < flatOptions.length) {
          handleSelect(flatOptions[highlightedIndex].value)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSearchTerm('')
        setHighlightedIndex(-1)
        break
    }
  }

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchTerm('')
    setHighlightedIndex(-1)
  }

  const clearSearch = () => {
    setSearchTerm('')
    setHighlightedIndex(-1)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggleDropdown}
        disabled={disabled}
        className="flex-1 rounded-lg bg-white/10 backdrop-blur-xl border border-white/20 px-3 py-2 text-sm text-white hover:border-white/30 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-fuchsia-400/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between transition-colors"
        onKeyDown={handleKeyDown}
      >
        <span className={selectedOption ? 'text-white' : 'text-white/60'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-white/60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Portal */}
      {isOpen && createPortal(
        <div
          data-searchable-select-dropdown
          className="fixed z-[9999]"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            pointerEvents: 'auto'
          }}
        >
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-lg shadow-2xl max-h-60 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search metrics..."
                  className="w-full pl-8 pr-8 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-md text-white placeholder-white/40 text-sm focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-fuchsia-400/40"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Options */}
            <div className="max-h-48 overflow-y-auto">
              {Object.keys(groupedOptions).length > 0 ? (
                Object.entries(groupedOptions).map(([category, categoryOptions]) => (
                  <div key={category}>
                    {category !== 'Other' && (
                      <div className="px-3 py-2 text-xs font-semibold text-white/70 bg-white/5 uppercase tracking-wide">
                        {category.replace(/_/g, ' ')}
                      </div>
                    )}
                    {categoryOptions.map((option, index) => {
                      const flatOptions = Object.values(groupedOptions).flat()
                      const globalIndex = flatOptions.findIndex(opt => opt.value === option.value)

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleSelect(option.value)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 focus:bg-white/10 focus:outline-none transition-colors ${
                            globalIndex === highlightedIndex ? 'bg-white/10' : ''
                          } ${option.value === value ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'text-white'}`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-sm text-white/40 text-center">
                  No metrics found
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
