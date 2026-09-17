import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const sourceFiles = collectFiles(join(root, "src"), [".ts", ".tsx"]);

describe("phase 11 architecture guardrails", () => {
  it("keeps route URL enum filters validated instead of force-cast", () => {
    const routeFiles = sourceFiles.filter((file) => relative(root, file).startsWith("src\\app\\"));
    const offenders = routeFiles
      .map((file) => [file, readFileSync(file, "utf8")])
      .filter(([, contents]) => /query\.[A-Za-z0-9_]+ as never|readParam\([^)]*\) as [A-Za-z0-9_[\]\"']/.test(contents))
      .map(([file]) => relative(root, file));

    assert.deepEqual(offenders, []);
  });

  it("keeps shared service/schema/type layers free from browser-only APIs", () => {
    const sharedFiles = sourceFiles.filter((file) =>
      /src\\features\\.*\\(services|schemas|types)\\/.test(relative(root, file)) ||
      /src\\lib\\api\\/.test(relative(root, file)),
    );
    const browserApiPattern = /\b(?:window|localStorage|sessionStorage|navigator)\s*\.|globalThis\.document\s*\./;
    const offenders = sharedFiles
      .map((file) => [file, readFileSync(file, "utf8")])
      .filter(([, contents]) => browserApiPattern.test(contents))
      .map(([file]) => relative(root, file));

    assert.deepEqual(offenders, []);
  });

  it("keeps UI routes out of mock repositories", () => {
    const uiFiles = sourceFiles.filter((file) =>
      /src\\app\\/.test(relative(root, file)) ||
      /src\\features\\.*\\components\\/.test(relative(root, file)),
    );
    const directMockImportPattern = /from\s+["']@\/features\/[^"']*\/(?:mock|services\/mock)/;
    const offenders = uiFiles
      .map((file) => [file, readFileSync(file, "utf8")])
      .filter(([, contents]) => directMockImportPattern.test(contents))
      .map(([file]) => relative(root, file));

    assert.deepEqual(offenders, []);
  });
});

function collectFiles(directory, extensions) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      files.push(...collectFiles(absolute, extensions));
    } else if (extensions.some((extension) => absolute.endsWith(extension))) {
      files.push(absolute);
    }
  }
  return files;
}
