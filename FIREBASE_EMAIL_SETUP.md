# 🔥 Firebase Email Setup Guide

This guide shows you how to set up email sending for phantom player invites using Firebase Extensions.

## 📋 Overview

We've implemented **two email approaches**:

1. **🔥 Firebase Extension** (Recommended) - Uses Firebase's official "Send Mail" extension
2. **📧 Resend API** - Direct API approach (already implemented)

## 🚀 Option 1: Firebase Extension (Recommended)

### Step 1: Install Firebase Extension

1. Go to your [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Extensions** in the left sidebar
4. Click **"Browse Hub"**
5. Search for **"Send Mail"** 
6. Click **"Install"** on the official Firebase extension

### Step 2: Configure the Extension

During installation, you'll configure:

- **Collection name**: `mail` (default)
- **Email provider**: Choose one:
  - **SendGrid** (recommended for production)
  - **Mailgun**
  - **SMTP** (Gmail, custom server)

#### SendGrid Setup (Recommended):
1. Sign up at [SendGrid.com](https://sendgrid.com)
2. Get your API key
3. Enter it during Firebase extension setup
4. Verify your sender email/domain

#### Gmail SMTP Setup:
- **SMTP Host**: `smtp.gmail.com`
- **SMTP Port**: `587`
- **SMTP User**: Your Gmail address
- **SMTP Password**: Your app password (not regular password)

### Step 3: Update Your Code

Change the phantom player management to use Firebase:

```typescript
// In admin-phantom-player-management.tsx
// Change the API endpoint from:
const response = await fetch('/api/send-phantom-invite', {

// To:
const response = await fetch('/api/send-phantom-invite-firebase', {
```

### Step 4: Test the Setup

1. Create a phantom player with your email
2. Click the "Invite" button
3. Check the `mail` collection in Firestore - you should see a document
4. Check your email inbox

## 📧 Option 2: Keep Using Resend API

If you prefer to stick with Resend (already implemented):

1. Sign up at [Resend.com](https://resend.com)
2. Get your API key
3. Update `.env.local`:
   ```bash
   RESEND_API_KEY=re_your_actual_key_here
   RESEND_FROM_EMAIL=PBStats <noreply@yourdomain.com>
   ```
4. Restart your server
5. The current invite button will work immediately

## 🔧 How Each Approach Works

### Firebase Extension Approach:
1. **Admin clicks Invite** → API call to `/api/send-phantom-invite-firebase`
2. **Document added** to Firestore `mail` collection
3. **Firebase Extension** automatically processes the document
4. **Email sent** via your configured provider (SendGrid, etc.)
5. **Document updated** with delivery status

### Resend API Approach:
1. **Admin clicks Invite** → API call to `/api/send-phantom-invite`
2. **Direct API call** to Resend service
3. **Email sent** immediately
4. **Response returned** with success/failure

## 📊 Monitoring Email Delivery

### Firebase Extension:
- Check Firestore `mail` collection for delivery status
- Firebase Console → Extensions → Send Mail → View logs
- Documents show `delivery.state` field:
  - `PROCESSING` - Being sent
  - `SUCCESS` - Delivered successfully  
  - `ERROR` - Failed to send

### Resend API:
- Check Resend dashboard for delivery logs
- API responses include immediate success/failure

## 🎯 Which Approach to Choose?

| Feature | Firebase Extension | Resend API |
|---------|-------------------|------------|
| **Setup Complexity** | Medium (extension setup) | Easy (just API key) |
| **Cost** | Free tier + provider costs | Free tier available |
| **Reliability** | High (Firebase managed) | High (Resend managed) |
| **Monitoring** | Firestore + Firebase logs | Resend dashboard |
| **Scalability** | Auto-scaling | Auto-scaling |
| **Integration** | Native Firebase | API-based |

**Recommendation**: 
- **Firebase Extension** if you're already heavily using Firebase
- **Resend API** if you want simplicity and quick setup

## 🔍 Troubleshooting

### Firebase Extension Issues:
1. **No emails being sent**: Check Extensions logs in Firebase Console
2. **Permission errors**: Ensure Firestore security rules allow writing to `mail` collection
3. **Provider issues**: Verify API keys and sender email configuration

### Resend API Issues:
1. **"Email service not configured"**: Add `RESEND_API_KEY` to `.env.local`
2. **Domain verification**: Use your verified domain in `RESEND_FROM_EMAIL`
3. **API limits**: Check Resend dashboard for usage limits

## 📝 Security Rules

If using Firebase Extension, add this to your Firestore security rules:

```javascript
// Allow admins to write to mail collection for sending emails
match /mail/{document} {
  allow create: if request.auth != null && 
                   request.auth.token.role == 'admin';
  allow read: if request.auth != null && 
                 request.auth.token.role == 'admin';
}
```

## 🚀 Ready to Go!

Choose your preferred approach and follow the setup steps. Both methods will send beautiful, professional phantom player invitation emails! 

The email template includes:
- 🎨 Professional PBStats branding
- 📱 Mobile-responsive design  
- 🔗 Direct registration link with pre-filled email
- 📊 Clear explanation of phantom player benefits
- ✅ Call-to-action to claim their profile

Happy emailing! 📧🏓