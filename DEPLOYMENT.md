# Deadlnr — Complete Setup & Vercel Deployment Guide

Follow this step-by-step guide to configure Supabase (for permanent cross-device account syncing) and deploy **Deadlnr** live on Vercel for free!

---

## 🛠️ Step 1: Set Up Free Supabase Database & Auth (5 Minutes)

1. Go to [supabase.com](https://supabase.com) and sign up for a free account.
2. Click **"New Project"**, name it `deadlnr`, set a database password, and click **Create**.
3. Once created, navigate to **SQL Editor** in the left sidebar.
4. Open the SQL file provided in this repository ([supabase_schema.sql](file:///c:/Users/vmydu/Downloads/Deadlnr/supabase_schema.sql)), copy the entire SQL script, paste it into the Supabase SQL editor, and click **RUN**.
   - *This creates the `canvas_credentials`, `user_settings`, and `swipe_history` tables with secure Row-Level Security (RLS) policies.*
5. Navigate to **Project Settings → API** in the bottom-left sidebar.
6. Copy these two keys:
   - **Project URL** (e.g. `https://xyzpdq.supabase.co`)
   - **anon / public key** (e.g. `eyJhbG...`)

---

## 🔑 Step 2: Configure Environment Variables

Create a file named `.env.local` in the root folder of this project with the following contents:

```ini
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# 32-Character AES-256 Secret Key for Feed URL Encryption
ENCRYPTION_KEY=deadlnr-secret-encryption-key-32b!
```

---

## 🚀 Step 3: Push Code to GitHub

Open your terminal in the `Deadlnr` project directory and run:

```bash
git init
git add .
git commit -m "Deadlnr initial release"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/deadlnr.git
git push -u origin main
```

---

## 🌐 Step 4: Host Live on Vercel (2 Minutes)

1. Go to [vercel.com](https://vercel.com) and sign in (or create a free account).
2. Click **"Add New..." → "Project"**.
3. Import your **`deadlnr`** GitHub repository.
4. Expand the **Environment Variables** section and add the 3 variables from your `.env.local` file:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://your-project.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `your-supabase-anon-key`
   - `ENCRYPTION_KEY` = `your-custom-32-character-secret-key!`
5. Click **"Deploy"**.

In under 60 seconds, Vercel will build and publish your live app URL (e.g. `https://deadlnr.vercel.app`)!

---

## 📱 How Account Syncing Works Across Devices

- **Login**: Open your live Vercel URL on your phone, iPad, or PC, and click **Account** (`/login`) to sign in via email magic link or password.
- **Canvas Feed**: Go to `/settings` and paste your Canvas Calendar Feed URL once. It is encrypted with AES-256-GCM and stored in your Supabase database.
- **Cross-Device Sync**: Any device you log into will automatically pull your real Canvas assignments, preferred AI assistant setting, and swipe history!
