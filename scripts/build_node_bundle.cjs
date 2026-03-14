const path = require('path');
const esbuild = require('esbuild');

const projectRoot = path.resolve(__dirname, '..');

esbuild.build({
  entryPoints: [path.join(projectRoot, 'src', 'emulator', 'main.ts')],
  bundle: true,
  outfile: path.join(projectRoot, 'dist', 'node_test_bundle.cjs'),
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  external: [],
}).catch(() => process.exit(1));
