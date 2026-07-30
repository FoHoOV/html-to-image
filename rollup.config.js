import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import { defineConfig } from "rollup";
import filesize from "rollup-plugin-filesize";

export default defineConfig({
  input: "./src/index.ts",
  output: [
    {
      dir: "dist",
      entryFileNames: "esm/index.mjs",
      format: "es",
      generatedCode: "es5",
      sourcemap: true,
    },
    {
      dir: "dist",
      entryFileNames: "cjs/index.cjs",
      exports: "named",
      format: "cjs",
      generatedCode: "es5",
      sourcemap: true,
    },
    {
      dir: "dist",
      entryFileNames: "browser/html-to-image.js",
      name: "htmlToImage",
      format: "umd",
      generatedCode: "es5",
      plugins: [terser({ ecma: 5 })],
      sourcemap: true,
    },
  ],
  plugins: [
    typescript({
      outputToFilesystem: true,
      tsconfig: "./tsconfig.lib.json",
    }),
    filesize(),
  ],
});
