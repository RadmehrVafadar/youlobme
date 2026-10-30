import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const source = await readFile(new URL('../script.js', import.meta.url), 'utf8');
const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

for (const entry of ['https://radmehr.ca/youlobme', 'https://radmehr.ca/youlobme/', 'https://www.radmehr.ca/youlobme', 'https://www.radmehr.ca/youlobme/', 'https://youlobme.vercel.app/', 'https://youlobme.vercel.app/index.html']) {
  test(`all assets stay within the app at ${entry}`, async () => {
    const base = html.match(/<base href="([^"]+)">/);
    assert.ok(base, 'Declare the base before assets so speculative preloads use it too');
    assert.ok(base.index < html.indexOf('<link'));
    const baseURI = new URL(base[1], entry).href;
    const prefix = '/youlobme/';
    const assets = [...html.matchAll(/<(?:link|script|img|audio)\b[^>]*(?:src|href)="([^"]+)"/g)].map(match => match[1]);
    for (const [, asset] of source.matchAll(/(?:picture|audio)\.src = ['`"]([^'`"]+)['`"]/g)) {
      for (let current = 1; current <= 5; current++) assets.push(asset.replace('${current}', current));
    }
    for (const asset of new Set(assets)) {
      const url = new URL(asset, baseURI);
      assert.equal(url.origin, new URL(entry).origin);
      assert.ok(url.pathname.startsWith(prefix), `${asset} escaped the app: ${url}`);
      const upstreamPath = url.pathname.slice(prefix.length);
      // The main proxy strips the prefix; direct Vercel requests use this alias.
      assert.ok(config.rewrites.some(rule => rule.source === '/youlobme/:path*' &&
        rule.destination.replace(':path*', upstreamPath) === `/${upstreamPath}`));
      const local = await readFile(new URL(`../${upstreamPath}`, import.meta.url));
      assert.ok(local.length > 0);
    }
  });
}
