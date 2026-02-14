import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fetchAuthSession } from 'aws-amplify/auth';

const region = import.meta.env.VITE_AWS_REGION;
const bucketName = import.meta.env.VITE_S3_PROFILE_BUCKET;

// Get S3 client with Cognito credentials
const getS3Client = async () => {
  try {
    const session = await fetchAuthSession();
    const credentials = session.credentials;

    if (!credentials) {
      throw new Error('No AWS credentials available.');
    }

    const client = new S3Client({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId!,
        secretAccessKey: credentials.secretAccessKey!,
        sessionToken: credentials.sessionToken,
      },
    });

    return client;
  } catch (error: any) {
    console.error('Error getting S3 client:', error);
    if (error.message?.includes('Identity Pool') || !error.message) {
      throw new Error('S3 access requires a Cognito Identity Pool.');
    }
    throw error;
  }
};


export async function uploadProfilePicture(
  userId: string,
  imageBlob: Blob,
  contentType: string = 'image/jpeg'
): Promise<string> {
  try {
    if (!bucketName) {
      throw new Error('S3 bucket name not configured');
    }

    const client = await getS3Client();
    const key = `profile-pictures/${userId}.jpg`;

    const arrayBuffer = await imageBlob.arrayBuffer();
    const body = new Uint8Array(arrayBuffer);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await client.send(command);

    // Construct the public URL
    const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
    
    return publicUrl;
  } catch (error: any) {
    console.error('Error uploading profile picture to S3:', error);
    
    if (error.name === 'NoSuchBucket') {
      throw new Error('S3 bucket not found. Please ensure the bucket exists.');
    } else if (error.name === 'AccessControlListNotSupported') {
      throw new Error('Bucket does not allow ACLs.');
    } else if (error.name === 'AccessDeniedException' || error.name === 'UnauthorizedOperation') {
      throw new Error('Access denied. ');
    } else if (error.message?.includes('credentials')) {
      throw new Error('Authentication error. Please log in again.');
    }
    
    throw new Error(`Failed to upload profile picture: ${error.message || 'Unknown error'}`);
  }
}


export function canvasToBlob(canvas: HTMLCanvasElement, quality: number = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}

