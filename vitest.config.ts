import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['tests/**/*.test.ts', 'research-kit/tests/**/*.test.ts'],
    environment: 'node',
  },
});
