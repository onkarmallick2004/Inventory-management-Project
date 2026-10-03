# Data: sources and how the seed history is built

`npm run seed` (backend) fills the database with five years of service-company history. This page explains
where each part of it comes from, so every number can be traced.

## What is in the database

| | Count |
|---|---|
| History | last 5 years, up to today |
| Products | 29 (21 air compressors, 8 vacuum pumps) |
| Spare parts | 153 |
| Customers | 120, each with a portal login |
| Technicians | 8 |
| Machines installed | about 450 |
| Closed service jobs | about 6,300 (routine, breakdown, installation) |
| Parts used on jobs | about 12,900 lines |
| Stock movements | about 17,700 (opening stock, purchase orders, job consumption) |

Machine and job counts move slightly with today's date because the history always ends today.

## Product catalog: manufacturer specifications

Power, free air delivery (FAD) and pressure for compressors, and pumping speed and ultimate vacuum for
vacuum pumps, are taken from the manufacturers' published 50 Hz data:

| Products | Source |
|---|---|
| ELGi EG 11 to EG 75 oil-lubricated screw compressors (8 bar, plus 12.5 bar EG 11 and EG 22) | ELGi EG series 11-75 kW technical data, FAD per ISO 1217 Annex C |
| ELGi AB 11 to AB 37 oil-free screw compressors (8 bar) | ELGi AB series brochure, 50 Hz technical data |
| ELGi SS 03, TS 05, TS 10, TS 15 piston compressors | ELGi single and two stage reciprocating compressor data sheet |
| Atlas Copco SF 2, SF 4, SF 6 oil-free scroll compressors (8 bar) | Atlas Copco SF / SF+ technical data |
| Busch R5 RA 0016 C, 0040 F, 0063 F, 0100 F rotary vane pumps | Busch R5 product data |
| Busch Dolphin LX 0140 B, LC 0220 A liquid ring pumps | Busch Dolphin product data |
| Edwards nXDS10i dry scroll pump | Edwards nXDS data |

Prices are estimated Indian list prices. Part numbers are the company's own stock codes; which parts fit
which model follows each machine's construction (filter, separator and valve sizes per frame).

## Maintenance intervals

Routine services are planned in running hours, as in the manufacturers' maintenance guides
(`backend/prisma/seed-data/catalog.js`, `SERVICE_PROFILES`):

- **Oil-lubricated screw:** air and oil filter every 1,000 h; separator and oil every 4,000 h; minimum
  pressure and thermostatic valves every 8,000 h; motor bearings every 16,000 h.
- **Piston:** air filter and oil every 500 h, belts 1,500 h, valve plates 3,000 h, piston rings 6,000 h.
- **Oil-free screw, scroll and vacuum pumps:** typical intervals for each machine type (see the file).

## Rules used to build the history (`backend/prisma/seed.js`)

1. **Duty cycle.** Each customer runs one shift (about 7 running hours a day), two shifts (14 h) or 24x7
   (21 h). Continuous industries (pharma, food, plastics, textile, packaging) are more often 24x7.
   A machine's service interval in days = service hours / running hours per day.
2. **Warranty and AMC.** Every machine has a 12-month warranty. Most customers then take a yearly AMC
   (more likely for 24x7 plants and expensive machines), renewed about 85% of the time.
3. **Routine services.** Covered machines are serviced within a few days of the due date. Machines with no
   contract are sometimes late (up to 45 days) or skipped. Visits avoid Sundays and the Diwali shutdown week.
4. **Breakdowns.** Each month a machine has a small chance of a breakdown. The chance is higher:
   - in the first 3 months after installation and after about 4 years (bathtub curve),
   - in April to June (heat) and July to September (monsoon humidity),
   - for machines without a contract,
   - for machines running more hours.

   The fault picked depends on the season (overheating faults in summer, drain and filter faults in the
   monsoon) and on age (bearings, coolers and airend work on older machines). Fault types such as air
   leaks and oil leaks match the failures recorded in the MetroPT-2 and MetroPT-3 compressor datasets
   (UCI Machine Learning Repository and Zenodo, CC BY 4.0).
5. **Growth.** Customers join throughout the five years, a little more often in recent years, so the
   number of jobs and parts used rises year on year.
6. **Stores.** A purchase order on the 15th of each month refills every part to its minimum level plus
   about a month of recent use. If a job needs a part that is out of stock, an urgent local purchase is
   recorded first. The stock on hand always equals the sum of a part's movements (checked by a test).

The random generator has a fixed seed, so every run produces the same history.

## Records the demo script relies on

`admin@demo.local`, `ravi@demo.local`, `precision@demo.local` (Precision Plastics Moulding), machine
`AC-S11-024098` (ELGi EG 11) and part `SEP-S11` with 5 in stock and a minimum of 2 are always created.
