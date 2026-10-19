// Issues a client key. Prints the key once, and the label:hash pair to append
// to EO_API_KEY_HASHES. The key itself is never stored.
//
//   npm run keygen -- acme-consulting

import { hashKey, newKey } from '../src/auth.js';

const label = (process.argv[2] ?? 'default').replace(/[^a-z0-9._-]/gi, '-');
const key = newKey();
console.log(`key (give this to the client, once):\n  ${key}\n`);
console.log(`append to EO_API_KEY_HASHES:\n  ${label}:${hashKey(key)}`);
