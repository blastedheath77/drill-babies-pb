'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  Download,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  User,
  FileText,
  Eye,
  Database,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getAuditEvents,
  getAuditStatistics,
  exportAuditEvents,
  type AuditEvent,
  type AuditEventType,
  type AuditSeverity
} from '@/lib/audit-trail';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface AuditStatistics {
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  recentActivity: AuditEvent[];
  topUsers: Array<{ userId: string; eventCount: number }>;
}

export function AdminAuditTrailViewer() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Filter state
  const [filterEventType, setFilterEventType] = useState<AuditEventType | ''>('');
  const [filterSeverity, setFilterSeverity] = useState<AuditSeverity | ''>('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // View state
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [activeTab, setActiveTab] = useState('events');

  const eventTypeOptions: AuditEventType[] = [
    'phantom_player_created',
    'phantom_player_claimed',
    'phantom_player_unclaimed',
    'phantom_player_deleted',
    'phantom_player_updated',
    'phantom_player_made_claimable',
    'bulk_phantom_import',
    'circle_invite_sent',
    'email_circle_invite_sent',
    'circle_invite_accepted',
    'circle_invite_declined',
    'email_invite_converted',
    'user_registration',
    'user_onboarding_completed',
    'admin_action',
    'database_migration',
    'system_cleanup'
  ];

  const severityOptions: AuditSeverity[] = ['info', 'warning', 'error', 'critical'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [eventsData, statsData] = await Promise.all([
        getAuditEvents({
          eventType: filterEventType || undefined,
          severity: filterSeverity || undefined,
          userId: filterUserId || undefined,
          startDate: filterStartDate || undefined,
          endDate: filterEndDate || undefined,
          limit: 100
        }),
        getAuditStatistics()
      ]);
      
      setEvents(eventsData);
      setStatistics(statsData);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load audit trail data'
      });
    }
    setIsLoading(false);
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setIsExporting(true);
    try {
      const result = await exportAuditEvents({
        eventType: filterEventType || undefined,
        severity: filterSeverity || undefined,
        userId: filterUserId || undefined,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined
      }, format);

      if (result.success && result.data && result.filename) {
        // Create and trigger download
        const blob = new Blob([result.data], { 
          type: format === 'json' ? 'application/json' : 'text/csv' 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Export Complete',
          description: `Audit events exported as ${result.filename}`
        });
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export audit events'
      });
    }
    setIsExporting(false);
  };

  const getSeverityColor = (severity: AuditSeverity) => {
    switch (severity) {
      case 'info': return 'text-blue-600 bg-blue-50';
      case 'warning': return 'text-orange-600 bg-orange-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'critical': return 'text-red-800 bg-red-100';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getEventTypeDisplay = (eventType: AuditEventType) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Audit Trail Viewer
          </CardTitle>
          <CardDescription>
            View and analyze system audit logs and phantom player activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="events">Audit Events</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
              <TabsTrigger value="filters">Filters & Export</TabsTrigger>
            </TabsList>

            <TabsContent value="statistics" className="space-y-4">
              {statistics && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Database className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">Total Events</span>
                        </div>
                        <div className="text-2xl font-bold mt-2">{statistics.totalEvents}</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span className="text-sm font-medium">Warnings</span>
                        </div>
                        <div className="text-2xl font-bold mt-2">
                          {statistics.eventsBySeverity.warning || 0}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-medium">Errors</span>
                        </div>
                        <div className="text-2xl font-bold mt-2">
                          {(statistics.eventsBySeverity.error || 0) + (statistics.eventsBySeverity.critical || 0)}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Active Users</span>
                        </div>
                        <div className="text-2xl font-bold mt-2">
                          {statistics.topUsers.length}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Events by Type</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {Object.entries(statistics.eventsByType)
                            .sort(([,a], [,b]) => b - a)
                            .map(([eventType, count]) => (
                              <div key={eventType} className="flex justify-between items-center text-sm">
                                <span>{getEventTypeDisplay(eventType as AuditEventType)}</span>
                                <Badge variant="secondary">{count}</Badge>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Recent Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {statistics.recentActivity.slice(0, 10).map((event) => (
                            <div key={event.id} className="border-l-2 border-blue-200 pl-3 py-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">
                                  {getEventTypeDisplay(event.eventType)}
                                </span>
                                <Badge 
                                  variant="secondary" 
                                  className={getSeverityColor(event.severity)}
                                >
                                  {event.severity}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDistanceToNow(parseISO(event.timestamp))} ago
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="filters" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                  <CardDescription>
                    Filter audit events by type, severity, user, or date range
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Event Type</Label>
                      <Select value={filterEventType} onValueChange={(value) => setFilterEventType(value as AuditEventType)}>
                        <SelectTrigger>
                          <SelectValue placeholder="All event types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All event types</SelectItem>
                          {eventTypeOptions.map((type) => (
                            <SelectItem key={type} value={type}>
                              {getEventTypeDisplay(type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Severity</Label>
                      <Select value={filterSeverity} onValueChange={(value) => setFilterSeverity(value as AuditSeverity)}>
                        <SelectTrigger>
                          <SelectValue placeholder="All severities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All severities</SelectItem>
                          {severityOptions.map((severity) => (
                            <SelectItem key={severity} value={severity}>
                              {severity.charAt(0).toUpperCase() + severity.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>User ID</Label>
                      <Input
                        value={filterUserId}
                        onChange={(e) => setFilterUserId(e.target.value)}
                        placeholder="Filter by user ID"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Date Range</Label>
                      <div className="flex space-x-2">
                        <Input
                          type="date"
                          value={filterStartDate}
                          onChange={(e) => setFilterStartDate(e.target.value)}
                        />
                        <Input
                          type="date"
                          value={filterEndDate}
                          onChange={(e) => setFilterEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button onClick={loadData} disabled={isLoading}>
                      <Search className="h-4 w-4 mr-2" />
                      Apply Filters
                    </Button>
                    <Button 
                      onClick={() => {
                        setFilterEventType('');
                        setFilterSeverity('');
                        setFilterUserId('');
                        setFilterStartDate('');
                        setFilterEndDate('');
                      }}
                      variant="outline"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Export Options</CardTitle>
                  <CardDescription>
                    Export audit events for compliance or analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => handleExport('json')} 
                      disabled={isExporting}
                      variant="outline"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export as JSON
                    </Button>
                    <Button 
                      onClick={() => handleExport('csv')} 
                      disabled={isExporting}
                      variant="outline"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export as CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Audit Events ({events.length})</h3>
                <Button onClick={loadData} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(parseISO(event.timestamp))} ago
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {getEventTypeDisplay(event.eventType)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={getSeverityColor(event.severity)}
                          >
                            {event.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {event.userId || '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {event.playerId && (
                            <div>Player: {event.playerId}</div>
                          )}
                          {event.circleId && (
                            <div>Circle: {event.circleId}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => setSelectedEvent(event)}
                            size="sm"
                            variant="outline"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {events.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No audit events found</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
              <CardDescription>
                {getEventTypeDisplay(selectedEvent.eventType)} - {formatDistanceToNow(parseISO(selectedEvent.timestamp))} ago
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Event ID</Label>
                  <div className="text-sm font-mono bg-muted p-2 rounded">
                    {selectedEvent.id}
                  </div>
                </div>
                <div>
                  <Label>Timestamp</Label>
                  <div className="text-sm">
                    {new Date(selectedEvent.timestamp).toLocaleString()}
                  </div>
                </div>
                <div>
                  <Label>Severity</Label>
                  <Badge className={getSeverityColor(selectedEvent.severity)}>
                    {selectedEvent.severity}
                  </Badge>
                </div>
                <div>
                  <Label>Source</Label>
                  <div className="text-sm">
                    {selectedEvent.metadata.source}
                  </div>
                </div>
              </div>

              {selectedEvent.details && (
                <div>
                  <Label>Details</Label>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedEvent.details, null, 2)}
                  </pre>
                </div>
              )}

              <Button 
                onClick={() => setSelectedEvent(null)}
                className="w-full"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}