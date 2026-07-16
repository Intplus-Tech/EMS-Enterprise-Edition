import mongoose, { Schema } from "mongoose";

const DepartmentSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: false },
  },
  { timestamps: true }
);

export const Department = mongoose.models.Department || mongoose.model("Department", DepartmentSchema);
