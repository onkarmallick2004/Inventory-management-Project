// =============================================================
// Seed script: five years of service-company history.
//
//   Catalog   29 products and 153 spare parts with published manufacturer
//             specs (see seed-data/catalog.js)
//   People    1 admin, 8 technicians, 120 customer companies (each with a login)
//   History   ~400 machines installed over 5 years, every routine service,
//             breakdown and installation job, the parts each one used, and the
//             stock movements (purchase orders and job consumption) behind them.
//
// How the history is built (each rule is a few lines below):
//   1. Each customer runs one shift, two shifts or 24x7. That gives each machine
//      its running hours per day.
//   2. Routine services follow the maintenance profile in running hours, so a
//      24x7 plant is serviced about three times as often as a one-shift workshop.
//      Bigger services (separator, oil, valves, bearings) come at their own hour marks.
//   3. Machines under warranty or AMC are serviced on time. Others are sometimes
//      skipped or late, and break down more often.
//   4. Breakdowns depend on machine age (more in the first months and after about
//      4 years), the season (heat in Apr-Jun, humidity in Jul-Sep) and running hours.
//   5. The business grows: more new customers and machines in recent years.
//   6. Stores raise a purchase order on the 15th of each month to refill parts.
//
// Run with:  npm run seed     (wipes and refills the database)
// Demo password for every account comes from SEED_PASSWORD (see .env.example).
// A fixed-seed random generator is used, so every run produces the same data.
// Dates are relative to "today" so the dashboard always has things due soon.
// =============================================================
require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { products, parts, SERVICE_PROFILES, FAULTS } = require('./seed-data/catalog');
const people = require('./seed-data/people');

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const today = new Date();
today.setHours(10, 0, 0, 0);
const daysFromToday = (n) => new Date(today.getTime() + n * DAY);
const addDays = (date, n) => new Date(date.getTime() + n * DAY);
const monthsBetween = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

const YEARS = 5;
const START = new Date(today.getFullYear() - YEARS, today.getMonth(), 1, 10); // first day of history
const CUSTOMER_COUNT = 120;

// --- deterministic random helpers (mulberry32) ---------------------------
let seed = 20261003;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
// Picks from [[item, weight], ...] with probability proportional to weight.
function weighted(pairs) {
  const total = pairs.reduce((sum, [, w]) => sum + w, 0);
  let r = rand() * total;
  for (const [item, w] of pairs) {
    r -= w;
    if (r <= 0) return item;
  }
  return pairs[pairs.length - 1][0];
}

// --- business rules ----------------------------------------------------------
// Running hours per day for one shift, two shifts and round-the-clock plants.
const DUTY = { ONE_SHIFT: 7, TWO_SHIFT: 14, TWENTY_FOUR_SEVEN: 21 };
const CONTINUOUS_INDUSTRIES = ['pharma', 'food', 'plastics', 'textile', 'packaging'];

// Chance of a breakdown in any one month for a machine on two shifts, by maintenance profile.
const BREAKDOWN_RATE = { SCREW: 0.07, OIL_FREE: 0.05, PISTON: 0.08, SCROLL: 0.04, VANE: 0.07, LIQUID_RING: 0.055, DRY_SCROLL: 0.03 };
// Month-of-year effect (Jan..Dec): heat in Apr-Jun, monsoon humidity in Jul-Sep, Diwali shutdown in Oct-Nov.
const SEASON = [0.9, 0.9, 1.0, 1.3, 1.5, 1.3, 1.2, 1.25, 1.1, 0.85, 0.8, 0.9];
const seasonOf = (month) => (month >= 3 && month <= 5 ? 'summer' : month >= 6 && month <= 8 ? 'monsoon' : null);
// Bathtub curve: teething problems in the first 3 months, wear-out after 4 years.
function ageFactor(ageMonths) {
  if (ageMonths < 3) return 2;
  if (ageMonths < 48) return 1;
  return 1 + (ageMonths - 48) / 36;
}
// Plants close for about a week around Diwali; routine visits move to after it.
const DIWALI = { 2021: '11-04', 2022: '10-24', 2023: '11-12', 2024: '11-01', 2025: '10-20', 2026: '11-08', 2027: '10-29' };
function avoidHolidays(date) {
  let d = date;
  const diwali = DIWALI[d.getFullYear()] && new Date(`${d.getFullYear()}-${DIWALI[d.getFullYear()]}T10:00:00`);
  if (diwali && Math.abs(d - diwali) <= 3 * DAY) d = addDays(diwali, 5);
  if (d.getDay() === 0) d = addDays(d, 1); // no routine visits on Sunday
  return d;
}

