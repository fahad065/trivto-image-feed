import mongoose, { Schema } from "mongoose";

export interface LikeDocument {
  photoId: string;
  createdAt: Date;
}

const LikeSchema = new Schema<LikeDocument>({
  photoId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

// Reuse the compiled model across hot reloads instead of redefining it.
export const Like =
  mongoose.models.Like ?? mongoose.model<LikeDocument>("Like", LikeSchema);
