// Reference data for the state/city comboboxes in FilterBar.
// Not exhaustive (India has ~700+ districts) — covers state capitals,
// major cities, and common auction-listing locations. Extend the
// relevant state's array any time a new city needs to show up.

export const STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export const CITIES_BY_STATE = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry", "Tirupati", "Kadapa", "Kakinada", "Anantapur", "Eluru", "Ongole", "Chittoor"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tezpur", "Tinsukia"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Purnia", "Arrah", "Begusarai", "Chapra", "Katihar"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Rajnandgaon", "Raigarh"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Junagadh", "Anand", "Nadiad", "Mehsana", "Bharuch", "Navsari", "Valsad", "Vapi", "Morbi"],
  "Haryana": ["Faridabad", "Gurugram", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula", "Bhiwani"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Kullu", "Una"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh", "Giridih"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubballi", "Dharwad", "Mangaluru", "Belagavi", "Ballari", "Davangere", "Shivamogga", "Tumakuru", "Kalaburagi", "Vijayapura", "Hassan", "Udupi", "Bidar"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur", "Alappuzha", "Palakkad", "Malappuram", "Kottayam"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa", "Bhind"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Chhatrapati Sambhajinagar", "Solapur", "Kolhapur", "Amravati", "Navi Mumbai", "Vasai-Virar", "Kalyan-Dombivli", "Ahmednagar", "Akola", "Latur", "Jalgaon", "Sangli", "Satara", "Ratnagiri", "Chandrapur"],
  "Manipur": ["Imphal", "Thoubal"],
  "Meghalaya": ["Shillong", "Tura"],
  "Mizoram": ["Aizawl", "Lunglei"],
  "Nagaland": ["Kohima", "Dimapur"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Pathankot", "Hoshiarpur"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer", "Bhilwara", "Alwar", "Sikar", "Bharatpur", "Pali"],
  "Sikkim": ["Gangtok", "Namchi"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Erode", "Vellore", "Thoothukudi", "Thanjavur", "Dindigul", "Kanchipuram", "Karur", "Nagercoil"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramagundam", "Mahbubnagar", "Nalgonda", "Adilabad", "Secunderabad"],
  "Tripura": ["Agartala", "Udaipur"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi", "Meerut", "Prayagraj", "Bareilly", "Aligarh", "Moradabad", "Noida", "Gorakhpur", "Jhansi", "Muzaffarnagar", "Mathura", "Saharanpur", "Firozabad"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Nainital"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman", "Malda", "Kharagpur", "Haldia", "Darjeeling"],
  "Andaman and Nicobar Islands": ["Port Blair"],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Silvassa", "Daman", "Diu"],
  "Delhi": ["New Delhi", "Dwarka", "Rohini", "Saket", "Karol Bagh"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"],
  "Ladakh": ["Leh", "Kargil"],
  "Lakshadweep": ["Kavaratti"],
  "Puducherry": ["Puducherry", "Karaikal"],
};

// Flattened, de-duplicated list for when no state is selected yet.
export const ALL_CITIES = Array.from(
  new Set(Object.values(CITIES_BY_STATE).flat())
).sort();

// Lowercase city -> state, for the "typing a city auto-fills state" behavior.
// Note: a handful of city names repeat across states in real life (rare in
// this list) — this map keeps whichever state was added last for that name.
const CITY_TO_STATE = {};
for (const [state, cities] of Object.entries(CITIES_BY_STATE)) {
  for (const city of cities) {
    CITY_TO_STATE[city.toLowerCase()] = state;
  }
}

export function getCitiesForState(state) {
  return state && CITIES_BY_STATE[state] ? CITIES_BY_STATE[state] : ALL_CITIES;
}

export function findStateForCity(cityInput) {
  if (!cityInput) return null;
  return CITY_TO_STATE[cityInput.trim().toLowerCase()] || null;
}