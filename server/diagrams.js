import { spawn } from 'child_process';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import os from 'os';
import path from 'path';

export const diagramsRouter = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);

    let stdout = '';
    let stderr = '';

    p.stdout.on('data', (d) => (stdout += d.toString()));
    p.stderr.on('data', (d) => (stderr += d.toString()));

    p.on('error', (err) => reject(err));
    p.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || stdout));
    });
  });
}

async function writeUploadedFile(buffer, originalname) {
  const ext = path.extname(originalname) || '.yaml';
  const filePath = path.join(
    os.tmpdir(),
    `kubediagram-upload-${crypto.randomUUID()}${ext}`
  );

  await fs.promises.writeFile(filePath, buffer);
  return filePath;
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

async function streamSvgFile(output, res) {
  res.setHeader('Content-Type', 'image/svg+xml');

  // wait until file exists and is non-empty
  await new Promise((resolve, reject) => {
    const check = () => {
      fs.stat(output, (err, stats) => {
        if (err) return reject(err);
        if (stats.size > 0) resolve();
        else setTimeout(check, 10);
      });
    };
    check();
  });

  const stream = fs.createReadStream(output, 'utf8');
  stream.pipe(res);

  stream.on('close', () => fs.unlink(output, () => {}));
  stream.on('error', (err) => {
    console.error(err);
    res.destroy();
    fs.unlink(output, () => {});
  });
}

diagramsRouter.post('/', upload.single('file'), async (req, res) => {
  const type = req.body?.type
  const inputPath = req.body?.path;
  const file = req.file;
  
  if (!type) {
    return res.status(400).json({ error: 'Missing diagram type' });
  }

  if (!file && !inputPath) {
    return res.status(400).json({
      error: 'Either path or file must be provided'
    });
  }

  let effectivePath;

  try {
    if (file) {
      effectivePath = await writeUploadedFile(
        file.buffer,
        file.originalname
      );
    } else {
      effectivePath = inputPath;
    }

    switch (type) {
      case 'manifest':
        await runDirectAndStream('kube-diagrams', [effectivePath], res);
        break;

      case 'kustomize':
        await runShellAndStream(
          `kubectl kustomize ${effectivePath} | kube-diagrams -`,
          res
        );
        break;

      // TODO: it is also possible to generate a Diagram based on a Helm Chart using helm-diagrams
      // https://github.com/philippemerle/KubeDiagrams/tree/main?tab=readme-ov-file#helm-diagrams
      case 'helmfile':
        await runShellAndStream(
          `helmfile template -f ${effectivePath} | kube-diagrams -`,
          res
        );
        break;

      // TODO: namespace & all-namespaces not working,
      // need kubeconfig to point kubectl to cluster.
      // commands are fine in theory, 'kubectl get all' just fails since it finds nothing
      // case 'namespace':
      //   await runShellAndStream(
      //     `kubectl get all -n ${namespace || 'default'} -o yaml | kube-diagrams -`,
      //     res
      //   );
      //   break;

      // case 'all-namespaces':
      //   await runShellAndStream(
      //     `kubectl get all --all-namespaces -o yaml | kube-diagrams -`,
      //     res
      //   );
      //   break;

      default:
        res.status(400).json({ error: 'Unknown type' });
    }
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  } finally {
    if (file && effectivePath) {
      fs.unlink(effectivePath, () => {});
    }
  }
});
