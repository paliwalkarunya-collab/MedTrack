// Shared option lists for the Medicine data model.
// Consumed by future Inventory forms (Add/Edit Medicine) so every screen
// that captures or displays Packaging / Inventory Unit stays in sync.

export const PRODUCT_TYPES = ['Medicine', 'Personal Care', 'Medical Device', 'Surgical Item', 'Supplement'];

export const MEDICINE_DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Drops', 'Powder', 'Inhaler', 'Gel', 'Lotion'];

export const PACKAGING_TYPES = ['Strip', 'Box', 'Bottle', 'Tube', 'Sachet', 'Piece', 'Packet', 'Carton', 'Jar', 'Can', 'Vial', 'Pouch'];

export const INVENTORY_UNITS = [
    '',
    'Tablet',
    'Capsule',
    'mL',
    'g',
    'Piece',
    'Glove',
    'Mask',
    'Pen',
    'Vial',
    'Sachet',
];

export const UNIT_TYPES = INVENTORY_UNITS;
