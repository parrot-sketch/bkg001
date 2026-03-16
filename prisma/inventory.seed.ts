/**
 * Prisma Inventory Seed Script
 * 
 * Seeds inventory with 209 medical supply items across 7 categories.
 * Replaces old/uncategorized data with properly organized inventory catalogue.
 * 
 * Run with: npx tsx prisma/inventory.seed.ts
 */

import { PrismaClient, InventoryCategory } from '@prisma/client';

const prisma = new PrismaClient();

interface CategorySeedData {
  name: string;
  code: string;
  description: string;
}

interface ItemSeedData {
  categoryCode: string;
  itemCode: string;
  name: string;
  itemType: 'MEDICATION' | 'CONSUMABLE' | 'IMPLANT' | 'EQUIPMENT';
  unit: string;
  sellingPrice: number;
  requiresExpiryDate: boolean;
  isControlledSubstance: boolean;
  minimumStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  storageLocation: string;
}

const CATEGORIES: CategorySeedData[] = [
  { name: 'Anaesthetic Agents',      code: 'ANAES',  description: 'General and regional anaesthetic drugs and agents' },
  { name: 'IV Medications',          code: 'IVMED',  description: 'Intravenous medications and injectable drugs' },
  { name: 'IV Fluids',               code: 'IVFLU',  description: 'Intravenous fluid solutions' },
  { name: 'Gases',                   code: 'GAS',    description: 'Medical gases — oxygen and nitrous oxide' },
  { name: 'Sutures',                 code: 'SUTR',   description: 'Surgical sutures, skin staples and wound closure' },
  { name: 'Dressings',               code: 'DRESS',  description: 'Wound dressings, ointments and topical treatments' },
  { name: 'Theater Consumables',     code: 'THCON',  description: 'Disposable items used in the operating theater' },
  { name: 'Airway Management',        code: 'AIRWY',  description: 'Endotracheal tubes, LMAs, airways and breathing circuits' },
  { name: 'IV Access & Syringes',    code: 'IVACC',  description: 'Cannulas, needles, syringes and IV administration sets' },
  { name: 'Catheters & Tubes',       code: 'CATH',   description: 'Urinary catheters, nasogastric tubes and drainage' },
  { name: 'Bandages & Tapes',        code: 'BANDT',  description: 'Bandages, tapes, compression and wound support' },
  { name: 'Aesthetics & Implants',  code: 'IMPL',   description: 'Aesthetic injectables, implants and skincare products' },
  { name: 'Diagnostics & Monitoring',code: 'DIAGN',  description: 'Diagnostic equipment and monitoring consumables' },
  { name: 'Sterilization & Cleaning',code: 'STERL',  description: 'Sterilization agents, cleaning products and waste management' },
  { name: 'Services',                code: 'SVC',    description: 'Billable service charges — not tracked as physical stock' },
];

