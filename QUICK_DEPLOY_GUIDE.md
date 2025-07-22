# 🚀 Quick Deploy Guide - RaJA Ticketing System

## Method 1: GitHub Web Interface (Easiest)

### Step 1: Create GitHub Repository

1. Go to **github.com** in your browser
2. Click **"+"** → **"New repository"**
3. **Repository name**: `raja-ticketing-system`
4. **Description**: `Event ticketing system with QR codes`
5. **Public** (required for free Vercel)
6. **❌ DON'T** check "Add README" (we have one)
7. Click **"Create repository"**

### Step 2: Push Your Code

```bash
# Add the GitHub remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/raja-ticketing-system.git

# Push to GitHub
git push -u origin main
```

### Step 3: Deploy on Vercel

1. Go to **vercel.com/dashboard**
2. Click **"New Project"**
3. **"Import Git Repository"** → Select your GitHub repo
4. **Project settings**: Keep defaults
5. **Environment Variables**: Add these:
   ```
   VITE_SUPABASE_URL=https://vwadfrbnalrkpiygjxhh.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3YWRmcmJuYWxya3BpeWdqeGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NjU4OTcsImV4cCI6MjA2ODQ0MVwiJA=
   VITE_API_BASE_URL_PROD=https://your-app.vercel.app
   SUPABASE_URL=https://vwadfrbnalrkpiygjxhh.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3YWRmcmJuYWxya3BpeWdqeGhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg2NTg5NywiZXhwIjoyMDY4NDQxODk3fQ.bg15tChJjRvXskVlg0HwEA8KLa5b4fliw1aSQoL_SmE
   ```
6. Click **"Deploy"**

---

## Method 2: Vercel CLI (Current attempt)

### Vercel CLI Answers:

When running `npx vercel`, answer:

1. **"Set up and deploy?"** → `Y`
2. **"Which scope?"** → `Evan's projects`
3. **"Link to existing project?"** → `N` (create new)
4. **"Project name?"** → `raja-ticketing-system`
5. **"Directory to deploy?"** → `.` (current directory)
6. **"Override settings?"** → `N`

### Add Environment Variables:

```bash
npx vercel env add VITE_SUPABASE_URL
npx vercel env add VITE_SUPABASE_ANON_KEY
npx vercel env add VITE_API_BASE_URL_PROD
npx vercel env add SUPABASE_URL
npx vercel env add SUPABASE_SERVICE_ROLE_KEY
```

---

## ✅ After Deployment

1. **Get your HTTPS URL** from Vercel
2. **Update Supabase**: Add URL to allowed origins
3. **Test QR Scanner**: Camera will work with HTTPS!
4. **Update environment**: Set `VITE_API_BASE_URL_PROD` to your Vercel URL

---

## 🎯 Recommendation

**Use Method 1 (GitHub Web Interface)** - it's simpler and more reliable!
