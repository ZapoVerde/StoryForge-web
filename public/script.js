//
// ----------------- PASTE YOUR FIREBASE CONFIG OBJECT HERE -----------------
//
const firebaseConfig = {
  apiKey: "AIzaSy...YOUR_API_KEY", // PASTE YOURS HERE
  authDomain: "your-project-id.firebaseapp.com", // PASTE YOURS HERE
  projectId: "your-project-id", // PASTE YOURS HERE
  storageBucket: "your-project-id.appspot.com", // PASTE YOURS HERE
  messagingSenderId: "1234567890", // PASTE YOURS HERE
  appId: "1:1234567890:web:abcdef123456" // PASTE YOURS HERE
};
// --------------------------------------------------------------------------
//

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();
const provider = new firebase.auth.GoogleAuthProvider();

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');
const userDisplayName = document.getElementById('user-display-name');
const addPromptSection = document.getElementById('add-prompt-section');
const addPromptForm = document.getElementById('add-prompt-form');
const promptList = document.getElementById('prompt-list');

// --- AUTHENTICATION ---

// Login
loginBtn.addEventListener('click', () => {
    auth.signInWithPopup(provider).catch(error => console.error("Login failed:", error));
});

// Logout
logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// Listen for auth state changes to update the UI
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        loginBtn.classList.add('hidden');
        userInfo.classList.remove('hidden');
        userDisplayName.textContent = `Welcome, ${user.displayName}!`;
        addPromptSection.classList.remove('hidden');
    } else {
        // User is signed out
        loginBtn.classList.remove('hidden');
        userInfo.classList.add('hidden');
        addPromptSection.classList.add('hidden');
    }
});

// --- FIRESTORE (PROMPTS) ---

// Add a new prompt to the database
addPromptForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = document.getElementById('prompt-title').value;
    const text = document.getElementById('prompt-text').value;
    const user = auth.currentUser;

    if (!user) {
        alert("You must be logged in to share a prompt!");
        return;
    }

    db.collection('prompts').add({
        title: title,
        text: text,
        authorName: user.displayName,
        authorId: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        addPromptForm.reset();
        console.log("Prompt added successfully!");
    })
    .catch(error => {
        console.error("Error adding prompt: ", error);
    });
});


// Fetch and display all prompts from the database in real-time
db.collection('prompts').orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
        let promptsHtml = '';
        if (snapshot.empty) {
            promptList.innerHTML = "<p>No prompts shared yet. Be the first!</p>";
            return;
        }
        snapshot.forEach(doc => {
            const prompt = doc.data();
            const date = prompt.createdAt ? prompt.createdAt.toDate().toLocaleDateString() : 'Just now';

            promptsHtml += `
                <div class="prompt-card">
                    <h3>${prompt.title}</h3>
                    <p>${prompt.text.replace(/\n/g, '<br>')}</p>
                    <div class="meta">
                        Shared by ${prompt.authorName} on ${date}
                    </div>
                </div>
            `;
        });
        promptList.innerHTML = promptsHtml;
    });