export const mapChildToPrintableData = (child) => {
  const primaryGuardian = child?.child_guardian?.find((cg) => cg.is_primary) || child?.child_guardian?.[0];
  const guardian = primaryGuardian?.guardians;

  return {
    firstName: child?.first_name || '',
    lastName: child?.last_name || '',
    nickname: child?.nickname || '',
    middleName: child?.middle_name || '',
    formalId: child?.formal_id || 'N/A',
    gender: child?.gender || 'N/A',
    birthdate: child?.birthdate || null,
    age: child?.birthdate
      ? Math.floor((new Date() - new Date(child.birthdate)) / 31557600000)
      : null,
    ageCategory: child?.age_categories?.category_name || 'N/A',
    guardianFirstName: guardian?.first_name || '',
    guardianLastName: guardian?.last_name || '',
    guardianPhone: guardian?.phone_number || '',
    guardianEmail: guardian?.email || '',
    photoUrl: child?.photo_url || '',
    registrationDate: child?.registration_date || new Date().toISOString(),
  };
};

const isPresent = (value) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) return false;
  const upper = normalized.toUpperCase();
  return upper !== 'N/A' && upper !== 'NA' && upper !== 'NULL' && upper !== 'UNDEFINED';
};

export const getPrintableIdValidation = (childData) => {
  const missingFields = [];

  const guardianFirst = childData?.guardianFirstName ?? childData?.guardian_first_name ?? '';
  const guardianLast = childData?.guardianLastName ?? childData?.guardian_last_name ?? '';
  const guardianName = childData?.guardianName ?? childData?.guardian_name ?? `${guardianFirst} ${guardianLast}`.trim();
  const guardianPhone = childData?.guardianPhone ?? childData?.guardian_contact ?? '';

  if (!isPresent(childData?.formalId ?? childData?.formal_id)) missingFields.push('Formal ID');
  if (!isPresent(childData?.firstName ?? childData?.first_name)) missingFields.push('First Name');
  if (!isPresent(childData?.lastName ?? childData?.last_name)) missingFields.push('Last Name');
  if (!isPresent(childData?.nickname)) missingFields.push('Nickname');
  if (!isPresent(childData?.photoUrl ?? childData?.photo_url)) missingFields.push('Photo');
  if (!isPresent(guardianName)) missingFields.push('Guardian Name');
  if (!isPresent(guardianPhone)) missingFields.push('Guardian Contact');

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};
