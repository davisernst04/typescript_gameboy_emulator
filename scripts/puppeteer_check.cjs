const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });

  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err.message);
  });

  page.on('dialog', async dialog => {
    console.log('DIALOG:', dialog.message());
    await dialog.dismiss();
    process.exit(1); // Exit if alert is shown (XX opcode)
  });

  try {
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    console.log('Waiting for 10 seconds of emulation...');
    await new Promise(r => setTimeout(r, 10000));
    console.log('Finished waiting.');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
})();
