import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import './Login.css'; // Reuse login styles

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    if (!token) {
      setError('Token de recuperação não encontrado. Solicite um novo link.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await axios.post(`${API_URL}/reset-password`, {
        token,
        new_password: password
      });
      setIsSuccess(true);
      // Auto-redirect to login after 5 seconds
      setTimeout(() => {
        navigate('/login');
      }, 5000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Ocorreu um erro ao redefinir sua senha. O link pode ter expirado.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="login-logo" style={{ marginBottom: '24px' }}>
            <CheckCircle size={64} color="#16a34a" style={{ margin: '0 auto' }} />
          </div>
          <h2 style={{ marginBottom: '16px', color: '#1e293b' }}>Senha Atualizada!</h2>
          <p style={{ color: '#64748b', marginBottom: '32px', lineHeight: '1.6' }}>
            Sua nova senha foi salva com sucesso. Você será redirecionado para o login em instantes.
          </p>
          <Link to="/login" className="btn btn-primary">
            Fazer Login Agora
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-placeholder">
            <Lock size={32} color="#3b82f6" />
          </div>
          <h1>Nova Senha</h1>
          <p>Defina uma senha forte para sua conta</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          
          <div className="form-group">
            <label>Nova Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                disabled={isLoading || !token}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Confirmar Nova Senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              disabled={isLoading || !token}
            />
          </div>

          <button type="submit" className="login-btn" disabled={isLoading || !token}>
            {isLoading ? 'Salvando...' : 'Redefinir Senha'}
          </button>
        </form>

        <div className="login-footer">
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
            <ArrowLeft size={16} />
            Voltar para o Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
