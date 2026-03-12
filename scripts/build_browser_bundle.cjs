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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gameboy Emulator</title>
  <link rel="icon" href="data:,">
</head>

<body>
  <h1>Gameboy Emulator</h1>
  <p>This is a simple Gameboy emulator built using JavaScript and HTML5 Canvas.</p>
  <input type="file" id="romInput" accept=".gb">
  <canvas id="screen" width="160" height="144" style="border:1px solid #000;"></canvas>
  <script type="module" src="./bundle.js"></script>
  <script>
    document.getElementById('romInput').addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (file) window.loadRomFile(file);
    });
  </script>
</body>

</html>
`;

(async () => {
  await esbuild.build({
    entryPoints: [path.join(projectRoot, 'src', 'main.ts')],
    bundle: true,
    outfile: path.join(distDir, 'bundle.js'),
    platform: 'browser',
    format: 'esm',
  });

  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(distHtml, html);
})();
