import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../data/infrastructure/firebaseClient';
// In a real scenario, you'd call a cloud function
// import { getFunctions, httpsCallable } from 'firebase/functions';

const AdminSettingsScreen = () => {
    const [connection, setConnection] = useState({
        displayName: 'Default OpenAI',
        modelSlug: 'gpt-4o',
        apiUrl: 'https://api.openai.com/v1/',
        apiToken: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<{message: string, severity: 'success' | 'error'} | null>(null);

    useEffect(() => {
        // Fetch the current settings to display them
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "globalSettings", "defaultAiConnection");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    // We don't fetch the token for security, just placeholder
                    setConnection({ ...data, apiToken: "••••••••••••••••" } as any);
                }
            } catch (error) {
                console.error("Error fetching global settings", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setStatus(null);
        alert(
            "SECURITY NOTE:\nIn a real app, this button would call a secure Firebase Cloud Function to save the API key. " +
            "Directly saving from the client would violate security rules. " +
            "For this demo, we are simulating the action. You would need to implement this function in your Firebase project."
        );

        // ** SIMULATED - In a real app, you would do this: **
        // const functions = getFunctions();
        // const saveDefaultConnection = httpsCallable(functions, 'saveDefaultConnection');
        // try {
        //   await saveDefaultConnection(connection);
        //   setStatus({ message: "Default connection saved successfully!", severity: 'success' });
        // } catch (error: any) {
        //   setStatus({ message: `Error: ${error.message}`, severity: 'error' });
        // }
        
        setIsSaving(false);
        // For now, we just show a success message
        setStatus({ message: "Simulated save successful! You would now implement the backend function.", severity: 'success' });
    };

    if (isLoading) {
        return <CircularProgress />;
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h5" gutterBottom>Admin: Default AI Settings</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                This configuration will be automatically given to all new users as their first AI connection. The API Token is never shown here for security. Entering a new token will overwrite the old one.
            </Typography>
            <Box component="form" noValidate autoComplete="off" sx={{ mt: 3 }}>
                <TextField label="Display Name" value={connection.displayName} onChange={e => setConnection(c => ({...c, displayName: e.target.value}))} fullWidth sx={{ mb: 2 }} />
                <TextField label="Model Slug (e.g., gpt-4o)" value={connection.modelSlug} onChange={e => setConnection(c => ({...c, modelSlug: e.target.value}))} fullWidth sx={{ mb: 2 }} />
                <TextField label="API URL" value={connection.apiUrl} onChange={e => setConnection(c => ({...c, apiUrl: e.target.value}))} fullWidth sx={{ mb: 2 }} />
                <TextField label="New API Token (will be hidden)" type="password" value={connection.apiToken} onChange={e => setConnection(c => ({...c, apiToken: e.target.value}))} fullWidth sx={{ mb: 2 }} />
                
                <Button variant="contained" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <CircularProgress size={24} /> : "Save Default Connection"}
                </Button>

                {status && <Alert severity={status.severity} sx={{ mt: 2 }}>{status.message}</Alert>}
            </Box>
        </Paper>
    );
};

export default AdminSettingsScreen;