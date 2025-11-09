import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/client/index.ts',
    'src/types/index.ts',
    'src/database/index.ts',
    'src/errors/index.ts',
    'src/services/index.ts',
    'src/rls/index.ts',
    'src/mappers/index.ts',
    'src/auth/index.ts',
    'src/test/index.ts'
  ],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: ['@supabase/supabase-js'],
  treeshake: true,
});
