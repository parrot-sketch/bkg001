/**
 * Production Inventory Seed — from Nairobi Sculpt Clean Catalogue
 *
 * Seeds 226 inventory items from the official Excel catalogue.
 * item_code is used as SKU. No quantities seeded (catalogue only).
 *
 * Run with: npx tsx prisma/seed-production.ts
 * Requires: DATABASE_URL pointing to production DB
 */

import { PrismaClient, InventoryCategory } from '@prisma/client';

const prisma = new PrismaClient();

interface CatalogueItem {
  cat: string;
  code: string;
  name: string;
  type: 'MEDICATION' | 'CONSUMABLE' | 'IMPLANT' | 'EQUIPMENT';
  unit: string;
  price: number;
  expiry: boolean;
  ctrl: boolean;
  minStock: number;
  reorder: number;
}

const CATEGORY_MAP: Record<string, InventoryCategory> = {
  ANAES: InventoryCategory.ANESTHETIC,
  IVMED: InventoryCategory.MEDICATION,
  IVFLU: InventoryCategory.MEDICATION,
  GAS: InventoryCategory.DISPOSABLE,
  SUTR: InventoryCategory.SUTURE,
  DRESS: InventoryCategory.DRESSING,
  THCON: InventoryCategory.DISPOSABLE,
  AIRWY: InventoryCategory.DISPOSABLE,
  IVACC: InventoryCategory.DISPOSABLE,
  CATH: InventoryCategory.DISPOSABLE,
  BANDT: InventoryCategory.DRESSING,
  IMPL: InventoryCategory.IMPLANT,
  DIAGN: InventoryCategory.DISPOSABLE,
  STERL: InventoryCategory.DISPOSABLE,
  SVC: InventoryCategory.OTHER,
};

const STORAGE_LOCATIONS: Record<string, string> = {
  ANAES: 'Pharmacy - Anaesthetics Shelf',
  IVMED: 'Pharmacy - General Shelf',
  IVFLU: 'Pharmacy - Fluids Store',
  GAS: 'Medical Gas Store',
  SUTR: 'Theater Store - Sutures',
  DRESS: 'Ward Store - Dressings',
  THCON: 'Theater Store',
  AIRWY: 'Theater Store - Airway',
  IVACC: 'Pharmacy - IV Supplies',
  CATH: 'Ward Store',
  BANDT: 'Ward Store - Dressings',
  IMPL: 'Pharmacy - Refrigerator',
  DIAGN: 'Pharmacy - Diagnostics',
  STERL: 'CSSD',
  SVC: 'N/A',
};

