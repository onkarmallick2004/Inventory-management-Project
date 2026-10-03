// =============================================================
// Product and spare-part catalog used by the seed script.
//
// Technical figures (power, free air delivery, pressure, pumping speed,
// ultimate vacuum) are copied from the manufacturers' published 50 Hz data:
//   - ELGi EG series 11-75 kW screw compressors (FAD per ISO 1217 Annex C)
//   - ELGi AB series oil-free screw compressors
//   - ELGi single and two stage reciprocating (piston) compressors
//   - Atlas Copco SF oil-free scroll compressors
//   - Busch R5 RA rotary vane and Dolphin liquid ring vacuum pumps
//   - Edwards nXDS dry scroll vacuum pump
// Prices are estimated Indian list prices in rupees.
// Part numbers are this company's own stock codes.
// =============================================================

const M3MIN_TO_CFM = 35.315; // 1 m3/min = 35.315 cubic feet per minute
const M3H_TO_CFM = 0.5886; // 1 m3/h  = 0.5886 cfm
const LS_TO_CFM = 2.119; // 1 litre/second = 2.119 cfm
const round1 = (n) => Math.round(n * 10) / 10;

// code = our internal model code (used in serial numbers and part compatibility)
// service = maintenance profile name (see SERVICE_PROFILES)
// cfm = free air delivery (compressors) or pumping speed (vacuum pumps)
// bar = max working pressure (compressors) or ultimate vacuum in bar absolute (pumps)
const products = [
  // --- ELGi reciprocating (piston) compressors, 10.7 bar unless noted ---
  { code: 'AC-P03', modelName: 'ELGi SS 03 L B', name: 'ELGi SS 03 single-stage piston compressor 3 HP', category: 'AIR_COMPRESSOR', type: 'PISTON', cfm: 12.7, bar: 10.7, kW: 2.2, phase: 'SINGLE', applications: 'general,medical,woodworking', price: 62000, service: 'PISTON' },
  { code: 'AC-P05', modelName: 'ELGi TS 05 L B', name: 'ELGi TS 05 two-stage piston compressor 5 HP', category: 'AIR_COMPRESSOR', type: 'PISTON', cfm: 25.0, bar: 10.7, kW: 3.7, phase: 'THREE', applications: 'general,automotive,woodworking', price: 98000, service: 'PISTON' },
  { code: 'AC-P10', modelName: 'ELGi TS 10 L B', name: 'ELGi TS 10 two-stage piston compressor 10 HP', category: 'AIR_COMPRESSOR', type: 'PISTON', cfm: 49.1, bar: 10.7, kW: 7.5, phase: 'THREE', applications: 'general,automotive,steel', price: 165000, service: 'PISTON' },
  { code: 'AC-P15H', modelName: 'ELGi TS 15 L B', name: 'ELGi TS 15 high-pressure piston compressor 15 HP (24.8 bar)', category: 'AIR_COMPRESSOR', type: 'PISTON', cfm: 44.1, bar: 24.8, kW: 11, phase: 'THREE', applications: 'plastics,packaging', price: 285000, service: 'PISTON' },

  // --- Atlas Copco SF oil-free scroll, 8 bar variants ---
  { code: 'AC-SC2', modelName: 'Atlas Copco SF 2', name: 'Atlas Copco SF 2 oil-free scroll compressor 2.2 kW', category: 'AIR_COMPRESSOR', type: 'SCROLL', cfm: round1(4.2 * LS_TO_CFM), bar: 8, kW: 2.2, phase: 'THREE', applications: 'medical,pharma,electronics', price: 340000, service: 'SCROLL' },
  { code: 'AC-SC4', modelName: 'Atlas Copco SF 4', name: 'Atlas Copco SF 4 oil-free scroll compressor 3.7 kW', category: 'AIR_COMPRESSOR', type: 'SCROLL', cfm: round1(6.7 * LS_TO_CFM), bar: 8, kW: 3.7, phase: 'THREE', applications: 'medical,pharma,electronics,food', price: 455000, service: 'SCROLL' },
  { code: 'AC-SC6', modelName: 'Atlas Copco SF 6', name: 'Atlas Copco SF 6 oil-free scroll compressor 5.5 kW', category: 'AIR_COMPRESSOR', type: 'SCROLL', cfm: round1(9.8 * LS_TO_CFM), bar: 8, kW: 5.5, phase: 'THREE', applications: 'medical,pharma,electronics,food', price: 590000, service: 'SCROLL' },

  // --- ELGi EG oil-lubricated screw, 8 bar variants (FAD m3/min from the 50 Hz table) ---
  ...[
    ['S11', 11, 1.81, 'general,textile,packaging,plastics', 420000],
    ['S15', 15, 2.55, 'general,textile,packaging,plastics', 520000],
    ['S18', 18, 3.17, 'general,textile,automotive,plastics', 590000],
    ['S22', 22, 3.85, 'automotive,textile,general,plastics', 680000],
    ['S30', 30, 5.18, 'automotive,general,steel,textile', 860000],
    ['S37', 37, 6.51, 'automotive,general,steel', 1020000],
    ['S45', 45, 7.79, 'automotive,general,steel', 1240000],
    ['S55', 55, 10.05, 'steel,automotive,general', 1520000],
    ['S75', 75, 13.88, 'steel,automotive,general', 1960000],
  ].map(([size, kW, fad, applications, price]) => ({
    code: `AC-${size}`, modelName: `ELGi EG ${kW}`, name: `ELGi EG ${kW} screw compressor ${kW} kW (8 bar)`,
    category: 'AIR_COMPRESSOR', type: 'SCREW', cfm: round1(fad * M3MIN_TO_CFM), bar: 8, kW, phase: 'THREE', applications, price, service: 'SCREW',
  })),
  // high-pressure variants (12.5 bar) share parts with the 8 bar model
  { code: 'AC-S11H', modelName: 'ELGi EG 11 HP', name: 'ELGi EG 11 screw compressor 11 kW (12.5 bar)', category: 'AIR_COMPRESSOR', type: 'SCREW', cfm: round1(1.27 * M3MIN_TO_CFM), bar: 12.5, kW: 11, phase: 'THREE', applications: 'plastics,packaging,general', price: 445000, service: 'SCREW' },
  { code: 'AC-S22H', modelName: 'ELGi EG 22 HP', name: 'ELGi EG 22 screw compressor 22 kW (12.5 bar)', category: 'AIR_COMPRESSOR', type: 'SCREW', cfm: round1(2.69 * M3MIN_TO_CFM), bar: 12.5, kW: 22, phase: 'THREE', applications: 'plastics,packaging,automotive', price: 715000, service: 'SCREW' },

  // --- ELGi AB oil-free screw, 8 bar variants ---
  ...[
    ['OF11', 11, 1.19, 1350000],
    ['OF15', 15, 2.10, 1580000],
    ['OF22', 22, 3.14, 1990000],
    ['OF37', 37, 5.66, 2850000],
  ].map(([size, kW, fad, price]) => ({
    code: `AC-${size}`, modelName: `ELGi AB ${kW}`, name: `ELGi AB ${kW} oil-free screw compressor ${kW} kW (8 bar)`,
    category: 'AIR_COMPRESSOR', type: 'SCREW', cfm: round1(fad * M3MIN_TO_CFM), bar: 8, kW, phase: 'THREE', applications: 'food,pharma,electronics,textile', price, service: 'OIL_FREE',
  })),

  // --- Busch R5 rotary vane vacuum pumps (ultimate 0.1-0.5 mbar) ---
  { code: 'VP-RV16', modelName: 'Busch R5 RA 0016 C', name: 'Busch R5 rotary vane vacuum pump 16 m3/h', category: 'VACUUM_PUMP', type: 'ROTARY_VANE', cfm: round1(16 * M3H_TO_CFM), bar: 0.0005, kW: 0.55, phase: 'THREE', applications: 'medical,packaging,electronics', price: 95000, service: 'VANE' },
  { code: 'VP-RV40', modelName: 'Busch R5 RA 0040 F', name: 'Busch R5 rotary vane vacuum pump 40 m3/h', category: 'VACUUM_PUMP', type: 'ROTARY_VANE', cfm: round1(40 * M3H_TO_CFM), bar: 0.0001, kW: 1.4, phase: 'THREE', applications: 'packaging,food,plastics', price: 175000, service: 'VANE' },
  { code: 'VP-RV63', modelName: 'Busch R5 RA 0063 F', name: 'Busch R5 rotary vane vacuum pump 63 m3/h', category: 'VACUUM_PUMP', type: 'ROTARY_VANE', cfm: round1(63 * M3H_TO_CFM), bar: 0.0001, kW: 2.0, phase: 'THREE', applications: 'packaging,food,woodworking', price: 230000, service: 'VANE' },
  { code: 'VP-RV100', modelName: 'Busch R5 RA 0100 F', name: 'Busch R5 rotary vane vacuum pump 100 m3/h', category: 'VACUUM_PUMP', type: 'ROTARY_VANE', cfm: round1(100 * M3H_TO_CFM), bar: 0.0001, kW: 2.7, phase: 'THREE', applications: 'packaging,woodworking,food,plastics', price: 295000, service: 'VANE' },

  // --- Busch Dolphin liquid ring vacuum pumps (ultimate 33 mbar) ---
  { code: 'VP-LR100', modelName: 'Busch Dolphin LX 0140 B', name: 'Busch Dolphin liquid ring vacuum pump 100 m3/h', category: 'VACUUM_PUMP', type: 'LIQUID_RING', cfm: round1(100 * M3H_TO_CFM), bar: 0.033, kW: 3, phase: 'THREE', applications: 'pharma,food,general', price: 310000, service: 'LIQUID_RING' },
  { code: 'VP-LR195', modelName: 'Busch Dolphin LC 0220 A', name: 'Busch Dolphin liquid ring vacuum pump 195 m3/h', category: 'VACUUM_PUMP', type: 'LIQUID_RING', cfm: round1(195 * M3H_TO_CFM), bar: 0.033, kW: 7.5, phase: 'THREE', applications: 'pharma,food,general', price: 520000, service: 'LIQUID_RING' },

  // --- Edwards nXDS dry scroll vacuum pump (single phase) ---
  { code: 'VP-DS10', modelName: 'Edwards nXDS10i', name: 'Edwards nXDS10i dry scroll vacuum pump 11.4 m3/h', category: 'VACUUM_PUMP', type: 'SCROLL', cfm: round1(11.4 * M3H_TO_CFM), bar: 0.000007, kW: 0.3, phase: 'SINGLE', applications: 'pharma,electronics,medical', price: 410000, service: 'DRY_SCROLL' },
];

