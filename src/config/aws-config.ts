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

// Log configuration status for troubleshooting
console.log('AWS Config:', {
  userPoolId: userPoolId ? 'Set' : 'Missing',
  userPoolClientId: userPoolClientId ? 'Set' : 'Missing',
  identityPoolId: identityPoolId ? 'Set' : 'Missing ',
  region: region ? 'Set' : 'Missing',
});

// Initialize Amplify with configuration if all required values are present
if (userPoolId && userPoolClientId && region) {
  Amplify.configure(awsConfig);
  console.log('AWS Cognito configured successfully');
  if (identityPoolId) {
    console.log('Cognito Identity Pool configured - DynamoDB access enabled');
  } else {
    console.warn('Cognito Identity Pool not configured - DynamoDB access may not work.');
  }
} else {
  console.warn('AWS Cognito not configured');
}

export default awsConfig;