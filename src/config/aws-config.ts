import { Amplify } from 'aws-amplify';

// Load AWS configuration from environment variables
const userPoolId = import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_AWS_COGNITO_USER_POOL_CLIENT_ID;
const identityPoolId = import.meta.env.VITE_AWS_COGNITO_IDENTITY_POOL_ID;
const region = import.meta.env.VITE_AWS_REGION;

// Validate required environment variables
if (!userPoolId || !userPoolClientId || !region) {
  const missingVars = [];
  if (!userPoolId) missingVars.push('VITE_AWS_COGNITO_USER_POOL_ID');
  if (!userPoolClientId) missingVars.push('VITE_AWS_COGNITO_USER_POOL_CLIENT_ID');
  if (!region) missingVars.push('VITE_AWS_REGION');
  missingVars.forEach((varName) => console.error(`  - ${varName}`));
}

const awsConfig: any = {
  Auth: {
    Cognito: {
      userPoolId: userPoolId || '',
      userPoolClientId: userPoolClientId || '',
      region: region || '',
      ...(identityPoolId && {
        identityPoolId: identityPoolId,
      }),
    },
  },
};

// Initialize Amplify with configuration if all required values are present
if (userPoolId && userPoolClientId && region) {
  Amplify.configure(awsConfig);
  if (identityPoolId) {
    // Identity pool present: DynamoDB-backed features can use temporary AWS credentials.
  } else {
    console.warn('Cognito Identity Pool not configured - DynamoDB access may not work.');
  }
} else {
  console.warn('AWS Cognito not configured');
}

export default awsConfig;