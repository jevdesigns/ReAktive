import React from 'react';

const Slider = ({ value, onChange, min = 0, max = 100, label }) => {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-medium text-white/70">{label}</label>}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <div className="text-sm text-white/50 text-right">{value}%</div>
    </div>
  );
};

export default Slider;
