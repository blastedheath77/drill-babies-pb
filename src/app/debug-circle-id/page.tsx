'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CircleData {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: any;
}

export default function DebugCircleIdPage() {
  const [circleId, setCircleId] = useState('I6Ei00HTwmiSJeAnB8L9');
  const [circle, setCircle] = useState<CircleData | null>(null);
  const [allCircles, setAllCircles] = useState<CircleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCircleById = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 Fetching circle with ID: ${id}`);
      
      const circleDoc = await getDoc(doc(db, 'circles', id));
      
      if (circleDoc.exists()) {
        const circleData = {
          id: circleDoc.id,
          ...circleDoc.data()
        } as CircleData;
        
        setCircle(circleData);
        console.log('Circle found:', circleData);
      } else {
        setCircle(null);
        setError('Circle not found with that ID');
        console.log('Circle not found');
      }
      
    } catch (err: any) {
      console.error('Failed to fetch circle:', err);
      setError(err.message);
      setCircle(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCircles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Fetching all circles...');
      
      const circlesSnapshot = await getDocs(collection(db, 'circles'));
      console.log(`Found ${circlesSnapshot.size} circles`);
      
      const circlesData = circlesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CircleData[];
      
      setAllCircles(circlesData);
      
      // Log each circle for debugging
      circlesData.forEach((circle, index) => {
        console.log(`Circle ${index + 1}:`, {
          id: circle.id,
          name: circle.name,
          description: circle.description,
          createdBy: circle.createdBy
        });
      });
      
    } catch (err: any) {
      console.error('Failed to fetch circles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: any) => {
    try {
      if (date?.toDate) {
        return date.toDate().toLocaleString();
      } else if (date instanceof Date) {
        return date.toLocaleString();
      } else {
        return String(date);
      }
    } catch {
      return 'Invalid Date';
    }
  };

  // Auto-fetch on component mount
  useEffect(() => {
    fetchCircleById(circleId);
    fetchAllCircles();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Circle ID Debug</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Look up Specific Circle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input 
              value={circleId}
              onChange={(e) => setCircleId(e.target.value)}
              placeholder="Enter circle ID"
              className="flex-1"
            />
            <Button onClick={() => fetchCircleById(circleId)} disabled={loading}>
              {loading ? 'Loading...' : 'Look Up'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded mb-6">
          <h3 className="font-semibold text-red-800">Error:</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {circle && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Circle Found: {circle.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div><strong>ID:</strong> {circle.id}</div>
              <div><strong>Name:</strong> {circle.name}</div>
              <div><strong>Description:</strong> {circle.description || 'No description'}</div>
              <div><strong>Created By:</strong> {circle.createdBy}</div>
              <div><strong>Created At:</strong> {formatDate(circle.createdAt)}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {allCircles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Circles ({allCircles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allCircles.map((circle, index) => (
                <div 
                  key={circle.id} 
                  className={`p-3 border rounded ${
                    circle.id === circleId ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="font-semibold">{circle.name}</div>
                  <div className="text-sm space-y-1 mt-1">
                    <div><strong>ID:</strong> {circle.id}</div>
                    <div><strong>Description:</strong> {circle.description || 'No description'}</div>
                    <div><strong>Created By:</strong> {circle.createdBy}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}