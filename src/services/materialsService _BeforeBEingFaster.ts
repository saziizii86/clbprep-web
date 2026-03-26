// src/services/materialsService.ts
import { databases, storage, DATABASE_ID, MATERIALS_COLLECTION_ID, BUCKET_ID } from "../appwrite";
import { ID, Query } from "appwrite";

export interface Material {
  $id?: string;
  title: string;
  skill: string;
  task: string;
  taskId: string;
  type: string;
  status: string;
  date: string;
  downloads?: number;
  sections?: number;
  audioFiles?: number;
  questions?: number;
  description?: string;
  uploadedFiles?: string;
}

// Helper: Convert base64 to File object
const base64ToFile = (base64Data: string, fileName: string, mimeType: string): File => {
  // Handle data URL format (data:image/png;base64,xxxx)
  const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const byteCharacters = atob(base64Content);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  return new File([blob], fileName, { type: mimeType });
};

// Helper: Upload file to Appwrite Storage
const uploadFileToStorage = async (fileData: { name: string; type: string; data: string }): Promise<string | null> => {
  if (!fileData || !fileData.data) return null;
  
  try {
    const file = base64ToFile(fileData.data, fileData.name, fileData.type);
    const response = await storage.createFile(BUCKET_ID, ID.unique(), file);
    console.log(`✓ Uploaded ${fileData.name} to storage: ${response.$id}`);
    return response.$id;
  } catch (error) {
    console.error(`Failed to upload ${fileData.name}:`, error);
    return null;
  }
};

// Helper: Upload array of files to storage
const uploadFilesToStorage = async (filesArray: Array<{ name: string; type: string; data: string }>): Promise<Array<{ name: string; type: string; storageId: string }>> => {
  if (!filesArray || !Array.isArray(filesArray)) return [];
  
  const results = [];
  for (const fileData of filesArray) {
    if (fileData && fileData.data) {
      const storageId = await uploadFileToStorage(fileData);
      if (storageId) {
        results.push({
          name: fileData.name,
          type: fileData.type,
          storageId: storageId
        });
      }
    }
  }
  return results;
};

// Helper: Process uploadedFiles - extract large files and upload to storage
const processUploadedFiles = async (uploadedFilesStr: string): Promise<string> => {
  if (!uploadedFilesStr) return '{}';
  
  try {
    const uploadedFiles = typeof uploadedFilesStr === 'string' 
      ? JSON.parse(uploadedFilesStr) 
      : uploadedFilesStr;
    
    // Check size - if small enough, just return as is
    const currentSize = JSON.stringify(uploadedFiles).length;
    console.log(`uploadedFiles current size: ${(currentSize / 1024).toFixed(2)} KB`);
    
    // If under 500KB, no need to use storage
    if (currentSize < 500 * 1024) {
      console.log('Size is acceptable, storing directly in document');
      return JSON.stringify(uploadedFiles);
    }
    
    console.log('Size exceeds 500KB, uploading files to Appwrite Storage...');
    
    // Process single file fields
    const singleFileFields = ['contextImage', 'videoFile', 'videoTranscript', 'answerKey', 'file'];
    for (const field of singleFileFields) {
      if (uploadedFiles[field]?.data) {
        const storageId = await uploadFileToStorage(uploadedFiles[field]);
        if (storageId) {
          uploadedFiles[field] = {
            name: uploadedFiles[field].name,
            type: uploadedFiles[field].type,
            storageId: storageId
          };
        }
      }
    }
    
    // Process array file fields
    const arrayFileFields = ['sectionAudios', 'sectionTranscripts', 'questionAudios', 'questionTranscripts', 'speakingImages'];
    for (const field of arrayFileFields) {
      if (uploadedFiles[field] && Array.isArray(uploadedFiles[field])) {
        const hasData = uploadedFiles[field].some((f: any) => f?.data);
        if (hasData) {
          uploadedFiles[field] = await uploadFilesToStorage(uploadedFiles[field]);
        }
      }
    }
    
    const newSize = JSON.stringify(uploadedFiles).length;
    console.log(`uploadedFiles new size after storage upload: ${(newSize / 1024).toFixed(2)} KB`);
    
    return JSON.stringify(uploadedFiles);
  } catch (error) {
    console.error('Error processing uploadedFiles:', error);
    return uploadedFilesStr; // Return original on error
  }
};

