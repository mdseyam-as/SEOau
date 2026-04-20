import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: false,
      env: {
        ...process.env,
        ...options.env,
      },
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
    });

    child.on('error', reject);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithRetry(command, args, attempts, delayMs) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await run(command, args);
      return;
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        break;
      }

      console.warn(
        `[build:platform] Prisma generate failed on attempt ${attempt}/${attempts}. Retrying in ${delayMs / 1000}s...`,
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}

async function main() {
  const installEnv = {
    PRISMA_SKIP_POSTINSTALL_GENERATE: 'true',
  };

  await run(npmCommand, ['install'], { env: installEnv });
  await run(npmCommand, ['run', 'build']);
  await run(npmCommand, ['--prefix', './backend', 'install'], { env: installEnv });
  await runWithRetry(npmCommand, ['--prefix', './backend', 'run', 'db:generate'], 5, 5000);
}

main().catch((error) => {
  console.error('[build:platform] Build failed:', error.message);
  process.exit(1);
});
