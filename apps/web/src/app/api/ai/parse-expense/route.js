import sql from "@/app/api/utils/sql";
import { ensureDeviceSettings, requireDeviceId } from "@/app/api/utils/device";
import normalizeVendor from "@/app/api/utils/normalizeVendor";

// Removed getBaseUrlFromRequest - no longer needed for direct OpenAI API calls

export async function POST(request) {
  const { deviceId, error } = requireDeviceId(request);
  if (error) return error;

  await ensureDeviceSettings(deviceId);

  const body = await request.json().catch(() => ({}));
  const text = body.text ? String(body.text) : "";

  if (!text.trim()) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  const vendorRows = await sql(
    "SELECT vendor_key, category FROM public.vendor_category_map WHERE device_id = $1 ORDER BY updated_at DESC LIMIT 50",
    [deviceId],
  );

  const knownRules = vendorRows
    .map((r) => `${r.vendor_key} -> ${r.category}`)
    .join("\n");

  // Check for OpenAI API key
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return Response.json(
      { error: "OpenAI API key not configured" },
      { status: 500 },
    );
  }

  const json_schema = {
    name: "expense_parse_v1",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["amount_cents", "category", "type"],
      properties: {
        amount_cents: { type: ["integer", "null"] },
        vendor: { type: ["string", "null"] },
        category: { type: ["string", "null"] },
        note: { type: ["string", "null"] },
        occurred_at: { type: ["string", "null"] },
        type: { type: ["string", "null"], enum: ["expense", "income", null] },
        is_recurring: { type: ["boolean", "null"] },
        recurrence_frequency: { type: ["string", "null"], enum: ["weekly", "biweekly", "monthly", "quarterly", "annually", null] },
      },
    },
  };

  const systemPrompt =
    "You are a receipt-style parser for an expense tracker that handles both expenses and income.\n" +
    "- Return ONLY valid JSON that matches the provided JSON schema.\n" +
    "- CRITICAL: Your JSON response MUST include ALL properties from the schema: amount_cents, vendor, category, note, occurred_at, type, is_recurring, recurrence_frequency. If a value is not available, set it to null (but still include the field).\n" +
    '- Convert amounts to amount_cents (integer cents). Example: "$12" => 1200.\n' +
    "- type must be 'expense' or 'income'. Use 'expense' for money spent (purchases, bills, etc.) and 'income' for money received (salary, freelance, gifts received, refunds, etc.).\n" +
    "- vendor should be the merchant/employer/source if present (e.g. Sweetgreen, Employer Name, Company Name, etc.). If no vendor is mentioned, set vendor to null (but you MUST still include the vendor field in your JSON).\n" +
    "- For EXPENSE entries, category must be one of: Food & Dining, Transportation, Shopping, Bills & Utilities, Entertainment, Health & Fitness, Travel, Subscriptions, Personal Care, Education, Gifts & Donations, Other.\n" +
    "- For INCOME entries, category must be one of: Salary/Wages, Freelance/Gig, Investment/Dividends, Rental Income, Business Income, Gift Received, Refund, Side Hustle, Other.\n" +
    "- EXPENSE CATEGORIZATION RULES (follow these strictly for expenses):\n" +
    "  * Streaming services (Netflix, Spotify, Hulu, Disney+, Apple Music, YouTube Premium, etc.) → Subscriptions\n" +
    "  * Restaurants, cafes, fast food, food delivery (Uber Eats, DoorDash, etc.) → Food & Dining\n" +
    "  * Grocery stores, supermarkets → Food & Dining\n" +
    "  * Gas stations, Uber, Lyft, taxis, public transit, parking → Transportation\n" +
    "  * Clothing stores, electronics, general retail shopping → Shopping\n" +
    "  * Rent, utilities (electric, water, gas), phone bills, internet, insurance → Bills & Utilities\n" +
    "  * Movies, concerts, games, events, tickets → Entertainment\n" +
    "  * Gym, fitness, pharmacy, medical, doctor visits → Health & Fitness\n" +
    "  * Hotels, flights, travel bookings, vacation expenses → Travel\n" +
    "  * Software subscriptions, SaaS, recurring services, memberships → Subscriptions\n" +
    "  * Haircuts, spa, beauty products, personal hygiene → Personal Care\n" +
    "  * Schools, courses, books, educational materials → Education\n" +
    "  * Gifts, donations, charity → Gifts & Donations\n" +
    "- INCOME CATEGORIZATION RULES (follow these strictly for income):\n" +
    "  * Salary, wages, regular employment income → Salary/Wages\n" +
    "  * Freelance work, gig work, contract work → Freelance/Gig\n" +
    "  * Stock dividends, interest, investment returns → Investment/Dividends\n" +
    "  * Rental property income → Rental Income\n" +
    "  * Business revenue, sales → Business Income\n" +
    "  * Gifts received, birthday money, etc. → Gift Received\n" +
    "  * Refunds, returns, reimbursements → Refund\n" +
    "  * Side hustles, part-time income → Side Hustle\n" +
    "- note is optional; keep it short.\n" +
    "- occurred_at can be null unless the user explicitly said a time/date.\n" +
    "- RECURRING TRANSACTION INFERENCE (set is_recurring and recurrence_frequency based on context):\n" +
    "  * ALWAYS set is_recurring=true for: rent, mortgage, lease payments, subscriptions, memberships, salary/paychecks, insurance, utilities, phone bills, internet bills, streaming services\n" +
    "  * ALWAYS set is_recurring=true when the user says phrases like: 'every month', 'every week', 'every year', 'monthly', 'weekly', 'annually', 'each month', 'each week', 'per month', 'per week', 'every single month', 'every single week', etc.\n" +
    "  * ALWAYS set is_recurring=true for income entries where the user mentions a frequency (e.g., 'earning $X every month', 'getting $X monthly', 'receiving $X each week', 'making $X per month')\n" +
    "  * RECURRING FREQUENCY RULES:\n" +
    "    - Rent, mortgage, lease → 'monthly'\n" +
    "    - Subscriptions (Netflix, Spotify, gym, etc.) → 'monthly'\n" +
    "    - Salary/paycheck → 'biweekly' or 'monthly' (use 'monthly' if frequency unclear)\n" +
    "    - Freelance income, freelance work → 'monthly' if user says 'every month' or 'monthly', otherwise infer from context\n" +
    "    - Insurance → 'monthly', 'quarterly', or 'annually' (use 'monthly' if frequency unclear)\n" +
    "    - Utilities (electric, water, gas), phone bills, internet → 'monthly'\n" +
    "    - Property taxes → 'quarterly' or 'annually'\n" +
    "    - If user says 'every month' or 'monthly' or 'each month' or 'per month' → 'monthly'\n" +
    "    - If user says 'every week' or 'weekly' or 'each week' or 'per week' → 'weekly'\n" +
    "    - If user says 'every year' or 'annually' or 'each year' or 'per year' → 'annually'\n" +
    "    - If user says 'every two weeks' or 'biweekly' or 'bi-weekly' → 'biweekly'\n" +
    "    - If user says 'every quarter' or 'quarterly' or 'each quarter' → 'quarterly'\n" +
    "  * Set is_recurring=false for: one-time purchases, groceries, restaurants, gas/fuel, shopping, entertainment, travel, gifts, etc.\n" +
    "  * If the user explicitly says 'recurring', 'monthly', 'weekly', 'every month', 'every week', etc., ALWAYS set is_recurring=true and use the indicated frequency\n" +
    "  * If unsure whether something is recurring, default to is_recurring=false\n" +
    (knownRules
      ? `\nKNOWN VENDOR RULES (ALWAYS use these if vendor matches - override default categorization):\n${knownRules}\n`
      : "");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      response_format: {
        type: "json_schema",
        json_schema: json_schema,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return Response.json(
      {
        error: `ChatGPT request failed: ${res.status} ${res.statusText}`,
        details: errText,
      },
      { status: 502 },
    );
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error("Could not parse model JSON:", content);
    return Response.json(
      { error: "Model returned invalid JSON" },
      { status: 502 },
    );
  }

  // Post-process: apply learned vendor->category mapping deterministically
  const normalizedVendor = normalizeVendor(parsed.vendor);
  if (normalizedVendor) {
    const rows = await sql(
      "SELECT category FROM public.vendor_category_map WHERE device_id = $1 AND vendor_key = $2 LIMIT 1",
      [deviceId, normalizedVendor],
    );
    if (rows[0]?.category) {
      parsed.category = rows[0].category;
    }
  }

  // Provide defaults
  if (!parsed.occurred_at) {
    parsed.occurred_at = new Date().toISOString();
  }
  if (!parsed.type || (parsed.type !== 'expense' && parsed.type !== 'income')) {
    parsed.type = 'expense'; // Default to expense for backward compatibility
  }
  if (parsed.is_recurring === undefined || parsed.is_recurring === null) {
    parsed.is_recurring = false;
  }
  // If is_recurring is true but no frequency provided, default to monthly
  if (parsed.is_recurring === true && !parsed.recurrence_frequency) {
    parsed.recurrence_frequency = 'monthly';
  }
  // If is_recurring is false, ensure frequency is null
  if (parsed.is_recurring === false) {
    parsed.recurrence_frequency = null;
  }

  return Response.json(parsed);
}
