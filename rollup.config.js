import alias from "@rollup/plugin-alias";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import swc from "@rollup/plugin-swc";
import terser from "@rollup/plugin-terser";
import { fileURLToPath } from "node:url";
import { defineConfig } from "rollup";
import outputSize from "rollup-plugin-output-size";
import { visualizer } from "rollup-plugin-visualizer";

const shouldAnalyze = process.env.ANALYZE === "true";
const sourceDirectory = fileURLToPath(new URL("./src", import.meta.url));
const outputTarget = "es2015";

export default defineConfig({
  input: "./src/index.ts",
  output: [
    {
      file: "dist/esm/index.mjs",
      format: "es",
      generatedCode: outputTarget,
      sourcemap: true,
      sourcemapExcludeSources: true,
    },
    {
      file: "dist/cjs/index.cjs",
      format: "cjs",
      exports: "named",
      generatedCode: outputTarget,
      sourcemap: true,
      sourcemapExcludeSources: true,
    },
    {
      file: "dist/browser/html-to-image.js",
      format: "umd",
      name: "htmlToImage",
      generatedCode: outputTarget,
      sourcemap: true,
      sourcemapExcludeSources: true,
      plugins: [
        terser({
          ecma: 2015,
        }),
        ...(shouldAnalyze
          ? [
              visualizer({
                filename: ".rollup/stats.html",
                sourcemap: true,
                template: "treemap",
                title: "html-to-image browser bundle",
              }),
            ]
          : []),
      ],
    },
  ],
  plugins: [
    alias({
      entries: [{ find: "@", replacement: sourceDirectory }],
    }),
    nodeResolve({
      extensions: [".mjs", ".js", ".ts"],
    }),
    swc({
      exclude: "node_modules/**",
      include: "src/**/*.{ts,js,mjs}",
      swc: {
        configFile: false,
        swcrc: false,
        sourceMaps: true,
        inlineSourcesContent: false,
        isModule: "unknown",
        jsc: {
          target: outputTarget,
          externalHelpers: true,
          loose: false,
          parser: {
            syntax: "typescript",
            tsx: false,
            decorators: false,
          },
          transform: {
            useDefineForClassFields: false,
          },
        },
      },
    }),
    outputSize({
      hide: ["asset"],
      summary: false,
    }),
  ],
});
