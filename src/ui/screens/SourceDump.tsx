import React, { useEffect, useState } from 'react';
import { debugLog, errorLog } from '../../utils/debug';

// Small reusable copy button
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

function FolderView({
  name,
  node,
  level = 0,
}: {
  name: string;
  node: any;
  level?: number;
}) {
  const [open, setOpen] = useState(true);

  const isFolder = typeof node === 'object';
  if (!isFolder) return null;

  const folderIndent = { paddingLeft: `${level * 1.2}rem` };

  // Gather folder text for copy
  const folderText = node.__files
    ? node.__files.map((f: any) => f.content).join('\n')
    : '';

  return (
    <div style={{ ...folderIndent }}>
      <div
        style={{
          cursor: 'pointer',
          userSelect: 'none',
          fontWeight: 'bold',
        }}
        onClick={() => setOpen(!open)}
      >
        {open ? '📂' : '📁'} {name}
        {folderText && <CopyButton text={folderText} />}
      </div>

      {open && (
        <>
          {node.__files &&
            node.__files.map((file: any) => (
              <div key={file.name} style={{ paddingLeft: '1.5rem' }}>
                📄 {file.name}
                <CopyButton text={file.content} />
              </div>
            ))}
          {Object.entries(node)
            .filter(([k]) => k !== '__files')
            .map(([childName, childNode]) => (
              <FolderView
                key={childName}
                name={childName}
                node={childNode}
                level={level + 1}
              />
            ))}
        </>
      )}
    </div>
  );
}

export default function SourceDump() {
  const [dumpText, setDumpText] = useState('');
  const [tree, setTree] = useState<any>(null);

  useEffect(() => {
    fetch(`/source-dump.txt?_=${Date.now()}`)
      .then((res) => res.text())
      .then((text) => {
        setDumpText(text);
        setTree(parseDumpToTree(text));
      });
  }, []);

  if (!dumpText) return <div>Loading...</div>;

  return (
    <div style={{ padding: '1rem', fontFamily: 'monospace' }}>
      <h2>
        📋 Copy Entire Repo
        <CopyButton text={dumpText} />
      </h2>

      {tree && <FolderView name="src" node={tree.src || tree} />}

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

function parseDumpToTree(dump: string) {
  const lines = dump.split('\n');
  const root: any = { __files: [] };;
  let currentFolder: string[] = [];
  let currentFile: { name: string; content: string } | null = null;

  const ensureFolder = (pathParts: string[]) => {
    let node = root;
    for (const part of pathParts) {
      if (!node[part]) node[part] = { __files: [] };
      node = node[part];
    }
    return node;
  };

  for (let line of lines) {
    if (line.startsWith('@@FOLDER:')) {
      const folderPath = line.replace('@@FOLDER: ', '').trim();
      currentFolder = folderPath.split('/').slice(1); // remove 'src'
      ensureFolder(currentFolder);
    } else if (line.startsWith('@@FILE:')) {
      const filePath = line.replace('@@FILE: ', '').trim();
      const parts = filePath.split('/');
      const fileName = parts.pop()!;
      currentFolder = parts.slice(1);
      const folderNode = ensureFolder(currentFolder);
      currentFile = { name: fileName, content: '' };
      folderNode.__files.push(currentFile);
    } else {
      if (currentFile) currentFile.content += line + '\n';
    }
  }

  return root;
}
