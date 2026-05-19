import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BadgeCheck, MailWarning } from 'lucide-react';
import { authApi } from '../../api/authApi';

type VerifyState = 'checking' | 'success' | 'error';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<VerifyState>('checking');
  const token = searchParams.get('token') || '';

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setState('error');
        return;
      }
      try {
        await authApi.verifyEmail(token);
        setState('success');
      } catch {
        setState('error');
      }
    };
    void verify();
  }, [token]);

  const success = state === 'success';

  return (
    <div className="auth-page">
      <div className="auth-bg"><div className="auth-bg-gradient" /><div className="auth-bg-pattern" /></div>
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-logo">{success ? <BadgeCheck size={28} /> : <MailWarning size={28} />}</div>
          <h1>{state === 'checking' ? 'Verifying Email' : success ? 'Email Verified' : 'Verification Failed'}</h1>
          <p>{state === 'checking' ? 'Please wait...' : success ? 'Your email has been verified.' : 'The verification link is invalid or expired.'}</p>
        </div>
        <div className="auth-footer"><p><Link to="/login" className="auth-link">Go to sign in</Link></p></div>
      </div>
    </div>
  );
};

export default VerifyEmail;
