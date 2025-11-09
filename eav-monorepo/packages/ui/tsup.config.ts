import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/navigation/index.ts',
    'src/components/index.ts'
  ],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', '@workspace/data', '@workspace/auth'],
  treeshake: true,
});
