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
        <div className="relative overflow-hidden rounded-md border border-transparent bg-white/5 p-2 backdrop-blur-2xl hover:bg-white/10 transition-colors cursor-pointer">
          {/* Health status dot - top right */}
          {healthDotColor && (
            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: healthDotColor }} />
          )}
          
          <div className="flex items-start justify-between gap-3">
            {/* Left: Metric Name and Change */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <p className="text-[10px] text-white/60 uppercase tracking-wide font-medium truncate leading-tight">
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
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <p className="text-lg font-bold text-white leading-none">
                  {metric.latest_value.toFixed(1)} {metric.unit}
                </p>
                <p className="text-[9px] text-white/40 mt-0.5">
                  {typeof metric.change_pct === 'number' ? `${metric.change_pct > 0 ? '+' : ''}${metric.change_pct.toFixed(1)}%` : ''}
                </p>
              </div>
              {metric.sparkline_points.length > 0 && (
                <div className="w-28 h-10">
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