// Which products a part fits. Each entry is either a code prefix ('AC-S11' fits
// AC-S11 and its 12.5 bar variant AC-S11H) or '@' + a maintenance profile
// ('@SCREW' fits every oil-lubricated screw compressor).
// [partNumber, name, fits (code prefixes), unitPrice, role]
// role tells the generator when a part is used (see SERVICE_PROFILES and FAULTS).
const parts = [];
const add = (partNumber, name, fits, unitPrice, role) => parts.push({ partNumber, name, fits, unitPrice, role });

// ELGi EG screw: one air filter, oil filter and separator per size.
const screwSizes = [
  ['S11', 1850, 1250, 6800], ['S15', 2100, 1250, 7600], ['S18', 2350, 1400, 8400], ['S22', 2900, 1900, 11200],
  ['S30', 3600, 2300, 14500], ['S37', 3900, 2300, 16800], ['S45', 4800, 2900, 19800], ['S55', 5600, 3400, 24500], ['S75', 6900, 4100, 31000],
];
for (const [size, airPrice, oilPrice, sepPrice] of screwSizes) {
  const kW = size.slice(1);
  add(`FLT-AIR-${size}`, `Air filter element EG ${kW}`, [`AC-${size}`], airPrice, 'AIR_FILTER');
  add(`FLT-OIL-${size}`, `Oil filter EG ${kW}`, [`AC-${size}`], oilPrice, 'OIL_FILTER');
  add(`SEP-${size}`, `Oil separator EG ${kW}`, [`AC-${size}`], sepPrice, 'SEPARATOR');
}
// Screw parts shared by frame size (small 11-22 kW, medium 30-45 kW, large 55-75 kW).
const frames = [
  ['F1', '11-22 kW', ['AC-S11', 'AC-S15', 'AC-S18', 'AC-S22'], 1],
  ['F2', '30-45 kW', ['AC-S30', 'AC-S37', 'AC-S45'], 1.5],
  ['F3', '55-75 kW', ['AC-S55', 'AC-S75'], 2.2],
];
for (const [f, label, fits, k] of frames) {
  add(`VLV-MPV-${f}`, `Minimum pressure valve kit ${label}`, fits, Math.round(4200 * k), 'MPV');
  add(`VLV-INT-${f}`, `Intake valve repair kit ${label}`, fits, Math.round(5600 * k), 'INTAKE');
  add(`VLV-THM-${f}`, `Thermostatic valve kit ${label}`, fits, Math.round(3800 * k), 'THERMOSTAT');
  add(`BRG-MTR-${f}`, `Motor bearing set ${label}`, fits, Math.round(4800 * k), 'BEARING');
  add(`CLR-CORE-${f}`, `Oil cooler core ${label}`, fits, Math.round(18500 * k), 'COOLER');
  add(`CPL-ELM-${f}`, `Coupling element ${label}`, fits, Math.round(2700 * k), 'COUPLING');
  add(`HSE-OIL-${f}`, `Oil hose kit ${label}`, fits, Math.round(3200 * k), 'OIL_LEAK');
  add(`ARE-OVH-${f}`, `Airend overhaul kit ${label}`, fits, Math.round(68000 * k), 'AIREND');
}
add('OIL-SCR-20L', 'ELGi AirLube screw compressor oil 20 L', ['@SCREW'], 14500, 'OIL');
add('VLV-SOL-24', 'Solenoid valve 24V', ['@SCREW', '@OIL_FREE'], 2300, 'SOLENOID');
add('SNS-TMP', 'Temperature sensor PT100', ['@SCREW', '@OIL_FREE'], 1700, 'TEMP_SENSOR');
add('SNS-PRS', 'Pressure transducer 0-16 bar', ['@SCREW', '@OIL_FREE', '@SCROLL'], 3900, 'PRESSURE_SENSOR');
add('CTRL-PCB', 'Neuron controller PCB', ['@SCREW', '@OIL_FREE'], 15500, 'CONTROLLER');
add('DRN-AUTO', 'Zero-loss auto drain valve', ['AC-'], 2600, 'DRAIN');
add('SFT-VLV-10', 'Safety valve 10 bar', ['AC-P0', 'AC-P10', 'AC-S11', 'AC-S15', 'AC-S18', 'AC-S22', 'AC-OF', '@SCROLL'], 950, 'SAFETY_VALVE');
add('SFT-VLV-16', 'Safety valve 16 bar', ['AC-S11H', 'AC-S22H', 'AC-S3', 'AC-S4', 'AC-S5', 'AC-S7'], 1350, 'SAFETY_VALVE');
add('SFT-VLV-28', 'Safety valve 28 bar (high pressure)', ['AC-P15H'], 2900, 'SAFETY_VALVE');
add('HSE-AIR-KIT', 'Air line hose and fitting kit', ['AC-'], 1800, 'AIR_LEAK');

