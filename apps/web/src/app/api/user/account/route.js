import { getUserIdFromRequest } from '@/app/api/utils/user';
import sql from '@/app/api/utils/sql';

/**
 * DELETE /api/user/account - Delete user account and all associated data
 */
export async function DELETE(request) {
  const { userId, error } = await getUserIdFromRequest(request);
  
  if (error) return error;
  if (!userId) {
    return Response.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    // Delete all user data in correct order to respect foreign key constraints
    // 1. Delete expenses (and related vendor_category_map entries will be handled or orphaned)
    await sql('DELETE FROM public.expenses WHERE user_id = $1', [userId]);
    
    // 2. Delete vendor category mappings
    await sql('DELETE FROM public.vendor_category_map WHERE user_id = $1', [userId]);
    
    // 3. Delete custom categories
    await sql('DELETE FROM public.custom_categories WHERE user_id = $1', [userId]);
    
    // 4. Delete usage tracking
    await sql('DELETE FROM public.voice_usage WHERE user_id = $1', [userId]);
    await sql('DELETE FROM public.scan_usage WHERE user_id = $1', [userId]);
    
    // 5. Delete user settings
    await sql('DELETE FROM public.device_settings WHERE user_id = $1', [userId]);
    
    // 6. Delete sessions
    await sql('DELETE FROM auth_sessions WHERE "userId" = $1', [userId]);
    
    // 7. Delete accounts
    await sql('DELETE FROM auth_accounts WHERE "userId" = $1', [userId]);
    
    // 8. Delete user (this will cascade if there are any other foreign keys)
    await sql('DELETE FROM auth_users WHERE id = $1', [userId]);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return Response.json(
      { error: 'An error occurred while deleting account' },
      { status: 500 }
    );
  }
}
