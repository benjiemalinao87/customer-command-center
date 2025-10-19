# Trigger.dev Setup Guide for Action System Demo

## Required Environment Variables

To use the Action System Demo with real Trigger.dev integration, you need to set up the following environment variables:

### 1. Create a `.env` file in the project root

Create a `.env` file in the root of your project (same level as `package.json`) with the following variables:

```bash
# Trigger.dev Configuration
REACT_APP_TRIGGER_API_URL=https://api.trigger.dev
REACT_APP_TRIGGER_PUBLIC_KEY=pk_prod_your_public_key_here
REACT_APP_TRIGGER_PROJECT_ID=proj_dcpsazbkeyuadjmckuib
```

### 2. Get your Trigger.dev API Key

1. Go to [trigger.dev](https://trigger.dev) and log in to your account
2. Navigate to your project dashboard
3. Go to the "API Keys" section
4. Copy your **Public API Key** (starts with `pk_prod_` or `pk_dev_`)
5. Replace `pk_prod_your_public_key_here` in your `.env` file with your actual public key

### 3. Environment Variable Details

- **REACT_APP_TRIGGER_API_URL**: The Trigger.dev API endpoint (usually `https://api.trigger.dev`)
- **REACT_APP_TRIGGER_PUBLIC_KEY**: Your public API key from the Trigger.dev dashboard
- **REACT_APP_TRIGGER_PROJECT_ID**: Your project ID (currently set to our demo project)

### 4. Restart the Development Server

After creating the `.env` file, restart your development server:

```bash
npm start
# or
yarn start
```

### 5. Verify Setup

1. Navigate to `/action-system-demo`
2. Go to the "Configuration" tab
3. All environment variables should show as "Set" with green badges

## Demo Mode vs Production Mode

- **Without API Key**: The demo runs in mock mode with simulated data
- **With API Key**: The demo connects to real Trigger.dev tasks and provides live execution monitoring

## Troubleshooting

If you see "Missing accessToken" errors:

1. Ensure your `.env` file is in the project root
2. Verify your API key is correct and starts with `pk_`
3. Restart the development server after adding environment variables
4. Check the browser console for any additional error messages

## Security Note

- Never commit your `.env` file to version control
- The `.env` file should be in your `.gitignore`
- Only use public API keys in frontend applications 