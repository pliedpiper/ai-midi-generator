"use client";

import React from "react";
import { Download, Loader2, Trash2 } from "lucide-react";
import type { useAccountSettings } from "@/hooks/useAccountSettings";

type AccountSettingsState = ReturnType<typeof useAccountSettings>;

interface SecuritySectionProps {
  currentEmail: string;
  password: AccountSettingsState["password"];
  email: AccountSettingsState["email"];
}

interface OpenRouterKeySectionProps {
  formattedUpdatedAt: string | null;
  openRouterKey: AccountSettingsState["openRouterKey"];
}

interface DataPrivacySectionProps {
  dataPrivacy: AccountSettingsState["dataPrivacy"];
}

interface DeleteAccountSectionProps {
  deleteAccount: AccountSettingsState["deleteAccount"];
}

export const SecuritySection: React.FC<SecuritySectionProps> = ({
  currentEmail,
  password,
  email,
}) => (
  <section className="rounded-2xl border border-surface-600/70 bg-surface-800/70 p-6 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.85)] backdrop-blur-sm">
    <h2 className="text-lg font-medium">Security</h2>

    <div className="mt-5 grid gap-6 md:grid-cols-2">
      <form onSubmit={password.handlePasswordChange} className="space-y-3">
        <h3 className="text-sm font-medium">Change Password</h3>
        <input
          type="password"
          value={password.newPassword}
          onChange={(event) => password.setNewPassword(event.target.value)}
          placeholder="New password"
          autoComplete="new-password"
          className="w-full rounded-xl border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent"
          disabled={password.isUpdatingPassword}
        />
        <input
          type="password"
          value={password.confirmPassword}
          onChange={(event) => password.setConfirmPassword(event.target.value)}
          placeholder="Confirm new password"
          autoComplete="new-password"
          className="w-full rounded-xl border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent"
          disabled={password.isUpdatingPassword}
        />
        <button
          type="submit"
          disabled={password.isUpdatingPassword}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            password.isUpdatingPassword
              ? "bg-surface-700 text-text-muted cursor-not-allowed"
              : "bg-accent text-accent-foreground hover:bg-accent-hover"
          }`}
        >
          {password.isUpdatingPassword ? "Updating..." : "Update password"}
        </button>
        {password.passwordError && (
          <p className="text-sm text-red-400">{password.passwordError}</p>
        )}
        {password.passwordMessage && (
          <p className="text-sm text-green-400">{password.passwordMessage}</p>
        )}
      </form>

      <form onSubmit={email.handleEmailChange} className="space-y-3">
        <h3 className="text-sm font-medium">Change Email</h3>
        <p className="text-xs text-text-secondary">Current: {currentEmail}</p>
        <input
          type="email"
          value={email.emailInput}
          onChange={(event) => email.setEmailInput(event.target.value)}
          placeholder="new-email@example.com"
          autoComplete="email"
          className="w-full rounded-xl border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent"
          disabled={email.isUpdatingEmail}
        />
        <button
          type="submit"
          disabled={email.isUpdatingEmail}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            email.isUpdatingEmail
              ? "bg-surface-700 text-text-muted cursor-not-allowed"
              : "bg-accent text-accent-foreground hover:bg-accent-hover"
          }`}
        >
          {email.isUpdatingEmail ? "Updating..." : "Update email"}
        </button>
        {email.emailError && <p className="text-sm text-red-400">{email.emailError}</p>}
        {email.emailMessage && (
          <p className="text-sm text-green-400">{email.emailMessage}</p>
        )}
      </form>
    </div>
  </section>
);

