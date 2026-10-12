import type { CapacitorConfig } from '@capacitor/cli'

// Bundles the built web app (dist/) inside the APK so the shell opens with no internet.
// Data still comes from Supabase; the offline queue handles saves while offline.
const config: CapacitorConfig = {
  appId: 'in.dairyfarmdesk.app',
  appName: 'DairyFarmDesk',
  webDir: 'dist',
  backgroundColor: '#15803d',
  android: { allowMixedContent: false },
}

export default config
