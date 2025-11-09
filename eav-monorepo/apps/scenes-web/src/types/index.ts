/**
 * Application Domain Types
 *
 * Type-safe representations of core entities.
 * Separate from database schema to allow transformation/validation.
 */

export interface Project {
  id: string
  title: string
  eav_code: string
  project_phase?: string
  created_at: string
}

export interface Video {
  id: string
  title: string
  eav_code: string
  created_at: string
}

export interface Script {
  id: string
  video_id: string
  status: 'pend_start' | 'draft' | 'in_review' | 'rework' | 'approved' | 'reuse'
  plain_text: string
  component_count: number
  created_at: string
}

export interface ScriptComponent {
  id: string
  script_id: string
  component_number: number
  content: string
  word_count?: number
  created_at: string
}

export interface Scene {
  id: string
  script_component_id: string
  created_at: string
  updated_at: string
}

export interface Shot {
  id: string
  script_component_id: string
  shot_number: number
  // User-facing fields (8 total)
  shot_type: string | null // Dropdown: WS, MID, CU, FP, OBJ-L, OBJ-R, UNDER (no "Other")
  location_start_point: string | null // Dropdown: Standard, Other (with "Other")
  location_other: string | null // Free text: shown when location_start_point = "Other"
  movement_type: string | null // Dropdown: Tracking, Establishing, Standard, Photos (no "Other")
  subject: string | null // Dropdown: Standard, Other (with "Other")
  subject_other: string | null // Free text: shown when subject = "Other"
  variant: string | null // Free text: e.g., "front door", "siemens"
  action: string | null // Free text: e.g., "demo", "actor movement"
  // Hidden fields (not shown in UI)
  // Note: 'completed' field replaced with 'shot_status' in database (Phase 3+)
  completed?: boolean | null
  owner_user_id: string | null
  created_at: string
  updated_at: string
}

export interface ProductionNote {
  id: string
  shot_id: string
  author_id: string
  content: string
  parent_id?: string
  created_at: string
  updated_at: string
}

export interface DropdownOption {
  id: string
  field_name: 'shot_type' | 'location_start_point' | 'movement_type' | 'subject'
  option_value: string
  option_label: string
  sort_order: number
  created_at: string
}

export interface UserProfile {
  id: string
  email: string
  display_name: string
  role: 'admin' | 'client' | 'employee'
  created_at: string
}

export interface NavigationState {
  selectedProject?: Project
  selectedVideo?: Video
  selectedScript?: Script
  selectedComponent?: ScriptComponent
}
