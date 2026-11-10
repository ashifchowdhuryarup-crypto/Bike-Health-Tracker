import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { Language } from '../types';
import { Download, Share, PlusSquare, X, Check } from 'lucide-react';

interface PWAInstallBannerProps {
  language: Language;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ language }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If running in standalone mode or user dismissed, don't show banner
  if (isInstalled || dismissed) {
    return null;
  }

  // Handle native install click
  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        setInstallSuccess(true);
        setTimeout(() => setDismissed(true), 2500);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Browser hasn't fired beforeinstallprompt yet or in regular browser
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-3.5 shadow-lg border border-emerald-500/40 mb-3 animate-fadeIn">
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-2.5 top-2.5 w-6 h-6 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white/80 transition"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-3 pr-6">
          <div className="w-12 h-12 rounded-xl bg-white p-1.5 shrink-0 shadow-md flex items-center justify-center">
            <img src="/logo.png" alt="Bike Tracker Logo" className="w-full h-full object-contain" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm leading-tight text-white flex items-center gap-1.5">
              <span>{language === 'bn' ? 'ফোনে অ্যাপ ইনস্টল করুন' : 'Install on Your Phone'}</span>
            </h3>
            <p className="text-[11px] text-emerald-100 mt-0.5 leading-snug">
              {language === 'bn'
                ? 'হোম স্ক্রিন থেকে সরাসরি ওয়ান-ট্যাপে অফলাইনেও ব্যবহার করুন।'
                : 'Add to home screen for instant 1-tap offline access.'}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white text-emerald-800 font-bold text-xs shadow-md active:scale-95 transition hover:bg-emerald-50"
          >
            {installSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                <span>{language === 'bn' ? 'ইনস্টল হয়েছে!' : 'Installed!'}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-emerald-600" />
                <span>{language === 'bn' ? 'ইনস্টল করুন' : 'Install App'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* iOS or Manual Browser Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-emerald-50 p-1" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'bn' ? 'ফোনে ইনস্টল করার নিয়ম' : 'How to Install on Phone'}
                </h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              {isIOS ? (
                <>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {language === 'bn'
                      ? 'iPhone / Safari ব্রাউজারে অ্যাপ ইনস্টল করতে:'
                      : 'To install on iPhone using Safari:'}
                  </p>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <Share className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      {language === 'bn'
                        ? '১. সাফারির নিচে থাকা শেয়ার (Share) বাটনে ট্যাপ করুন।'
                        : '1. Tap the Share button in Safari.'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <PlusSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      {language === 'bn'
                        ? '২. স্ক্রল করে "Add to Home Screen" (হোম স্ক্রিনে যোগ করুন) সিলেক্ট করুন।'
                        : '2. Scroll down and tap "Add to Home Screen".'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {language === 'bn'
                      ? 'Android / Chrome ব্রাউজারে ইনস্টল করতে:'
                      : 'To install on Android Chrome:'}
                  </p>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="font-bold text-emerald-600">⋮</span>
                    <span>
                      {language === 'bn'
                        ? '১. ব্রাউজারের উপরে ডানদিকের ৩টি ডট (Menu) চাপুন।'
                        : '1. Tap the 3 dots (Menu) at top right.'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <Download className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      {language === 'bn'
                        ? '২. "Install app" অথবা "Add to Home screen" চাপুন।'
                        : '2. Select "Install app" or "Add to Home screen".'}
                    </span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
            >
              {language === 'bn' ? 'বুঝেছি' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
