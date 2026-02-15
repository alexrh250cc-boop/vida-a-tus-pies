import { BarChart3 } from 'lucide-react';

export default function Reportes() {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="p-4 bg-slate-100 rounded-full mb-4">
                <BarChart3 className="w-12 h-12 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Reportes Administrativos</h2>
            <p className="text-slate-500 max-w-md">
                Este módulo estará disponible en la versión completa con conexión a base de datos real para generar métricas precisas.
            </p>
        </div>
    );
}
