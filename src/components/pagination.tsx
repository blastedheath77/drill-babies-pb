'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  totalItems?: number;
  showPageSizeSelect?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
  showPageSizeSelect = true,
}: PaginationProps) {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  // Calculate visible page numbers (show max 5 pages)
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        {totalItems !== undefined && (
          <span>
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)} to{' '}
            {Math.min(currentPage * pageSize, totalItems)} of {totalItems} results
          </span>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {showPageSizeSelect && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(parseInt(value))}
            >
              <SelectTrigger className="h-8 w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={!canGoPrevious}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="sr-only">Go to first page</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrevious}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Go to previous page</span>
          </Button>

          {visiblePages.map((page, index) => (
            <Button
              key={index}
              variant={page === currentPage ? 'default' : 'outline'}
              size="sm"
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={page === '...'}
              className="h-8 w-8 p-0"
            >
              {page}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Go to next page</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={!canGoNext}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="h-4 w-4" />
            <span className="sr-only">Go to last page</span>
          </Button>
        </div>
      </div>
    </div>
  );
}