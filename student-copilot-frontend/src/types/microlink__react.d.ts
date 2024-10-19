declare module '@microlink/react' {
  import React from 'react';

  export interface MicrolinkData {
    url: string;
    title?: string;
    description?: string;
    image?: {
      url: string;
      width: number;
      height: number;
      type: string;
      size: number;
      size_pretty: string;
    };
    logo?: {
      url: string;
      type: string;
    };
    [key: string]: unknown;
  }

  export interface MicrolinkProps {
    url?: string;
    setData?: (data: MicrolinkData) => void;
    size?: 'large' | 'small';
    contrast?: boolean;
    preset?: 'auto' | 'amp' | 'classic' | 'card';
    autoPlay?: boolean;
    controls?: boolean;
    muted?: boolean;
    loop?: boolean;
    playsInline?: boolean;
    media?: string[];
    lazy?: boolean;
    loading?: 'lazy' | 'eager';
    direction?: 'ltr' | 'rtl';
    fetchData?: object;
    backgroundColor?: string;
    color?: string;
    style?: React.CSSProperties;
    className?: string;
    transition?: string;
    as?: keyof JSX.IntrinsicElements | React.ComponentType<MicrolinkProps>;
    children?: React.ReactNode;
    [key: string]: unknown;
  }

  export interface MicrolinkCardProps extends MicrolinkProps {
    compact?: boolean;
    containerClassName?: string;
    imageClassName?: string;
    mediaClassName?: string;
    contentClassName?: string;
    titleClassName?: string;
    descriptionClassName?: string;
    urlClassName?: string;
    logoClassName?: string;
  }

  export interface MicrolinkApiOptions {
    apiKey?: string;
    endpoint?: string;
    headers?: Record<string, string>;
    [key: string]: unknown;
  }

  export function useMicrolinkData(
    url: string,
    options?: MicrolinkApiOptions
  ): {
    loading: boolean;
    error: Error | null;
    data: MicrolinkData;
  };

  export const MicrolinkCard: React.FC<MicrolinkCardProps>;

  const Microlink: React.FC<MicrolinkProps>;
  export default Microlink;
}

