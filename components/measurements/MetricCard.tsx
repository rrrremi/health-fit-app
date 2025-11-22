import Link from 'next/link';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Sparkline } from './Sparkline';
import type { MetricSummary } from '@/types/measurements';
import { InlineErrorBoundary } from '@/components/ErrorBoundary';
import { getHealthStatusColor } from '@/lib/health-status';

interface MetricCardProps {
  metric: MetricSummary;
}

export function MetricCard({ metric }: MetricCardProps) {
  const healthDotColor = getHealthStatusColor(metric.health_status);

  return (
    <InlineErrorBoundary>
      <Link href={`/protected/measurements/${metric.metric}`}>
        <div className="relative overflow-hidden rounded-md border border-transparent bg-white/5 p-3 sm:p-2 backdrop-blur-2xl hover:bg-white/10 transition-colors cursor-pointer min-h-[80px] sm:min-h-0">
          {/* Health status dot - top right */}
          {healthDotColor && (
            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: healthDotColor }} />
          )}
          
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
            {/* Left: Metric Name and Change */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <p className="text-[14px] text-white/97 uppercase tracking-wide font-normal leading-tight">
                  {metric.display_name}
                </p>
                {metric.source === 'ocr' && metric.confidence !== null && (
                  <span className="text-[9px] text-emerald-400/70 flex-shrink-0">
                    📸 {Math.round(metric.confidence * 100)}%
                  </span>
                )}
                {metric.source === 'manual' && (
                  <span className="text-[9px] text-blue-400/70 flex-shrink-0">
                    ✍️
                  </span>
                )}
              </div>
            </div>

            {/* Right: Value and Sparkline */}
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
              <div className="text-left sm:text-right">
                <p className="text-lg font-normal text-white leading-none">
                  {metric.latest_value.toFixed(1)} <span className="text-xs font-light">{metric.unit}</span>
                </p>
                <p className="text-[11px] text-white/40 mt-0.5">
                  {typeof metric.change_pct === 'number' ? `${metric.change_pct > 0 ? '+' : ''}${metric.change_pct.toFixed(1)}%` : ''}
                </p>
              </div>
              {metric.sparkline_points.length > 0 && (
                <div className="w-20 h-8 sm:w-28 sm:h-10 flex-shrink-0">
                  <Sparkline
                    data={metric.sparkline_points}
                    color="#fff"
                    unit={metric.unit}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </InlineErrorBoundary>
  );
}
