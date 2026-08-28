'use client';

import React from 'react';

/**
 * Fixed ambient background: aurora blobs + film grain + grid.
 * Mount once in layout.tsx behind all content.
 */
export function AmbientBackground() {
  return (
    <>
      <div className="aurora-layer" aria-hidden="true">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
      </div>
      <div className="noise-layer" aria-hidden="true" />
    </>
  );
}
