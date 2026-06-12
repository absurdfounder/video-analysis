const fs = require('fs');
const path = require('path');

function getAssetName() {
  if (process.platform === 'darwin') return 'yt-dlp_macos';
  if (process.platform === 'linux' && process.arch === 'arm64') return 'yt-dlp_linux_aarch64';
  if (process.platform === 'linux') return 'yt-dlp_linux';
  throw new Error(`Unsupported platform for bundled yt-dlp: ${process.platform}/${process.arch}`);
}

const binaryUrl = process.env.YTDLP_DOWNLOAD_URL || `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${getAssetName()}`;
const binDir = path.resolve(__dirname, '../bin');
const binPath = path.join(binDir, 'yt-dlp');

async function main() {
  fs.mkdirSync(binDir, { recursive: true });

  const response = await fetch(binaryUrl);
  if (!response.ok) {
    throw new Error(`Failed to download yt-dlp: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(binPath, buffer, { mode: 0o755 });
  fs.chmodSync(binPath, 0o755);
  console.log(`Installed yt-dlp binary at ${binPath}`);
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
