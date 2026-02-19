"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessageFromResponse } from "@/utils/http";

export const useDeleteAccount = () => {
  const router = useRouter();
  const [deleteAccountConfirmation, setDeleteAccountConfirmation] = React.useState("");
  const [deleteAccountError, setDeleteAccountError] = React.useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false);

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
        const message = await getErrorMessageFromResponse(
          response,
          "Failed to delete account."
        );
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

  return {
    deleteAccount: {
      deleteAccountConfirmation,
      deleteAccountError,
      isDeletingAccount,
      setDeleteAccountConfirmation,
      handleDeleteAccount,
    },
  };
};
