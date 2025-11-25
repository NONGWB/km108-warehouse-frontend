# Firebase Deployment Guide

## Prerequisites
1. Install Firebase CLI globally:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

## Setup Steps

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., `km108-warehouse`)
4. Follow the setup wizard

### 2. Update Firebase Configuration
Edit `.firebaserc` and replace `your-firebase-project-id` with your actual Firebase project ID:
```json
{
  "projects": {
    "default": "km108-warehouse"
  }
}
```

### 3. Build and Deploy

#### Option 1: Using npm script (Recommended)
```bash
npm run deploy
```

#### Option 2: Manual deployment
```bash
npm run build
firebase deploy
```

## Important Notes

### Static Export Configuration
This project is configured for static export with the following settings in `next.config.js`:
- `output: 'export'` - Enables static HTML export
- `images.unoptimized: true` - Disables image optimization for static export
- `trailingSlash: true` - Adds trailing slashes to URLs

### API Routes Limitation
⚠️ **Important**: Next.js API routes (`/app/api/*`) will NOT work with static export on Firebase Hosting.

**Current API routes that need migration:**
- `/api/products` (GET, POST, PUT, DELETE)
- `/api/products/upload` (POST)

**Solutions:**

#### Option 1: Use Firebase Functions (Recommended)
1. Install Firebase Functions:
```bash
firebase init functions
```

2. Migrate API routes to Cloud Functions
3. Update frontend API calls to use Functions endpoints

#### Option 2: Use External Backend
Deploy API routes to a Node.js server (Vercel, Railway, etc.) and update API endpoints in the frontend.

#### Option 3: Client-Side Only
For demo purposes, convert to client-side CSV file handling using File System Access API (browser only).

## Deployment Commands

```bash
# Deploy everything
npm run deploy

# Deploy hosting only
firebase deploy --only hosting

# Preview before deploying
firebase hosting:channel:deploy preview
```

## Project Structure After Build
```
out/                    # Static export output (deployed to Firebase)
├── index.html
├── _next/
│   ├── static/
│   └── ...
└── ...
```

## Troubleshooting

### Build fails
- Check that all dependencies are installed: `npm install`
- Clear Next.js cache: `rm -rf .next`
- Try building again: `npm run build`

### API routes not working
- This is expected with static export
- Follow one of the solutions above to add backend functionality

### Firebase deployment fails
- Ensure you're logged in: `firebase login`
- Verify project ID in `.firebaserc`
- Check Firebase CLI is installed: `firebase --version`
