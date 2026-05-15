import React from 'react';
import { useAuth } from '../../contexts/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { LogOut, Mail, User as UserIcon, Calendar, Shield } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLogout = async () => {
    await logout();
    showToast('Logged out successfully', 'success');
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  const initials = (user.username || user.email)
    .split(/[\s@]/)
    .map((s) => s[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('');

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-cover" />

        <div className="profile-avatar-wrapper">
          {user.image ? (
            <img src={user.image} alt="Avatar" className="profile-avatar-img" />
          ) : (
            <div className="profile-avatar-initials">{initials}</div>
          )}
        </div>

        <div className="profile-info">
          <h2 className="profile-name">{user.username || 'User'}</h2>
          {user.bio && <p className="profile-bio">{user.bio}</p>}
        </div>

        <div className="profile-details">
          <div className="profile-detail-item">
            <Mail size={16} />
            <span>{user.email}</span>
          </div>
          <div className="profile-detail-item">
            <UserIcon size={16} />
            <span>ID: {user.id.slice(0, 8)}...</span>
          </div>
          <div className="profile-detail-item">
            <Calendar size={16} />
            <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="profile-detail-item">
            <Shield size={16} />
            <span>Active Member</span>
          </div>
        </div>

        <button className="btn-danger profile-logout" onClick={handleLogout}>
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Profile;
