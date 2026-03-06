import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Appointment, Patient, SalesMetrics } from '../types';
import {
    Calendar, TrendingUp, Clock, Pill,
    ShoppingBag, ChevronRight, Phone, Package,
    PieChart as PieChartIcon, DollarSign, Activity,
    ArrowUpRight, Sparkles, BarChart2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, PieChart, Pie, Legend, Label,
    ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell
} from 'recharts';
import {
    startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    startOfYear, endOfYear, format
} from 'date-fns';
import { es } from 'date-fns/locale';
import { KPICard, KPICardSkeleton } from '../components/ui/KPICard';

type Period = 'semana' | 'mes' | 'año';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

const PERIOD_LABEL: Record<Period, string> = {
    semana: 'vs semana ant.',
    mes: 'vs mes ant.',
    año: 'vs año ant.',
};

// ── Mensajes amigables según contexto ─────────────────────────────────────
const EMPTY_MESSAGES = {
    ventas: [
        "✨ No hay ventas hoy. ¿Es un día de descanso?",
        "🦶 Aún no hay registros. ¡La caja está esperando!",
        "📦 Sin ventas por ahora. ¡A empezar el día!",
        "💤 Este período está en blanco. ¿Probamos mañana?",
        "🌟 Silencio en caja. ¿Listo para la primera venta?"
    ],
    citas: [
        "📅 Agenda vacía. ¿Un café mientras esperas?",
        "☀️ Sin citas por hoy. ¡Día libre!",
        "⏰ Horario despejado. ¿Aprovechas para organizar?",
        "📋 No hay pacientes agendados. Momento perfecto para archivar.",
        "🕊️ Calma total. Disfruta mientras dure."
    ],
    productos: [
        "📦 Inventario sin movimiento hoy.",
        "🏷️ No se vendieron productos. ¿Ofertas nuevas?",
        "💊 Sin medicamentos hoy. Stock completo.",
        "📊 Rotación cero. ¿Revisamos precios?",
        "🛒 Carrito vacío. ¡A impulsar ventas!"
    ],
    grafico: [
        "📊 No hay datos de evolución en este período",
        "📈 Crea ventas o completa citas para ver el gráfico",
        "📉 Sin actividad registrada. ¡Empieza a facturar!"
    ]
};

const getRandomMessage = (type: 'ventas' | 'citas' | 'productos' | 'grafico'): string => {
    const messages = EMPTY_MESSAGES[type];
    return messages[Math.floor(Math.random() * messages.length)];
};

// ── Custom Tooltip for BarChart ─────────────────────────────────────────────
const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-slate-100 rounded-xl shadow-xl p-3 text-sm min-w-[180px] animate-in fade-in duration-200">
            <p className="font-semibold text-slate-500 mb-2 border-b border-slate-100 pb-1">
                {label?.split('-').reverse().join('/')}
            </p>
            {payload.map((p: any) => (
                <div key={p.name} className="flex items-center justify-between gap-4 mb-1">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        <span className="text-slate-600">{p.name}:</span>
                    </div>
                    <span className="font-bold text-slate-800">
                        ${p.value?.toLocaleString('es-CO')}
                    </span>
                </div>
            ))}
            <div className="mt-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">Total día:</span>
                    <span className="font-bold text-blue-600">
                        ${payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0).toLocaleString('es-CO')}
                    </span>
                </div>
            </div>
        </div>
    );
};

