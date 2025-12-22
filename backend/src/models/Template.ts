import mongoose, { Document, Schema } from 'mongoose';

export interface ITemplate extends Document {
  name: string;
  description: string;
  category: string;
  department: string;
  tags: string[];
  file: {
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
    url: string;
    checksum: string;
  };
  metadata: {
    author: string;
    version: number;
    status: 'draft' | 'approved' | 'deprecated';
    lastModified: Date;
    checksum: string;
  };
}

const TemplateSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  department: { type: String, required: true },
  tags: [{ type: String }],
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
    version: { type: Number, default: 1 },
    status: { 
      type: String, 
      enum: ['draft', 'approved', 'deprecated'],
      default: 'draft'
    },
    lastModified: { type: Date, default: Date.now },
    checksum: { type: String, required: true }
  }
}, { timestamps: true });

export default mongoose.model('Template', TemplateSchema);