// ELGi AB oil-free screw.
for (const [size, kW, k] of [['OF11', 11, 1], ['OF15', 15, 1.2], ['OF22', 22, 1.5], ['OF37', 37, 2.3]]) {
  add(`FLT-AIR-${size}`, `Air filter element AB ${kW}`, [`AC-${size}`], Math.round(3200 * k), 'AIR_FILTER');
  add(`FLT-GBX-${size}`, `Gearbox oil filter AB ${kW}`, [`AC-${size}`], Math.round(2600 * k), 'OIL_FILTER');
  add(`SEAL-AE-${size}`, `Airend seal kit AB ${kW}`, [`AC-${size}`], Math.round(16500 * k), 'AIREND');
  add(`CLR-INT-${size}`, `Intercooler core AB ${kW}`, [`AC-${size}`], Math.round(22000 * k), 'COOLER');
}
add('OIL-GBX-5L', 'Oil-free gearbox oil 5 L', ['AC-OF'], 6200, 'OIL');
add('VLV-UNL-OF', 'Unloader valve kit (oil-free)', ['AC-OF'], 7800, 'INTAKE');

// ELGi piston compressors.
for (const [code, label, k] of [['P03', '3 HP', 1], ['P05', '5 HP', 1.3], ['P10', '10 HP', 1.9], ['P15H', '15 HP HP', 3]]) {
  add(`FLT-AIR-${code}`, `Air intake filter ${label}`, [`AC-${code}`], Math.round(450 * k), 'AIR_FILTER');
  add(`VLV-PLT-${code}`, `Valve plate kit ${label}`, [`AC-${code}`], Math.round(1600 * k), 'VALVE_PLATE');
  add(`RNG-PIS-${code}`, `Piston ring set ${label}`, [`AC-${code}`], Math.round(900 * k), 'PISTON_RINGS');
  add(`GSK-HEAD-${code}`, `Cylinder head gasket set ${label}`, [`AC-${code}`], Math.round(300 * k), 'GASKET');
  add(`BLT-${code}`, `V-belt set ${label}`, [`AC-${code}`], Math.round(380 * k), 'BELT');
}
add('OIL-PIS-1L', 'ELGi piston compressor oil 1 L', ['AC-P'], 520, 'OIL');
add('VLV-NRV-P', 'Non-return valve (piston)', ['AC-P'], 850, 'NRV');
add('SW-PRS-P', 'Pressure switch (piston)', ['AC-P'], 1450, 'PRESSURE_SWITCH');

