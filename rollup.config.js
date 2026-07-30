import alias from "@rollup/plugin-alias";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import swc from "@rollup/plugin-swc";
import terser from "@rollup/plugin-terser";
import { fileURLToPath } from "node:url";
import { defineConfig } from "rollup";
import outputSize from "rollup-plugin-output-size";
import { visualizer } from "rollup-plugin-visualizer";

const extensions = [".mjs", ".js", ".json", ".node", ".ts"];
const shouldAnalyze = process.env.ANALYZE === "true";
const sourceDirectory = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  input: "./src/index.ts",
  output: [
    {
      file: "dist/esm/index.mjs",
      format: "es",
      generatedCode: "es5",
      sourcemap: true,
      sourcemapExcludeSources: true,
    },
    {
      exports: "named",
      file: "dist/cjs/index.cjs",
      format: "cjs",
      generatedCode: "es5",
      sourcemap: true,
      sourcemapExcludeSources: true,
    },
    {
      file: "dist/browser/html-to-image.js",
      name: "htmlToImage",
      format: "umd",
      generatedCode: "es5",
      plugins: [
        terser({ ecma: 5 }),
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
      sourcemap: true,
      sourcemapExcludeSources: true,
    },
  ],
  plugins: [
    alias({
      entries: [{ find: "@", replacement: sourceDirectory }],
    }),
    nodeResolve({ extensions }),
    swc({
      exclude: "node_modules/**",
      include: "src/**/*.ts",
      swc: {
        configFile: false,
        inlineSourcesContent: false,
        isModule: true,
        jsc: {
          externalHelpers: true,
          loose: false,
          parser: {
            decorators: false,
            syntax: "typescript",
            tsx: false,
          },
          target: "es5",
          transform: {
            useDefineForClassFields: false,
          },
        },
        sourceMaps: true,
        swcrc: false,
      },
    }),
    outputSize({ hide: ["asset"], summary: false }),
  ],
});
