// How a reader connects an assistant to Eleven One Data. The /data page renders these;
// tests/data-page.test.ts holds the address equal to the registry entry and the plugin.

export const ADDRESS = 'https://data.elevenoneresearch.com/mcp';

// /data, /privacy and /terms go live together, when the service answers. Until then they carry
// noindex and astro.config.mjs keeps them out of the sitemap. EFFECTIVE is the date the privacy
// policy and terms take effect (YYYY-MM-DD), set with LAUNCHED. tests/data-page.test.ts holds the
// three places to each other.
export const LAUNCHED = false;
export const EFFECTIVE: string | null = null;

// Neither link carries a key: both editors open the sign-in page on first use.
export const cursorLink = `cursor://anysphere.cursor-deeplink/mcp/install?name=eleven-one&config=${btoa(JSON.stringify({ url: ADDRESS }))}`;
export const vscodeLink = `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: 'eleven-one', type: 'http', url: ADDRESS }))}`;
