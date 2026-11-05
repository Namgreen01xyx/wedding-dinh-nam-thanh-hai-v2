import { cp, mkdir, rm, readFile } from 'node:fs/promises';
import vm from 'node:vm';
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
  if (match[1].trim()) new vm.Script(match[1]);
}
for (const file of ['wish-config.js', 'gift-config.js']) new vm.Script(await readFile(new URL('../' + file, import.meta.url), 'utf8'));
const output = new URL('../dist/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'wish-config.js', 'gift-config.js', 'images', 'music']) await cp(new URL('../' + file, import.meta.url), new URL(file, output), { recursive: true });
console.log('Built static invitation in dist/; JavaScript syntax checks passed.');
