import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Calendar, Camera, Lock, LogOut, Mail, Shield, User as UserIcon } from 'lucide-react';
import { authApi } from '../../api/authApi';
import { userApi } from '../../api/userApi';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../contexts/useAuth';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export const Profile: React.FC = () => {
  const { user, logout, setCurrentUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isResendingVerify, setIsResendingVerify] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name || user.username || '');
    setBio(user.bio || '');
  }, [user]);

  if (!user) return null;

  const initials = (user.name || user.username || user.email)
    .split(/[\s@]/)
    .map((s) => s[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('');

  const handleLogout = async () => {
    await logout();
    showToast('Logged out successfully', 'success');
    navigate('/login', { replace: true });
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      showToast('Name is required', 'warning');
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await userApi.updateMe({ name: name.trim(), bio: bio.trim() || undefined });
      setCurrentUser(updated);
      showToast('Profile updated', 'success');
    } catch {
      showToast('Failed to update profile', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarChange = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file', 'warning');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      showToast('Avatar must be 5MB or smaller', 'warning');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const presigned = await userApi.presignAvatar({ filename: file.name, mimeType: file.type, size: file.size });
      await userApi.uploadAvatar(presigned.uploadUrl, file, presigned.headers);
      const updated = await userApi.completeAvatar({
        key: presigned.key,
        url: presigned.publicUrl,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
      });
      setCurrentUser(updated);
      showToast('Avatar updated', 'success');
    } catch {
      showToast('Failed to upload avatar', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Please fill in all password fields', 'warning');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password changed', 'success');
    } catch {
      showToast('Failed to change password. Check your current password.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResendingVerify(true);
    try {
      await authApi.resendVerifyEmail({ email: user.email });
      showToast('Verification email sent', 'success');
    } catch {
      showToast('Failed to resend verification email', 'error');
    } finally {
      setIsResendingVerify(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-grid">
        <section className="profile-card profile-identity-card">
          <div className="profile-cover" />
          <div className="profile-avatar-wrapper">
            {user.image ? <img src={user.image} alt="Avatar" className="profile-avatar-img" /> : <div className="profile-avatar-initials">{initials}</div>}
            <label className="profile-avatar-upload" title="Upload avatar">
              <Camera size={16} />
              <input type="file" accept="image/*" disabled={isUploadingAvatar} onChange={(e) => { void handleAvatarChange(e.target.files); e.target.value = ''; }} />
            </label>
          </div>
          <div className="profile-info">
            <h2 className="profile-name">{user.name || user.username || 'User'}</h2>
            {user.bio && <p className="profile-bio">{user.bio}</p>}
            <div className={`profile-verify-badge ${user.emailVerifiedAt ? 'verified' : 'pending'}`}>
              {user.emailVerifiedAt ? <BadgeCheck size={15} /> : <Mail size={15} />}
              {user.emailVerifiedAt ? 'Email verified' : 'Email not verified'}
            </div>
          </div>
          <div className="profile-details">
            <div className="profile-detail-item"><Mail size={16} /><span>{user.email}</span></div>
            <div className="profile-detail-item"><UserIcon size={16} /><span>ID: {user.id.slice(0, 8)}...</span></div>
            <div className="profile-detail-item"><Calendar size={16} /><span>Joined {new Date(user.createdAt).toLocaleDateString()}</span></div>
            <div className="profile-detail-item"><Shield size={16} /><span>Active Member</span></div>
          </div>
          {!user.emailVerifiedAt && <button className="btn-ghost profile-inline-action" onClick={handleResendVerification} disabled={isResendingVerify}>{isResendingVerify ? 'Sending...' : 'Resend verification email'}</button>}
          <button className="btn-danger profile-logout" onClick={handleLogout}><LogOut size={16} />Sign Out</button>
        </section>

        <section className="profile-card profile-settings-card">
          <h3>Account Settings</h3>
          <form className="profile-form" onSubmit={handleSaveProfile}>
            <div className="auth-field"><label>Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="auth-field"><label>Bio</label><textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Tell your team a little about you..." /></div>
            <button className="btn-primary" type="submit" disabled={isSavingProfile}>{isSavingProfile ? 'Saving...' : 'Save Profile'}</button>
          </form>

          <div className="profile-divider" />

          <h3><Lock size={18} /> Security</h3>
          <form className="profile-form" onSubmit={handleChangePassword}>
            <div className="auth-field"><label>Current password</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" /></div>
            <div className="auth-field"><label>New password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" /></div>
            <div className="auth-field"><label>Confirm new password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" /></div>
            <button className="btn-primary" type="submit" disabled={isChangingPassword}>{isChangingPassword ? 'Changing...' : 'Change Password'}</button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Profile;
