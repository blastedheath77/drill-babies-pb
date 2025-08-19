'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, LogIn } from 'lucide-react';

export default function TestMobileAuthPage() {
  const { user, logout } = useAuth();
  const [showInstructions, setShowInstructions] = useState(true);

  const forceLogout = () => {
    logout();
    // Also clear localStorage to ensure complete logout
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pbstats-user');
      localStorage.setItem('pbstats-logged-out', 'true');
    }
    window.location.reload(); // Force reload to see changes
  };

  return (
    <div className="container max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mobile Authentication Test</CardTitle>
          <CardDescription>
            Test the mobile sidebar authentication experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Current Auth State:</h3>
            {user ? (
              <div className="space-y-2">
                <p>✅ <strong>Logged in as:</strong> {user.name}</p>
                <p>📧 <strong>Email:</strong> {user.email}</p>
                <p>👤 <strong>Role:</strong> {user.role}</p>
              </div>
            ) : (
              <p>❌ <strong>Not logged in</strong></p>
            )}
          </div>

          {showInstructions && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">📱 How to Test Mobile Sidebar:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Open this page on mobile device or use browser dev tools mobile view</li>
                <li>Click the hamburger menu (☰) in the top-left corner</li>
                <li>Scroll to the bottom of the sidebar menu</li>
                <li>You should see the authentication section</li>
              </ol>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setShowInstructions(false)}
              >
                Hide Instructions
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold">Test Actions:</h3>
            
            {user ? (
              <div className="space-y-2">
                <Button 
                  onClick={forceLogout} 
                  variant="destructive" 
                  className="w-full"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Force Logout & Test Sign-In UI
                </Button>
                <p className="text-sm text-muted-foreground">
                  This will log you out so you can see the sign-in buttons in the mobile sidebar
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm">
                  Perfect! Now open the mobile sidebar (☰) and scroll to the bottom to see:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                  <li>🔵 "Sign In" button</li>
                  <li>⚪ "Create Account" button</li>
                  <li>💡 "Or browse as viewer" text</li>
                </ul>
                <Button 
                  onClick={() => window.location.href = '/login'} 
                  className="w-full"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Go to Login Page
                </Button>
              </div>
            )}
          </div>

          <div className="p-3 bg-gray-50 rounded text-xs text-gray-600">
            <strong>Note:</strong> The sidebar footer shows different content based on login state:
            <br />• <strong>Logged out:</strong> Sign in + Create account buttons
            <br />• <strong>Logged in:</strong> User profile card + Sign out button
          </div>
        </CardContent>
      </Card>
    </div>
  );
}