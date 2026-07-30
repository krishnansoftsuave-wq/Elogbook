"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { API_ENDPOINTS } from "@/constants/api";
import { ROUTES } from "@/constants/routes";
import { entryKeys } from "@/features/entries/api/keys";
import { entryDetailSchema } from "@/features/entries/schemas";
import type { EntryFormValues } from "@/features/entries/types";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/api-error";

export const useCreateEntry = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: EntryFormValues) => {
      const response = await api.post(API_ENDPOINTS.ENTRIES.CREATE, values);
      return entryDetailSchema.parse(response.data);
    },
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: entryKeys.all });
      toast.success(
        entry.status === "draft" ? "Draft saved" : "Entry submitted"
      );
      router.push(ROUTES.LOGBOOK);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

export const useUpdateEntry = (id: string) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: EntryFormValues) => {
      const response = await api.put(API_ENDPOINTS.ENTRIES.UPDATE(id), values);
      return entryDetailSchema.parse(response.data);
    },
    onSuccess: (entry) => {
      queryClient.setQueryData(entryKeys.detail(id), entry);
      queryClient.invalidateQueries({ queryKey: entryKeys.all });
      toast.success("Entry updated");
      router.push(ROUTES.LOGBOOK);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

export const useDeleteEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(API_ENDPOINTS.ENTRIES.DELETE(id));
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: entryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: entryKeys.all });
      toast.success("Entry deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};
