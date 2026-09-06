import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, MoreHorizontal } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  isCurrentPage?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
  className?: string;
  onNavigate?: (href: string) => void;
}

function Breadcrumb({
  items,
  separator,
  maxItems = 4,
  className,
  onNavigate,
}: BreadcrumbProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const getVisibleItems = () => {
    if (isExpanded || items.length <= maxItems) {
      return items;
    }

    const firstItem = items[0];
    const lastItems = items.slice(-(maxItems - 1));
    return [firstItem, { label: "...", isEllipsis: true }, ...lastItems];
  };

  const visibleItems = getVisibleItems();

  const handleClick = (item: BreadcrumbItem, e: React.MouseEvent) => {
    if (item.href && onNavigate) {
      e.preventDefault();
      onNavigate(item.href);
    }
  };

  return (
    <nav aria-label="Breadcrumb" className={cn("flex", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1;
          const isEllipsis = "isEllipsis" in item && item.isEllipsis;

          return (
            <li
              key={index}
              className="flex items-center gap-1"
            >
              {index > 0 && (
                <span className="text-slate-400">
                  {separator || <ChevronRight className="h-3 w-3" />}
                </span>
              )}
              {isEllipsis ? (
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </button>
              ) : isLast || item.isCurrentPage ? (
                <span
                  className="text-sm font-medium text-slate-900"
                  aria-current="page"
                >
                  {item.icon && (
                    <span className="mr-1 inline-flex">{item.icon}</span>
                  )}
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href || "#"}
                  onClick={(e) => handleClick(item, e)}
                  className="text-sm text-slate-500 hover:text-slate-900"
                >
                  {item.icon && (
                    <span className="mr-1 inline-flex">{item.icon}</span>
                  )}
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface BreadcrumbSeparatorProps {
  children?: React.ReactNode;
  className?: string;
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.LiHTMLAttributes<HTMLLIElement> & BreadcrumbSeparatorProps) {
  return (
    <li
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:h-3.5 [&>svg]:w-3.5", className)}
      {...props}
    >
      {children || <ChevronRight />}
    </li>
  );
}

interface BreadcrumbItemProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

function BreadcrumbItem({
  children,
  className,
  ...props
}: React.LiHTMLAttributes<HTMLLIElement> & BreadcrumbItemProps) {
  return (
    <li
      className={cn(
        "inline-flex items-center gap-1.5",
        className
      )}
      {...props}
    >
      {children}
    </li>
  );
}

interface BreadcrumbLinkProps {
  href?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

function BreadcrumbLink({
  href,
  children,
  className,
  onClick,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & BreadcrumbLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "text-sm text-slate-500 hover:text-slate-900 transition-colors",
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </a>
  );
}

interface BreadcrumbPageProps {
  children: React.ReactNode;
  className?: string;
}

function BreadcrumbPage({
  children,
  className,
  ...props
}: React.SpanHTMLAttributes<HTMLSpanElement> & BreadcrumbPageProps) {
  return (
    <span
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("text-sm font-medium text-slate-900", className)}
      {...props}
    >
      {children}
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
export type { BreadcrumbItem as BreadcrumbItemType };