// Atlas Copco SF scroll.
for (const [code, label, k] of [['SC2', 'SF 2', 1], ['SC4', 'SF 4', 1.25], ['SC6', 'SF 6', 1.5]]) {
  add(`FLT-AIR-${code}`, `Inlet filter ${label}`, [`AC-${code}`], Math.round(1900 * k), 'AIR_FILTER');
  add(`TIP-${code}`, `Scroll tip seal kit ${label}`, [`AC-${code}`], Math.round(7400 * k), 'TIP_SEAL');
  add(`BRG-${code}`, `Scroll bearing kit ${label}`, [`AC-${code}`], Math.round(9800 * k), 'BEARING');
  add(`GRS-${code}`, `Bearing grease kit ${label}`, [`AC-${code}`], Math.round(1600 * k), 'GREASE');
}

// Busch R5 rotary vane.
for (const [code, label, k] of [['RV16', '0016', 1], ['RV40', '0040', 1.4], ['RV63', '0063', 1.8], ['RV100', '0100', 2.4]]) {
  add(`VAN-${code}`, `Vane set R5 ${label}`, [`VP-${code}`], Math.round(2600 * k), 'VANES');
  add(`FLT-EXH-${code}`, `Exhaust filter R5 ${label}`, [`VP-${code}`], Math.round(1450 * k), 'EXHAUST_FILTER');
  add(`FLT-INL-${code}`, `Inlet filter R5 ${label}`, [`VP-${code}`], Math.round(980 * k), 'INLET_FILTER');
  add(`GSK-${code}`, `Gasket kit R5 ${label}`, [`VP-${code}`], Math.round(650 * k), 'GASKET');
  add(`FLT-OIL-${code}`, `Oil filter R5 ${label}`, [`VP-${code}`], Math.round(900 * k), 'OIL_FILTER');
}
add('OIL-VP-1L', 'Busch VM 100 vacuum pump oil 1 L', ['VP-RV'], 780, 'OIL');
add('VLV-GB-RV', 'Gas ballast valve (vane pumps)', ['VP-RV'], 1250, 'GAS_BALLAST');
add('CPL-RV', 'Motor coupling (vane pumps)', ['VP-RV'], 1650, 'COUPLING');

