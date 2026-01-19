# Quick Image Setup - Cloudinary

## ✅ Recommendation: Use Cloudinary

Your app is **already configured** for Cloudinary! Here's the fastest way to get doctor images working.

---

## Quick Steps (5 minutes)

### 1. Create Cloudinary Account
- Go to https://cloudinary.com/users/register/free
- Sign up (free tier is enough)
- Get your credentials from Dashboard

### 2. Upload Images via Dashboard
1. Go to Cloudinary Dashboard → **Media Library**
2. Click **"Upload"**
3. Create folder: `doctors` (optional)
4. Upload your 5 PNG files:
   - `dr-mukami-gathariki.png`
   - `dr-ken-aluora.png`
   - `dr-john-paul-ogalo.png`
   - `dr-angela-muoki.png`
   - `dr-dorsi-jowi.png`

### 3. Get Image URLs
1. Click on each uploaded image
2. Copy the **"Secure URL"**
3. It will look like:
   ```
   https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1234567890/doctors/dr-mukami-gathariki.png
   ```

### 4. Update Seed Script
Open `prisma/seed.ts` and replace the `profile_image` values:

```typescript
const doctorData = [
  {
    // ... other fields
    profile_image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/doctors/dr-mukami-gathariki.png',
  },
  {
    profile_image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/doctors/dr-ken-aluora.png',
  },
  {
    profile_image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/doctors/dr-john-paul-ogalo.png',
  },
  {
    profile_image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/doctors/dr-angela-muoki.png',
  },
  {
    profile_image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/doctors/dr-dorsi-jowi.png',
  },
];
```

### 5. Re-seed Database
```bash
npm run db:seed
```

**Done!** ✅ Your doctor images will now display correctly.

---

## Optional: Optimize Images

Add transformations to URLs for automatic optimization:

```typescript
// Instead of:
profile_image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/doctors/dr-mukami-gathariki.png'

// Use (auto-optimized):
profile_image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/f_auto,q_auto,w_400,h_400,c_fill,g_face/doctors/dr-mukami-gathariki.png'
```

**Transformations:**
- `f_auto` - Auto format (WebP when supported)
- `q_auto` - Auto quality
- `w_400,h_400` - Resize to 400x400px
- `c_fill` - Fill mode
- `g_face` - Smart face cropping

---

## Alternative: Automated Upload Script

If you prefer automation:

```bash
# 1. Install Cloudinary package (already done)
npm install cloudinary

# 2. Set environment variables
export CLOUDINARY_CLOUD_NAME=your_cloud_name
export CLOUDINARY_API_KEY=your_api_key
export CLOUDINARY_API_SECRET=your_api_secret

# 3. Place images in ./images/doctors/
mkdir -p images/doctors
# Copy your PNG files here

# 4. Run upload script
npx tsx scripts/upload-doctor-images.ts
```

The script will:
- Upload all images to Cloudinary
- Output the URLs to copy into seed script
- Apply automatic optimizations

---

## Why Cloudinary?

✅ **Already configured** in `next.config.mjs`  
✅ **Free tier**: 25GB storage, 25GB bandwidth/month  
✅ **Automatic optimization** (WebP, compression, resizing)  
✅ **CDN delivery** (fast global access)  
✅ **Smart cropping** (face detection)  
✅ **No code changes needed** (just update URLs)

---

## Troubleshooting

**Images not showing?**
- ✅ Check `next.config.mjs` has `res.cloudinary.com` (already done)
- ✅ Verify URLs are HTTPS
- ✅ Test URL in browser directly

**Need help?**
See full guide: `IMAGE_SETUP_GUIDE.md`

---

**That's it!** Your doctor images will display beautifully. 🎨
