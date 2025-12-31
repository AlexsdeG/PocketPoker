import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, title, className = '' }) => {
  return (
    <div className={`glass-panel rounded-2xl overflow-hidden p-0 shadow-2xl border border-white/5 ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-white/5 bg-white/5">
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">{title}</h3>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};