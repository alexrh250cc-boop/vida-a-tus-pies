import clsx from 'clsx';

interface LogoProps {
    variant?: 'sidebar' | 'header' | 'small';
    className?: string;
}

export default function Logo({ variant = 'sidebar', className }: LogoProps) {
    return (
        <div className={clsx("flex flex-col items-center justify-center select-none", className)}>

            {/* Contenedor principal del texto VIDA + Línea */}
            <div className={clsx(
                "relative flex flex-col items-center",
                variant === 'header' && "flex-row gap-2 items-baseline"
            )}>
                {/* Texto VIDA con gradiente */}
                <h1 className={clsx(
                    "font-bold tracking-tight bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent",
                    variant === 'sidebar' && "text-3xl",
                    variant === 'header' && "text-2xl",
                    variant === 'small' && "text-xl"
                )}>
                    VIDA

                    {/* Línea decorativa debajo de VIDA (solo visible en sidebar y small cuando no es header) */}
                    {variant !== 'header' && (
                        <span className="absolute -bottom-1 left-0 w-full h-[3px] rounded-full bg-gradient-to-r from-green-400 to-blue-500 opacity-80"></span>
                    )}
                </h1>

                {/* Texto secundario A TUS PIES */}
                <span className={clsx(
                    "font-bold text-slate-600 tracking-wider",
                    variant === 'sidebar' && "text-sm mt-1",
                    variant === 'header' && "text-xs",
                    variant === 'small' && "text-[10px] mt-0.5"
                )}>
                    A TUS PIES
                </span>
            </div>

            {/* Eslogan opcional (solo sidebar) */}
            {variant === 'sidebar' && (
                <p className="text-[10px] text-slate-400 italic mt-1 font-medium tracking-wide">
                    La salud de tus pies es importante
                </p>
            )}
        </div>
    );
}
