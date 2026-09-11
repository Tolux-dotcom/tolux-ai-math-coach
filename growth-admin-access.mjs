export const GROWTH_ACCESS_PATH = '/api/admin/growth-access';

export async function resolveGrowthAccess(user, getAdminStatus) {
  if (!user?.id) {
    return { status: 401, body: { error: 'Please sign in.' } };
  }

  const adminStatus = await getAdminStatus(user.id);
  if (!adminStatus?.authorized) {
    return { status: 404, body: { error: 'Not found.' } };
  }

  return { status: 200, body: { authorized: true } };
}
