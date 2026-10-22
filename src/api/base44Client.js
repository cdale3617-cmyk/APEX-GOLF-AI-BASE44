import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Base44's hosted website uses same-origin /api. The packaged Android
// version runs on Capacitor's secure local origin, so its API calls must
// instead reach Base44's hosted backend. Keep the website behavior intact.
const isNativeAndroid =
  typeof window !== 'undefined' &&
  Boolean(window.Capacitor?.isNativePlatform?.());

const hostedBackend = import.meta.env.VITE_BASE44_BACKEND_URL || 'https://base44.app';

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: isNativeAndroid ? hostedBackend : '',
  appBaseUrl
});
