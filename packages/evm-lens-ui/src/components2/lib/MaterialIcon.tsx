import React from 'react';

type MaterialIconProps = Readonly<{
  name: string;
  className?: string;
  size?: number;
  filled?: boolean;
  weight?: number;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}>;

export const MaterialIcon: React.FC<MaterialIconProps> = ({
  name,
  className = '',
  size,
  filled = false,
  weight = 300,
  onClick,
  title,
}) => {
  const style: React.CSSProperties = {
    fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size ?? 20}`,
    fontSize: size ? `${size}px` : undefined,
  };

  return (
    <span className={`material-symbols-outlined ${className}`} style={style} onClick={onClick} title={title}>
      {name}
    </span>
  );
};
