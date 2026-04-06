import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    console.log("Attempting login...");
    try {
      const result = await login(email, password);
      console.log("Login result:", result);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message || 'Credenciais inválidas. Tente novamente.');
      }
    } catch (err) {
      console.error("Login error in component:", err);
      setError('Erro inesperado ao fazer login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Centauro ERP</h2>
        <p>Entre para acessar o sistema</p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@centaurotelecom.com.br"
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="senha"
            />
          </div>
          <div className="login-forgot" style={{ textAlign: 'right', marginBottom: '20px' }}>
            <Link to="/forgot-password" style={{ color: '#3b82f6', fontSize: '0.875rem', textDecoration: 'none' }}>
              Esqueci minha senha
            </Link>
          </div>
          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
