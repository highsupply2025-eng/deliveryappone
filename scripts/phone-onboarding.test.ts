import { describe,it,expect } from 'bun:test';
import { normalizePhone,requiredDocuments,validateDocument } from '../src/lib/phone-onboarding';
describe('phone onboarding',()=>{
 it('normalizes Saudi mobiles',()=>expect(normalizePhone('٠٥٠١٢٣٤٥٦٧')).toBe('+966501234567'));
 it('rejects invalid phone numbers',()=>expect(()=>normalizePhone('abc')).toThrow());
 it('requires courier identity license and portrait',()=>expect(requiredDocuments('courier')).toEqual(['identity','driving_license','portrait']));
 it('requires all four restaurant documents',()=>expect(requiredDocuments('restaurant')).toEqual(['storefront','municipal_license','commercial_registration','owner_identity']));
 it('rejects files larger than 10MB',()=>expect(()=>validateDocument({size:10485761,type:'image/jpeg'})).toThrow());
 it('rejects executable uploads',()=>expect(()=>validateDocument({size:100,type:'application/octet-stream'})).toThrow());
});