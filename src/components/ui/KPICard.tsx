import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

type ColorVariant = 'blue' | 'emerald' | 'amber' | 'violet' | 'rose';

interface KPICardProps {
    title: string;
    value: string;
    subValue?: string;
    icon: LucideIcon;
    color: ColorVariant;
    delta?: number;
    deltaLabel?: string;  // e.g., "vs mes ant."
    tooltip?: string;
    onClick?: () => void;
    loading?: boolean;
    featured?: boolean;   // 4th "total" card gets special styling
}

const colorMap: Record<ColorVariant, {
    bg: string; iconBg: string; iconText: string;
    border: string; deltaBg: string; deltaText: string;
    gradient: string; featuredBorder: string;
}> = {
    blue: {
        bg: 'bg-gradient-to-br from-blue-50 to-white',
        iconBg: 'bg-blue-100',
        iconText: 'text-blue-600',
        border: 'border-blue-100',
        deltaBg: 'bg-blue-50',
        deltaText: 'text-blue-700',
        gradient: 'from-blue-500 to-blue-600',
        featuredBorder: 'border-blue-400',
    },
    emerald: {
        bg: 'bg-gradient-to-br from-emerald-50 to-white',
        iconBg: 'bg-emerald-100',
        iconText: 'text-emerald-600',
        border: 'border-emerald-100',
        deltaBg: 'bg-emerald-50',
        deltaText: 'text-emerald-700',
        gradient: 'from-emerald-500 to-emerald-600',
        featuredBorder: 'border-emerald-400',
    },
    amber: {
        bg: 'bg-gradient-to-br from-amber-50 to-white',
        iconBg: 'bg-amber-100',
        iconText: 'text-amber-600',
        border: 'border-amber-100',
        deltaBg: 'bg-amber-50',
        deltaText: 'text-amber-700',
        gradient: 'from-amber-500 to-amber-600',
        featuredBorder: 'border-amber-400',
    },
    violet: {
        bg: 'bg-gradient-to-br from-violet-50 to-white',
        iconBg: 'bg-violet-100',
        iconText: 'text-violet-600',
        border: 'border-violet-100',
        deltaBg: 'bg-violet-50',
        deltaText: 'text-violet-700',
        gradient: 'from-violet-500 to-violet-600',
        featuredBorder: 'border-violet-400',
    },
    rose: {
        bg: 'bg-gradient-to-br from-rose-50 to-white',
        iconBg: 'bg-rose-100',
        iconText: 'text-rose-600',
        border: 'border-rose-100',
        deltaBg: 'bg-rose-50',
        deltaText: 'text-rose-700',
        gradient: 'from-rose-500 to-rose-600',
        featuredBorder: 'border-rose-400',
    },
};

export function KPICardSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm animate-pulse">
            <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100" />
                <div className="w-16 h-5 rounded-full bg-slate-100" />
            </div>
            <div className="h-3 w-24 bg-slate-100 rounded mb-3" />
            <div className="h-8 w-32 bg-slate-100 rounded mb-2" />
            <div className="h-3 w-20 bg-slate-100 rounded" />
        </div>
    );
}

export function KPICard({
    title,
    value,
    subValue,
    icon: Icon,
    color,
    delta,
    deltaLabel = 'vs período ant.',
    tooltip,
    onClick,
    loading = false,
    featured = false,
}: KPICardProps) {
    const c = colorMap[color];

    if (loading) return <KPICardSkeleton />;

    const hasDelta = delta !== undefined && delta !== null;
    const isPositive = hasDelta && delta > 0;
    const isNegative = hasDelta && delta < 0;

    return (
        <div
            onClick={onClick}
            title={tooltip}
            className={`
                relative overflow-hidden rounded-2xl border shadow-sm p-6
                transition-all duration-300 group
                ${c.bg} ${featured ? `border-2 ${c.featuredBorder} shadow-md` : `border ${c.border}`}
                ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : ''}
            `}
        >
            {/* Featured ribbon */}
            {featured && (
                <div className={`absolute top-0 right-0 bg-gradient-to-bl ${c.gradient} text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-wider uppercase`}>
                    Total
                </div>
            )}

            {/* Top row: icon + delta badge */}
            <div className="flex items-start justify-between mb-4">
                <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    ${c.iconBg} transition-transform duration-300 group-hover:scale-110
                `}>
                    <Icon className={`w-6 h-6 ${c.iconText}`} />
                </div>

                {hasDelta && (
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${isPositive ? 'bg-emerald-100 text-emerald-700' :
                            isNegative ? 'bg-rose-100 text-rose-700' :
                                'bg-slate-100 text-slate-500'
                        }`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> :
                            isNegative ? <TrendingDown className="w-3 h-3" /> :
                                <Minus className="w-3 h-3" />}
                        <span>
                            {isPositive ? '+' : ''}{delta > 0 || delta < 0
                                ? `$${Math.abs(delta).toLocaleString('es-CO')}`
                                : '='}
                        </span>
                    </div>
                )}
            </div>

            {/* Title */}
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>

            {/* Main value */}
            <p className={`text-2xl font-black tracking-tight ${featured ? c.iconText : 'text-slate-800'} mb-1`}>
                {value}
            </p>

            {/* Sub value + delta label */}
            <div className="flex items-center justify-between">
                {subValue && (
                    <p className="text-xs text-slate-400 font-medium">{subValue}</p>
                )}
                {hasDelta && deltaLabel && (
                    <p className="text-[10px] text-slate-400 ml-auto">{deltaLabel}</p>
                )}
            </div>

            {/* Tooltip hint */}
            {tooltip && (
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/0 pointer-events-none" />
            )}
        </div>
    );
}
