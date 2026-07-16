import mongoose, { Schema } from "mongoose";
import { SystemRole } from "../enums/roles";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: Object.values(SystemRole), required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: false },
    isActive: { type: Boolean, default: true },
    passwordHash: { type: String, required: true },
    inviteToken: { type: String, required: false },
    inviteExpires: { type: Date, required: false },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
