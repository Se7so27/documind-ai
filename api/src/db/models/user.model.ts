import mongoose, { Schema } from "mongoose";

export interface UserDocument extends mongoose.Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["SUPER_ADMIN", "COMPANY_ADMIN", "EMPLOYEE"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "pending"],
      default: "active",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const record = ret as Record<string, unknown> & { _id?: unknown; __v?: number };
        record.id = record._id?.toString?.() ?? "";
        delete record._id;
        delete record.__v;
        delete record.passwordHash;
        return record;
      },
    },
  }
);

const UserModel = mongoose.model<UserDocument>("User", userSchema);

export default UserModel;
