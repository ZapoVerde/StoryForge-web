// src/ui/screens/SourceDump.tsx  (or wherever you have this component)
import React, { useEffect, useState } from 'react';
import { debugLog, errorLog } from '../../utils/debug';

// --- Type Definitions for a type-safe data structure ---
interface File {
  name: string;
  content: string;
}

// A TreeNode represents a folder.
interface TreeNode {
  __files: File[];
  // It can contain other folders (TreeNodes) as properties.
  [folderName: string]: TreeNode | File[];
}

// --- Helper Components ---

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err)
 {
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

function FolderView({ name, node, level = 0 }: { name: string; node: TreeNode; level?: number }) {
  const [open, setOpen] = useState(true);

  const folderIndent = { paddingLeft: `${level * 1.2}rem` };
  // Combine the content of all files in this directory for a single copy button.
  const folderText = node.__files.map(f => f.content).join('\n\n');

  return (
    <div style={{ ...folderIndent }}>
      <div style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 'bold' }} onClick={() => setOpen(!open)}>
        {open ? '📂' : '📁'} {name}
        {folderText && <CopyButton text={folderText} />}
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
              <FolderView key={childName} name={childName} node={childNode as TreeNode} level={level + 1} />
            ))}
        </>
      )}
    </div>
  );
}

// --- Main Component ---

export default function SourceDump() {
  const [dumpText, setDumpText] = useState('');
  // The tree state is now strongly typed.
  const [tree, setTree] = useState<TreeNode | null>(null);

  useEffect(() => {
    fetch(`/source-dump.txt?_=${Date.now()}`)
      .then((res) => res.text())
      .then((text) => {
        setDumpText(text);
        setTree(parseDumpToTree(text));
      });
  }, []);

  if (!dumpText) return <div>Loading...</div>;

  const rootNode = (tree?.src as TreeNode) || tree;

  return (
    <div style={{ padding: '1rem', fontFamily: 'monospace' }}>
      <h2>
        📋 Copy Entire Repo
        <CopyButton text={dumpText} />
      </h2>

      {rootNode && <FolderView name="src" node={rootNode} />}

      <hr style={{ margin: '2rem 0' }} />
      <h3>Full Dump:</h3>
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          fontSize: '0.85rem',
          maxHeight: '400px',
          overflow: 'auto',
        }}
      >
        {dumpText}
      </pre>
    </div>
  );
}

// --- Parsing Logic (Corrected) ---

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

  for (const rawLine of lines) {
    // Trim only trailing whitespace to preserve indentation
    const line = rawLine.trimEnd();

    if (line.startsWith('@@FILE:')) {
      const filePath = line.replace('@@FILE:', '').trim();
      const parts = filePath.split('/');
      const fileName = parts.pop()!;
      // Assume 'src' is the root, remove it from the path
      const folderParts = parts.slice(1);
      const folderNode = ensureFolder(folderParts);
      currentFile = { name: fileName, content: '' };
      folderNode.__files.push(currentFile);
    } else if (line === '@@END_FILE@@') {
      // ✅ THIS IS THE FIX: When a file ends, stop appending content.
      if (currentFile) {
        // Trim any final newline from the content itself
        currentFile.content = currentFile.content.trimEnd();
      }
      currentFile = null;
    } else if (currentFile) {
      // Append the original line (with indentation) plus a newline
      currentFile.content += rawLine + '\n';
    }
    // Ignore @@FOLDER: lines as the file paths are enough to build the tree
  }

  return root;
}