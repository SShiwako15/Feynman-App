## DynamoDB Profile Storage Setup

This application stores user profile data (name, email, subject) in AWS DynamoDB. To enable this feature, you need to set up the following:

### 1. Create a DynamoDB Table

Create a DynamoDB table named `FeynmanUserProfiles` (or set a custom name via `VITE_DYNAMODB_PROFILE_TABLE`) with:
- **Partition Key**: `userId` (String)
- **Table Name**: `FeynmanUserProfiles` (or your custom name)

You can create this table using the AWS Console, AWS CLI, or CloudFormation.

### 2. Create a Cognito Identity Pool

To allow the frontend to access DynamoDB, you need a Cognito Identity Pool:

1. Go to AWS Cognito Console → Identity Pools
2. Create a new Identity Pool
3. Enable "Authentication providers" → "Cognito user pool"
4. Select your existing User Pool and App Client
5. Create the Identity Pool and note the Identity Pool ID

### 3. Configure IAM Permissions

The authenticated role for your Identity Pool needs DynamoDB permissions. Add this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem"
      ],
      "Resource": "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/FeynmanUserProfiles"
    }
  ]
}
```

Replace `REGION` and `ACCOUNT_ID` with your AWS region and account ID.

### 4. Environment Variables

Add these to your `.env` file:

```env
VITE_AWS_COGNITO_IDENTITY_POOL_ID=your-identity-pool-id
VITE_DYNAMODB_PROFILE_TABLE=FeynmanUserProfiles
```

The existing variables should already be set:
- `VITE_AWS_COGNITO_USER_POOL_ID`
- `VITE_AWS_COGNITO_USER_POOL_CLIENT_ID`
- `VITE_AWS_REGION`

### 5. Testing

After setup:
1. Log in to the application
2. Go to Profile page
3. Update your name, email, or subject
4. The data will be saved to DynamoDB
5. When you log in again, your profile data will be loaded from DynamoDB

## S3 Profile Picture Storage Setup

This application stores user profile pictures in AWS S3. To enable profile picture uploads, you need to set up the following:

### 1. Create an S3 Bucket

Create an S3 bucket for storing profile pictures:

1. Go to AWS S3 Console
2. Create a new bucket (e.g., `feynman-profile-pictures`)
3. Configure bucket settings:
   - **Bucket name**: Choose a unique name (e.g., `feynman-profile-pictures-{your-account-id}`)
   - **Region**: Should match your `VITE_AWS_REGION`
   - **Block Public Access**: Uncheck "Block all public access" (or configure bucket policy for public read access)
   - **Bucket Versioning**: Optional, but recommended

### 2. Configure Bucket Policy for Public Read Access

Add a bucket policy to allow public read access to profile pictures:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/profile-pictures/*"
    }
  ]
}
```

Replace `YOUR-BUCKET-NAME` with your actual bucket name.

### 3. Update IAM Permissions

