export const formatTime = (value: number): string => {
    const mins = Math.floor(value / 60);
    const secs = Math.floor(value % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };