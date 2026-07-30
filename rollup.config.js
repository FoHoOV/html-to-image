import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import filesize from 'rollup-plugin-filesize'

/**
 * @type {import("rollup").RollupOptions}
 */
export default {
  input: './src/index.ts',
  output: [
    {
      file: 'dist/esm/index.mjs',
      format: 'es',
      sourcemap: true,
    },
    {
      exports: 'named',
      file: 'dist/cjs/index.cjs',
      format: 'cjs',
      sourcemap: true,
    },
    {
      name: 'htmlToImage',
      format: 'umd',
      file: 'dist/browser/html-to-image.js',
      plugins: [terser()],
      sourcemap: true,
    },
  ],
  plugins: [
    typescript({
      cacheDir: 'node_modules/.cache/rollup-plugin-typescript',
      composite: false,
      declaration: false,
      emitDeclarationOnly: false,
      incremental: true,
      inlineSources: true,
      module: 'esnext',
      outputToFilesystem: false,
      tsconfig: './tsconfig.lib.json',
    }),
    nodeResolve(),
    commonjs(),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    filesize(),
  ],
}
