'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { testFirebaseSetup } from '@/lib/firebase-test';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface TestResults {
  authInitialized: boolean;
  firestoreInitialized: boolean;
  authConfigValid: boolean;
  firestoreAccessible: boolean;
  errorDetails: string[];
}

export default function FirebaseTestPage() {
  const [results, setResults] = useState<TestResults | null>(null);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    try {
      const testResults = await testFirebaseSetup();
      setResults(testResults);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: boolean) => {
    return (
      <Badge variant={status ? "default" : "destructive"}>
        {status ? "PASS" : "FAIL"}
      </Badge>
    );
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Firebase Configuration Test</h1>
          <p className="text-muted-foreground">
            Diagnose Firebase Authentication and Firestore setup issues
          </p>
        </div>
        <Button onClick={runTests} disabled={testing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
          Run Tests
        </Button>
      </div>

      {testing && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Running Firebase tests...</AlertDescription>
        </Alert>
      )}

      {results && (
        <div className="grid gap-6">
          {/* Test Results Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Test Results Summary</CardTitle>
              <CardDescription>Firebase service initialization and configuration status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(results.authInitialized)}
                    <span>Firebase Auth Initialized</span>
                  </div>
                  {getStatusBadge(results.authInitialized)}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(results.firestoreInitialized)}
                    <span>Firestore Initialized</span>
                  </div>
                  {getStatusBadge(results.firestoreInitialized)}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(results.authConfigValid)}
                    <span>Auth Configuration Valid</span>
                  </div>
                  {getStatusBadge(results.authConfigValid)}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(results.firestoreAccessible)}
                    <span>Firestore Accessible</span>
                  </div>
                  {getStatusBadge(results.firestoreAccessible)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Details */}
          {results.errorDetails.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center">
                  <XCircle className="h-5 w-5 mr-2" />
                  Configuration Issues Found
                </CardTitle>
                <CardDescription>
                  The following issues need to be resolved for proper Firebase functionality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.errorDetails.map((error, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Setup Instructions */}
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-600">Firebase Setup Instructions</CardTitle>
              <CardDescription>
                Follow these steps to properly configure Firebase for your project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">1. Firebase Console Setup</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Go to <a href="https://console.firebase.google.com" target="_blank" className="text-blue-600 hover:underline">Firebase Console</a></li>
                    <li>Find or create project: <code className="bg-muted px-1 rounded">pbstats-claude</code></li>
                    <li>Enable Authentication → Email/Password provider</li>
                    <li>Create Firestore Database in test mode</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">2. Security Rules (Firestore)</h4>
                  <div className="bg-muted p-3 rounded text-xs font-mono">
                    {`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}`}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">3. Verification</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Refresh this page to re-run tests</li>
                    <li>All tests should show PASS status</li>
                    <li>Try creating a new account at /register</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Success Message */}
          {results.authInitialized && 
           results.firestoreInitialized && 
           results.authConfigValid && 
           results.firestoreAccessible && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>🎉 Firebase is fully configured!</strong> Your authentication system is ready to use.
                You can now register new users and use real Firebase Authentication.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {!results && !testing && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Click "Run Tests" to check your Firebase configuration</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}