The authenticated role for your Cognito Identity Pool needs S3 permissions. Add this policy to the same IAM role used for DynamoDB:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/profile-pictures/*"
    }
  ]
}
```

Replace `YOUR-BUCKET-NAME` with your actual bucket name.

### 4. Environment Variables

Add this to your `.env` file:

```env
VITE_S3_PROFILE_BUCKET=your-bucket-name
```

### 5. Testing Profile Pictures

After setup:
1. Log in to the application
2. Go to Profile page
3. Click "Choose File" under Profile Picture
4. Select an image (JPG, PNG, max 5MB)
5. Crop the image as desired
6. Click "Upload Cropped Image"
7. The image will be uploaded to S3 and the URL saved to DynamoDB
8. The profile picture will appear in the Navigation bar and Dashboard

### Profile Picture Features

- **Image Cropping**: Users can crop images to a square aspect ratio before upload
- **Automatic Resizing**: Images are automatically resized to max 400x400px
- **Format Conversion**: All images are converted to JPEG format
- **File Size Limit**: Maximum file size is 5MB
- **Fallback**: If no profile picture is set, displays an initial avatar with the first letter of the name

## S3 Study Feed Storage Setup

This application stores study posts (what users are studying) in AWS S3 as JSON files. Posts are automatically created when users update their subject in their profile, or manually when they share a study update on the Dashboard.

### 1. Use Existing S3 Bucket or Create New One

You can reuse your existing profile pictures bucket (e.g., `feynman-profile-pictures-...`) or create a new bucket. Study posts will be stored under the `study-feed/` prefix.

If creating a new bucket:
1. Go to AWS S3 Console
2. Create a new bucket (e.g., `feynman-study-feed`)
3. Configure bucket settings:
   - **Bucket name**: Choose a unique name
   - **Region**: Should match your `VITE_AWS_REGION`
   - **Block Public Access**: Can remain enabled (posts are private, accessed via Lambda)

### 2. Update Lambda Environment Variables

In your Lambda function (the one handling `/api/users` and `/api/feed`):

1. Go to AWS Lambda Console → Your function → Configuration → Environment variables
2. Add or update:
   - `FEED_BUCKET_NAME`: The name of your S3 bucket (e.g., `feynman-profile-pictures-982081058563` or `feynman-study-feed`)
   - `FEED_PREFIX`: (Optional) Default is `study-feed/`. Change only if you want a different prefix.

### 3. Update Lambda IAM Permissions

The Lambda execution role needs S3 permissions to read and write study feed posts. Add this policy to your Lambda's execution role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR-BUCKET-NAME",
        "arn:aws:s3:::YOUR-BUCKET-NAME/study-feed/*"
      ]
    }
  ]
}
```

Replace `YOUR-BUCKET-NAME` with your actual bucket name.

### 4. Update Lambda Code

Replace your existing Lambda handler code with the code from `lambda-feed-handler.js` in this repository. The updated handler:

- Handles `/api/users` GET requests (existing functionality)
- Handles `/api/feed` POST requests with two actions:
  - `action: "query"` - Returns study posts for the current user and their connections
  - `action: "create"` - Creates a new study post and saves it to S3
- Stores posts in S3 at `study-feed/{userId}/{postId}.json`
- Returns posts sorted by creation date (newest first)

**Important**: Make sure your Lambda has the `@aws-sdk/client-s3` package installed. If using Node.js 18+, you may need to add it to your `package.json`:

```json
{
  "dependencies": {
    "@aws-sdk/client-cognito-identity-provider": "^3.x.x",
    "@aws-sdk/client-s3": "^3.x.x"
  }
}
```

### 5. Deploy Lambda and Test

1. Update your Lambda code with the contents of `lambda-feed-handler.js`
2. Deploy the Lambda function
3. In API Gateway, ensure `/api/feed` has a POST method pointing to this Lambda
4. Deploy your API Gateway to the `dev` stage

### 6. Testing Study Feed

After setup:
1. Log in to the application
2. Go to Dashboard
3. Share a "What are you studying?" post - it should appear in the feed
4. Reload the page - the post should still be there (loaded from S3)
5. Go to Profile and change your subject - a new post should appear in the feed
6. Check S3 console - you should see JSON files at `study-feed/{userId}/{postId}.json`

### Study Feed Features

- **Automatic Posts**: When a user updates their subject in Profile, a post is automatically created
- **Manual Posts**: Users can manually share study updates from the Dashboard
- **Connections-Only Feed**: The feed shows posts from the current user and their connections only
- **Persistence**: All posts are stored in S3 and survive page reloads
- **Chronological Order**: Posts are sorted by creation date (newest first)
- **Author Information**: Each post includes the author's name and avatar

## Connection Requests System Setup

This application uses a request-based connection system where users must send and accept connection requests before becoming connected. Connection requests and accepted connections are stored in AWS DynamoDB.

### 1. Create DynamoDB Tables

Create two DynamoDB tables:

#### Table 1: Connection Requests (`FeynmanConnectionRequests`)

- **Partition Key**: `requestId` (String, UUID)
- **Global Secondary Indexes**:
  - `fromUserId-index`: Partition Key `fromUserId` (String), Sort Key `createdAt` (String)
  - `toUserId-index`: Partition Key `toUserId` (String), Sort Key `createdAt` (String)
- **Attributes**:
  - `requestId`: Unique identifier for the request
  - `fromUserId`: ID of user sending the request
  - `toUserId`: ID of user receiving the request
  - `fromUserName`: Display name of requester
  - `fromUserAvatar`: Avatar URL of requester (optional)
  - `status`: `pending`, `accepted`, `rejected`, or `cancelled`
  - `createdAt`: ISO timestamp
  - `updatedAt`: ISO timestamp

#### Table 2: Connections (`FeynmanConnections`)

- **Partition Key**: `userId` (String)
- **Sort Key**: `connectionId` (String)
- **Attributes**:
  - `userId`: ID of the user
  - `connectionId`: ID of the connected user
  - `createdAt`: ISO timestamp

### 2. Update Lambda Environment Variables

In your Lambda function (the one handling `/api/users`, `/api/feed`, and `/api/connections`):

1. Go to AWS Lambda Console → Your function → Configuration → Environment variables
2. Add:
   - `CONNECTION_REQUESTS_TABLE`: `FeynmanConnectionRequests` (or your custom table name)
   - `CONNECTIONS_TABLE`: `FeynmanConnections` (or your custom table name)

### 3. Update Lambda IAM Permissions

Add DynamoDB permissions to your Lambda's execution role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:DeleteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/FeynmanConnectionRequests",
        "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/FeynmanConnectionRequests/index/*",
        "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/FeynmanConnections",
        "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/FeynmanConnections/index/*"
      ]
    }
  ]
}
```

Replace `REGION` and `ACCOUNT_ID` with your AWS region and account ID.

### 4. Update Lambda Code

Replace your existing Lambda handler code with the code from `lambda-handler.js` in this repository. The updated handler includes:

- All existing `/api/users` and `/api/feed` functionality
- New `/api/connections` endpoints:
  - `POST /api/connections/request` - Send a connection request
  - `GET /api/connections/requests` - Get connection requests (sent/received/all)
  - `POST /api/connections/requests/{requestId}/accept` - Accept a request
  - `POST /api/connections/requests/{requestId}/reject` - Reject a request
  - `POST /api/connections/requests/{requestId}/cancel` - Cancel a sent request
  - `GET /api/connections` - Get accepted connections
  - `DELETE /api/connections/{userId}` - Remove a connection

**Important**: Make sure your Lambda has the `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` packages installed:

```json
{
  "dependencies": {
    "@aws-sdk/client-cognito-identity-provider": "^3.x.x",
    "@aws-sdk/client-s3": "^3.x.x",
    "@aws-sdk/client-dynamodb": "^3.x.x",
    "@aws-sdk/lib-dynamodb": "^3.x.x"
  }
}
```

### 5. Configure API Gateway Routes

In API Gateway, ensure you have the following routes configured:

- `/api/connections/request` - POST method
- `/api/connections/requests` - GET method
- `/api/connections/requests/{requestId}/accept` - POST method
- `/api/connections/requests/{requestId}/reject` - POST method
- `/api/connections/requests/{requestId}/cancel` - POST method
- `/api/connections` - GET method
- `/api/connections/{userId}` - DELETE method

All routes should point to your Lambda function with Lambda Proxy integration enabled.

### 6. Deploy and Test

1. Update your Lambda code with the contents of `lambda-handler.js`
2. Deploy the Lambda function
3. Deploy your API Gateway to the `dev` stage
4. Test the connection flow:
   - User A searches for User B
   - User A sends a connection request
   - User B sees the request in "Pending Requests"
   - User B accepts the request
   - Both users now appear in each other's "My Connections" list

### Connection Request Features

- **Request-Based**: Users must send and accept requests before connecting
- **Pending Requests**: Users see incoming requests with Accept/Reject options
- **Sent Requests**: Users can see and cancel their sent requests
- **Dashboard Badge**: Pending request count appears on Dashboard
- **Backend Storage**: All requests and connections stored in DynamoDB
- **Bidirectional**: When a request is accepted, both users are connected

## Chime SDK Messaging Chat Feature Setup

This application includes a comprehensive chat system using AWS Chime SDK Messaging that supports:
- 1-on-1 chats between connected users
- Separate chat channels for each video conference
- Batched message storage in S3
- Video conference invitation via chat
- Minimizable chat panel on Dashboard

### 1. Create a Separate Lambda Function for Chat

The chat messaging features are handled by a separate Lambda function to keep concerns separated from the social media features.

#### Step 1.1: Prepare the Deployment Package

1. Navigate to the `lambda-chat-package/` directory in your project:
   ```powershell
   cd "Feynman-App/lambda-chat-package"
   ```

2. Install the required dependencies:
   ```powershell
   npm install --production
   ```
   This will create a `node_modules/` folder with all required AWS SDK packages.

3. Create the deployment zip file:
   ```powershell
   Compress-Archive -Path index.js, package.json, node_modules -DestinationPath lambda-chat-package.zip -Force
   ```
   
   **Note**: The zip file `lambda-chat-package.zip` should now be in the `lambda-chat-package/` directory. This file contains:
   - `index.js` - The Lambda handler code
   - `package.json` - Package dependencies
   - `node_modules/` - All required AWS SDK packages

#### Step 1.2: Create the Lambda Function in AWS

1. Go to **AWS Lambda Console** (https://console.aws.amazon.com/lambda/)
2. Click **"Create function"**
3. Choose **"Author from scratch"**
4. Configure the function:
   - **Function name**: `FeynmanChatLambda` (or your preferred name)
   - **Runtime**: `Node.js 18.x` or `Node.js 20.x` (recommended)
   - **Architecture**: `x86_64`
   - **Execution role**: Choose "Create a new role with basic Lambda permissions" (we'll update permissions later)
5. Click **"Create function"**

#### Step 1.3: Upload the Deployment Package

1. In your Lambda function page, scroll down to the **"Code"** section
2. Click **"Upload from"** dropdown → Select **".zip file"**
3. Click **"Upload"** and select the `lambda-chat-package.zip` file from your `lambda-chat-package/` directory
4. Wait for the upload to complete (this may take a minute)

#### Step 1.4: Configure the Handler

1. In the Lambda function page, go to the **"Code"** tab
2. Scroll to **"Runtime settings"** section
3. Click **"Edit"** next to Runtime settings
4. Set the **Handler** to: `index.handler`
5. Click **"Save"**

**Important**: The handler must be exactly `index.handler` because:
- `index.js` is the main file (as specified in `package.json`)
- `handler` is the exported function name in `index.js`

#### Step 1.5: Verify the Setup

1. Go to the **"Test"** tab in your Lambda function
2. Create a test event with this JSON:
   ```json
   {
     "httpMethod": "OPTIONS",
     "resource": "/api/chime/app-instance",
     "path": "/api/chime/app-instance"
   }
   ```
3. Click **"Test"** - You should see a successful response with status code 204 (this tests CORS preflight)

If you see any errors, check:
- The handler is set to `index.handler`
- All files were included in the zip (especially `node_modules/`)
- The runtime is Node.js 18.x or 20.x

### 2. Create Chime App Instance (Optional)

You have two options:

#### Option A: Create App Instance Manually (Recommended for Production)

1. Go to **AWS Console** → Search for **"Chime SDK"** (or "Amazon Chime SDK")
2. Navigate to **Messaging** → **App instances** (or **App instances** in the left sidebar)
3. Click **"Create app instance"**
4. Configure:
   - **Name**: `FeynmanAppInstance`
   - **Metadata**: `Feynman App Chat Instance` (optional)
5. Click **"Create"**
6. Copy the **App Instance ARN** (you'll need this for environment variables)

**Note**: This is the recommended approach for production as it gives you more control and visibility.

#### Option B: Let Lambda Create It Automatically

If you **don't** create an App Instance manually, the Lambda function will automatically create one on first use. This is convenient for development/testing.

**How it works**:
- When the Lambda first needs an App Instance (e.g., when creating a channel or user), it will:
  1. Check if `CHIME_APP_INSTANCE_ARN` environment variable is set
  2. If not set, automatically create a new App Instance named `FeynmanAppInstance`
  3. Cache the ARN for subsequent requests in the same Lambda execution

**Important**: 
- The Lambda must have `chime:CreateAppInstance` permission (already included in Step 5)
- The auto-created App Instance will persist across Lambda invocations
- For production, it's recommended to create the App Instance manually and set `CHIME_APP_INSTANCE_ARN` for consistency

### 3. Create S3 Bucket for Chat Storage

1. Create an S3 bucket (or use existing) for chat message storage
2. Configure bucket policy for Lambda access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR_CHAT_BUCKET_NAME/*",
        "arn:aws:s3:::YOUR_CHAT_BUCKET_NAME"
      ]
    }
  ]
}
```

### 4. Update Lambda Environment Variables

Add these environment variables to your Chat Lambda function:

```env
AWS_REGION=us-east-1
CHIME_APP_INSTANCE_ARN=arn:aws:chime:us-east-1:ACCOUNT_ID:app-instance/APP_INSTANCE_ID
CHAT_BUCKET_NAME=your-chat-bucket-name
CHAT_PREFIX=chats/
```

**Note about `CHIME_APP_INSTANCE_ARN`**:
- **If you created the App Instance manually** (Option A in Step 2): Set this to the App Instance ARN you copied
- **If you want Lambda to create it automatically** (Option B in Step 2): You can **omit** this variable, and the Lambda will create and use an App Instance automatically on first use

**Required variables**:
- `AWS_REGION`: Your AWS region (e.g., `us-east-1`)
- `CHAT_BUCKET_NAME`: The S3 bucket name for storing chat messages
- `CHAT_PREFIX`: (Optional) Default is `chats/`. Change only if you want a different prefix.

### 5. Update Lambda IAM Permissions

Add these permissions to your Chat Lambda's IAM role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "chime:CreateAppInstance",
        "chime:DescribeAppInstance",
        "chime:CreateAppInstanceUser",
        "chime:DescribeAppInstanceUser",
        "chime:CreateChannel",
        "chime:DescribeChannel",
        "chime:CreateChannelMembership",
        "chime:SendChannelMessage",
        "chime:ListChannelMessages",
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": "*"
    }
  ]
}
```

### 6. Configure API Gateway Routes

In API Gateway, create a new resource `/api/chime` (or add to existing API) with the following routes:

- `/api/chime/app-instance` - POST method
- `/api/chime/users` - POST method
- `/api/chime/channels` - POST method
- `/api/chime/channels/{channelArn}` - GET method
- `/api/chime/channels/{channelArn}/messages` - GET method
- `/api/chime/channels/{channelArn}/messages` - POST method
- `/api/chime/channels/{channelArn}/invite` - POST method

All routes should point to your Chat Lambda function with Lambda Proxy integration enabled.

**CRITICAL - CORS Configuration**:

For each route above, you **MUST** also add an **OPTIONS** method:

1. For each route (e.g., `/api/chime/users`):
   - Add a **POST** method → Point to your Chat Lambda
   - Add an **OPTIONS** method → Point to the same Chat Lambda
   
2. The Lambda handler automatically handles OPTIONS requests and returns proper CORS headers, but API Gateway must route OPTIONS requests to the Lambda.

3. **Alternative**: You can enable CORS in API Gateway Console:
   - Select each resource
   - Click "Actions" → "Enable CORS"
   - Configure:
     - Access-Control-Allow-Origin: `*` (or your frontend domain like `http://localhost:5173`)
     - Access-Control-Allow-Headers: `Content-Type`
     - Access-Control-Allow-Methods: `GET,POST,OPTIONS`
   - Click "Enable CORS and replace existing CORS headers"
   - **Important**: This will automatically create OPTIONS methods for you

**If you see CORS errors in the browser console**, it means:
- OPTIONS methods are missing in API Gateway, OR
- OPTIONS requests are not being routed to the Lambda, OR
- The Lambda is not returning proper CORS headers for OPTIONS

**Troubleshooting CORS**:
- Check CloudWatch logs for your Lambda to see if OPTIONS requests are reaching it
- Verify that each route has both the intended method (POST/GET) AND an OPTIONS method
- Ensure the Lambda returns status code 204 for OPTIONS requests (the handler does this automatically)

### 7. Update and Redeploy Chat Lambda Package (When Making Changes)

**Note**: This step is only needed when you update the Lambda code. The initial deployment is done in Step 1.

1. Navigate to `lambda-chat-package/` directory
2. Make your code changes to `index.js` if needed
3. Run the build script:
   ```powershell
   .\build-deployment.ps1
   ```
   Or manually:
   ```powershell
   npm install --production
   Compress-Archive -Path index.js, package.json, node_modules -DestinationPath lambda-chat-package.zip -Force
   ```
4. Upload the new `lambda-chat-package.zip` to your Lambda function (same as Step 1.3)
5. Deploy your API Gateway to the `dev` stage

### 8. Frontend Environment Variables

Ensure your frontend `.env` file includes:

```env
VITE_CHIME_BACKEND_ENDPOINT=https://your-api-gateway-url.execute-api.region.amazonaws.com/dev
```

### 9. S3 Storage Structure

Chat messages are stored in S3 with the following structure:

```
chats/
  ├── connections/
  │   ├── {userId1}-{userId2}.json
  │   └── {userId2}-{userId1}.json
  └── conferences/
      └── {meetingId}.json
```

Each JSON file contains:
- `channelArn`: Chime channel ARN
- `channelType`: "connection" or "conference"
- `participants`: Array of user IDs
- `messages`: Array of message objects
- `lastUpdated`: ISO timestamp

### 10. Chat Features

#### Connection Chats
- Created when user opens chat with a connection
- Channel name: `connection-{sortedUserId1}-{sortedUserId2}`
- Participants: The two connected users
- Messages stored in: `chats/connections/{userId1}-{userId2}.json`

#### Conference Chats
- Auto-created when joining a video conference
- Channel name: `conference-{meetingId}`
- Participants: All meeting attendees
- Messages stored in: `chats/conferences/{meetingId}.json`

#### Message Batching
- Messages are batched and stored to S3 every 5 minutes
- Messages are also flushed when chat is closed
- Reduces S3 write operations and costs

#### Conference Invitations
- Users can invite connections to a video conference via chat
- Invitation appears as a special message type with a "Join Conference" button
- Clicking the button navigates to the conference URL

### 11. UI Components

- **ChatPanel**: Minimizable right-side panel on Dashboard
  - Shows list of active chats (connections + conferences)
  - Displays unread message counts
  - Allows switching between chats
  - Shows "Start Chat" option for connections

- **ChatWindow**: Individual chat display
  - Shows message history
  - Message input with send button
  - "Invite to Conference" button (connection chats only)
  - Handles conference invitation messages

### 12. Testing Chat Features

1. **Connection Chat**:
   - Go to Dashboard
   - Open Chat Panel (right side)
   - Click on a connection to start chatting
   - Send messages and verify they appear
   - Check S3 bucket for stored messages

2. **Conference Chat**:
   - Join a video conference
   - Conference chat should auto-open
   - Send messages in conference chat
   - Verify messages are stored separately from connection chats

3. **Conference Invitation**:
   - Open a connection chat
   - Click "Invite to Conference"
   - Verify invitation message appears
   - Click "Join Conference" button to verify navigation

### Chat Feature Notes

- Chime SDK Messaging requires App Instance and App Instance Users to be created before channels can be used
- Messages are sent in real-time via Chime SDK, but history is stored in S3 for persistence
- Connection chats are created on-demand when user opens chat with a connection
- Conference chats are auto-created when joining a video conference
- The chat panel is minimizable and appears on the right side of the Dashboard
- Unread message counts are displayed on chat list items
