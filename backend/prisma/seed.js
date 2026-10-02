// =============================================================
// Seed script: realistic demo data
//   1 admin, 3 technicians, 10 customer companies (each with a login),
//   12 catalog products, 25 machines, 40 parts,
//   60 past service jobs over the last 18 months (+ a few open ones),
//   and a handful of service requests.
//
// Run with:  npm run seed     (wipes and refills the database)
// Demo password for every account comes from SEED_PASSWORD (see .env.example).
//
// A fixed-seed random generator is used, so every run produces the same data.
// Dates are relative to "today" so the dashboard always has things due soon.
// =============================================================
require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const today = new Date();
today.setHours(10, 0, 0, 0);
const daysFromToday = (n) => new Date(today.getTime() + n * DAY);

// --- deterministic random helpers (mulberry32) ---------------------------
let seed = 20261002;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// --- reference data --------------------------------------------------------
const customers = [
  ['Shree Ganesh Pharma Pvt Ltd', 'Anil Deshpande', 'Pune', 'pharma'],
  ['Kaveri Foods & Beverages', 'Meera Iyer', 'Bengaluru', 'food'],
  ['Tata Auto Components Unit 4', 'Rakesh Sharma', 'Jamshedpur', 'automotive'],
  ['Sunrise Textiles Ltd', 'Farhan Shaikh', 'Surat', 'textile'],
  ['Precision Plastics Moulding', 'Kiran Patil', 'Nashik', 'plastics'],
  ['GreenLeaf Packaging Co', 'Divya Nair', 'Kochi', 'packaging'],
  ['Om Sai Dental Clinic Chain', 'Dr. Sunil Joshi', 'Mumbai', 'medical'],
  ['Deccan Steel Fabricators', 'Venkat Rao', 'Hyderabad', 'general'],
  ['Himalaya Woodcraft Furniture', 'Harpreet Singh', 'Ludhiana', 'woodworking'],
  ['BlueWave Electronics Assembly', 'Priya Menon', 'Chennai', 'electronics'],
];

// [modelName, name, category, type, cfm, bar, kW, phase, applications, price]
const products = [
  ['AC-P2', 'Piston Compressor 2HP', 'AIR_COMPRESSOR', 'PISTON', 7.5, 10, 1.5, 'SINGLE', 'general,medical,woodworking', 45000],
  ['AC-P5', 'Piston Compressor 5HP', 'AIR_COMPRESSOR', 'PISTON', 18, 12, 3.7, 'THREE', 'general,automotive,woodworking', 82000],
  ['AC-S11', 'Screw Compressor 11kW', 'AIR_COMPRESSOR', 'SCREW', 58, 8, 11, 'THREE', 'general,textile,packaging,plastics', 395000],
  ['AC-S22', 'Screw Compressor 22kW', 'AIR_COMPRESSOR', 'SCREW', 120, 8, 22, 'THREE', 'automotive,textile,general', 640000],
  ['AC-S37', 'Screw Compressor 37kW', 'AIR_COMPRESSOR', 'SCREW', 210, 10, 37, 'THREE', 'automotive,general,steel', 980000],
  ['AC-OF15', 'Oil-free Screw 15kW', 'AIR_COMPRESSOR', 'SCREW', 72, 8, 15, 'THREE', 'food,pharma,electronics', 1150000],
  ['AC-SC3', 'Oil-free Scroll 3.7kW', 'AIR_COMPRESSOR', 'SCROLL', 14, 8, 3.7, 'THREE', 'medical,pharma,electronics,food', 310000],
  ['VP-RV10', 'Rotary Vane Pump 10 m3/h', 'VACUUM_PUMP', 'ROTARY_VANE', 5.9, 0.002, 0.37, 'SINGLE', 'medical,packaging,electronics', 68000],
  ['VP-RV40', 'Rotary Vane Pump 40 m3/h', 'VACUUM_PUMP', 'ROTARY_VANE', 23.5, 0.002, 1.1, 'THREE', 'packaging,food,plastics', 145000],
  ['VP-RV100', 'Rotary Vane Pump 100 m3/h', 'VACUUM_PUMP', 'ROTARY_VANE', 58.9, 0.001, 2.2, 'THREE', 'packaging,woodworking,food', 235000],
  ['VP-LR250', 'Liquid Ring Pump 250 m3/h', 'VACUUM_PUMP', 'LIQUID_RING', 147, 0.033, 7.5, 'THREE', 'pharma,food,general', 420000],
  ['VP-SC5', 'Dry Scroll Vacuum Pump', 'VACUUM_PUMP', 'SCROLL', 2.9, 0.0001, 0.25, 'SINGLE', 'pharma,electronics,medical', 185000],
];

