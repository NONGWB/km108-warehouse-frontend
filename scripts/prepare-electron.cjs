const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const standaloneSource = path.join(projectRoot, '.next', 'standalone');
const staticSource = path.join(projectRoot, '.next', 'static');
const publicSource = path.join(projectRoot, 'public');
const envSource = path.join(projectRoot, '.env.local');
const runtimeRoot = path.join(projectRoot, 'desktop-runtime');
const serverTarget = path.join(runtimeRoot, 'next-server');

function assertExists(target, description) {
  if (!fs.existsSync(target)) {
    throw new Error(`${description} not found: ${target}`);
  }
}

assertExists(standaloneSource, 'Next.js standalone output');
assertExists(staticSource, 'Next.js static output');
assertExists(publicSource, 'Public directory');
assertExists(envSource, 'Local environment file');

fs.rmSync(runtimeRoot, { recursive: true, force: true });
fs.mkdirSync(runtimeRoot, { recursive: true });

fs.cpSync(standaloneSource, serverTarget, { recursive: true });
fs.cpSync(staticSource, path.join(serverTarget, '.next', 'static'), { recursive: true });
fs.cpSync(publicSource, path.join(serverTarget, 'public'), { recursive: true });
fs.copyFileSync(envSource, path.join(runtimeRoot, 'app.env'));

console.log(`Electron runtime prepared at ${runtimeRoot}`);
