import React from 'react';

const BackgroundAnimation = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Main gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50"></div>
      
      {/* Animated gradient orbs */}
      <div className="absolute top-[10%] -left-[10%] w-[30%] h-[40%] rounded-full bg-blue-200/30 blur-[60px] animate-float"></div>
      <div className="absolute top-[50%] right-[5%] w-[25%] h-[30%] rounded-full bg-indigo-200/30 blur-[50px] animate-float animation-delay-2000"></div>
      <div className="absolute bottom-[10%] left-[20%] w-[20%] h-[25%] rounded-full bg-cyan-200/20 blur-[45px] animate-float animation-delay-4000"></div>
      
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      
      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(13,13,13,0.05)_100%)]"></div>
    </div>
  );
};

export {BackgroundAnimation};