import { useAuth } from './auth'
import { addDays, todayIST } from './format'

/**
 * Returns a checker for the manager edit window: admins can change any date, managers only the last
 * `manager_edit_days` days (same rule the database enforces). Used to show/hide Delete buttons.
 */
export function useCanEdit() {
  const { isAdmin, settings } = useAuth()
  const min = addDays(todayIST(), -(settings?.manager_edit_days ?? 2))
  return (date: string) => isAdmin || date >= min
}
