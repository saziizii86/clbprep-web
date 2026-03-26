// src/services/settingsService.ts
import { databases, DATABASE_ID } from "../appwrite";
import { ID, Query } from "appwrite";

// You need to create this collection in Appwrite Console
// Collection ID: 'settings' (or use your own ID and update below)
const SETTINGS_COLLECTION_ID = 'settings';

// Document ID for API settings (we only need one document)
const API_SETTINGS_DOC_ID = 'api_settings';

export interface APISettings {
  openAIKey: string;
  isConnected: boolean;
  modelName: string;
  maxTokens: number;
  updatedAt?: string;
  updatedBy?: string;
}

const defaultSettings: APISettings = {
  openAIKey: '',
  isConnected: false,
  modelName: 'gpt-4o-mini',
  maxTokens: 1000
};

/**
 * Get API settings from database
 */
export const getAPISettings = async (): Promise<APISettings> => {
  try {
    const doc = await databases.getDocument(
      DATABASE_ID,
      SETTINGS_COLLECTION_ID,
      API_SETTINGS_DOC_ID
    );
    
    return {
      openAIKey: doc.openAIKey || '',
      isConnected: doc.isConnected || false,
      modelName: doc.modelName || 'gpt-4o-mini',
      maxTokens: doc.maxTokens || 1000,
      updatedAt: doc.updatedAt,
      updatedBy: doc.updatedBy
    };
  } catch (error: any) {
    // If document doesn't exist, return default settings
    if (error.code === 404) {
      console.log('API settings not found, using defaults');
      return defaultSettings;
    }
    console.error('Error getting API settings:', error);
    return defaultSettings;
  }
};

/**
 * Save API settings to database
 */
export const saveAPISettings = async (settings: APISettings, userId?: string): Promise<boolean> => {
  try {
    const dataToSave = {
      openAIKey: settings.openAIKey,
      isConnected: settings.isConnected,
      modelName: settings.modelName,
      maxTokens: settings.maxTokens,
      updatedAt: new Date().toISOString(),
      updatedBy: userId || 'admin'
    };

    try {
      // Try to update existing document
      await databases.updateDocument(
        DATABASE_ID,
        SETTINGS_COLLECTION_ID,
        API_SETTINGS_DOC_ID,
        dataToSave
      );
    } catch (error: any) {
      // If document doesn't exist, create it
      if (error.code === 404) {
        await databases.createDocument(
          DATABASE_ID,
          SETTINGS_COLLECTION_ID,
          API_SETTINGS_DOC_ID,
          dataToSave
        );
      } else {
        throw error;
      }
    }
    
    console.log('API settings saved to database');
    return true;
  } catch (error) {
    console.error('Error saving API settings:', error);
    return false;
  }
};

/**
 * Delete/disconnect API settings
 */
export const disconnectAPI = async (): Promise<boolean> => {
  try {
    await databases.updateDocument(
      DATABASE_ID,
      SETTINGS_COLLECTION_ID,
      API_SETTINGS_DOC_ID,
      {
        openAIKey: '',
        isConnected: false,
        updatedAt: new Date().toISOString()
      }
    );
    return true;
  } catch (error) {
    console.error('Error disconnecting API:', error);
    return false;
  }
};

/**
 * Test if an API key is valid
 */
export const testAPIKey = async (apiKey: string): Promise<boolean> => {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return response.ok;
  } catch (error) {
    console.error('API key test failed:', error);
    return false;
  }
};