// Busch Dolphin liquid ring.
for (const [code, label, k] of [['LR100', 'LX 0140', 1], ['LR195', 'LC 0220', 1.6]]) {
  add(`SEAL-${code}`, `Mechanical seal ${label}`, [`VP-${code}`], Math.round(8800 * k), 'MECH_SEAL');
  add(`IMP-${code}`, `Impeller ${label}`, [`VP-${code}`], Math.round(24000 * k), 'IMPELLER');
  add(`BRG-${code}`, `Bearing set ${label}`, [`VP-${code}`], Math.round(3600 * k), 'BEARING');
  add(`STR-${code}`, `Inlet strainer ${label}`, [`VP-${code}`], Math.round(1100 * k), 'INLET_FILTER');
}

// Edwards nXDS.
add('TIP-DS10', 'nXDS tip seal kit', ['VP-DS10'], 9800, 'TIP_SEAL');
add('BRG-DS10', 'nXDS bearing and seal kit', ['VP-DS10'], 18500, 'BEARING');

// Universal consumables.
add('FLT-LINE-1', 'Compressed air line filter element', ['@SCREW', '@OIL_FREE', '@SCROLL'], 2400, 'LINE_FILTER');
add('KIT-GAUGE', 'Pressure gauge 0-16 bar', ['AC-'], 650, 'GAUGE');
add('VLV-BALL-1', 'Ball valve 1 inch', ['AC-', 'VP-'], 720, 'BALL_VALVE');
add('MTR-CNT-30', 'Motor contactor 30 A', ['@SCREW', '@OIL_FREE', 'AC-P10', 'AC-P15H', 'VP-LR'], 3400, 'CONTACTOR');
add('MTR-CNT-12', 'Motor contactor 12 A', ['AC-P03', 'AC-P05', '@SCROLL', 'VP-RV', 'VP-DS'], 1650, 'CONTACTOR');
add('MTR-OLR', 'Motor overload relay', ['AC-', 'VP-'], 2100, 'OVERLOAD_RELAY');

