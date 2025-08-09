import * as functions from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onMessagePublished } from "firebase-functions/v2/pubsub"; // Modern v2 import for Pub/Sub
import * as admin from "firebase-admin";

import { GoogleAuth } from "google-auth-library";
import { CloudBillingClient } from "@google-cloud/billing";

admin.initializeApp();
const db = admin.firestore();

// --- Interface for saveDefaultConnection data ---
interface ConnectionData {
  displayName: string;
  modelSlug: string;
  apiUrl: string;
  apiToken: string;
  functionCallingEnabled?: boolean;
}

// --- Function to save the default connection (from Admin screen) ---
export const saveDefaultConnection = onCall<ConnectionData>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError( "unauthenticated", "The function must be called while authenticated.");
    }
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    if (userDoc.data()?.role !== "admin") {
      throw new HttpsError( "permission-denied", "You must be an admin to call this function.");
    }
    const data = request.data;
    if (!data.apiToken || !data.modelSlug || !data.apiUrl) {
      throw new HttpsError( "invalid-argument", "Missing required connection fields.");
    }
    const connectionToSave = {
      displayName: data.displayName || "Default Connection",
      modelSlug: data.modelSlug,
      apiUrl: data.apiUrl,
      apiToken: data.apiToken,
      functionCallingEnabled: data.functionCallingEnabled ?? true,
    };
    await db.collection("globalSettings").doc("defaultAiConnection").set(connectionToSave, { merge: true });
    return { success: true, message: "Default connection saved successfully." };
  }
);

// --- Function to automatically disable billing if budget is exceeded ---
export const stopBilling = onMessagePublished("firebase-billing-alerts", async (event) => {
    const pubsubData = event.data.message.json;

    if (pubsubData.costAmount <= pubsubData.budgetAmount) {
      functions.logger.info("No action necessary. Cost is within budget.");
      return;
    }

    functions.logger.warn("CRITICAL: Cost has exceeded budget! Disabling billing...");

    const projectName = `projects/storyforge-july`;

    const client = new CloudBillingClient(); // This is the only line you need

    try {
      await client.updateProjectBillingInfo({
        name: projectName,
        projectBillingInfo: { billingAccountName: "" },
      });
      functions.logger.info(`SUCCESS: Billing has been disabled for project ${projectName}.`);
    } catch (error) {
      functions.logger.error("FAILED to disable billing:", error);
    }
});