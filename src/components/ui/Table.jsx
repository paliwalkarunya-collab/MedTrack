import { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

const Table = forwardRef(
  ({
    className,
    columns,
    data,
    sortConfig,
    onSort,
    rowKey,
    emptyMessage = 'No data found',
    emptyIcon,
    stickyHeader = false,
    hoverable = true,
    striped = false,
    compact = false,
    ...props
  }, ref) => {
    const getRowKey = (row) => typeof rowKey === 'function' ? rowKey(row) : row[rowKey];

    const handleSort = (key) => {
      if (onSort) onSort(key);
    };

    const SortedIcon = ({ direction }) => (
      <span className="flex flex-col -space-y-1 ml-1">
        {direction === 'asc' ? (
          <ChevronUp className="w-3 h-3 text-foreground" />
        ) : (
          <ChevronDown className="w-3 h-3 text-foreground" />
        )}
      </span>
    );

    if (data.length === 0) {
      return (
        <div className="rounded-lg border border-border bg-background p-8 text-center">
          {emptyIcon && (
            <div className="mx-auto mb-3 text-muted-foreground/50">
              {emptyIcon}
            </div>
          )}
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className={cn('overflow-x-auto rounded-lg border border-border bg-background', className)}>
        <table ref={ref} className="w-full text-sm" {...props}>
          <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
            <tr className={cn('border-b border-border', striped && 'bg-muted/30')}>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 font-semibold text-foreground/80 text-left',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.headerClassName
                  )}
                >
                  {column.sortable && onSort ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-1.5 hover:text-foreground transition-subtle cursor-pointer"
                      aria-sort={sortConfig?.key === column.key ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      {column.label}
                      {sortConfig?.key === column.key && (
                        <SortedIcon direction={sortConfig.direction} />
                      )}
                      {sortConfig?.key !== column.key && (
                        <span className="flex flex-col -space-y-1 ml-1 opacity-40">
                          <ChevronUp className="w-3 h-3" />
                          <ChevronDown className="w-3 h-3" />
                        </span>
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={getRowKey(row)}
                className={cn(
                  'border-b border-border/50 last:border-0 transition-subtle',
                  hoverable && 'hover:bg-muted/30',
                  striped && rowIndex % 2 === 1 && 'bg-muted/30',
                  compact && 'h-10'
                )}
              >
                {columns.map((column) => {
                  const value = row[column.key];
                  const content = column.render
                    ? column.render(value, row, rowIndex)
                    : value;
                  return (
                    <td
                      key={column.key}
                      className={cn(
                        'px-4 py-3 text-foreground',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right',
                        compact && 'py-2',
                        column.cellClassName
                      )}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);
Table.displayName = 'Table';

export { Table };
