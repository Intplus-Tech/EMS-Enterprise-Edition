import mongoose, { Schema } from "mongoose";
import { SystemRole } from "../enums/roles";
import { PermissionAction, PermissionResource } from "../enums/permissions";

/**
 * Persisted grid backing the Admin role permissions matrix.
 *
 * One document per role; `grants` maps a resource to the actions that role may
 * perform. Read by `PermissionService` on every guarded API call, so the shape
 * is intentionally flat (a single findOne, no joins).
 */
const RolePermissionSchema = new Schema(
  {
    role: {
      type: String,
      enum: Object.values(SystemRole),
      required: true,
      unique: true,
    },
    // Map<resource, action[]> — Mongoose Map keeps the document self-describing
    // as new resources are added without a migration.
    grants: {
      type: Map,
      of: [{ type: String, enum: Object.values(PermissionAction) }],
      default: {},
    },
    // Admin-facing description shown in the Edit Role modal.
    description: { type: String, required: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/** Convenience for building a fully-denied grant map. */
export function emptyGrants(): Record<PermissionResource, PermissionAction[]> {
  return Object.values(PermissionResource).reduce((acc, resource) => {
    acc[resource] = [];
    return acc;
  }, {} as Record<PermissionResource, PermissionAction[]>);
}

export const RolePermission =
  mongoose.models.RolePermission || mongoose.model("RolePermission", RolePermissionSchema);
