import { ExecutionMethod } from "appwrite";
import { functions } from "../appwrite";

type CreateAdminUserPayload = {
  name: string;
  email: string;
  password: string;
  role: string;
  accountStatus: string;
  emailVerified: boolean;
};

export const createAdminUser = async (payload: CreateAdminUserPayload) => {
  const functionId = import.meta.env.VITE_APPWRITE_CREATE_ADMIN_USER_FUNCTION_ID;

  if (!functionId) {
    throw new Error("Missing VITE_APPWRITE_CREATE_ADMIN_USER_FUNCTION_ID");
  }

  const execution = await functions.createExecution({
    functionId,
    body: JSON.stringify(payload),
    async: false,
    path: "/",
    method: ExecutionMethod.POST,
    headers: {
      "Content-Type": "application/json",
    },
  });

  let body: any = {};
  try {
    body = execution.responseBody ? JSON.parse(execution.responseBody) : {};
  } catch {
    body = {};
  }

  if (execution.responseStatusCode >= 400 || !body.success) {
    throw new Error(
      body.message || `Function failed with status ${execution.responseStatusCode}`
    );
  }

  return body;
};