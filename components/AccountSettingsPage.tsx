"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Download, Loader2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AppHeader from './AppHeader';

interface AccountSettingsPageProps {
  userEmail: string;
  initialOpenRouterConfigured: boolean;
  initialOpenRouterUpdatedAt: string | null;
}

const AccountSettingsPage: React.FC<AccountSettingsPageProps> = ({
  userEmail,
  initialOpenRouterConfigured,
  initialOpenRouterUpdatedAt
}) => {
  const router = useRouter();
  const [currentEmail, setCurrentEmail] = React.useState(userEmail);

  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = React.useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);

  const [emailInput, setEmailInput] = React.useState('');
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [emailMessage, setEmailMessage] = React.useState<string | null>(null);
  const [isUpdatingEmail, setIsUpdatingEmail] = React.useState(false);

  const [keyConfigured, setKeyConfigured] = React.useState(initialOpenRouterConfigured);
  const [keyUpdatedAt, setKeyUpdatedAt] = React.useState<string | null>(initialOpenRouterUpdatedAt);
  const [apiKeyInput, setApiKeyInput] = React.useState('');
  const [apiKeyError, setApiKeyError] = React.useState<string | null>(null);
  const [apiKeyMessage, setApiKeyMessage] = React.useState<string | null>(null);
  const [isSavingApiKey, setIsSavingApiKey] = React.useState(false);
  const [isRemovingApiKey, setIsRemovingApiKey] = React.useState(false);

  const [exportError, setExportError] = React.useState<string | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  const [deleteAllError, setDeleteAllError] = React.useState<string | null>(null);
  const [deleteAllMessage, setDeleteAllMessage] = React.useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = React.useState(false);

  const [deleteAccountConfirmation, setDeleteAccountConfirmation] = React.useState('');
  const [deleteAccountError, setDeleteAccountError] = React.useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false);

  const refreshOpenRouterStatus = React.useCallback(async () => {
    try {
      const response = await fetch('/api/user/openrouter-key', { cache: 'no-store' });
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setKeyConfigured(Boolean(data?.configured));
      setKeyUpdatedAt(typeof data?.updatedAt === 'string' ? data.updatedAt : null);
    } catch {
      // Non-critical status sync failure.
    }
  }, []);

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        throw error;
      }

      setPasswordMessage('Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleEmailChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailError(null);
    setEmailMessage(null);

    const normalized = emailInput.trim().toLowerCase();
    if (!normalized) {
      setEmailError('Email is required.');
      return;
    }

    if (!normalized.includes('@')) {
      setEmailError('Enter a valid email address.');
      return;
    }

    if (normalized === currentEmail.toLowerCase()) {
      setEmailError('New email must be different from your current email.');
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.updateUser({ email: normalized });
      if (error) {
        throw error;
      }

      const nextEmail = data.user?.email;
      if (nextEmail) {
        setCurrentEmail(nextEmail);
      }

      setEmailInput('');
      setEmailMessage('Email update requested. Check your inbox to confirm the new address.');
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'Failed to update email.');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleSaveApiKey = async (event: React.FormEvent) => {
    event.preventDefault();
    setApiKeyError(null);
    setApiKeyMessage(null);

    const normalized = apiKeyInput.trim();
    if (!normalized) {
      setApiKeyError('API key is required.');
      return;
    }

    setIsSavingApiKey(true);
    try {
      const response = await fetch('/api/user/openrouter-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: normalized })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = typeof data?.error === 'string' ? data.error : 'Failed to save API key.';
        throw new Error(message);
      }

      setApiKeyInput('');
      setApiKeyMessage('OpenRouter API key saved.');
      await refreshOpenRouterStatus();
    } catch (error) {
      setApiKeyError(error instanceof Error ? error.message : 'Failed to save API key.');
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleRemoveApiKey = async () => {
    setApiKeyError(null);
    setApiKeyMessage(null);

    const confirmed = window.confirm('Remove your stored OpenRouter API key? Generation will be disabled until you add a new key.');
    if (!confirmed) {
      return;
    }

    setIsRemovingApiKey(true);
    try {
      const response = await fetch('/api/user/openrouter-key', {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = typeof data?.error === 'string' ? data.error : 'Failed to remove API key.';
        throw new Error(message);
      }

      setApiKeyMessage('OpenRouter API key removed.');
      await refreshOpenRouterStatus();
    } catch (error) {
      setApiKeyError(error instanceof Error ? error.message : 'Failed to remove API key.');
    } finally {
      setIsRemovingApiKey(false);
    }
  };

  const handleExportData = async () => {
    setExportError(null);
    setIsExporting(true);

    try {
      const response = await fetch('/api/account/export', {
        method: 'GET',
        cache: 'no-store'
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = typeof data?.error === 'string' ? data.error : 'Failed to export account data.';
        throw new Error(message);
      }

      const payload = await response.json();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `midi-generator-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Failed to export account data.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllGenerations = async () => {
    setDeleteAllError(null);
    setDeleteAllMessage(null);

    const confirmed = window.confirm('Delete all saved generations? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    setIsDeletingAll(true);
    try {
      const response = await fetch('/api/generations', {
        method: 'DELETE'
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = typeof data?.error === 'string' ? data.error : 'Failed to delete generations.';
        throw new Error(message);
      }

      const deletedCount = typeof data?.deletedCount === 'number' ? data.deletedCount : 0;
      setDeleteAllMessage(`Deleted ${deletedCount} saved generation${deletedCount === 1 ? '' : 's'}.`);
    } catch (error) {
      setDeleteAllError(error instanceof Error ? error.message : 'Failed to delete generations.');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleDeleteAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setDeleteAccountError(null);

    if (deleteAccountConfirmation.trim() !== 'DELETE') {
      setDeleteAccountError('Type DELETE to confirm account deletion.');
      return;
    }

    setIsDeletingAccount(true);
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: deleteAccountConfirmation.trim() })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = typeof data?.error === 'string' ? data.error : 'Failed to delete account.';
        throw new Error(message);
      }

      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      setDeleteAccountError(error instanceof Error ? error.message : 'Failed to delete account.');
      setIsDeletingAccount(false);
    }
  };

  const formattedUpdatedAt = keyUpdatedAt ? new Date(keyUpdatedAt).toLocaleString() : null;

  return (
    <div className="min-h-screen bg-surface-900 text-text-primary">
      <AppHeader userEmail={currentEmail} />

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-medium">Account Settings</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage your account, security preferences, and saved data.
          </p>
        </div>

        <section className="bg-surface-800 border border-surface-600 rounded-lg p-6">
          <h2 className="text-lg font-medium">Security</h2>

          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <h3 className="text-sm font-medium">Change Password</h3>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                className="w-full bg-surface-900 border border-surface-600 rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none transition-colors"
                disabled={isUpdatingPassword}
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="w-full bg-surface-900 border border-surface-600 rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none transition-colors"
                disabled={isUpdatingPassword}
              />
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  isUpdatingPassword
                    ? 'bg-surface-700 text-text-muted cursor-not-allowed'
                    : 'bg-accent text-surface-900 hover:bg-accent-hover'
                }`}
              >
                {isUpdatingPassword ? 'Updating...' : 'Update password'}
              </button>
              {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
              {passwordMessage && <p className="text-sm text-green-400">{passwordMessage}</p>}
            </form>

            <form onSubmit={handleEmailChange} className="space-y-3">
              <h3 className="text-sm font-medium">Change Email</h3>
              <p className="text-xs text-text-secondary">Current: {currentEmail}</p>
              <input
                type="email"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                placeholder="new-email@example.com"
                autoComplete="email"
                className="w-full bg-surface-900 border border-surface-600 rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none transition-colors"
                disabled={isUpdatingEmail}
              />
              <button
                type="submit"
                disabled={isUpdatingEmail}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  isUpdatingEmail
                    ? 'bg-surface-700 text-text-muted cursor-not-allowed'
                    : 'bg-accent text-surface-900 hover:bg-accent-hover'
                }`}
              >
                {isUpdatingEmail ? 'Updating...' : 'Update email'}
              </button>
              {emailError && <p className="text-sm text-red-400">{emailError}</p>}
              {emailMessage && <p className="text-sm text-green-400">{emailMessage}</p>}
            </form>
          </div>
        </section>

        <section className="bg-surface-800 border border-surface-600 rounded-lg p-6">
          <h2 className="text-lg font-medium">OpenRouter Key</h2>
          <p className="text-sm text-text-secondary mt-1">
            Status: {keyConfigured ? 'Configured' : 'Not configured'}
          </p>
          {formattedUpdatedAt && (
            <p className="text-xs text-text-muted mt-1">Last updated: {formattedUpdatedAt}</p>
          )}

          <form onSubmit={handleSaveApiKey} className="mt-4 space-y-3">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(event) => setApiKeyInput(event.target.value)}
              placeholder="sk-or-..."
              className="w-full md:max-w-lg bg-surface-900 border border-surface-600 rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none transition-colors"
              autoComplete="off"
              disabled={isSavingApiKey || isRemovingApiKey}
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSavingApiKey || isRemovingApiKey}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  isSavingApiKey || isRemovingApiKey
                    ? 'bg-surface-700 text-text-muted cursor-not-allowed'
                    : 'bg-accent text-surface-900 hover:bg-accent-hover'
                }`}
              >
                {isSavingApiKey ? 'Saving...' : 'Save key'}
              </button>
              <button
                type="button"
                onClick={() => void handleRemoveApiKey()}
                disabled={!keyConfigured || isSavingApiKey || isRemovingApiKey}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  !keyConfigured || isSavingApiKey || isRemovingApiKey
                    ? 'bg-surface-700 text-text-muted cursor-not-allowed'
                    : 'bg-surface-700 text-text-secondary hover:bg-red-500/20 hover:text-red-300'
                }`}
              >
                {isRemovingApiKey ? 'Removing...' : 'Remove key'}
              </button>
            </div>
          </form>

          {apiKeyError && <p className="mt-3 text-sm text-red-400">{apiKeyError}</p>}
          {apiKeyMessage && <p className="mt-3 text-sm text-green-400">{apiKeyMessage}</p>}
        </section>

        <section className="bg-surface-800 border border-surface-600 rounded-lg p-6">
          <h2 className="text-lg font-medium">Data & Privacy</h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleExportData()}
              disabled={isExporting}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors inline-flex items-center gap-2 ${
                isExporting
                  ? 'bg-surface-700 text-text-muted cursor-not-allowed'
                  : 'bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary'
              }`}
            >
              {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {isExporting ? 'Exporting...' : 'Export account data'}
            </button>

            <button
              type="button"
              onClick={() => void handleDeleteAllGenerations()}
              disabled={isDeletingAll}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors inline-flex items-center gap-2 ${
                isDeletingAll
                  ? 'bg-surface-700 text-text-muted cursor-not-allowed'
                  : 'bg-surface-700 text-text-secondary hover:bg-red-500/20 hover:text-red-300'
              }`}
            >
              {isDeletingAll ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {isDeletingAll ? 'Deleting...' : 'Delete all generations'}
            </button>
          </div>

          {exportError && <p className="mt-3 text-sm text-red-400">{exportError}</p>}
          {deleteAllError && <p className="mt-3 text-sm text-red-400">{deleteAllError}</p>}
          {deleteAllMessage && <p className="mt-3 text-sm text-green-400">{deleteAllMessage}</p>}
        </section>

        <section className="bg-red-500/5 border border-red-500/30 rounded-lg p-6">
          <h2 className="text-lg font-medium text-red-300">Delete Account</h2>
          <p className="text-sm text-red-200/80 mt-1">
            This permanently removes your account, OpenRouter key, and saved generations.
          </p>

          <form onSubmit={handleDeleteAccount} className="mt-4 space-y-3">
            <input
              type="text"
              value={deleteAccountConfirmation}
              onChange={(event) => setDeleteAccountConfirmation(event.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full md:max-w-sm bg-surface-900 border border-red-500/40 rounded px-3 py-2 text-sm text-text-primary focus:border-red-400 outline-none transition-colors"
              disabled={isDeletingAccount}
            />
            <button
              type="submit"
              disabled={isDeletingAccount}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                isDeletingAccount
                  ? 'bg-surface-700 text-text-muted cursor-not-allowed'
                  : 'bg-red-500/20 text-red-200 hover:bg-red-500/30'
              }`}
            >
              {isDeletingAccount ? 'Deleting account...' : 'Delete account'}
            </button>
            {deleteAccountError && <p className="text-sm text-red-400">{deleteAccountError}</p>}
          </form>
        </section>
      </main>
    </div>
  );
};

export default AccountSettingsPage;
