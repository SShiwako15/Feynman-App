import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import '../styles/Profile.css';

interface ProfileForm {
  name: string;
  subject: string;
  email: string;
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      subject: user?.subject || '',
    },
  });

  const onSubmit = async (data: ProfileForm) => {
    setLoading(true);
    try {
      updateUser(data);
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="profile-container">
        <div className="profile-header">
          <h1>Edit Profile</h1>
          <button onClick={() => navigate('/dashboard')} className="back-button">
            ← Back to Dashboard
          </button>
        </div>

      {success && (
        <div className="success-message">Profile updated successfully!</div>
      )}

      <div className="profile-card">
        <div className="profile-avatar-section">
          <div className="avatar-large">{user?.name.charAt(0).toUpperCase()}</div>
          <h2>{user?.name}</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="profile-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              {...register('name', {
                required: 'Name is required',
                minLength: {
                  value: 2,
                  message: 'Name must be at least 2 characters',
                },
              })}
            />
            {errors.name && <span className="error-text">{errors.name.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
            />
            {errors.email && <span className="error-text">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="subject">Subject You're Studying</label>
            <input
              id="subject"
              type="text"
              {...register('subject')}
              placeholder="e.g., Mathematics, Physics, Chemistry"
            />
            <p className="form-hint">This will be displayed on your profile</p>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="cancel-button"
            >
              Cancel
            </button>
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}

