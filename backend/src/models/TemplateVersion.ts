import mongoose, { Document, Schema } from 'mongoose';

export interface ITemplateVersion extends Document {
  templateId: mongoose.Types.ObjectId;
  version: number;
  changes: string;
  file: {
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
    url: string;
    checksum?: string;
  };
  metadata: {
    author: string;
    status: string;
    created: Date;
  };
}

const TemplateVersionSchema: Schema = new Schema({
  templateId: { type: Schema.Types.ObjectId, ref: 'Template', required: true },
  version: { type: Number, required: true },
  changes: { type: String, required: true },
  file: {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    checksum: { type: String, required: true }
  },
  metadata: {
    author: { type: String, required: true },
    status: { type: String, required: true },
    created: { type: Date, default: Date.now }
  }
}, { timestamps: true });

export default mongoose.model('TemplateVersion', TemplateVersionSchema);