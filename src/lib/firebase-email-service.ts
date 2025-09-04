import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Firebase Email Service using Firestore + Extension
 * 
 * This approach uses Firebase's "Send Mail" extension which:
 * 1. Watches a Firestore collection for new documents
 * 2. Automatically sends emails based on document data
 * 3. Updates the document with delivery status
 * 
 * Setup required:
 * 1. Install "Send Mail" extension in Firebase Console
 * 2. Configure email provider (SendGrid, etc.)
 * 3. Set collection name (default: 'mail')
 */

interface EmailData {
  to: string[];
  template?: {
    name: string;
    data: Record<string, any>;
  };
  message?: {
    subject: string;
    text?: string;
    html?: string;
  };
}

/**
 * Send phantom player invitation email using Firebase Extension
 */
export async function sendPhantomPlayerInviteFirebase(
  playerEmail: string,
  playerName: string,
  appUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
): Promise<{ success: boolean; error?: string }> {
  try {
    const registrationUrl = `${appUrl}/register?email=${encodeURIComponent(playerEmail)}`;
    
    // Email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Join PBStats - Claim Your Player Profile</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6, #f97316); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .cta-button { 
              display: inline-block; 
              background: #3b82f6; 
              color: white; 
              padding: 15px 30px; 
              text-decoration: none; 
              border-radius: 6px; 
              font-weight: bold;
              margin: 20px 0;
            }
            .stats-box { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏓 Welcome to PBStats!</h1>
              <p>Your pickleball journey awaits</p>
            </div>
            <div class="content">
              <h2>Hi ${playerName}!</h2>
              
              <p>Great news! We found a player profile that belongs to you in our pickleball stats system. Your games and statistics are waiting to be claimed.</p>
              
              <div class="stats-box">
                <h3>🎯 What's waiting for you:</h3>
                <ul>
                  <li><strong>Player Profile:</strong> ${playerName}</li>
                  <li><strong>Game History:</strong> All your recorded matches</li>
                  <li><strong>Statistics:</strong> Wins, losses, and rating history</li>
                  <li><strong>Community:</strong> Join circles and connect with other players</li>
                </ul>
              </div>
              
              <p>Click the button below to create your account and claim your profile. It only takes a minute!</p>
              
              <div style="text-align: center;">
                <a href="${registrationUrl}" class="cta-button">🚀 Claim Your Profile</a>
              </div>
              
              <p><strong>Why claim your profile?</strong></p>
              <ul>
                <li>📊 Track your progress and improvement over time</li>
                <li>🏆 See your wins, losses, and current rating</li>
                <li>👥 Connect with other players in your circles</li>
                <li>📈 View detailed statistics and trends</li>
              </ul>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="background: #e2e8f0; padding: 10px; border-radius: 4px; font-family: monospace; word-break: break-all;">
                ${registrationUrl}
              </p>
              
              <div class="footer">
                <p>This invitation was sent because a phantom player profile with your email was created in PBStats.</p>
                <p>If you don't play pickleball or received this by mistake, you can safely ignore this email.</p>
                <p><em>Happy playing! 🏓</em></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
Hi ${playerName}!

Great news! We found a player profile that belongs to you in our pickleball stats system.

What's waiting for you:
- Player Profile: ${playerName}  
- Game History: All your recorded matches
- Statistics: Wins, losses, and rating history
- Community: Join circles and connect with other players

Claim your profile: ${registrationUrl}

Why claim your profile?
- Track your progress and improvement over time
- See your wins, losses, and current rating  
- Connect with other players in your circles
- View detailed statistics and trends

This invitation was sent because a phantom player profile with your email was created in PBStats.
If you don't play pickleball or received this by mistake, you can safely ignore this email.

Happy playing! 🏓
    `;

    // Email data for Firebase Extension
    const emailData: EmailData = {
      to: [playerEmail],
      message: {
        subject: `🏓 Claim Your PBStats Profile - ${playerName}`,
        html: emailHtml,
        text: emailText
      }
    };

    // Add to Firestore collection - Firebase Extension will process it
    const docRef = await addDoc(collection(db, 'mail'), {
      ...emailData,
      createdAt: serverTimestamp(),
      type: 'phantom-player-invite',
      playerName,
      // Extension will add delivery status fields automatically
    });

    console.log('✅ Phantom player invitation queued for sending:', docRef.id);
    
    return {
      success: true
    };

  } catch (error) {
    console.error('❌ Failed to queue phantom player invitation:', error);
    
    let errorMessage = 'Failed to send invitation email';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Alternative: Use Cloud Function callable approach
 * This calls a Firebase Cloud Function that handles email sending
 */
export async function sendPhantomPlayerInviteCloudFunction(
  playerEmail: string,
  playerName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // This would call a Firebase Cloud Function
    // const { getFunctions, httpsCallable } = await import('firebase/functions');
    // const functions = getFunctions();
    // const sendInvite = httpsCallable(functions, 'sendPhantomPlayerInvite');
    
    // const result = await sendInvite({
    //   playerEmail,
    //   playerName
    // });

    // For now, return placeholder
    console.log('📧 Would call Cloud Function to send invite to:', playerEmail);
    
    return {
      success: false,
      error: 'Cloud Function approach not implemented yet. Use Firestore extension approach instead.'
    };

  } catch (error) {
    console.error('❌ Failed to call Cloud Function:', error);
    
    return {
      success: false,
      error: 'Failed to call email Cloud Function'
    };
  }
}

/**
 * Send test email to verify Firebase email service is working
 */
export async function sendTestEmailFirebase(
  toEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const emailData: EmailData = {
      to: [toEmail],
      message: {
        subject: '🏓 PBStats Firebase Email Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>🎉 Firebase Email Service is Working!</h2>
            <p>This is a test email from PBStats using Firebase Extensions to verify that the email service is configured correctly.</p>
            <p>If you received this email, everything is working properly with your Firebase email setup.</p>
            <p><strong>Setup used:</strong> Firebase "Send Mail" extension</p>
            <p><em>Happy playing! 🏓</em></p>
          </div>
        `,
        text: 'PBStats Firebase Email Test - If you received this email, your Firebase email service is working properly!'
      }
    };

    const docRef = await addDoc(collection(db, 'mail'), {
      ...emailData,
      createdAt: serverTimestamp(),
      type: 'test-email'
    });

    console.log('✅ Test email queued for sending:', docRef.id);
    
    return {
      success: true
    };

  } catch (error) {
    console.error('❌ Failed to queue test email:', error);
    
    let errorMessage = 'Failed to send test email';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}