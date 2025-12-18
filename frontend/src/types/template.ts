export interface Template {
  _id: string;
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
  };
  metadata: {
    author: string;
    version: number;
    status: 'draft' | 'approved' | 'deprecated';
    lastModified: string;
    checksum: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVersion {
  _id: string;
  templateId: string;
  versionNumber: number;
  changeDescription: string;
  file: {
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
    url: string;
  };
  metadata: {
    author: string;
    status: 'draft' | 'approved' | 'deprecated';
    checksum: string;
  };
  createdAt: string;
}

export interface CreateTemplateData {
  name: string;
  description: string;
  category: string;
  department: string;
  tags: string[];
  file: File; // Для загрузки файла
}