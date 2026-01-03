import React, { useMemo, useState } from "react";
import { ScrollView, Text, View, TouchableOpacity, Modal, TextInput } from "react-native";
import { TrendingUp, X, AlertTriangle, TrendingDown, Target } from "lucide-react-native";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subWeeks, startOfDay, endOfDay } from "date-fns";

import ScreenLayout from "@/components/ScreenLayout";
import EmptyState from "@/components/EmptyState";
import useDeviceId from "@/utils/useDeviceId";
import { formatMoney } from "@/utils/api";
import { useWeeklyStats, useMonthlyStats, useDeviceSettings, useCustomCategories } from "@/utils/queries";
import { normalizeCategory } from "@/utils/categories";
import { useTheme } from "@/utils/theme";

const DATE_PRESETS = [
  { label: "This Week", value: "thisWeek" },
  { label: "Last Week", value: "lastWeek" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "Custom", value: "custom" },
];

export default function Analytics() {
  const { isDark } = useTheme();
  const deviceId = useDeviceId();

  const [datePreset, setDatePreset] = useState("thisWeek");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate, endDate;

    switch (datePreset) {
      case "thisWeek":
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "lastWeek":
        const lastWeekStart = subWeeks(now, 1);
        startDate = startOfWeek(lastWeekStart, { weekStartsOn: 1 });
        endDate = endOfWeek(lastWeekStart, { weekStartsOn: 1 });
        break;
      case "thisMonth":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          startDate = startOfDay(new Date(customStartDate));
          endDate = endOfDay(new Date(customEndDate));
        } else {
          // Default to this week if custom dates not set
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
        }
        break;
      default:
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
    }

    return {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };
  }, [datePreset, customStartDate, customEndDate]);

  // Use monthly stats for monthly presets, weekly for weekly presets
  const isMonthlyPeriod = datePreset === "thisMonth" || datePreset === "lastMonth";
  const weeklyQuery = useWeeklyStats({
    deviceId,
    startDate: !isMonthlyPeriod ? dateRange.startDate : undefined,
    endDate: !isMonthlyPeriod ? dateRange.endDate : undefined,
  });
  const monthlyQuery = useMonthlyStats({
    deviceId,
    startDate: isMonthlyPeriod ? dateRange.startDate : undefined,
    endDate: isMonthlyPeriod ? dateRange.endDate : undefined,
  });
  
  const statsQuery = isMonthlyPeriod ? monthlyQuery : weeklyQuery;
  const settingsQuery = useDeviceSettings({ deviceId });
  const customCategoriesQuery = useCustomCategories({ deviceId });

  const currency = settingsQuery.data?.currency_code || "USD";
  const customCategories = customCategoriesQuery.data?.categories || [];

  const textPrimary = isDark ? "#fff" : "#1A1A1A";
  const textSecondary = isDark ? "rgba(255,255,255,0.7)" : "#4B5563";
  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";

  const dayBuckets = statsQuery.data?.day_buckets || [];
  
  // Normalize and aggregate category buckets to handle case variations
  const categoryBuckets = useMemo(() => {
    const buckets = statsQuery.data?.category_buckets || [];
    const aggregated = new Map();
    
    buckets.forEach((b) => {
      const normalized = normalizeCategory(b.category, customCategories);
      const existing = aggregated.get(normalized) || 0;
      aggregated.set(normalized, existing + b.total_cents);
    });
    
    // Convert back to array and sort by total descending
    return Array.from(aggregated.entries())
      .map(([category, total_cents]) => ({ category, total_cents }))
      .sort((a, b) => b.total_cents - a.total_cents);
  }, [statsQuery.data?.category_buckets, customCategories]);

  const maxDay = useMemo(() => {
    const values = dayBuckets.map((d) => d.total_cents || 0);
    return Math.max(1, ...values);
  }, [dayBuckets]);

  // Compute actionable insights
  const insights = useMemo(() => {
    const result = [];
    const data = statsQuery.data;

    // Budget warning (only if not shown in budget progress card prominently)
    if (
      data?.budget_cents > 0 &&
      data?.spending_percent_of_budget > 90
    ) {
      result.push({
        type: data.spending_percent_of_budget >= 100 ? "danger" : "warning",
        icon: AlertTriangle,
        message:
          data.spending_percent_of_budget >= 100
            ? "You've exceeded your budget!"
            : `You've used ${data.spending_percent_of_budget}% of your budget`,
      });
    }

    // High category spending insight
    if (categoryBuckets.length > 0) {
      const topCategory = categoryBuckets[0];
      const categoryPercent =
        (topCategory.total_cents / Math.max(1, data?.spent_cents || 1)) *
        100;
      if (categoryPercent > 40 && data?.spent_cents > 10000) {
        result.push({
          type: "info",
          icon: Target,
          message: `${topCategory.category} accounts for ${Math.round(
            categoryPercent,
          )}% of spending`,
        });
      }
    }

    return result;
  }, [statsQuery.data, categoryBuckets]);

  return (
    <ScreenLayout variant="analytics">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 120,
          paddingTop: 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontFamily: "Poppins_600SemiBold",
            fontSize: 28,
            color: textPrimary,
          }}
        >
          Analytics
        </Text>
        <Text
          style={{
            fontFamily: "Roboto_400Regular",
            fontSize: 14,
            color: textSecondary,
            marginTop: 2,
          }}
        >
          {datePreset === "custom" && customStartDate && customEndDate
            ? `${format(new Date(customStartDate), "MMM d")} - ${format(new Date(customEndDate), "MMM d")}`
            : DATE_PRESETS.find((p) => p.value === datePreset)?.label || "This week at a glance"}
        </Text>

        {/* Date Filter */}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginTop: 12,
            flexWrap: "wrap",
          }}
        >
          {DATE_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.value}
              onPress={() => {
                if (preset.value === "custom") {
                  setShowCustomModal(true);
                } else {
                  setDatePreset(preset.value);
                }
              }}
              activeOpacity={0.75}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor:
                  datePreset === preset.value
                    ? isDark
                      ? "rgba(255,255,255,0.15)"
                      : "#000"
                    : cardBg,
                borderWidth: 1,
                borderColor:
                  datePreset === preset.value
                    ? isDark
                      ? "rgba(255,255,255,0.20)"
                      : "rgba(0,0,0,0.10)"
                    : isDark
                      ? "rgba(255,255,255,0.10)"
                      : "rgba(0,0,0,0.06)",
              }}
            >
              <Text
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 12,
                  color:
                    datePreset === preset.value
                      ? isDark
                        ? "#fff"
                        : "#fff"
                      : textSecondary,
                }}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {statsQuery.isLoading ? (
          <Text
            style={{
              marginTop: 16,
              fontFamily: "Roboto_400Regular",
              color: textSecondary,
            }}
          >
            Loading…
          </Text>
        ) : statsQuery.error ? (
          <Text
            style={{
              marginTop: 16,
              fontFamily: "Roboto_400Regular",
              color: textSecondary,
            }}
          >
            Could not load analytics.
          </Text>
        ) : (statsQuery.data?.spent_cents || 0) === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Nothing to chart yet"
            description="Log a few expenses and you’ll see your week take shape here."
          />
        ) : (
          <>
            {/* Top numbers */}
            <View
              style={{
                marginTop: 18,
                flexDirection: "row",
                gap: 12,
              }}
            >
              {/* Expenses Card */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: cardBg,
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.08)",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Roboto_400Regular",
                    fontSize: 12,
                    color: textSecondary,
                  }}
                >
                  Total spent
                </Text>
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 24,
                    color: textPrimary,
                    marginTop: 6,
                  }}
                >
                  {formatMoney(statsQuery.data.spent_cents, currency)}
                </Text>
              </View>

              {/* Income Card */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: cardBg,
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.08)",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Roboto_400Regular",
                    fontSize: 12,
                    color: textSecondary,
                  }}
                >
                  Total income
                </Text>
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 24,
                    color: isDark ? "#4ADE80" : "#10B981",
                    marginTop: 6,
                  }}
                >
                  {formatMoney(statsQuery.data.income_cents || 0, currency)}
                </Text>
              </View>
            </View>

            {/* Budget Progress Card */}
            {statsQuery.data?.budget_cents > 0 && (
              <View
                style={{
                  marginTop: 12,
                  backgroundColor: cardBg,
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.08)",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Target size={18} color={textSecondary} />
                    <Text
                      style={{
                        fontFamily: "Roboto_400Regular",
                        fontSize: 12,
                        color: textSecondary,
                      }}
                    >
                      Budget Progress
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      fontSize: 16,
                      color: textPrimary,
                    }}
                  >
                    {statsQuery.data?.spending_percent_of_budget || 0}%
                  </Text>
                </View>

                {/* Progress Bar */}
                <View
                  style={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.06)",
                    overflow: "hidden",
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${Math.min(statsQuery.data?.spending_percent_of_budget || 0, 100)}%`,
                      backgroundColor:
                        (statsQuery.data?.spending_percent_of_budget || 0) > 100
                          ? isDark
                            ? "#F87171"
                            : "#EF4444"
                          : (statsQuery.data?.spending_percent_of_budget || 0) > 80
                            ? isDark
                              ? "#FBBF24"
                              : "#F59E0B"
                            : isDark
                              ? "#4ADE80"
                              : "#10B981",
                      borderRadius: 4,
                    }}
                  />
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Roboto_400Regular",
                      fontSize: 12,
                      color: textSecondary,
                    }}
                  >
                    Spent: {formatMoney(statsQuery.data?.spent_cents || 0, currency)}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Roboto_400Regular",
                      fontSize: 12,
                      color: textSecondary,
                    }}
                  >
                    Budget: {formatMoney(statsQuery.data?.budget_cents || 0, currency)}
                  </Text>
                </View>

                {statsQuery.data?.remaining_cents !== undefined && (
                  <Text
                    style={{
                      fontFamily: "Roboto_400Regular",
                      fontSize: 12,
                      color:
                        statsQuery.data.remaining_cents < 0
                          ? isDark
                            ? "#F87171"
                            : "#EF4444"
                          : textSecondary,
                      marginTop: 4,
                    }}
                  >
                    {statsQuery.data.remaining_cents < 0
                      ? `Over budget by ${formatMoney(Math.abs(statsQuery.data.remaining_cents), currency)}`
                      : `${formatMoney(statsQuery.data.remaining_cents, currency)} remaining`}
                  </Text>
                )}
              </View>
            )}

            {/* Recurring Projections */}
            {((isMonthlyPeriod && (statsQuery.data?.expected_monthly_expenses_cents > 0 || statsQuery.data?.expected_monthly_income_cents > 0)) ||
              (!isMonthlyPeriod && (statsQuery.data?.expected_weekly_expenses_cents > 0 || statsQuery.data?.expected_weekly_income_cents > 0))) && (
              <View
                style={{
                  marginTop: 12,
                  backgroundColor: cardBg,
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.08)",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 16,
                    color: textPrimary,
                    marginBottom: 12,
                  }}
                >
                  Expected Recurring
                </Text>

                {isMonthlyPeriod ? (
                  <>
                    {statsQuery.data?.expected_monthly_expenses_cents > 0 && (
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Roboto_400Regular",
                            fontSize: 13,
                            color: textSecondary,
                          }}
                        >
                          Monthly Expenses
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Roboto_400Regular",
                            fontSize: 13,
                            color: textPrimary,
                          }}
                        >
                          {formatMoney(
                            statsQuery.data.expected_monthly_expenses_cents,
                            currency,
                          )}
                        </Text>
                      </View>
                    )}
                    {statsQuery.data?.expected_monthly_income_cents > 0 && (
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Roboto_400Regular",
                            fontSize: 13,
                            color: textSecondary,
                          }}
                        >
                          Monthly Income
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Roboto_400Regular",
                            fontSize: 13,
                            color: isDark ? "#4ADE80" : "#10B981",
                          }}
                        >
                          {formatMoney(
                            statsQuery.data.expected_monthly_income_cents,
                            currency,
                          )}
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    {statsQuery.data?.expected_weekly_expenses_cents > 0 && (
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Roboto_400Regular",
                            fontSize: 13,
                            color: textSecondary,
                          }}
                        >
                          Weekly Expenses
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Roboto_400Regular",
                            fontSize: 13,
                            color: textPrimary,
                          }}
                        >
                          {formatMoney(
                            statsQuery.data.expected_weekly_expenses_cents,
                            currency,
                          )}
                        </Text>
                      </View>
                    )}
                    {statsQuery.data?.expected_weekly_income_cents > 0 && (
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Roboto_400Regular",
                            fontSize: 13,
                            color: textSecondary,
                          }}
                        >
                          Weekly Income
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Roboto_400Regular",
                            fontSize: 13,
                            color: isDark ? "#4ADE80" : "#10B981",
                          }}
                        >
                          {formatMoney(
                            statsQuery.data.expected_weekly_income_cents,
                            currency,
                          )}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Spending Pace / Forecasting */}
            {statsQuery.data?.projected_spending_cents !== undefined &&
              statsQuery.data?.days_elapsed > 0 && (
                <View
                  style={{
                    marginTop: 12,
                    backgroundColor: cardBg,
                    borderRadius: 20,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: isDark
                      ? "rgba(255,255,255,0.10)"
                      : "rgba(0,0,0,0.08)",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    <TrendingUp size={18} color={textSecondary} />
                    <Text
                      style={{
                        fontFamily: "Poppins_600SemiBold",
                        fontSize: 16,
                        color: textPrimary,
                      }}
                    >
                      Spending Pace
                    </Text>
                  </View>

                  <Text
                    style={{
                      fontFamily: "Roboto_400Regular",
                      fontSize: 13,
                      color: textSecondary,
                      marginBottom: 8,
                    }}
                  >
                    At this rate, you'll spend{" "}
                    <Text
                      style={{
                        fontFamily: "Poppins_600SemiBold",
                        color: textPrimary,
                      }}
                    >
                      {formatMoney(statsQuery.data.projected_spending_cents, currency)}
                    </Text>{" "}
                    {isMonthlyPeriod ? "this month" : "this week"}
                  </Text>

                  {statsQuery.data?.budget_cents > 0 && (
                    <View
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderTopColor: isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.06)",
                      }}
                    >
                      {statsQuery.data.projected_spending_cents >
                        statsQuery.data.budget_cents ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <AlertTriangle
                            size={16}
                            color={isDark ? "#F87171" : "#EF4444"}
                          />
                          <Text
                            style={{
                              fontFamily: "Roboto_400Regular",
                              fontSize: 12,
                              color: isDark ? "#F87171" : "#EF4444",
                            }}
                          >
                            Projected to exceed budget by{" "}
                            {formatMoney(
                              statsQuery.data.projected_spending_cents -
                                statsQuery.data.budget_cents,
                              currency,
                            )}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={{
                            fontFamily: "Roboto_400Regular",
                            fontSize: 12,
                            color: isDark ? "#4ADE80" : "#10B981",
                          }}
                        >
                          ✓ On track to stay within budget
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}

            {/* Net Balance & Spending % */}
            {(statsQuery.data?.income_cents > 0 || statsQuery.data?.net_balance_cents !== 0) && (
              <View
                style={{
                  marginTop: 12,
                  backgroundColor: cardBg,
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.08)",
                }}
              >
                {statsQuery.data?.net_balance_cents !== 0 && (
                  <View style={{ marginBottom: statsQuery.data?.spending_percent_of_income !== null ? 12 : 0 }}>
                    <Text
                      style={{
                        fontFamily: "Roboto_400Regular",
                        fontSize: 12,
                        color: textSecondary,
                      }}
                    >
                      Net balance
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Poppins_600SemiBold",
                        fontSize: 20,
                        color: (statsQuery.data?.net_balance_cents || 0) >= 0
                          ? (isDark ? "#4ADE80" : "#10B981")
                          : (isDark ? "#F87171" : "#EF4444"),
                        marginTop: 4,
                      }}
                    >
                      {(statsQuery.data?.net_balance_cents || 0) >= 0 ? "+" : ""}
                      {formatMoney(statsQuery.data?.net_balance_cents || 0, currency)}
                    </Text>
                  </View>
                )}
                {statsQuery.data?.spending_percent_of_income !== null && statsQuery.data?.income_cents > 0 && (
                  <View>
                    <Text
                      style={{
                        fontFamily: "Roboto_400Regular",
                        fontSize: 12,
                        color: textSecondary,
                      }}
                    >
                      Spending as % of income
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Poppins_600SemiBold",
                        fontSize: 20,
                        color: textPrimary,
                        marginTop: 4,
                      }}
                    >
                      {statsQuery.data?.spending_percent_of_income || 0}%
                    </Text>
                  </View>
                )}
                <Text
                  style={{
                    fontFamily: "Roboto_400Regular",
                    fontSize: 11,
                    color: textSecondary,
                    marginTop: 8,
                  }}
                >
                  Period: {statsQuery.data.week_start?.slice(0, 10) || statsQuery.data.month_start?.slice(0, 10)} →{" "}
                  {statsQuery.data.week_end?.slice(0, 10) || statsQuery.data.month_end?.slice(0, 10)}
                </Text>
              </View>
            )}

            {/* Day bars */}
            <View
              style={{
                marginTop: 16,
                backgroundColor: cardBg,
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: isDark
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(0,0,0,0.08)",
              }}
            >
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 16,
                  color: textPrimary,
                  marginBottom: 12,
                }}
              >
                Daily breakdown
              </Text>
              {dayBuckets.length > 14 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  contentContainerStyle={{
                    paddingRight: 8,
                  }}
                  style={{
                    // Subtle scrollbar styling
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-end",
                      height: 120,
                      gap: 8,
                    }}
                  >
                    {dayBuckets.map((d) => {
                      const height = Math.round(
                        ((d.total_cents || 0) / maxDay) * 100,
                      );
                      // Extract day number from date string (YYYY-MM-DD format)
                      const dayNumber = d.day ? parseInt(d.day.split('-')[2], 10) : '';
                      return (
                        <View 
                          key={d.day} 
                          style={{ 
                            width: 28,
                            alignItems: "center" 
                          }}
                        >
                          <View
                            style={{
                              width: "100%",
                              height: Math.max(6, height),
                              borderRadius: 10,
                              backgroundColor: isDark ? "#BFD4FF" : "#6366F1",
                              opacity: isDark ? 0.9 : 0.85,
                            }}
                          />
                          <Text
                            style={{
                              marginTop: 8,
                              fontFamily: "Roboto_400Regular",
                              fontSize: 11,
                              color: textSecondary,
                            }}
                            numberOfLines={1}
                          >
                            {dayNumber}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              ) : (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-end",
                    height: 120,
                    gap: 8,
                  }}
                >
                  {dayBuckets.map((d) => {
                    const height = Math.round(
                      ((d.total_cents || 0) / maxDay) * 100,
                    );
                    const label = d.label || "";
                    return (
                      <View 
                        key={d.day} 
                        style={{ 
                          flex: 1,
                          alignItems: "center" 
                        }}
                      >
                        <View
                          style={{
                            width: "100%",
                            height: Math.max(6, height),
                            borderRadius: 10,
                            backgroundColor: isDark ? "#BFD4FF" : "#6366F1",
                            opacity: isDark ? 0.9 : 0.85,
                          }}
                        />
                        <Text
                          style={{
                            marginTop: 8,
                            fontFamily: "Roboto_400Regular",
                            fontSize: 11,
                            color: textSecondary,
                          }}
                          numberOfLines={1}
                        >
                          {label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Actionable Insights */}
            {insights.length > 0 && (
              <View
                style={{
                  marginTop: 12,
                  backgroundColor: cardBg,
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.08)",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 16,
                    color: textPrimary,
                    marginBottom: 12,
                  }}
                >
                  Insights
                </Text>

                {insights.map((insight, idx, arr) => {
                  const IconComponent = insight.icon;
                  const isWarning =
                    insight.type === "warning" || insight.type === "danger";
                  return (
                    <View
                      key={idx}
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: 10,
                        marginBottom: idx < arr.length - 1 ? 10 : 0,
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: isWarning
                          ? isDark
                            ? "rgba(248,113,113,0.15)"
                            : "rgba(239,68,68,0.08)"
                          : isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(0,0,0,0.03)",
                      }}
                    >
                      <IconComponent
                        size={18}
                        color={
                          isWarning
                            ? isDark
                              ? "#F87171"
                              : "#EF4444"
                            : textSecondary
                        }
                        style={{ marginTop: 2 }}
                      />
                      <Text
                        style={{
                          flex: 1,
                          fontFamily: "Roboto_400Regular",
                          fontSize: 13,
                          color: isWarning
                            ? isDark
                              ? "#F87171"
                              : "#EF4444"
                            : textPrimary,
                        }}
                      >
                        {insight.message}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Categories */}
            <View
              style={{
                marginTop: 16,
                backgroundColor: cardBg,
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: isDark
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(0,0,0,0.08)",
              }}
            >
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 16,
                  color: textPrimary,
                  marginBottom: 12,
                }}
              >
                Categories
              </Text>
              {categoryBuckets.length === 0 ? (
                <Text
                  style={{
                    fontFamily: "Roboto_400Regular",
                    color: textSecondary,
                  }}
                >
                  No category data yet.
                </Text>
              ) : (
                categoryBuckets.map((c) => (
                  <View key={c.category} style={{ marginBottom: 10 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Roboto_400Regular",
                          fontSize: 13,
                          color: textPrimary,
                        }}
                      >
                        {c.category}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Roboto_400Regular",
                          fontSize: 13,
                          color: textSecondary,
                        }}
                      >
                        {formatMoney(c.total_cents, currency)}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 10,
                        borderRadius: 999,
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.06)",
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          height: 10,
                          width: `${Math.round((c.total_cents / Math.max(1, statsQuery.data.spent_cents)) * 100)}%`,
                          borderRadius: 999,
                          backgroundColor: isDark ? "#CBFACF" : "#6366F1",
                        }}
                      />
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* Custom Date Range Modal */}
        <Modal
          visible={showCustomModal}
          animationType="slide"
          transparent
          presentationStyle="overFullScreen"
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.55)",
              justifyContent: "flex-end",
            }}
          >
            <View
              style={{
                  backgroundColor: isDark ? "#121212" : "#FFFFFF",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 20,
                paddingBottom: 40,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 18,
                    color: textPrimary,
                  }}
                >
                  Custom Date Range
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCustomModal(false)}
                  hitSlop={10}
                >
                  <X size={22} color={textPrimary} />
                </TouchableOpacity>
              </View>

              <Text
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 12,
                  color: textSecondary,
                  marginBottom: 6,
                }}
              >
                Start Date (YYYY-MM-DD)
              </Text>
              <TextInput
                value={customStartDate}
                onChangeText={setCustomStartDate}
                placeholder="2024-01-01"
                placeholderTextColor={isDark ? "rgba(255,255,255,0.35)" : "#9CA3AF"}
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 16,
                  color: textPrimary,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 18,
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.06)",
                  marginBottom: 14,
                }}
              />

              <Text
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 12,
                  color: textSecondary,
                  marginBottom: 6,
                }}
              >
                End Date (YYYY-MM-DD)
              </Text>
              <TextInput
                value={customEndDate}
                onChangeText={setCustomEndDate}
                placeholder="2024-01-31"
                placeholderTextColor={isDark ? "rgba(255,255,255,0.35)" : "#9CA3AF"}
                style={{
                  fontFamily: "Roboto_400Regular",
                  fontSize: 16,
                  color: textPrimary,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 18,
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.06)",
                  marginBottom: 20,
                }}
              />

              <TouchableOpacity
                onPress={() => {
                  if (customStartDate && customEndDate) {
                    setDatePreset("custom");
                    setShowCustomModal(false);
                  }
                }}
                activeOpacity={0.9}
                style={{
                  paddingVertical: 16,
                  borderRadius: 20,
                  backgroundColor: isDark ? "#FFFFFF" : "#1F2937",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: !customStartDate || !customEndDate ? 0.6 : 1,
                }}
                disabled={!customStartDate || !customEndDate}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 16,
                    color: isDark ? "#000" : "#fff",
                  }}
                >
                  Apply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </ScreenLayout>
  );
}
