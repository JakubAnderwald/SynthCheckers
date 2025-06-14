import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Firebase configuration endpoint
  app.get('/api/firebase-config', (req, res) => {
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
    };

    // Validate all required secrets are present
    const missingKeys = Object.entries(firebaseConfig)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key);

    if (missingKeys.length > 0) {
      return res.status(500).json({ 
        error: 'Missing Firebase configuration',
        missingKeys 
      });
    }

    res.json(firebaseConfig);
  });

  const httpServer = createServer(app);

  return httpServer;
}
