import express from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const app = express();
app.use(express.json());

const PROJECT_ROOT = "/work";
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public/manifest-svgs");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, options);

    let stderr = "";
    p.stderr.on("data", d => (stderr += d.toString()));

    p.on("close", code => {
      if (code !== 0) reject(new Error(stderr));
      else resolve();
    });
  });
}
