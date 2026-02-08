'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Smartphone } from 'lucide-react';

interface PhoneMockupProps {
  imageSrc?: string;
  imageAlt?: string;
}

export function PhoneMockup({
  imageSrc = '/app-screenshot.png',
  imageAlt = 'Maxim mobile app'
}: PhoneMockupProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative flex justify-center">
      {imageError ? (
        <div className="w-56 h-[460px] md:w-64 md:h-[520px] flex flex-col items-center justify-center bg-muted/50 rounded-[2.5rem]">
          <Smartphone className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-xs text-muted-foreground text-center px-4">
            App preview
          </p>
        </div>
      ) : (
        <div className="relative w-56 h-[460px] md:w-64 md:h-[520px]">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-contain"
            onError={() => setImageError(true)}
          />
        </div>
      )}
    </div>
  );
}