// How many units of a part one job uses.
function quantityFor(part, product) {
  if (part.role === 'OIL') {
    if (product.service === 'SCREW') return product.kW <= 22 ? 1 : product.kW <= 45 ? 2 : 3; // 20 L cans
    if (product.service === 'PISTON') return product.kW <= 3.7 ? 1 : 2; // 1 L bottles
    if (product.service === 'VANE') return product.cfm < 20 ? 1 : 2; // 1 L bottles
    return 1;
  }
  if (part.role === 'EXHAUST_FILTER' && product.cfm > 30) return 2;
  if (part.role === 'VANES' || part.role === 'BELT') return 1;
  return 1;
}

const fits = (part, product) =>
  part.fits.some((f) => (f.startsWith('@') ? product.service === f.slice(1) : product.code.startsWith(f)));

// =============================================================================
// 1. Build everything in memory
// =============================================================================
function buildData() {
  // --- products and parts ---
  const productRows = products.map((p, i) => ({ ...p, id: i + 1 }));
  const partRows = parts.map((p, i) => ({ ...p, id: i + 1, compatible: productRows.filter((pr) => fits(p, pr)) }));
  for (const product of productRows) product.parts = partRows.filter((part) => part.compatible.includes(product));

  // --- customers: the 10 fixed ones have been with us from the start; the rest join over time ---
  const usedSlugs = new Set(['admin', ...people.technicians.map(([n]) => n.split(' ')[0].toLowerCase())]);
  const industryPairs = Object.entries(people.industries).map(([name, v]) => [name, v.weight]);
  const customers = [];
  for (let i = 0; i < CUSTOMER_COUNT; i++) {
    let companyName;
    let contactPerson;
    let city;
    let industry;
    let joined;
    if (i < people.fixedCustomers.length) {
      [companyName, contactPerson, city, industry] = people.fixedCustomers[i];
      joined = START;
    } else {
      industry = weighted(industryPairs);
      companyName = `${pick(people.namePrefixes)} ${pick(people.industries[industry].suffixes)}`;
      contactPerson = `${pick(people.firstNames)} ${pick(people.surnames)}`;
      city = pick(people.cities)[0];
      // 45% were already customers when the history starts. The rest join over the five years,
      // a little more often in later years (the square root leans towards later dates for half of them).
      const r = rand() < 0.5 ? rand() : Math.sqrt(rand());
      joined = rand() < 0.45 ? START : addDays(START, Math.floor(r * (today - START) / DAY * 0.95));
    }
    let slug = companyName.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    for (let n = 2; usedSlugs.has(slug); n++) slug = `${companyName.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')}${n}`;
    usedSlugs.add(slug);
    const stateCode = (people.cities.find(([c]) => c === city) || ['', '27'])[1];
    const continuous = CONTINUOUS_INDUSTRIES.includes(industry);
    const duty = weighted(continuous
      ? [['ONE_SHIFT', 1], ['TWO_SHIFT', 4], ['TWENTY_FOUR_SEVEN', 5]]
      : [['ONE_SHIFT', 5], ['TWO_SHIFT', 4], ['TWENTY_FOUR_SEVEN', 1]]);
    customers.push({
      id: i + 1, slug, companyName, contactPerson, city, industry, joined, duty,
      email: `contact@${slug}.example.com`,
      phone: `9${randInt(100000000, 999999999)}`,
      address: `Plot ${randInt(1, 240)}, ${pick(people.industryAreas)}, ${city}`,
      gstNumber: `${stateCode}${'ABCDEFGHJKLMNPQRSTUVWXYZ'[randInt(0, 23)]}${'ABCDEFGHJKLMNPQRSTUVWXYZ'[randInt(0, 23)]}${'ABCDEFGHJKLMNPQRSTUVWXYZ'[randInt(0, 23)]}CP${'ABCDEFGHJKLMNPQRSTUVWXYZ'[randInt(0, 23)]}${randInt(1000, 9999)}${'ABCDEFGHJKLMNPQRSTUVWXYZ'[randInt(0, 23)]}1Z${randInt(1, 9)}`,
    });
  }

  // --- machines ---
  const machines = [];
  const addMachine = (customer, product, installDate, serialNumber) => {
    const hoursPerDay = DUTY[customer.duty] * (0.85 + rand() * 0.15);
    const profile = SERVICE_PROFILES[product.service];
    const intervalDays = Math.min(365, Math.max(30, Math.round(profile.minorHours / hoursPerDay)));
    const machine = {
      id: machines.length + 1, customer, product, installDate, hoursPerDay, intervalDays,
      serialNumber: serialNumber || `${product.code}-${String(100000 + machines.length * 37 + randInt(0, 30)).slice(-6)}`,
      location: pick(['Compressor room', 'Utility block', 'Production line 1', 'Production line 2', 'Packing hall', 'Moulding shop', 'Plant room']),
      warrantyEnd: new Date(installDate.getTime() + 365 * DAY),
      // Customers on continuous production, and bigger machines, are more likely to buy an AMC.
      amcCustomer: rand() < (customer.duty === 'TWENTY_FOUR_SEVEN' ? 0.8 : 0.55) + (product.price > 1000000 ? 0.1 : 0),
      amcPeriods: [],
    };
    machines.push(machine);
    return machine;
  };
  // Products a customer would buy: rated for their industry, small sites lean to small machines.
  const suitableFor = (customer) => {
    const list = productRows.filter((p) => p.applications.split(',').includes(customer.industry));
    return list.length ? list : productRows.filter((p) => p.applications.includes('general'));
  };
  for (const customer of customers) {
    const count = weighted([[1, 1], [2, 3], [3, 3], [4, 3], [5, 2], [6, 2]]);
    for (let k = 0; k < count; k++) {
      const product = pick(suitableFor(customer));
      // Customers that were with us at the start mostly own machines installed before it (up to 6 years old).
      const installDate = customer.joined === START && rand() < 0.75
        ? addDays(START, -randInt(30, 6 * 365))
        : addDays(customer.joined, Math.floor(rand() * Math.max(1, (today - customer.joined) / DAY - 20)));
      addMachine(customer, product, installDate);
    }
  }
  // Demo machines (docs/DEMO-SCRIPT.md): Precision Plastics owns EG 11 serial AC-S11-024098,
  // and has a machine whose warranty ends in 25 days.
  const precision = customers[4];
  const eg11 = productRows.find((p) => p.code === 'AC-S11');
  const demoMachine = addMachine(precision, eg11, addDays(START, 20), 'AC-S11-024098');
  demoMachine.amcCustomer = true;
  const warrantyMachine = addMachine(precision, productRows.find((p) => p.code === 'VP-RV40'), daysFromToday(-340));

  // --- AMC contracts: one year at a time after warranty, renewed 85% of the time ---
  for (const m of machines) {
    if (!m.amcCustomer) continue;
    let start = m.warrantyEnd;
    while (start < today) {
      m.amcPeriods.push([start, addDays(start, 365)]);
      if (m !== demoMachine && rand() > 0.85) break;
      start = addDays(start, 365);
    }
  }
  const coveredOn = (m, date) => date < m.warrantyEnd || m.amcPeriods.some(([s, e]) => date >= s && date < e);

  // --- jobs ---
  const technicianWeights = people.technicians.map((_, i) => [i, i === 0 ? 1.4 : 1]);
  const jobs = [];
  const addJob = (machine, type, date, partsUsed, notes) => {
    const closedDate = type === 'BREAKDOWN' ? addDays(date, weighted([[0, 5], [1, 3], [2, 1], [3, 1]])) : date;
    if (date < START || closedDate >= today) return null; // outside the history (open work is created separately)
    const job = { id: jobs.length + 1, machine, type, date, closedDate, partsUsed, notes, tech: weighted(technicianWeights) };
    jobs.push(job);
    return job;
  };
  const partsForRoles = (product, roles) => {
    const used = [];
    for (const role of roles) {
      for (const part of product.parts.filter((p) => p.role === role)) {
        if (!used.some((u) => u.part === part)) used.push({ part, quantity: quantityFor(part, product) });
      }
    }
    return used;
  };

  for (const m of machines) {
    const profile = SERVICE_PROFILES[m.product.service];
    if (m.installDate >= START) addJob(m, 'INSTALLATION', m.installDate, [], pick(['Installed and commissioned. Operators trained on start/stop and daily checks.', 'Installation done, piping leak test OK, first run hours noted.']));

    // Routine services every `minorHours` running hours.
    m.lastRoutine = null;
    for (let k = 1; ; k++) {
      const due = addDays(m.installDate, k * m.intervalDays);
      if (due >= today) break;
      if (due < START) continue;
      const covered = coveredOn(m, due);
      if (!covered && rand() < 0.2) continue; // no contract: the customer sometimes never calls
      const date = avoidHolidays(addDays(due, covered ? randInt(-4, 4) : randInt(0, 45)));
      const hours = k * profile.minorHours;
      const roles = profile.steps.filter(([every]) => hours % every === 0).flatMap(([, r]) => r);
      const used = partsForRoles(m.product, roles);
      const big = roles.length > 2;
      const note = `${big ? 'Major' : 'Routine'} service at about ${hours.toLocaleString('en-IN')} running hours. `
        + `${used.length ? `Replaced ${used.map((u) => u.part.name[0].toLowerCase() + u.part.name.slice(1)).join(', ')}. ` : ''}`
        + pick(['Checked drain and pressure settings.', 'Cleaned cooler and checked for leaks.', 'Load/unload pressures verified.', 'Running parameters normal.']);
      const job = addJob(m, 'ROUTINE', date, used, note);
      if (job) m.lastRoutine = job.closedDate;
    }

    // Breakdowns: one chance per month of the machine's life inside the history window.
    const firstMonth = m.installDate > START ? m.installDate : START;
    for (let d = new Date(firstMonth.getFullYear(), firstMonth.getMonth(), 1, 10); d < today; d = new Date(d.getFullYear(), d.getMonth() + 1, 1, 10)) {
      const age = monthsBetween(m.installDate, d);
      if (age < 0) continue;
      const chance = BREAKDOWN_RATE[m.product.service] * ageFactor(age) * SEASON[d.getMonth()]
        * (coveredOn(m, d) ? 1 : 1.7) * (m.hoursPerDay / DUTY.TWO_SHIFT);
      if (rand() >= chance) continue;
      const season = seasonOf(d.getMonth());
      const fault = weighted(FAULTS[m.product.service].map((f) => [
        f,
        f.weight * (f.season && f.season === season ? 2.5 : 1) * (f.old ? (age > 48 ? 3 : 0.3) : 1) * (f.rare ? 0.3 : 1),
      ]));
      const date = addDays(d, randInt(0, 27));
      if (date < m.installDate || date >= today) continue;
      const used = partsForRoles(m.product, fault.roles);
      addJob(m, 'BREAKDOWN', date, used, fault.note);
    }
  }
  jobs.sort((a, b) => a.date - b.date);
  jobs.forEach((j, i) => { j.id = i + 1; });

  return { productRows, partRows, customers, machines, jobs, demoMachine, warrantyMachine, eg11 };
}

