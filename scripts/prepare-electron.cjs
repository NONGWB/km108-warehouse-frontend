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
const sourceEnv = parseEnvFile(envSource);
const packagedEnvNames = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const packagedEnv = packagedEnvNames
  .map((name) => `${name}=${sourceEnv[name] || ''}`)
  .join('\n');
fs.writeFileSync(path.join(runtimeRoot, 'app.env'), `${packagedEnv}\n`, 'utf8');

console.log(`Electron runtime prepared at ${runtimeRoot}`);
