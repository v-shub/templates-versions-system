import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface StorageConfig {
  type: 'local' | 's3';
  local?: {
    uploadPath: string;
    baseUrl: string;
  };
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
  };
}

export class FileStorageService {
  private config: StorageConfig;
  private s3: any = null;

  constructor(config: StorageConfig) {
    this.config = config;
    
    if (config.type === 's3' && config.s3) {
      const AWS = require('aws-sdk');
      
      console.log('Configuring S3 client for Yandex Cloud...');
      console.log('Bucket:', config.s3.bucket);
      console.log('Region:', config.s3.region);
      console.log('Endpoint:', config.s3.endpoint);
      
      const s3Config: any = {
        region: config.s3.region,
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
        endpoint: config.s3.endpoint,
        s3ForcePathStyle: true, 
        signatureVersion: 'v4',
        apiVersion: '2006-03-01'
      };

      this.s3 = new AWS.S3(s3Config);
      console.log('S3 client configured successfully');
    }
  }

  // Метод для проверки подключения
  async testConnection(): Promise<boolean> {
    if (this.config.type !== 's3' || !this.s3) {
      console.log('Storage type is not S3');
      return false;
    }

    try {
      await this.s3.headBucket({
        Bucket: this.config.s3!.bucket
      }).promise();
      console.log('✅ Successfully connected to Yandex Object Storage');
      return true;
    } catch (error: any) {
      console.error('❌ Connection test failed:', error.message);
      console.error('Error code:', error.code);
      return false;
    }
  }
  async uploadFile(file: Express.Multer.File): Promise<{
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
    url: string;
    checksum: string;
  }> {
    const checksum = this.calculateChecksum(file.buffer);
    const storedName = this.generateFileName(file.originalname);

    if (this.config.type === 'local' && this.config.local) {
      return this.uploadToLocal(file, storedName, checksum);
    } else if (this.config.type === 's3' && this.s3 && this.config.s3) {
      return this.uploadToS3(file, storedName, checksum);
    } else {
      throw new Error('Storage configuration is invalid');
    }
  }

  private async uploadToLocal(
    file: Express.Multer.File, 
    storedName: string, 
    checksum: string
  ) {
    const uploadPath = this.config.local!.uploadPath;
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const filePath = path.join(uploadPath, storedName);
    fs.writeFileSync(filePath, file.buffer);

    return {
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      size: file.size,
      url: `${this.config.local!.baseUrl}/files/${storedName}`,
      checksum
    };
  }

  private async uploadToS3(
    file: Express.Multer.File, 
    storedName: string, 
    checksum: string
  ) {
    const params = {
      Bucket: this.config.s3!.bucket,
      Key: storedName,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        checksum
      }
    };

    const result = await this.s3.upload(params).promise();

    return {
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      size: file.size,
      url: result.Location,
      checksum
    };
  }

  async deleteFile(storedName: string): Promise<void> {
    if (this.config.type === 'local' && this.config.local) {
      const filePath = path.join(this.config.local.uploadPath, storedName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } else if (this.config.type === 's3' && this.s3 && this.config.s3) {
      await this.s3.deleteObject({
        Bucket: this.config.s3.bucket,
        Key: storedName
      }).promise();
    }
  }

  private calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(originalName);
    return `${timestamp}-${randomString}${extension}`;
  }
}