// src/ui/components/SourceDumpPanel.tsx
import React, { useEffect, useState } from 'react';
import { debugLog, errorLog } from '../../utils/debug';

// --- Type Definitions ---
interface File {
  name: string;
  content: string;
}

// A TreeNode represents a folder. It has a list of its own files (`__files`)
// and its properties are other folders (child TreeNodes).
interface TreeNode {
  __files: File[];
  [key: string]: TreeNode | File[]; // This is the key change to fix the error.
}

// --- Helper Components ---

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

function FolderView({ name, node, level = 0 }: { name: string; node: TreeNode | null; level?: number }) {
  const [open, setOpen] = useState(true);

  if (!node) {
    return null;
  }

  const folderIndent = { paddingLeft: `${level * 1.2}rem` };
  const folderText = node.__files ? node.__files.map(f => f.content).join('\n') : '';

  return (
    <div style={{ ...folderIndent }}>
      <div style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 'bold' }} onClick={() => setOpen(!open)}>
        {open ? '📂' : '📁'} {name}
        {folderText && <CopyButton text={folderText} />}
      </div>
      {open && (
        <>
          {node.__files && node.__files.map((file: File) => (
            <div key={file.name} style={{ paddingLeft: '1.5rem' }}>
              📄 {file.name}
              <CopyButton text={file.content} />
            </div>
          ))}
          {Object.entries(node)
            .filter(([key]) => key !== '__files')
            .map(([childName, childNode]) => (
              // The `childNode` is now correctly typed as `TreeNode`
              <FolderView key={childName} name={childName} node={childNode as TreeNode} level={level + 1} />
            ))}
        </>
      )}
    </div>
  );
}

// --- Main Component ---

export default function SourceDumpPanel() {
  const [dumpText, setDumpText] = useState('');
  const [tree, setTree] = useState<TreeNode | null>(null);

  useEffect(() => {
    debugLog('[SourceDumpPanel] fetching /source-dump.txt');
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/source-dump.txt?_=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (!mounted) return;
        setDumpText(text);
        setTree(parseDumpToTree(text));
      } catch (e) {
        errorLog('[SourceDump] fetch failed', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!dumpText) return <div>Loading...</div>;

  return (
    <div style={{ padding: '1rem', fontFamily: 'monospace' }}>
      <h2>
        📋 Copy Entire Repo
        <CopyButton text={dumpText} />
      </h2>
      {tree && <FolderView name="src" node={(tree.src as TreeNode) || tree} />}
      <hr style={{ margin: '2rem 0' }} />
      <h3>Full Dump:</h3>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', maxHeight: '400px', overflow: 'auto' }}>{dumpText}</pre>
    </div>
  );
}

// --- Parsing Logic ---

function parseDumpToTree(dump: string): TreeNode {
    const root: any = { __files: [] };
    let currentFile: File | null = null;

    const ensureFolder = (parts: string[]): TreeNode => {
        let node = root;
        for (const part of parts) {
            if (!part) continue;
            if (!node[part]) {
                node[part] = { __files: [] };
            }
            node = node[part];
        }
        return node;
    };

    const lines = dump.split('\n');

    // Detect format quickly (@@ markers)
    const isAtMarkers = dump.includes('@@FILE:') || dump.includes('@@FOLDER:');
    if (isAtMarkers) {
        for (const rawLine of lines) {
            const line = rawLine.trimEnd();
            if (line.startsWith('@@FOLDER:')) {
                const folderPath = line.replace('@@FOLDER:', '').trim();
                const parts = folderPath.split('/').filter(Boolean);
                const start = parts[0] === 'src' ? 1 : 0;
                ensureFolder(parts.slice(start));
            } else if (line.startsWith('@@FILE:')) {
                const filePath = line.replace('@@FILE:', '').trim();
                const parts = filePath.split('/').filter(Boolean);
                const start = parts[0] === 'src' ? 1 : 0;
                const fileParts = parts.slice(start);
                const fileName = fileParts.pop()!;
                const folderNode = ensureFolder(fileParts);
                currentFile = { name: fileName, content: '' };
                folderNode.__files.push(currentFile);
            } else {
                if (currentFile) currentFile.content += rawLine + '\n';
            }
        }
        return root;
    }

    // Fallback to BEGIN/END format
    const BEGIN_SIG = '===== BEGIN FILE: ';
    const END_SIG = '===== END FILE';
    let filePath: string | null = null;

    for (const rawLine of lines) {
        if (filePath === null) {
            if (rawLine.startsWith(BEGIN_SIG)) {
                const p = rawLine.slice(BEGIN_SIG.length).replace(/ =====$/, '').trim();
                const parts = p.split('/').filter(Boolean);
                const start = parts[0] === 'src' ? 1 : 0;
                const fileParts = parts.slice(start);
                const fileName = fileParts.pop()!;
                const folderNode = ensureFolder(fileParts);
                currentFile = { name: fileName, content: '' };
                folderNode.__files.push(currentFile);
                filePath = p;
            }
        } else {
            if (rawLine === END_SIG) {
                // When a file ends, reset its content to ensure the next line doesn't get appended
                if (currentFile) {
                    currentFile.content = currentFile.content.trimEnd();
                }
                filePath = null;
                currentFile = null;
            } else if (currentFile) {
                currentFile.content += rawLine + '\n';
            }
        }
    }
    return root;
}