// ── Status helpers ────────────────────────────────────────────────────────────
const statusMap: Record<string, { label: string; cls: string }> = {
    scheduled: { label: 'Programada', cls: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Completada', cls: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'Cancelada', cls: 'bg-rose-100 text-rose-700' },
};

const avatarColors = [
    'bg-red-100 text-red-700', 'bg-orange-100 text-orange-700',
    'bg-amber-100 text-amber-700', 'bg-lime-100 text-lime-700',
    'bg-green-100 text-green-700', 'bg-emerald-100 text-emerald-700',
    'bg-teal-100 text-teal-700', 'bg-cyan-100 text-cyan-700',
    'bg-sky-100 text-sky-700', 'bg-blue-100 text-blue-700',
    'bg-indigo-100 text-indigo-700', 'bg-violet-100 text-violet-700',
    'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700',
];
const getAvatarColor = (name: string) => avatarColors[name.length % avatarColors.length];

// ── Activity feed item type ───────────────────────────────────────────────────
type FeedItem = {
    id: string;
    type: 'cita' | 'med' | 'prod';
    name: string;
    detail: string;
    amount: number;
    date: string;
};

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [periodo, setPeriodo] = useState<Period>('mes');
    const [salesMetrics, setSalesMetrics] = useState<SalesMetrics | null>(null);

    useEffect(() => { loadData(); }, [periodo]);

    // LOGS PARA VER LOS DATOS DEL GRÁFICO
    useEffect(() => {
        if (salesMetrics?.revenueByDay) {
            console.log('📊 ========== DATOS DEL GRÁFICO ==========');
            console.log('📊 revenueByDay completo:', salesMetrics.revenueByDay);
            console.log('📊 Cantidad de días:', salesMetrics.revenueByDay.length);
            console.log('📊 Primer elemento:', salesMetrics.revenueByDay[0]);
            console.log('📊 Keys del objeto:', Object.keys(salesMetrics.revenueByDay[0]));
            console.log('📊 JSON:', JSON.stringify(salesMetrics.revenueByDay, null, 2));
            console.log('📊 =====================================');
        } else {
            console.log('📊 No hay datos de revenueByDay');
        }
    }, [salesMetrics]);

    const loadData = async () => {
        setLoading(true);
        console.log('🔍 Cargando datos para período:', periodo);
        try {
            const today = new Date();
            let startDate = '', endDate = '';
            
            // Calcular fechas según período seleccionado
            if (periodo === 'semana') {
                startDate = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                endDate = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            } else if (periodo === 'mes') {
                startDate = format(startOfMonth(today), 'yyyy-MM-dd');
                endDate = format(endOfMonth(today), 'yyyy-MM-dd');
            } else { // año
                startDate = format(startOfYear(today), 'yyyy-MM-dd');
                endDate = format(endOfYear(today), 'yyyy-MM-dd');
            }

            console.log('📅 Fechas seleccionadas:', { 
                startDate, 
                endDate,
                startISO: `${startDate}T00:00:00`,
                endISO: `${endDate}T23:59:59`
            });

            // Llamar a la API con las fechas correctas
            const [pts, apts, metrics] = await Promise.all([
                api.getPatients(),
                api.getAppointments(),
                api.getSalesDashboardMetrics(`${startDate}T00:00:00`, `${endDate}T23:59:59`),
            ]);
            
            setPatients(pts);
            setAppointments(apts);
            setSalesMetrics(metrics);
            
            console.log('📊 metrics recibido:', metrics);
            console.log('📈 revenueByDay:', metrics?.revenueByDay);
            
        } catch (error) {
            console.error('❌ Error loading dashboard data', error);
        } finally {
            setLoading(false);
        }
    };

    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(a => a.date.startsWith(today));
    const completedToday = todayAppointments.filter(a => a.status === 'completed').length;

    // Build activity feed from recentProducts
    const feedItems: FeedItem[] = (salesMetrics?.recentProducts || [])
        .filter((p): p is typeof p & { type: 'cita' | 'med' | 'prod' } => p.type === 'cita' || p.type === 'med' || p.type === 'prod')
        .map((p, i) => ({
            id: `${i}-${p.name}`,
            type: p.type,
            name: p.name,
            detail: p.type === 'cita' ? 'Servicio podológico' : p.type === 'med' ? 'Medicamento' : 'Producto',
            amount: p.price * p.quantity,
            date: p.date,
        }));

    const totalRevenue =
        (salesMetrics?.citasRevenue || 0) +
        (salesMetrics?.medicationsRevenue || 0) +
        (salesMetrics?.otrosRevenue || 0);

    const totalDelta =
        (salesMetrics?.comparison?.citasRevenueDelta || 0) +
        (salesMetrics?.comparison?.medicationsRevenueDelta || 0) +
        (salesMetrics?.comparison?.otrosRevenueDelta || 0);

    const deltaLabel = PERIOD_LABEL[periodo];

    // Pie chart center label (total)
    const CustomPieLabel = ({ viewBox }: any) => {
        const { cx, cy } = viewBox;
        return (
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                <tspan x={cx} dy="-6" className="text-xs" fill="#94a3b8" fontSize={11}>Total</tspan>
                <tspan x={cx} dy="18" fontWeight="800" fill="#1e293b" fontSize={13}>
                    ${(totalRevenue / 1000).toFixed(0)}k
                </tspan>
            </text>
        );
    };

    return (
        <div className="space-y-6 pb-8 animate-in fade-in duration-500">

            {/* ── HEADER ─────────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-violet-700 p-6 shadow-lg">
                {/* decorative circles */}
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
                <div className="absolute -bottom-6 -left-4 w-28 h-28 rounded-full bg-white/5" />
                <div className="absolute top-1/2 left-1/3 w-20 h-20 rounded-full bg-white/5 animate-pulse" style={{ animationDuration: '3s' }} />

                <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <p className="text-blue-200 text-sm font-medium mb-1">
                            {format(new Date(), "EEEE, dd 'de' MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
                        </p>
                        <h1 className="text-3xl font-black text-white flex items-center gap-2">
                            ¡Hola, {user?.name?.split(' ')[0]}! 
                            <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
                        </h1>
                        <p className="text-blue-200 text-sm mt-1">Resumen de rendimiento unificado</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Botón Registrar Venta — prominente */}
                        <button
                            onClick={() => navigate('/ventas')}
                            className="flex items-center gap-2 bg-white text-blue-700 font-bold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 text-sm group"
                        >
                            <ShoppingBag className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                            Registrar Venta
                            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </button>

                        {/* Period selector */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-1 flex border border-white/20">
                            {(['semana', 'mes', 'año'] as Period[]).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriodo(p)}
                                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${periodo === p
                                        ? 'bg-white text-blue-700 shadow-sm'
                                        : 'text-white/80 hover:text-white hover:bg-white/10'
                                        }`}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── KPI CARDS — Orden: Citas | Medicamentos | Otros | Total ─────── */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {loading ? (
                    <><KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton /></>
                ) : (
                    <>
                        <KPICard
                            title="Citas"
                            value={`$${(salesMetrics?.citasRevenue || 0).toLocaleString('es-CO')}`}
                            subValue={`${salesMetrics?.citasCount || 0} atenciones`}
                            icon={Calendar}
                            color="blue"
                            delta={salesMetrics?.comparison?.citasRevenueDelta}
                            deltaLabel={deltaLabel}
                            tooltip="Ingresos por servicios profesionales podológicos del período"
                            onClick={() => navigate('/agenda')}
                        />
                        <KPICard
                            title="Medicamentos"
                            value={`$${(salesMetrics?.medicationsRevenue || 0).toLocaleString('es-CO')}`}
                            subValue={`${salesMetrics?.medicationsCount || 0} unidades`}
                            icon={Pill}
                            color="emerald"
                            delta={salesMetrics?.comparison?.medicationsRevenueDelta}
                            deltaLabel={deltaLabel}
                            tooltip="Ingresos por venta de productos farmacéuticos del período"
                            onClick={() => navigate('/inventario')}
                        />
                        <KPICard
                            title="Otros Productos"
                            value={`$${(salesMetrics?.otrosRevenue || 0).toLocaleString('es-CO')}`}
                            subValue={`${salesMetrics?.otrosCount || 0} productos`}
                            icon={Package}
                            color="amber"
                            delta={salesMetrics?.comparison?.otrosRevenueDelta}
                            deltaLabel={deltaLabel}
                            tooltip="Ingresos por insumos, cremas estéticas y protectores del período"
                            onClick={() => navigate('/ventas')}
                        />
                        <KPICard
                            title="Total General"
                            value={`$${totalRevenue.toLocaleString('es-CO')}`}
                            subValue="Todos los conceptos"
                            icon={DollarSign}
                            color="violet"
                            delta={totalDelta}
                            deltaLabel={deltaLabel}
                            tooltip="Suma de todos los ingresos del período seleccionado"
                            featured
                        />
                    </>
                )}
            </div>

            {/* ── CHARTS ROW ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                {/* Evolución: BARRAS MEJORADAS - MÁS GRANDES Y VISUALES */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                                <TrendingUp className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">
                                    Ingresos del Período
                                </h2>
                                <p className="text-xs text-slate-400">
                                    {salesMetrics?.revenueByDay?.length || 0} días con actividad
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl">
                            <span className="flex items-center gap-2 text-sm">
                                <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-200" />
                                <span className="font-medium text-slate-600">Citas</span>
                            </span>
                            <span className="flex items-center gap-2 text-sm">
                                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                                <span className="font-medium text-slate-600">Medicamentos</span>
                            </span>
                            <span className="flex items-center gap-2 text-sm">
                                <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-200" />
                                <span className="font-medium text-slate-600">Otros</span>
                            </span>
                        </div>
                    </div>
                    <div style={{ height: '400px', width: '100%' }}>
                        {loading ? (
                            <div className="h-full rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 animate-pulse" />
                        ) : (
                            <>
                                {salesMetrics?.revenueByDay && Array.isArray(salesMetrics.revenueByDay) && salesMetrics.revenueByDay.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart 
                                            data={salesMetrics.revenueByDay}
                                            margin={{ top: 30, right: 30, left: 20, bottom: 20 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false} tickLine={false}
                                                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                                                tickFormatter={val => {
                                                    const [_, month, day] = val.split('-');
                                                    return `${day}/${month}`;
                                                }}
                                            />
                                            <YAxis
                                                axisLine={false} tickLine={false}
                                                tick={{ fontSize: 12, fill: '#64748b' }}
                                                width={70}
                                                tickFormatter={val => `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                                            />
                                            <Tooltip 
                                                content={<CustomBarTooltip />}
                                                cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                            />
                                            <Bar 
                                                dataKey="citas" 
                                                name="Citas" 
                                                fill="#3b82f6" 
                                                radius={[8, 8, 0, 0]} 
                                                barSize={60}
                                                animationDuration={1000}
                                                animationEasing="ease-in-out"
                                            />
                                            <Bar 
                                                dataKey="medications" 
                                                name="Medicamentos" 
                                                fill="#10b981" 
                                                radius={[8, 8, 0, 0]} 
                                                barSize={60}
                                                animationDuration={1000}
                                                animationEasing="ease-in-out"
                                            />
                                            <Bar 
                                                dataKey="otros" 
                                                name="Otros" 
                                                fill="#f59e0b" 
                                                radius={[8, 8, 0, 0]} 
                                                barSize={60}
                                                animationDuration={1000}
                                                animationEasing="ease-in-out"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center">
                                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center mb-4 shadow-inner">
                                            <BarChart2 className="w-10 h-10 text-slate-400" />
                                        </div>
                                        <p className="text-base text-slate-400 font-medium max-w-[240px]">
                                            {getRandomMessage('grafico')}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Pie: Ventas por Categoría */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-md">
                            <PieChartIcon className="w-4 h-4 text-white" />
                        </div>
                        Por Categoría
                    </h2>
                    <div className="h-80">
                        {loading ? (
                            <div className="h-full rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 animate-pulse" />
                        ) : salesMetrics?.revenueByCategory?.length ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={salesMetrics.revenueByCategory}
                                        cx="50%" cy="45%"
                                        innerRadius={60} outerRadius={90}
                                        paddingAngle={4}
                                        dataKey="total" nameKey="category"
                                        labelLine={false}
                                    >
                                        {salesMetrics.revenueByCategory.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                        <Label content={<CustomPieLabel />} position="center" />
                                    </Pie>
                                    <Tooltip
                                        formatter={(v: number) => `$${v.toLocaleString('es-CO')}`}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgb(0 0 0 / 0.12)' }}
                                    />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={36} 
                                        iconType="circle" 
                                        iconSize={10}
                                        wrapperStyle={{ paddingTop: '20px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState 
                                icon={PieChartIcon} 
                                text={getRandomMessage('ventas')}
                                type="ventas"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* ── BOTTOM ROW: Feed + Citas Hoy ───────────────────────────────── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                {/* Activity Feed */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <div className="flex justify-between items-center mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                                <Activity className="w-4 h-4 text-white" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">
                                Actividad Reciente
                            </h2>
                        </div>
                        <button
                            onClick={() => navigate('/ventas')}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold group"
                        >
                            Ver ventas <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                                    <div className="flex-1">
                                        <div className="h-3 bg-slate-100 rounded w-3/4 mb-1.5" />
                                        <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                                    </div>
                                    <div className="h-5 w-16 bg-slate-100 rounded-full" />
                                </div>
                            ))}
                        </div>
                    ) : feedItems.length > 0 ? (
                        <ul className="space-y-3">
                            {feedItems.slice(0, 6).map((item, idx) => {
                                const typeConfig = {
                                    cita: { 
                                        bg: 'bg-blue-100', 
                                        text: 'text-blue-600', 
                                        icon: Calendar,
                                        badge: 'bg-blue-50 text-blue-700'
                                    },
                                    med: { 
                                        bg: 'bg-emerald-100', 
                                        text: 'text-emerald-600', 
                                        icon: Pill,
                                        badge: 'bg-emerald-50 text-emerald-700'
                                    },
                                    prod: { 
                                        bg: 'bg-amber-100', 
                                        text: 'text-amber-600', 
                                        icon: Package,
                                        badge: 'bg-amber-50 text-amber-700'
                                    },
                                }[item.type];
                                const IconComp = typeConfig.icon;
                                return (
                                    <li
                                        key={item.id}
                                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors animate-fade-up group"
                                        style={{ animationDelay: `${idx * 60}ms` }}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeConfig.bg} group-hover:scale-110 transition-transform`}>
                                            <IconComp className={`w-5 h-5 ${typeConfig.text}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                                            <p className="text-xs text-slate-400">{item.detail} · {format(new Date(item.date), 'dd MMM, HH:mm')}</p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${typeConfig.badge}`}>
                                                ${item.amount.toLocaleString('es-CO')}
                                            </span>
                                            {item.type === 'med' && (
                                                <span className="text-[10px] text-emerald-600 mt-0.5 font-semibold">💊 Medicamento</span>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <EmptyState 
                            icon={ShoppingBag} 
                            text={getRandomMessage('ventas')}
                            type="ventas"
                        />
                    )}
                </div>

                {/* Citas de Hoy */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md">
                                <Clock className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">
                                    Citas de Hoy
                                </h2>
                                {todayAppointments.length > 0 && (
                                    <span className="ml-1 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                                        {todayAppointments.length}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/agenda')}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold shrink-0 ml-2 group"
                        >
                            Ver agenda <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>

                    {todayAppointments.length > 0 && (
                        <div className="mt-2 mb-4">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs text-slate-400">
                                    {completedToday} de {todayAppointments.length} completadas
                                </p>
                                <p className="text-xs font-bold text-emerald-600">
                                    {Math.round((completedToday / todayAppointments.length) * 100)}%
                                </p>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700"
                                    style={{ width: `${(completedToday / todayAppointments.length) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="space-y-3 mt-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
                                    <div className="flex-1">
                                        <div className="h-3 bg-slate-100 rounded w-2/3 mb-1.5" />
                                        <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : todayAppointments.length === 0 ? (
                        <EmptyState 
                            icon={Calendar} 
                            text={getRandomMessage('citas')}
                            type="citas"
                        />
                    ) : (
                        <ul className="divide-y divide-slate-50 mt-2">
                            {todayAppointments.slice(0, 6).map(apt => {
                                const s = statusMap[apt.status] ?? { label: apt.status, cls: 'bg-slate-100 text-slate-600' };
                                return (
                                    <li
                                        key={apt.id}
                                        className="py-3 px-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group"
                                        onClick={() => navigate('/agenda')}
                                    >
                                        <div className="flex justify-between items-center gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(apt.patientName)} group-hover:scale-110 transition-transform`}>
                                                    {apt.patientName.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">{apt.patientName}</p>
                                                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <Phone className="w-3 h-3 shrink-0" />
                                                        {patients.find(p => p.id === apt.patientId)?.phone || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-bold text-slate-700">
                                                    {new Date(apt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${s.cls}`}>
                                                    {s.label}
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Shared empty state mejorado ───────────────────────────────────────────────
function EmptyState({ icon: Icon, text, type }: { icon: any; text: string; type?: 'ventas' | 'citas' | 'productos' }) {
    const emoji = type === 'ventas' ? '🛒' : type === 'citas' ? '📅' : '📦';
    
    return (
        <div className="flex flex-col items-center justify-center h-full py-10 gap-3 text-center group">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                <Icon className="w-8 h-8 text-slate-400 group-hover:text-slate-500 transition-colors" />
            </div>
            <p className="text-sm text-slate-400 font-medium max-w-[200px]">
                {emoji} {text}
            </p>
        </div>
    );
}