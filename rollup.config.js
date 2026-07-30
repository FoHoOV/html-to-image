import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import { defineConfig } from "rollup";
import filesize from "rollup-plugin-filesize";

export default defineConfig({
  input: "./src/index.ts",
  output: [
    {
      file: "dist/esm/index.mjs",
      format: "es",
      generatedCode: "es5",
      sourcemap: true,
    },
    {
      exports: "named",
      file: "dist/cjs/index.cjs",
      format: "cjs",
      generatedCode: "es5",
      sourcemap: true,
    },
    {
      name: "htmlToImage",
      format: "umd",
      file: "dist/browser/html-to-image.js",
      generatedCode: "es5",
      plugins: [terser({ ecma: 5 })],
      sourcemap: true,
    },
  ],
  plugins: [
    typescript({
      cacheDir: "node_modules/.cache/rollup-plugin-typescript",
      compilerOptions: {
        composite: false,
        declaration: false,
        emitDeclarationOnly: false,
        incremental: true,
        inlineSources: true,
        outDir: "./dist",
      },
      outputToFilesystem: false,
      tsconfig: "./tsconfig.lib.json",
    }),
    nodeResolve(),
    commonjs(),
    replace({
      preventAssignment: true,
      "process.env.NODE_ENV": JSON.stringify("production"),
    }),
    filesize(),
  ],
});
