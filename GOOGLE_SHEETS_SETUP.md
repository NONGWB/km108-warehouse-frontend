# Google Sheets Integration Setup

## Steps to Configure Google Sheets API

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Sheets API:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

### 2. Create Service Account
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in:
   - Service account name: `km108-warehouse-api`
   - Service account ID: (auto-generated)
   - Click "Create and Continue"
4. Skip optional steps, click "Done"

### 3. Create Service Account Key
1. Click on the service account you just created
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON" format
5. Download the JSON file

### 4. Share Google Sheet with Service Account
1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/18qYljXUUcyLO978y-WTCsoAQi4JO3J5C-idHY8c66-0/edit
2. Click "Share" button
3. Add the service account email (from JSON file, looks like: `xxx@xxx.iam.gserviceaccount.com`)
4. Give it "Editor" permission
5. Click "Send"

### 5. Set Environment Variables in Vercel

Copy these values from the downloaded JSON file:

```bash
GOOGLE_SHEETS_SPREADSHEET_ID=18qYljXUUcyLO978y-WTCsoAQi4JO3J5C-idHY8c66-0
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**In Vercel:**
1. Go to Project Settings → Environment Variables
2. Add each variable above
3. Make sure to add for all environments (Production, Preview, Development)

**For Local Development:**
Create `.env.local` file:
```
GOOGLE_SHEETS_SPREADSHEET_ID=18qYljXUUcyLO978y-WTCsoAQi4JO3J5C-idHY8c66-0
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Google Sheet Format

The sheet should have these columns (in this exact order):
```
ProductName | SalePrice | Store1Name | Store1Price | Store2Name | Store2Price | Store3Name | Store3Price | Store4Name | Store4Price
```

Header row must be row 1.
Data starts from row 2.
