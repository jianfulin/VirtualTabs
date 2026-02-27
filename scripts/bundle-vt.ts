/**
 * scripts/bundle-vt.ts — Bundle vt-entry.ts into a single Node.js bundle using esbuild
 *
 * Usage:
 *   npx tsx scripts/bundle-vt.ts
 */

import * as esbuild from 'esbuild';
import * as path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.resolve(__dirname, '..');

async function bundleVt(): Promise<void> {
    const result = await esbuild.build({
        entryPoints: [path.join(projectRoot, 'vt-entry.ts')],
        bundle: true,
        platform: 'node',
        target: 'node18',
        format: 'cjs',
        outfile: path.join(projectRoot, 'dist', 'vt.bundle.js'),
        minify: true,
        external: ['vscode'],  // vscode is not bundled into CLI
    });

    if (result.errors.length > 0) {
        console.error('Bundle failed:', result.errors);
        process.exit(1);
    }
    console.log('✓ vt.bundle.js bundled successfully');
}

bundleVt().catch(e => {
    console.error(e);
    process.exit(1);
});
