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
    officialContact: { type: String, required: false },
    personalContact: { type: String, required: false },
    avatar: { type: String, required: false },
    inviteToken: { type: String, required: false },
    inviteExpires: { type: Date, required: false },
    resetCode: { type: String, required: false },
    resetCodeExpires: { type: Date, required: false },
    // Any session issued before this instant is rejected. Bumping it is how an
    // admin force-signs-out a user, since JWTs are otherwise valid until expiry.
    sessionsValidFrom: { type: Date, required: false },
    // The one session this account is allowed to hold. Each sign-in mints a new
    // id and stores it here; `assertSessionNotRevoked` rejects any token
    // carrying a different one, so signing in anywhere displaces the previous
    // device rather than running alongside it. Cleared on logout and on an
    // admin force-log-out.
    activeSessionId: { type: String, required: false },
    // Notifications are derived from expense history rather than stored, so only
    // the per-user read/dismissed state needs persisting. Kept on the user so it
    // follows them across devices instead of living in one browser's storage.
    notificationsRead: { type: [String], default: [] },
    notificationsDismissed: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
