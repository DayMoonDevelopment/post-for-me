#!/usr/bin/env node

/**
 * Script to convert relative parent imports to alias imports
 * Converts patterns like:
 *   import { X } from "../ui/button" → import { X } from "~/ui/button"
 *   import { Y } from "../../lib/utils" → import { Y } from "~/lib/utils"
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { join } from "path";

const APP_DIR = "./app";
const ALIAS_DIRS = ["ui", "components", "lib", "hooks", "providers", "routes"];

function getAllFiles(dir, fileList = []) {
  const files = readdirSync(dir);

  files.forEach((file) => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".react-router") {
        getAllFiles(filePath, fileList);
      }
    } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function fixImportsInFile(filePath) {
  let content = readFileSync(filePath, "utf8");
  let modified = false;

  // For each alias directory, replace relative parent imports
  ALIAS_DIRS.forEach((dir) => {
    // Match patterns like: "../lib/..." or "../../lib/..." or "../../../lib/..."
    const pattern = new RegExp(
      `(['"\`])(?:\\.\\./)+${dir}(/[^'"\`]*)\\1`,
      "g"
    );

    const newContent = content.replace(pattern, (match, quote, path) => {
      modified = true;
      return `${quote}~/${dir}${path}${quote}`;
    });

    content = newContent;
  });

  if (modified) {
    writeFileSync(filePath, content, "utf8");
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }

  return false;
}

function main() {
  console.log("🔍 Finding files with relative parent imports...\n");

  const files = getAllFiles(APP_DIR);
  let fixedCount = 0;

  files.forEach((file) => {
    if (fixImportsInFile(file)) {
      fixedCount++;
    }
  });

  console.log(`\n✨ Fixed ${fixedCount} files`);
}

main();
