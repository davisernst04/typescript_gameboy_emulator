const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  let errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console error: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', err => {
    errors.push(`Page error: ${err.message}`);
  });
  
  page.on('response', response => {
    if (!response.ok()) {
      errors.push(`Network error: ${response.status()} ${response.url()}`);
    }
  });

  await page.goto('http://localhost:5173/');
  
  // Wait a bit to see if any asynchronous errors occur
  await new Promise(r => setTimeout(r, 1000));
  
  if (errors.length > 0) {
    console.error("ERRORS FOUND:");
    errors.forEach(e => console.error(e));
    process.exit(1);
  } else {
    console.log("No console errors found!");
    process.exit(0);
  }
})();
