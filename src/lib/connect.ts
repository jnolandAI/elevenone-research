// How a reader connects an assistant to Eleven One Data. The /data page renders these;
// tests/data-page.test.ts holds the address equal to the registry entry and the plugin.

export const ADDRESS = 'https://data.elevenoneresearch.com/mcp';

// Neither link carries a key: both editors open the sign-in page on first use.
export const cursorLink = `cursor://anysphere.cursor-deeplink/mcp/install?name=eleven-one&config=${btoa(JSON.stringify({ url: ADDRESS }))}`;
export const vscodeLink = `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: 'eleven-one', type: 'http', url: ADDRESS }))}`;
