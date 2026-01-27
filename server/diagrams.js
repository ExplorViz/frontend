import { spawn } from 'child_process';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';

export const diagramsRouter = express.Router();

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    let stderr = '';

    p.stderr.on('data', (d) => (stderr += d.toString()));
    p.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(stderr))
    );
  });
}

async function runDirectAndStream(cmd, args, res) {
  const output = tmpSvgPath();

  await run(cmd, [...args, '-o', output]);
  streamSvgFile(output, res);
}

async function runShellAndStream(shellCmd, res) {
  const output = tmpSvgPath();

  await run('sh', ['-c', `${shellCmd} -o ${output}`]);

  streamSvgFile(output, res);
}

function tmpSvgPath() {
  return path.join(os.tmpdir(), `kubediagram-${crypto.randomUUID()}.svg`);
}

function streamSvgFile(output, res) {
  res.setHeader('Content-Type', 'image/svg+xml');

  const stream = fs.createReadStream(output, 'utf8');

  stream.on('data', (chunk) => {
    res.write(
      chunk.replace(
        /https:\/\/raw\.githubusercontent\.com\/mingrammer\/diagrams\/refs\/heads\/master\/resources/g,
        '/kubeDiagrams-icons'
      )
    );
  });

  stream.on('end', () => {
    res.end();
    fs.unlink(output, () => {});
  });

  stream.on('error', (err) => {
    console.error(err);
    res.destroy();
    fs.unlink(output, () => {});
  });
}

diagramsRouter.post('/', async (req, res) => {
  const { type, path: inputPath, namespace } = req.body;

  try {
    switch (type) {
      case 'manifest':
        await runDirectAndStream('kube-diagrams', [inputPath], res);
        break;

      case 'kustomize':
        await runShellAndStream(
          `kubectl kustomize ${inputPath} | kube-diagrams -`,
          res
        );
        break;

      case 'helmfile':
        await runShellAndStream(
          `helmfile template -f ${inputPath} | kube-diagrams -`,
          res
        );
        break;

      // TODO: namespace & all-namespaces not working,
      // need kubeconfig to point kubectl to cluster.
      // commands are fine in theory, 'kubectl get all' just fails since it finds nothing
      case 'namespace':
        await runShellAndStream(
          `kubectl get all -n ${namespace || 'default'} -o yaml | kube-diagrams -`,
          res
        );
        break;

      case 'all-namespaces':
        await runShellAndStream(
          `kubectl get all --all-namespaces -o yaml | kube-diagrams -`,
          res
        );
        break;

      default:
        res.status(400).json({ error: 'Unknown type' });
    }
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});
