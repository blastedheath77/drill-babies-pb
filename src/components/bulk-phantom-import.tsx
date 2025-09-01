'use client';

import * as React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Users,
  Mail,
  Download,
  Eye
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface PhantomPlayerImportData {
  name: string;
  email?: string;
  avatar?: string;
}

interface BulkImportResult {
  created: number;
  failed: number;
  errors: string[];
  details: {
    created: string[];
    failed: Array<{ name: string; error: string }>;
    duplicateEmails: string[];
  };
}

interface BulkPhantomImportProps {
  onImport: (players: PhantomPlayerImportData[]) => Promise<BulkImportResult>;
  isLoading?: boolean;
  className?: string;
}

export function BulkPhantomImport({
  onImport,
  isLoading = false,
  className
}: BulkPhantomImportProps) {
  const [importMethod, setImportMethod] = useState<'csv' | 'manual'>('csv');
  const [csvData, setCsvData] = useState('');
  const [manualData, setManualData] = useState('');
  const [parsedPlayers, setParsedPlayers] = useState<PhantomPlayerImportData[]>([]);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleCsvParse = () => {
    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      const nameIndex = headers.findIndex(h => h.includes('name'));
      const emailIndex = headers.findIndex(h => h.includes('email'));
      const avatarIndex = headers.findIndex(h => h.includes('avatar'));
      
      if (nameIndex === -1) {
        throw new Error('CSV must include a "name" column');
      }

      const players: PhantomPlayerImportData[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
        
        if (row[nameIndex] && row[nameIndex].trim()) {
          players.push({
            name: row[nameIndex].trim(),
            email: emailIndex !== -1 ? row[emailIndex]?.trim() || undefined : undefined,
            avatar: avatarIndex !== -1 ? row[avatarIndex]?.trim() || undefined : undefined,
          });
        }
      }
      
      setParsedPlayers(players);
      setShowPreview(true);
    } catch (error) {
      alert(`CSV parsing error: ${error}`);
    }
  };

  const handleManualParse = () => {
    try {
      const lines = manualData.trim().split('\n');
      const players: PhantomPlayerImportData[] = [];
      
      for (const line of lines) {
        if (line.trim()) {
          const parts = line.split(',').map(p => p.trim());
          const name = parts[0];
          const email = parts[1] || undefined;
          const avatar = parts[2] || undefined;
          
          if (name) {
            players.push({ name, email, avatar });
          }
        }
      }
      
      setParsedPlayers(players);
      setShowPreview(true);
    } catch (error) {
      alert(`Parsing error: ${error}`);
    }
  };

  const handleImport = async () => {
    try {
      const result = await onImport(parsedPlayers);
      setImportResult(result);
      setShowPreview(false);
    } catch (error) {
      alert(`Import error: ${error}`);
    }
  };

  const handleReset = () => {
    setCsvData('');
    setManualData('');
    setParsedPlayers([]);
    setImportResult(null);
    setShowPreview(false);
  };

  const generateSampleCsv = () => {
    return `name,email,avatar
John Smith,john@example.com,https://example.com/avatar1.jpg
Jane Doe,jane@example.com,
Mike Johnson,,https://example.com/avatar2.jpg
Sarah Wilson,sarah@example.com,`;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Upload className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle>Bulk Import Phantom Players</CardTitle>
              <CardDescription>
                Import multiple phantom players at once using CSV or manual entry
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Import Result */}
      {importResult && (
        <ImportResultCard result={importResult} onReset={handleReset} />
      )}

      {/* Preview */}
      {showPreview && !importResult && (
        <PreviewCard 
          players={parsedPlayers}
          onImport={handleImport}
          onBack={() => setShowPreview(false)}
          isLoading={isLoading}
        />
      )}

      {/* Import Interface */}
      {!showPreview && !importResult && (
        <Card>
          <CardContent className="pt-6">
            <Tabs value={importMethod} onValueChange={(value) => setImportMethod(value as 'csv' | 'manual')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="csv">CSV Import</TabsTrigger>
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              </TabsList>
              
              <TabsContent value="csv" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">CSV Data</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const sample = generateSampleCsv();
                        const blob = new Blob([sample], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'phantom-players-sample.csv';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Sample CSV
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Paste your CSV data here...
name,email,avatar
John Smith,john@example.com,
Jane Doe,jane@example.com,https://example.com/avatar.jpg"
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <div className="text-xs text-muted-foreground">
                    CSV should have headers: name (required), email (optional), avatar (optional)
                  </div>
                </div>
                
                <Button 
                  onClick={handleCsvParse}
                  disabled={!csvData.trim()}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Parse CSV Data
                </Button>
              </TabsContent>
              
              <TabsContent value="manual" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Player Data (one per line)</label>
                  <Textarea
                    placeholder="Enter player data, one per line:
John Smith, john@example.com
Jane Doe, jane@example.com, https://example.com/avatar.jpg
Mike Johnson
Sarah Wilson, sarah@example.com"
                    value={manualData}
                    onChange={(e) => setManualData(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <div className="text-xs text-muted-foreground">
                    Format: Name, Email (optional), Avatar URL (optional)
                  </div>
                </div>
                
                <Button 
                  onClick={handleManualParse}
                  disabled={!manualData.trim()}
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Players
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!showPreview && !importResult && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="font-medium text-blue-900">Import Instructions</div>
              <div className="space-y-2 text-sm text-blue-800">
                <div>• <strong>Name</strong> is required for all phantom players</div>
                <div>• <strong>Email</strong> is optional but makes players claimable</div>
                <div>• <strong>Avatar</strong> is optional and should be a valid image URL</div>
                <div>• Players without emails will be anonymous phantom players</div>
                <div>• Duplicate emails will be rejected automatically</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface PreviewCardProps {
  players: PhantomPlayerImportData[];
  onImport: () => void;
  onBack: () => void;
  isLoading: boolean;
}

function PreviewCard({ players, onImport, onBack, isLoading }: PreviewCardProps) {
  const claimablePlayers = players.filter(p => p.email).length;
  const anonymousPlayers = players.filter(p => !p.email).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Preview Import</span>
            </CardTitle>
            <CardDescription>
              Review {players.length} phantom players before importing
            </CardDescription>
          </div>
          
          <div className="flex space-x-2">
            <Badge variant="outline" className="text-blue-600">
              <Mail className="h-3 w-3 mr-1" />
              {claimablePlayers} claimable
            </Badge>
            <Badge variant="outline" className="text-gray-600">
              <Users className="h-3 w-3 mr-1" />
              {anonymousPlayers} anonymous
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{players.length}</div>
            <div className="text-sm text-muted-foreground">Total Players</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{claimablePlayers}</div>
            <div className="text-sm text-muted-foreground">With Email</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{anonymousPlayers}</div>
            <div className="text-sm text-muted-foreground">Anonymous</div>
          </div>
        </div>

        <Separator />

        {/* Player List Preview */}
        <div className="max-h-64 overflow-y-auto space-y-2">
          {players.slice(0, 10).map((player, index) => (
            <div key={index} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{player.name}</div>
                  {player.email && (
                    <div className="text-xs text-muted-foreground">{player.email}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {player.email ? (
                  <Badge variant="outline" className="text-xs">Claimable</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Anonymous</Badge>
                )}
              </div>
            </div>
          ))}
          
          {players.length > 10 && (
            <div className="text-center text-sm text-muted-foreground py-2">
              ... and {players.length - 10} more players
            </div>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack} disabled={isLoading}>
            Back to Edit
          </Button>
          
          <div className="flex space-x-2">
            <Button 
              onClick={onImport} 
              disabled={isLoading || players.length === 0}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {players.length} Players
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ImportResultCardProps {
  result: BulkImportResult;
  onReset: () => void;
}

function ImportResultCard({ result, onReset }: ImportResultCardProps) {
  const successRate = result.created + result.failed > 0 
    ? Math.round((result.created / (result.created + result.failed)) * 100)
    : 0;

  return (
    <Card className={cn(
      result.created > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {result.created > 0 ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-red-600" />
            )}
            <div>
              <CardTitle className={result.created > 0 ? 'text-green-900' : 'text-red-900'}>
                Import {result.created > 0 ? 'Completed' : 'Failed'}
              </CardTitle>
              <CardDescription className={result.created > 0 ? 'text-green-700' : 'text-red-700'}>
                {result.created} created, {result.failed} failed ({successRate}% success rate)
              </CardDescription>
            </div>
          </div>
          
          <Button variant="outline" onClick={onReset}>
            Import More Players
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Success Rate</span>
            <span>{successRate}%</span>
          </div>
          <Progress value={successRate} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <div className="text-2xl font-bold text-green-700">{result.created}</div>
            <div className="text-sm text-green-600">Successfully Created</div>
          </div>
          <div className="p-3 bg-red-100 rounded-lg">
            <div className="text-2xl font-bold text-red-700">{result.failed}</div>
            <div className="text-sm text-red-600">Failed</div>
          </div>
        </div>

        {/* Duplicate Emails Warning */}
        {result.details.duplicateEmails.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {result.details.duplicateEmails.length} duplicate email{result.details.duplicateEmails.length > 1 ? 's' : ''} found: {result.details.duplicateEmails.join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Errors */}
        {result.failed > 0 && (
          <div className="space-y-2">
            <div className="font-medium text-red-900">Failed Imports:</div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {result.details.failed.slice(0, 5).map((failure, index) => (
                <div key={index} className="text-sm p-2 bg-red-100 rounded text-red-800">
                  <strong>{failure.name}:</strong> {failure.error}
                </div>
              ))}
              {result.details.failed.length > 5 && (
                <div className="text-sm text-red-600">
                  ... and {result.details.failed.length - 5} more errors
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BulkPhantomImport;