import mongoose, { Schema } from "mongoose";
import { RequestStatus } from "../enums/statuses";

/**
 * What a deletion changed elsewhere in the system, so Restore can put it back.
 *
 * Deleting a department cascades — it cancels in-flight requests and strips the
 * department from its users (`designs/system-admin/Admin_ Delete Department
 * Modal.png`). The same design leaves the row restorable, so every cascaded
 * change is recorded here rather than being applied and forgotten.
 */
const PendingDeletionSchema = new Schema(
  {
    requestedAt: { type: Date, default: Date.now },
    requestedById: { type: Schema.Types.ObjectId, ref: "User" },
    requestedByName: { type: String },
    /** Users whose `departmentId` was cleared and must be re-assigned on restore. */
    revokedUserIds: { type: [Schema.Types.ObjectId], default: [] },
    /** Requests cancelled by the deletion, with the state to rewind them to. */
    cancelledRequests: {
      type: [
        new Schema(
          {
            requestId: { type: Schema.Types.ObjectId, ref: "ExpenseRequest", required: true },
            previousStatus: { type: String, enum: Object.values(RequestStatus), required: true },
            previousStepIndex: { type: Number, default: 0 },
            /** Whether the amount was reserved in the period, so restore re-reserves it. */
            budgetWasLocked: { type: Boolean, default: false },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { _id: false }
);

const DepartmentSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: false },
    // Departmental approver surfaced in the Admin Edit Department modal.
    headUserId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    isActive: { type: Boolean, default: true },
    // Present only while the department sits in the "Pending Deletion" state.
    pendingDeletion: { type: PendingDeletionSchema, required: false, default: undefined },
  },
  { timestamps: true }
);

export const Department = mongoose.models.Department || mongoose.model("Department", DepartmentSchema);
