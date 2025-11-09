/**
 * Dropdown option from dropdown_options table
 *
 * Represents a database-driven dropdown option for dynamic field population.
 * Used across EAV applications for consistent data entry options.
 */
export interface DropdownOption {
  id: string
  field_name: string
  option_value: string
  option_label: string
  sort_order: number
  created_at: string
}
