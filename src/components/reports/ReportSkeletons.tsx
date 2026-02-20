export const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-slate-200 rounded ${className}`}></div>
);

export const KPISkeleton = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="h-8 w-24 bg-slate-100 rounded mb-2 animate-pulse" />
        <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
    </div>
);

export const ChartSkeleton = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80">
        <div className="h-6 w-48 bg-slate-100 rounded mb-6 animate-pulse" />
        <div className="h-[calc(100%-2rem)] w-full bg-slate-50 rounded animate-pulse" />
    </div>
);

export const TableSkeleton = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="h-6 w-48 bg-slate-100 rounded mb-6 animate-pulse" />
        <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 w-full bg-slate-50 rounded animate-pulse" />
            ))}
        </div>
    </div>
);
