import { useState, useEffect } from 'react';
import {
    BarChart3, Users, Calendar, CheckCircle2, TrendingUp,
    PieChart as PieChartIcon, User, DollarSign,
    ChevronRight, AlertCircle, RefreshCw, Download
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
    Legend
} from 'recharts';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '../lib/api';
import {
    ReportKPIs, AppointmentsByDay, ServiceRanking,
    ProfessionalStats, IncomeSummary, Appointment
} from '../types';
import { KPISkeleton } from '../components/reports/ReportSkeletons';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

type DateRangeType = 'today' | 'week' | 'month' | 'custom';

export default function Reportes() {
    const [rangeType, setRangeType] = useState<DateRangeType>('month');
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState<ReportKPIs | null>(null);
    const [appointmentsByDay, setAppointmentsByDay] = useState<AppointmentsByDay[]>([]);
    const [serviceRanking, setServiceRanking] = useState<ServiceRanking[]>([]);
    const [professionalStats, setProfessionalStats] = useState<ProfessionalStats[]>([]);
    const [incomeSummary, setIncomeSummary] = useState<IncomeSummary[]>([]);
    const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);

    useEffect(() => {
        handleRangeChange(rangeType);
    }, [rangeType]);

    useEffect(() => {
        fetchData();
    }, [startDate, endDate]);

    const handleRangeChange = (type: DateRangeType) => {
        const today = new Date();
        if (type === 'today') {
            const dateStr = format(today, 'yyyy-MM-dd');
            setStartDate(dateStr);
            setEndDate(dateStr);
        } else if (type === 'week') {
            setStartDate(format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
            setEndDate(format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        } else if (type === 'month') {
            setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
            setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
        }
        setRangeType(type);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const startStr = `${startDate}T00:00:00`;
            const endStr = `${endDate}T23:59:59`;

            const [
                kpiData,
                dayData,
                rankingData,
                profData,
                incomeData,
                allApts
            ] = await Promise.all([
                api.getReportKPIs(startStr, endStr),
                api.getAppointmentsByDay(startStr, endStr),
                api.getServicesRanking(startStr, endStr),
                api.getAppointmentsByProfessional(startStr, endStr),
                api.getIncomeSummary(startStr, endStr),
                api.getAppointments()
            ]);

            setKpis(kpiData);
            setAppointmentsByDay(dayData);
            setServiceRanking(rankingData);
            setProfessionalStats(profData);
            setIncomeSummary(incomeData);

            const filteredApts = allApts.filter(a => {
                const aptDate = a.date.split('T')[0];
                return aptDate >= startDate && aptDate <= endDate;
            }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10);

            setRecentAppointments(filteredApts);
        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setLoading(false);
        }
    };

    const EmptyState = ({ message }: { message: string }) => (
        <div className="flex flex-col items-center justify-center p-12 text-center h-full">
            <div className="bg-slate-50 p-4 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">{message}</p>
        </div>
    );

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-500">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <BarChart3 className="w-7 h-7 text-blue-600" />
                        Reportes y Estadísticas
                    </h1>
                    <p className="text-slate-500">Visualiza el rendimiento de tu consultorio</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                    <button
                        onClick={() => handleRangeChange('today')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${rangeType === 'today' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        Hoy
                    </button>
                    <button
                        onClick={() => handleRangeChange('week')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${rangeType === 'week' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        Esta Semana
                    </button>
                    <button
                        onClick={() => handleRangeChange('month')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${rangeType === 'month' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        Este Mes
                    </button>

                    <div className="h-6 w-px bg-slate-200 mx-1" />

                    <div className="flex items-center gap-2 px-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setRangeType('custom');
                            }}
                            className="text-sm border-none focus:ring-0 cursor-pointer text-slate-700 font-medium p-0"
                        />
                        <span className="text-slate-300">→</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setRangeType('custom');
                            }}
                            className="text-sm border-none focus:ring-0 cursor-pointer text-slate-700 font-medium p-0"
                        />
                    </div>

                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Refrescar datos"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? (
                    <>
                        <KPISkeleton />
                        <KPISkeleton />
                        <KPISkeleton />
                        <KPISkeleton />
                    </>
                ) : (
                    <>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Users className="w-6 h-6" />
                                </div>
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                            </div>
                            <h3 className="text-slate-500 text-sm font-medium mb-1">Total Pacientes</h3>
                            <p className="text-2xl font-bold text-slate-800 tracking-tight">{kpis?.totalPatients}</p>
                            <p className="text-xs text-slate-400 mt-2 italic">Registro histórico total</p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Período</span>
                            </div>
                            <h3 className="text-slate-500 text-sm font-medium mb-1">Citas Agendadas</h3>
                            <p className="text-2xl font-bold text-slate-800 tracking-tight">{kpis?.totalAppointments}</p>
                            <p className="text-xs text-slate-400 mt-2">En el rango seleccionado</p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-semibold text-emerald-600">
                                    {kpis?.totalAppointments ? Math.round((kpis.completedAppointments / kpis.totalAppointments) * 100) : 0}% efectividad
                                </span>
                            </div>
                            <h3 className="text-slate-500 text-sm font-medium mb-1">Citas Completadas</h3>
                            <p className="text-2xl font-bold text-slate-800 tracking-tight">{kpis?.completedAppointments}</p>
                            <p className="text-xs text-slate-400 mt-2">Atenciones realizadas</p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                            </div>
                            <h3 className="text-slate-500 text-sm font-medium mb-1">Ingresos Estimados</h3>
                            <p className="text-2xl font-bold text-slate-800 tracking-tight">
                                ${kpis?.estimatedIncome.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs text-slate-400 mt-2 italic">Solo citas completadas</p>
                        </div>
                    </>
                )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Appointments Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[400px]">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Flujo de Citas por Día
                    </h3>
                    {loading ? (
                        <div className="h-64 animate-pulse bg-slate-50 rounded-lg" />
                    ) : appointmentsByDay.length > 0 ? (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={appointmentsByDay}>
                                    <defs>
                                        <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorSched" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(val) => format(parseISO(val), 'dd MMM', { locale: es })}
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        labelFormatter={(val) => format(parseISO(val as string), 'eeee dd de MMMM', { locale: es })}
                                    />
                                    <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                                    <Area
                                        type="monotone"
                                        dataKey="completed"
                                        name="Completadas"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorComp)"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="scheduled"
                                        name="Programadas"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorSched)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyState message="No hay suficientes datos para mostrar el gráfico de flujo" />
                    )}
                </div>

                {/* Services Pie Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[400px]">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <PieChartIcon className="w-5 h-5 text-amber-500" />
                        Servicios más Populares
                    </h3>
                    {loading ? (
                        <div className="h-64 animate-pulse bg-slate-50 rounded-lg" />
                    ) : serviceRanking.length > 0 ? (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={serviceRanking}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="count"
                                        nameKey="name"
                                    >
                                        {serviceRanking.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend layout="vertical" align="right" verticalAlign="middle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyState message="No hay datos de servicios solicitados" />
                    )}
                </div>

                {/* Professional Performance */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 col-span-1 lg:col-span-2">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-500" />
                        Citas por Profesional
                    </h3>
                    {loading ? (
                        <div className="h-48 animate-pulse bg-slate-50 rounded-lg" />
                    ) : professionalStats.length > 0 ? (
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={professionalStats} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" axisLine={false} tickLine={false} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 13, fontWeight: 500 }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="count" name="Citas" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyState message="No hay datos de profesionales para este período" />
                    )}
                </div>
            </div>

            {/* Tables Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Recent Appointments Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-500" />
                            Citas del Período
                        </h3>
                        {recentAppointments.length > 0 && (
                            <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                Ver todas <ChevronRight className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="p-6 space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-50 animate-pulse rounded" />)}
                            </div>
                        ) : recentAppointments.length > 0 ? (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Paciente</th>
                                        <th className="px-6 py-4">Servicio</th>
                                        <th className="px-6 py-4">Fecha</th>
                                        <th className="px-6 py-4 text-right">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {recentAppointments.map((apt) => (
                                        <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-700">{apt.patientName}</td>
                                            <td className="px-6 py-4 text-slate-600">{apt.serviceName}</td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {format(parseISO(apt.date), 'dd/MM/yy HH:mm')}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${apt.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                                                        apt.status === 'cancelled' ? 'bg-rose-50 text-rose-700' :
                                                            'bg-blue-50 text-blue-700'
                                                    }`}>
                                                    {apt.status === 'completed' ? 'Completada' :
                                                        apt.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-12 text-center text-slate-400 italic">
                                No hay citas registradas en este período
                            </div>
                        )}
                    </div>
                </div>

                {/* Income Summary Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-emerald-500" />
                            Ingresos por Servicio
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-all"
                                title="Exportar reporte"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="p-6 space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-50 animate-pulse rounded" />)}
                            </div>
                        ) : incomeSummary.length > 0 ? (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Servicio</th>
                                        <th className="px-6 py-4 text-center">Cantidad</th>
                                        <th className="px-6 py-4 text-right">Unitario</th>
                                        <th className="px-6 py-4 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {incomeSummary.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-700">{item.serviceName}</td>
                                            <td className="px-6 py-4 text-center text-slate-600 font-semibold">{item.count}</td>
                                            <td className="px-6 py-4 text-right text-slate-500">
                                                ${item.unitPrice.toLocaleString('es-CO')}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-blue-600">
                                                ${item.total.toLocaleString('es-CO')}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-blue-50/30">
                                        <td className="px-6 py-4 font-bold text-slate-800" colSpan={3}>TOTAL ESTIMADO</td>
                                        <td className="px-6 py-4 text-right font-black text-blue-700 text-lg">
                                            ${incomeSummary.reduce((sum, item) => sum + item.total, 0).toLocaleString('es-CO')}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-12 text-center text-slate-400 italic">
                                No hay datos de ingresos registrados
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
