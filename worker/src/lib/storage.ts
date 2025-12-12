import { Client } from 'minio';

const minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const BUCKET_NAME = 'test-artifacts';

export async function ensureBucket(): Promise<void> {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
        await minioClient.makeBucket(BUCKET_NAME);
        console.log(`Created bucket: ${BUCKET_NAME}`);
    }
}

export async function uploadArtifact(
    runId: string,
    filename: string,
    filePath: string
): Promise<string> {
    const objectName = `${runId}/${filename}`;
    await minioClient.fPutObject(BUCKET_NAME, objectName, filePath);

    // Generate presigned URL for viewing (valid for 7 days)
    const url = await minioClient.presignedGetObject(BUCKET_NAME, objectName, 7 * 24 * 60 * 60);
    return url;
}

export async function uploadBuffer(
    runId: string,
    filename: string,
    buffer: Buffer,
    contentType: string = 'application/octet-stream'
): Promise<string> {
    const objectName = `${runId}/${filename}`;
    await minioClient.putObject(BUCKET_NAME, objectName, buffer, buffer.length, {
        'Content-Type': contentType
    });

    const url = await minioClient.presignedGetObject(BUCKET_NAME, objectName, 7 * 24 * 60 * 60);
    return url;
}

export { minioClient, BUCKET_NAME };
