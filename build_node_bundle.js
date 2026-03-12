const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'node_test_bundle_new.js',
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  external: [],
}).catch(() => process.exit(1));
