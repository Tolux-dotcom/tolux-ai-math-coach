const FREE_DIAGNOSTIC_ITEM_IDS = new Set(["A5A-D01", "A5A-D02"]);

export function getFreeDiagnosticAccess(itemId) {
  if (!FREE_DIAGNOSTIC_ITEM_IDS.has(String(itemId || ""))) {
    return null;
  }

  return {
    allowed: true,
    isSubscriber: false,
    qaMode: false,
    isFreeDiagnostic: true
  };
}