// =============================================================================
// 2. Stock: replay the history day by day
//    Opening stock, then a purchase order on the 15th of every month that refills
//    each part to its minimum level plus about a month of recent use, and job
//    consumption as it happens. If a job needs more than is on the shelf, an
//    urgent local purchase is made first.
// =============================================================================
const PO_DAY = 15;
const COVER_MONTHS = 1.2; // stock bought on each purchase order, in months of recent use

function simulateStock(partRows, jobs) {
  const months = monthsBetween(START, today) + 1;
  const usageByMonth = new Map(partRows.map((p) => [p.id, new Array(months).fill(0)]));
  for (const job of jobs) {
    for (const u of job.partsUsed) usageByMonth.get(u.part.id)[monthsBetween(START, job.closedDate)] += u.quantity;
  }
  const movements = [];
  let poNumber = 1000;
  for (const part of partRows) {
    const usage = usageByMonth.get(part.id);
    const avg = usage.reduce((a, b) => a + b, 0) / months;
    // Minimum level = about half a month of typical use, at least 1 (2 for cheap fast movers).
    part.minimumLevel = Math.max(part.unitPrice < 3000 ? 2 : 1, Math.ceil(avg / 2));
    part.stockQty = part.minimumLevel + Math.ceil(avg * COVER_MONTHS);
    movements.push({ part, change: part.stockQty, reason: 'ADJUSTMENT', note: 'Opening stock', date: START });
  }

  // One timeline of purchase orders and jobs, in date order.
  const events = jobs.map((job) => ({ date: job.closedDate, job }));
  for (let mi = 0; mi < months; mi++) {
    const poDate = new Date(START.getFullYear(), START.getMonth() + mi, PO_DAY, 9);
    if (poDate < today) events.push({ date: poDate, monthIndex: mi });
  }
  events.sort((a, b) => a.date - b.date);

  for (const event of events) {
    if (event.job) {
      for (const u of event.job.partsUsed) {
        if (u.part.stockQty < u.quantity) {
          const qty = u.quantity - u.part.stockQty + 1;
          u.part.stockQty += qty;
          movements.push({ part: u.part, change: qty, reason: 'RESTOCK', note: 'Urgent local purchase', date: addDays(event.date, -1) });
        }
        u.part.stockQty -= u.quantity;
        movements.push({ part: u.part, change: -u.quantity, reason: 'JOB_CONSUMPTION', job: event.job, date: event.date });
      }
      continue;
    }
    // Purchase order: expected use = average of the last 3 months.
    for (const part of partRows) {
      const recent = usageByMonth.get(part.id).slice(Math.max(0, event.monthIndex - 3), event.monthIndex);
      const expected = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
      const target = part.minimumLevel + Math.ceil(expected * COVER_MONTHS);
      if (part.stockQty < target) {
        poNumber += 1;
        movements.push({ part, change: target - part.stockQty, reason: 'RESTOCK', note: `PO-${poNumber}`, date: event.date });
        part.stockQty = target;
      }
    }
  }
  return movements;
}

