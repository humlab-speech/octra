// scripts/optimize-web-components.js

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const distDir = 'tmp/web-components/browser';

async function optimizeBundle() {
  console.log('Optimizing web-components bundle...');

  if (!fs.existsSync(distDir)) {
    console.error(`Error: dist directory not found at ${distDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(distDir).filter(f => f.endsWith('.js') && !f.endsWith('.min.js'));

  for (const file of files) {
    const filePath = path.join(distDir, file);
    const code = fs.readFileSync(filePath, 'utf-8');

    console.log(`\nOptimizing ${file}...`);

    try {
      // Minify with Terser
      const minified = await minify(code, {
        compress: {
          drop_console: true,
          passes: 2
        },
        mangle: true,
        output: { comments: false }
      });

      if (minified.error) {
        console.error(`Minification error in ${file}:`, minified.error);
        continue;
      }

      fs.writeFileSync(filePath, minified.code, 'utf-8');

      const before = Buffer.byteLength(code, 'utf-8');
      const after = Buffer.byteLength(minified.code, 'utf-8');
      const percent = ((before - after) / before * 100).toFixed(1);

      console.log(`  ${file}: ${(before / 1024).toFixed(1)}KB → ${(after / 1024).toFixed(1)}KB (${percent}% reduction)`);
    } catch (e) {
      console.error(`Optimization failed for ${file}:`, e.message);
    }
  }

  console.log('\nOptimization complete.');
}

optimizeBundle().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
