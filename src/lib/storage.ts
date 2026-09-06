import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs/promises";
import path from "path";

const S3_BUCKET = process.env.S3_BUCKET || "";
const S3_REGION = process.env.S3_REGION || "us-east-1";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || "";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || "";
const S3_ENDPOINT = process.env.S3_ENDPOINT || undefined;
const LOCAL_STORAGE_PATH =
  process.env.LOCAL_STORAGE_PATH || "./storage";
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export type StorageProvider = "s3" | "local";

export interface StorageConfig {
  provider: StorageProvider;
  bucket?: string;
  basePath?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
  provider: StorageProvider;
}

export interface StorageFile {
  key: string;
  name: string;
  size: number;
  contentType: string;
  lastModified: Date;
  etag: string;
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
      },
      endpoint: S3_ENDPOINT,
      forcePathStyle: !!S3_ENDPOINT,
    });
  }
  return s3Client;
}

function getConfig(): StorageConfig {
  const provider: StorageProvider =
    S3_BUCKET && S3_ACCESS_KEY ? "s3" : "local";
  return {
    provider,
    bucket: S3_BUCKET,
    basePath: provider === "local" ? LOCAL_STORAGE_PATH : undefined,
  };
}

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".zip": "application/zip",
    ".json": "application/json",
    ".txt": "text/plain",
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".ts": "application/typescript",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

function generateKey(
  prefix: string,
  filename: string,
  folder?: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(filename);
  const baseName = path.basename(filename, ext)
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase();
  const parts = [prefix, folder, `${timestamp}-${random}-${baseName}${ext}`].filter(Boolean);
  return parts.join("/");
}

// S3 operations
async function s3Upload(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<UploadResult> {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return {
    key,
    url: `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`,
    size: buffer.length,
    contentType,
    provider: "s3",
  };
}

async function s3Download(key: string): Promise<Buffer> {
  const client = getS3Client();
  const response = await client.send(
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key })
  );
  const chunks: Uint8Array[] = [];
  const stream = response.Body;
  if (stream && typeof stream.transformToByteArray === "function") {
    const bytes = await stream.transformToByteArray();
    return Buffer.from(bytes);
  }
  throw new Error("Failed to download file from S3");
}

async function s3Delete(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key })
  );
}

async function s3Exists(key: string): Promise<boolean> {
  const client = getS3Client();
  try {
    await client.send(
      new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key })
    );
    return true;
  } catch {
    return false;
  }
}

async function s3List(
  prefix: string,
  maxKeys = 100
): Promise<StorageFile[]> {
  const client = getS3Client();
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: prefix,
      MaxKeys: maxKeys,
    })
  );

  return (response.Contents || []).map((item) => ({
    key: item.Key!,
    name: path.basename(item.Key!),
    size: item.Size || 0,
    contentType: "",
    lastModified: item.LastModified || new Date(),
    etag: item.ETag || "",
  }));
}

async function s3PresignedUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn });
}

async function s3PresignedUpload(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn });
}

async function s3Copy(
  sourceKey: string,
  destKey: string
): Promise<void> {
  const client = getS3Client();
  await client.send(
    new CopyObjectCommand({
      Bucket: S3_BUCKET,
      CopySource: `${S3_BUCKET}/${sourceKey}`,
      Key: destKey,
    })
  );
}

// Local storage operations
async function localEnsureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function localUpload(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<UploadResult> {
  const filePath = path.join(LOCAL_STORAGE_PATH, key);
  await localEnsureDir(path.dirname(filePath));
  await fs.writeFile(filePath, buffer);

  return {
    key,
    url: `/api/storage/${key}`,
    size: buffer.length,
    contentType,
    provider: "local",
  };
}

async function localDownload(key: string): Promise<Buffer> {
  const filePath = path.join(LOCAL_STORAGE_PATH, key);
  return fs.readFile(filePath);
}

async function localDelete(key: string): Promise<void> {
  const filePath = path.join(LOCAL_STORAGE_PATH, key);
  await fs.unlink(filePath);
}

async function localExists(key: string): Promise<boolean> {
  const filePath = path.join(LOCAL_STORAGE_PATH, key);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function localList(
  prefix: string,
  maxKeys = 100
): Promise<StorageFile[]> {
  const dirPath = path.join(LOCAL_STORAGE_PATH, prefix);
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files: StorageFile[] = [];
    for (const entry of entries.slice(0, maxKeys)) {
      if (entry.isFile()) {
        const filePath = path.join(dirPath, entry.name);
        const stat = await fs.stat(filePath);
        files.push({
          key: path.join(prefix, entry.name),
          name: entry.name,
          size: stat.size,
          contentType: getContentType(entry.name),
          lastModified: stat.mtime,
          etag: "",
        });
      }
    }
    return files;
  } catch {
    return [];
  }
}

// Unified API
export async function uploadFile(
  file: Buffer,
  filename: string,
  folder?: string,
  prefix = "uploads"
): Promise<UploadResult> {
  if (file.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const config = getConfig();
  const key = generateKey(prefix, filename, folder);
  const contentType = getContentType(filename);

  if (config.provider === "s3") {
    return s3Upload(key, file, contentType);
  }
  return localUpload(key, file, contentType);
}

export async function downloadFile(key: string): Promise<Buffer> {
  const config = getConfig();
  if (config.provider === "s3") {
    return s3Download(key);
  }
  return localDownload(key);
}

export async function deleteFile(key: string): Promise<void> {
  const config = getConfig();
  if (config.provider === "s3") {
    return s3Delete(key);
  }
  return localDelete(key);
}

export async function fileExists(key: string): Promise<boolean> {
  const config = getConfig();
  if (config.provider === "s3") {
    return s3Exists(key);
  }
  return localExists(key);
}

export async function listFiles(
  prefix: string,
  maxKeys = 100
): Promise<StorageFile[]> {
  const config = getConfig();
  if (config.provider === "s3") {
    return s3List(prefix, maxKeys);
  }
  return localList(prefix, maxKeys);
}

export async function getPresignedUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const config = getConfig();
  if (config.provider === "s3") {
    return s3PresignedUrl(key, expiresIn);
  }
  return `/api/storage/${key}`;
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const config = getConfig();
  if (config.provider === "s3") {
    return s3PresignedUpload(key, contentType, expiresIn);
  }
  return `/api/storage/upload?key=${encodeURIComponent(key)}`;
}

export async function copyFile(
  sourceKey: string,
  destKey: string
): Promise<void> {
  const config = getConfig();
  if (config.provider === "s3") {
    return s3Copy(sourceKey, destKey);
  }
  const buffer = await localDownload(sourceKey);
  const contentType = getContentType(sourceKey);
  await localUpload(destKey, buffer, contentType);
}

// Course content helpers
export async function uploadCourseContent(
  courseId: string,
  file: Buffer,
  filename: string,
  type: "video" | "document" | "image" | "archive" = "document"
): Promise<UploadResult> {
  const folderMap = {
    video: "videos",
    document: "documents",
    image: "images",
    archive: "archives",
  };
  return uploadFile(file, filename, `${courseId}/${folderMap[type]}`, "courses");
}

export async function uploadUserAvatar(
  userId: string,
  file: Buffer,
  filename: string
): Promise<UploadResult> {
  return uploadFile(file, filename, userId, "avatars");
}

export async function uploadCertificate(
  courseId: string,
  userId: string,
  file: Buffer,
  filename: string
): Promise<UploadResult> {
  return uploadFile(file, filename, `${courseId}/${userId}`, "certificates");
}
