import ELKApi from 'elkjs/lib/elk-api.js';

/**
 * `elk.bundled.js` inlines the whole layout engine and, unless it is handed a
 * worker, dispatches layout requests through a "fake worker" that runs on the
 * main thread. Large landscapes then block rendering and input for hundreds of
 * milliseconds. Pointing the thin `elk-api` client at `elk-worker.min.js`
 * instead moves the layout into a real web worker and keeps the engine out of
 * the main bundle.
 */
export type ElkLayouter = {
  layout: (graph: unknown) => Promise<any>;
};

type ProbeableElk = ElkLayouter & {
  knownLayoutAlgorithms: () => Promise<unknown>;
  terminateWorker?: () => void;
};

const WORKER_SCRIPT = 'elk-worker.min.js';
const WORKER_PROBE_TIMEOUT_MS = 10000;

let elkPromise: Promise<ElkLayouter> | null = null;

function resolveWorkerUrl(): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return new URL(
    base.endsWith('/') ? base + WORKER_SCRIPT : `${base}/${WORKER_SCRIPT}`,
    window.location.href
  ).href;
}

function createWorkerBackedElk(): ProbeableElk | null {
  if (typeof Worker === 'undefined' || typeof window === 'undefined') {
    return null;
  }

  try {
    // ELK only derives a worker factory itself by `require`-ing the optional
    // `web-worker` package, which does not resolve in a browser bundle.
    return new (ELKApi as any)({
      workerUrl: resolveWorkerUrl(),
      workerFactory: (url: string) => new Worker(url),
    }) as ProbeableElk;
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('ELK worker did not respond in time')),
      timeoutMs
    );
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

async function createMainThreadElk(): Promise<ElkLayouter> {
  const { default: ELKBundled } = await import('elkjs/lib/elk.bundled.js');
  return new ELKBundled() as ElkLayouter;
}

async function createElk(): Promise<ElkLayouter> {
  const workerElk = createWorkerBackedElk();

  if (workerElk) {
    try {
      // A missing or broken worker script only surfaces once we talk to it.
      await withTimeout(
        workerElk.knownLayoutAlgorithms(),
        WORKER_PROBE_TIMEOUT_MS
      );
      return workerElk;
    } catch (error) {
      console.warn(
        'Could not start the ELK web worker, layouting on the main thread instead.',
        error
      );
      workerElk.terminateWorker?.();
    }
  }

  return createMainThreadElk();
}

/**
 * Returns the shared ELK instance. Creating one instance per layout would spawn
 * (and leak) a web worker on every landscape update.
 */
export default function getElk(): Promise<ElkLayouter> {
  if (!elkPromise) {
    elkPromise = createElk();
  }
  return elkPromise;
}
