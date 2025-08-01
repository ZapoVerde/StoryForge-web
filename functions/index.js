const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto"); // Node.js's built-in crypto library

admin.initializeApp();
const db = admin.firestore();

// --- Encryption Settings ---
const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16; // For AES, this is always 16
// Get the Master Key from the secure config.
const ENCRYPTION_KEY = process.env.VAULT_KEY;

// --- Encryption Helper Functions ---
function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

// --- Cloud Function 1: Save and Encrypt an API Key ---
exports.saveApiKey = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
    }
    const userId = context.auth.uid;
    const apiKey = data.key;
    const apiName = data.name; // e.g., "openai"

    if (!apiKey || !apiName) {
        throw new functions.https.HttpsError("invalid-argument", "Missing key or name.");
    }

    const encryptedKey = encrypt(apiKey);

    await db.collection('private_user_data').doc(userId).set({
        apiKeys: {
            [apiName]: encryptedKey // Using [apiName] allows for multiple keys, e.g., { openai: "...", anthropic: "..." }
        }
    }, { merge: true }); // merge:true prevents overwriting other keys

    return { status: 'success' };
});

// --- Cloud Function 2: Call the AI using the User's Key ---
exports.callAiApiWithUserKey = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
    }

    const userId = context.auth.uid;
    const userPrompt = data.prompt;

    // 1. Fetch the user's private data document
    const userDoc = await db.collection('private_user_data').doc(userId).get();
    if (!userDoc.exists || !userDoc.data().apiKeys || !userDoc.data().apiKeys.openai) {
        throw new functions.https.HttpsError("not-found", "OpenAI API key not found. Please set it in Settings.");
    }

    // 2. Decrypt the key
    const encryptedKey = userDoc.data().apiKeys.openai;
    const decryptedKey = decrypt(encryptedKey);

    // 3. Call the AI API
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    try {
        const response = await axios.post(
            apiUrl,
            { model: "gpt-3.5-turbo", messages: [{ role: "user", content: userPrompt }] },
            { headers: { "Authorization": `Bearer ${decryptedKey}` } }
        );
        return { result: response.data.choices[0].message.content };
    } catch (error) {
        console.error("AI API Error:", error.response.data);
        throw new functions.https.HttpsError("internal", "Error calling AI service. Check if your API key is valid.");
    }
});