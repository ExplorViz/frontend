import * as esbuild from 'esbuild';

const args = new Set(process.argv.slice(2));

const ctx = await esbuild.context({
    entryPoints: [
        'workers/city-layouter.ts',
        'workers/metrics-worker.ts',
        'workers/flat-data-worker.ts'
    ],
    outdir: 'public/assets/web-workers',
    bundle: true,
    minify: args.has('--minify')
});

if (args.has('build')) {
    await ctx.rebuild();
} else if (args.has('watch')) {
    await ctx.watch();
}

await ctx.dispose();
