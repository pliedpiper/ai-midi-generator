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
    <div className="min-h-screen bg-surface-900 text-text-primary md:flex">
      <AppHeader userEmail={state.currentEmail} />

      <main className="flex-1 px-4 py-8 md:px-10 md:py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-medium">Account Settings</h1>
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
