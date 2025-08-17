'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TestStoragePage() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string>('');

  const testFirebaseConnection = async () => {
    setTesting(true);
    setResult('');

    try {
      console.log('Testing Firebase connection...');
      
      // Test Firebase imports
      const { storage, db } = await import('@/lib/firebase');
      console.log('✓ Firebase modules imported');
      setResult(prev => prev + '✓ Firebase modules imported\n');

      // Test storage reference creation
      const { ref } = await import('firebase/storage');
      const testRef = ref(storage, 'test/connection-test.txt');
      console.log('✓ Storage reference created');
      setResult(prev => prev + '✓ Storage reference created\n');

      // Test Firestore connection
      const { collection, getDocs } = await import('firebase/firestore');
      const playersRef = collection(db, 'players');
      const snapshot = await getDocs(playersRef);
      console.log('✓ Firestore connection working, found', snapshot.size, 'players');
      setResult(prev => prev + `✓ Firestore connection working, found ${snapshot.size} players\n`);

      // Test upload permissions with a tiny file
      const { uploadBytes } = await import('firebase/storage');
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });
      
      const uploadRef = ref(storage, `test/upload-test-${Date.now()}.txt`);
      const uploadResult = await uploadBytes(uploadRef, testFile);
      console.log('✓ Storage upload successful');
      setResult(prev => prev + '✓ Storage upload test successful\n');

      // Get download URL
      const { getDownloadURL } = await import('firebase/storage');
      const downloadURL = await getDownloadURL(uploadResult.ref);
      console.log('✓ Download URL obtained:', downloadURL);
      setResult(prev => prev + `✓ Download URL obtained: ${downloadURL}\n`);

      setResult(prev => prev + '\n🎉 All Firebase tests passed! Storage should work.');

    } catch (error) {
      console.error('Firebase test failed:', error);
      setResult(prev => prev + `\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Firebase Storage Test</h1>
      
      <div className="space-y-4">
        <Button 
          onClick={testFirebaseConnection}
          disabled={testing}
          className="w-full"
        >
          {testing ? 'Testing...' : 'Test Firebase Storage Connection'}
        </Button>

        {result && (
          <Alert>
            <AlertDescription>
              <pre className="whitespace-pre-wrap text-sm">{result}</pre>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}