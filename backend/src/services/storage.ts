import { Client } from 'minio';
import fs from 'fs';

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

const BUCKET_NAME = process.env.MINIO_BUCKET || 'deepread-documents';

export class StorageService {
  async ensureBucket(): Promise<void> {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME);
      
      // Set CORS policy for browser access
      const corsPolicy = [{
        allowedOrigins: ['*'],
        allowedMethods: ['GET', 'HEAD'],
        allowedHeaders: ['*'],
        maxAgeSeconds: 3600
      }];
      
      try {
        await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
            }
          ]
        }));
      } catch (e) {
        console.log('Policy may already exist');
      }
    }
  }

  async uploadFile(key: string, filePath: string, contentType: string): Promise<void> {
    await this.ensureBucket();
    await minioClient.fPutObject(BUCKET_NAME, key, filePath, {
      'Content-Type': contentType
    });
  }

  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.ensureBucket();
    await minioClient.putObject(BUCKET_NAME, key, buffer, buffer.length, {
      'Content-Type': contentType
    });
  }

  async getSignedUrl(key: string, expirySeconds: number = 3600): Promise<string> {
    return await minioClient.presignedGetObject(BUCKET_NAME, key, expirySeconds);
  }

  async deleteFile(key: string): Promise<void> {
    await minioClient.removeObject(BUCKET_NAME, key);
  }

  async getFileStream(key: string): Promise<any> {
    return await minioClient.getObject(BUCKET_NAME, key);
  }
}

export const storageService = new StorageService();
