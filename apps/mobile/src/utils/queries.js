import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetchJson } from "./api";

export function useExpenses({ deviceId, limit = 50 } = {}) {
  return useQuery({
    queryKey: ["expenses", deviceId, limit],
    enabled: !!deviceId,
    queryFn: async () => {
      return apiFetchJson(
        `/api/expenses?limit=${encodeURIComponent(String(limit))}`,
        { deviceId },
      );
    },
  });
}

export function useWeeklyStats({ deviceId, startDate, endDate } = {}) {
  return useQuery({
    queryKey: ["weeklyStats", deviceId, startDate, endDate],
    enabled: !!deviceId,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const queryString = params.toString();
      const url = `/api/stats/weekly${queryString ? `?${queryString}` : ""}`;
      return apiFetchJson(url, { deviceId });
    },
  });
}

export function useMonthlyStats({ deviceId, startDate, endDate } = {}) {
  return useQuery({
    queryKey: ["monthlyStats", deviceId, startDate, endDate],
    enabled: !!deviceId,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const queryString = params.toString();
      const url = `/api/stats/monthly${queryString ? `?${queryString}` : ""}`;
      return apiFetchJson(url, { deviceId });
    },
  });
}

export function useCategoryStats({ deviceId, type = 'expense' } = {}) {
  return useQuery({
    queryKey: ["categoryStats", deviceId, type],
    enabled: !!deviceId,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (type) params.append("type", type);
      const queryString = params.toString();
      return apiFetchJson(`/api/stats/categories${queryString ? `?${queryString}` : ""}`, { deviceId });
    },
  });
}

export function useDeviceSettings({ deviceId } = {}) {
  return useQuery({
    queryKey: ["deviceSettings", deviceId],
    enabled: !!deviceId,
    queryFn: async () => {
      return apiFetchJson("/api/settings", { deviceId });
    },
  });
}

export function useUpdateWeeklyBudget({ deviceId } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ weekly_budget_cents, monthly_budget_cents, budget_period }) => {
      const body = {};
      if (weekly_budget_cents !== undefined) body.weekly_budget_cents = weekly_budget_cents;
      if (monthly_budget_cents !== undefined) body.monthly_budget_cents = monthly_budget_cents;
      if (budget_period !== undefined) body.budget_period = budget_period;
      return apiFetchJson("/api/settings", {
        method: "PUT",
        deviceId,
        body,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deviceSettings", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["weeklyStats", deviceId] });
    },
  });
}

export function useCreateExpense({ deviceId } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense) => {
      return apiFetchJson("/api/expenses", {
        method: "POST",
        deviceId,
        body: expense,
      });
    },
    onMutate: async (newExpense) => {
      await queryClient.cancelQueries({ queryKey: ["expenses", deviceId] });
      const previous = queryClient.getQueryData(["expenses", deviceId, 50]);

      const optimistic = {
        id: `optimistic_${Date.now()}`,
        ...newExpense,
        occurred_at: newExpense.occurred_at || new Date().toISOString(),
        created_at: new Date().toISOString(),
        _optimistic: true,
      };

      if (Array.isArray(previous?.items)) {
        queryClient.setQueryData(["expenses", deviceId, 50], {
          ...previous,
          items: [optimistic, ...previous.items],
        });
      }

      return { previous };
    },
    onError: (error, _newExpense, context) => {
      console.error(error);
      if (context?.previous) {
        queryClient.setQueryData(["expenses", deviceId, 50], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["weeklyStats", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["categoryStats", deviceId] });
    },
  });
}

export function useDeleteExpense({ deviceId } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }) => {
      return apiFetchJson(`/api/expenses/${id}`, {
        method: "DELETE",
        deviceId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["weeklyStats", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["categoryStats", deviceId] });
    },
  });
}

export function useUpdateExpense({ deviceId } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      return apiFetchJson(`/api/expenses/${id}`, {
        method: "PUT",
        deviceId,
        body: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["weeklyStats", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["categoryStats", deviceId] });
    },
  });
}

export function useParseExpenseFromText({ deviceId } = {}) {
  return useMutation({
    mutationFn: async ({ text }) => {
      return apiFetchJson("/api/ai/parse-expense", {
        method: "POST",
        deviceId,
        body: { text },
      });
    },
  });
}

export function useScanReceipt({ deviceId } = {}) {
  return useMutation({
    mutationFn: async ({ imageUri }) => {
      // For React Native, we need to send the image as FormData
      // First, fetch the image as blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'receipt.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      // Append as file with proper name and type
      formData.append('image', blob, filename);

      // Use fetch directly for FormData (not apiFetchJson which expects JSON)
      const { resolveApiUrl } = await import('./api');
      const url = resolveApiUrl("/api/ai/scan-receipt");
      
      const headers = {};
      if (deviceId) {
        headers['x-device-id'] = deviceId;
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Receipt scan failed: ${res.status} ${res.statusText}${text ? `: ${text}` : ""}`,
        );
      }

      return await res.json();
    },
  });
}

export function useVoiceUsage({ deviceId } = {}) {
  return useQuery({
    queryKey: ["voiceUsage", deviceId],
    enabled: !!deviceId,
    queryFn: async () => {
      return apiFetchJson("/api/voice-usage", { deviceId });
    },
  });
}

export function useIncrementVoiceUsage({ deviceId } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ delta = 1 } = {}) => {
      return apiFetchJson("/api/voice-usage", {
        method: "POST",
        deviceId,
        body: { delta },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voiceUsage", deviceId] });
    },
  });
}

export function useCustomCategories({ deviceId, type } = {}) {
  return useQuery({
    queryKey: ["customCategories", deviceId, type],
    enabled: !!deviceId,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (type) params.append("type", type);
      const queryString = params.toString();
      return apiFetchJson(`/api/categories${queryString ? `?${queryString}` : ""}`, { deviceId });
    },
  });
}

export function useCreateCustomCategory({ deviceId } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ category_name, icon, color, type = 'expense' }) => {
      return apiFetchJson("/api/categories", {
        method: "POST",
        deviceId,
        body: { category_name, icon, color, type },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customCategories", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["categoryStats", deviceId] });
    },
  });
}

export function useUpdateCustomCategory({ deviceId } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, category_name, icon, color, type }) => {
      return apiFetchJson(`/api/categories/${id}`, {
        method: "PUT",
        deviceId,
        body: { category_name, icon, color, type },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customCategories", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["categoryStats", deviceId] });
    },
  });
}

export function useDeleteCustomCategory({ deviceId } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }) => {
      return apiFetchJson(`/api/categories/${id}`, {
        method: "DELETE",
        deviceId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customCategories", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["categoryStats", deviceId] });
    },
  });
}
