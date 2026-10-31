import { defineConfig } from 'void/config';
import { PREVIEW_PATTERN, PRODUCTION_HOST } from './deploy-target';

// The preview workflow sets WFH_LOG_PREVIEW (e.g. "pr-12") to deploy a PR as its own Worker,
// with its own D1 database (Void names it after the Worker) and secrets.
const preview = process.env.WFH_LOG_PREVIEW;
if (preview && !PREVIEW_PATTERN.test(preview)) {
  throw new Error(`WFH_LOG_PREVIEW must look like "pr-12", got "${preview}".`);
}

export default defineConfig({
  inference: { appType: 'void' },
  // GitHub only: no email/password sign-up. Who may sign in is limited in auth.ts.
  auth: { providers: ['github'] },
  cloudflare: preview
    ? {
        name: `wfh-log-${preview}`,
        compatibility_date: '2026-02-24',
        // Served through the proxied *.wfh-log.kinread.com DNS record.
        routes: [{ pattern: `${preview}.${PRODUCTION_HOST}/*`, zone_name: 'kinread.com' }],
      }
    : {
        name: 'wfh-log',
        compatibility_date: '2026-02-24',
        routes: [{ pattern: PRODUCTION_HOST, custom_domain: true }],
      },
});
