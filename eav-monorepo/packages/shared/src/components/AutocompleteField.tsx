import React, { useState, useRef, useEffect } from 'react'
import { useDropdown } from '../lib/contexts/DropdownContext'
import './AutocompleteField.css'

export interface AutocompleteFieldProps {
  value: string | null
  onChange: (value: string | null) => void
  onOtherChange?: (otherValue: string | null) => void
  options: string[]
  allowOther: boolean
  isLoading?: boolean
  placeholder?: string
  disabled?: boolean
  showOtherText?: boolean // Whether to show the "Other" text input field
  otherValue?: string | null // Value of the "Other" text field
  autoFocus?: boolean // Whether to auto-focus this field on mount
}

/**
 * AutocompleteField Component
 *
 * Smart autocomplete with fuzzy matching, blur validation, and "Other" handling.
 *
 * Behavior:
 * 1. User types → filter options in real-time
 * 2. User selects option or types exact match → saves value
 * 3. User types non-matching value and blurs → shows confirmation dialog
 * 4. If allowOther=true → can save as "Other" with custom text
 * 5. If allowOther=false → must select from predefined list
 *
 * Auto-saves on blur (with optional confirmation for custom values)
 */
export function AutocompleteField({
  value,
  onChange,
  onOtherChange,
  options,
  allowOther,
  isLoading = false,
  placeholder = 'Type to search...',
  disabled = false,
  showOtherText = false,
  otherValue = null,
  autoFocus = false,
}: AutocompleteFieldProps) {
  const { activeDropdownId, setActiveDropdownId } = useDropdown()

  // Generate unique IDs for this instance (SSR-safe, deterministic, ARIA-compliant)
  const dropdownId = React.useId()
  const listboxId = `listbox-${dropdownId}`
  const isActive = activeDropdownId === dropdownId

  const [inputValue, setInputValue] = useState(value || '')
  const [filteredOptions, setFilteredOptions] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showValidationDialog, setShowValidationDialog] = useState(false)
  const [pendingValue, setPendingValue] = useState<string | null>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const [localOtherValue, setLocalOtherValue] = useState(otherValue || '') // Local state for "Other" text input
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync parent value changes to local state
  useEffect(() => {
    setInputValue(value || '')
  }, [value])

  // Sync otherValue prop changes to local state (for "Other" text input)
  useEffect(() => {
    setLocalOtherValue(otherValue || '')
  }, [otherValue])

  // Calculate dropdown position when this dropdown becomes active
  // Re-calculate on scroll/resize to prevent drift
  useEffect(() => {
    if (!isActive || !inputRef.current) return

    const updatePosition = () => {
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect()
        setDropdownStyle({
          position: 'fixed',
          top: `${rect.bottom}px`,
          left: `${rect.left}px`,
          right: 'auto',
          width: `${rect.width}px`,
        })
      }
    }

    // Initial position
    updatePosition()

    // Update position on scroll/resize
    window.addEventListener('scroll', updatePosition, true) // true = capture phase for all scrolls
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isActive])

  // Filter options based on input (case-insensitive, substring matching)
  const fuzzyFilter = (input: string, opts: string[]) => {
    if (!input.trim()) return opts
    const lower = input.toLowerCase()
    return opts.filter((opt) => opt.toLowerCase().includes(lower)).sort((a, b) => {
      const aLower = a.toLowerCase()
      const bLower = b.toLowerCase()
      // Prioritize exact matches and prefix matches
      if (aLower === lower) return -1
      if (bLower === lower) return 1
      if (aLower.startsWith(lower)) return -1
      if (bLower.startsWith(lower)) return 1
      return 0
    })
  }

  // Update filtered options when input changes
  useEffect(() => {
    if (isLoading) {
      setFilteredOptions([])
      return
    }
    const filtered = fuzzyFilter(inputValue, options)
    setFilteredOptions(filtered)
    setSelectedIndex(-1)

    // Don't automatically close dropdown here - let focus/blur events control it
    // This allows autofocus to work properly: field focuses with empty value,
    // and the onFocus handler will open the dropdown
  }, [inputValue, options, isLoading])

  // Close this dropdown when clicking outside
  useEffect(() => {
    if (!isActive) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveDropdownId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isActive, setActiveDropdownId])

  // Handle blur → validation for non-matching values
  const handleBlur = () => {
    const trimmedInput = inputValue.trim()

    // Case 1: Value is empty → clear
    if (!trimmedInput) {
      onChange(null)
      setInputValue('')
      setActiveDropdownId(null)
      return
    }

    // Case 2: Exact match in options → auto-save
    const exactMatch = options.find((opt) => opt.toLowerCase() === trimmedInput.toLowerCase())
    if (exactMatch) {
      onChange(exactMatch)
      setInputValue(exactMatch)
      setActiveDropdownId(null)
      return
    }

    // Case 3: No match
    if (!exactMatch) {
      if (allowOther) {
        // Show confirmation dialog for flexible fields
        setPendingValue(trimmedInput)
        setShowValidationDialog(true)
        // Keep dropdown open to show options
      } else {
        // For fixed lists, show "not found" message and reset
        // Reset to previous value
        setInputValue(value || '')
        setActiveDropdownId(null)
        // Could show toast here: "Value not found in options"
      }
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow ArrowDown/ArrowUp to open dropdown when closed (WCAG 2.1.1 keyboard accessibility)
    if (!isActive) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveDropdownId(dropdownId)
        return
      }
      if (e.key !== 'Enter') return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => {
          const next = prev + 1
          return next >= filteredOptions.length ? 0 : next
        })
        break

      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => {
          const next = prev - 1
          return next < 0 ? filteredOptions.length - 1 : next
        })
        break

      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
          // Select highlighted option
          const selected = filteredOptions[selectedIndex]
          onChange(selected)
          setInputValue(selected)
          setActiveDropdownId(null)
        } else {
          // No selection, trigger blur logic
          handleBlur()
        }
        break

      case 'Escape':
        e.preventDefault()
        setActiveDropdownId(null)
        setInputValue(value || '')
        setSelectedIndex(-1)
        break

      default:
        break
    }
  }

  // Handle option selection from dropdown
  const handleSelectOption = (option: string) => {
    onChange(option)
    setInputValue(option)
    setActiveDropdownId(null)
    setShowValidationDialog(false)
  }

  // Handle "Keep as Other" confirmation
  const handleConfirmOther = () => {
    if (pendingValue) {
      onChange('Other')
      if (onOtherChange) {
        onOtherChange(pendingValue)
      }
      setInputValue('Other')
      setShowValidationDialog(false)
      setPendingValue(null)
      setActiveDropdownId(null)
    }
  }

  // Handle "Cancel" on validation dialog
  const handleCancelValidation = () => {
    setShowValidationDialog(false)
    setPendingValue(null)
    setInputValue(value || '')
    setActiveDropdownId(null)
  }

  // Handle "Use selected" from suggestions (clicking a suggestion in validation dialog)
  const handleUseFromSuggestions = (option: string) => {
    handleSelectOption(option)
    setShowValidationDialog(false)
  }

  return (
    <div className="autocomplete-field" ref={containerRef}>
      <div className="autocomplete-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isActive}
          aria-controls={listboxId}
          aria-activedescendant={selectedIndex >= 0 ? `option-${dropdownId}-${selectedIndex}` : undefined}
          aria-autocomplete="list"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
          }}
          onBlur={handleBlur}
          onFocus={() => {
            // Open dropdown on focus if we have options to show
            // This works for both autofocus (empty value) and manual focus
            if (options.length > 0) {
              setActiveDropdownId(dropdownId)
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          autoFocus={autoFocus}
          className={`autocomplete-input ${isLoading ? 'loading' : ''}`}
          autoComplete="off"
        />
        {isLoading && <span className="autocomplete-spinner">⟳</span>}
      </div>

      {/* Dropdown suggestions */}
      {isActive && !isLoading && filteredOptions.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          className="autocomplete-dropdown"
          style={dropdownStyle}
        >
          {filteredOptions.map((option, idx) => (
            <div
              key={option}
              id={`option-${dropdownId}-${idx}`}
              className={`autocomplete-option ${idx === selectedIndex ? 'selected' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault() // Prevent blur from firing
                handleSelectOption(option)
              }}
              role="option"
              aria-selected={idx === selectedIndex}
            >
              {option}
            </div>
          ))}
        </div>
      )}

      {/* "Add as Other" suggestion (when typing non-matching value) */}
      {isActive && !isLoading && inputValue.trim() && filteredOptions.length === 0 && allowOther && (
        <div
          id={listboxId}
          role="listbox"
          className="autocomplete-dropdown"
          style={dropdownStyle}
        >
          <div
            id={`option-${dropdownId}-0`}
            className="autocomplete-option add-as-other"
            onMouseDown={(e) => {
              e.preventDefault() // Prevent blur from firing
              setPendingValue(inputValue.trim())
              setShowValidationDialog(true)
            }}
            role="option"
            aria-selected={false}
          >
            💡 Add "{inputValue.trim()}" as Other
          </div>
        </div>
      )}

      {/* Validation dialog for custom values */}
      {showValidationDialog && pendingValue && allowOther && (
        <div className="validation-dialog-overlay" onClick={handleCancelValidation}>
          <div className="validation-dialog" onClick={(e) => e.stopPropagation()}>
            <h4 className="validation-title">Confirm Custom Value</h4>

            <p className="validation-message">
              "{pendingValue}" is not in the predefined options.
            </p>

            {filteredOptions.length > 0 && (
              <div className="validation-suggestions">
                <p className="suggestions-label">Did you mean one of these?</p>
                <div className="suggestions-list">
                  {filteredOptions.slice(0, 3).map((option) => (
                    <button
                      key={option}
                      className="suggestion-button"
                      onClick={() => handleUseFromSuggestions(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="validation-actions">
              <button
                className="btn btn-secondary"
                onClick={handleCancelValidation}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmOther}
              >
                Use "{pendingValue}" as Other
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conditional "Other" text input (shown when value is "Other") */}
      {/* Uses local state for optimistic UI - only saves on blur (same pattern as variant/action fields) */}
      {showOtherText && value === 'Other' && (
        <div className="other-text-input-wrapper">
          <input
            type="text"
            value={localOtherValue}
            onChange={(e) => {
              // Update local state immediately for smooth typing
              setLocalOtherValue(e.target.value)
            }}
            onBlur={(e) => {
              // Auto-save on blur (same pattern as variant/action fields)
              if (onOtherChange) {
                const finalValue = e.target.value || null
                onOtherChange(finalValue)
              }
            }}
            placeholder="Enter custom value..."
            disabled={disabled}
            className="other-text-input"
          />
        </div>
      )}
    </div>
  )
}
