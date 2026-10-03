// =============================================================
// Word lists for generating customer companies, contacts and staff.
// =============================================================

// The first ten customers are fixed so the demo script and tests can rely on them.
// [companyName, contactPerson, city, industry]
const fixedCustomers = [
  ['Shree Ganesh Pharma Pvt Ltd', 'Anil Deshpande', 'Pune', 'pharma'],
  ['Kaveri Foods & Beverages', 'Meera Iyer', 'Bengaluru', 'food'],
  ['Tata Auto Components Unit 4', 'Rakesh Sharma', 'Jamshedpur', 'automotive'],
  ['Sunrise Textiles Ltd', 'Farhan Shaikh', 'Surat', 'textile'],
  ['Precision Plastics Moulding', 'Kiran Patil', 'Nashik', 'plastics'],
  ['GreenLeaf Packaging Co', 'Divya Nair', 'Kochi', 'packaging'],
  ['Om Sai Dental Clinic Chain', 'Dr. Sunil Joshi', 'Mumbai', 'medical'],
  ['Deccan Steel Fabricators', 'Venkat Rao', 'Hyderabad', 'steel'],
  ['Himalaya Woodcraft Furniture', 'Harpreet Singh', 'Ludhiana', 'woodworking'],
  ['BlueWave Electronics Assembly', 'Priya Menon', 'Chennai', 'electronics'],
];

// Industrial cities with their GST state code.
const cities = [
  ['Pune', '27'], ['Mumbai', '27'], ['Nashik', '27'], ['Aurangabad', '27'], ['Bengaluru', '29'], ['Hosur', '33'],
  ['Chennai', '33'], ['Coimbatore', '33'], ['Hyderabad', '36'], ['Ahmedabad', '24'], ['Surat', '24'], ['Vadodara', '24'],
  ['Rajkot', '24'], ['Ludhiana', '03'], ['Faridabad', '06'], ['Gurugram', '06'], ['Noida', '09'], ['Kochi', '32'],
  ['Jamshedpur', '20'], ['Indore', '23'], ['Kolkata', '19'], ['Baddi', '02'], ['Silvassa', '26'],
];

const industryAreas = ['MIDC Industrial Area', 'SIDCO Industrial Estate', 'GIDC Estate', 'Industrial Area Phase II', 'KIADB Industrial Area', 'Focal Point', 'Sector 63'];

// How common each industry is among customers, and the words used in company names.
const industries = {
  pharma: { weight: 12, suffixes: ['Pharma Pvt Ltd', 'Life Sciences', 'Healthcare Ltd', 'Formulations'] },
  food: { weight: 12, suffixes: ['Foods Pvt Ltd', 'Dairy Products', 'Beverages', 'Agro Foods'] },
  automotive: { weight: 14, suffixes: ['Auto Components', 'Engineering Works', 'Forgings Pvt Ltd', 'Auto Parts'] },
  textile: { weight: 11, suffixes: ['Textiles Ltd', 'Spinning Mills', 'Fabrics Pvt Ltd', 'Weaving Mills'] },
  plastics: { weight: 11, suffixes: ['Polymers', 'Plastics Pvt Ltd', 'Moulders', 'PET Containers'] },
  packaging: { weight: 10, suffixes: ['Packaging Pvt Ltd', 'Corrugators', 'Flexipack', 'Cartons'] },
  medical: { weight: 5, suffixes: ['Hospital', 'Dental Care', 'Diagnostics', 'Medical Devices'] },
  steel: { weight: 9, suffixes: ['Steel Fabricators', 'Castings Pvt Ltd', 'Metal Industries', 'Rolling Mills'] },
  woodworking: { weight: 6, suffixes: ['Furniture Works', 'Woodcraft', 'Plywood Industries', 'Interiors'] },
  electronics: { weight: 7, suffixes: ['Electronics Pvt Ltd', 'Circuits', 'Electricals', 'Cable Industries'] },
  general: { weight: 3, suffixes: ['Industries', 'Enterprises', 'Engineering Co'] },
};

const namePrefixes = [
  'Aarti', 'Abhinav', 'Agrawal', 'Ajanta', 'Alpine', 'Ambica', 'Amrut', 'Anand', 'Annapurna', 'Apex', 'Arihant', 'Ashok',
  'Balaji', 'Bharat', 'Bhavani', 'Chamunda', 'Chetak', 'Crystal', 'Datta', 'Deep', 'Dhanlaxmi', 'Durga', 'Eastern', 'Everest',
  'Galaxy', 'Gayatri', 'Global', 'Golden', 'Gujarat', 'Hari', 'Hindustan', 'Indus', 'Jai', 'Janata', 'Jyoti', 'Kalyani',
  'Kamdhenu', 'Kesar', 'Kohinoor', 'Krishna', 'Lakshmi', 'Laxmi', 'Lotus', 'Madhur', 'Mahalaxmi', 'Mangal', 'Maruti', 'Mayur',
  'Metro', 'Mohan', 'Nandi', 'National', 'Navkar', 'Neelkanth', 'Nirmal', 'Orient', 'Padmavati', 'Paras', 'Parle', 'Pioneer',
  'Pragati', 'Prime', 'Rajdhani', 'Ram', 'Ratna', 'Royal', 'Sagar', 'Sahyadri', 'Sai', 'Samarth', 'Sanjivani', 'Saraswati',
  'Shakti', 'Shiv', 'Shubh', 'Siddhi', 'Sigma', 'Sri', 'Star', 'Sterling', 'Sudarshan', 'Supreme', 'Surya', 'Swastik',
  'Trimurti', 'Triveni', 'Tulsi', 'Uday', 'Unique', 'United', 'Vardhman', 'Varun', 'Vijay', 'Vinayak', 'Vishal', 'Western',
  'Yash', 'Yamuna', 'Zenith',
];

const firstNames = [
  'Amit', 'Anita', 'Arjun', 'Deepak', 'Gaurav', 'Kavita', 'Manoj', 'Nikhil', 'Pooja', 'Prakash', 'Rahul', 'Rajesh', 'Ramesh',
  'Rohit', 'Sachin', 'Sandeep', 'Shweta', 'Snehal', 'Suresh', 'Swati', 'Vikas', 'Vinod', 'Yogesh', 'Neha', 'Ajay', 'Mahesh',
  'Lakshmi', 'Karthik', 'Senthil', 'Mohammed', 'Gurpreet', 'Bhavesh', 'Hitesh', 'Jignesh', 'Arun', 'Sunita', 'Abdul', 'Joseph',
];
const surnames = [
  'Patil', 'Sharma', 'Kulkarni', 'Joshi', 'Iyer', 'Nair', 'Reddy', 'Rao', 'Gupta', 'Agarwal', 'Shah', 'Patel', 'Mehta', 'Singh',
  'Gill', 'Verma', 'Yadav', 'Pillai', 'Menon', 'Desai', 'Jadhav', 'Pawar', 'Khan', 'Shaikh', 'Das', 'Banerjee', 'Murugan', 'Thomas',
];

// Service technicians. Ravi is used by the demo script and tests.
const technicians = [
  ['Ravi Kumar', '9800000011'],
  ['Sanjay Pawar', '9800000012'],
  ['Imran Khan', '9800000013'],
  ['Prakash Naidu', '9800000014'],
  ['Vikram Chauhan', '9800000015'],
  ['Arun Selvam', '9800000016'],
  ['Manish Tiwari', '9800000017'],
  ['Joseph Mathew', '9800000018'],
];

module.exports = { fixedCustomers, cities, industryAreas, industries, namePrefixes, firstNames, surnames, technicians };
