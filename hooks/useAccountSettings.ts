"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
  const router = useRouter();
  const [currentEmail, setCurrentEmail] = React.useState(userEmail);

  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = React.useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);

  const [emailInput, setEmailInput] = React.useState("");
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [emailMessage, setEmailMessage] = React.useState<string | null>(null);
  const [isUpdatingEmail, setIsUpdatingEmail] = React.useState(false);

  const [keyConfigured, setKeyConfigured] = React.useState(initialOpenRouterConfigured);
  const [keyUpdatedAt, setKeyUpdatedAt] = React.useState<string | null>(
    initialOpenRouterUpdatedAt
  );
  const [apiKeyInput, setApiKeyInput] = React.useState("");
  const [apiKeyError, setApiKeyError] = React.useState<string | null>(null);
  const [apiKeyMessage, setApiKeyMessage] = React.useState<string | null>(null);
  const [isSavingApiKey, setIsSavingApiKey] = React.useState(false);
  const [isRemovingApiKey, setIsRemovingApiKey] = React.useState(false);

  const [exportError, setExportError] = React.useState<string | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  const [deleteAllError, setDeleteAllError] = React.useState<string | null>(null);
  const [deleteAllMessage, setDeleteAllMessage] = React.useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = React.useState(false);

  const [deleteAccountConfirmation, setDeleteAccountConfirmation] = React.useState("");
  const [deleteAccountError, setDeleteAccountError] = React.useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false);

  const refreshOpenRouterStatus = React.useCallback(async () => {
    try {
      const response = await fetch("/api/user/openrouter-key", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const data: unknown = await response.json();
      const payload = data as { configured?: unknown; updatedAt?: unknown };
      setKeyConfigured(Boolean(payload.configured));
      setKeyUpdatedAt(typeof payload.updatedAt === "string" ? payload.updatedAt : null);
    } catch {
      // Non-critical status sync failure.
    }
  }, []);

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        throw error;
      }

      setPasswordMessage("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "Failed to update password."
      );
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
      setEmailError("Email is required.");
      return;
    }

    if (!normalized.includes("@")) {
      setEmailError("Enter a valid email address.");
      return;
    }

    if (normalized === currentEmail.toLowerCase()) {
      setEmailError("New email must be different from your current email.");
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

      setEmailInput("");
      setEmailMessage("Email update requested. Check your inbox to confirm the new address.");
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : "Failed to update email.");
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
      setApiKeyError("API key is required.");
      return;
    }

    setIsSavingApiKey(true);
    try {
      const response = await fetch("/api/user/openrouter-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: normalized }),
      });

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => ({}));
        const payload = data as { error?: unknown };
        const message =
          typeof payload.error === "string" ? payload.error : "Failed to save API key.";
        throw new Error(message);
      }

      setApiKeyInput("");
      setApiKeyMessage("OpenRouter API key saved.");
      await refreshOpenRouterStatus();
    } catch (error) {
      setApiKeyError(error instanceof Error ? error.message : "Failed to save API key.");
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleRemoveApiKey = async () => {
    setApiKeyError(null);
    setApiKeyMessage(null);

    const confirmed = window.confirm(
      "Remove your stored OpenRouter API key? Generation will be disabled until you add a new key."
    );
    if (!confirmed) {
      return;
    }

    setIsRemovingApiKey(true);
    try {
      const response = await fetch("/api/user/openrouter-key", { method: "DELETE" });

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => ({}));
        const payload = data as { error?: unknown };
        const message =
          typeof payload.error === "string" ? payload.error : "Failed to remove API key.";
        throw new Error(message);
      }

      setApiKeyMessage("OpenRouter API key removed.");
      await refreshOpenRouterStatus();
    } catch (error) {
      setApiKeyError(
        error instanceof Error ? error.message : "Failed to remove API key."
      );
    } finally {
      setIsRemovingApiKey(false);
    }
  };

  const handleExportData = async () => {
    setExportError(null);
    setIsExporting(true);

    try {
      const response = await fetch("/api/account/export", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => ({}));
        const payload = data as { error?: unknown };
        const message =
          typeof payload.error === "string"
            ? payload.error
            : "Failed to export account data.";
        throw new Error(message);
      }

      const payload = await response.json();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `midi-generator-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Failed to export account data."
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllGenerations = async () => {
    setDeleteAllError(null);
    setDeleteAllMessage(null);

    const confirmed = window.confirm("Delete all saved generations? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    setIsDeletingAll(true);
    try {
      const response = await fetch("/api/generations", { method: "DELETE" });

      const data: unknown = await response.json().catch(() => ({}));
      const payload = data as { error?: unknown; deletedCount?: unknown };
      if (!response.ok) {
        const message =
          typeof payload.error === "string" ? payload.error : "Failed to delete generations.";
        throw new Error(message);
      }

      const deletedCount = typeof payload.deletedCount === "number" ? payload.deletedCount : 0;
      setDeleteAllMessage(
        `Deleted ${deletedCount} saved generation${deletedCount === 1 ? "" : "s"}.`
      );
    } catch (error) {
      setDeleteAllError(
        error instanceof Error ? error.message : "Failed to delete generations."
      );
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleDeleteAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setDeleteAccountError(null);

    if (deleteAccountConfirmation.trim() !== "DELETE") {
      setDeleteAccountError("Type DELETE to confirm account deletion.");
      return;
    }

    setIsDeletingAccount(true);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteAccountConfirmation.trim() }),
      });

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => ({}));
        const payload = data as { error?: unknown };
        const message =
          typeof payload.error === "string" ? payload.error : "Failed to delete account.";
        throw new Error(message);
      }

      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      setDeleteAccountError(
        error instanceof Error ? error.message : "Failed to delete account."
      );
      setIsDeletingAccount(false);
    }
  };

  const formattedUpdatedAt = keyUpdatedAt ? new Date(keyUpdatedAt).toLocaleString() : null;

  return {
    currentEmail,
    formattedUpdatedAt,
    password: {
      newPassword,
      confirmPassword,
      passwordError,
      passwordMessage,
      isUpdatingPassword,
      setNewPassword,
      setConfirmPassword,
      handlePasswordChange,
    },
    email: {
      emailInput,
      emailError,
      emailMessage,
      isUpdatingEmail,
      setEmailInput,
      handleEmailChange,
    },
    openRouterKey: {
      keyConfigured,
      apiKeyInput,
      apiKeyError,
      apiKeyMessage,
      isSavingApiKey,
      isRemovingApiKey,
      setApiKeyInput,
      handleSaveApiKey,
      handleRemoveApiKey,
    },
    dataPrivacy: {
      exportError,
      isExporting,
      deleteAllError,
      deleteAllMessage,
      isDeletingAll,
      handleExportData,
      handleDeleteAllGenerations,
    },
    deleteAccount: {
      deleteAccountConfirmation,
      deleteAccountError,
      isDeletingAccount,
      setDeleteAccountConfirmation,
      handleDeleteAccount,
    },
  };
};
