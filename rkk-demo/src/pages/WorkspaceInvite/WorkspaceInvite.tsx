import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Mail, UserPlus } from 'lucide-react';
import { workspaceInvitationApi } from '../../api/workspaceApi';
import type { WorkspaceInvitationPreview } from '../../api/types';
import { Spinner } from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../contexts/useAuth';
import { useProjects } from '../../contexts/useProjects';

const PENDING_WORKSPACE_INVITE_TOKEN_KEY = 'pendingWorkspaceInviteToken';

export const WorkspaceInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [preview, setPreview] = useState<WorkspaceInvitationPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState('');
  const token = searchParams.get('token') || '';
  const { user, isAuthenticated, logout } = useAuth();
  const { refreshWorkspaces, selectWorkspace } = useProjects();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) localStorage.setItem(PENDING_WORKSPACE_INVITE_TOKEN_KEY, token);
  }, [token]);

  useEffect(() => {
    const loadPreview = async () => {
      if (!token) {
        setError('Invitation link is missing a token.');
        setIsLoading(false);
        return;
      }
      try {
        setPreview(await workspaceInvitationApi.preview(token));
      } catch {
        setError('This invitation is invalid, revoked, or expired.');
      } finally {
        setIsLoading(false);
      }
    };
    void loadPreview();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setIsAccepting(true);
    try {
      const accepted = await workspaceInvitationApi.accept(token);
      localStorage.removeItem(PENDING_WORKSPACE_INVITE_TOKEN_KEY);
      await refreshWorkspaces();
      selectWorkspace(accepted.workspaceId);
      showToast('Workspace invitation accepted', 'success');
      navigate('/board', { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to accept invitation';
      showToast(message, 'error');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleSwitchAccount = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const isWrongUser = Boolean(
    isAuthenticated && preview && user?.email.toLowerCase() !== preview.email.toLowerCase(),
  );

  return (
    <div className="auth-page">
      <div className="auth-bg"><div className="auth-bg-gradient" /><div className="auth-bg-pattern" /></div>
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-logo"><UserPlus size={28} /></div>
          <h1>Workspace Invitation</h1>
          <p>{isLoading ? 'Checking invitation...' : preview ? `Join ${preview.workspaceName}` : error}</p>
        </div>

        {isLoading && <div className="auth-footer"><Spinner size="md" /></div>}

        {!isLoading && preview && (
          <div className="auth-form">
            <div className="invite-summary">
              <div><Mail size={16} /><span>Invited email: {preview.email}</span></div>
              <div><CheckCircle2 size={16} /><span>Permission: {preview.permission}</span></div>
              <small>Expires {new Date(preview.expiresAt).toLocaleDateString()}</small>
            </div>

            {!isAuthenticated && (
              <>
                <p className="invite-copy">Sign in or create an account with {preview.email} to accept this workspace invitation.</p>
                <Link className="auth-submit" to="/login">Sign In</Link>
                <Link className="btn-ghost" to="/register">Create Account</Link>
              </>
            )}

            {isWrongUser && (
              <>
                <p className="invite-copy">You are signed in as {user?.email}. This invitation was sent to {preview.email}.</p>
                <button className="auth-submit" type="button" onClick={handleSwitchAccount}>Switch Account</button>
              </>
            )}

            {isAuthenticated && !isWrongUser && (
              <button className="auth-submit" type="button" onClick={handleAccept} disabled={isAccepting}>
                {isAccepting ? 'Accepting...' : 'Accept Invitation'}
              </button>
            )}
          </div>
        )}

        {!isLoading && !preview && <div className="auth-footer"><p><Link to="/login" className="auth-link">Go to sign in</Link></p></div>}
      </div>
    </div>
  );
};

export { PENDING_WORKSPACE_INVITE_TOKEN_KEY };
export default WorkspaceInvite;
