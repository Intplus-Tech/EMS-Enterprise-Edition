import mongoose, { Schema } from "mongoose";
import { LogType } from "../enums/logTypes";
import { SystemRole } from "../enums/roles";

const LogSchema = new Schema(
  {
    type: { type: String, enum: Object.values(LogType), required: true },
    action: { type: String, required: true }, // e.g. "USER_LOGIN", "BUDGET_OVERRUN", "PAYMENT_RELEASED"
    message: { type: String, required: true },
    details: { type: Schema.Types.Mixed }, // JSON payload with error stacks or diff state
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    actorName: { type: String, required: false },
    actorRole: { type: String, enum: Object.values(SystemRole), required: false },
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Log = mongoose.models.Log || mongoose.model("Log", LogSchema);
