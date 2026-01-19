# Image Setup Guide
## Cloudinary Integration for Doctor Profile Images

Your Next.js app is already configured for Cloudinary! This guide will help you upload and use doctor images.

---

## Why Cloudinary?

✅ **Already configured** in `next.config.mjs`  
✅ **Free tier** (25GB storage, 25GB bandwidth/month)  
✅ **Automatic optimization** (resizing, format conversion, compression)  
✅ **CDN delivery** (fast global image delivery)  
✅ **Transformations** (crop, resize, filters on-the-fly)  
✅ **Secure** (signed URLs, access control)

---

## Step 1: Create Cloudinary Account

1. Go to https://cloudinary.com/users/register/free
2. Sign up (free account is sufficient)
3. Verify your email
4. Go to Dashboard → Settings → Upload

---

## Step 2: Get Your Cloudinary Credentials

From Cloudinary Dashboard:

1. **Cloud Name**: Found in Dashboard (top right)
2. **API Key**: Settings → Security → API Key
3. **API Secret**: Settings → Security → API Secret (click "Reveal")

Save these for later!

---

## Step 3: Upload Doctor Images

### Option A: Upload via Cloudinary Dashboard (Easiest)

1. Go to Cloudinary Dashboard → Media Library
2. Click **"Upload"** button
3. Create a folder: `doctors` (optional but recommended)
4. Upload all 5 doctor PNG images:
   - `dr-mukami-gathariki.png`
   - `dr-ken-aluora.png`
   - `dr-john-paul-ogalo.png`
   - `dr-angela-muoki.png`
   - `dr-dorsi-jowi.png`

5. After upload, click on each image to get the URL
6. Copy the **"Secure URL"** for each image

The URL format will be:
```
https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1234567890/doctors/dr-mukami-gathariki.png
```

### Option B: Upload via Cloudinary CLI (Automated)

```bash
# Install Cloudinary CLI
npm install -g cloudinary-cli

# Configure (enter your credentials)
cloudinary config

# Upload all images at once
cloudinary uploader upload ./images/doctors/dr-mukami-gathariki.png --folder doctors
cloudinary uploader upload ./images/doctors/dr-ken-aluora.png --folder doctors
cloudinary uploader upload ./images/doctors/dr-john-paul-ogalo.png --folder doctors
cloudinary uploader upload ./images/doctors/dr-angela-muoki.png --folder doctors
cloudinary uploader upload ./images/doctors/dr-dorsi-jowi.png --folder doctors
```

### Option C: Upload via API (Programmatic)

See `scripts/upload-doctor-images.ts` below.

---

## Step 4: Update Seed Script with Cloudinary URLs

Once you have the Cloudinary URLs, update `prisma/seed.ts`:

```typescript
const doctorData = [
  {
    // ... other fields
    profile_image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1234567890/doctors/dr-mukami-gathariki.png',
  },
  {
    // ... other fields
    profile_image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1234567890/doctors/dr-ken-aluora.png',
  },
  // ... etc
];
```

---

## Step 5: Environment Variables (Optional)

For programmatic uploads, add to `.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Note:** These are optional if you only upload via dashboard.

---

## Step 6: Image Optimization (Automatic)

Cloudinary automatically optimizes images, but you can add transformations:

### In Seed Script (Recommended)

Add transformations to URLs for automatic optimization:

```typescript
// Original
profile_image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/doctors/dr-mukami-gathariki.png'

// Optimized (auto-format, auto-quality, resize)
profile_image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/f_auto,q_auto,w_400,h_400,c_fill,g_face/doctors/dr-mukami-gathariki.png'
```

**Transformations:**
- `f_auto` - Auto format (WebP when supported)
- `q_auto` - Auto quality optimization
- `w_400,h_400` - Resize to 400x400px
- `c_fill` - Fill mode (maintains aspect ratio)
- `g_face` - Face detection for smart cropping

### In Next.js Image Component

The `ProfileImage` component already uses Next.js Image, which works with Cloudinary URLs automatically.

---

## Step 7: Update Database

After updating seed script with Cloudinary URLs:

```bash
# Re-seed database with new image URLs
npm run db:seed
```

Or update existing records:

```sql
UPDATE "Doctor" 
SET profile_image = 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/doctors/dr-mukami-gathariki.png'
WHERE email = 'mukami.gathariki@nairobisculpt.com';
```

---

## Image URL Structure

### Recommended Structure

```
https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/
  [transformations]/          # Optional: f_auto,q_auto,w_400,h_400
  doctors/                    # Folder (optional)
  dr-mukami-gathariki.png     # Image filename
```

### Example URLs

**Basic:**
```
https://res.cloudinary.com/your-cloud/image/upload/doctors/dr-mukami-gathariki.png
```

**Optimized:**
```
https://res.cloudinary.com/your-cloud/image/upload/f_auto,q_auto,w_400,h_400,c_fill,g_face/doctors/dr-mukami-gathariki.png
```

---

## Future: Image Upload API

For allowing admins to upload new doctor images, see `scripts/upload-doctor-images.ts` example below.

---

## Troubleshooting

### Images Not Loading

1. **Check Next.js config**: Ensure `res.cloudinary.com` is in `remotePatterns` ✅ (already done)
2. **Check URL format**: Must be HTTPS
3. **Check CORS**: Cloudinary allows all origins by default
4. **Check image exists**: Verify URL in browser

### Image Quality Issues

- Add `q_auto` transformation for automatic quality
- Use `f_auto` for format optimization
- Specify dimensions: `w_400,h_400`

### Performance

- Cloudinary CDN is fast globally
- Next.js Image component adds additional optimization
- Consider lazy loading for below-fold images

---

## Security Best Practices

1. **Use signed URLs** for private images (if needed)
2. **Set upload presets** with restrictions
3. **Use folders** to organize images
4. **Set access control** if images are sensitive
5. **Don't expose API secret** in client-side code

---

## Cost Considerations

**Free Tier:**
- 25GB storage
- 25GB bandwidth/month
- 25,000 transformations/month

**For 5 doctor images (~500KB each = 2.5MB total):**
- Storage: ✅ Well within free tier
- Bandwidth: ✅ Can serve ~10,000 views/month
- Transformations: ✅ Plenty for optimization

**Upgrade if:**
- More than 25GB storage needed
- More than 25GB bandwidth/month
- Need advanced features

---

## Alternative: Vercel Blob Storage

If you prefer Vercel's solution:

1. Add Vercel Blob Storage addon
2. Upload images via Vercel dashboard
3. Use Vercel Blob URLs

**Pros:** Integrated with Vercel, simple  
**Cons:** Less features than Cloudinary, vendor lock-in

---

**Recommendation: Use Cloudinary** ✅

It's already configured, has better features, and the free tier is generous for your needs.
