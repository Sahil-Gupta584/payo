import * as esbuild from 'esbuild'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '../..')

await esbuild.build({
  entryPoints: [path.resolve(__dirname, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: path.resolve(__dirname, 'dist/index.js'),
  packages: 'external',
  plugins: [
    {
      name: 'bundle-repo-db',
      setup(build) {
        build.onResolve({ filter: /^@repo\/db/ }, () => {
          return { path: path.resolve(rootDir, 'packages/db/src/index.ts') };
        });
      },
    },
  ],
})

console.log('⚡ apps/mcp built successfully to dist/index.js')
