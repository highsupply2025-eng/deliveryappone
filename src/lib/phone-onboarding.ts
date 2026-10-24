import { z } from 'zod';

export function normalizePhone(value: string) {
  const digits = value.replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[\s()-]/g, '');
  const phone = /^05\d{8}$/.test(digits) ? `+966${digits.slice(1)}` : digits.startsWith('00') ? `+${digits.slice(2)}` : digits;
  const result = z.string().regex(/^\+[1-9]\d{7,14}$/).safeParse(phone);
  if (!result.success) throw new Error('أدخل رقم الجوال مع رمز الدولة');
  return result.data;
}
export const documentLabels = {
  identity: 'الهوية', driving_license: 'رخصة القيادة', portrait: 'الصورة الشخصية',
  storefront: 'صورة أمامية للوحة المحل', municipal_license: 'رخصة البلدية',
  commercial_registration: 'السجل التجاري', owner_identity: 'هوية مالك المطعم',
};
export function requiredDocuments(type: 'courier' | 'restaurant') {
  return type === 'courier' ? ['identity', 'driving_license', 'portrait'] as const : ['storefront', 'municipal_license', 'commercial_registration', 'owner_identity'] as const;
}
export function validateDocument(file: { size: number; type: string }) {
  if (file.size < 1 || file.size > 10 * 1024 * 1024 || !['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)) throw new Error('اختر صورة أو PDF بحجم لا يتجاوز 10 ميجابايت');
}