"use client";

import React from "react";
import { getErrorMessageFromResponse, parseJsonSafely } from "@/utils/http";

export const useDataPrivacySettings = () => {
  const [exportError, setExportError] = React.useState<string | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  const [deleteAllError, setDeleteAllError] = React.useState<string | null>(null);
  const [deleteAllMessage, setDeleteAllMessage] = React.useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = React.useState(false);

  const handleExportData = async () => {
    setExportError(null);
    setIsExporting(true);

    try {
      const response = await fetch("/api/account/export", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const message = await getErrorMessageFromResponse(
          response,
          "Failed to export account data."
        );
        throw new Error(message);
      }

      const payload = await parseJsonSafely<unknown>(response);
      if (payload === null) {
        throw new Error("Failed to export account data.");
      }
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

      const payload = await parseJsonSafely<{ error?: unknown; deletedCount?: unknown }>(
        response
      );
      if (!response.ok) {
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : "Failed to delete generations.";
        throw new Error(message);
      }

      const deletedCount = typeof payload?.deletedCount === "number" ? payload.deletedCount : 0;
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

  return {
    dataPrivacy: {
      exportError,
      isExporting,
      deleteAllError,
      deleteAllMessage,
      isDeletingAll,
      handleExportData,
      handleDeleteAllGenerations,
    },
  };
};