// -----------------------------------------------------------------------------
// Maintenance profiles: running-hour intervals for each kind of machine.
//   Screw intervals follow the published guidance for oil-injected screw
//   compressors: air and oil filter every 1,000 h; oil and separator together
//   every 4,000 h (Chicago Pneumatic / Atlas Copco maintenance guides).
//   Other machine types use typical intervals from their service manuals.
// Each step: [every N running hours, parts roles used, quantity rule]
// -----------------------------------------------------------------------------
const SERVICE_PROFILES = {
  SCREW: { minorHours: 1000, steps: [[1000, ['AIR_FILTER', 'OIL_FILTER']], [4000, ['SEPARATOR', 'OIL']], [8000, ['MPV', 'THERMOSTAT', 'LINE_FILTER']], [16000, ['BEARING', 'SAFETY_VALVE']]] },
  OIL_FREE: { minorHours: 2000, steps: [[2000, ['AIR_FILTER']], [4000, ['OIL_FILTER', 'OIL']], [20000, ['AIREND']]] },
  PISTON: { minorHours: 500, steps: [[500, ['AIR_FILTER', 'OIL']], [1500, ['BELT']], [3000, ['VALVE_PLATE', 'GASKET']], [6000, ['PISTON_RINGS', 'SAFETY_VALVE']]] },
  SCROLL: { minorHours: 2500, steps: [[2500, ['AIR_FILTER']], [5000, ['TIP_SEAL', 'GREASE']], [20000, ['BEARING']]] },
  VANE: { minorHours: 1000, steps: [[1000, ['OIL', 'OIL_FILTER']], [2000, ['EXHAUST_FILTER', 'INLET_FILTER']], [8000, ['VANES', 'GASKET']]] },
  LIQUID_RING: { minorHours: 2000, steps: [[2000, ['INLET_FILTER']], [8000, ['MECH_SEAL']], [16000, ['BEARING']]] },
  DRY_SCROLL: { minorHours: 5000, steps: [[15000, ['TIP_SEAL']], [30000, ['BEARING']]] },
};

