import React from 'react';

const Card = ({ className = '', title, icon, onClick, active = false, children }) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl p-4 flex flex-col justify-between
        transition-all duration-300 cursor-pointer select-none border backdrop-blur-xl
        ${active
          ? 'bg-blue-600/80 border-blue-400 shadow-lg shadow-blue-600/30'
          : 'bg-white/10 border-white/10 hover:bg-white/15 hover:border-white/20'
        }
        ${className}
      `}
    >
      <div className="flex justify-between items-start">
        {icon && <div className="text-2xl">{icon}</div>}
        {children}
      </div>
      {title && <h3 className="font-semibold text-sm mt-2">{title}</h3>}
    </div>
  );
};

export default Card;
