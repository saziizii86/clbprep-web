// src/services/settingsService.ts
import { databases, DATABASE_ID } from "../appwrite";
import { ID, Query } from "appwrite";

// You need to create this collection in Appwrite Console
// Collection ID: 'settings' (or use your own ID and update below)
const SETTINGS_COLLECTION_ID = 'settings';

// Document ID for API settings (we only need one document)
const API_SETTINGS_DOC_ID = 'api_settings';

export interface APISettings {
  provider: 'openai' | 'gemini' | 'claude' | 'deepseek';
  openAIKey: string;
  geminiKey: string;
  claudeKey: string;
  deepseekKey: string;
  isConnected: boolean;
  modelName: string;
  maxTokens: number;
  updatedAt?: string;
  updatedBy?: string;
}

const defaultSettings: APISettings = {
  provider: 'openai',
  openAIKey: '',
  geminiKey: '',
  claudeKey: '',
  deepseekKey: '',
  isConnected: false,
  modelName: 'gpt-4o-mini',
  maxTokens: 1000
};

/**
 * Get API settings from database
 */
export const getAPISettings = async (): Promise<APISettings> => {
  // ✅ Cache API settings for this session (they rarely change)
  const CACHE_KEY = "clbprep_api_settings";
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch { /* ignore parse errors */ }

  try {
    const doc = await databases.getDocument(
      DATABASE_ID,
      SETTINGS_COLLECTION_ID,
      API_SETTINGS_DOC_ID
    );
    
    const settings = {
      provider: doc.provider || 'openai',
      openAIKey: doc.openAIKey || '',
      geminiKey: doc.geminiKey || '',
      claudeKey: doc.claudeKey || '',
      deepseekKey: doc.deepseekKey || '',
      isConnected: doc.isConnected || false,
      modelName: doc.modelName || 'gpt-4o-mini',
      maxTokens: doc.maxTokens || 1000,
      updatedAt: doc.updatedAt,
      updatedBy: doc.updatedBy
    };

    // ✅ Save to cache for this session
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(settings));
    } catch { /* ignore storage errors */ }

    return settings;
  } catch (error: any) {
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
	sessionStorage.removeItem("clbprep_api_settings"); // ✅ ADD THIS LINE — clear cache when settings change
  try {
const dataToSave = {
  provider: settings.provider || 'openai',
  openAIKey: settings.openAIKey || '',
  geminiKey: settings.geminiKey || '',
  claudeKey: settings.claudeKey || '',
  deepseekKey: settings.deepseekKey || '',
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
  provider: 'openai',
  openAIKey: '',
  geminiKey: '',
  claudeKey: '',
  deepseekKey: '',
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
export const testAPIKey = async (
  apiKey: string,
  provider: 'openai' | 'gemini' | 'claude' | 'deepseek' = 'openai'
): Promise<boolean> => {
  try {
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return response.ok;
    }

    if (provider === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      return response.ok;
    }

    if (provider === 'claude') {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      });
      return response.ok;
    }

    if (provider === 'deepseek') {
      const response = await fetch('https://api.deepseek.com/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return response.ok;
    }

    return false;
  } catch (error) {
    console.error('API key test failed:', error);
    return false;
  }
};
