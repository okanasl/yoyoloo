import React from 'react';

// --- Constants ---

// Grayscale/Monochromatic Palette
const SVG_STYLES = `
  :root {
    /* Grayscale Palette */
    --clr-slate: #4A4A4A;        /* Medium-Dark Gray */
    --clr-bright-stripe: #FFFFFF; /* White */
    --clr-dark-stripe: #000000;   /* Black */
    --clr-hinge: #A0A0A0;       /* Medium Gray */
    --clr-stroke: #1A1A1A;      /* Very Dark Gray / Near Black */
    --clr-text: #FFFFFF;        /* White */
  }
`;

// Animation constants
const ANIMATION_VALUES = "0 10 30; -35 10 30; -35 10 30; 0 10 30";
const ANIMATION_KEY_TIMES = "0; 0.7; 0.8; 1";
const ANIMATION_KEY_SPLINES = "0.4 0 0.2 1; 0 0 1 1; 0.6 0 1 0.5";
const ANIMATION_TYPE = "rotate";
const ANIMATION_ATTRIBUTE_NAME = "transform";
const ANIMATION_ATTRIBUTE_TYPE = "XML";
const ANIMATION_REPEAT_COUNT = "indefinite";
const ANIMATION_CALC_MODE = "spline";

// --- Component ---

/**
 * Props for the AnimatedClapperboard component.
 * Extends standard SVG element properties provided by React.
 */
interface AnimatedClapperboardProps extends React.SVGProps<SVGSVGElement> {
  /**
   * Controls whether the clapperboard top animates (opens and closes).
   * @default true
   */
  isAnimated?: boolean;
  /**
   * Specifies the duration of one full animation cycle (e.g., "1.8s", "2s").
   * @default "1.8s"
   */
  animationDuration?: string;
  // Standard SVG props like width, height, className, style, etc., are inherited via ...rest
}

/**
 * Renders a stylized SVG clapperboard icon with an optional animation.
 * Features a configurable grayscale/monochromatic color scheme via CSS variables.
 * The animation state and duration can be controlled via props.
 *
 * @param {AnimatedClapperboardProps} props - The component props.
 * @returns {React.ReactElement} The rendered SVG component.
 */
const AnimatedClapperboard: React.FC<AnimatedClapperboardProps> = ({
  width = "4em",
  height = "4em",
  isAnimated = true,
  animationDuration = "1.8s",
  className,
  ...rest // Pass down any other standard SVG attributes
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      // *** Updated viewBox: Increased vertical range ***
      // min-x, min-y, width, height
      // Changed min-y from 0 to -50 to show the clapper when rotated up.
      // Increased height from 120 to 170 to compensate for the negative min-y.
      viewBox="0 -50 120 170"
      className={className}
      role="img" // Add role for accessibility
      aria-labelledby="clapperboardTitle"
      {...rest}
    >
      {/* Define accessible title and description */}
      <title id="clapperboardTitle">Animated Clapperboard Logo</title>
      <desc>A clapperboard icon with black and white stripes on a gray board. The top part animates open and closed if enabled.</desc>

      {/* Define styles using CSS variables */}
      <defs>
        <style>{SVG_STYLES}</style>
      </defs>

      {/* Main board section (slate) */}
      {/* Coordinates remain the same relative to the viewBox */}
      <g id="slate" stroke="var(--clr-stroke)" strokeWidth="1">
        <rect x="10" y="30" width="100" height="80" fill="var(--clr-slate)" />
        {/* Decorative text lines */}
        <text x="15" y="50" fill="var(--clr-text)" fontFamily="monospace, sans-serif" fontSize="8px" stroke="none">PROD: ZYX-FLIX</text>
        <text x="15" y="65" fill="var(--clr-text)" fontFamily="monospace, sans-serif" fontSize="8px" stroke="none">SCN: 42B-G7 PXL</text>
        <text x="15" y="80" fill="var(--clr-text)" fontFamily="monospace, sans-serif" fontSize="8px" stroke="none">TAKE: 0³ RNDR</text>
        <text x="15" y="95" fill="var(--clr-text)" fontFamily="monospace, sans-serif" fontSize="8px" stroke="none">DIR: A.I. Syntax</text>
        <text x="15" y="107" fill="var(--clr-text)" fontFamily="monospace, sans-serif" fontSize="7px" stroke="none">CAM: VORTEX-9</text>
      </g>

      {/* Hinge element */}
      <circle cx="10" cy="30" r="4" fill="var(--clr-hinge)" stroke="var(--clr-stroke)" strokeWidth="0.5" />

      {/* Clapper section (top part) */}
      <g id="clapper" stroke="var(--clr-stroke)" strokeWidth="1">
        {/* Base rectangle for a consistent stroke outline */}
        <rect x="10" y="10" width="100" height="20" fill="none" />

        {/* Striped pattern using path elements */}
        {/* Bright Stripes (White) */}
        <path d="M 10.0 30 L 20.0 10 L 36.6 10 L 26.6 30 Z" fill="var(--clr-bright-stripe)" stroke="none"/>
        <path d="M 43.2 30 L 53.2 10 L 69.8 10 L 59.8 30 Z" fill="var(--clr-bright-stripe)" stroke="none"/>
        <path d="M 76.4 30 L 86.4 10 L 103.0 10 L 93.0 30 Z" fill="var(--clr-bright-stripe)" stroke="none"/>
        <path d="M 110 11.5 L 110 10 L 103.0 10 Z" fill="var(--clr-bright-stripe)" stroke="none"/>

        {/* Dark Stripes (Black) */}
        <path d="M 26.6 30 L 36.6 10 L 53.2 10 L 43.2 30 Z" fill="var(--clr-dark-stripe)" stroke="none"/>
        <path d="M 59.8 30 L 69.8 10 L 86.4 10 L 76.4 30 Z" fill="var(--clr-dark-stripe)" stroke="none"/>
        <path d="M 93.0 30 L 103.0 10 L 110.0 10 L 110.0 11.5 L 100 30 Z" fill="var(--clr-dark-stripe)" stroke="none"/>
        <path d="M 10 10 L 10 30 L 26.6 30 L 36.6 10 L 20.0 10 Z " fill="var(--clr-dark-stripe)" stroke="none"/>

        {/* Conditionally render the SMIL animation */}
        {isAnimated && (
          <animateTransform
            attributeName={ANIMATION_ATTRIBUTE_NAME}
            attributeType={ANIMATION_ATTRIBUTE_TYPE}
            type={ANIMATION_TYPE}
            values={ANIMATION_VALUES} // Rotation happens relative to internal coordinates
            keyTimes={ANIMATION_KEY_TIMES}
            dur={animationDuration}
            repeatCount={ANIMATION_REPEAT_COUNT}
            calcMode={ANIMATION_CALC_MODE}
            keySplines={ANIMATION_KEY_SPLINES}
          />
        )}
      </g>
    </svg>
  );
};

export { AnimatedClapperboard };