const ITEMS: CatalogueItem[] = [
  // AESTHETICS & IMPLANTS (14 items)
  { cat:'IMPL', code:'IMPL-ANGEL-500ML', name:'Angelique Massage Oil 500ml', type:'CONSUMABLE', unit:'bottle', price:0, expiry:false, ctrl:false, minStock:2, reorder:5 },
  { cat:'IMPL', code:'IMPL-BIRE-50ML', name:'Biretix Hydramat Gel 50ml', type:'CONSUMABLE', unit:'tube', price:0, expiry:false, ctrl:false, minStock:2, reorder:5 },
  { cat:'IMPL', code:'IMPL-BOTOX-UNIT', name:'Botox Per Unit', type:'IMPLANT', unit:'unit', price:450, expiry:true, ctrl:true, minStock:2, reorder:5 },
  { cat:'IMPL', code:'IMPL-ENDO-30ML', name:'Endocare Renewal Retinol 30ml', type:'CONSUMABLE', unit:'tube', price:0, expiry:false, ctrl:false, minStock:2, reorder:5 },
  { cat:'IMPL', code:'IMPL-ARNICA-100G', name:'Go Pain Arnica Gel 100g', type:'CONSUMABLE', unit:'tube', price:0, expiry:false, ctrl:false, minStock:2, reorder:5 },
  { cat:'IMPL', code:'IMPL-HELIO-GEL-50', name:'Heliocare 360 Gel Oil 50ml', type:'CONSUMABLE', unit:'tube', price:0, expiry:false, ctrl:false, minStock:2, reorder:5 },
  { cat:'IMPL', code:'IMPL-HELIO-SPRY-200', name:'Heliocare 360 Invisible Spray 200ml', type:'CONSUMABLE', unit:'bottle', price:0, expiry:false, ctrl:false, minStock:2, reorder:5 },
  { cat:'IMPL', code:'IMPL-HELIO-WGE-50', name:'Heliocare 360 Water Gel 50ml', type:'CONSUMABLE', unit:'tube', price:0, expiry:false, ctrl:false, minStock:2, reorder:5 },
  { cat:'IMPL', code:'IMPL-KYJEL-STD', name:'KY Jelly', type:'CONSUMABLE', unit:'tube', price:375, expiry:false, ctrl:false, minStock:2, reorder:5 },
  { cat:'IMPL', code:'IMPL-PRP-KIT', name:'PRP Kit', type:'IMPLANT', unit:'kit', price:10000, expiry:true, ctrl:true, minStock:2, reorder:5 },
  { cat:'IMPL', code:'IMPL-PRILO-STD', name:'Prilox Cream', type:'CONSUMABLE', unit:'tube', price:0, expiry:false, ctrl:false, minStock:2, reorder:5 },
  { cat:'IMPL', code:'IMPL-PROFH-STD', name:'Profhilo H & L', type:'IMPLANT', unit:'vial', price:0, expiry:true, ctrl:true, minStock:2, reorder:5 },
  { cat:'IMPL', code:'IMPL-SEMA-PEN', name:'Semaglutide Pen (Ozempic)', type:'IMPLANT', unit:'pen', price:0, expiry:true, ctrl:true, minStock:2, reorder:5 },
  { cat:'IMPL', code:'IMPL-GFC-KIT', name:'Viyata GFC Kit', type:'IMPLANT', unit:'kit', price:0, expiry:true, ctrl:true, minStock:2, reorder:5 },

  // AIRWAY MANAGEMENT (18 items)
  { cat:'AIRWY', code:'AIR-GUED-STD', name:'Airway Guedel', type:'CONSUMABLE', unit:'piece', price:435, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'AIRWY', code:'AIR-FILT-HME', name:'Bacterial Filter (HME)', type:'CONSUMABLE', unit:'piece', price:870, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'AIRWY', code:'AIR-FILT-HMEF', name:'Breathing Filter (HMEF) Adult', type:'CONSUMABLE', unit:'piece', price:0, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'AIRWY', code:'AIR-CATH-MNT', name:'Catheter Mount', type:'CONSUMABLE', unit:'piece', price:870, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'AIRWY', code:'AIR-ETT-CUFF-65', name:'Endotracheal Tube Cuffed 6.5', type:'CONSUMABLE', unit:'piece', price:200, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'AIRWY', code:'AIR-ETT-CUFF-7', name:'Endotracheal Tube Cuffed 7', type:'CONSUMABLE', unit:'piece', price:200, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'AIRWY', code:'AIR-ETT-PLAIN-45', name:'Endotracheal Tube Plain 4.5', type:'CONSUMABLE', unit:'piece', price:200, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'AIRWY', code:'AIR-LMA-STD', name:'LMA (Laryngeal Mask Airway)', type:'CONSUMABLE', unit:'piece', price:440, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'AIRWY', code:'AIR-LARYN-STD', name:'Laryngeal Airway', type:'CONSUMABLE', unit:'piece', price:7000, expiry:true, ctrl:false, minStock:2, reorder:5 },
  { cat:'AIRWY', code:'AIR-NASAL-PRNG', name:'Nasal Prongs', type:'CONSUMABLE', unit:'piece', price:300, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'AIRWY', code:'AIR-MASK-NRB', name:'Non-Rebreathing Mask Paediatric/Adult', type:'CONSUMABLE', unit:'piece', price:300, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'AIRWY', code:'AIR-SUCT-10', name:'Suction Catheter Size 10', type:'CONSUMABLE', unit:'piece', price:100, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'AIRWY', code:'AIR-SUCT-12', name:'Suction Catheter Size 12', type:'CONSUMABLE', unit:'piece', price:100, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'AIRWY', code:'AIR-SUCT-16', name:'Suction Catheter Size 16', type:'CONSUMABLE', unit:'piece', price:100, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'AIRWY', code:'AIR-SUCT-18', name:'Suction Catheter Size 18', type:'CONSUMABLE', unit:'piece', price:100, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'AIRWY', code:'AIR-SUCT-6', name:'Suction Catheter Size 6', type:'CONSUMABLE', unit:'piece', price:100, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'AIRWY', code:'AIR-YANK-HDL', name:'Yankauer Handle', type:'CONSUMABLE', unit:'piece', price:600, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'AIRWY', code:'AIR-YANK-TUB-3M', name:'Yankauer Tubing 3m', type:'CONSUMABLE', unit:'piece', price:0, expiry:true, ctrl:false, minStock:5, reorder:10 },

  // ANAESTHETIC AGENTS (21 items)
  { cat:'ANAES', code:'MED-ACTR-100IU', name:'Actrapid 100IU 10ml (Human Insulin)', type:'MEDICATION', unit:'vial', price:1200, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'ANAES', code:'MED-ATRA-10MG', name:'Atracurium Injection 10mg/ml/5ml', type:'MEDICATION', unit:'vial', price:650, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'ANAES', code:'MED-BUPI-5ML', name:'Bupivacaine Plain Injection 5ml', type:'MEDICATION', unit:'vial', price:420, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'ANAES', code:'MED-EPHED-STD', name:'Ephedrine', type:'MEDICATION', unit:'vial', price:300, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'ANAES', code:'MED-FENT-100MCG', name:'Fentanyl Injection 100mcg/2ml', type:'MEDICATION', unit:'pack', price:290, expiry:true, ctrl:true, minStock:5, reorder:10 },
  { cat:'ANAES', code:'MED-MARC-HVY', name:'Heavy Marcaine', type:'MEDICATION', unit:'vial', price:1062, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'ANAES', code:'MED-ISO-STD', name:'Isoflurane', type:'MEDICATION', unit:'unit', price:35, expiry:true, ctrl:false, minStock:2, reorder:3 },
  { cat:'ANAES', code:'MED-KETA-IND', name:'Ketamine Injection (India)', type:'MEDICATION', unit:'vial', price:420, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'ANAES', code:'MED-KETA-RTX', name:'Ketamine Injection (Rotex)', type:'MEDICATION', unit:'vial', price:800, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'ANAES', code:'MED-LIGNO-2-30ML', name:'Lignocaine Injection 2% 30ml', type:'MEDICATION', unit:'vial', price:100, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'ANAES', code:'MED-LIGNO-ADR-30ML', name:'Lignocaine with Adrenaline 30ml', type:'MEDICATION', unit:'vial', price:150, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'ANAES', code:'MED-MIDAZ-STD', name:'Midazolam', type:'MEDICATION', unit:'vial', price:450, expiry:true, ctrl:true, minStock:5, reorder:10 },
  { cat:'ANAES', code:'MED-MORPH-10MG', name:'Morphine Injection 10mg', type:'MEDICATION', unit:'pack', price:300, expiry:true, ctrl:true, minStock:5, reorder:10 },
  { cat:'ANAES', code:'MED-NALOX-04MCG', name:'Naloxone 0.4mcg', type:'MEDICATION', unit:'pack', price:1020, expiry:true, ctrl:true, minStock:3, reorder:5 },
  { cat:'ANAES', code:'MED-NEOS-STD', name:'Neostigmine', type:'MEDICATION', unit:'vial', price:120, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'ANAES', code:'MED-PETH-100MG', name:'Pethidine Injection 100mg/2ml', type:'MEDICATION', unit:'pack', price:290, expiry:true, ctrl:true, minStock:5, reorder:10 },
  { cat:'ANAES', code:'MED-PROP-20ML', name:'Propofol Injection 1% 20ml', type:'MEDICATION', unit:'vial', price:380, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'ANAES', code:'MED-REMI-5MG', name:'Remifentanil 5mg', type:'MEDICATION', unit:'vial', price:2572, expiry:true, ctrl:true, minStock:3, reorder:5 },
  { cat:'ANAES', code:'MED-SEVO-STD', name:'Sevoflurane', type:'MEDICATION', unit:'unit', price:100, expiry:true, ctrl:false, minStock:2, reorder:3 },
  { cat:'ANAES', code:'MED-SODA-4-5KG', name:'Soda Lime 4.5kg', type:'CONSUMABLE', unit:'bag', price:0, expiry:false, ctrl:false, minStock:2, reorder:3 },
  { cat:'ANAES', code:'MED-SUXA-STD', name:'Suxamethonium Injection', type:'MEDICATION', unit:'vial', price:200, expiry:true, ctrl:true, minStock:5, reorder:10 },

  // BANDAGES & TAPES (13 items)
  { cat:'BANDT', code:'BAND-BED-LINER', name:'Bed Liners / Underpads', type:'CONSUMABLE', unit:'piece', price:225, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'BANDT', code:'BAND-COMP-STKG', name:'Compression Stocking', type:'CONSUMABLE', unit:'pair', price:3800, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'BANDT', code:'BAND-CREPE-2IN', name:'Crepe Bandage 2 inch', type:'CONSUMABLE', unit:'piece', price:100, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'BANDT', code:'BAND-CREPE-3IN', name:'Crepe Bandage 3 inch', type:'CONSUMABLE', unit:'piece', price:100, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'BANDT', code:'BAND-CREPE-4IN', name:'Crepe Bandage 4 inch', type:'CONSUMABLE', unit:'piece', price:100, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'BANDT', code:'BAND-CREPE-6IN', name:'Crepe Bandage 6 inch', type:'CONSUMABLE', unit:'piece', price:120, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'BANDT', code:'BAND-TAPE-MICRO', name:'Micropore Tape', type:'CONSUMABLE', unit:'roll', price:400, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'BANDT', code:'BAND-ORTH-6IN', name:'Orthoband 6 inch', type:'CONSUMABLE', unit:'piece', price:320, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'BANDT', code:'BAND-POP-STD', name:'Plaster of Paris', type:'CONSUMABLE', unit:'piece', price:750, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'BANDT', code:'BAND-TAPE-TRANS', name:'Transpore Tape', type:'CONSUMABLE', unit:'roll', price:300, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'BANDT', code:'BAND-VELO-1M-THICK', name:'Velosoft 1m (thick)', type:'CONSUMABLE', unit:'piece', price:200, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'BANDT', code:'BAND-VELO-1M-THIN', name:'Velosoft 1m (thin)', type:'CONSUMABLE', unit:'piece', price:100, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'BANDT', code:'BAND-VELO-6IN', name:'Velsoft 6 inch', type:'CONSUMABLE', unit:'piece', price:780, expiry:true, ctrl:false, minStock:10, reorder:15 },

  // CATHETERS & TUBES (7 items)
  { cat:'CATH', code:'CATH-FOL-STD', name:'Foley Catheter', type:'CONSUMABLE', unit:'piece', price:200, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'CATH', code:'CATH-NGT-12', name:'Nasogastric Tube Size 12', type:'CONSUMABLE', unit:'piece', price:100, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'CATH', code:'CATH-NGT-14', name:'Nasogastric Tube Size 14', type:'CONSUMABLE', unit:'piece', price:100, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'CATH', code:'CATH-NGT-16', name:'Nasogastric Tube Size 16', type:'CONSUMABLE', unit:'piece', price:100, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'CATH', code:'CATH-NGT-18', name:'Nasogastric Tube Size 18', type:'CONSUMABLE', unit:'piece', price:100, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'CATH', code:'CATH-URINE-BAG', name:'Urine Bag', type:'CONSUMABLE', unit:'piece', price:150, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'CATH', code:'CATH-VAG-SPEC', name:'Vaginal Speculum', type:'CONSUMABLE', unit:'piece', price:200, expiry:true, ctrl:false, minStock:10, reorder:15 },

  // DIAGNOSTICS & MONITORING (1 item)
  { cat:'DIAGN', code:'DIAG-GLUCO-KIT', name:'Glucometer with Strips & Lancets', type:'EQUIPMENT', unit:'kit', price:800, expiry:false, ctrl:false, minStock:5, reorder:10 },

  // DRESSINGS (17 items)
  { cat:'DRESS', code:'DRESS-AQUA-STD', name:'Aquacel', type:'CONSUMABLE', unit:'piece', price:3870, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'DRESS', code:'DRESS-BACT-10-10', name:'Bactigrass 10cm x 10cm', type:'CONSUMABLE', unit:'piece', price:150, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'DRESS', code:'DRESS-BACT-10-40', name:'Bactigrass 10cm x 40cm', type:'CONSUMABLE', unit:'piece', price:210, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'DRESS', code:'DRESS-BETA-125ML', name:'Betadine Antiseptic 125ml', type:'CONSUMABLE', unit:'bottle', price:0, expiry:false, ctrl:false, minStock:5, reorder:8 },
  { cat:'DRESS', code:'DRESS-PACK-STD', name:'Dressing Pack (Sterile)', type:'CONSUMABLE', unit:'pack', price:500, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'DRESS', code:'DRESS-HYPO-5-8', name:'Hypodress 5x8', type:'CONSUMABLE', unit:'piece', price:80, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'DRESS', code:'DRESS-LEUK-10-25', name:'Leukomed 10cm x 25cm (50s)', type:'CONSUMABLE', unit:'box', price:300, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'DRESS', code:'DRESS-LEUK-8-15', name:'Leukomed 8cm x 15cm (50s)', type:'CONSUMABLE', unit:'box', price:140, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'DRESS', code:'DRESS-LEUKTP-10-25', name:'Leukomed T Plus 10cm x 25cm (50s)', type:'CONSUMABLE', unit:'box', price:355, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'DRESS', code:'DRESS-LEUKTP-8-15', name:'Leukomed T Plus 8cm x 15cm (50s)', type:'CONSUMABLE', unit:'box', price:200, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'DRESS', code:'DRESS-MEBO-STD', name:'MEBO Herbal Ointment', type:'CONSUMABLE', unit:'tube', price:1940, expiry:true, ctrl:false, minStock:3, reorder:5 },
  { cat:'DRESS', code:'DRESS-MUPIR-STD', name:'Mupirzed Ointment', type:'CONSUMABLE', unit:'tube', price:1200, expiry:true, ctrl:false, minStock:3, reorder:5 },
  { cat:'DRESS', code:'DRESS-PADS-STD', name:'Pads', type:'CONSUMABLE', unit:'piece', price:100, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'DRESS', code:'DRESS-PYN-10-10', name:'Pynodine 10cm x 10cm', type:'CONSUMABLE', unit:'piece', price:100, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'DRESS', code:'DRESS-PYN-10-40', name:'Pynodine 10cm x 40cm', type:'CONSUMABLE', unit:'piece', price:300, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'DRESS', code:'DRESS-ABD-STR', name:'Sterile Abdominal Packs', type:'CONSUMABLE', unit:'piece', price:980, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'DRESS', code:'DRESS-ZUPR-STD', name:'Zupricin Ointment', type:'CONSUMABLE', unit:'tube', price:1660, expiry:true, ctrl:false, minStock:3, reorder:5 },

  // GASES (2 items)
  { cat:'GAS', code:'GAS-OXY-8-5M3', name:'Medical Oxygen 8.5m\u00b3', type:'CONSUMABLE', unit:'cylinder', price:20, expiry:false, ctrl:false, minStock:3, reorder:5 },
  { cat:'GAS', code:'GAS-N2O-30KG', name:'Nitrous Gas 30kg', type:'CONSUMABLE', unit:'cylinder', price:0, expiry:false, ctrl:false, minStock:2, reorder:3 },

  // IV ACCESS & SYRINGES (22 items)
  { cat:'IVACC', code:'ACC-IV-BLOOD-SET', name:'Blood Giving Set', type:'CONSUMABLE', unit:'piece', price:120, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'IVACC', code:'ACC-CANN-G18-100', name:'Brannular G18 (100s)', type:'CONSUMABLE', unit:'box', price:50, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'IVACC', code:'ACC-CANN-G20-100', name:'Brannular G20 (100s)', type:'CONSUMABLE', unit:'box', price:50, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'IVACC', code:'ACC-CANN-G22-100', name:'Brannular G22 (100s)', type:'CONSUMABLE', unit:'box', price:50, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'IVACC', code:'ACC-CANN-G24-100', name:'Brannular G24 (100s)', type:'CONSUMABLE', unit:'box', price:50, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'IVACC', code:'ACC-SPIN-22G', name:'Disposable Spinal Needle 22G', type:'CONSUMABLE', unit:'piece', price:200, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'IVACC', code:'ACC-SPIN-25G', name:'Disposable Spinal Needle 25G', type:'CONSUMABLE', unit:'piece', price:200, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'IVACC', code:'ACC-IV-SET-50', name:'IV Giving Sets (50s)', type:'CONSUMABLE', unit:'box', price:50, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'IVACC', code:'ACC-SYR-INSU-1ML', name:'Insulin Syringes 1ml', type:'CONSUMABLE', unit:'piece', price:30, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'IVACC', code:'ACC-PUMP-MINDRAY', name:'Mindray Benetusion USP Syringe Pump', type:'EQUIPMENT', unit:'piece', price:0, expiry:false, ctrl:false, minStock:2, reorder:3 },
  { cat:'IVACC', code:'ACC-NDL-G18-100', name:'Needle G18 (100s)', type:'CONSUMABLE', unit:'box', price:10, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'IVACC', code:'ACC-NDL-G21-100', name:'Needle G21 (100s)', type:'CONSUMABLE', unit:'box', price:10, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'IVACC', code:'ACC-NDL-G23-100', name:'Needle G23 (100s)', type:'CONSUMABLE', unit:'box', price:10, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'IVACC', code:'ACC-NDL-G25-100', name:'Needle G25 (100s)', type:'CONSUMABLE', unit:'box', price:10, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'IVACC', code:'ACC-SCALP-G21-100', name:'Scalp Vein G21 (100s)', type:'CONSUMABLE', unit:'box', price:50, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'IVACC', code:'ACC-SCALP-G23-100', name:'Scalp Vein G23 (100s)', type:'CONSUMABLE', unit:'box', price:50, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'IVACC', code:'ACC-SONO-21G', name:'Sonoplex 21G 10mm with Inj Tube', type:'CONSUMABLE', unit:'piece', price:0, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'IVACC', code:'ACC-SYR-60CC', name:'Syringe 60cc Luer Lock', type:'CONSUMABLE', unit:'piece', price:200, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'IVACC', code:'ACC-SYR-10CC-100', name:'Syringes 10cc (100s)', type:'CONSUMABLE', unit:'box', price:20, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'IVACC', code:'ACC-SYR-20CC-50', name:'Syringes 20cc (50s)', type:'CONSUMABLE', unit:'box', price:30, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'IVACC', code:'ACC-SYR-2CC-100', name:'Syringes 2cc (100s)', type:'CONSUMABLE', unit:'box', price:20, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'IVACC', code:'ACC-SYR-5CC-100', name:'Syringes 5cc (100s)', type:'CONSUMABLE', unit:'box', price:20, expiry:true, ctrl:false, minStock:20, reorder:30 },

  // IV FLUIDS (6 items)
  { cat:'IVFLU', code:'FLU-D10-500ML', name:'Dextrose 10% 500ml', type:'MEDICATION', unit:'bag', price:140, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'IVFLU', code:'FLU-D50-100ML', name:'Dextrose 50% 100ml', type:'MEDICATION', unit:'bag', price:180, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'IVFLU', code:'FLU-DNS-500ML', name:'Dextrose Normal Saline (DNS) 500ml', type:'MEDICATION', unit:'bag', price:140, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'IVFLU', code:'FLU-MANN-20-500ML', name:'Mannitol 20% IV 500ml', type:'MEDICATION', unit:'bag', price:1600, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'IVFLU', code:'FLU-NS-500ML', name:'Normal Saline 500ml', type:'MEDICATION', unit:'bag', price:140, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'IVFLU', code:'FLU-RL-500ML', name:'Ringers Lactate / Hartmanns 500ml', type:'MEDICATION', unit:'bag', price:140, expiry:true, ctrl:false, minStock:20, reorder:30 },

  // IV MEDICATIONS (33 items)
  { cat:'IVMED', code:'MED-ACUP-STD', name:'Acupan', type:'MEDICATION', unit:'vial', price:600, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'IVMED', code:'MED-ADREN-1ML', name:'Adrenaline Injection 1ml', type:'MEDICATION', unit:'vial', price:50, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'IVMED', code:'MED-ATRO-1ML', name:'Atropine Injection 1ml', type:'MEDICATION', unit:'vial', price:50, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'IVMED', code:'MED-CALC-10ML', name:'Calcium Gluconate Injection 10ml', type:'MEDICATION', unit:'vial', price:140, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'IVMED', code:'MED-CEFU-750MG', name:'Cefuroxime Injection 750mg', type:'MEDICATION', unit:'vial', price:460, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'IVMED', code:'MED-CLEX-STD', name:'Clexane Injection', type:'MEDICATION', unit:'vial', price:4700, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'IVMED', code:'MED-DEX-4MG', name:'Dexamethasone Injection 4mg/1ml', type:'MEDICATION', unit:'vial', price:100, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'IVMED', code:'MED-DICL-75MG', name:'Diclofenac Injection 75mg/3ml', type:'MEDICATION', unit:'vial', price:240, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'IVMED', code:'MED-ESOME-40MG', name:'Esomeprazole Injection 40mg', type:'MEDICATION', unit:'vial', price:560, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'IVMED', code:'MED-FLAGY-STD', name:'Flagyl (Metronidazole)', type:'MEDICATION', unit:'vial', price:300, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'IVMED', code:'MED-FORM-5L', name:'Formaline Solution 5L', type:'MEDICATION', unit:'bottle', price:100, expiry:false, ctrl:false, minStock:2, reorder:3 },
  { cat:'IVMED', code:'MED-GENTA-80MG', name:'Gentamycin Injection 80mg/2ml', type:'MEDICATION', unit:'vial', price:36, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'IVMED', code:'MED-HAEM-STD', name:'Haemacel', type:'MEDICATION', unit:'bottle', price:1300, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'IVMED', code:'MED-HALO-STD', name:'Haloperidol', type:'MEDICATION', unit:'vial', price:200, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'IVMED', code:'MED-HEPA-5000IU', name:'Heparin Sodium 5000IU/ml', type:'MEDICATION', unit:'vial', price:1350, expiry:true, ctrl:true, minStock:5, reorder:8 },
  { cat:'IVMED', code:'MED-HYALU-STD', name:'Hyaluronidase', type:'MEDICATION', unit:'vial', price:0, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'IVMED', code:'MED-HYDRO-STD', name:'Hydrocortisone Injection', type:'MEDICATION', unit:'vial', price:140, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'IVMED', code:'MED-KETE-50MG', name:'Ketesse Injection 50mg', type:'MEDICATION', unit:'vial', price:415, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'IVMED', code:'MED-LASIX-20MG', name:'Lasix 20mg', type:'MEDICATION', unit:'vial', price:350, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'IVMED', code:'MED-MGS-50-10ML', name:'Magnesium Sulphate 50% IV 10ml', type:'MEDICATION', unit:'vial', price:260, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'IVMED', code:'MED-METO-1ML', name:'Metoclopramide Injection 1ml', type:'MEDICATION', unit:'vial', price:50, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'IVMED', code:'MED-ONDA-4ML', name:'Ondansetron Injection 4ml', type:'MEDICATION', unit:'vial', price:975, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'IVMED', code:'MED-PARA-IV-100ML', name:'Paracetamol IV 100ml', type:'MEDICATION', unit:'bottle', price:300, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'IVMED', code:'MED-PIRI-STD', name:'Piriton / Chlorphenamine', type:'MEDICATION', unit:'vial', price:100, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'IVMED', code:'MED-KCL-15-10ML', name:'Potassium Chloride 1.5/10ml', type:'MEDICATION', unit:'vial', price:170, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'IVMED', code:'MED-SEMA-14MG', name:'Semaglutide 14mg', type:'MEDICATION', unit:'unit', price:0, expiry:true, ctrl:false, minStock:2, reorder:3 },
  { cat:'IVMED', code:'MED-SEMA-4MG', name:'Semaglutide Injection 4mg/3ml (Ozempic)', type:'MEDICATION', unit:'pen', price:0, expiry:true, ctrl:false, minStock:2, reorder:3 },
  { cat:'IVMED', code:'MED-SOLUM-500MG', name:'Solumedrol Injection 500mg', type:'MEDICATION', unit:'vial', price:0, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'IVMED', code:'MED-TRAM-100MG', name:'Tramadol Injection 100mg/2ml', type:'MEDICATION', unit:'pack', price:435, expiry:true, ctrl:false, minStock:5, reorder:10 },
  { cat:'IVMED', code:'MED-TXA-500MG', name:'Tranexamic Acid Injection 500mg', type:'MEDICATION', unit:'vial', price:300, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'IVMED', code:'MED-TRIAM-40MG', name:'Triamcinolone / Triam Denk 40mg', type:'MEDICATION', unit:'vial', price:1140, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'IVMED', code:'MED-VOLU-STD', name:'Voluven', type:'MEDICATION', unit:'bottle', price:2000, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'IVMED', code:'MED-WFI-10ML', name:'Water for Injection 10ml', type:'MEDICATION', unit:'vial', price:15, expiry:true, ctrl:false, minStock:20, reorder:30 },

  // SERVICES (7 items — billing only, no physical stock)
  { cat:'SVC', code:'SVC-DRESS-MAJOR', name:'Dressing Fee Major', type:'CONSUMABLE', unit:'session', price:1200, expiry:false, ctrl:false, minStock:0, reorder:0 },
  { cat:'SVC', code:'SVC-DRESS-MINOR', name:'Dressing Fee Minor', type:'CONSUMABLE', unit:'session', price:550, expiry:false, ctrl:false, minStock:0, reorder:0 },
  { cat:'SVC', code:'SVC-THTR-50PM', name:'Minor Theatre Fee (per 50 minutes)', type:'CONSUMABLE', unit:'session', price:0, expiry:false, ctrl:false, minStock:0, reorder:0 },
  { cat:'SVC', code:'SVC-ROOM-PRIV', name:'Private Room + Nurse', type:'CONSUMABLE', unit:'day', price:15000, expiry:false, ctrl:false, minStock:0, reorder:0 },
  { cat:'SVC', code:'SVC-STAP-RMV-USE', name:'Staple Remover Use', type:'CONSUMABLE', unit:'session', price:300, expiry:false, ctrl:false, minStock:0, reorder:0 },
  { cat:'SVC', code:'SVC-THTR-100PM', name:'Theatre Fee (per 100 minutes)', type:'CONSUMABLE', unit:'session', price:0, expiry:false, ctrl:false, minStock:0, reorder:0 },
  { cat:'SVC', code:'SVC-SETS-USE', name:'Use of Sets', type:'CONSUMABLE', unit:'session', price:700, expiry:false, ctrl:false, minStock:0, reorder:0 },

  // STERILIZATION & CLEANING (13 items)
  { cat:'STERL', code:'STER-BIN-RED', name:'Bin Liners Red 30x36 inch', type:'CONSUMABLE', unit:'piece', price:0, expiry:false, ctrl:false, minStock:5, reorder:10 },
  { cat:'STERL', code:'STER-BIN-YEL', name:'Bin Liners Yellow 30x36 inch', type:'CONSUMABLE', unit:'piece', price:0, expiry:false, ctrl:false, minStock:5, reorder:10 },
  { cat:'STERL', code:'STER-CIDEX-5L', name:'Cidex (Glutaraldehyde) 5L', type:'CONSUMABLE', unit:'bottle', price:0, expiry:false, ctrl:false, minStock:3, reorder:5 },
  { cat:'STERL', code:'STER-ENDOZ-5L', name:'Endozyme 5L', type:'CONSUMABLE', unit:'bottle', price:0, expiry:false, ctrl:false, minStock:3, reorder:5 },
  { cat:'STERL', code:'STER-HAND-TOWEL', name:'Hand Paper Towels 12s Carton', type:'CONSUMABLE', unit:'carton', price:0, expiry:false, ctrl:false, minStock:5, reorder:10 },
  { cat:'STERL', code:'STER-METH-5L', name:'Methylated Spirit 70% 5L', type:'CONSUMABLE', unit:'bottle', price:0, expiry:false, ctrl:false, minStock:5, reorder:10 },
  { cat:'STERL', code:'STER-NICE-TISSUE', name:'Nice & Soft Toilet Tissue (10s)', type:'CONSUMABLE', unit:'pack', price:0, expiry:false, ctrl:false, minStock:5, reorder:10 },
  { cat:'STERL', code:'STER-ROSY-BLEACH', name:'Rosy Bleach Regular 5L', type:'CONSUMABLE', unit:'bottle', price:0, expiry:false, ctrl:false, minStock:5, reorder:10 },
  { cat:'STERL', code:'STER-ROSY-HWASH', name:'Rosy Handwash Pink 5L', type:'CONSUMABLE', unit:'bottle', price:0, expiry:false, ctrl:false, minStock:5, reorder:10 },
  { cat:'STERL', code:'STER-SHRP-5L', name:'Sharps Container 5L Cardboard', type:'CONSUMABLE', unit:'piece', price:0, expiry:false, ctrl:false, minStock:5, reorder:10 },
  { cat:'STERL', code:'STER-VELV-DETG', name:'Velvex Multipurpose Detergent 5L', type:'CONSUMABLE', unit:'bottle', price:0, expiry:false, ctrl:false, minStock:5, reorder:10 },
  { cat:'STERL', code:'STER-VELV-TOILET', name:'Velvex Toilet Cleaner 500ml', type:'CONSUMABLE', unit:'bottle', price:0, expiry:false, ctrl:false, minStock:5, reorder:10 },
  { cat:'STERL', code:'STER-VELV-TISSUE', name:'Velvex Toilet Tissue (10s)', type:'CONSUMABLE', unit:'pack', price:0, expiry:false, ctrl:false, minStock:5, reorder:10 },

  // SUTURES (23 items)
  { cat:'SUTR', code:'SUTR-MONO-2-0', name:'Monocryl 2.0', type:'CONSUMABLE', unit:'piece', price:400, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'SUTR', code:'SUTR-MONO-3-0', name:'Monocryl 3.0', type:'CONSUMABLE', unit:'piece', price:400, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'SUTR', code:'SUTR-MONO-4-0', name:'Monocryl 4.0', type:'CONSUMABLE', unit:'piece', price:400, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'SUTR', code:'SUTR-NYL-10-0', name:'Nylon 10/0 30cm', type:'CONSUMABLE', unit:'piece', price:0, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'SUTR', code:'SUTR-NYL-2-0', name:'Nylon 2.0', type:'CONSUMABLE', unit:'piece', price:400, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'SUTR', code:'SUTR-NYL-3-0', name:'Nylon 3.0', type:'CONSUMABLE', unit:'piece', price:400, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'SUTR', code:'SUTR-NYL-4-0', name:'Nylon 4.0', type:'CONSUMABLE', unit:'piece', price:400, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'SUTR', code:'SUTR-NYL-5-0', name:'Nylon 5.0', type:'CONSUMABLE', unit:'piece', price:400, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'SUTR', code:'SUTR-NYL-LOOP-1', name:'Nylon Loop 1', type:'CONSUMABLE', unit:'piece', price:0, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'SUTR', code:'SUTR-PDS-LOOP-1', name:'PDS Loop 1', type:'CONSUMABLE', unit:'piece', price:1030, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'SUTR', code:'SUTR-PROL-2-0', name:'Prolene 2.0', type:'CONSUMABLE', unit:'piece', price:0, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'SUTR', code:'SUTR-PROL-3-0', name:'Prolene 3.0', type:'CONSUMABLE', unit:'piece', price:0, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'SUTR', code:'SUTR-PROL-4-0', name:'Prolene 4.0', type:'CONSUMABLE', unit:'piece', price:0, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'SUTR', code:'SUTR-PROL-5-0', name:'Prolene 5.0', type:'CONSUMABLE', unit:'piece', price:0, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'SUTR', code:'SUTR-STAP-STD', name:'Skin Staples', type:'CONSUMABLE', unit:'piece', price:1200, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'SUTR', code:'SUTR-STAP-RMV', name:'Staple Remover', type:'CONSUMABLE', unit:'piece', price:1500, expiry:false, ctrl:false, minStock:5, reorder:8 },
  { cat:'SUTR', code:'SUTR-SYNTH-2-0', name:'Synthabs / Monocryl 3/0 90cm', type:'CONSUMABLE', unit:'piece', price:0, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'SUTR', code:'SUTR-VIC-1', name:'Vicryl 1', type:'CONSUMABLE', unit:'piece', price:400, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'SUTR', code:'SUTR-VIC-2', name:'Vicryl 2', type:'CONSUMABLE', unit:'piece', price:400, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'SUTR', code:'SUTR-VIC-2-0', name:'Vicryl 2.0', type:'CONSUMABLE', unit:'piece', price:400, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'SUTR', code:'SUTR-VIC-3-0', name:'Vicryl 3.0', type:'CONSUMABLE', unit:'piece', price:400, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'SUTR', code:'SUTR-VIC-4-0', name:'Vicryl 4.0', type:'CONSUMABLE', unit:'piece', price:400, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'SUTR', code:'SUTR-VIC-5-0', name:'Vicryl 5.0', type:'CONSUMABLE', unit:'piece', price:400, expiry:true, ctrl:false, minStock:10, reorder:15 },

  // THEATER CONSUMABLES (29 items)
  { cat:'THCON', code:'CON-ABD-PACK', name:'Abdominal Packs', type:'CONSUMABLE', unit:'piece', price:200, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'THCON', code:'CON-AUTOCLV-TAPE', name:'Autoclove Tape 1850', type:'CONSUMABLE', unit:'roll', price:0, expiry:false, ctrl:false, minStock:3, reorder:5 },
  { cat:'THCON', code:'CON-GLOVE-CLN', name:'Clean Gloves (box)', type:'CONSUMABLE', unit:'box', price:1000, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'THCON', code:'CON-DIATX-PENCIL', name:'Diathermy Pencil', type:'CONSUMABLE', unit:'piece', price:350, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'THCON', code:'CON-DRAIN-STD', name:'Drain', type:'CONSUMABLE', unit:'piece', price:2100, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'THCON', code:'CON-ECG-ELEC', name:'EGG Electrodes ECG', type:'CONSUMABLE', unit:'piece', price:90, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'THCON', code:'CON-FLEX-PLATE', name:'Flexoplate', type:'CONSUMABLE', unit:'piece', price:0, expiry:true, ctrl:false, minStock:3, reorder:5 },
  { cat:'THCON', code:'CON-GLOVE-GAMX-75', name:'Gammex Latex Surgical Gloves 7.5', type:'CONSUMABLE', unit:'pair', price:0, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'THCON', code:'CON-GAUZE-STD', name:'Gauze', type:'CONSUMABLE', unit:'piece', price:20, expiry:true, ctrl:false, minStock:50, reorder:80 },
  { cat:'THCON', code:'CON-GAUZE-ROLL', name:'Gauze Roll 90cm x 90 yards', type:'CONSUMABLE', unit:'roll', price:0, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'THCON', code:'CON-HEPA-LIPO', name:'Hepa Filter for Liposuction', type:'CONSUMABLE', unit:'piece', price:0, expiry:true, ctrl:false, minStock:3, reorder:5 },
  { cat:'THCON', code:'CON-GLOVE-LATEX-PF', name:'Latex Powder Free Exam Gloves', type:'CONSUMABLE', unit:'box', price:0, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'THCON', code:'CON-LIPO-FLO-KIT', name:'Lipo Flo Kit Set', type:'CONSUMABLE', unit:'piece', price:0, expiry:true, ctrl:false, minStock:3, reorder:5 },
  { cat:'THCON', code:'CON-GLOVE-NIT-M', name:'Nitrile Blue Exam Gloves Medium', type:'CONSUMABLE', unit:'box', price:0, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'THCON', code:'CON-SHOE-100S', name:'Shoe Covers (100s)', type:'CONSUMABLE', unit:'box', price:100, expiry:true, ctrl:false, minStock:3, reorder:5 },
  { cat:'THCON', code:'CON-DRAPE-SML', name:'Small Drapes', type:'CONSUMABLE', unit:'piece', price:700, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'THCON', code:'CON-CANI-250CC', name:'Sterile Canister 250cc Filtron', type:'CONSUMABLE', unit:'piece', price:0, expiry:true, ctrl:false, minStock:3, reorder:5 },
  { cat:'THCON', code:'CON-CANI-500CC', name:'Sterile Canister 500cc Filtron', type:'CONSUMABLE', unit:'piece', price:0, expiry:true, ctrl:false, minStock:3, reorder:5 },
  { cat:'THCON', code:'CON-GLOVE-STR', name:'Sterile Gloves', type:'CONSUMABLE', unit:'pair', price:200, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'THCON', code:'CON-SKIN-MKR', name:'Sterile Skin Marker with Ruler', type:'CONSUMABLE', unit:'piece', price:875, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'THCON', code:'CON-BLADE-G11', name:'Surgical Blade G11', type:'CONSUMABLE', unit:'piece', price:50, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'THCON', code:'CON-BLADE-G12', name:'Surgical Blade G12', type:'CONSUMABLE', unit:'piece', price:50, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'THCON', code:'CON-BLADE-G15', name:'Surgical Blade G15', type:'CONSUMABLE', unit:'piece', price:50, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'THCON', code:'CON-BLADE-G23', name:'Surgical Blade G23', type:'CONSUMABLE', unit:'piece', price:50, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'THCON', code:'CON-GOWN-STD', name:'Surgical Gowns', type:'CONSUMABLE', unit:'piece', price:800, expiry:true, ctrl:false, minStock:10, reorder:15 },
  { cat:'THCON', code:'CON-CAP-100S', name:'Theatre Caps Disposable (100s)', type:'CONSUMABLE', unit:'box', price:50, expiry:true, ctrl:false, minStock:3, reorder:5 },
  { cat:'THCON', code:'CON-MASK-3PLY', name:'Theatre Face Mask 3-Ply', type:'CONSUMABLE', unit:'piece', price:50, expiry:true, ctrl:false, minStock:20, reorder:30 },
  { cat:'THCON', code:'CON-DRAPE-UNIV', name:'Universal Drape', type:'CONSUMABLE', unit:'piece', price:4000, expiry:true, ctrl:false, minStock:5, reorder:8 },
  { cat:'THCON', code:'CON-GOWN-REINF-L', name:'Winner Reinforced Gown L', type:'CONSUMABLE', unit:'piece', price:0, expiry:true, ctrl:false, minStock:5, reorder:8 },
];

