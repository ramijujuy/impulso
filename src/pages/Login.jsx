import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(username, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Error al iniciar sesión');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-primary-600 p-8 text-center">
                    <h2 className="text-3xl font-bold text-white mb-2">Financiera</h2>
                    <p className="text-primary-100">Acceso al Sistema de Gestión</p>
                </div>

                <div className="p-8">
                    <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">Iniciar Sesión</h3>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded" role="alert">
                            <p>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                            <input
                                type="text"
                                className="input-field"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Ingrese su usuario"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                            <input
                                type="password"
                                className="input-field"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary w-full py-3 text-lg shadow-md hover:shadow-lg transform transition hover:-translate-y-0.5">
                            Ingresar
                        </button>
                    </form>
                </div>
                <div className="bg-gray-50 p-4 text-center text-sm text-gray-500 border-t border-gray-100">
                    &copy; {new Date().getFullYear()} Sistema Financiero
                </div>
            </div>
        </div>
    );
};

export default Login;
