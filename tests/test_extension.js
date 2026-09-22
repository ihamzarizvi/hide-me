const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Running Thanos Disintegration FX Extension Verification Tests ---');

const projectRoot = path.join(__dirname, '..');

// 1. Verify Manifest JSON Structure
const manifestPath = path.join(projectRoot, 'manifest.json');
assert.strictEqual(fs.existsSync(manifestPath), true, 'manifest.json should exist');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

assert.strictEqual(manifest.manifest_version, 3, 'Manifest version should be 3');
assert.strictEqual(manifest.name, 'Google Meet Thanos Disintegration Exit');
assert.ok(manifest.permissions.includes('storage'), 'Manifest should have storage permission');
assert.ok(manifest.commands['toggle-disintegration'], 'Manifest should define toggle-disintegration command');

console.log('✓ Test 1: manifest.json structure verified.');

// 2. Verify Key JS Source Files
const requiredFiles = ['background.js', 'content.js', 'inject.js', 'popup.html', 'popup.js', 'styles.css'];
for (const file of requiredFiles) {
  const filePath = path.join(projectRoot, file);
  assert.strictEqual(fs.existsSync(filePath), true, `${file} should exist`);
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.length > 50, `${file} should contain code`);
}
console.log('✓ Test 2: All core extension files verified.');

// 3. Check Engine Capabilities in inject.js
const injectContent = fs.readFileSync(path.join(projectRoot, 'inject.js'), 'utf8');
assert.ok(injectContent.includes('navigator.mediaDevices.getUserMedia'), 'inject.js should intercept getUserMedia');
assert.ok(injectContent.includes('captureStream'), 'inject.js should output stream via canvas.captureStream');
assert.ok(injectContent.includes('SelfieSegmentation'), 'inject.js should integrate MediaPipe Selfie Segmentation');
assert.ok(injectContent.includes('thanos-floating-badge'), 'inject.js should create floating UI badge');
assert.ok(injectContent.includes('initializeParticles'), 'inject.js should initialize particle grid');

console.log('✓ Test 3: Engine stream interception and particle logic verified.');

console.log('\nAll 3 test suites passed successfully! 🎉');
