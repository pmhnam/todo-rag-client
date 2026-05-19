import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, KeyRound } from 'lucide-react';
import { authApi } from '../../api/authApi';
import { useToast } from '../../components/Toast';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Please enter your email', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.forgotPassword({ email: email.trim() });
      setIsSent(true);
      showToast('If that email exists, a reset link has been sent.', 'success');
    } catch {
      showToast('Failed to request password reset', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg"><div className="auth-bg-gradient" /><div className="auth-bg-pattern" /></div>
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-logo"><KeyRound size={28} /></div>
          <h1>Reset Password</h1>
          <p>Enter your email and we will send a reset link.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="forgot-email">Email</label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" autoFocus />
            </div>
          </div>
          <button type="submit" className="auth-submit" disabled={isSubmitting || isSent}>
            {isSubmitting ? 'Sending...' : isSent ? 'Reset link sent' : 'Send Reset Link'}
          </button>
        </form>
        <div className="auth-footer"><p><Link to="/login" className="auth-link">Back to sign in</Link></p></div>
      </div>
    </div>
  );
};

export default ForgotPassword;