export const OpenRouterKeySection: React.FC<OpenRouterKeySectionProps> = ({
  formattedUpdatedAt,
  openRouterKey,
}) => (
  <section className="rounded-2xl border border-surface-600/70 bg-surface-800/70 p-6 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.85)] backdrop-blur-sm">
    <h2 className="text-lg font-medium">OpenRouter Key</h2>
    <p className="text-sm text-text-secondary mt-1">
      Status: {openRouterKey.keyConfigured ? "Configured" : "Not configured"}
    </p>
    {formattedUpdatedAt && (
      <p className="text-xs text-text-muted mt-1">Last updated: {formattedUpdatedAt}</p>
    )}

    <form onSubmit={openRouterKey.handleSaveApiKey} className="mt-4 space-y-3">
      <input
        type="password"
        value={openRouterKey.apiKeyInput}
        onChange={(event) => openRouterKey.setApiKeyInput(event.target.value)}
        placeholder="sk-or-..."
        className="w-full rounded-xl border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent md:max-w-lg"
        autoComplete="off"
        disabled={openRouterKey.isSavingApiKey || openRouterKey.isRemovingApiKey}
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={openRouterKey.isSavingApiKey || openRouterKey.isRemovingApiKey}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            openRouterKey.isSavingApiKey || openRouterKey.isRemovingApiKey
              ? "bg-surface-700 text-text-muted cursor-not-allowed"
              : "bg-accent text-accent-foreground hover:bg-accent-hover"
          }`}
        >
          {openRouterKey.isSavingApiKey ? "Saving..." : "Save key"}
        </button>
        <button
          type="button"
          onClick={() => void openRouterKey.handleRemoveApiKey()}
          disabled={
            !openRouterKey.keyConfigured ||
            openRouterKey.isSavingApiKey ||
            openRouterKey.isRemovingApiKey
          }
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            !openRouterKey.keyConfigured ||
            openRouterKey.isSavingApiKey ||
            openRouterKey.isRemovingApiKey
              ? "bg-surface-700 text-text-muted cursor-not-allowed"
              : "bg-surface-700 text-text-secondary hover:bg-red-500/20 hover:text-red-300"
          }`}
        >
          {openRouterKey.isRemovingApiKey ? "Removing..." : "Remove key"}
        </button>
      </div>
    </form>

    {openRouterKey.apiKeyError && (
      <p className="mt-3 text-sm text-red-400">{openRouterKey.apiKeyError}</p>
    )}
    {openRouterKey.apiKeyMessage && (
      <p className="mt-3 text-sm text-green-400">{openRouterKey.apiKeyMessage}</p>
    )}
  </section>
);

export const DataPrivacySection: React.FC<DataPrivacySectionProps> = ({ dataPrivacy }) => (
  <section className="rounded-2xl border border-surface-600/70 bg-surface-800/70 p-6 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.85)] backdrop-blur-sm">
    <h2 className="text-lg font-medium">Data & Privacy</h2>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void dataPrivacy.handleExportData()}
        disabled={dataPrivacy.isExporting}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
          dataPrivacy.isExporting
            ? "bg-surface-700 text-text-muted cursor-not-allowed"
            : "bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary"
        }`}
      >
        {dataPrivacy.isExporting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Download size={14} />
        )}
        {dataPrivacy.isExporting ? "Exporting..." : "Export account data"}
      </button>

      <button
        type="button"
        onClick={() => void dataPrivacy.handleDeleteAllGenerations()}
        disabled={dataPrivacy.isDeletingAll}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
          dataPrivacy.isDeletingAll
            ? "bg-surface-700 text-text-muted cursor-not-allowed"
            : "bg-surface-700 text-text-secondary hover:bg-red-500/20 hover:text-red-300"
        }`}
      >
        {dataPrivacy.isDeletingAll ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Trash2 size={14} />
        )}
        {dataPrivacy.isDeletingAll ? "Deleting..." : "Delete all generations"}
      </button>
    </div>

    {dataPrivacy.exportError && (
      <p className="mt-3 text-sm text-red-400">{dataPrivacy.exportError}</p>
    )}
    {dataPrivacy.deleteAllError && (
      <p className="mt-3 text-sm text-red-400">{dataPrivacy.deleteAllError}</p>
    )}
    {dataPrivacy.deleteAllMessage && (
      <p className="mt-3 text-sm text-green-400">{dataPrivacy.deleteAllMessage}</p>
    )}
  </section>
);

export const DeleteAccountSection: React.FC<DeleteAccountSectionProps> = ({
  deleteAccount,
}) => (
  <section className="rounded-2xl border border-red-500/35 bg-red-500/5 p-6 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.85)] backdrop-blur-sm">
    <h2 className="text-lg font-medium text-red-300">Delete Account</h2>
    <p className="text-sm text-red-200/80 mt-1">
      This permanently removes your account, OpenRouter key, and saved generations.
    </p>

    <form onSubmit={deleteAccount.handleDeleteAccount} className="mt-4 space-y-3">
      <input
        type="text"
        value={deleteAccount.deleteAccountConfirmation}
        onChange={(event) => deleteAccount.setDeleteAccountConfirmation(event.target.value)}
        placeholder="Type DELETE to confirm"
        className="w-full rounded-xl border border-red-500/40 bg-surface-900 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-red-400 md:max-w-sm"
        disabled={deleteAccount.isDeletingAccount}
      />
      <button
        type="submit"
        disabled={deleteAccount.isDeletingAccount}
        className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
          deleteAccount.isDeletingAccount
            ? "bg-surface-700 text-text-muted cursor-not-allowed"
            : "bg-red-500/20 text-red-200 hover:bg-red-500/30"
        }`}
      >
        {deleteAccount.isDeletingAccount ? "Deleting account..." : "Delete account"}
      </button>
      {deleteAccount.deleteAccountError && (
        <p className="text-sm text-red-400">{deleteAccount.deleteAccountError}</p>
      )}
    </form>
  </section>
);