// =============================================================================
// 3. Write to the database
// =============================================================================
async function insertInChunks(model, rows, size = 1000) {
  for (let i = 0; i < rows.length; i += size) await model.createMany({ data: rows.slice(i, i + size) });
}

async function main() {
  const password = process.env.SEED_PASSWORD;
  if (!password) throw new Error('Set SEED_PASSWORD in .env (demo password for seeded accounts)');

  const { productRows, partRows, customers, machines, jobs, demoMachine, warrantyMachine, eg11 } = buildData();
  const movements = simulateStock(partRows, jobs);

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

  const passwordHash = await bcrypt.hash(password, 10);
  console.log('Writing catalog...');

  // --- products and parts (one by one, because parts are linked to the models they fit) ---
  for (const p of productRows) {
    await prisma.product.create({
      data: {
        id: p.id, modelName: p.modelName, name: p.name, category: p.category, type: p.type, phase: p.phase,
        applications: p.applications, price: p.price, powerKw: p.kW, pressureBar: p.bar,
        airflowCfm: p.cfm,
        airflowLpm: Math.round(p.cfm * 28.317), // 1 CFM = 28.317 litres per minute
        description: `${p.name}. Suitable for ${p.applications.replace(/,/g, ', ')} applications.`,
      },
    });
  }
  // Demo part (docs/DEMO-SCRIPT.md): SEP-S11 has 5 in stock with a minimum of 2.
  const demoPart = partRows.find((p) => p.partNumber === 'SEP-S11');
  const audit = 5 - demoPart.stockQty;
  demoPart.minimumLevel = 2;
  if (audit !== 0) {
    demoPart.stockQty = 5;
    movements.push({ part: demoPart, change: audit, reason: 'ADJUSTMENT', note: 'Stock audit correction', date: daysFromToday(-2) });
  }
  for (const p of partRows) {
    await prisma.part.create({
      data: {
        id: p.id, partNumber: p.partNumber, name: p.name, unitPrice: p.unitPrice, minimumLevel: p.minimumLevel, stockQty: p.stockQty,
        compatibleProducts: { connect: p.compatible.map((pr) => ({ id: pr.id })) },
      },
    });
  }

  // --- people ---
  console.log('Writing customers, staff and machines...');
  await prisma.user.create({ data: { id: 1, name: 'Owner Admin', email: 'admin@demo.local', role: 'ADMIN', passwordHash, phone: '9800000001', createdAt: START } });
  const techIds = [];
  for (const [i, [name, phone]] of people.technicians.entries()) {
    techIds.push(i + 2);
    await prisma.user.create({
      data: { id: i + 2, name, phone, role: 'TECHNICIAN', passwordHash, email: `${name.split(' ')[0].toLowerCase()}@demo.local`, createdAt: START },
    });
  }
  await insertInChunks(prisma.customer, customers.map((c) => ({
    id: c.id, companyName: c.companyName, contactPerson: c.contactPerson, email: c.email, phone: c.phone,
    address: c.address, city: c.city, gstNumber: c.gstNumber, createdAt: c.joined,
  })));
  const firstCustomerUserId = 100;
  await insertInChunks(prisma.user, customers.map((c) => ({
    id: firstCustomerUserId + c.id, name: c.contactPerson, email: `${c.slug}@demo.local`, role: 'CUSTOMER',
    passwordHash, customerId: c.id, createdAt: c.joined,
  })));

  // --- machines (next service = last routine visit + interval) ---
  for (const m of machines) {
    let next = addDays(m.lastRoutine || m.installDate, m.intervalDays);
    while (next < daysFromToday(-30)) next = addDays(next, m.intervalDays); // reminders were sent; keep overdue dates believable
    m.nextServiceDue = next;
    const amc = m.amcPeriods[m.amcPeriods.length - 1];
    m.amcStart = amc ? amc[0] : null;
    m.amcEnd = amc ? amc[1] : null;
  }
  // Make sure the demo always has reminders and expiring contracts to show.
  const others = machines.filter((m) => m.customer.id !== 5);
  for (const [i, days] of [[0, 3], [5, 7], [11, 12], [17, 14], [23, -4], [29, -9]]) others[i].nextServiceDue = daysFromToday(days);
  for (const [i, days] of [[2, 10], [8, 21], [14, 28]]) {
    others[i].amcStart = daysFromToday(days - 365);
    others[i].amcEnd = daysFromToday(days);
  }
  demoMachine.amcStart = daysFromToday(-120);
  demoMachine.amcEnd = daysFromToday(245);
  warrantyMachine.warrantyEnd = daysFromToday(25);

  await insertInChunks(prisma.machine, machines.map((m) => ({
    id: m.id, serialNumber: m.serialNumber, productId: m.product.id, customerId: m.customer.id, location: m.location,
    installDate: m.installDate, warrantyEnd: m.warrantyEnd, amcStart: m.amcStart, amcEnd: m.amcEnd,
    serviceIntervalDays: m.intervalDays, nextServiceDue: m.nextServiceDue,
    qrToken: crypto.randomBytes(9).toString('base64url'), createdAt: m.installDate < START ? START : m.installDate,
  })));

  // --- breakdown calls: most were logged as service requests by the customer ---
  console.log(`Writing ${jobs.length} jobs and their parts...`);
  const requests = [];
  for (const job of jobs) {
    if (job.type !== 'BREAKDOWN' || rand() > 0.7) continue;
    job.requestId = requests.length + 1;
    requests.push({
      id: job.requestId, machineId: job.machine.id, customerId: job.machine.customer.id,
      raisedById: firstCustomerUserId + job.machine.customer.id,
      description: job.notes.split('. ')[0].replace(/\.$/, '') + '.',
      status: 'RESOLVED', createdAt: addDays(job.date, -randInt(0, 1)),
    });
  }
  await insertInChunks(prisma.serviceRequest, requests);
  await insertInChunks(prisma.serviceJob, jobs.map((j) => ({
    id: j.id, machineId: j.machine.id, technicianId: techIds[j.tech], serviceRequestId: j.requestId || null,
    type: j.type, status: 'CLOSED', scheduledDate: j.date, closedDate: j.closedDate, notes: j.notes, createdAt: j.date,
  })));
  await insertInChunks(prisma.partUsed, jobs.flatMap((j) => j.partsUsed.map((u) => ({ jobId: j.id, partId: u.part.id, quantity: u.quantity }))));
  await insertInChunks(prisma.stockMovement, movements.map((mv) => ({
    partId: mv.part.id, change: mv.change, reason: mv.reason, note: mv.note || null, jobId: mv.job ? mv.job.id : null,
    userId: mv.job ? techIds[mv.job.tech] : 1, createdAt: mv.date,
  })));

  // --- current work: open / in-progress jobs and new requests (ids continue after history) ---
  const ravi = techIds[0];
  const openJobs = [
    [others[0], ravi, 'ROUTINE', 'OPEN', 3],
    [others[5], techIds[1], 'ROUTINE', 'OPEN', 7],
    [others[3], ravi, 'BREAKDOWN', 'IN_PROGRESS', 0],
    [others[9], techIds[2], 'BREAKDOWN', 'OPEN', 1],
    [others[20], techIds[3], 'ROUTINE', 'OPEN', 2],
    [others[40], techIds[4], 'INSTALLATION', 'OPEN', 5],
  ];
  for (const [i, [machine, technicianId, type, status, inDays]] of openJobs.entries()) {
    await prisma.serviceJob.create({
      data: {
        id: jobs.length + 1 + i, machineId: machine.id, technicianId, type, status, scheduledDate: daysFromToday(inDays),
        notes: type === 'INSTALLATION' ? 'Second unit for plant expansion. Foundation ready.' : type === 'ROUTINE' ? 'Scheduled routine service.' : 'Customer reports machine tripping. Inspect and repair.',
      },
    });
  }
  const newRequests = [
    [others[1], 'Compressor is taking longer than usual to build pressure in the morning.', 'NEW'],
    [others[6], 'Vacuum level dropping during packing shift, pump sounds louder.', 'NEW'],
    [others[12], 'Oil visible in the air line near the dryer outlet.', 'NEW'],
    [others[4], 'Request for quotation to extend AMC for another year.', 'RESOLVED'],
  ];
  for (const [i, [machine, description, status]] of newRequests.entries()) {
    await prisma.serviceRequest.create({
      data: {
        id: requests.length + 1 + i, machineId: machine.id, customerId: machine.customer.id,
        raisedById: firstCustomerUserId + machine.customer.id, description, status, createdAt: daysFromToday(-randInt(0, 2)),
      },
    });
  }

  // Postgres keeps a separate counter for auto-increment ids; move it past the ids we set ourselves.
  if ((process.env.DATABASE_URL || '').startsWith('postgres')) {
    for (const table of ['User', 'Customer', 'Product', 'Machine', 'ServiceJob', 'Part', 'PartUsed', 'ServiceRequest', 'StockMovement']) {
      await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1))`);
    }
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
    stockMovements: await prisma.stockMovement.count(),
    requests: await prisma.serviceRequest.count(),
  };
  console.log('Seed complete:', counts);
  console.log(`Demo machine ${demoMachine.serialNumber} (${eg11.modelName}).`);
  console.log('Logins: admin@demo.local, ravi@demo.local (technician), precision@demo.local (customer). Password = SEED_PASSWORD');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