// Parts: [partNumber, name, compatible model prefixes, unitPrice, minimumLevel, stockQty]
// A few are deliberately at/below their minimum level so low-stock alerts show up.
const parts = [
  ['FLT-AIR-P', 'Air intake filter (piston)', ['AC-P'], 450, 10, 34],
  ['FLT-AIR-S11', 'Air filter element 11-15kW', ['AC-S11', 'AC-OF15'], 1850, 6, 15],
  ['FLT-AIR-S22', 'Air filter element 22-37kW', ['AC-S22', 'AC-S37'], 2900, 4, 3],
  ['FLT-OIL-S11', 'Oil filter 11kW', ['AC-S11'], 1250, 6, 18],
  ['FLT-OIL-S22', 'Oil filter 22-37kW', ['AC-S22', 'AC-S37'], 1900, 4, 9],
  ['SEP-S11', 'Oil separator 11kW', ['AC-S11'], 6800, 2, 5],
  ['SEP-S22', 'Oil separator 22-37kW', ['AC-S22', 'AC-S37'], 11200, 2, 2],
  ['OIL-SCR-5L', 'Screw compressor oil 5L', ['AC-S11', 'AC-S22', 'AC-S37'], 3400, 8, 26],
  ['OIL-PIS-1L', 'Piston compressor oil 1L', ['AC-P'], 520, 10, 40],
  ['OIL-VP-1L', 'Vacuum pump oil 1L', ['VP-RV'], 780, 12, 8],
  ['VLV-PLT-P2', 'Valve plate kit 2HP', ['AC-P2'], 1600, 3, 7],
  ['VLV-PLT-P5', 'Valve plate kit 5HP', ['AC-P5'], 2400, 3, 4],
  ['RNG-PIS-P2', 'Piston ring set 2HP', ['AC-P2'], 900, 4, 12],
  ['RNG-PIS-P5', 'Piston ring set 5HP', ['AC-P5'], 1350, 4, 6],
  ['BLT-A42', 'V-belt A42', ['AC-P2'], 380, 6, 20],
  ['BLT-B55', 'V-belt B55', ['AC-P5'], 520, 6, 5],
  ['BLT-SPA', 'SPA belt set (screw)', ['AC-S11', 'AC-S22'], 2100, 3, 6],
  ['VLV-MPV-S', 'Minimum pressure valve', ['AC-S11', 'AC-S22', 'AC-S37'], 4200, 2, 3],
  ['VLV-INT-S', 'Intake valve repair kit', ['AC-S11', 'AC-S22', 'AC-S37'], 5600, 2, 2],
  ['VLV-SOL-24', 'Solenoid valve 24V', ['AC-S', 'AC-OF15'], 2300, 3, 7],
  ['SNS-TMP', 'Temperature sensor PT100', ['AC-S', 'AC-OF15'], 1700, 3, 8],
  ['SNS-PRS', 'Pressure transducer 0-16 bar', ['AC-S', 'AC-OF15', 'AC-SC3'], 3900, 2, 4],
  ['DRN-AUTO', 'Auto drain valve', ['AC-'], 2600, 4, 10],
  ['SFT-VLV-10', 'Safety valve 10 bar', ['AC-P', 'AC-S11'], 950, 4, 11],
  ['GSK-HEAD-P', 'Cylinder head gasket set', ['AC-P'], 300, 6, 16],
  ['BRG-MTR-S', 'Motor bearing set (screw)', ['AC-S'], 4800, 2, 3],
  ['CPL-ELM-S', 'Coupling element', ['AC-S22', 'AC-S37'], 2700, 2, 4],
  ['CLR-CORE', 'Oil cooler core 22kW', ['AC-S22'], 18500, 1, 1],
  ['TIP-SCROLL', 'Scroll tip seal kit', ['AC-SC3', 'VP-SC5'], 7400, 2, 3],
  ['FLT-OF15', 'Oil-free inlet filter 15kW', ['AC-OF15'], 3200, 3, 6],
  ['VAN-RV10', 'Vane set RV10', ['VP-RV10'], 2600, 3, 6],
  ['VAN-RV40', 'Vane set RV40', ['VP-RV40'], 4100, 3, 2],
  ['VAN-RV100', 'Vane set RV100', ['VP-RV100'], 6900, 2, 3],
  ['FLT-EXH-RV', 'Exhaust filter (vane pumps)', ['VP-RV'], 1450, 6, 13],
  ['FLT-INL-RV', 'Inlet filter (vane pumps)', ['VP-RV'], 980, 6, 15],
  ['GSK-RV', 'Gasket kit (vane pumps)', ['VP-RV'], 650, 5, 9],
  ['SEAL-LR', 'Mechanical seal liquid ring', ['VP-LR'], 8800, 1, 2],
  ['IMP-LR250', 'Impeller LR250', ['VP-LR250'], 24000, 1, 1],
  ['SEAL-SC5', 'Bearing & seal kit dry scroll', ['VP-SC5'], 5200, 2, 3],
  ['CTRL-PCB', 'Controller PCB', ['AC-S', 'AC-OF15'], 15500, 1, 2],
];

