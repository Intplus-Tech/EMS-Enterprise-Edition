import mongoose, { Schema } from "mongoose";

const DepartmentSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: false },
    // Departmental approver surfaced in the Admin Edit Department modal.
    headUserId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Department = mongoose.models.Department || mongoose.model("Department", DepartmentSchema);
