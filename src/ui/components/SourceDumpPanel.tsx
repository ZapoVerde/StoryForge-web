// src/ui/components/SourceDumpPanel.tsx
import React, { useEffect, useState } from 'react';
import { debugLog, errorLog } from '../../utils/debug';

// --- Type Definitions (no changes here) ---
interface File {
  name: string;
  content: string;
}

interface TreeNode {
  __files: File[];
  [folderName: string]: TreeNode | File[];
}

// --- Helper Components ---

// ✅ STEP 1: CREATE A NEW DOWNLOAD BUTTON COMPONENT
function DownloadZipButton({ zipUrl }: { zipUrl: string }) {
  return (
    <a href={zipUrl} download>
      <button
        style={{
          marginLeft: '6px',
          fontSize: '0.8rem',
          cursor: 'pointer',
          background: 'none',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '2px 5px',
        }}
      >
        💾 Zip
      </button>
    </a>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      errorLog('Copy failed', err);
    }
  };
  return (
    <button
      onClick={handleCopy}
      style={{
        marginLeft: '6px',
        fontSize: '0.8rem',
        cursor: 'pointer',
        background: 'none',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '2px 5px',
      }}
    >
      {copied ? '✅' : '📋'}
    </button>
  );
}

// ✅ STEP 2: MODIFY THE FolderView COMPONENT
function FolderView({ name, node, level = 0, path }: { name: string; node: TreeNode; level?: number; path: string }) {
  const [open, setOpen] = useState(false); // Changed back to false to start collapsed

  const folderIndent = { paddingLeft: `${level * 1.2}rem` };
  const folderText = node.__files.map(f => f.content).join('\n\n');

  // Generate the safe filename for the zip, replacing '/' with '_' to match dump-src.js
  const safePath = path.replace(/\//g, '_');
  const zipUrl = `/source-dump/folders/${safePath}.zip`;

  return (
    <div style={{ ...folderIndent }}>
      <div style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 'bold' }} onClick={() => setOpen(!open)}>
        {open ? '📂' : '📁'} {name}
        {folderText && <CopyButton text={folderText} />}
        {/* ADD THE DOWNLOAD BUTTON FOR THIS FOLDER */}
        <DownloadZipButton zipUrl={zipUrl} />
      </div>
      {open && (
        <>
          {node.__files.map((file) => (
            <div key={file.name} style={{ paddingLeft: '1.5rem' }}>
              📄 {file.name}
              <CopyButton text={file.content} />
            </div>
          ))}
          {Object.entries(node)
            .filter(([key]) => key !== '__files')
            .map(([childName, childNode]) => (
              // ✅ PASS THE UPDATED PATH TO THE RECURSIVE CALL
              <FolderView key={childName} name={childName} node={childNode as TreeNode} level={level + 1} path={`${path}/${childName}`} />
            ))}
        </>
      )}
    </div>
  );
}

// --- Main Component ---

export const SourceDumpPanel: React.FC = () => {
  const [dumpText, setDumpText] = useState('');
  const [tree, setTree] = useState<TreeNode | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/source-dump.txt?_=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        setDumpText(text);
        setTree(parseDumpToTree(text));
      } catch (e) {
        errorLog('[SourceDump] fetch failed', e);
      }
    })();
  }, []);

  if (!dumpText) return <div>Loading...</div>;

  const rootNode = (tree?.src as TreeNode) || tree;

  return (
    <div style={{ padding: '1rem', fontFamily: 'monospace' }}>
      <h2>
        📋 Copy Entire Repo
        <CopyButton text={dumpText} />
        {/* Main zip download for the whole repo */}
        <a href="/source-dump.zip" download="source-dump.zip">
          <button style={{ marginLeft: '6px' }}>💾 Download Zip</button>
        </a>
      </h2>
      
      {/* ✅ STEP 3: PROVIDE THE INITIAL PATH FOR THE TOP-LEVEL FOLDER */}
      {rootNode && <FolderView name="src" node={rootNode} path="src" />}

    </div>
  );
};

// --- Parsing Logic (no changes here) ---
function parseDumpToTree(dump: string): TreeNode {
  const root: TreeNode = { __files: [] };
  let currentFile: File | null = null;

  const ensureFolder = (parts: string[]): TreeNode => {
    let node: TreeNode = root;
    for (const part of parts) {
      if (!part) continue;
      if (!node[part]) {
        node[part] = { __files: [] };
      }
      node = node[part] as TreeNode;
    }
    return node;
  };

  const lines = dump.split('\n');
  const isAtMarkers = lines.some(line => line.startsWith('@@FILE:'));

  if (isAtMarkers) {
    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (line.startsWith('@@FILE:')) {
        const filePath = line.replace('@@FILE:', '').trim();
        const parts = filePath.split('/');
        const fileName = parts.pop()!;
        const folderParts = parts.slice(1);
        const folderNode = ensureFolder(folderParts);
        currentFile = { name: fileName, content: '' };
        folderNode.__files.push(currentFile);
      } else if (line.trim() === '@@END_FILE@@') {
        currentFile = null;
      } else if (currentFile) {
        currentFile.content += rawLine + '\n';
      }
    }
  } else {
    // Fallback logic
    const BEGIN_SIG = '===== BEGIN FILE: ';
    const END_SIG = '===== END FILE';

    for (const rawLine of lines) {
      if (rawLine.startsWith(BEGIN_SIG)) {
        const p = rawLine.slice(BEGIN_SIG.length).replace(/ =====$/, '').trim();
        const parts = p.split('/');
        const fileName = parts.pop()!;
        const folderParts = parts.slice(1);
        const folderNode = ensureFolder(folderParts);
        currentFile = { name: fileName, content: '' };
        folderNode.__files.push(currentFile);
      } else if (rawLine === END_SIG) {
        currentFile = null;
      } else if (currentFile) {
        currentFile.content += rawLine + '\n';
      }
    }
  }
  
  const cleanup = (node: TreeNode) => {
    for (const file of node.__files) {
        file.content = file.content.trimEnd();
    }
    Object.keys(node).filter(k => k !== '__files').forEach(key => cleanup(node[key] as TreeNode));
  };
  cleanup(root);

  return root;
}