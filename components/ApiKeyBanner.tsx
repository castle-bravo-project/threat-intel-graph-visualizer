import React, { useState, useEffect } from 'react';
import { getApiKeyStatus, setUserApiKey, clearUserApiKey, isAiAvailable, type ApiKeyStatus } from '../services/geminiService';
import { KeyIcon, CheckCircleIcon, AlertTriangleIcon, XIcon, ExternalLinkIcon, EyeIcon, EyeOffIcon } from './icons';

interface ApiKeyBannerProps {
  onApiKeyChange?: () => void;
}

export const ApiKeyBanner: React.FC<ApiKeyBannerProps> = ({ onApiKeyChange }) => {
  const [apiKeyStatus, setApiKeyStatus] = useState<{ status: ApiKeyStatus; hasKey: boolean }>({ status: 'missing', hasKey: false });
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const checkApiKeyStatus = () => {
    const status = getApiKeyStatus();
    setApiKeyStatus(status);
  };

  useEffect(() => {
    checkApiKeyStatus();
  }, []);

  const handleAddApiKey = async () => {
    if (!inputValue.trim()) {
      setError('Please enter an API key');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      setUserApiKey(inputValue.trim());
      checkApiKeyStatus();
      setShowInput(false);
      setInputValue('');
      onApiKeyChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set API key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearApiKey = () => {
    clearUserApiKey();
    checkApiKeyStatus();
    setShowInput(false);
    setInputValue('');
    setError('');
    onApiKeyChange?.();
  };

  const handleCancel = () => {
    setShowInput(false);
    setInputValue('');
    setError('');
  };

  const getBannerStyle = () => {
    if (apiKeyStatus.hasKey) {
      return 'bg-green-900/50 border-green-700 text-green-300';
    }
    return 'bg-amber-900/50 border-amber-700 text-amber-300';
  };

  const getIcon = () => {
    if (apiKeyStatus.hasKey) {
      return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
    }
    return <AlertTriangleIcon className="w-5 h-5 text-amber-400" />;
  };

  const getStatusText = () => {
    switch (apiKeyStatus.status) {
      case 'user-provided':
        return 'AI features active with your API key';
      case 'environment':
        return 'AI features active with environment API key';
      case 'missing':
        return 'Add your Google Gemini API key to unlock AI features';
      case 'invalid':
        return 'Invalid API key - please check and try again';
      default:
        return 'API key status unknown';
    }
  };

  if (showInput) {
    return (
      <div className={`p-4 rounded-lg border ${getBannerStyle()} animate-fade-in`}>
        <div className="flex items-start gap-3">
          <KeyIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-grow">
            <h3 className="font-semibold mb-2">Add Google Gemini API Key</h3>
            <p className="text-sm mb-3 opacity-90">
              Your API key is stored locally in your browser and never sent to our servers.
            </p>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter your Gemini API key..."
                  className="w-full bg-slate-800 border border-slate-600 rounded-md py-2 pl-3 pr-10 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddApiKey()}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
                >
                  {showKey ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddApiKey}
                  disabled={isLoading || !inputValue.trim()}
                  className="bg-primary text-on-primary px-4 py-2 rounded-md font-medium hover:bg-sky-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Adding...' : 'Add Key'}
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-slate-700 text-slate-300 px-4 py-2 rounded-md font-medium hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-sky-400 text-sm flex items-center gap-1 ml-auto"
                >
                  Get API Key <ExternalLinkIcon className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${getBannerStyle()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getIcon()}
          <div>
            <p className="font-medium">{getStatusText()}</p>
            {!apiKeyStatus.hasKey && (
              <p className="text-sm opacity-75 mt-1">
                Unlock AI analysis, threat intelligence, and custom reports
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!apiKeyStatus.hasKey ? (
            <>
              <button
                onClick={() => setShowInput(true)}
                className="bg-primary text-on-primary px-4 py-2 rounded-md font-medium hover:bg-sky-400 transition-colors flex items-center gap-2"
              >
                <KeyIcon className="w-4 h-4" />
                Add API Key
              </button>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-sky-400 p-2 rounded-md transition-colors"
                title="Get API Key from Google AI Studio"
              >
                <ExternalLinkIcon className="w-4 h-4" />
              </a>
            </>
          ) : (
            apiKeyStatus.status === 'user-provided' && (
              <button
                onClick={handleClearApiKey}
                className="text-slate-400 hover:text-white p-2 rounded-md transition-colors"
                title="Clear user-provided API key"
              >
                <XIcon className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
