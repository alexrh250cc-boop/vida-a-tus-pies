import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Mail } from 'lucide-react';
import Logo from '../components/ui/Logo';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password.trim(),
            });

            console.log("LOGIN DATA:", data);
            console.log("LOGIN ERROR:", signInError);

            if (signInError) {
                throw signInError; // ✅ CORREGIDO: Usamos signInError aquí
            }

            // Si llegamos aquí, el login fue exitoso
            console.log("Login exitoso, redirigiendo...");
            navigate('/');

        } catch (err: any) {
            console.error("Error completo:", err);

            // Manejo específico de errores de Supabase
            if (err.message?.includes("Email logins are disabled")) {
                setError('El inicio de sesión con email está desactivado. Habilítalo en Supabase (Authentication → Providers → Email)');
            } else {
                setError(err.message || 'Error al iniciar sesión');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8 flex justify-center">
                    <Logo variant="sidebar" className="scale-110" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Correo Electrónico
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-4 focus:ring-company-green/20 focus:border-company-green outline-none transition-all duration-200"
                                placeholder="correo@ejemplo.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Contraseña
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-4 focus:ring-company-green/20 focus:border-company-green outline-none transition-all duration-200"
                                placeholder="********"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-company-green text-white py-2 px-4 rounded-lg hover:bg-company-green/90 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {loading ? 'Iniciando sesión...' : 'Ingresar al Sistema'}
                    </button>
                </form>


            </div>
        </div>
    );
}