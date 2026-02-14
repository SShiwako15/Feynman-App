import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { fetchAuthSession, updateUserAttributes } from 'aws-amplify/auth';

const region = import.meta.env.VITE_AWS_REGION;
const tableName = import.meta.env.VITE_DYNAMODB_PROFILE_TABLE;

//DynamoDB client
const getDynamoDBClient = async () => {
  try {
    const session = await fetchAuthSession();
    const credentials = session.credentials;

    if (!credentials) {
      throw new Error('No AWS credentials available.');
    }

    const client = new DynamoDBClient({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId!,
        secretAccessKey: credentials.secretAccessKey!,
        sessionToken: credentials.sessionToken,
      },
    });

    return DynamoDBDocumentClient.from(client);
  } catch (error: any) {
    console.error('Error getting DynamoDB client:', error);
    if (error.message?.includes('Identity Pool') || !error.message) {
      throw new Error('DynamoDB access requires a Cognito Identity Pool.');
    }
    throw error;
  }
};

export interface ProfileData {
  userID: string;
  email: string;
  name: string;
  subject?: string;
  avatar?: string;
  updatedAt: string;
}


export async function saveProfile(userID: string, profileData: {
  email: string;
  name: string;
  subject?: string;
  avatar?: string;
}): Promise<void> {
  try {
    const client = await getDynamoDBClient();

    const item: ProfileData = {
      userID,
      email: profileData.email,
      name: profileData.name,
      subject: profileData.subject || '',
      avatar: profileData.avatar || '',
      updatedAt: new Date().toISOString(),
    };

    const command = new PutCommand({
      TableName: tableName,
      Item: item,
    });

    await client.send(command);

    // Update Cognito user attributes (name)
    try {
      await updateUserAttributes({
        userAttributes: {
          name: profileData.name,
        },
      });
    } catch (cognitoError: any) {
      console.warn('Failed to update Cognito attributes (non-critical):', cognitoError);
      // Don't throw - DynamoDB save succeeded, Cognito update is secondary
    }
  } catch (error: any) {
    console.error('Error saving profile to DynamoDB:', error);
    
    // Provide user-friendly error messages
    if (error.name === 'ResourceNotFoundException') {
      throw new Error('DynamoDB table not found.');
    } else if (error.name === 'AccessDeniedException' || error.name === 'UnauthorizedOperation') {
      throw new Error('Access denied.');
    } else if (error.message?.includes('credentials')) {
      throw new Error('Authentication error.');
    }
    
    throw new Error(`Failed to save profile: ${error.message || 'Unknown error'}`);
  }
}


//Get user profile from DynamoDB
export async function getProfile(userID: string): Promise<ProfileData | null> {
  try {
    const client = await getDynamoDBClient();

    const command = new GetCommand({
      TableName: tableName,
      Key: {
        userID,
      },
    });

    const response = await client.send(command);
    
    if (response.Item) {
      return response.Item as ProfileData;
    }
    
    return null;
  } catch (error: any) {
    console.error('Error getting profile from DynamoDB:', error);
    
    // If table doesn't exist or access denied, return null
    if (error.name === 'ResourceNotFoundException' || 
        error.name === 'AccessDeniedException' ||
        error.message?.includes('credentials')) {
      console.warn('Could not load profile from DynamoDB:', error.message);
      return null;
    }
    
    throw error;
  }
}

//Update user profile in DynamoDB
export async function updateProfile(userID: string, updates: {
  email?: string;
  name?: string;
  subject?: string;
  avatar?: string;
}): Promise<void> {
  try {
    const client = await getDynamoDBClient();

    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (updates.email !== undefined) {
      updateExpression.push('#email = :email');
      expressionAttributeNames['#email'] = 'email';
      expressionAttributeValues[':email'] = updates.email;
    }

    if (updates.name !== undefined) {
      updateExpression.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = updates.name;
    }

    if (updates.subject !== undefined) {
      updateExpression.push('#subject = :subject');
      expressionAttributeNames['#subject'] = 'subject';
      expressionAttributeValues[':subject'] = updates.subject || '';
    }

    if (updates.avatar !== undefined) {
      updateExpression.push('#avatar = :avatar');
      expressionAttributeNames['#avatar'] = 'avatar';
      expressionAttributeValues[':avatar'] = updates.avatar || '';
    }

    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const command = new UpdateCommand({
      TableName: tableName,
      Key: {
        userID,
      },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    await client.send(command);
  } catch (error: any) {
    console.error('Error updating profile in DynamoDB:', error);
    
    if (error.name === 'ResourceNotFoundException') {
      throw new Error('DynamoDB table not found.');
    } else if (error.name === 'AccessDeniedException' || error.name === 'UnauthorizedOperation') {
      throw new Error('Access denied.');
    } else if (error.message?.includes('credentials')) {
      throw new Error('Authentication error.');
    }
    
    throw new Error(`Failed to update profile: ${error.message || 'Unknown error'}`);
  }
}

