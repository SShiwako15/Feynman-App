import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import ReactCrop, { makeAspectCrop, centerCrop } from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import Avatar from '../components/Avatar';
import { saveProfile } from '../services/profileService';
import { uploadProfilePicture, canvasToBlob } from '../services/s3Service';
import { createSubjectUpdatePost } from '../services/feedService';

interface ProfileForm {
  name: string;
  subject: string;
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatar);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
    defaultValues: {
      name: user?.name || '',
      subject: user?.subject || '',
    },
  });

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file.');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
      });
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    const crop = makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      1,
      naturalWidth,
      naturalHeight
    );
    setCrop(centerCrop(crop, naturalWidth, naturalHeight));
  };

  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    if (!completedCrop || !imgRef.current) {
      return null;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelRatio = window.devicePixelRatio;

    canvas.width = completedCrop.width * scaleX * pixelRatio;
    canvas.height = completedCrop.height * scaleY * pixelRatio;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;

    ctx.drawImage(
      image,
      cropX,
      cropY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );

    // Resize to max 400x400 if larger
    const maxSize = 400;
    if (canvas.width > maxSize || canvas.height > maxSize) {
      const resizedCanvas = document.createElement('canvas');
      const ratio = Math.min(maxSize / canvas.width, maxSize / canvas.height);
      resizedCanvas.width = canvas.width * ratio;
      resizedCanvas.height = canvas.height * ratio;
      const resizedCtx = resizedCanvas.getContext('2d');
      if (resizedCtx) {
        resizedCtx.drawImage(canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
        return canvasToBlob(resizedCanvas);
      }
    }

    return canvasToBlob(canvas);
  }, [completedCrop]);

  const handleImageUpload = async () => {
    if (!user?.id || !completedCrop) {
      setError('Please crop the image first.');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      const croppedBlob = await getCroppedImg();

      if (!croppedBlob) {
        throw new Error('Failed to crop image.');
      }

      const url = await uploadProfilePicture(user.id, croppedBlob);

      setAvatarUrl(url);
      setImgSrc('');
      setCrop(undefined);
      setCompletedCrop(undefined);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Failed to upload image:', err);
      setError(err.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const onSubmit = async (data: ProfileForm) => {
    if (!user?.id) {
      console.error('User ID not available');
      setError('User ID not available. Please log in again.');
      return;
    }

    const previousSubject = user.subject || '';

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Save profile to DynamoDB using email from authenticated user context
      await saveProfile(user.id, {
        email: user.email,
        name: data.name,
        subject: data.subject,
        avatar: avatarUrl,
      });

      // Update local state
      updateUser({ ...data, avatar: avatarUrl });

      // If the subject changed, create a study post that is shared to connections
      const newSubject = data.subject || '';
      if (newSubject.trim() && newSubject.trim() !== previousSubject.trim()) {
        try {
          await createSubjectUpdatePost(
            user.id,
            data.name,
            avatarUrl,
            newSubject
          );
        } catch (postError) {
          console.warn('Failed to create subject update study post', postError);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      console.error('Failed to update profile', err);
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="max-w-3xl mx-auto px-5 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Edit Profile</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            Profile updated successfully!
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="text-center mb-8 pb-8 border-b border-gray-200">
            <Avatar src={avatarUrl} name={user?.name || 'User'} size="xl" className="mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800">{user?.name}</h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="profile-picture" className="font-medium text-gray-700 text-sm">
                Profile Picture
              </label>
              <input
                ref={fileInputRef}
                id="profile-picture"
                type="file"
                accept="image/*"
                onChange={onSelectFile}
                className="px-3 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-500 transition-colors"
              />
              <p className="text-gray-500 text-sm mt-1">
                Upload a profile picture (JPG, PNG, max 5MB)
              </p>

              {imgSrc && (
                <div className="mt-4 space-y-4">
                  <div className="flex justify-center">
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => setCrop(percentCrop)}
                      onComplete={(c) => setCompletedCrop(c)}
                      aspect={1}
                      minWidth={100}
                    >
                      <img
                        ref={imgRef}
                        alt="Crop me"
                        src={imgSrc}
                        style={{ maxHeight: '400px', maxWidth: '100%' }}
                        onLoad={onImageLoad}
                      />
                    </ReactCrop>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={handleImageUpload}
                      disabled={uploadingImage || !completedCrop}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingImage ? 'Uploading...' : 'Upload Cropped Image'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImgSrc('');
                        setCrop(undefined);
                        setCompletedCrop(undefined);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="font-medium text-gray-700 text-sm">
                Full Name
              </label>
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
                className="px-3 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-500 transition-colors"
              />
              {errors.name && (
                <span className="text-red-600 text-sm">{errors.name.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="font-medium text-gray-700 text-sm">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={user?.email || ''}
                readOnly
                disabled
                className="px-3 py-3 border-2 border-gray-200 rounded-lg text-base bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              <p className="text-gray-500 text-sm mt-1">Email cannot be changed</p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="subject" className="font-medium text-gray-700 text-sm">
                Subject You're Studying
              </label>
              <input
                id="subject"
                type="text"
                {...register('subject')}
                placeholder="e.g., Mathematics, Physics, Chemistry"
                className="px-3 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-500 transition-colors"
              />
              <p className="text-gray-500 text-sm mt-1">This will be displayed on your profile</p>
            </div>

            <div className="flex gap-4 justify-end mt-8">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-purple-700 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
