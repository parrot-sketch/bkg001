import { defineConfig } from '@prisma/config';

export default defineConfig({
  seed: {
    schema: 'prisma/schema.prisma',
    script: 'tsx prisma/seed.ts',
  },
});
