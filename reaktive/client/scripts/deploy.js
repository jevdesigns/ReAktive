const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'dist');
const dest = 'Z:\\www\\reactivedash';

console.log(`Deploying from ${src} to ${dest}`);

// Ensure destination exists
try {
  fs.mkdirSync(dest, { recursive: true });
} catch (e) {
  console.error('Failed to create destination directory', e);
  process.exit(2);
}

if (process.platform === 'win32') {
  // Use robocopy on Windows for a robust mirror copy
  const args = [src, dest, '/MIR'];
  console.log('Running robocopy', args.join(' '));
  const result = spawnSync('robocopy', args, { stdio: 'inherit', shell: true });
  // robocopy returns >= 8 for errors (but different codes are used for some operations)
  if (result.status !== 0 && result.status !== 1) {
    console.error('robocopy exited with code', result.status);
    process.exit(result.status || 1);
  }
  console.log('robocopy finished');
} else {
  // POSIX fallback: use fs.cp if available
  if (fs.cp) {
    try {
      fs.cpSync(src, dest, { recursive: true, force: true });
      console.log('Copy finished');
    } catch (err) {
      console.error('Copy failed', err);
      process.exit(1);
    }
  } else {
    // Last resort: spawn rsync
    const args = ['-a', src + '/', dest + '/'];
    console.log('Running rsync', args.join(' '));
    const result = spawnSync('rsync', args, { stdio: 'inherit' });
    if (result.status !== 0) {
      console.error('rsync failed with code', result.status);
      process.exit(result.status || 1);
    }
  }
}

console.log('Deployment complete');
