import React, { useEffect, useState } from "react";

export default function MatchRing({ 
  score = 92.4, 
  size = 120, 
  strokeWidth = 8, 
  label = "POTENTIAL MATCH",
  color = "#ff2a55" 
}) {
  const [animatedOffset, setAnimatedOffset] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  useEffect(() => {
    // Start empty, then animate to target score
    setAnimatedOffset(circumference);
    const timer = setTimeout(() => {
      setAnimatedOffset(targetOffset);
    }, 100);
    return () => clearTimeout(timer);
  }, [score, circumference, targetOffset]);

  return (
    <div 
      className="score-circle-container" 
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg 
        className="score-circle-svg" 
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background Track */}
        <circle
          className="score-circle-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Animated Fill */}
        <circle
          className="score-circle-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>

      {/* Center Label */}
      <div className="score-circle-text">
        <span className="score-circle-val" style={{ color: "#ffffff" }}>
          {Math.round(score)}
        </span>
        <span className="score-circle-label" style={{ color: color }}>
          {label}
        </span>
      </div>
    </div>
  );
}
