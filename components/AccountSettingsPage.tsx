"use client";

import React from "react";
import AppHeader from "./AppHeader";
import { useAccountSettings } from "@/hooks/useAccountSettings";
import {
  DataPrivacySection,
  DeleteAccountSection,
  OpenRouterKeySection,
  SecuritySection,
} from "@/components/account/AccountSections";

interface AccountSettingsPageProps {
  userEmail: string;
  initialOpenRouterConfigured: boolean;
  initialOpenRouterUpdatedAt: string | null;
}

const AccountSettingsPage: React.FC<AccountSettingsPageProps> = ({
  userEmail,
  initialOpenRouterConfigured,
  initialOpenRouterUpdatedAt,
}) => {
  const state = useAccountSettings({
    userEmail,
    initialOpenRouterConfigured,
    initialOpenRouterUpdatedAt,
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-900 text-text-primary">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 background-blob-sunset" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-surface-500/50 to-transparent" />
      </div>

      <AppHeader userEmail={state.currentEmail} variant="compact" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-10 pt-28 sm:px-6 md:px-8 md:pt-32">
        <div className="mx-auto w-full max-w-4xl space-y-8">
          <div className="rounded-[2rem] border border-surface-600/70 bg-surface-900/55 px-5 py-7 backdrop-blur-xl sm:px-8 md:px-10">
            <h1 className="text-3xl font-medium sm:text-4xl">Account Settings</h1>
            <p className="text-sm text-text-secondary mt-1">
              Manage your account, security preferences, and saved data.
            </p>
          </div>

          <SecuritySection
            currentEmail={state.currentEmail}
            password={state.password}
            email={state.email}
          />

          <OpenRouterKeySection
            formattedUpdatedAt={state.formattedUpdatedAt}
            openRouterKey={state.openRouterKey}
          />

          <DataPrivacySection dataPrivacy={state.dataPrivacy} />

          <DeleteAccountSection deleteAccount={state.deleteAccount} />
        </div>
      </main>
    </div>
  );
};

export default AccountSettingsPage;
