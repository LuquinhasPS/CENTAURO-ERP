import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import axios from 'axios';
import './Login.css'; // Reuse login styles for consistency

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await axios.post(`${API_URL}/forgot-password`, { email });
      setIsSent(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Ocorreu um erro ao processar sua solicitação.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="login-logo" style={{ marginBottom: '24px' }}>
            <CheckCircle size={64} color="#16a34a" style={{ margin: '0 auto' }} />
          </div>
          <h2 style={{ marginBottom: '16px', color: '#1e293b' }}>Email Enviado!</h2>
          <p style={{ color: '#64748b', marginBottom: '32px', lineHeight: '1.6' }}>
            Se o email <strong>{email}</strong> estiver cadastrado em nosso sistema, 
            você receberá um link para redefinir sua senha em instantes.
          </p>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '24px' }}>
            Não recebeu? Verifique sua caixa de spam.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <ArrowLeft size={18} />
            Voltar para o Login
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
            <Mail size={32} color="#3b82f6" />
          </div>
          <h1>Recuperar Senha</h1>
          <p>Informe seu email para receber o link de recuperação</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          
          <div className="form-group">
            <label>Email Corporativo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seuemail@centaurotelecom.com.br"
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
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

export default ForgotPassword;
