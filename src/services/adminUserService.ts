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
  const execution = await functions.createExecution({
    functionId: import.meta.env.VITE_APPWRITE_CREATE_ADMIN_USER_FUNCTION_ID,
    body: JSON.stringify(payload),
    async: false,
    path: "/",
    method: ExecutionMethod.POST,
    headers: {
      "Content-Type": "application/json",
    },
  });

  const body = execution.responseBody ? JSON.parse(execution.responseBody) : {};

  if (execution.responseStatusCode >= 400 || !body.success) {
    throw new Error(body.message || "Failed to create admin user");
  }

  return body;
};