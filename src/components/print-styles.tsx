
'use client';

import React from 'react';

export function PrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        body * {
          visibility: hidden;
        }
        .print-container, .print-container * {
          visibility: visible;
        }
        .print-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: auto;
          margin: 0;
          padding: 0;
        }
        .print-card {
          box-shadow: none !important;
          border: none !important;
        }
        .print-header, .print-content, .print-footer {
          padding: 10px !important; /* Adjust padding for print */
        }
        .print-footer button {
          display: none !important; /* Hide print button itself when printing */
        }
        /* Add more print-specific styles if needed */
      }
    `}</style>
  );
}
