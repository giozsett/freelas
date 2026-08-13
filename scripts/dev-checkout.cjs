const { spawn } = require('node:child_process');
const path = require('node:path');

const scriptDir = __dirname;
const isWindows = process.platform === 'win32';

if (isWindows) {
  const ps1 = path.join(scriptDir, 'dev-checkout.ps1');
  const child = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', ps1], {
    stdio: 'inherit',
    cwd: path.resolve(scriptDir, '..'),
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    }
    process.exit(code ?? 1);
  });
} else {
  const sh = path.join(scriptDir, 'dev-checkout.sh');
  const child = spawn('bash', [sh], {
    stdio: 'inherit',
    cwd: path.resolve(scriptDir, '..'),
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    }
    process.exit(code ?? 1);
  });
}
