#!/usr/bin/env node
// Downloads the vanilla client runtime exclusively from Mojang's published
// version metadata. It does not authenticate, distribute credentials, or alter
// session behaviour; Forge is installed separately by the official installer.
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const version = process.env.MINECRAFT_VERSION || '1.20.1';
const home = path.resolve(process.env.MINECRAFT_HOME || 'minecraft');
const client = path.resolve(process.env.MINECRAFT_CLIENT_HOME || path.join(home, 'client'));
const manifestUrl = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const get = (url) => new Promise((resolve, reject) => https.get(url, (res) => {
  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return resolve(get(res.headers.location));
  if (res.statusCode !== 200) return reject(new Error(`Download failed (${res.statusCode}): ${url}`));
  const chunks = []; res.on('data', (chunk) => chunks.push(chunk)); res.on('end', () => resolve(Buffer.concat(chunks)));
}).on('error', reject));
async function download(url, file, sha1) {
  const data = await get(url);
  if (sha1 && crypto.createHash('sha1').update(data).digest('hex') !== sha1) throw new Error(`Checksum failed: ${file}`);
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data);
}
async function main() {
  if (version !== '1.20.1') throw new Error(`MINECRAFT_VERSION_MISMATCH: expected 1.20.1, got ${version}`);
  const manifest = JSON.parse((await get(manifestUrl)).toString());
  const entry = manifest.versions.find((item) => item.id === version);
  if (!entry) throw new Error(`Minecraft version unavailable: ${version}`);
  const metadata = JSON.parse((await get(entry.url)).toString());
  fs.mkdirSync(client, { recursive: true });
  fs.writeFileSync(path.join(client, 'version.json'), JSON.stringify(metadata, null, 2));
  await download(metadata.downloads.client.url, path.join(client, `${version}.jar`), metadata.downloads.client.sha1);
  for (const library of metadata.libraries || []) {
    const artifact = library.downloads?.artifact;
    if (artifact) await download(artifact.url, path.join(client, 'libraries', artifact.path), artifact.sha1);
  }
  const index = metadata.assetIndex;
  await download(index.url, path.join(client, 'assets', 'indexes', `${index.id}.json`), index.sha1);
  const assets = JSON.parse(fs.readFileSync(path.join(client, 'assets', 'indexes', `${index.id}.json`)));
  for (const object of Object.values(assets.objects)) {
    const hash = object.hash;
    await download(`https://resources.download.minecraft.net/${hash.slice(0, 2)}/${hash}`, path.join(client, 'assets', 'objects', hash.slice(0, 2), hash), hash);
  }
  console.log(`Minecraft ${version} runtime installed at ${client}`);
}
main().catch((error) => { console.error(`MINECRAFT_RUNTIME_INSTALL_FAILED: ${error.message}`); process.exitCode = 1; });
