# RaJA Ticketing System 🎫

A modern event ticketing system built with React, Vite, Supabase, and Express.js.

## 🚀 Features

- **User Authentication**: Secure login/registration with Supabase Auth
- **Event Management**: Create, edit, and manage events (Admin)
- **QR Code Tickets**: Generate QR codes for event participants
- **QR Scanner**: Admin scanner for event check-ins
- **User Dashboard**: View and participate in events
- **Admin Dashboard**: Manage events and view participants
- **Superuser Dashboard**: Manage admins and users

## 🔧 Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS
- **Backend**: Express.js + Node.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **QR Codes**: qrcode + qr-scanner libraries
- **Deployment**: Vercel

## 🛡️ Security Features

- ✅ Environment variables for all secrets
- ✅ Row Level Security (RLS) in database
- ✅ Service role key properly secured
- ✅ HTTPS in production
- ✅ No hardcoded credentials
- ✅ Secure API endpoints

## 📦 Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd raja-ticketing-system
npm install
```

### 2. Environment Configuration

```bash
cp env.example .env
# Edit .env with your actual Supabase credentials
```

### 3. Required Environment Variables

```bash
# Frontend (Vite)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:3001

# Backend (Express)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001

# Production
VITE_API_BASE_URL_PROD=your-vercel-app-url
```

### 4. Development

```bash
# Start frontend (Terminal 1)
npm run dev

# Start backend (Terminal 2)
npm run start
```

## 🚀 Deployment (Vercel)

### 1. Environment Variables in Vercel

Add these in your Vercel dashboard → Project Settings → Environment Variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL_PROD`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORT`

### 2. Deploy

```bash
# Build and deploy
npm run build
vercel --prod
```

## 📱 Usage

1. **Users**: Register → Browse events → Generate QR tickets
2. **Admins**: Manage events → View participants → Scan QR codes
3. **Superusers**: Manage admins and users

## 🔒 Security Notes

- Never commit `.env` files
- Service role keys are properly secured
- All API calls use environment variables
- HTTPS enforced in production
- Regular security audits with `npm audit`

## 📝 License

Private project for RaJA organization.
