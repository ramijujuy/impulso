import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const storedUser = JSON.parse(localStorage.getItem('user'));
                    if (storedUser) {
                        setUser(storedUser);
                        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    }
                } catch (error) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }
            setLoading(false);
        };
        checkUser();
    }, []);

    const login = async (username, password) => {
        const res = await axios.post('/api/auth/login', { username, password });
        localStorage.setItem('token', res.data.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.data));
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.data.token}`;
        setUser(res.data.data);
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, token: localStorage.getItem('token') }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
