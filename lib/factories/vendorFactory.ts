/**
 * Factory for VendorService singleton
 */

import db from '@/lib/db';
import { VendorService } from '@/application/services/VendorService';

let vendorService: VendorService;

function initialize() {
  if (vendorService) return;
  vendorService = new VendorService(db);
}

export function getVendorService(): VendorService {
  initialize();
  return vendorService;
}
