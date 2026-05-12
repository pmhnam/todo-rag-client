import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  return (
    <div className={`rkk-spinner rkk-spinner--${size} ${className}`}>
      <div className="rkk-spinner-ring" />
    </div>
  );
};

export default Spinner;
