// Minimal ESM resolve hook so Node can run the app's TypeScript directly:
// - rewrites the "@/..." path alias to a project-root file URL
// - appends ".ts" (or "/index.ts") to extensionless "@/" and relative specifiers
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve as pathResolve, dirname } from "node:path";
import { existsSync } from "node:fs";

const root = process.cwd();

function withExt(abs) {
  if (existsSync(abs) && !existsSync(pathResolve(abs, "index.ts"))) return abs;
  if (existsSync(abs + ".ts")) return abs + ".ts";
  if (existsSync(pathResolve(abs, "index.ts"))) return pathResolve(abs, "index.ts");
  return abs;
}

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const abs = withExt(pathResolve(root, specifier.slice(2)));
    return next(pathToFileURL(abs).href, context);
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[a-z]+$/i.test(specifier)) {
    const base = context.parentURL ? dirname(fileURLToPath(context.parentURL)) : root;
    const abs = withExt(pathResolve(base, specifier));
    return next(pathToFileURL(abs).href, context);
  }
  return next(specifier, context);
}
