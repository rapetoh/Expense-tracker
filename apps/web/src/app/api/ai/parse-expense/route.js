import sql from "@/app/api/utils/sql";
import { requireUserId, ensureUserSettings } from "@/app/api/utils/user";
import normalizeVendor from "@/app/api/utils/normalizeVendor";

// Removed getBaseUrlFromRequest - no longer needed for direct OpenAI API calls

export async function POST(request) {
  const { userId, error } = await requireUserId(request);
  if (error) return error;

  await ensureUserSettings(userId);

  const body = await request.json().catch(() => ({}));
  const text = body.text ? String(body.text) : "";

  if (!text.trim()) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  const vendorRows = await sql(
    "SELECT vendor_key, category FROM public.vendor_category_map WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 50",
    [userId],
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
    "You are an expense parser for a personal finance app. Parse the user's voice/text input and extract expense or income information.\n" +
    "- Return ONLY valid JSON that matches the provided JSON schema.\n" +
    "- CRITICAL: Your JSON response MUST include ALL properties from the schema: amount_cents, vendor, category, note, occurred_at, type, is_recurring, recurrence_frequency. If a value is not available, set it to null (but still include the field).\n" +
    '- Convert amounts to amount_cents (integer cents). Example: "$12.50" => 1250, "$100" => 10000, "five dollars" => 500.\n' +
    "- type must be 'expense' or 'income'. Most entries are 'expense'. Only set to 'income' if explicitly mentioned (e.g., 'got paid', 'salary', 'refund').\n" +
    "- Extract the vendor/merchant name if mentioned (e.g., 'Walmart', 'Starbucks', 'CVS Pharmacy'). If no vendor can be extracted, set vendor to null (but you MUST still include the vendor field in your JSON).\n" +
    "- category must be one of: Food & Dining, Transportation, Shopping, Bills & Utilities, Entertainment, Health & Fitness, Travel, Subscriptions, Personal Care, Education, Gifts & Donations, Other.\n" +
    "- For income entries, category can be 'Other' or a relevant category if applicable.\n" +
    "- If the user mentions a date or time, extract it and format as ISO 8601 string. If no date mentioned, set occurred_at to null (the app will default to now).\n" +
    "- If the user mentions recurring (e.g., 'monthly', 'every week', 'subscription'), set is_recurring to true and set recurrence_frequency appropriately. Otherwise set is_recurring to false and recurrence_frequency to null.\n" +
    "- recurrence_frequency must be one of: 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually', or null.\n" +
    "- Extract any additional notes/descriptions the user provides.\n" +
    `\nKnown vendor->category mappings (use these when vendor matches):\n${knownRules}\n` +
    `\nUser input: "${text}"\n`;

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
      "SELECT category FROM public.vendor_category_map WHERE user_id = $1 AND vendor_key = $2 LIMIT 1",
      [userId, normalizedVendor],
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