// -----------------------------------------------------------------------------
// Breakdown causes. weight = how common; season = which months it is more
// likely ('summer' Apr-Jun heat, 'monsoon' Jul-Sep humidity); old = mostly on
// machines older than about 4 years. Failure types (air leaks, oil leaks,
// overheating, valve faults) follow published compressor failure reports.
// -----------------------------------------------------------------------------
const FAULTS = {
  SCREW: [
    { roles: ['TEMP_SENSOR'], weight: 3, season: 'summer', note: 'Tripping on high discharge temperature. Replaced temperature sensor, cleaned cooler fins.' },
    { roles: ['THERMOSTAT'], weight: 2, season: 'summer', note: 'Oil temperature high. Thermostatic valve stuck, replaced kit.' },
    { roles: ['COOLER'], weight: 1, season: 'summer', old: true, note: 'Cooler choked and leaking. Replaced oil cooler core.' },
    { roles: ['OIL', 'OIL_FILTER'], weight: 2, season: 'summer', note: 'Oil degraded due to overheating. Oil and filter changed.' },
    { roles: ['DRAIN'], weight: 3, season: 'monsoon', note: 'Water in air line. Auto drain valve blocked, replaced.' },
    { roles: ['AIR_FILTER'], weight: 2, season: 'monsoon', note: 'Low FAD complaint. Air filter choked with moisture and dust, replaced.' },
    { roles: ['SOLENOID'], weight: 2, season: 'monsoon', note: 'Machine not loading. Solenoid valve coil burnt, replaced.' },
    { roles: ['INTAKE'], weight: 3, note: 'Low pressure complaint. Intake valve repaired with kit.' },
    { roles: ['MPV'], weight: 2, note: 'Pressure not building. Minimum pressure valve replaced.' },
    { roles: ['SEPARATOR'], weight: 2, note: 'Oil carry-over in air line. Separator replaced.' },
    { roles: ['AIR_LEAK'], weight: 3, note: 'Air leak at discharge line fittings. Hoses and fittings replaced.' },
    { roles: ['OIL_LEAK'], weight: 2, old: true, note: 'Oil leak at hose joints. Oil hose kit replaced.' },
    { roles: ['BEARING'], weight: 1, old: true, note: 'Abnormal noise from motor. Motor bearings replaced.' },
    { roles: ['COUPLING'], weight: 1, old: true, note: 'Vibration at coupling. Coupling element replaced.' },
    { roles: ['CONTROLLER'], weight: 1, note: 'Controller display dead after power surge. Controller PCB replaced.' },
    { roles: ['CONTACTOR'], weight: 2, season: 'summer', note: 'Motor not starting. Main contactor contacts burnt, replaced.' },
    { roles: ['OVERLOAD_RELAY'], weight: 1, note: 'Frequent overload trips. Overload relay replaced and current checked.' },
    { roles: ['PRESSURE_SENSOR'], weight: 1, note: 'Erratic pressure reading. Pressure transducer replaced.' },
    { roles: ['AIREND'], weight: 1, old: true, rare: true, note: 'Airend noisy with high temperature. Airend overhauled.' },
    { roles: ['GAUGE'], weight: 1, note: 'Pressure gauge glass broken. Gauge replaced.' },
    { roles: ['BALL_VALVE'], weight: 1, note: 'Outlet ball valve passing. Replaced.' },
  ],
  OIL_FREE: [
    { roles: ['INTAKE'], weight: 3, note: 'Not loading fully. Unloader valve kit replaced.' },
    { roles: ['COOLER'], weight: 1, season: 'summer', old: true, note: 'High stage temperature. Intercooler core replaced.' },
    { roles: ['TEMP_SENSOR'], weight: 3, season: 'summer', note: 'High temperature trip. Temperature sensor replaced.' },
    { roles: ['DRAIN'], weight: 3, season: 'monsoon', note: 'Condensate not draining. Auto drain replaced.' },
    { roles: ['AIR_FILTER'], weight: 2, season: 'monsoon', note: 'Low flow complaint. Inlet filter choked, replaced.' },
    { roles: ['SOLENOID'], weight: 1, note: 'Solenoid valve not operating. Replaced.' },
    { roles: ['AIREND'], weight: 1, old: true, note: 'Airend seal leakage. Seal kit fitted.' },
    { roles: ['CONTACTOR'], weight: 1, season: 'summer', note: 'Motor not starting. Contactor replaced.' },
    { roles: ['AIR_LEAK'], weight: 2, note: 'Air leak at outlet piping. Fittings replaced.' },
  ],
  PISTON: [
    { roles: ['VALVE_PLATE'], weight: 4, note: 'Slow pressure build-up. Valve plate kit replaced.' },
    { roles: ['PISTON_RINGS'], weight: 2, old: true, note: 'Oil carry-over and low output. Piston rings replaced.' },
    { roles: ['GASKET'], weight: 2, note: 'Air leak at cylinder head. Gasket set replaced.' },
    { roles: ['BELT'], weight: 3, season: 'summer', note: 'Belt slipping and squealing. Belts replaced.' },
    { roles: ['NRV'], weight: 2, note: 'Tank air leaking back to head. Non-return valve replaced.' },
    { roles: ['PRESSURE_SWITCH'], weight: 2, note: 'Compressor not cutting off. Pressure switch replaced.' },
    { roles: ['DRAIN'], weight: 2, season: 'monsoon', note: 'Water in tank. Auto drain fitted.' },
    { roles: ['AIR_LEAK'], weight: 2, note: 'Air leak in delivery line. Hose kit replaced.' },
    { roles: ['CONTACTOR'], weight: 1, season: 'summer', note: 'Motor not starting. Contactor replaced.' },
    { roles: ['GAUGE'], weight: 1, note: 'Tank pressure gauge faulty. Replaced.' },
  ],
  SCROLL: [
    { roles: ['TIP_SEAL'], weight: 3, note: 'Low output pressure. Tip seals worn, replaced.' },
    { roles: ['BEARING'], weight: 1, old: true, note: 'Noise from scroll element. Bearings replaced.' },
    { roles: ['AIR_FILTER'], weight: 2, season: 'monsoon', note: 'Inlet filter choked. Replaced.' },
    { roles: ['DRAIN'], weight: 2, season: 'monsoon', note: 'Condensate trap blocked. Auto drain replaced.' },
    { roles: ['CONTACTOR'], weight: 1, season: 'summer', note: 'Unit not starting. Contactor replaced.' },
  ],
  VANE: [
    { roles: ['VANES'], weight: 3, note: 'Vacuum level dropping, pump louder than usual. Vanes replaced.' },
    { roles: ['EXHAUST_FILTER'], weight: 3, note: 'Oil mist at exhaust. Exhaust filters replaced.' },
    { roles: ['INLET_FILTER'], weight: 2, season: 'monsoon', note: 'Poor vacuum. Inlet filter blocked with packaging dust, replaced.' },
    { roles: ['OIL', 'OIL_FILTER'], weight: 2, season: 'summer', note: 'Pump running hot, oil dark. Oil and filter changed.' },
    { roles: ['GAS_BALLAST'], weight: 1, season: 'monsoon', note: 'Water vapour in oil. Gas ballast valve replaced.' },
    { roles: ['COUPLING'], weight: 1, old: true, note: 'Knocking at motor side. Coupling replaced.' },
    { roles: ['GASKET'], weight: 1, note: 'Oil leak at housing. Gasket kit replaced.' },
  ],
  LIQUID_RING: [
    { roles: ['MECH_SEAL'], weight: 4, note: 'Water leaking at shaft. Mechanical seal replaced.' },
    { roles: ['IMPELLER'], weight: 1, old: true, note: 'Capacity dropped, impeller eroded. Impeller replaced.' },
    { roles: ['BEARING'], weight: 2, old: true, note: 'Bearing noise. Bearing set replaced.' },
    { roles: ['INLET_FILTER'], weight: 2, note: 'Strainer blocked. Cleaned and replaced.' },
    { roles: ['CONTACTOR'], weight: 1, season: 'summer', note: 'Motor not starting. Contactor replaced.' },
  ],
  DRY_SCROLL: [
    { roles: ['TIP_SEAL'], weight: 3, note: 'Ultimate vacuum not reached. Tip seals replaced.' },
    { roles: ['BEARING'], weight: 1, old: true, note: 'Pump noisy. Bearing and seal kit fitted.' },
  ],
};

module.exports = { products, parts, SERVICE_PROFILES, FAULTS };
