/** Production hostname, attached to the wfh-log Worker as a Cloudflare Custom Domain. */
export const PRODUCTION_HOST = 'wfh-log.kinread.com';
export const PRODUCTION_URL = `https://${PRODUCTION_HOST}`;

/** PR previews are served from `<preview>.wfh-log.kinread.com`, e.g. `pr-12`. */
export const PREVIEW_PATTERN = /^pr-\d+$/;
