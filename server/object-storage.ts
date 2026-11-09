import "./env.ts";
import fs from "fs";
import path from "path";

export interface StoredFileMetadata {
  key: string;
  originalName: string;
  bucket: string;
  contentType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

class ObjectStorageService {
  private bucketName: string = "formease-storage";
  private localStorageDir: string = "";
  private s3Endpoint: string = "";
  private s3Region: string = "";
  private accessKeyId: string = "";
  private secretAccessKey: string = "";

  constructor() {
    this.refreshConfig();
    this.ensureDirectory();
  }

  public refreshConfig() {
    this.bucketName = process.env.OBJECT_STORAGE_BUCKET || process.env.S3_BUCKET_NAME || "formease-storage";
    this.s3Endpoint = process.env.S3_ENDPOINT || "https://s3.us-east-1.amazonaws.com";
    this.s3Region = process.env.S3_REGION || "us-east-1";
    this.accessKeyId = process.env.S3_ACCESS_KEY_ID || "";
    this.secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || "";
    this.localStorageDir = path.resolve(process.cwd(), "storage", this.bucketName);
  }

  private ensureDirectory() {
    try {
      if (!fs.existsSync(this.localStorageDir)) {
        fs.mkdirSync(this.localStorageDir, { recursive: true });
      }
    } catch (err) {
      console.warn("[Object Storage] Could not initialize local storage directory:", err);
    }
  }

  public getStatus() {
    const isS3Configured = Boolean(
      this.accessKeyId &&
      !this.accessKeyId.includes("placeholder") &&
      !this.accessKeyId.includes("your_object_storage")
    );

    let fileCount = 0;
    try {
      if (fs.existsSync(this.localStorageDir)) {
        fileCount = fs.readdirSync(this.localStorageDir).filter(f => !f.endsWith(".meta.json")).length;
      }
    } catch (_) {}

    return {
      bucket: this.bucketName,
      provider: isS3Configured ? "S3-Compatible Remote Bucket" : "Local Bucket Mirror (formease-storage)",
      region: this.s3Region,
      endpoint: this.s3Endpoint,
      isS3Configured,
      cachedFiles: fileCount
    };
  }

  /**
   * Uploads a file (Buffer or Base64 string) to the formease-storage bucket
   */
  public async upload(
    filename: string,
    content: Buffer | string,
    contentType: string = "application/octet-stream"
  ): Promise<StoredFileMetadata> {
    this.ensureDirectory();

    const buffer = typeof content === "string" 
      ? Buffer.from(content.replace(/^data:[^;]+;base64,/, ""), "base64")
      : content;

    const sanitizedName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueKey = `${Date.now()}-${sanitizedName}`;
    const filePath = path.join(this.localStorageDir, uniqueKey);
    const metaPath = path.join(this.localStorageDir, `${uniqueKey}.meta.json`);

    // Write to local bucket cache
    fs.writeFileSync(filePath, buffer);

    const publicUrl = process.env.OBJECT_STORAGE_PUBLIC_URL 
      ? `${process.env.OBJECT_STORAGE_PUBLIC_URL.replace(/\/$/, "")}/${uniqueKey}`
      : `/api/storage/files/${uniqueKey}`;

    const metadata: StoredFileMetadata = {
      key: uniqueKey,
      originalName: filename,
      bucket: this.bucketName,
      contentType,
      size: buffer.length,
      url: publicUrl,
      uploadedAt: new Date().toISOString()
    };

    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), "utf8");

    // If remote S3 credentials are provided, sync to remote S3
    if (this.accessKeyId && !this.accessKeyId.includes("your_object_storage")) {
      try {
        console.log(`[Object Storage] Syncing ${uniqueKey} to S3 bucket '${this.bucketName}'...`);
        // We attempt standard S3 PUT REST call
        const s3Url = `${this.s3Endpoint.replace(/\/$/, "")}/${this.bucketName}/${uniqueKey}`;
        await fetch(s3Url, {
          method: "PUT",
          headers: {
            "Content-Type": contentType,
            "x-amz-acl": "public-read"
          },
          body: buffer
        }).catch(e => console.warn("[Object Storage] S3 PUT upload note:", e.message));
      } catch (e: any) {
        console.warn("[Object Storage] Remote S3 sync note:", e.message);
      }
    }

    return metadata;
  }

  /**
   * Reads a file from the formease-storage bucket
   */
  public getFile(key: string): { buffer: Buffer; contentType: string; metadata?: StoredFileMetadata } | null {
    const safeKey = path.basename(key);
    const filePath = path.join(this.localStorageDir, safeKey);
    const metaPath = path.join(this.localStorageDir, `${safeKey}.meta.json`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const buffer = fs.readFileSync(filePath);
    let metadata: StoredFileMetadata | undefined;
    let contentType = "application/octet-stream";

    if (fs.existsSync(metaPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        if (metadata?.contentType) {
          contentType = metadata.contentType;
        }
      } catch (_) {}
    }

    return { buffer, contentType, metadata };
  }

  /**
   * List files in the formease-storage bucket
   */
  public listFiles(): StoredFileMetadata[] {
    this.ensureDirectory();
    try {
      const files = fs.readdirSync(this.localStorageDir);
      const metaFiles = files.filter(f => f.endsWith(".meta.json"));
      return metaFiles.map(metaFile => {
        const raw = fs.readFileSync(path.join(this.localStorageDir, metaFile), "utf8");
        return JSON.parse(raw) as StoredFileMetadata;
      });
    } catch (_) {
      return [];
    }
  }
}

export const objectStorage = new ObjectStorageService();
