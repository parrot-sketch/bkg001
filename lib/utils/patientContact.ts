/**
 * The patient table requires a phone and a unique email, so records created
 * without them (QR intake for minors, legacy imports) store stand-in values.
 * These must never be shown to staff as real contact details.
 */
const PLACEHOLDER_PHONES = new Set(['+254000000000', '+254700000000']);

export const PLACEHOLDER_ADDRESS = 'Not provided';

export const realAddress = (address?: string | null) => (!address || address === PLACEHOLDER_ADDRESS ? null : address);

export const isPlaceholderPhone = (phone?: string | null) => !phone || PLACEHOLDER_PHONES.has(phone.trim());

export const isPlaceholderEmail = (email?: string | null) => !email || email.endsWith('@placeholder.local');

export const realPhone = (phone?: string | null) => (isPlaceholderPhone(phone) ? null : phone!);

export const realEmail = (email?: string | null) => (isPlaceholderEmail(email) ? null : email!);
