const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'dist');
// Deploy to multiple destinations so both /local and add-on ingress get updated
const destinations = [
  'Z:\\www\\reactivedash',
  'Z:\\addons\\local\\reactivedash\\client\\dist'
];

console.log(`Deploying from ${src} to destinations: ${destinations.join(', ')}`);

for (const dest of destinations) {
  const assetsDir = path.join(dest, 'assets');

  console.log(`\n--- Deploying to ${dest} ---`);
  // Ensure destination exists
  try {
    fs.mkdirSync(dest, { recursive: true });
  } catch (e) {
    console.error('Failed to create destination directory', dest, e);
    continue;
  }

  if (process.platform === 'win32') {
    // Use robocopy on Windows for a robust mirror copy
    const args = [src, dest, '/MIR'];
    console.log('Running robocopy', args.join(' '));
    const result = spawnSync('robocopy', args, { stdio: 'inherit', shell: true });
    // Robocopy returns bitwise flags; treat codes < 8 as success (no fatal error)
    if (typeof result.status === 'number' && result.status >= 8) {
      console.error('robocopy exited with fatal code', result.status);
      continue;
    }
    console.log('robocopy finished');
  } else {
    if (fs.cp) {
      try {
        fs.cpSync(src, dest, { recursive: true, force: true });
        console.log('Copy finished');
      } catch (err) {
        console.error('Copy failed', err);
        continue;
      }
    } else {
      const args = ['-a', src + '/', dest + '/'];
      console.log('Running rsync', args.join(' '));
      const result = spawnSync('rsync', args, { stdio: 'inherit' });
      if (result.status !== 0) {
        console.error('rsync failed with code', result.status);
        continue;
      }
    }
  }

  console.log('Deployment complete for', dest);

  // Read built asset filenames for this destination
  let assetFiles = [];
  try {
    assetFiles = fs.readdirSync(assetsDir);
  } catch (e) {
    console.warn('No assets directory found at', assetsDir, e);
  }

  const jsFile = assetFiles.find(f => f.endsWith('.js') && f.includes('index-'));
  const cssFile = assetFiles.find(f => f.endsWith('.css') && f.includes('index-'));

  // Create a stable wrapper entrypoint (index.js) that points to the hashed asset
  try {
    if (jsFile) {
      const srcJs = path.join(assetsDir, jsFile);
      const destJs = path.join(dest, 'index.js');
      // Backup existing stable entry if present
      try {
        if (fs.existsSync(destJs)) {
          const bak = destJs + '.bak.' + Date.now();
          fs.copyFileSync(destJs, bak);
          console.log(`Backed up previous ${destJs} -> ${bak}`);
        }
      } catch (bErr) {
        console.warn('Failed to backup previous index.js:', bErr);
      }
      fs.copyFileSync(srcJs, destJs);
      console.log(`Created wrapper entrypoint: ${destJs}`);
    } else {
      console.warn('No index-*.js found in assets to create wrapper entrypoint.');
    }
  } catch (err) {
    console.warn('Failed to create wrapper entrypoint index.js:', err);
  }

  // Also create a stable CSS entrypoint (index.css) copied from the hashed asset
  try {
    if (cssFile) {
      const srcCss = path.join(assetsDir, cssFile);
      const destCss = path.join(dest, 'index.css');
      // Backup existing stable stylesheet if present
      try {
        if (fs.existsSync(destCss)) {
          const bakCss = destCss + '.bak.' + Date.now();
          fs.copyFileSync(destCss, bakCss);
          console.log(`Backed up previous ${destCss} -> ${bakCss}`);
        }
      } catch (bErr) {
        console.warn('Failed to backup previous index.css:', bErr);
      }
      fs.copyFileSync(srcCss, destCss);
      console.log(`Created stable CSS entrypoint: ${destCss}`);
      // Write a small asset-manifest.json mapping hashed -> stable
      try {
        const manifest = {
          js: jsFile ? `assets/${jsFile}` : null,
          css: `assets/${cssFile}`,
          stable_js: 'index.js',
          stable_css: 'index.css',
          deployed_at: new Date().toISOString()
        };
        const manifestPath = path.join(dest, 'asset-manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
        console.log(`Wrote asset manifest: ${manifestPath}`);
      } catch (mErr) {
        console.warn('Failed to write asset-manifest.json:', mErr);
      }
    } else {
      console.warn('No index-*.css found in assets to create wrapper stylesheet.');
    }
  } catch (err) {
    console.warn('Failed to create wrapper stylesheet index.css:', err);
  }
}
