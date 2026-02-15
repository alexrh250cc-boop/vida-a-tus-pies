import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Pacientes from './pages/Pacientes';
import PacienteDetalle from './pages/PacienteDetalle';
import Servicios from './pages/Servicios';
import Reportes from './pages/Reportes';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './lib/auth';

function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    return user ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={
                        <PrivateRoute>
                            <Layout />
                        </PrivateRoute>
                    }>
                        <Route index element={<Dashboard />} />
                        <Route path="agenda" element={<Agenda />} />
                        <Route path="pacientes" element={<Pacientes />} />
                        <Route path="pacientes/:id" element={<PacienteDetalle />} />
                        <Route path="servicios" element={<Servicios />} />
                        <Route path="reportes" element={<Reportes />} />
                    </Route>
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
