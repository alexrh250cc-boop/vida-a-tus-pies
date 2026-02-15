import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom'; // ← Importa Outlet
import { useAuth } from '../../lib/auth';
import {
    LayoutDashboard,
    Calendar,
    Users,
    Stethoscope,
    BarChart3,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import clsx from 'clsx';

export default function Layout() { // ← Elimina { children }
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Agenda', href: '/agenda', icon: Calendar },
        { name: 'Pacientes', href: '/pacientes', icon: Users },
        { name: 'Servicios', href: '/servicios', icon: Stethoscope },
        { name: 'Reportes', href: '/reportes', icon: BarChart3 },
    ];

    return (
        <div className="min-h-screen bg-slate-50 lg:flex">
            {/* Mobile Header */}
            <div className="lg:hidden bg-white border-b p-4 flex items-center justify-between">
                <span className="font-bold text-xl text-company-blue">VIDA A TUS PIES</span>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Sidebar */}
            <div className={clsx(
                "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b flex items-center justify-center">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-company-green">VIDA</h1>
                            <p className="text-sm text-company-blue font-medium tracking-wider">A TUS PIES</p>
                        </div>
                    </div>

                    <nav className="flex-1 p-4 space-y-1">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={clsx(
                                        "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                                        isActive
                                            ? "bg-company-green/10 text-company-green"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <Icon className="w-5 h-5 mr-3" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t bg-slate-50">
                        <div className="flex items-center mb-4">
                            <div className="w-8 h-8 rounded-full bg-company-blue text-white flex items-center justify-center font-bold">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content - AQUÍ ESTÁ EL CAMBIO */}
            <div className="lg:flex-1 min-w-0">
                <main className="p-4 lg:p-8">
                    <Outlet /> {/* ← Reemplaza {children} con <Outlet /> */}
                </main>
            </div>
        </div>
    );
}