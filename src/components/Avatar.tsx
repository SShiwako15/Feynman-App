import { useState } from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-16 h-16 text-2xl',
  xl: 'w-20 h-20 text-3xl',
};

export default function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const sizeClass = sizeClasses[size];
  const initial = name.charAt(0).toUpperCase();

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0 ${className}`}
    >
      {src && !imageError ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full rounded-full object-cover"
          onError={handleImageError}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}


