# Vercel Deployment Guide

## Why Vercel Instead of Firebase?

Vercel is the **recommended platform** for Next.js deployment because:
- ✅ **Full API Routes Support** - All `/api/*` routes work out of the box
- ✅ **Zero Configuration** - No need to modify code
- ✅ **Made by Next.js Creators** - Best compatibility
- ✅ **Free Tier** - Generous free plan
- ✅ **Automatic HTTPS** - Free SSL certificates
- ✅ **Git Integration** - Auto-deploy on push

Firebase Hosting requires Firebase Functions for API routes, which is more complex to set up.

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Easiest)

1. **Go to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Sign in with your GitHub account

2. **Import Project**
   - Click "Add New" → "Project"
   - Select your GitHub repository: `NONGWB/km108-warehouse-frontend`
   - Click "Import"

3. **Configure Project**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

4. **Deploy**
   - Click "Deploy"
   - Wait 1-2 minutes
   - Your site will be live at `https://your-project-name.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Login**
```bash
vercel login
```

3. **Deploy**
```bash
cd d:\exam\KM108Warehouse-frontend
vercel
```

4. **Follow prompts:**
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N**
   - What's your project's name? `km108-warehouse-frontend`
   - In which directory is your code located? `./`
   - Want to override settings? **N**

5. **Production Deployment**
```bash
vercel --prod
```

## Automatic Deployments

Once connected to GitHub:
- **Every push to `main`** → Production deployment
- **Every PR** → Preview deployment
- No manual steps needed!

## Environment Variables (If Needed)

If you add environment variables later:
1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add variables (e.g., API keys)

## Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## Cost

- **Free Tier includes:**
  - Unlimited deployments
  - Automatic HTTPS
  - 100GB bandwidth/month
  - Global CDN
  - Preview deployments

## Testing Locally Before Deploy

```bash
# Development server
npm run dev

# Production build test
npm run build
npm start
```

## Troubleshooting

### Build fails on Vercel
- Check build logs in Vercel Dashboard
- Ensure all dependencies are in `package.json`
- Test local build: `npm run build`

### API routes not working
- Verify routes are in `/app/api/` directory
- Check route exports (GET, POST, etc.)
- Review Vercel function logs

## Project URLs

After deployment, you'll get:
- **Production:** `https://km108-warehouse-frontend.vercel.app`
- **Git branch previews:** `https://km108-warehouse-frontend-git-[branch].vercel.app`
- **Custom domain:** (if configured)

---

**Ready to deploy? Just push to GitHub and connect on Vercel!** 🚀
