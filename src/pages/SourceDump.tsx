import React, { useEffect, useState } from 'react';

const SourceDump: React.FC = () => {
  const [code, setCode] = useState<string>('Loading...');

  useEffect(() => {
    fetch('/source-dump.txt')
      .then(res => res.text())
      .then(text => setCode(text))
      .catch(err => setCode('Error loading source dump: ' + err));
  }, []);

  return (
    <pre style={{
      whiteSpace: 'pre-wrap',
      background: '#1e1e1e',
      color: '#d4d4d4',
      padding: '1rem',
      overflowX: 'auto'
    }}>
      {code}
    </pre>
  );
};

export default SourceDump;
