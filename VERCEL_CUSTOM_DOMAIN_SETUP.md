# Connecting Vercel to Custom Domain (Truehost)

This guide will help you connect your Vercel deployment to your custom domain currently hosted on Truehost.

## Prerequisites

- Your custom domain name (e.g., `yourdomain.com`)
- Access to Truehost DNS management panel
- Access to Vercel project settings

---

## Step 1: Add Domain in Vercel

1. **Go to your Vercel project**
   - Navigate to: https://vercel.com/dashboard
   - Select your project: `bkg001` (or your project name)

2. **Open Settings → Domains**
   - Click on **Settings** tab
   - Click on **Domains** in the left sidebar

3. **Add your domain**
   - Enter your domain (e.g., `yourdomain.com`)
   - Click **Add**
   - Vercel will show you DNS configuration instructions

4. **Note the DNS records Vercel provides**
   - You'll see something like:
     ```
     Type: A
     Name: @
     Value: 76.76.21.21
     
     Type: CNAME
     Name: www
     Value: cname.vercel-dns.com
     ```

---

## Step 2: Update DNS Records in Truehost

### Option A: Using A Record (Root Domain)

1. **Log into Truehost Control Panel**
   - Go to your Truehost account
   - Navigate to **DNS Management** or **Domain Management**

2. **Update A Record for Root Domain**
   - Find the **A record** for `@` or your root domain
   - Update the value to Vercel's IP address (shown in Vercel dashboard)
   - Common Vercel IPs: `76.76.21.21` or check your Vercel dashboard

3. **Update CNAME for www Subdomain**
   - Find or create **CNAME record** for `www`
   - Set value to: `cname.vercel-dns.com`
   - Or use the exact value Vercel provides

### Option B: Using CNAME (Recommended for Subdomains)

If you want to use a subdomain (e.g., `app.yourdomain.com`):

1. **In Truehost DNS:**
   - Create/Update **CNAME record**
   - Name: `app` (or your subdomain)
   - Value: `cname.vercel-dns.com`

2. **In Vercel:**
   - Add `app.yourdomain.com` as the domain

---

## Step 3: DNS Record Examples

### For Root Domain (yourdomain.com)

```
Type    Name    Value                    TTL
A       @       76.76.21.21              3600
CNAME   www     cname.vercel-dns.com     3600
```

### For Subdomain (app.yourdomain.com)

```
Type    Name    Value                    TTL
CNAME   app     cname.vercel-dns.com     3600
```

**Note:** Vercel will provide the exact IP addresses and CNAME values in your dashboard.

---

## Step 4: Wait for DNS Propagation

- DNS changes can take **15 minutes to 48 hours** to propagate
- Usually takes **15-30 minutes** for most cases
- Check propagation: https://www.whatsmydns.net/

---

## Step 5: Verify Domain in Vercel

1. **Go back to Vercel → Settings → Domains**
2. **Check domain status:**
   - ✅ **Valid Configuration** = Ready!
   - ⏳ **Pending** = Waiting for DNS propagation
   - ❌ **Invalid Configuration** = Check DNS records

3. **Vercel will automatically:**
   - Issue SSL certificate (Let's Encrypt)
   - Configure HTTPS
   - Set up redirects (www to non-www or vice versa)

---

## Step 6: Update Environment Variables

Update your Vercel environment variables to use the new domain:

1. **Go to Vercel → Settings → Environment Variables**

2. **Update or add:**
   ```
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```
   Or if using subdomain:
   ```
   NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
   ```

3. **Redeploy** (Vercel will auto-deploy on env var changes, or trigger manually)

---

## Step 7: Update Truehost (If Needed)

If you were hosting a website on Truehost:

1. **Backup your current site** (if needed)
2. **Point DNS to Vercel** (as done above)
3. **Keep Truehost account** for DNS management only (or cancel if not needed)

---

## Troubleshooting

### Domain Not Resolving

1. **Check DNS propagation:**
   ```bash
   # Check A record
   dig yourdomain.com A
   
   # Check CNAME
   dig www.yourdomain.com CNAME
   ```

2. **Verify DNS records in Truehost:**
   - Ensure records match exactly what Vercel shows
   - Check TTL values (3600 is standard)

3. **Wait longer:**
   - DNS can take up to 48 hours
   - Clear your browser cache
   - Try incognito/private browsing

### SSL Certificate Issues

- Vercel automatically issues SSL certificates
- Wait 5-10 minutes after domain is verified
- If issues persist, check Vercel dashboard for SSL status

### Mixed Content Warnings

- Ensure `NEXT_PUBLIC_APP_URL` uses `https://`
- Check all API calls use HTTPS
- Update any hardcoded HTTP URLs

### Redirects Not Working

- Check Vercel domain settings for redirect preferences
- Configure in Vercel → Settings → Domains → Your Domain → Configure

---

## Quick Checklist

- [ ] Domain added in Vercel
- [ ] DNS records updated in Truehost
- [ ] Waited for DNS propagation (15-30 min)
- [ ] Domain verified in Vercel (shows ✅ Valid)
- [ ] SSL certificate issued (automatic)
- [ ] Updated `NEXT_PUBLIC_APP_URL` environment variable
- [ ] Tested domain in browser
- [ ] Tested HTTPS redirect
- [ ] Updated any hardcoded URLs in code

---

## Common DNS Record Types

### A Record
- Points domain to IP address
- Use for root domain: `@` → `76.76.21.21`

### CNAME Record
- Points domain to another domain
- Use for subdomains: `www` → `cname.vercel-dns.com`

### AAAA Record (IPv6)
- Vercel also supports IPv6
- Usually not required, but can add for better compatibility

---

## After Setup

Once your domain is connected:

1. ✅ Your site will be accessible at `https://yourdomain.com`
2. ✅ Vercel handles SSL automatically
3. ✅ All deployments will automatically use the new domain
4. ✅ You can remove the `vercel.app` domain (optional)

---

## Need Help?

- **Vercel Docs:** https://vercel.com/docs/concepts/projects/domains
- **Vercel Support:** https://vercel.com/support
- **Truehost Support:** Check Truehost documentation or support

---

**Your custom domain setup is complete!** 🎉
