import express from "express";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";

export const diagramsRouter = express.Router();

const PROJECT_ROOT = process.cwd();
const OUTPUT_DIR = path.join(PROJECT_ROOT, "manifest-svgs");

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args);
    let stderr = "";

    p.stderr.on("data", d => (stderr += d.toString()));
    p.on("close", code =>
      code === 0 ? resolve() : reject(new Error(stderr))
    );
  });
}

diagramsRouter.post("/", async (req, res) => {
  const { type, path: inputPath, name, namespace } = req.body;
  const output = path.join(OUTPUT_DIR, `${name}.svg`);

  try {
    switch (type) {
      case "manifest":
        await run("kube-diagrams", ["-o", output, inputPath]);
        break;

      case "kustomize":
        await run("sh", [
          "-c",
          `kubectl kustomize ${inputPath} | kube-diagrams - -o ${output}`,
        ]);
        break;

      case "helmfile":
        await run("sh", [
          "-c",
          `helmfile template -f ${inputPath} | kube-diagrams - -o ${output}`,
        ]);
        break;

      case "namespace":
        await run("sh", [
          "-c",
          `kubectl get all -n ${namespace ?? "default"} -o yaml | kube-diagrams - -o ${output}`,
        ]);
        break;

      case "all-namespaces":
        await run("sh", [
          "-c",
          `kubectl get all --all-namespaces -o yaml | kube-diagrams - -o ${output}`,
        ]);
        break;

      default:
        return res.status(400).json({ error: "Unknown type" });
    }

    const svg = fs
      .readFileSync(output, "utf8")
      .replace(
        /https:\/\/raw\.githubusercontent\.com\/mingrammer\/diagrams\/refs\/heads\/master\/resources/g,
        "/kubeDiagrams-icons"
      );

    fs.writeFileSync(output, svg);

    res.json({ ok: true, name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
