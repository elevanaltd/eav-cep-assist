import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/auth/index.ts',
    'src/comments/index.ts',
    'src/comments/extensions/index.ts',
    'src/scripts/index.ts',
    'src/services/index.ts',
    'src/editor/index.ts',
    'src/database/index.ts',
    'src/errors/index.ts',
    'src/lib/mappers/index.ts',
    'src/lib/client/index.ts'
  ],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true, // CRITICAL: Extract shared modules (AuthContext) to prevent context duplication
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', '@elevanaltd/shared-lib'],
  treeshake: true,
});
