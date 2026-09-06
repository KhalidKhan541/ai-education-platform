import * as React from "react";
import { cn } from "@/lib/utils";
import { Breadcrumb, BreadcrumbItem } from "../ui/breadcrumb";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  icon,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mb-4">
          <Breadcrumb
            items={breadcrumbs.map((item, index) => ({
              ...item,
              isCurrentPage: index === breadcrumbs.length - 1,
            }))}
          />
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="rounded-lg bg-slate-100 p-3 text-slate-600">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}

interface PageHeaderActionProps {
  children: React.ReactNode;
  className?: string;
}

function PageHeaderAction({ children, className }: PageHeaderActionProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {children}
    </div>
  );
}

interface PageHeaderTabProps {
  tabs: {
    label: string;
    href?: string;
    active?: boolean;
    icon?: React.ReactNode;
  }[];
  className?: string;
}

function PageHeaderTabs({ tabs, className }: PageHeaderTabProps) {
  return (
    <div className={cn("mt-6 border-b border-slate-200", className)}>
      <nav className="-mb-px flex space-x-6">
        {tabs.map((tab) => (
          <a
            key={tab.label}
            href={tab.href || "#"}
            className={cn(
              "inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium transition-colors",
              tab.active
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            )}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

interface PageHeaderStatsProps {
  stats: {
    label: string;
    value: string | number;
    change?: string;
    positive?: boolean;
  }[];
  className?: string;
}

function PageHeaderStats({ stats, className }: PageHeaderStatsProps) {
  return (
    <div
      className={cn(
        "mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4",
        className
      )}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">{stat.label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
          {stat.change && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                stat.positive ? "text-emerald-600" : "text-red-600"
              )}
            >
              {stat.change}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export { PageHeader, PageHeaderAction, PageHeaderTabs, PageHeaderStats };
