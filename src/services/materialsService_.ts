// src/services/materialsService.ts
import { databases, DATABASE_ID, MATERIALS_COLLECTION_ID } from "../appwrite";
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

// Get all materials
export const getMaterials = async (): Promise<Material[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      MATERIALS_COLLECTION_ID,
      [Query.orderDesc("$createdAt"), Query.limit(100)]
    );
    return response.documents as unknown as Material[];
  } catch (error) {
    console.error("Error fetching materials:", error);
    return [];
  }
};

// Create new material
export const createMaterial = async (material: Omit<Material, "$id">): Promise<Material | null> => {
  try {
    const response = await databases.createDocument(
      DATABASE_ID,
      MATERIALS_COLLECTION_ID,
      ID.unique(),
      material
    );
    return response as unknown as Material;
  } catch (error) {
    console.error("Error creating material:", error);
    throw error;
  }
};

// Update material
export const updateMaterial = async (id: string, material: Partial<Material>): Promise<Material | null> => {
  try {
    const { $id, $createdAt, $updatedAt, $permissions, $collectionId, $databaseId, ...updateData } = material as any;
    const response = await databases.updateDocument(
      DATABASE_ID,
      MATERIALS_COLLECTION_ID,
      id,
      updateData
    );
    return response as unknown as Material;
  } catch (error) {
    console.error("Error updating material:", error);
    throw error;
  }
};

// Delete material
export const deleteMaterial = async (id: string): Promise<boolean> => {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      MATERIALS_COLLECTION_ID,
      id
    );
    return true;
  } catch (error) {
    console.error("Error deleting material:", error);
    return false;
  }
};