const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const distHtml = path.join(distDir, 'index.html');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TS GameBoy Core</title>
</head>
<body>
  <canvas id="screen" width="160" height="144"></canvas>
  <br>
  <input type="file" id="romInput" accept=".gb,.gbc">
  <p>Arrows: D-Pad | Z: A | X: B | Enter: Start | Space: Select</p>

  <script type="module">
    import { emulator } from './bundle.js';
    
    document.getElementById('romInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const bytes = new Uint8Array(event.target.result);
          emulator.run(bytes);
        };
        reader.readAsArrayBuffer(file);
      }
    });
  </script>
</body>
</html>
`;

(async () => {
  try {
    await esbuild.build({
      entryPoints: [path.join(projectRoot, 'src', 'main.ts')],
      bundle: true,
      outfile: path.join(distDir, 'bundle.js'),
      platform: 'browser',
      format: 'esm',
    });

    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(distHtml, html);
    console.log('Build successful! You can now open dist/index.html in your browser.');
  } catch (e) {
    console.error('Build failed!', e);
    process.exit(1);
  }
})();
