import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import { authApi } from '../../api/authApi';
import { useToast } from '../../components/Toast';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsChecking(false);
        return;
      }
      try {
        await authApi.verifyResetToken({ token });
        setIsValidToken(true);
      } catch {
        setIsValidToken(false);
      } finally {
        setIsChecking(false);
      }
    };
    void verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword({ token, password });
      showToast('Password reset successfully. Please sign in.', 'success');
      navigate('/login', { replace: true });
    } catch {
      showToast('Failed to reset password', 'error');
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
          <h1>Set New Password</h1>
          <p>{isChecking ? 'Checking reset link...' : isValidToken ? 'Choose a new password.' : 'This reset link is invalid or expired.'}</p>
        </div>
        {isValidToken ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="reset-password">New Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input id="reset-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
                <button type="button" className="auth-input-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="reset-confirm">Confirm Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input id="reset-confirm" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
              </div>
            </div>
            <button type="submit" className="auth-submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Reset Password'}</button>
          </form>
        ) : (
          <div className="auth-footer"><p><Link to="/forgot-password" className="auth-link">Request a new reset link</Link></p></div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
