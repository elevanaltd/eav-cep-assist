import { createBrowserClient } from '@workspace/shared'

// North Star I6: App-specific state tables
// This app reads shared script_components and maintains independent shots/scene_planning_state
const _supabase = createBrowserClient()

export function getSupabaseClient() {
  return _supabase
}

export const supabase = _supabase
