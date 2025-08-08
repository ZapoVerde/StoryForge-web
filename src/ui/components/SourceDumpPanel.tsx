// src/ui/components/SourceDumpPanel.tsx
import React from 'react';
import {
  Box, Typography, Stack, Chip, Tooltip, IconButton, Divider, ListItemText
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArchiveIcon from '@mui/icons-material/Archive';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

let TreeItem: any = null;
let TreeView: any = null;
if (import.meta.env.DEV) {
  // Only load in dev so it doesn't bloat prod
  TreeItem = require('@mui/x-tree-view/TreeItem').TreeItem;
  TreeView = require('@mui/x-tree-view/TreeView').TreeView;
}

const BEGIN_SIG = '===== BEGIN FILE: ';
const END_SIG = '===== END FILE';

type Manifest = {
  generatedAt: string;
  totalFiles: number;
  totalBytes: number;
  files: { path: string; bytes: number }[];
  groups?: {
    name: string;
    fileCount: number;
    byteCount: number;
    txt: string;
    zip: string;
    b64: string;
  }[];
};

type ParsedTxt = Map<string, string>;

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB'];
  let u = -1;
  let v = n;
  do { v /= 1024; u++; } while (v >= 1024 && u < units.length - 1);
  return `${v >= 10 ? v.toFixed(0) : v.toFixed(1)} ${units[u]}`;
}

function parseTxtDump(txt: string): ParsedTxt {
  const map = new Map<string, string>();
  const lines = txt.split('\n');
  let current: string | null = null;
  const buf: string[] = [];
  for (const line of lines) {
    if (current === null) {
      if (line.startsWith(BEGIN_SIG)) {
        const filePath = line.slice(BEGIN_SIG.length).replace(/ =====$/, '').trim();
        current = filePath;
        buf.length = 0;
      }
    } else {
      if (line === END_SIG) {
        map.set(current, buf.join('\n'));
        current = null;
        buf.length = 0;
      } else {
        buf.push(line);
      }
    }
  }
  return map;
}

type FileNode = {
  id: string;
  name: string;
  path: string;
  bytes: number;
  children?: FileNode[];
  isFolder: boolean;
};

function buildTree(files: { path: string; bytes: number }[]): FileNode {
  const root: FileNode = { id: '(root)', name: '(repo root)', path: '', bytes: 0, isFolder: true, children: [] };
  const ensure = (segments: string[]): FileNode => {
    let node = root;
    let acc = '';
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isLast = i === segments.length - 1;
      acc = acc ? `${acc}/${seg}` : seg;
      if (isLast) {
        const f: FileNode = { id: acc, name: seg, path: acc, bytes: 0, isFolder: false };
        node.children!.push(f);
      } else {
        let child = node.children!.find(c => c.isFolder && c.name === seg);
        if (!child) {
          child = { id: acc, name: seg, path: acc, bytes: 0, isFolder: true, children: [] };
          node.children!.push(child);
        }
        node = child;
      }
    }
    return node;
  };

  for (const f of files) {
    const parts = f.path.split('/');
    ensure(parts);
  }

  function annotateSizes(n: FileNode): number {
    if (!n.isFolder) {
      const match = files.find(f => f.path === n.path);
      n.bytes = match ? match.bytes : 0;
      return n.bytes;
    }
    let total = 0;
    for (const c of n.children || []) total += annotateSizes(c);
    n.bytes = total;
    n.children?.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return total;
  }
  annotateSizes(root);
  return root;
}

function sanitizeFolderKey(p: string) {
  return (p || '(repo root)').replace(/[^\w.\- ()]/g, '_');
}

function groupsIndex(groups?: Manifest['groups']) {
  const map = new Map<string, { txt: string; b64: string }>();
  if (!groups) return map;
  for (const g of groups) {
    map.set(g.name, { txt: g.txt, b64: g.b64 });
  }
  return map;
}

