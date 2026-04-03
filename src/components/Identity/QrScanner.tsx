import React, { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { Camera, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QrScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
  title?: string;
  isProcessing?: boolean;
  lastResult?: {
    success: boolean;
    message: string;
  } | null;
}

export default function QrScanner({ onScan, onClose, title = "Scan QR Code", isProcessing, lastResult }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    const codeReader = new BrowserQRCodeReader();
    
    const startScanning = async () => {
      try {
        if (!videoRef.current) return;
        
        const controls = await codeReader.decodeFromVideoDevice(
          undefined, // undefined uses the default camera
          videoRef.current,
          (result, error, controls) => {
            if (result) {
              onScan(result.getText());
            }
          }
        );
        
        controlsRef.current = controls;
        setIsCameraReady(true);
      } catch (err) {
        console.error('Error starting QR scanner:', err);
        setError('Could not access camera. Please ensure permissions are granted.');
      }
    };

    startScanning();

    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-[32px] overflow-hidden w-full max-w-md shadow-2xl"
      >
        <div className="p-6 border-b border-[#e5e5e5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#f5f5f5] rounded-full transition-all"
          >
            <X className="w-5 h-5 text-[#9e9e9e]" />
          </button>
        </div>

        <div className="relative aspect-square bg-black">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-white">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <p className="font-medium">{error}</p>
              <button 
                onClick={onClose}
                className="mt-6 px-6 py-2 bg-white text-black font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover"
              />
              
              {/* Scanning Overlay */}
              <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                <div className="w-full h-full border-2 border-blue-500 rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white -mt-1 -ml-1 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white -mt-1 -mr-1 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white -mb-1 -ml-1 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white -mb-1 -mr-1 rounded-br-lg"></div>
                  
                  {/* Scanning Line */}
                  <motion.div 
                    animate={{ top: ['0%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-0.5 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                  />
                </div>
              </div>

              {!isCameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}

              <AnimatePresence>
                {isProcessing && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
                  >
                    <div className="bg-white p-6 rounded-2xl flex items-center gap-4 shadow-xl">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      <span className="font-bold">Verifying...</span>
                    </div>
                  </motion.div>
                )}

                {lastResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-6 left-6 right-6"
                  >
                    <div className={`p-4 rounded-2xl flex items-center gap-3 shadow-xl ${
                      lastResult.success ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {lastResult.success ? (
                        <CheckCircle2 className="w-6 h-6 shrink-0" />
                      ) : (
                        <AlertCircle className="w-6 h-6 shrink-0" />
                      )}
                      <span className="font-bold">{lastResult.message}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        <div className="p-6 text-center text-[#9e9e9e] text-sm">
          Point your camera at the student's ID card QR code
        </div>
      </motion.div>
    </div>
  );
}
