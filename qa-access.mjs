export function isPreviewQaUser(user, environment = process.env) {
  return Boolean(
    environment.VERCEL_ENV === "preview" &&
    user?.id &&
    user.app_metadata?.internal_qa === true
  );
}
