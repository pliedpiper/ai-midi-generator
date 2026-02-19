"use client";

import { useSecuritySettings } from "@/hooks/account/useSecuritySettings";
import { useOpenRouterKeySettings } from "@/hooks/account/useOpenRouterKeySettings";
import { useDataPrivacySettings } from "@/hooks/account/useDataPrivacySettings";
import { useDeleteAccount } from "@/hooks/account/useDeleteAccount";

interface UseAccountSettingsParams {
  userEmail: string;
  initialOpenRouterConfigured: boolean;
  initialOpenRouterUpdatedAt: string | null;
}

export const useAccountSettings = ({
  userEmail,
  initialOpenRouterConfigured,
  initialOpenRouterUpdatedAt,
}: UseAccountSettingsParams) => {
  const security = useSecuritySettings({ userEmail });
  const openRouter = useOpenRouterKeySettings({
    initialOpenRouterConfigured,
    initialOpenRouterUpdatedAt,
  });
  const dataPrivacy = useDataPrivacySettings();
  const deleteAccount = useDeleteAccount();

  return {
    currentEmail: security.currentEmail,
    formattedUpdatedAt: openRouter.formattedUpdatedAt,
    password: security.password,
    email: security.email,
    openRouterKey: openRouter.openRouterKey,
    dataPrivacy: dataPrivacy.dataPrivacy,
    deleteAccount: deleteAccount.deleteAccount,
  };
};
