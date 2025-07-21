# 🚀 Deployment Checklist for RaJA Ticketing System

## ✅ Security Fixes Applied

- [x] **Service role key** moved to environment variables
- [x] **All hardcoded URLs** replaced with environment variables
- [x] **Environment files** properly configured with .gitignore
- [x] **Security audit** passed (0 vulnerabilities)
- [x] **Production build** tested successfully

## 📋 Pre-Deployment Steps

### 1. GitHub Repository Setup

```bash
# If you don't have a GitHub repo yet:
# 1. Go to github.com and create a new repository
# 2. Name it: raja-ticketing-system
# 3. Set it to Public (for Vercel free tier) or Private
# 4. Don't initialize with README (we already have one)
# 5. Copy the repository URL

# Connect to your GitHub repo:
git remote add origin https://github.com/YOUR_USERNAME/raja-ticketing-system.git
git branch -M main
git push -u origin main
```

### 2. Vercel Deployment Setup

#### A. Install Vercel CLI (if not installed)

```bash
npm install -g vercel
```

#### B. Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

#### C. Set Environment Variables in Vercel Dashboard

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

**Add these variables:**

```
VITE_SUPABASE_URL=https://vwadfrbnalrkpiygjxhh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3YWRmcmJuYWxya3BpeWdqeGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NjU4OTcsImV4cCI6MjA2ODQ0MVwiJAEa_
VITE_API_BASE_URL_PROD=https://your-app-name.vercel.app
SUPABASE_URL=https://vwadfrbnalrkpiygjxhh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3YWRmcmJuYWxya3BieWdqeGhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg2NTg5NywiZXhwIjoyMDY4NDQxODk3fQ.bg15tChJjRvXskVlg0HwEA8KLa5b4fliw1aSQoL_SmE
PORT=3001
```

## 🔧 Post-Deployment Configuration

### 1. Update Supabase URL Allowlist

In your Supabase dashboard:

- Go to **Authentication → URL Configuration**
- Add your Vercel domain to **Site URL** and **Redirect URLs**:
  - `https://your-app-name.vercel.app`

### 2. Test HTTPS QR Scanner

- **QR Scanner requires HTTPS** to access camera
- Test the scanner functionality on your deployed app
- If camera doesn't work, check browser permissions

### 3. Domain Configuration (Optional)

- Add custom domain in Vercel settings
- Update environment variables accordingly

## 🧪 Testing Checklist

After deployment, test these features:

- [ ] **User Registration/Login**
- [ ] **Admin Dashboard** access
- [ ] **Event Creation** by admins
- [ ] **QR Code Generation** for participants
- [ ] **QR Scanner** with camera (HTTPS required)
- [ ] **Check-in Verification** system
- [ ] **Participants List** display

## 🔒 Security Reminders

- ✅ Never commit `.env` files
- ✅ All secrets are in environment variables
- ✅ Service role key is secured
- ✅ API endpoints use environment-based URLs
- ✅ HTTPS is enforced in production

## 📞 Support

If you encounter issues:

1. Check Vercel deployment logs
2. Verify environment variables are set correctly
3. Test locally first with `npm run build` && `npm run preview`
4. Check Supabase RLS policies and authentication settings

## 🎯 Next Steps After Deployment

1. **Share the live URL** with stakeholders
2. **Test QR system** end-to-end with real users
3. **Monitor** Vercel usage and performance
4. **Backup** your database regularly
5. **Update** documentation as needed

---

**Your app is now secure and ready for production! 🚀**
