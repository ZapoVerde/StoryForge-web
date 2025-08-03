import React, { useEffect, useState } from 'react';

const POLL_INTERVAL = 5000; // check every 5 seconds

const SourceDump: React.FC = () => {
  const [code, setCode] = useState('Loading...');
  const [lastHash, setLastHash] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchDump = async () => {
    try {
      // Cache-buster so browser doesn't reuse an old copy
      const res = await fetch(`/source-dump.txt?_=${Date.now()}`);
      const text = await res.text();

      // Quick fingerprint to detect if content changed
      const hash = String(text.length) + '-' + text.slice(0, 100);

      if (hash !== lastHash) {
        setCode(text);
        setLastHash(hash);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      setCode(`Error loading source dump: ${String(err)}`);
    }
  };

  useEffect(() => {
    fetchDump(); // first load
    const interval = setInterval(fetchDump, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [lastHash]); // refetch if hash changes

  return (
    <div style={{ height: '100%', background: '#121212', color: '#d4d4d4' }}>
      <div
        style={{
          padding: '0.5rem 1rem',
          borderBottom: '1px solid #333',
          fontSize: '0.85rem',
          background: '#1e1e1e',
        }}
      >
        <span>Last updated: {lastUpdated || 'Waiting for first load...'}</span>
      </div>
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          background: '#1e1e1e',
          color: '#d4d4d4',
          padding: '1rem',
          overflowX: 'auto',
          fontSize: '0.85rem',
          margin: 0,
          height: 'calc(100% - 2rem)',
        }}
      >
        {code}
      </pre>
    </div>
  );
};

export default SourceDump;
