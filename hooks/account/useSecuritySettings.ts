"use client";

import React from "react";
import { createClient } from "@/lib/supabase/client";

type UseSecuritySettingsInput = {
  userEmail: string;
};

export const useSecuritySettings = ({ userEmail }: UseSecuritySettingsInput) => {
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

  return {
    currentEmail,
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
  };
};
