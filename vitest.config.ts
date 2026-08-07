import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Primes Astro's content layer cache before any test file runs. See
    // tests/global-setup.ts for why this is needed.
    globalSetup: ['./tests/global-setup.ts'],
  },
});