async function main() {
  console.log('[SEED] Starting production inventory seed from catalogue...');
  console.log(`[SEED] Total items to seed: ${ITEMS.length}`);

  // Clear dependent records first (order matters for FK constraints)
  console.log('[SEED] Clearing dependent records...');
  await prisma.surgicalBillingLineItem.deleteMany({ where: { inventory_item_id: { not: undefined } } });
  await prisma.surgicalCaseItem.deleteMany({ where: { inventory_item_id: { not: undefined } } });
  await prisma.surgicalMedicationRecord.deleteMany({ where: { inventory_item_id: { not: undefined } } });
  await prisma.inventoryUsage.deleteMany({});
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.inventoryBatch.deleteMany({});
  await prisma.goodsReceiptItem.deleteMany({ where: { inventory_item_id: { not: undefined } } });
  await prisma.purchaseOrderItem.deleteMany({ where: { inventory_item_id: { not: undefined } } });
  await prisma.stockAdjustment.deleteMany({ where: { inventory_item_id: { not: undefined } } });
  await prisma.casePlanPlannedItem.deleteMany({ where: { inventory_item_id: { not: undefined } } });

  // Now clear inventory items
  console.log('[SEED] Clearing existing inventory items...');
  await prisma.inventoryItem.deleteMany({});
  console.log('[SEED] Existing items cleared.');

  const itemsToCreate = ITEMS.map((item) => {
    const category = CATEGORY_MAP[item.cat] || InventoryCategory.OTHER;

    return {
      name: item.name,
      sku: item.code,
      category,
      description: null,
      unit_of_measure: item.unit,
      unit_cost: item.price,
      reorder_point: item.reorder,
      low_stock_threshold: item.minStock,
      supplier: null,
      is_active: true,
      is_billable: item.price > 0,
      is_implant: item.type === 'IMPLANT',
      manufacturer: null,
    };
  });

  // Create items in batches
  const batchSize = 50;
  let created = 0;

  for (let i = 0; i < itemsToCreate.length; i += batchSize) {
    const batch = itemsToCreate.slice(i, i + batchSize);
    await prisma.inventoryItem.createMany({ data: batch });
    created += batch.length;
    console.log(`[SEED] Created ${created}/${itemsToCreate.length} items...`);
  }

  console.log(`[SEED] Successfully seeded ${itemsToCreate.length} inventory items!`);

  // Print category summary
  const categorySummary = await prisma.inventoryItem.groupBy({
    by: ['category'],
    _count: { id: true },
  });

  console.log('\n[SEED] Inventory by Category:');
  for (const cat of categorySummary) {
    console.log(`  ${cat.category}: ${cat._count.id} items`);
  }

  // Print price summary
  const priced = itemsToCreate.filter(i => i.unit_cost > 0);
  const unpriced = itemsToCreate.filter(i => i.unit_cost === 0);
  console.log(`\n[SEED] Priced items: ${priced.length}`);
  console.log(`[SEED] Unpriced items (pending admin pricing): ${unpriced.length}`);

  // Print controlled substances
  const controlled = ITEMS.filter(i => i.ctrl);
  console.log(`[SEED] Controlled substances: ${controlled.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n[SEED] Done!');
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('[SEED] Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
