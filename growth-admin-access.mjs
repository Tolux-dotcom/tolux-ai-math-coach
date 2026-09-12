export const GROWTH_ACCESS_PATH = '/api/admin/growth-access';

export async function resolveGrowthAccess(user, getAdminStatus) {
  if (!user?.id) {
    return { status: 401, body: { error: 'Please sign in.' } };
  }

  let adminStatus;
  try {
    adminStatus = await getAdminStatus(user.id);
  } catch {
    return {
      status: 503,
      body: { error: 'Authorization is temporarily unavailable.' }
    };
  }

  if (adminStatus?.authorized) {
    return { status: 200, body: { authorized: true } };
  }

  if (adminStatus?.lookupError) {
    return {
      status: 503,
      body: { error: 'Authorization is temporarily unavailable.' }
    };
  }

  return { status: 404, body: { error: 'Not found.' } };
}
