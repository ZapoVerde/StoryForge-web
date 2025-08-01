// src/App.tsx

import React from 'react';
import LoginScreen from './ui/screens/LoginScreen'; 

function App() {
  return (
    <div className="App">
      {/* You'll put your main application routing here later */}
      <h1>StoryForge Web App</h1>
      <p>Welcome to your new StoryForge Web MVP!</p>
      <LoginScreen /> {/* <-- Make sure this is UNCOMMENTED */}
    </div>
  );
}

export default App;