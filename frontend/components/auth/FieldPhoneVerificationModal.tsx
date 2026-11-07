'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import jsQR from 'jsqr';
import { Icon } from '@/components/ui/Icon';
import { Language } from '@/lib/translations';

interface FieldPhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; firstName: string; phone: string; status: string; state?: string; district?: string }) => void;
  lang?: Language;
}

export function FieldPhoneVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  lang = 'en',
}: FieldPhoneVerificationModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [enrolmentToken, setEnrolmentToken] = useState('');
  const [otp, setOtp] = useState('');

  // Scanning / Upload states
  const [scanMode, setScanMode] = useState<'none' | 'camera' | 'manual'>('none');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);

  // References for camera & file upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Verification flow states
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [pendingWarning, setPendingWarning] = useState<string | null>(null);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Clean up camera on unmount or close
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  const tokenState = useMemo(() => {
    if (!enrolmentToken) return null;
    const match = enrolmentToken.match(/^CSC2-([A-Z0-9]+)-/i);
    return match ? match[1] : null;
  }, [enrolmentToken]);

  // Helper: Stop camera tracks
  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanMode((prev) => (prev === 'camera' ? 'none' : prev));
  };

  // Helper: Accept decoded QR code
  const handleCodeAccepted = (rawCode: string) => {
    const clean = rawCode.trim().toUpperCase();
    setEnrolmentToken(clean);
    setScannerError(null);
    stopCamera();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(50);
      } catch {
        // Ignore haptic feedback errors
      }
    }
  };

  // 1. SCAN WITH CAMERA
  const startCamera = async () => {
    setScannerError(null);
    setScanMode('camera');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scanVideoLoop();
      }
    } catch {
      stopCamera();
      setScannerError(
        lang === 'hi'
          ? 'कैमरा शुरू करने में असमर्थ। कृपया अनुमति दें या छवि फ़ाइल अपलोड करें।'
          : 'Unable to access camera. Please grant camera permission or upload the QR image.'
      );
    }
  };

  const scanVideoLoop = () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(scanVideoLoop);
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx && canvas.width > 0 && canvas.height > 0) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      if (code && code.data && code.data.trim()) {
        handleCodeAccepted(code.data.trim());
        return;
      }
    }

    animFrameRef.current = requestAnimationFrame(scanVideoLoop);
  };

  // 2. UPLOAD QR IMAGE (KoboToolbox style from gallery/screenshot)
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setScannerError(null);
    setIsAnalyzingImage(true);

    try {
      const decoded = await scanImageFile(file);
      if (decoded) {
        handleCodeAccepted(decoded);
      } else {
        setScannerError(
          lang === 'hi'
            ? 'इस छवि में कोई QR कोड नहीं मिला। कृपया स्पष्ट छवि अपलोड करें या मैन्युअल रूप से कोड दर्ज करें।'
            : 'No QR code detected in this image. Please upload a clear photo/screenshot or enter the code manually.'
        );
      }
    } catch {
      setScannerError(
        lang === 'hi'
          ? 'छवि पढ़ने में असमर्थ। कृपया पुनः प्रयास करें।'
          : 'Failed to process image file. Please try another image.'
      );
    } finally {
      setIsAnalyzingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const scanImageFile = (file: File): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Image decode error'));
        img.onload = async () => {
          try {
            // 1. Try native BarcodeDetector if available
            if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
              try {
                const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
                const barcodes = await detector.detect(img);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  return resolve(barcodes[0].rawValue);
                }
              } catch {
                // Fallback to jsQR canvas pipeline
              }
            }

            // 2. Canvas + jsQR
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            const maxDim = 1200;
            if (width > maxDim || height > maxDim) {
              const ratio = Math.min(maxDim / width, maxDim / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return resolve(null);

            ctx.drawImage(img, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);

            // Normal attempt
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });
            if (code && code.data && code.data.trim()) {
              return resolve(code.data.trim());
            }

            // High contrast fallback (helps with photos of laptop/phone screens)
            const d = imageData.data;
            for (let i = 0; i < d.length; i += 4) {
              const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
              const thresh = gray > 128 ? 255 : 0;
              d[i] = thresh;
              d[i + 1] = thresh;
              d[i + 2] = thresh;
            }
            ctx.putImageData(imageData, 0, 0);
            const contrastCode = jsQR(d, width, height, { inversionAttempts: 'attemptBoth' });
            if (contrastCode && contrastCode.data && contrastCode.data.trim()) {
              return resolve(contrastCode.data.trim());
            }

            resolve(null);
          } catch (err) {
            reject(err);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setPendingWarning(null);

    const cleanPhone = phone.trim().replace(/[\s\-()]+/g, '');
    if (!cleanPhone) {
      setError(lang === 'hi' ? 'कृपया मोबाइल नंबर दर्ज करें' : 'Please enter your mobile number.');
      return;
    }

    if (!enrolmentToken.trim()) {
      setError(lang === 'hi' ? 'राज्य नामांकन बारकोड/QR कोड आवश्यक है' : 'State enrolment QR barcode or token is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/field/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: cleanPhone, deviceId: 'browser-device' }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setOtpSent(true);
        setOtp('');
        setCooldown(60);
        setInfoMessage(
          data.message ||
            (lang === 'hi'
              ? 'सत्यापन कोड आपके पंजीकृत मोबाइल नंबर पर भेजा गया है।'
              : 'Verification code sent to your registered mobile number.')
        );
      } else {
        if (data.cooldownActive) {
          setCooldown(60);
        }
        setError(data.message || (lang === 'hi' ? 'कोड भेजने में विफल' : 'Failed to send verification code.'));
      }
    } catch {
      setError(lang === 'hi' ? 'नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।' : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPendingWarning(null);

    const cleanPhone = phone.trim().replace(/[\s\-()]+/g, '');
    const cleanOtp = otp.trim();
    const cleanToken = enrolmentToken.trim();

    if (!cleanToken) {
      setError(lang === 'hi' ? 'राज्य नामांकन बारकोड या टोकन आवश्यक है' : 'State enrolment barcode or token is required.');
      return;
    }

    if (!cleanOtp || cleanOtp.length !== 6) {
      setError(lang === 'hi' ? 'कृपया 6-अंकों का कोड दर्ज करें' : 'Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/field/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone: cleanPhone,
          code: cleanOtp,
          enrolmentToken: cleanToken,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          deviceId: 'browser-device',
        }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        const verifiedUser = {
          ...data.user,
          phone: data.user.phone || data.user.phoneE164,
        };

        if (typeof window !== 'undefined') {
          if (data.tokens && data.tokens.sessionToken) {
            localStorage.setItem('csc2_device_session_token', data.tokens.sessionToken);
            localStorage.setItem('csc_token', data.tokens.sessionToken);
          }
          localStorage.setItem('csc2_field_user', JSON.stringify(verifiedUser));
          window.dispatchEvent(new CustomEvent('csc2:field_user_updated', { detail: verifiedUser }));
        }

        if (verifiedUser.status === 'PENDING') {
          setPendingWarning(
            lang === 'hi'
              ? `आपका नंबर (${verifiedUser.phone}) सत्यापित है, लेकिन राज्य टीम के अनुमोदन की प्रतीक्षा कर रहा है। आप स्थानीय ड्राफ्ट सहेज सकते हैं। अनुमोदन के बाद सर्वर सबमिशन सक्रिय हो जाएगा।`
              : `Your mobile number (${verifiedUser.phone}) has been verified, but is awaiting State Team approval. You can save local drafts on this device now; server submission will activate once approved.`
          );
          setTimeout(() => {
            onSuccess(verifiedUser);
            onClose();
          }, 1500);
        } else {
          onSuccess(verifiedUser);
          onClose();
        }
      } else {
        setError(data.message || (lang === 'hi' ? 'अमान्य कोड या बारकोड' : 'Invalid verification code or state barcode.'));
      }
    } catch {
      setError(lang === 'hi' ? 'सत्यापन विफल' : 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4 animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-verify-title"
    >
      <div className="bg-surface rounded-[20px] max-w-md w-full p-6 shadow-comic border-2 border-border/40 relative my-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 text-ink-muted hover:text-ink hover:bg-canvas rounded-full transition-colors cursor-pointer"
          aria-label={lang === 'hi' ? 'बंद करें' : 'Close modal'}
        >
          <Icon name="x" className="w-5 h-5" />
        </button>

        {/* Header Icon + Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-peach flex items-center justify-center text-primary shadow-xs border border-border/30 shrink-0">
            <Icon name="Phone" className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="phone-verify-title" className="text-lg font-black text-ink tracking-tight font-comic">
                {lang === 'hi' ? 'फ़ील्ड कार्यकर्ता सत्यापन' : 'Field Worker Access'}
              </h2>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full shrink-0">
                Demo environment
              </span>
            </div>
            <p className="text-xs text-ink-muted">
              {lang === 'hi' ? 'पहली बार उपयोग के लिए मोबाइल सत्यापन आवश्यक है' : 'One-time phone verification for this device'}
            </p>
          </div>
        </div>

        {/* Pending Approval Warning */}
        {pendingWarning && (
          <div className="mb-4 p-3.5 bg-sun/20 border-2 border-sun text-warning-ink rounded-[12px] text-xs font-medium flex items-start gap-2 animate-in fade-in">
            <Icon name="AlertTriangle" className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{pendingWarning}</p>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 bg-pink/40 border border-border text-error-ink rounded-[10px] text-xs font-semibold flex items-center gap-2" role="alert">
            <Icon name="AlertCircle" className="w-4 h-4 shrink-0 text-primary" />
            <span>{error}</span>
          </div>
        )}

        {/* Info Message */}
        {infoMessage && !error && !pendingWarning && (
          <div className="mb-4 p-3 bg-mint/50 border border-mint text-success-ink rounded-[10px] text-xs font-semibold flex items-center gap-2">
            <Icon name="CheckCircle" className="w-4 h-4 shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        {!otpSent ? (
          /* Step 1: Name, QR Code, and Phone Number Form */
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  {lang === 'hi' ? 'पहला नाम' : 'First Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={lang === 'hi' ? 'रमेश' : 'e.g. Ramesh'}
                  className="w-full text-xs font-medium px-3 py-2.5 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum focus:ring-2 focus:ring-plum/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  {lang === 'hi' ? 'अंतिम नाम' : 'Last Name'}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={lang === 'hi' ? 'कुमार' : 'e.g. Kumar'}
                  className="w-full text-xs font-medium px-3 py-2.5 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum focus:ring-2 focus:ring-plum/20"
                />
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* STATE ENROLMENT QR CODE / BARCODE SECTION (KOBOTOOLBOX STYLE)  */}
            {/* ------------------------------------------------------------- */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-ink">
                {lang === 'hi' ? 'राज्य नामांकन QR कोड / बारकोड' : 'State Enrolment Barcode / QR Code'} *
              </label>

              {/* Hidden file input for uploading QR code image */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                aria-label="Upload QR Code Image"
              />

              {/* 1. STATE: QR CODE ACCEPTED */}
              {enrolmentToken ? (
                <div className="bg-mint/40 border-2 border-mint rounded-[12px] p-3.5 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-mint flex items-center justify-center text-success-ink shrink-0">
                        <Icon name="check" className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-success-ink">
                        {lang === 'hi' ? 'QR कोड स्वीकृत' : 'QR Code Accepted'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEnrolmentToken('');
                        setScannerError(null);
                      }}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-300 shadow-2xs hover:bg-slate-50 cursor-pointer"
                    >
                      {lang === 'hi' ? 'बदलें' : 'Change Code'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-white/90 px-3 py-2 rounded-lg border border-mint">
                    <span className="font-mono text-xs font-bold text-ink tracking-wider truncate">
                      {enrolmentToken}
                    </span>
                    {tokenState && (
                      <span className="text-[10px] font-mono font-bold text-plum bg-lavender/60 px-2 py-0.5 rounded-full border border-plum/20 shrink-0 ml-2">
                        State: {tokenState}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                /* 2. STATE: NO QR CODE YET - KOBOTOOLBOX STYLE UPLOAD & CAMERA SCAN */
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* UPLOAD QR IMAGE BUTTON */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isAnalyzingImage}
                      className="min-h-[50px] p-2.5 bg-lavender hover:bg-lavender/80 border-2 border-plum/30 rounded-[12px] flex flex-col items-center justify-center text-center transition-all active:scale-[0.98] cursor-pointer text-plum shadow-2xs"
                    >
                      <div className="flex items-center gap-1.5 font-black text-xs">
                        <Icon name="Upload" className="w-4 h-4 text-plum" />
                        <span>{isAnalyzingImage ? (lang === 'hi' ? 'स्कैनिंग...' : 'Reading...') : (lang === 'hi' ? 'QR छवि अपलोड करें' : 'Upload QR Image')}</span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-600 mt-0.5">
                        {lang === 'hi' ? 'गैलरी या स्क्रीनशॉट से' : 'From gallery / screenshot'}
                      </span>
                    </button>

                    {/* SCAN WITH CAMERA BUTTON */}
                    <button
                      type="button"
                      onClick={scanMode === 'camera' ? stopCamera : startCamera}
                      className="min-h-[50px] p-2.5 bg-canvas hover:bg-slate-100 border-2 border-border/50 rounded-[12px] flex flex-col items-center justify-center text-center transition-all active:scale-[0.98] cursor-pointer text-ink shadow-2xs"
                    >
                      <div className="flex items-center gap-1.5 font-black text-xs">
                        <Icon name="Camera" className="w-4 h-4 text-slate-700" />
                        <span>{scanMode === 'camera' ? (lang === 'hi' ? 'कैमरा बंद करें' : 'Close Camera') : (lang === 'hi' ? 'कैमरे से स्कैन करें' : 'Scan with Camera')}</span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 mt-0.5">
                        {lang === 'hi' ? 'फ़ोन कैमरा का उपयोग करें' : 'Point camera at code'}
                      </span>
                    </button>
                  </div>

                  {/* LIVE CAMERA VIEWFINDER */}
                  {scanMode === 'camera' && (
                    <div className="relative rounded-[14px] overflow-hidden border-2 border-plum bg-black shadow-comic animate-in fade-in">
                      <video
                        ref={videoRef}
                        playsInline
                        autoPlay
                        muted
                        className="w-full h-56 object-cover"
                      />
                      {/* Targeting overlay reticle */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
                        <div className="w-40 h-40 border-2 border-dashed border-white/90 rounded-xl relative shadow-lg">
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400" />
                          <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400" />
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400" />
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400" />
                          <div className="w-full h-0.5 bg-emerald-400/80 absolute top-1/2 -translate-y-1/2 animate-pulse" />
                        </div>
                        <span className="text-[11px] font-bold text-white bg-black/60 px-2.5 py-1 rounded-full mt-2">
                          {lang === 'hi' ? 'QR कोड को बॉक्स में रखें' : 'Align QR code within box'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="absolute top-2 right-2 px-2.5 py-1 bg-black/70 hover:bg-black text-white text-[11px] font-bold rounded-lg border border-white/20 cursor-pointer"
                      >
                        {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
                      </button>
                    </div>
                  )}

                  {/* SCANNER ERROR MESSAGE */}
                  {scannerError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded-lg font-medium flex items-start gap-1.5 animate-in fade-in">
                      <Icon name="AlertCircle" className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>{scannerError}</span>
                    </div>
                  )}

                  {/* MANUAL INPUT EXPANDER FALLBACK */}
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => setShowManualInput(!showManualInput)}
                      className="text-[11px] font-bold text-plum hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Icon name="QrCode" className="w-3.5 h-3.5" />
                      <span>
                        {showManualInput
                          ? (lang === 'hi' ? 'मैन्युअल कोड इनपुट छुपाएं' : 'Hide manual code entry')
                          : (lang === 'hi' ? 'या कोड मैन्युअल रूप से दर्ज करें' : 'Or type token code manually')}
                      </span>
                      <Icon name={showManualInput ? 'chevron-up' : 'chevron-down'} className="w-3 h-3 text-plum" />
                    </button>

                    {showManualInput && (
                      <div className="mt-2 space-y-1 animate-in fade-in">
                        <input
                          type="text"
                          value={enrolmentToken}
                          onChange={(e) => setEnrolmentToken(e.target.value.toUpperCase())}
                          placeholder="e.g. CSC2-MH-8A4F102B..."
                          className="w-full text-xs font-mono font-bold px-3 py-2 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum tracking-wider uppercase"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-ink-muted">
                {lang === 'hi'
                  ? 'अपनी राज्य टीम से प्राप्त ईमेल में संलग्न QR कोड अपलोड करें। दोनों कारक अनिवार्य हैं।'
                  : 'Upload the QR code image received from your State Team. Both QR code and SMS OTP are required.'}
              </p>
            </div>

            {/* Mobile Number Field */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                {lang === 'hi' ? 'मोबाइल नंबर (+91)' : 'Mobile Number (+91)'} *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-ink-muted">+91</span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone.replace(/^\+91/, '')}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full text-xs font-medium pl-11 pr-3 py-2.5 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum focus:ring-2 focus:ring-plum/20 tracking-wider"
                />
              </div>
              <p className="text-[11px] text-ink-muted mt-1">
                {lang === 'hi'
                  ? 'यह नंबर आपकी राज्य टीम द्वारा अनुमोदित रोस्टर में होना चाहिए।'
                  : 'Must be registered on your State Team approved caseworker roster.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !phone || phone.length < 10 || !enrolmentToken.trim()}
              className="w-full min-h-[48px] px-4 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-[12px] shadow-comic flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>{lang === 'hi' ? 'भेजा जा रहा है...' : 'Sending code...'}</span>
              ) : (
                <>
                  <Icon name="Send" className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'सत्यापन कोड भेजें' : 'Send Verification Code'}</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Step 2: 6-Digit OTP Verification Form */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="bg-lavender/30 border border-border/40 p-2.5 rounded-[10px] flex items-center justify-between text-xs">
              <span className="font-semibold text-ink-muted">{lang === 'hi' ? 'नामांकन बारकोड:' : 'Enrolment Barcode:'}</span>
              <span className="font-mono font-bold text-plum truncate max-w-[200px]">{enrolmentToken}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                {lang === 'hi' ? '6-अंकों का सत्यापन कोड' : 'Enter 6-Digit Code'} *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                className="w-full text-center text-xl font-mono font-bold tracking-[0.3em] px-4 py-2.5 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum focus:ring-2 focus:ring-plum/20"
                autoFocus
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Demo code: 123456
                </span>
                <button
                  type="button"
                  onClick={() => setOtp('123456')}
                  className="text-[11px] font-bold text-plum hover:underline cursor-pointer"
                >
                  Fill 123456 (Demo)
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-ink-muted mt-2">
                <span>
                  {lang === 'hi' ? 'कोड 10 मिनट के लिए मान्य है' : 'Code valid for 10 minutes'}
                </span>
                {cooldown > 0 ? (
                  <span className="font-mono text-plum">
                    {lang === 'hi' ? `पुनः भेजें: ${cooldown}s` : `Resend in ${cooldown}s`}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-plum font-bold hover:underline cursor-pointer"
                  >
                    {lang === 'hi' ? 'कोड पुनः भेजें' : 'Resend Code'}
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full min-h-[48px] px-4 py-3 bg-plum hover:bg-[#682e77] text-white text-xs font-black rounded-[12px] shadow-comic flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>{lang === 'hi' ? 'सत्यापित किया जा रहा है...' : 'Verifying...'}</span>
              ) : (
                <>
                  <Icon name="CheckCircle" className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'सत्यापित करें और आगे बढ़ें' : 'Verify & Continue'}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
