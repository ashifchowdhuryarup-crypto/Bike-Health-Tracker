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

  if (isInstalled || dismissed) {
    return null;
  }

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
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-[24px] bg-white dark:bg-[#171C18] text-[#141912] dark:text-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-black/[0.04] dark:border-white/[0.06] animate-fadeIn">
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-3 w-8 h-8 rounded-full bg-[#F6F7F4] dark:bg-white/10 hover:bg-black/5 dark:hover:bg-white/15 flex items-center justify-center text-[#6F766C] dark:text-slate-300 transition"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pr-9">
          <div className="w-11 h-11 rounded-full bg-[#EEF9DA] dark:bg-[#1E2B14] p-2 shrink-0 flex items-center justify-center">
            <img src="/logo.png" alt="Bike Tracker Logo" className="w-full h-full object-contain dark:invert" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm leading-tight text-[#141912] dark:text-white">
              {language === 'bn' ? 'ফোনে অ্যাপ ইনস্টল করুন' : 'Install on Your Phone'}
            </h3>
            <p className="text-xs text-[#6F766C] dark:text-slate-400 mt-0.5 leading-snug">
              {language === 'bn'
                ? 'হোম স্ক্রিন থেকে সরাসরি ওয়ান-ট্যাপে অফলাইনেও ব্যবহার করুন।'
                : 'Add to home screen for instant 1-tap offline access.'}
            </p>
          </div>
        </div>

        <div className="mt-3">
          <button
            onClick={handleInstallClick}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-[#9AE62E] hover:bg-[#8CD825] text-[#141912] font-bold text-xs shadow-sm active:scale-[0.98] transition"
          >
            {installSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{language === 'bn' ? 'ইনস্টল হয়েছে!' : 'Installed!'}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{language === 'bn' ? 'ইনস্টল করুন' : 'Install App'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* iOS or Manual Browser Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-[28px] bg-white dark:bg-[#171C18] border border-black/[0.06] dark:border-white/[0.08] p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#EEF9DA] dark:bg-[#1E2B14] p-1.5 flex items-center justify-center">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-contain dark:invert" />
                </div>
                <h3 className="text-sm font-bold text-[#141912] dark:text-white">
                  {language === 'bn' ? 'ফোনে ইনস্টল করার নিয়ম' : 'How to Install on Phone'}
                </h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#6F766C] hover:text-[#141912] dark:text-slate-400 dark:hover:text-white hover:bg-[#F6F7F4] dark:hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs text-[#4A5247] dark:text-slate-300">
              {isIOS ? (
                <>
                  <p className="font-semibold text-[#141912] dark:text-white">
                    {language === 'bn'
                      ? 'iPhone / Safari ব্রাউজারে অ্যাপ ইনস্টল করতে:'
                      : 'To install on iPhone using Safari:'}
                  </p>
                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#F6F7F4] dark:bg-white/[0.04]">
                    <Share className="w-4 h-4 text-[#5C9E00] dark:text-[#A3EC38] shrink-0 mt-0.5" />
                    <span>
                      {language === 'bn'
                        ? '১. সাফারির নিচে থাকা শেয়ার (Share) বাটনে ট্যাপ করুন।'
                        : '1. Tap the Share button in Safari.'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#F6F7F4] dark:bg-white/[0.04]">
                    <PlusSquare className="w-4 h-4 text-[#5C9E00] dark:text-[#A3EC38] shrink-0 mt-0.5" />
                    <span>
                      {language === 'bn'
                        ? '২. স্ক্রল করে "Add to Home Screen" (হোম স্ক্রিনে যোগ করুন) সিলেক্ট করুন।'
                        : '2. Scroll down and tap "Add to Home Screen".'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-semibold text-[#141912] dark:text-white">
                    {language === 'bn'
                      ? 'Android / Chrome ব্রাউজারে ইনস্টল করতে:'
                      : 'To install on Android Chrome:'}
                  </p>
                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#F6F7F4] dark:bg-white/[0.04]">
                    <span className="font-bold text-[#5C9E00] dark:text-[#A3EC38]">⋮</span>
                    <span>
                      {language === 'bn'
                        ? '১. ব্রাউজারের উপরে ডানদিকের ৩টি ডট (Menu) চাপুন।'
                        : '1. Tap the 3 dots (Menu) at top right.'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#F6F7F4] dark:bg-white/[0.04]">
                    <Download className="w-4 h-4 text-[#5C9E00] dark:text-[#A3EC38] shrink-0 mt-0.5" />
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
              className="mt-4 w-full min-h-[44px] py-2.5 rounded-2xl bg-[#9AE62E] hover:bg-[#8CD825] text-[#141912] font-bold text-xs shadow-sm transition"
            >
              {language === 'bn' ? 'বুঝেছি' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
