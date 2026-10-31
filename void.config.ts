import { defineConfig } from 'void/config';

export default defineConfig({
  inference: { appType: 'void' },
  // GitHub only: no email/password sign-up. Who may sign in is limited in auth.ts.
  auth: { providers: ['github'] },
});
