import sql from "../../utils/sql.js";
import { requireUserId } from "../../utils/user.js";

export async function GET(request) {
  const { userId, error } = await requireUserId(request);
  if (error) return error;

  // Fetch all expenses for this user
  const items = await sql(
    "SELECT id, amount_cents, vendor, category, note, occurred_at, created_at FROM public.expenses WHERE user_id = $1 ORDER BY occurred_at DESC, id DESC",
    [userId],
  );

  // Convert to CSV format
  const csvRows = [];
  
  // CSV Header
  csvRows.push("Date,Amount,Vendor,Category,Note");

  // CSV Data rows
  items.forEach((item) => {
    const date = item.occurred_at instanceof Date 
      ? item.occurred_at.toISOString().split('T')[0] 
      : (item.occurred_at ? new Date(item.occurred_at).toISOString().split('T')[0] : '');
    
    const amount = item.amount_cents ? (item.amount_cents / 100).toFixed(2) : '0.00';
    const vendor = item.vendor ? `"${String(item.vendor).replace(/"/g, '""')}"` : '';
    const category = item.category ? `"${String(item.category).replace(/"/g, '""')}"` : '';
    const note = item.note ? `"${String(item.note).replace(/"/g, '""')}"` : '';
    
    csvRows.push(`${date},${amount},${vendor},${category},${note}`);
  });

  const csvContent = csvRows.join('\n');

  // Return CSV file
  return new Response(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="expenses_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