const jobNotes = {
  INSTALLATION: ['Installed and commissioned. Customer staff trained on start/stop.', 'Installation done, pipeline leak test OK.'],
  ROUTINE: [
    'Routine service: filters changed, oil topped up, drain checked.',
    'Preventive maintenance done. Belt tension adjusted.',
    'Routine visit. Cleaned cooler, replaced filter, no issues.',
    'Service completed, running hours noted, pressure settings verified.',
  ],
  BREAKDOWN: [
    'Machine tripping on high temperature. Replaced sensor and cleaned cooler.',
    'Low pressure complaint. Intake valve repaired.',
    'Abnormal noise from pump. Replaced vanes.',
    'Oil carry-over in line. Replaced separator.',
    'Motor not starting. Solenoid valve replaced.',
  ],
};

async function main() {
  console.log('Clearing existing data...');
  // Delete children before parents.
  await prisma.notification.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.partUsed.deleteMany();
  await prisma.serviceJob.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.machine.deleteMany();
  await prisma.user.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.part.deleteMany();
  await prisma.product.deleteMany();

  const password = process.env.SEED_PASSWORD;
  if (!password) throw new Error('Set SEED_PASSWORD in .env (demo password for seeded accounts)');
  const passwordHash = await bcrypt.hash(password, 10);

  // --- staff -----------------------------------------------------------------
  const admin = await prisma.user.create({
    data: { name: 'Owner Admin', email: 'admin@demo.local', role: 'ADMIN', passwordHash, phone: '9800000001' },
  });
  const technicians = [];
  for (const [name, phone] of [['Ravi Kumar', '9800000011'], ['Sanjay Pawar', '9800000012'], ['Imran Khan', '9800000013']]) {
    const email = `${name.split(' ')[0].toLowerCase()}@demo.local`;
    technicians.push(await prisma.user.create({ data: { name, email, phone, role: 'TECHNICIAN', passwordHash } }));
  }

  // --- products ---------------------------------------------------------------
  const productRows = [];
  for (const [modelName, name, category, type, cfm, bar, kW, phase, applications, price] of products) {
    productRows.push(
      await prisma.product.create({
        data: {
          modelName, name, category, type, phase, applications, price,
          airflowCfm: cfm,
          airflowLpm: Math.round(cfm * 28.317), // 1 CFM = 28.317 litres per minute
          pressureBar: bar,
          powerKw: kW,
          description: `${name} suitable for ${applications.replace(/,/g, ', ')} applications.`,
        },
      }),
    );
  }

  // --- parts (with compatibility) -------------------------------------------------
  const partRows = [];
  for (const [partNumber, name, prefixes, unitPrice, minimumLevel, stockQty] of parts) {
    const compatible = productRows.filter((p) => prefixes.some((prefix) => p.modelName.startsWith(prefix)));
    partRows.push(
      await prisma.part.create({
        data: {
          partNumber, name, unitPrice, minimumLevel, stockQty,
          compatibleProducts: { connect: compatible.map((p) => ({ id: p.id })) },
          stockMovements: {
            create: { change: stockQty, reason: 'ADJUSTMENT', note: 'Opening stock', userId: admin.id, createdAt: daysFromToday(-550) },
          },
        },
        include: { compatibleProducts: true },
      }),
    );
  }

  // --- customers and their logins -------------------------------------------------
  const customerRows = [];
  for (const [i, [companyName, contactPerson, city, industry]] of customers.entries()) {
    const slug = companyName.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    const customer = await prisma.customer.create({
      data: {
        companyName, contactPerson, city,
        email: `contact@${slug}.example.com`,
        phone: `98${String(20000000 + i * 1137).padStart(8, '0')}`,
        address: `Plot ${randInt(1, 120)}, MIDC Industrial Area`,
        gstNumber: `27AAB${String(1000 + i)}C1Z${i}`,
      },
    });
    customer.industry = industry;
    customerRows.push(customer);
    await prisma.user.create({
      data: {
        name: contactPerson,
        email: `${slug}@demo.local`,
        role: 'CUSTOMER',
        passwordHash,
        customerId: customer.id,
      },
    });
  }

  // --- machines: 25 units, 2-3 per customer, matched to their industry where possible ---
  const machineRows = [];
  for (let i = 0; i < 25; i++) {
    const customer = customerRows[i % customerRows.length];
    const suited = productRows.filter((p) => p.applications.includes(customer.industry));
    const product = pick(suited.length ? suited : productRows);
    const installDate = daysFromToday(-randInt(400, 1100));
    const hasAmc = rand() < 0.7;
    const amcStart = hasAmc ? daysFromToday(-randInt(30, 330)) : null;

    machineRows.push(
      await prisma.machine.create({
        data: {
          serialNumber: `${product.modelName}-${String(24000 + i * 7).padStart(6, '0')}`,
          productId: product.id,
          customerId: customer.id,
          location: pick(['Compressor room', 'Production line 1', 'Production line 2', 'Packing hall', 'Utility block']),
          installDate,
          warrantyEnd: new Date(installDate.getTime() + 365 * DAY),
          amcStart,
          amcEnd: hasAmc ? new Date(amcStart.getTime() + 365 * DAY) : null,
          serviceIntervalDays: product.category === 'VACUUM_PUMP' ? 120 : pick([60, 90, 90, 180]),
          qrToken: crypto.randomBytes(9).toString('base64url'),
        },
        include: { product: { include: { compatibleParts: true } } },
      }),
    );
  }

  // --- 60 closed jobs over the last 18 months ----------------------------------------
  // Parts are consumed from stock. We pretend the stock above is what is left
  // *after* these jobs, so we only record the JOB_CONSUMPTION movements.
  const lastRoutine = new Map(); // machineId -> date of latest routine job
  for (let i = 0; i < 60; i++) {
    const machine = machineRows[i % machineRows.length];
    const type = rand() < 0.68 ? 'ROUTINE' : 'BREAKDOWN';
    const scheduled = daysFromToday(-randInt(10, 545)); // within ~18 months
    const closed = new Date(scheduled.getTime() + randInt(0, 2) * DAY);
    const tech = pick(technicians);

    const compatible = machine.product.compatibleParts;
    const used = [];
    const howMany = type === 'ROUTINE' ? randInt(1, 3) : randInt(1, 2);
    for (let k = 0; k < howMany && compatible.length; k++) {
      const part = pick(compatible);
      if (!used.some((u) => u.partId === part.id)) used.push({ partId: part.id, quantity: randInt(1, part.unitPrice > 5000 ? 1 : 3) });
    }

    const job = await prisma.serviceJob.create({
      data: {
        machineId: machine.id,
        technicianId: tech.id,
        type,
        status: 'CLOSED',
        scheduledDate: scheduled,
        closedDate: closed,
        notes: pick(jobNotes[type]),
        partsUsed: { create: used },
      },
    });
    for (const u of used) {
      await prisma.stockMovement.create({
        data: { partId: u.partId, change: -u.quantity, reason: 'JOB_CONSUMPTION', jobId: job.id, userId: tech.id, createdAt: closed },
      });
    }

    if (type === 'ROUTINE' && (!lastRoutine.get(machine.id) || closed > lastRoutine.get(machine.id))) {
      lastRoutine.set(machine.id, closed);
    }
  }

  // Opening stock = what is left now + everything consumed since, so the movement history adds up.
  for (const part of partRows) {
    const used = await prisma.partUsed.aggregate({ where: { partId: part.id }, _sum: { quantity: true } });
    await prisma.stockMovement.updateMany({
      where: { partId: part.id, note: 'Opening stock' },
      data: { change: part.stockQty + (used._sum.quantity || 0) },
    });
  }

  // Next service due = last routine service (or install date) + interval.
  for (const m of machineRows) {
    const base = lastRoutine.get(m.id) || m.installDate;
    let next = new Date(base.getTime() + m.serviceIntervalDays * DAY);
    if (next < daysFromToday(-30)) next = daysFromToday(randInt(16, 90)); // keep long-overdue dates believable
    await prisma.machine.update({ where: { id: m.id }, data: { nextServiceDue: next } });
  }

  // Make sure the demo always has reminders to show.
  for (const [idx, days] of [[0, 3], [5, 7], [11, 12], [17, 14]]) {
    await prisma.machine.update({ where: { id: machineRows[idx].id }, data: { nextServiceDue: daysFromToday(days) } });
  }
  for (const [idx, days] of [[2, 10], [8, 21], [14, 28]]) {
    await prisma.machine.update({
      where: { id: machineRows[idx].id },
      data: { amcStart: daysFromToday(days - 365), amcEnd: daysFromToday(days) },
    });
  }
  const recent = machineRows[24];
  await prisma.machine.update({
    where: { id: recent.id },
    data: { installDate: daysFromToday(-340), warrantyEnd: daysFromToday(25) },
  });

  // --- a few open / in-progress jobs (one per technician + extras) -------------------
  const openJobs = [
    [machineRows[0], technicians[0], 'ROUTINE', 'OPEN', 3],
    [machineRows[5], technicians[1], 'ROUTINE', 'OPEN', 7],
    [machineRows[3], technicians[0], 'BREAKDOWN', 'IN_PROGRESS', 0],
    [machineRows[9], technicians[2], 'BREAKDOWN', 'OPEN', 1],
    [machineRows[20], technicians[1], 'INSTALLATION', 'OPEN', 5],
  ];
  for (const [machine, tech, type, status, inDays] of openJobs) {
    await prisma.serviceJob.create({
      data: { machineId: machine.id, technicianId: tech.id, type, status, scheduledDate: daysFromToday(inDays), notes: pick(jobNotes[type]) },
    });
  }

  // --- service requests --------------------------------------------------------------
  const requests = [
    [machineRows[1], 'Compressor is taking longer than usual to build pressure in the morning.', 'NEW'],
    [machineRows[6], 'Vacuum level dropping during packing shift, pump sounds louder.', 'NEW'],
    [machineRows[12], 'Oil visible in the air line near the dryer outlet.', 'NEW'],
    [machineRows[4], 'Request for quotation to extend AMC for another year.', 'RESOLVED'],
  ];
  for (const [machine, description, status] of requests) {
    const customerUser = await prisma.user.findFirst({ where: { customerId: machine.customerId } });
    await prisma.serviceRequest.create({
      data: { machineId: machine.id, customerId: machine.customerId, raisedById: customerUser.id, description, status },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    customers: await prisma.customer.count(),
    products: await prisma.product.count(),
    machines: await prisma.machine.count(),
    parts: await prisma.part.count(),
    jobs: await prisma.serviceJob.count(),
    closedJobs: await prisma.serviceJob.count({ where: { status: 'CLOSED' } }),
    partsUsedRows: await prisma.partUsed.count(),
    requests: await prisma.serviceRequest.count(),
  };
  console.log('Seed complete:', counts);
  console.log('Logins: admin@demo.local, ravi@demo.local (technician), shree@demo.local (customer). Password = SEED_PASSWORD');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
