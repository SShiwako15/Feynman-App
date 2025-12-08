import { Amplify } from 'aws-amplify';
//Get all the required environment variables
const userPoolId = import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_AWS_COGNITO_USER_POOL_CLIENT_ID;
const region = import.meta.env.VITE_AWS_REGION;

// Validate that all required environment variables are set
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
    },
  },
};

// Debug: Log configuration
console.log('AWS Config:', {
  userPoolId: userPoolId ? 'Set' : 'Missing',
  userPoolClientId: userPoolClientId ? 'Set' : 'Missing',
  region: region ? 'Set' : 'Missing',
});

// Only configure if we have all required values
if (userPoolId && userPoolClientId && region) {
  Amplify.configure(awsConfig);
  console.log('AWS Cognito configured successfully');
} else {
  console.warn('AWS Cognito not configured');
}

export default awsConfig;