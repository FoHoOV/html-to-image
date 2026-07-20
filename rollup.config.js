import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import filesize from 'rollup-plugin-filesize'

export default {
  input: './src/index.ts',
  output: [
    {
      name: 'htmlToImage',
      format: 'umd',
      file: 'dist/html-to-image.js',
      sourcemap: true,
    },
  ],
  plugins: [
    typescript({ declaration: false, module: 'esnext' }),
    nodeResolve(),
    commonjs(),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    terser(),
    filesize(),
  ],
}
