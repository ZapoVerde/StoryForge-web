import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';

const srcDir = path.join(process.cwd(), 'src');
const outputFile = path.join(process.cwd(), 'public', 'source-dump.txt');

// ✅ Whitelisted extra files that are safe to expose
const safeExtraFiles = [
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'vite.config.js',
  'public/index.html'
];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  });
}

function dump() {
  let allCode = '';

  // --- Dump /src files ---
  walkDir(srcDir, (filePath) => {
    if (/\.(ts|tsx|js|jsx|css|json|html)$/.test(filePath)) {
      const relativePath = path.relative(process.cwd(), filePath);
      const contents = fs.readFileSync(filePath, 'utf8');
      allCode += `\n\n// ===== ${relativePath} =====\n\n${contents}\n`;
    }
  });

  // --- Dump explicitly safe files ---
  safeExtraFiles.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const contents = fs.readFileSync(fullPath, 'utf8');
      allCode += `\n\n// ===== ${file} =====\n\n${contents}\n`;
    }
  });

  fs.writeFileSync(outputFile, allCode);
  console.log(`✅ Source dump updated: ${new Date().toLocaleTimeString()}`);
}

if (process.argv.includes('--watch')) {
  console.log('👀 Watching for changes...');
  dump(); // run once immediately
  chokidar.watch(['src', ...safeExtraFiles], {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    ignoreInitial: true
  }).on('all', (event, filePath) => {
    console.log(`📄 File changed: ${path.relative(process.cwd(), filePath)}`);
    dump();
  });
} else {
  dump(); // one‑time run
}