// Get all materials
export const getMaterials = async (): Promise<Material[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      MATERIALS_COLLECTION_ID,
      [Query.orderDesc("$createdAt"), Query.limit(1000)]
    );
    return response.documents as unknown as Material[];
  } catch (error) {
    console.error("Error fetching materials:", error);
    return [];
  }
};

// Create new material - with automatic file storage handling
export const createMaterial = async (material: Omit<Material, "$id">): Promise<Material | null> => {
  try {
    // Process uploadedFiles - upload large files to storage if needed
    let processedMaterial = { ...material };
    
    if (material.uploadedFiles) {
      console.log('Processing uploadedFiles before create...');
      processedMaterial.uploadedFiles = await processUploadedFiles(material.uploadedFiles);
    }
    
    // Final size check
    const dataSize = JSON.stringify(processedMaterial).length;
    console.log(`Final document size: ${(dataSize / 1024).toFixed(2)} KB`);
    
    if (dataSize > 900 * 1024) { // 900KB safety limit
      throw new Error(`Document size (${(dataSize / 1024).toFixed(0)} KB) is too large. Please use smaller files or fewer questions.`);
    }
    
    const response = await databases.createDocument(
      DATABASE_ID,
      MATERIALS_COLLECTION_ID,
      ID.unique(),
      processedMaterial
    );
    
    console.log('✓ Material created successfully:', response.$id);
    return response as unknown as Material;
  } catch (error: any) {
    console.error("Error creating material:", error);
    
    // Provide more helpful error messages
    if (error.message?.includes('size') || error.code === 400) {
      throw new Error('Data is too large for the database. Try using smaller images or uploading fewer files at once.');
    }
    
    throw error;
  }
};

// Update material - with automatic file storage handling
export const updateMaterial = async (id: string, material: Partial<Material>): Promise<Material | null> => {
  try {
    const { $id, $createdAt, $updatedAt, $permissions, $collectionId, $databaseId, ...updateData } = material as any;
    
    // Process uploadedFiles if present
    if (updateData.uploadedFiles) {
      console.log('Processing uploadedFiles before update...');
      updateData.uploadedFiles = await processUploadedFiles(updateData.uploadedFiles);
    }
    
    // Final size check
    const dataSize = JSON.stringify(updateData).length;
    console.log(`Final update size: ${(dataSize / 1024).toFixed(2)} KB`);
    
    if (dataSize > 900 * 1024) {
      throw new Error(`Update data size (${(dataSize / 1024).toFixed(0)} KB) is too large.`);
    }
    
    const response = await databases.updateDocument(
      DATABASE_ID,
      MATERIALS_COLLECTION_ID,
      id,
      updateData
    );
    
    console.log('✓ Material updated successfully:', id);
    return response as unknown as Material;
  } catch (error: any) {
    console.error("Error updating material:", error);
    
    if (error.message?.includes('size') || error.code === 400) {
      throw new Error('Data is too large for the database. Try using smaller images.');
    }
    
    throw error;
  }
};

// Delete material (and associated storage files)
export const deleteMaterial = async (id: string): Promise<boolean> => {
  try {
    // Optional: Delete associated files from storage
    // You could fetch the material first, parse uploadedFiles, and delete storage files
    
    await databases.deleteDocument(
      DATABASE_ID,
      MATERIALS_COLLECTION_ID,
      id
    );
    
    console.log('✓ Material deleted:', id);
    return true;
  } catch (error) {
    console.error("Error deleting material:", error);
    return false;
  }
};

// Helper: Get file URL from storage (for displaying files)
export const getFileUrl = (storageId: string): string => {
  if (!storageId) return '';
  return storage.getFileView(BUCKET_ID, storageId).toString();
};

// Helper: Get file preview URL (for images)
export const getFilePreview = (storageId: string, width?: number, height?: number): string => {
  if (!storageId) return '';
  return storage.getFilePreview(BUCKET_ID, storageId, width, height).toString();
};