const ITEMS: ItemSeedData[] = [
  { categoryCode:'ANAES', itemCode:'MED-PROP-20ML',      name:'Propofol Injection 1% 20ml',                   itemType:'MEDICATION',  unit:'vial',     sellingPrice:380,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Pharmacy - Anaesthetics Shelf' },
  { categoryCode:'ANAES', itemCode:'MED-KETA-RTX',       name:'Ketamine Injection (Rotex)',                   itemType:'MEDICATION',  unit:'vial',     sellingPrice:800,   requiresExpiryDate:true,  isControlledSubstance:true,  minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - Controlled Drugs Cabinet' },
  { categoryCode:'ANAES', itemCode:'MED-KETA-IND',       name:'Ketamine Injection (India)',                   itemType:'MEDICATION',  unit:'vial',     sellingPrice:420,   requiresExpiryDate:true,  isControlledSubstance:true,  minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - Controlled Drugs Cabinet' },
  { categoryCode:'ANAES', itemCode:'MED-FENT-100MCG',    name:'Fentanyl Injection 100mcg/2ml',                itemType:'MEDICATION',  unit:'pack',     sellingPrice:290,   requiresExpiryDate:true,  isControlledSubstance:true,  minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - Controlled Drugs Cabinet' },
  { categoryCode:'ANAES', itemCode:'MED-REMI-5MG',       name:'Remifentanil 5mg',                             itemType:'MEDICATION',  unit:'vial',     sellingPrice:2572,  requiresExpiryDate:true,  isControlledSubstance:true,  minimumStock:3,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Pharmacy - Controlled Drugs Cabinet' },
  { categoryCode:'ANAES', itemCode:'MED-PETH-100MG',     name:'Pethidine Injection 100mg/2ml',                itemType:'MEDICATION',  unit:'pack',     sellingPrice:290,   requiresExpiryDate:true,  isControlledSubstance:true,  minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - Controlled Drugs Cabinet' },
  { categoryCode:'ANAES', itemCode:'MED-MORPH-10MG',     name:'Morphine Injection 10mg',                      itemType:'MEDICATION',  unit:'pack',     sellingPrice:300,   requiresExpiryDate:true,  isControlledSubstance:true,  minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - Controlled Drugs Cabinet' },
  { categoryCode:'ANAES', itemCode:'MED-MIDAZ-STD',      name:'Midazolam',                                    itemType:'MEDICATION',  unit:'vial',     sellingPrice:450,   requiresExpiryDate:true,  isControlledSubstance:true,  minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - Controlled Drugs Cabinet' },
  { categoryCode:'ANAES', itemCode:'MED-SUXA-STD',       name:'Suxamethonium Injection',                      itemType:'MEDICATION',  unit:'vial',     sellingPrice:200,   requiresExpiryDate:true,  isControlledSubstance:true,  minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - Anaesthetics Shelf' },
  { categoryCode:'ANAES', itemCode:'MED-ATRA-10MG',      name:'Atracurium Injection 10mg/ml/5ml',             itemType:'MEDICATION',  unit:'vial',     sellingPrice:650,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - Anaesthetics Shelf' },
  { categoryCode:'ANAES', itemCode:'MED-BUPI-5ML',       name:'Bupivacaine Plain Injection 5ml',              itemType:'MEDICATION',  unit:'vial',     sellingPrice:420,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:30, storageLocation:'Pharmacy - Anaesthetics Shelf' },
  { categoryCode:'ANAES', itemCode:'MED-MARC-HVY',       name:'Heavy Marcaine',                               itemType:'MEDICATION',  unit:'vial',     sellingPrice:1062,  requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - Anaesthetics Shelf' },
  { categoryCode:'ANAES', itemCode:'MED-LIGNO-2-30ML',   name:'Lignocaine Injection 2% 30ml',                 itemType:'MEDICATION',  unit:'vial',     sellingPrice:100,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:30, storageLocation:'Pharmacy - Anaesthetics Shelf' },
  { categoryCode:'ANAES', itemCode:'MED-LIGNO-ADR-30ML', name:'Lignocaine with Adrenaline 30ml',              itemType:'MEDICATION',  unit:'vial',     sellingPrice:150,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:30, storageLocation:'Pharmacy - Anaesthetics Shelf' },
  { categoryCode:'ANAES', itemCode:'MED-SEVO-STD',       name:'Sevoflurane',                                  itemType:'MEDICATION',  unit:'unit',     sellingPrice:100,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:2,  reorderPoint:3,  reorderQuantity:5,  storageLocation:'Theater Store - Volatile Agents' },
  { categoryCode:'ANAES', itemCode:'MED-ISO-STD',        name:'Isoflurane',                                   itemType:'MEDICATION',  unit:'unit',     sellingPrice:35,    requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:2,  reorderPoint:3,  reorderQuantity:5,  storageLocation:'Theater Store - Volatile Agents' },
  { categoryCode:'ANAES', itemCode:'MED-ACTR-100IU',     name:'Actrapid 100IU 10ml (Human Insulin)',          itemType:'MEDICATION',  unit:'vial',     sellingPrice:1200,  requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Pharmacy - Refrigerator' },
  { categoryCode:'ANAES', itemCode:'MED-NEOS-STD',       name:'Neostigmine',                                  itemType:'MEDICATION',  unit:'vial',     sellingPrice:120,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - Anaesthetics Shelf' },
  { categoryCode:'ANAES', itemCode:'MED-NALOX-04MCG',    name:'Naloxone 0.4mcg',                              itemType:'MEDICATION',  unit:'pack',     sellingPrice:1020,  requiresExpiryDate:true,  isControlledSubstance:true,  minimumStock:3,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Pharmacy - Controlled Drugs Cabinet' },
  { categoryCode:'ANAES', itemCode:'MED-EPHED-STD',      name:'Ephedrine',                                    itemType:'MEDICATION',  unit:'vial',     sellingPrice:300,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - Anaesthetics Shelf' },
  { categoryCode:'ANAES', itemCode:'MED-SODA-4-5KG',     name:'Soda Lime 4.5kg',                              itemType:'CONSUMABLE',  unit:'bag',      sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:2,  reorderPoint:3,  reorderQuantity:5,  storageLocation:'Theater Store' },

  { categoryCode:'IVMED', itemCode:'MED-ONDA-4ML',       name:'Ondansetron Injection 4ml',                    itemType:'MEDICATION',  unit:'vial',     sellingPrice:975,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:30, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-PARA-IV-100ML',  name:'Paracetamol IV 100ml',                         itemType:'MEDICATION',  unit:'bottle',   sellingPrice:300,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:30, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-DEX-4MG',        name:'Dexamethasone Injection 4mg/1ml',              itemType:'MEDICATION',  unit:'vial',     sellingPrice:100,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:30, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-DICL-75MG',      name:'Diclofenac Injection 75mg/3ml',                itemType:'MEDICATION',  unit:'vial',     sellingPrice:240,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:30, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-KETE-50MG',      name:'Ketesse Injection 50mg',                       itemType:'MEDICATION',  unit:'vial',     sellingPrice:415,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-METO-1ML',       name:'Metoclopramide Injection 1ml',                 itemType:'MEDICATION',  unit:'vial',     sellingPrice:50,    requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:30, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-TRAM-100MG',     name:'Tramadol Injection 100mg/2ml',                 itemType:'MEDICATION',  unit:'pack',     sellingPrice:435,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-TXA-500MG',      name:'Tranexamic Acid Injection 500mg',              itemType:'MEDICATION',  unit:'vial',     sellingPrice:300,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:30, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-HYDRO-STD',      name:'Hydrocortisone Injection',                     itemType:'MEDICATION',  unit:'vial',     sellingPrice:140,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-SOLUM-500MG',    name:'Solumedrol Injection 500mg',                   itemType:'MEDICATION',  unit:'vial',     sellingPrice:0,     requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:15, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-CEFU-750MG',     name:'Cefuroxime Injection 750mg',                   itemType:'MEDICATION',  unit:'vial',     sellingPrice:460,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:30, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-FLAGY-STD',      name:'Flagyl (Metronidazole)',                       itemType:'MEDICATION',  unit:'vial',     sellingPrice:300,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:30, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-ESOME-40MG',     name:'Esomeprazole Injection 40mg',                  itemType:'MEDICATION',  unit:'vial',     sellingPrice:560,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-HEPA-5000IU',    name:'Heparin Sodium 5000IU/ml',                     itemType:'MEDICATION',  unit:'vial',     sellingPrice:1350,  requiresExpiryDate:true,  isControlledSubstance:true,  minimumStock:5,  reorderPoint:8,  reorderQuantity:15, storageLocation:'Pharmacy - Controlled Drugs Cabinet' },
  { categoryCode:'IVMED', itemCode:'MED-LASIX-20MG',     name:'Lasix 20mg',                                   itemType:'MEDICATION',  unit:'vial',     sellingPrice:350,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-KCL-15-10ML',    name:'Potassium Chloride 1.5/10ml',                  itemType:'MEDICATION',  unit:'vial',     sellingPrice:170,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:30, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-CALC-10ML',      name:'Calcium Gluconate Injection 10ml',             itemType:'MEDICATION',  unit:'vial',     sellingPrice:140,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:30, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-MGS-50-10ML',    name:'Magnesium Sulphate 50% IV 10ml',               itemType:'MEDICATION',  unit:'vial',     sellingPrice:260,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-ADREN-1ML',      name:'Adrenaline Injection 1ml',                     itemType:'MEDICATION',  unit:'vial',     sellingPrice:50,    requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:30, storageLocation:'Pharmacy - Emergency Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-ATRO-1ML',       name:'Atropine Injection 1ml',                       itemType:'MEDICATION',  unit:'vial',     sellingPrice:50,    requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:30, storageLocation:'Pharmacy - Emergency Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-CLEX-STD',       name:'Clexane Injection',                            itemType:'MEDICATION',  unit:'vial',     sellingPrice:4700,  requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:15, storageLocation:'Pharmacy - Refrigerator' },
  { categoryCode:'IVMED', itemCode:'MED-HAEM-STD',       name:'Haemacel',                                     itemType:'MEDICATION',  unit:'bottle',   sellingPrice:1300,  requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:15, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-VOLU-STD',       name:'Voluven',                                      itemType:'MEDICATION',  unit:'bottle',   sellingPrice:2000,  requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:15, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-PIRI-STD',       name:'Piriton / Chlorphenamine',                     itemType:'MEDICATION',  unit:'vial',     sellingPrice:100,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-ACUP-STD',       name:'Acupan',                                       itemType:'MEDICATION',  unit:'vial',     sellingPrice:600,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-HALO-STD',       name:'Haloperidol',                                  itemType:'MEDICATION',  unit:'vial',     sellingPrice:200,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-GENTA-80MG',     name:'Gentamycin Injection 80mg/2ml',                itemType:'MEDICATION',  unit:'vial',     sellingPrice:36,    requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:30, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-TRIAM-40MG',     name:'Triamcinolone / Triam Denk 40mg',              itemType:'MEDICATION',  unit:'vial',     sellingPrice:1140,  requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:15, storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-SEMA-4MG',       name:'Semaglutide Injection 4mg/3ml (Ozempic)',      itemType:'MEDICATION',  unit:'pen',      sellingPrice:0,     requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:2,  reorderPoint:3,  reorderQuantity:5,  storageLocation:'Pharmacy - Refrigerator' },
  { categoryCode:'IVMED', itemCode:'MED-SEMA-14MG',      name:'Semaglutide 14mg',                             itemType:'MEDICATION',  unit:'unit',     sellingPrice:0,     requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:2,  reorderPoint:3,  reorderQuantity:5,  storageLocation:'Pharmacy - Refrigerator' },
  { categoryCode:'IVMED', itemCode:'MED-HYALU-STD',      name:'Hyaluronidase',                                itemType:'MEDICATION',  unit:'vial',     sellingPrice:0,     requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:15, storageLocation:'Pharmacy - Refrigerator' },
  { categoryCode:'IVMED', itemCode:'MED-WFI-10ML',       name:'Water for Injection 10ml',                     itemType:'MEDICATION',  unit:'vial',     sellingPrice:15,    requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:20, reorderPoint:30, reorderQuantity:100,storageLocation:'Pharmacy - General Shelf' },
  { categoryCode:'IVMED', itemCode:'MED-FORM-5L',        name:'Formaline Solution 5L',                        itemType:'MEDICATION',  unit:'bottle',   sellingPrice:100,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:2,  reorderPoint:3,  reorderQuantity:5,  storageLocation:'Pharmacy - Hazardous Storage' },

  { categoryCode:'IVFLU', itemCode:'FLU-NS-500ML',       name:'Normal Saline 500ml',                          itemType:'MEDICATION',  unit:'bag',      sellingPrice:140,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:20, reorderPoint:30, reorderQuantity:100,storageLocation:'Pharmacy - Fluids Store' },
  { categoryCode:'IVFLU', itemCode:'FLU-D10-500ML',      name:'Dextrose 10% 500ml',                           itemType:'MEDICATION',  unit:'bag',      sellingPrice:140,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Pharmacy - Fluids Store' },
  { categoryCode:'IVFLU', itemCode:'FLU-D50-100ML',      name:'Dextrose 50% 100ml',                           itemType:'MEDICATION',  unit:'bag',      sellingPrice:180,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Pharmacy - Fluids Store' },
  { categoryCode:'IVFLU', itemCode:'FLU-DNS-500ML',      name:'Dextrose Normal Saline (DNS) 500ml',           itemType:'MEDICATION',  unit:'bag',      sellingPrice:140,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Pharmacy - Fluids Store' },
  { categoryCode:'IVFLU', itemCode:'FLU-RL-500ML',       name:'Ringers Lactate / Hartmanns 500ml',            itemType:'MEDICATION',  unit:'bag',      sellingPrice:140,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:20, reorderPoint:30, reorderQuantity:100,storageLocation:'Pharmacy - Fluids Store' },
  { categoryCode:'IVFLU', itemCode:'FLU-MANN-20-500ML',  name:'Mannitol 20% IV 500ml',                        itemType:'MEDICATION',  unit:'bag',      sellingPrice:1600,  requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Pharmacy - Fluids Store' },

  { categoryCode:'GAS',   itemCode:'GAS-OXY-8-5M3',      name:'Medical Oxygen 8.5m³',                         itemType:'CONSUMABLE',  unit:'cylinder', sellingPrice:20,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:3,  reorderPoint:5,  reorderQuantity:5,  storageLocation:'Medical Gas Store' },
  { categoryCode:'GAS',   itemCode:'GAS-N2O-30KG',        name:'Nitrous Gas 30kg',                             itemType:'CONSUMABLE',  unit:'cylinder', sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:2,  reorderPoint:3,  reorderQuantity:3,  storageLocation:'Medical Gas Store' },

  { categoryCode:'SUTR',  itemCode:'SUTR-VIC-1',          name:'Vicryl 1',                                     itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:400,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-VIC-2',          name:'Vicryl 2',                                     itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:400,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-VIC-2-0',        name:'Vicryl 2.0',                                   itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:400,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-VIC-3-0',        name:'Vicryl 3.0',                                   itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:400,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-VIC-4-0',        name:'Vicryl 4.0',                                   itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:400,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-VIC-5-0',        name:'Vicryl 5.0',                                   itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:400,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-PROL-2-0',       name:'Prolene 2.0',                                  itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:0,     requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-PROL-3-0',       name:'Prolene 3.0',                                  itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:0,     requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-PROL-4-0',       name:'Prolene 4.0',                                  itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:0,     requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-PROL-5-0',       name:'Prolene 5.0',                                  itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:0,     requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-MONO-2-0',       name:'Monocryl 2.0',                                 itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:400,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-MONO-3-0',       name:'Monocryl 3.0',                                 itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:400,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-MONO-4-0',       name:'Monocryl 4.0',                                 itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:400,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-NYL-2-0',        name:'Nylon 2.0',                                    itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:400,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-NYL-3-0',        name:'Nylon 3.0',                                    itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:400,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-NYL-4-0',        name:'Nylon 4.0',                                    itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:400,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-NYL-5-0',        name:'Nylon 5.0',                                    itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:400,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-NYL-10-0',       name:'Nylon 10/0 30cm',                              itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:0,     requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-NYL-LOOP-1',     name:'Nylon Loop 1',                                 itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:0,     requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-PDS-LOOP-1',     name:'PDS Loop 1',                                   itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:1030,  requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-SYNTH-2-0',      name:'Synthabs / Monocryl 3/0 90cm',                 itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:0,     requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-STAP-STD',       name:'Skin Staples',                                 itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:1200,  requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store - Sutures' },
  { categoryCode:'SUTR',  itemCode:'SUTR-STAP-RMV',       name:'Staple Remover',                               itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:1500,  requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store - Sutures' },

  { categoryCode:'DRESS', itemCode:'DRESS-LEUK-8-15',     name:'Leukomed 8cm x 15cm (50s)',                    itemType:'CONSUMABLE',  unit:'box',      sellingPrice:140,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Ward Store - Dressings' },
  { categoryCode:'DRESS', itemCode:'DRESS-LEUK-10-25',    name:'Leukomed 10cm x 25cm (50s)',                   itemType:'CONSUMABLE',  unit:'box',      sellingPrice:300,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Ward Store - Dressings' },
  { categoryCode:'DRESS', itemCode:'DRESS-LEUKTP-8-15',   name:'Leukomed T Plus 8cm x 15cm (50s)',             itemType:'CONSUMABLE',  unit:'box',      sellingPrice:200,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Ward Store - Dressings' },
  { categoryCode:'DRESS', itemCode:'DRESS-LEUKTP-10-25',  name:'Leukomed T Plus 10cm x 25cm (50s)',            itemType:'CONSUMABLE',  unit:'box',      sellingPrice:355,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Ward Store - Dressings' },
  { categoryCode:'DRESS', itemCode:'DRESS-BACT-10-10',    name:'Bactigrass 10cm x 10cm',                       itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:150,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Ward Store - Dressings' },
  { categoryCode:'DRESS', itemCode:'DRESS-BACT-10-40',    name:'Bactigrass 10cm x 40cm',                       itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:210,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Ward Store - Dressings' },
  { categoryCode:'DRESS', itemCode:'DRESS-PYN-10-10',     name:'Pynodine 10cm x 10cm',                         itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:100,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Ward Store - Dressings' },
  { categoryCode:'DRESS', itemCode:'DRESS-PYN-10-40',     name:'Pynodine 10cm x 40cm',                         itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:300,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Ward Store - Dressings' },
  { categoryCode:'DRESS', itemCode:'DRESS-AQUA-STD',      name:'Aquacel',                                      itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:3870,  requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Ward Store - Dressings' },
  { categoryCode:'DRESS', itemCode:'DRESS-HYPO-5-8',      name:'Hypodress 5x8',                                itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:80,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Ward Store - Dressings' },
  { categoryCode:'DRESS', itemCode:'DRESS-MEBO-STD',      name:'MEBO Herbal Ointment',                         itemType:'CONSUMABLE',  unit:'tube',     sellingPrice:1940,  requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:3,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Ward Store - Dressings' },
  { categoryCode:'DRESS', itemCode:'DRESS-PACK-STD',      name:'Dressing Pack (Sterile)',                      itemType:'CONSUMABLE',  unit:'pack',     sellingPrice:500,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Ward Store - Dressings' },
  { categoryCode:'DRESS', itemCode:'DRESS-PADS-STD',      name:'Pads',                                         itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:100,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:20, reorderPoint:30, reorderQuantity:100,storageLocation:'Ward Store - Dressings' },
  { categoryCode:'DRESS', itemCode:'DRESS-ZUPR-STD',      name:'Zupricin Ointment',                            itemType:'CONSUMABLE',  unit:'tube',     sellingPrice:1660,  requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:3,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Pharmacy - Topicals' },
  { categoryCode:'DRESS', itemCode:'DRESS-MUPIR-STD',     name:'Mupirzed Ointment',                            itemType:'CONSUMABLE',  unit:'tube',     sellingPrice:1200,  requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:3,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Pharmacy - Topicals' },
  { categoryCode:'DRESS', itemCode:'DRESS-BETA-125ML',    name:'Betadine Antiseptic 125ml',                    itemType:'CONSUMABLE',  unit:'bottle',   sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Ward Store - Dressings' },
  { categoryCode:'DRESS', itemCode:'DRESS-ABD-STR',       name:'Sterile Abdominal Packs',                      itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:980,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store' },

  { categoryCode:'THCON', itemCode:'CON-ABD-PACK',        name:'Abdominal Packs',                              itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:200,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:20, reorderPoint:30, reorderQuantity:100,storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-DRAPE-UNIV',      name:'Universal Drape',                              itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:4000,  requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-DRAPE-SML',       name:'Small Drapes',                                 itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:700,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-GOWN-STD',        name:'Surgical Gowns',                               itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:800,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-GOWN-REINF-L',    name:'Winner Reinforced Gown L',                     itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-CAP-100S',        name:'Theatre Caps Disposable (100s)',               itemType:'CONSUMABLE',  unit:'box',      sellingPrice:50,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:3,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-MASK-3PLY',       name:'Theatre Face Mask 3-Ply',                      itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:50,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:20, reorderPoint:30, reorderQuantity:100,storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-SHOE-100S',       name:'Shoe Covers (100s)',                           itemType:'CONSUMABLE',  unit:'box',      sellingPrice:100,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:3,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-GLOVE-STR',       name:'Sterile Gloves',                               itemType:'CONSUMABLE',  unit:'pair',     sellingPrice:200,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:20, reorderPoint:30, reorderQuantity:100,storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-GLOVE-CLN',       name:'Clean Gloves (box)',                           itemType:'CONSUMABLE',  unit:'box',      sellingPrice:1000,  requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-GLOVE-LATEX-PF',  name:'Latex Powder Free Exam Gloves',                itemType:'CONSUMABLE',  unit:'box',      sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-GLOVE-GAMX-75',   name:'Gammex Latex Surgical Gloves 7.5',             itemType:'CONSUMABLE',  unit:'pair',     sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-GLOVE-NIT-M',     name:'Nitrile Blue Exam Gloves Medium',              itemType:'CONSUMABLE',  unit:'box',      sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-BLADE-G11',       name:'Surgical Blade G11',                           itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:50,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-BLADE-G12',       name:'Surgical Blade G12',                           itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:50,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-BLADE-G15',       name:'Surgical Blade G15',                           itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:50,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-BLADE-G23',       name:'Surgical Blade G23',                           itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:50,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-DIATX-PENCIL',    name:'Diathermy Pencil',                             itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:350,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-DRAIN-STD',       name:'Drain',                                        itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:2100,  requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-ECG-ELEC',        name:'EGG Electrodes ECG',                           itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:90,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:20, reorderPoint:30, reorderQuantity:100,storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-SKIN-MKR',        name:'Sterile Skin Marker with Ruler',               itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:875,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-AUTOCLV-TAPE',    name:'Autoclove Tape 1850',                          itemType:'CONSUMABLE',  unit:'roll',     sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:3,  reorderPoint:5,  reorderQuantity:10, storageLocation:'CSSD' },
  { categoryCode:'THCON', itemCode:'CON-LIPO-FLO-KIT',    name:'Lipo Flo Kit Set',                             itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:3,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-HEPA-LIPO',       name:'Hepa Filter for Liposuction',                  itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:3,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-CANI-250CC',      name:'Sterile Canister 250cc Filtron',               itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:3,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-CANI-500CC',      name:'Sterile Canister 500cc Filtron',               itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:3,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-FLEX-PLATE',      name:'Flexoplate',                                   itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:3,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-GAUZE-STD',       name:'Gauze',                                        itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:20,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:50, reorderPoint:80, reorderQuantity:200,storageLocation:'Theater Store' },
  { categoryCode:'THCON', itemCode:'CON-GAUZE-ROLL',      name:'Gauze Roll 90cm x 90 yards',                   itemType:'CONSUMABLE',  unit:'roll',     sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store' },

  { categoryCode:'AIRWY', itemCode:'AIR-ETT-CUFF-65',     name:'Endotracheal Tube Cuffed 6.5',                 itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:200,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store - Airway' },
  { categoryCode:'AIRWY', itemCode:'AIR-ETT-CUFF-7',      name:'Endotracheal Tube Cuffed 7',                   itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:200,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store - Airway' },
  { categoryCode:'AIRWY', itemCode:'AIR-ETT-PLAIN-45',    name:'Endotracheal Tube Plain 4.5',                  itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:200,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store - Airway' },
  { categoryCode:'AIRWY', itemCode:'AIR-LMA-STD',         name:'LMA (Laryngeal Mask Airway)',                   itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:440,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store - Airway' },
  { categoryCode:'AIRWY', itemCode:'AIR-LARYN-STD',       name:'Laryngeal Airway',                             itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:7000,  requiresExpiryDate:false, isControlledSubstance:false, minimumStock:2,  reorderPoint:3,  reorderQuantity:5,  storageLocation:'Theater Store - Airway' },
  { categoryCode:'AIRWY', itemCode:'AIR-GUED-STD',        name:'Airway Guedel',                                itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:435,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store - Airway' },
  { categoryCode:'AIRWY', itemCode:'AIR-FILT-HME',        name:'Bacterial Filter (HME)',                       itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:870,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store - Airway' },
  { categoryCode:'AIRWY', itemCode:'AIR-FILT-HMEF',       name:'Breathing Filter (HMEF) Adult',                itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Theater Store - Airway' },
  { categoryCode:'AIRWY', itemCode:'AIR-CATH-MNT',        name:'Catheter Mount',                               itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:870,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store - Airway' },
  { categoryCode:'AIRWY', itemCode:'AIR-MASK-NRB',        name:'Non-Rebreathing Mask Paediatric/Adult',        itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:300,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:8,  reorderQuantity:20, storageLocation:'Theater Store - Airway' },
  { categoryCode:'AIRWY', itemCode:'AIR-NASAL-PRNG',      name:'Nasal Prongs',                                 itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:300,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Ward Store' },
  { categoryCode:'AIRWY', itemCode:'AIR-SUCT-6',          name:'Suction Catheter Size 6',                      itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:100,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Ward Store' },
  { categoryCode:'AIRWY', itemCode:'AIR-SUCT-10',         name:'Suction Catheter Size 10',                     itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:100,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Ward Store' },
  { categoryCode:'AIRWY', itemCode:'AIR-SUCT-12',         name:'Suction Catheter Size 12',                     itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:100,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Ward Store' },
  { categoryCode:'AIRWY', itemCode:'AIR-SUCT-16',         name:'Suction Catheter Size 16',                     itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:100,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:50, storageLocation:'Ward Store' },

  { categoryCode:'IVACC', itemCode:'IVAC-CAN-18G',        name:'IV Cannula 18G',                               itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:50,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:20, reorderPoint:30, reorderQuantity:100,storageLocation:'Pharmacy - IV Supplies' },
  { categoryCode:'IVACC', itemCode:'IVAC-CAN-20G',        name:'IV Cannula 20G',                               itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:50,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:20, reorderPoint:30, reorderQuantity:100,storageLocation:'Pharmacy - IV Supplies' },
  { categoryCode:'IVACC', itemCode:'IVAC-CAN-22G',        name:'IV Cannula 22G',                               itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:50,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:20, reorderPoint:30, reorderQuantity:100,storageLocation:'Pharmacy - IV Supplies' },
  { categoryCode:'IVACC', itemCode:'IVAC-CAN-24G',        name:'IV Cannula 24G',                               itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:50,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:20, reorderPoint:30, reorderQuantity:100,storageLocation:'Pharmacy - IV Supplies' },
  { categoryCode:'IVACC', itemCode:'IVAC-SYR-1ML',        name:'Syringe 1ml',                                  itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:10,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:50, reorderPoint:100, reorderQuantity:200,storageLocation:'Pharmacy - IV Supplies' },
  { categoryCode:'IVACC', itemCode:'IVAC-SYR-2ML',        name:'Syringe 2ml',                                  itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:10,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:50, reorderPoint:100, reorderQuantity:200,storageLocation:'Pharmacy - IV Supplies' },
  { categoryCode:'IVACC', itemCode:'IVAC-SYR-5ML',        name:'Syringe 5ml',                                  itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:15,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:50, reorderPoint:100, reorderQuantity:200,storageLocation:'Pharmacy - IV Supplies' },
  { categoryCode:'IVACC', itemCode:'IVAC-SYR-10ML',        name:'Syringe 10ml',                                 itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:20,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:50, reorderPoint:100, reorderQuantity:200,storageLocation:'Pharmacy - IV Supplies' },
  { categoryCode:'IVACC', itemCode:'IVAC-SYR-20ML',        name:'Syringe 20ml',                                 itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:25,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:50, reorderPoint:100, reorderQuantity:200,storageLocation:'Pharmacy - IV Supplies' },
  { categoryCode:'IVACC', itemCode:'IVAC-SYR-50ML',        name:'Syringe 50ml',                                 itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:35,    requiresExpiryDate:false, isControlledSubstance:false, minimumStock:30, reorderPoint:50, reorderQuantity:100,storageLocation:'Pharmacy - IV Supplies' },
  { categoryCode:'IVACC', itemCode:'IVAC-NEED-18G',        name:'Needle 18G',                                   itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:5,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:100, reorderPoint:200, reorderQuantity:500,storageLocation:'Pharmacy - IV Supplies' },
  { categoryCode:'IVACC', itemCode:'IVAC-NEED-21G',        name:'Needle 21G',                                   itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:5,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:100, reorderPoint:200, reorderQuantity:500,storageLocation:'Pharmacy - IV Supplies' },
  { categoryCode:'IVACC', itemCode:'IVAC-NEED-23G',        name:'Needle 23G',                                   itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:5,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:100, reorderPoint:200, reorderQuantity:500,storageLocation:'Pharmacy - IV Supplies' },
  { categoryCode:'IVACC', itemCode:'IVAC-NEED-25G',        name:'Needle 25G',                                   itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:5,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:100, reorderPoint:200, reorderQuantity:500,storageLocation:'Pharmacy - IV Supplies' },
  { categoryCode:'IVACC', itemCode:'IVAC-STAR-80',         name:'Starflow 80',                                   itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:2000,  requiresExpiryDate:false, isControlledSubstance:false, minimumStock:2,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Pharmacy - IV Supplies' },

  { categoryCode:'CATH', itemCode:'CATH-URINE-12',        name:'Urinary Catheter 12FG',                         itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:150,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:20, reorderQuantity:50, storageLocation:'Ward Store' },
  { categoryCode:'CATH', itemCode:'CATH-URINE-14',        name:'Urinary Catheter 14FG',                         itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:150,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:20, reorderQuantity:50, storageLocation:'Ward Store' },
  { categoryCode:'CATH', itemCode:'CATH-URINE-16',        name:'Urinary Catheter 16FG',                         itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:150,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:20, reorderQuantity:50, storageLocation:'Ward Store' },
  { categoryCode:'CATH', itemCode:'CATH-URINE-18',        name:'Urinary Catheter 18FG',                         itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:150,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:20, reorderQuantity:50, storageLocation:'Ward Store' },
  { categoryCode:'CATH', itemCode:'CATH-NG-10',           name:'Nasogastric Tube 10FG',                        itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:200,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:20, reorderQuantity:50, storageLocation:'Ward Store' },
  { categoryCode:'CATH', itemCode:'CATH-NG-12',           name:'Nasogastric Tube 12FG',                        itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:200,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:20, reorderQuantity:50, storageLocation:'Ward Store' },
  { categoryCode:'CATH', itemCode:'CATH-NG-14',           name:'Nasogastric Tube 14FG',                        itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:200,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:20, reorderQuantity:50, storageLocation:'Ward Store' },
  { categoryCode:'CATH', itemCode:'CATH-NG-16',           name:'Nasogastric Tube 16FG',                        itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:200,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:20, reorderQuantity:50, storageLocation:'Ward Store' },
  { categoryCode:'CATH', itemCode:'CATH-LEG-BAG',         name:'Leg Bag',                                       itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:300,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:30, storageLocation:'Ward Store' },

  { categoryCode:'IMPL',  itemCode:'IMPL-BREAST-300',     name:'Silicone Breast Implant 300cc',                 itemType:'IMPLANT',     unit:'unit',     sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:2,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Implant Store' },
  { categoryCode:'IMPL',  itemCode:'IMPL-BREAST-350',     name:'Silicone Breast Implant 350cc',                 itemType:'IMPLANT',     unit:'unit',     sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:2,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Implant Store' },
  { categoryCode:'IMPL',  itemCode:'IMPL-BREAST-400',     name:'Silicone Breast Implant 400cc',                 itemType:'IMPLANT',     unit:'unit',     sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:2,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Implant Store' },
  { categoryCode:'IMPL',  itemCode:'IMPL-BOTOX-100',      name:'Botox 100 Units',                              itemType:'IMPLANT',     unit:'vial',     sellingPrice:45000,  requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:1,  reorderPoint:2,  reorderQuantity:5,  storageLocation:'Pharmacy - Refrigerator' },
  { categoryCode:'IMPL',  itemCode:'IMPL-DYSPORT-500',    name:'Dysport 500 Units',                            itemType:'IMPLANT',     unit:'vial',     sellingPrice:35000,  requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:1,  reorderPoint:2,  reorderQuantity:5,  storageLocation:'Pharmacy - Refrigerator' },
  { categoryCode:'IMPL',  itemCode:'IMPL-FILLER-L',       name:'Dermal Filler Large',                         itemType:'IMPLANT',     unit:'ml',       sellingPrice:15000,  requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:2,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Pharmacy - Refrigerator' },
  { categoryCode:'IMPL',  itemCode:'IMPL-FILLER-M',       name:'Dermal Filler Medium',                        itemType:'IMPLANT',     unit:'ml',       sellingPrice:10000,  requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:2,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Pharmacy - Refrigerator' },
  { categoryCode:'IMPL',  itemCode:'IMPL-FILLER-S',       name:'Dermal Filler Small',                         itemType:'IMPLANT',     unit:'ml',       sellingPrice:8000,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:2,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Pharmacy - Refrigerator' },
  { categoryCode:'IMPL',  itemCode:'IMPL-PROFHILO',       name:'Profhilo',                                     itemType:'IMPLANT',     unit:'ml',       sellingPrice:25000,  requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:1,  reorderPoint:3,  reorderQuantity:5,  storageLocation:'Pharmacy - Refrigerator' },
  { categoryCode:'IMPL',  itemCode:'IMPL-PRP-KIT',        name:'PRP Kit',                                      itemType:'IMPLANT',     unit:'kit',      sellingPrice:10000,  requiresExpiryDate:false, isControlledSubstance:false, minimumStock:2,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Theater Store' },
  { categoryCode:'IMPL',  itemCode:'IMPL-SCA-EXT',        name:'Scalp Expansion',                              itemType:'IMPLANT',     unit:'unit',     sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:1,  reorderPoint:2,  reorderQuantity:3,  storageLocation:'Implant Store' },
  { categoryCode:'IMPL',  itemCode:'IMPL-MESH-STD',       name:'Surgical Mesh',                                itemType:'IMPLANT',     unit:'sheet',    sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:2,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Implant Store' },
  { categoryCode:'IMPL',  itemCode:'IMPL-CHIN-IMP',       name:'Chin Implant',                                itemType:'IMPLANT',     unit:'unit',     sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:1,  reorderPoint:2,  reorderQuantity:3,  storageLocation:'Implant Store' },
  { categoryCode:'IMPL',  itemCode:'IMPL-NOSE-IMP',       name:'Nose Implant',                                itemType:'IMPLANT',     unit:'unit',     sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:1,  reorderPoint:2,  reorderQuantity:3,  storageLocation:'Implant Store' },

  { categoryCode:'DIAGN', itemCode:'DIAG-STRIP-BG',       name:'Blood Glucose Test Strips',                    itemType:'CONSUMABLE',  unit:'box',      sellingPrice:500,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:20, reorderQuantity:50, storageLocation:'Pharmacy - Diagnostics' },
  { categoryCode:'DIAGN', itemCode:'DIAG-MACHINE-BG',      name:'Blood Glucose Meter',                          itemType:'CONSUMABLE',  unit:'unit',     sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:2,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Pharmacy - Diagnostics' },
  { categoryCode:'DIAGN', itemCode:'DIAG-LANCETS',        name:'Lancets',                                      itemType:'CONSUMABLE',  unit:'box',      sellingPrice:200,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:20, reorderQuantity:50, storageLocation:'Pharmacy - Diagnostics' },
  { categoryCode:'DIAGN', itemCode:'DIAG-URINE-STRIP',    name:'Urine Test Strips',                            itemType:'CONSUMABLE',  unit:'box',      sellingPrice:400,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:10, reorderPoint:20, reorderQuantity:50, storageLocation:'Pharmacy - Diagnostics' },
  { categoryCode:'DIAGN', itemCode:'DIAG-PREG-TEST',       name:'Pregnancy Test',                               itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:200,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:20, reorderPoint:30, reorderQuantity:50, storageLocation:'Pharmacy - Diagnostics' },
  { categoryCode:'DIAGN', itemCode:'DIAG-COVID-AG',        name:'COVID-19 Antigen Test',                        itemType:'CONSUMABLE',  unit:'piece',    sellingPrice:500,   requiresExpiryDate:true,  isControlledSubstance:false, minimumStock:20, reorderPoint:30, reorderQuantity:50, storageLocation:'Pharmacy - Diagnostics' },
  { categoryCode:'DIAGN', itemCode:'DIAG-BP-MONITOR',      name:'Blood Pressure Monitor',                       itemType:'CONSUMABLE',  unit:'unit',     sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:2,  reorderPoint:5,  reorderQuantity:10, storageLocation:'Pharmacy - Diagnostics' },
  { categoryCode:'DIAGN', itemCode:'DIAG-PULSE-OX',       name:'Pulse Oximeter',                               itemType:'CONSUMABLE',  unit:'unit',     sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'Pharmacy - Diagnostics' },
  { categoryCode:'DIAGN', itemCode:'DIAG-THERM-DIG',       name:'Digital Thermometer',                          itemType:'CONSUMABLE',  unit:'unit',     sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:20, reorderQuantity:30, storageLocation:'Pharmacy - Diagnostics' },

  { categoryCode:'STERL', itemCode:'STERL-SCRUB-500ML',    name:'Surgical Scrub 500ml',                         itemType:'CONSUMABLE',  unit:'bottle',   sellingPrice:300,   requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:15, reorderQuantity:30, storageLocation:'CSSD' },
  { categoryCode:'STERL', itemCode:'STERL-SCRUB-5L',      name:'Surgical Scrub 5L',                           itemType:'CONSUMABLE',  unit:'bottle',   sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'CSSD' },
  { categoryCode:'STERL', itemCode:'STERL-GLUT-2L',       name:'Glutaraldehyde 2L',                           itemType:'CONSUMABLE',  unit:'bottle',   sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:3,  reorderPoint:5,  reorderQuantity:10, storageLocation:'CSSD' },
  { categoryCode:'STERL', itemCode:'STERL-INDICATOR',     name:'Sterilization Indicator Strips',               itemType:'CONSUMABLE',  unit:'box',      sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'CSSD' },
  { categoryCode:'STERL', itemCode:'STERL-POUCH-S',       name:'Sterilization Pouch Small',                   itemType:'CONSUMABLE',  unit:'box',      sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:20, reorderQuantity:50, storageLocation:'CSSD' },
  { categoryCode:'STERL', itemCode:'STERL-POUCH-M',       name:'Sterilization Pouch Medium',                  itemType:'CONSUMABLE',  unit:'box',      sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:20, reorderQuantity:50, storageLocation:'CSSD' },
  { categoryCode:'STERL', itemCode:'STERL-POUCH-L',       name:'Sterilization Pouch Large',                   itemType:'CONSUMABLE',  unit:'box',      sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:10, reorderPoint:20, reorderQuantity:50, storageLocation:'CSSD' },
  { categoryCode:'STERL', itemCode:'STERL-WRAP-S',        name:'Sterilization Wrap Small',                    itemType:'CONSUMABLE',  unit:'roll',     sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'CSSD' },
  { categoryCode:'STERL', itemCode:'STERL-WRAP-L',        name:'Sterilization Wrap Large',                    itemType:'CONSUMABLE',  unit:'roll',     sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:5,  reorderPoint:10, reorderQuantity:20, storageLocation:'CSSD' },

  { categoryCode:'SVC',   itemCode:'SVC-CONSLT-NEW',       name:'New Patient Consultation',                     itemType:'CONSUMABLE',  unit:'visit',    sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:0,  reorderPoint:0,  reorderQuantity:0, storageLocation:'N/A' },
  { categoryCode:'SVC',   itemCode:'SVC-CONSLT-FU',        name:'Follow-up Consultation',                       itemType:'CONSUMABLE',  unit:'visit',    sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:0,  reorderPoint:0,  reorderQuantity:0, storageLocation:'N/A' },
  { categoryCode:'SVC',   itemCode:'SVC-PROCEDURE-SM',     name:'Minor Procedure',                             itemType:'CONSUMABLE',  unit:'procedure',sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:0,  reorderPoint:0,  reorderQuantity:0, storageLocation:'N/A' },
  { categoryCode:'SVC',   itemCode:'SVC-PROCEDURE-LG',     name:'Major Procedure',                             itemType:'CONSUMABLE',  unit:'procedure',sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:0,  reorderPoint:0,  reorderQuantity:0, storageLocation:'N/A' },
  { categoryCode:'SVC',   itemCode:'SVC-LAB-TEST',         name:'Laboratory Services',                         itemType:'CONSUMABLE',  unit:'test',     sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:0,  reorderPoint:0,  reorderQuantity:0, storageLocation:'N/A' },
  { categoryCode:'SVC',   itemCode:'SVC-XRAY',             name:'X-Ray Services',                              itemType:'CONSUMABLE',  unit:'session',  sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:0,  reorderPoint:0,  reorderQuantity:0, storageLocation:'N/A' },
  { categoryCode:'SVC',   itemCode:'SVC-ULTRASOUND',      name:'Ultrasound Services',                        itemType:'CONSUMABLE',  unit:'session',  sellingPrice:0,     requiresExpiryDate:false, isControlledSubstance:false, minimumStock:0,  reorderPoint:0,  reorderQuantity:0, storageLocation:'N/A' },
];

// Map TypeORM category codes to Prisma InventoryCategory enum
const CATEGORY_MAP: Record<string, InventoryCategory> = {
  'ANAES': InventoryCategory.ANESTHETIC,
  'IVMED': InventoryCategory.MEDICATION,
  'IVFLU': InventoryCategory.MEDICATION,
  'GAS': InventoryCategory.DISPOSABLE,
  'SUTR': InventoryCategory.SUTURE,
  'DRESS': InventoryCategory.DRESSING,
  'THCON': InventoryCategory.DISPOSABLE,
  'AIRWY': InventoryCategory.DISPOSABLE,
  'IVACC': InventoryCategory.DISPOSABLE,
  'CATH': InventoryCategory.DISPOSABLE,
  'BANDT': InventoryCategory.DRESSING,
  'IMPL': InventoryCategory.IMPLANT,
  'DIAGN': InventoryCategory.DISPOSABLE,
  'STERL': InventoryCategory.DISPOSABLE,
  'SVC': InventoryCategory.OTHER,
};

async function main() {
  console.log('[SEED] Starting inventory seed...');

  // First, clear existing inventory items
  console.log('[SEED] Clearing existing inventory items...');
  await prisma.inventoryItem.deleteMany({});
  console.log('[SEED] Existing items cleared.');

  // Map items to Prisma format
  const itemsToCreate = ITEMS.map((item: ItemSeedData) => {
    const category = CATEGORY_MAP[item.categoryCode] || InventoryCategory.OTHER;
    
    return {
      name: item.name,
      sku: item.itemCode,
      category: category,
      description: null,
      unit_of_measure: item.unit,
      unit_cost: item.sellingPrice,
      reorder_point: item.reorderPoint,
      low_stock_threshold: item.minimumStock,
      supplier: null,
      is_active: true,
      is_billable: item.sellingPrice > 0,
      is_implant: item.itemType === 'IMPLANT',
      manufacturer: null,
    };
  });

  console.log(`[SEED] Seeding ${itemsToCreate.length} inventory items...`);

  // Create items in batches for better performance
  const batchSize = 50;
  let created = 0;
  
  for (let i = 0; i < itemsToCreate.length; i += batchSize) {
    const batch = itemsToCreate.slice(i, i + batchSize);
    await prisma.inventoryItem.createMany({
      data: batch,
    });
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
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('[SEED] Done!');
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('[SEED] Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
