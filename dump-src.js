// dump-src.js
import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';

const SRC_DIR = path.join(process.cwd(), 'src');
const OUT_FILE = path.join(process.cwd(), 'public', 'source-dump.txt');

function walkDir(dir, callback) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      callback(fullPath, true);
      walkDir(fullPath, callback);
    } else {
      callback(fullPath, false);
    }
  });
}

function dumpSource() {
  let output = '';

  walkDir(SRC_DIR, (fullPath, isDir) => {
    const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
    if (isDir) {
      output += `@@FOLDER: ${relPath}\n`;
    } else {
      output += `@@FILE: ${relPath}\n`;
      try {
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        output += fileContent + '\n';
      } catch (err) {
        output += `// ERROR reading file: ${err.message}\n`;
      }
    }
  });

  fs.writeFileSync(OUT_FILE, output, 'utf8');
  console.log(`✅ Source dump updated: ${new Date().toLocaleTimeString()}`);
}

if (process.argv.includes('--watch')) {
  dumpSource();
  chokidar.watch(SRC_DIR, { ignoreInitial: true }).on('all', () => dumpSource());
} else {
  dumpSource();
}
