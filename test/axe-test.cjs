const { chromium } = require('playwright-core');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  
  try {
    // Read axe-core library
    const axeContent = fs.readFileSync(require.resolve('axe-core'), 'utf8');
    
    await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    
    // Inject axe
    await page.addScriptTag({ content: axeContent });
    
    // Run axe
    const results = await page.evaluate(() => {
      return new Promise((resolve) => {
        axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } }, (error, results) => {
          if (error) throw error;
          resolve(results);
        });
      });
    });
    
    console.log('=== ACCESSIBILITY CHECK (axe-core) ===');
    console.log('Violations:', results.violations.length);
    console.log('Passes:', results.passes.length);
    
    // Estimate score (like Lighthouse)
    // With violations, deduct: critical=50pts, serious=30pts, moderate=10pts, minor=3pts
    let score = 100;
    results.violations.forEach(v => {
      const deduction = { critical: 50, serious: 30, moderate: 10, minor: 3 }[v.impact] || 3;
      score -= deduction;
    });
    score = Math.max(0, score);
    
    console.log('Estimated Accessibility Score:', score + '/100');
    
    if (results.violations.length > 0) {
      console.log('\nVIOLATIONS (by impact):');
      const byImpact = {};
      results.violations.forEach(v => {
        if (!byImpact[v.impact]) byImpact[v.impact] = [];
        byImpact[v.impact].push(v);
      });
      
      ['critical', 'serious', 'moderate', 'minor'].forEach(impact => {
        if (byImpact[impact]) {
          console.log(`\n${impact.toUpperCase()} (${byImpact[impact].length}):`);
          byImpact[impact].forEach(v => {
            console.log(`  - [${v.id}] ${v.help}`);
            v.nodes.slice(0, 2).forEach((node, i) => {
              const html = node.html.substring(0, 70).replace(/\n/g, ' ');
              console.log(`    [${i+1}] ${html}...`);
            });
            if (v.nodes.length > 2) console.log(`    ... and ${v.nodes.length - 2} more`);
          });
        }
      });
    } else {
      console.log('\nRESULT: Perfect accessibility (no violations)');
    }
    
  } catch (e) {
    console.log('ERROR:', e.message);
    console.log(e.stack);
  }

  await browser.close();
})();
