type Fn = (...args: any[]) => any;

export function measureSync<F extends Fn>(name: string, f: F): ReturnType<F> {
  const start = performance.now();
  const result = f();
  const end = performance.now();
  const duration = end - start;
  console.log('Measure', name, duration);
  return result;
}

export function measureElapsedTime(name: string, startTime: number): void {
  const end = performance.now();
  const duration = end - startTime;
  console.log('Measure', name, duration);
}
