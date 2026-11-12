import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [command, ...args] = process.argv.slice(2);
const apiUrl = process.env.UEMP_API_URL?.trim();

if (apiUrl) {
  const url = URL.canParse(apiUrl) ? new URL(apiUrl) : null;
  if (
    !url ||
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    console.error(
      'UEMP_API_URL must be an HTTP(S) API base URL without credentials, a query, or a fragment.',
    );
    process.exit(1);
  }

  args.unshift('--define', `UEMP_API_URL=${JSON.stringify(url.href.replace(/\/+$/, ''))}`);
}

const cli = fileURLToPath(new URL('../node_modules/@angular/cli/bin/ng.js', import.meta.url));
const result = spawnSync(process.execPath, [cli, command, ...args], { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
