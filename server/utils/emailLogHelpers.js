function normalizeMaterialIds(materialIds) {
  if (!Array.isArray(materialIds)) return [];
  return materialIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

export function createEmailLogEntry({
  templateId = null,
  recipientEmail,
  guardianId = null,
  subject = null,
  status,
  messageId = null,
  errorMessage = null,
  materialIds = [],
  notes = null,
}) {
  const normalizedMaterialIds = normalizeMaterialIds(materialIds);

  return {
    template_id: templateId,
    recipient_email: recipientEmail,
    guardian_id: guardianId,
    subject,
    provider_message_id: messageId || null,
    material_ids: normalizedMaterialIds.length > 0 ? JSON.stringify(normalizedMaterialIds) : null,
    material_ids_json: normalizedMaterialIds.length > 0 ? normalizedMaterialIds : null,
    materials_count: normalizedMaterialIds.length,
    status,
    error_message: errorMessage || null,
    sent_date: new Date().toISOString(),
    notes,
  };
}