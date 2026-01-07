import { requireUserId } from "../../utils/user.js";

export async function POST(request) {
  const { userId, error } = await requireUserId(request);
  if (error) return error;

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return Response.json(
      { error: "OpenAI API key not configured" },
      { status: 500 },
    );
  }

  try {
    // Handle multipart/form-data from React Native
    const contentType = request.headers.get("content-type") || "";
    let arrayBuffer;
    let mimeType = "image/jpeg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const imageFile = formData.get("image");

      if (!imageFile) {
        return Response.json({ error: "Image file is required" }, { status: 400 });
      }

      // Handle both File (web) and Blob (React Native)
      if (imageFile instanceof File) {
        arrayBuffer = await imageFile.arrayBuffer();
        mimeType = imageFile.type || "image/jpeg";
      } else if (imageFile instanceof Blob) {
        arrayBuffer = await imageFile.arrayBuffer();
        mimeType = imageFile.type || "image/jpeg";
      } else {
        // React Native may send as object with uri, read it
        return Response.json(
          { error: "Unsupported image format. Please use a file or blob." },
          { status: 400 }
        );
      }
    } else {
      // Handle direct image upload (fallback)
      arrayBuffer = await request.arrayBuffer();
      mimeType = contentType.includes("image/") 
        ? contentType 
        : "image/jpeg";
    }

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return Response.json({ error: "Empty image file" }, { status: 400 });
    }

    // Convert to base64
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const json_schema = {
      name: "receipt_parse_v1",
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
      "You are a receipt OCR and parser for an expense tracker. Analyze the receipt/image and extract expense or income information.\n" +
      "- Return ONLY valid JSON that matches the provided JSON schema.\n" +
      "- CRITICAL: Your JSON response MUST include ALL properties from the schema: amount_cents, vendor, category, note, occurred_at, type, is_recurring, recurrence_frequency. If a value is not available, set it to null (but still include the field).\n" +
      '- Convert amounts to amount_cents (integer cents). Example: "$12.50" => 1250, "$100" => 10000.\n' +
      "- type must be 'expense' or 'income'. Receipts/bills are typically 'expense'. Pay stubs, refund confirmations, or deposit slips would be 'income'.\n" +
      "- Extract the vendor/merchant/employer name from the document (e.g., 'Walmart', 'Starbucks', 'CVS Pharmacy', 'Company Name'). If no vendor can be extracted, set vendor to null (but you MUST still include the vendor field in your JSON).\n" +
      "- category must be one of: Food & Dining, Transportation, Shopping, Bills & Utilities, Entertainment, Health & Fitness, Travel, Subscriptions, Personal Care, Education, Gifts & Donations, Other.\n" +
      "- For income entries, category can be 'Other' or a relevant category if applicable.\n" +
      "- CATEGORIZATION RULES (follow these strictly):\n" +
      "  * Grocery stores, supermarkets, convenience stores → Food & Dining\n" +
      "  * Restaurants, cafes, fast food, food delivery → Food & Dining\n" +
      "  * Gas stations, fuel, parking, tolls → Transportation\n" +
      "  * Clothing stores, electronics, general retail shopping → Shopping\n" +
      "  * Utilities, phone bills, internet, insurance → Bills & Utilities\n" +
      "  * Movies, concerts, games, events → Entertainment\n" +
      "  * Pharmacy, medical, doctor visits, gym → Health & Fitness\n" +
      "  * Hotels, flights, travel bookings → Travel\n" +
      "  * Software subscriptions, memberships → Subscriptions\n" +
      "  * Haircuts, spa, beauty products → Personal Care\n" +
      "  * Schools, courses, books → Education\n" +
      "  * Gifts, donations, charity → Gifts & Donations\n" +
      "- Extract the date from the receipt if visible, otherwise use null.\n" +
      "- note: Extract any relevant notes from the receipt (optional, keep it short).\n" +
      "- RECURRING TRANSACTION INFERENCE (set is_recurring and recurrence_frequency based on receipt context):\n" +
      "  * Set is_recurring=true for: subscription receipts, membership renewals, rent/mortgage statements, utility bills, insurance bills, phone/internet bills, pay stubs\n" +
      "  * ALWAYS set is_recurring=true when receipt shows phrases like: 'every month', 'monthly', 'weekly', 'annually', 'recurring', 'subscription', 'billing cycle', etc.\n" +
      "  * RECURRING FREQUENCY RULES:\n" +
      "    - Rent, mortgage statements → 'monthly'\n" +
      "    - Subscription receipts (Netflix, gym, etc.) → 'monthly'\n" +
      "    - Pay stubs → 'biweekly' or 'monthly' (look for pay period indicators)\n" +
      "    - Insurance bills → 'monthly', 'quarterly', or 'annually' (check bill frequency)\n" +
      "    - Utility bills, phone/internet bills → 'monthly'\n" +
      "    - If receipt shows 'monthly', 'every month', 'per month' → 'monthly'\n" +
      "    - If receipt shows 'weekly', 'every week', 'per week' → 'weekly'\n" +
      "    - If receipt shows 'annually', 'every year', 'per year' → 'annually'\n" +
      "    - If receipt shows 'biweekly', 'every two weeks' → 'biweekly'\n" +
      "    - If receipt shows 'quarterly', 'every quarter' → 'quarterly'\n" +
      "  * Set is_recurring=false for: store receipts, restaurant receipts, gas receipts, shopping receipts, one-time purchases\n" +
      "  * If the receipt shows billing cycle information (e.g., 'Monthly Subscription', 'Quarterly Payment', 'Recurring'), use that frequency and set is_recurring=true\n" +
      "  * If unsure whether something is recurring, default to is_recurring=false\n" +
      "- If you cannot clearly identify the amount or vendor from the receipt, return null for those fields.";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o", // Use gpt-4o for vision capability
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract expense information from this receipt image. Return the amount in cents, vendor name, category, note, and date if visible.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: json_schema,
        },
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("OpenAI Vision API error:", errText);
      return Response.json(
        {
          error: `Receipt scan failed: ${res.status} ${res.statusText}`,
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
        { error: "Could not parse receipt data" },
        { status: 502 },
      );
    }

    // Provide defaults
    if (!parsed.occurred_at) {
      parsed.occurred_at = new Date().toISOString();
    }
    if (!parsed.type || (parsed.type !== 'expense' && parsed.type !== 'income')) {
      parsed.type = 'expense'; // Receipts are typically expenses
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
  } catch (error) {
    console.error("Receipt scan error:", error);
    return Response.json(
      { error: "Failed to process receipt image" },
      { status: 500 },
    );
  }
}

