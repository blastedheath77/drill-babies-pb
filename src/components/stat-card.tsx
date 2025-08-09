import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
  className?: string;
}

export function StatCard({ title, value, icon, description, className }: StatCardProps) {
  return (
    <Card className={cn('hover:bg-card/80 transition-colors', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          {title}
          {icon}
        </CardTitle>
        <CardContent className="p-0 pt-2">
          <div className="text-2xl font-bold">{value}</div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
      </CardHeader>
    </Card>
  );
}
