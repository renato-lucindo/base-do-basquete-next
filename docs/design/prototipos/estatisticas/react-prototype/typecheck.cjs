const ts = require("typescript");
const path = require("node:path");
const dependencies = path.dirname(
  path.dirname(require.resolve("react/package.json")),
);
const options = {
  noEmit: true,
  allowJs: true,
  checkJs: false,
  strict: true,
  skipLibCheck: true,
  jsx: ts.JsxEmit.ReactJSX,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ES2022,
  esModuleInterop: true,
  baseUrl: __dirname,
  paths: {
    react: [path.join(dependencies, "@types/react/index.d.ts")],
    "react/jsx-runtime": [
      path.join(dependencies, "@types/react/jsx-runtime.d.ts"),
    ],
    "react-dom": [path.join(dependencies, "@types/react-dom/index.d.ts")],
    "react-dom/client": [
      path.join(dependencies, "@types/react-dom/client.d.ts"),
    ],
  },
  ignoreDeprecations: "6.0",
};
const program = ts.createProgram(
  [path.join(__dirname, "app.tsx"), path.join(__dirname, "assets.d.ts")],
  options,
);
const errors = ts.getPreEmitDiagnostics(program);
if (errors.length)
  console.error(
    ts.formatDiagnosticsWithColorAndContext(errors, {
      getCurrentDirectory: () => __dirname,
      getCanonicalFileName: (f) => f,
      getNewLine: () => String.fromCharCode(10),
    }),
  );
console.log("TypeScript diagnostics:", errors.length);
process.exitCode = errors.length ? 1 : 0;