async function fetchPublicText(publicPath: string): Promise<string | null> {
  const rel = publicPath.replace(/^public\//, '');
  try {
    const res = await fetch('/' + rel, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export const SourceDumpPanel: React.FC = () => {
  if (!import.meta.env.DEV) {
    return (
      <Box p={2}>
        <Typography variant="body2" color="text.secondary">
          Source dump disabled in production
        </Typography>
      </Box>
    );
  }

  const [manifest, setManifest] = React.useState<Manifest | null>(null);
  const [txtMap, setTxtMap] = React.useState<ParsedTxt | null>(null);
  const [rawTxt, setRawTxt] = React.useState<string>('');
  const [zipB64All, setZipB64All] = React.useState<string>('');

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [mRes, tRes, bRes] = await Promise.all([
          fetch('/source-dump-manifest.json', { cache: 'no-store' }),
          fetch('/source-dump.txt', { cache: 'no-store' }),
          fetch('/source-dump.b64.txt', { cache: 'no-store' }),
        ]);
        if (!mRes.ok || !tRes.ok || !bRes.ok) throw new Error('fetch failed');
        const m = (await mRes.json()) as Manifest;
        const t = await tRes.text();
        const b = await bRes.text();
        if (!mounted) return;
        setManifest(m);
        setRawTxt(t);
        setTxtMap(parseTxtDump(t));
        setZipB64All(b.trim());
      } catch (e) {
        console.error('[SourceDumpPanel] load error', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const copyText = async (text?: string | null) => {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); } catch (e) { console.error('clipboard failed', e); }
  };

  const copyFolderTxt = async (folderPath: string) => {
    if (!manifest || !txtMap) return;
    const pre = await tryFetchFolderTxt(folderPath, manifest);
    if (pre) {
      await copyText(pre);
      return;
    }
    const files = manifest.files
      .filter(f => folderPath === '' ? !f.path.includes('/') : f.path.startsWith(folderPath + '/'))
      .map(f => f.path);
    const chunks: string[] = [];
    chunks.push(`# Group: ${folderPath || '(repo root)'}`);
    chunks.push(`# Files: ${files.length}`);
    chunks.push('');
    for (const p of files) {
      const c = txtMap.get(p) ?? '';
      chunks.push(`${BEGIN_SIG}${p} =====`);
      chunks.push(c);
      chunks.push(END_SIG);
      chunks.push('');
    }
    await copyText(chunks.join('\n'));
  };

  const copyFolderZipB64 = async (folderPath: string) => {
    const b64 = await tryFetchFolderB64(folderPath, manifest || undefined);
    await copyText(b64 || zipB64All);
  };

  const tryFetchFolderTxt = async (folderPath: string, m: Manifest): Promise<string | null> => {
    const idx = groupsIndex(m.groups);
    const key = folderKey(folderPath);
    const fromManifest = idx.get(key);
    if (fromManifest?.txt) {
      const txt = await fetchPublicText(fromManifest.txt);
      if (txt) return txt;
    }
    const guess = `public/source-dump/folders/${sanitizeFolderKey(key)}.txt`;
    return await fetchPublicText(guess);
  };

  const tryFetchFolderB64 = async (folderPath: string, m?: Manifest): Promise<string | null> => {
    const key = folderKey(folderPath);
    if (m?.groups) {
      const idx = groupsIndex(m.groups);
      const fromManifest = idx.get(key);
      if (fromManifest?.b64) {
        const txt = await fetchPublicText(fromManifest.b64);
        if (txt) return txt.trim();
      }
    }
    const guess = `public/source-dump/folders/${sanitizeFolderKey(key)}.b64.txt`;
    const txt = await fetchPublicText(guess);
    return txt ? txt.trim() : null;
  };

  const folderKey = (folderPath: string) => (folderPath || '(repo root)');

  if (!manifest) {
    return (
      <Box p={2}>
        <Typography variant="body2">Loading source dump…</Typography>
      </Box>
    );
  }

  const tree = buildTree(manifest.files);

  return (
    <Box p={1}>
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        <Typography variant="subtitle2">Source Dump</Typography>
        <Chip size="small" label={`${manifest.totalFiles} files`} />
        <Chip size="small" label={fmtBytes(manifest.totalBytes)} />
        <Chip size="small" label={new Date(manifest.generatedAt).toLocaleString()} />
        <Box flex={1} />
        <Tooltip title="Copy ENTIRE TXT dump">
          <IconButton size="small" onClick={() => copyText(rawTxt)}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Copy ENTIRE ZIP Base64">
          <IconButton size="small" onClick={() => copyText(zipB64All)}>
            <ArchiveIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Divider sx={{ mb: 1 }} />

      {TreeView && TreeItem && (
        <TreeView
          defaultCollapseIcon={<ExpandMoreIcon />}
          defaultExpandIcon={<ChevronRightIcon />}
        >
          {tree.children?.map(child => (
            <TreeBranch key={child.id} node={child} renderLabel={n => renderLabel(n, copyFolderTxt, copyFolderZipB64, txtMap, zipB64All, copyText)} />
          ))}
        </TreeView>
      )}
    </Box>
  );
};

const TreeBranch = ({ node, renderLabel }: { node: FileNode; renderLabel: (n: FileNode) => React.ReactNode }) => {
  return node.isFolder
    ? <TreeItem nodeId={node.id} label={renderLabel(node)}>
        {node.children?.map(c => (
          <TreeBranch key={c.id} node={c} renderLabel={renderLabel} />
        ))}
      </TreeItem>
    : <TreeItem nodeId={node.id} label={renderLabel(node)} />;
};

function renderLabel(node: FileNode, copyFolderTxt: any, copyFolderZipB64: any, txtMap: any, zipB64All: any, copyText: any) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ pr: 1, flex: 1, minWidth: 0 }}>
      <ListItemText
        primary={node.name}
        secondary={fmtBytes(node.bytes)}
        primaryTypographyProps={{ variant: 'body2', noWrap: true }}
        secondaryTypographyProps={{ variant: 'caption' }}
        sx={{ mr: 1, overflow: 'hidden' }}
      />
      {node.isFolder ? (
        <Stack direction="row" spacing={0.5} onClick={e => e.stopPropagation()}>
          <Tooltip title="Copy folder TXT">
            <IconButton size="small" onClick={() => copyFolderTxt(node.path)}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Copy folder ZIP Base64">
            <IconButton size="small" onClick={() => copyFolderZipB64(node.path)}>
              <ArchiveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ) : (
        <Stack direction="row" spacing={0.5} onClick={e => e.stopPropagation()}>
          <Tooltip title="Copy file TXT">
            <IconButton size="small" onClick={() => copyText(txtMap?.get(node.path))}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Copy ENTIRE ZIP Base64">
            <IconButton size="small" onClick={() => copyText(zipB64All)}>
              <ArchiveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )}
    </Stack>
  );
}
