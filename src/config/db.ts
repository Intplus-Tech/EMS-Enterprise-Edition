import mongoose from "mongoose";
import { ENV } from "./env";

// Ensure all models are registered on initial database connection
import "../models/Department";
import "../models/User";
import "../models/BudgetPeriod";
import "../models/ExpenseRequest";
import "../models/Log";
import "../models/WorkflowConfig";
import "../models/RolePermission";

const MONGODB_URI = ENV.MONGODB_URI;

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log("=> New MongoDB Connection Established");
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
