const pool = require("./pool");
const crypto = require("crypto");

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMPONENTS = ["RBC", "WHOLE_BLOOD", "PLASMA", "PLATELETS"];

// 1. 20 Hyderabad Blood Centres & Banks
const HYDERABAD_BLOOD_CENTRES = [
    {
        name: "Chiranjeevi Eye & Blood Centre",
        code: "FAC-HYD-BC01",
        type: "PRIVATE_BLOOD_BANK",
        ownership: "CHARITABLE",
        area: "Jubilee Hills",
        address: "Plot No. 1298, Road No. 1 & 45, Jubilee Hills, Hyderabad",
        lat: 17.4319,
        lon: 78.4073,
        phone: "+91 40 2355 5005",
        email: "contact@chiranjeevibloodbank.org",
        contact_person: "Dr. C. Ramana Murthy",
        registration_number: "TS/HYD/BB/2002/014",
        established_year: 1998,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Indian Red Cross Society Blood Centre - Vidyanagar",
        code: "FAC-HYD-BC02",
        type: "GOVERNMENT_BLOOD_BANK",
        ownership: "SOCIETY",
        area: "Vidyanagar",
        address: "Red Cross Building, Adikmet Road, Vidyanagar, Hyderabad",
        lat: 17.4042,
        lon: 78.5085,
        phone: "+91 40 2707 7799",
        email: "redcross.vidyanagar@ircstg.org",
        contact_person: "Sri M. Sudhakar Rao",
        registration_number: "TS/HYD/BB/1985/002",
        established_year: 1985,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "NTR Memorial Trust Blood Centre",
        code: "FAC-HYD-BC03",
        type: "PRIVATE_BLOOD_BANK",
        ownership: "CHARITABLE",
        area: "Banjara Hills",
        address: "Road No. 2, Banjara Hills, Hyderabad",
        lat: 17.4224,
        lon: 78.4316,
        phone: "+91 40 4658 8888",
        email: "bloodcentre@ntrtrust.org",
        contact_person: "Dr. K. Srinivas",
        registration_number: "TS/HYD/BB/2005/033",
        established_year: 2003,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Lions Club of Hyderabad Blood Centre",
        code: "FAC-HYD-BC04",
        type: "PRIVATE_BLOOD_BANK",
        ownership: "VOLUNTARY",
        area: "Paradise, Secunderabad",
        address: "SD Road, Near Paradise Circle, Secunderabad",
        lat: 17.4435,
        lon: 78.4892,
        phone: "+91 40 2784 1212",
        email: "lionsbloodbank.secbad@gmail.com",
        contact_person: "Lion Rajeshwar Gupta",
        registration_number: "TS/SEC/BB/1992/008",
        established_year: 1992,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Aarohi Blood Bank & Component Lab",
        code: "FAC-HYD-BC05",
        type: "PRIVATE_BLOOD_BANK",
        ownership: "PRIVATE",
        area: "Khairatabad",
        address: "6-1-1063, Raj Bhavan Road, Khairatabad, Hyderabad",
        lat: 17.4116,
        lon: 78.4612,
        phone: "+91 40 2338 9090",
        email: "aarohibloodcentre@gmail.com",
        contact_person: "Dr. Anuradha Reddy",
        registration_number: "TS/HYD/BB/2011/045",
        established_year: 2011,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Janani Voluntary Blood Centre",
        code: "FAC-HYD-BC06",
        type: "PRIVATE_BLOOD_BANK",
        ownership: "VOLUNTARY",
        area: "Kacheguda",
        address: "Station Road, Near Railway Station, Kacheguda, Hyderabad",
        lat: 17.3912,
        lon: 78.4971,
        phone: "+91 40 2465 4321",
        email: "jananibloodcentre@yahoo.com",
        contact_person: "Sri Ramesh Chandra",
        registration_number: "TS/HYD/BB/2000/021",
        established_year: 2000,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Yashoda Hospital Blood Centre - Somajiguda",
        code: "FAC-HYD-BC07",
        type: "PRIVATE_BLOOD_BANK",
        ownership: "PRIVATE",
        area: "Somajiguda",
        address: "Raj Bhavan Road, Somajiguda, Hyderabad",
        lat: 17.4241,
        lon: 78.4578,
        phone: "+91 40 4567 4567",
        email: "transfusion.somajiguda@yashodamail.com",
        contact_person: "Dr. P. Sandhya",
        registration_number: "TS/HYD/BB/2004/029",
        established_year: 2004,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Apollo Hospital Transfusion Medicine - Jubilee Hills",
        code: "FAC-HYD-BC08",
        type: "PRIVATE_BLOOD_BANK",
        ownership: "PRIVATE",
        area: "Jubilee Hills",
        address: "Road No. 72, Opposite Bharatiya Vidya Bhavan, Jubilee Hills, Hyderabad",
        lat: 17.4172,
        lon: 78.4118,
        phone: "+91 40 2360 7777",
        email: "bloodbank_hyd@apollohospitals.com",
        contact_person: "Dr. Sharmila K.",
        registration_number: "TS/HYD/BB/1988/001",
        established_year: 1988,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "KIMS Hospital Blood Centre - Minister Road",
        code: "FAC-HYD-BC09",
        type: "PRIVATE_BLOOD_BANK",
        ownership: "PRIVATE",
        area: "Begumpet",
        address: "1-8-31/1, Minister Road, Krishna Nagar Colony, Begumpet, Secunderabad",
        lat: 17.4382,
        lon: 78.4842,
        phone: "+91 40 4488 5000",
        email: "bloodbank@kimshospitals.com",
        contact_person: "Dr. B. Ravinder",
        registration_number: "TS/SEC/BB/2006/039",
        established_year: 2006,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Care Hospital Transfusion Centre - Banjara Hills",
        code: "FAC-HYD-BC10",
        type: "PRIVATE_BLOOD_BANK",
        ownership: "PRIVATE",
        area: "Banjara Hills",
        address: "Road No. 1, Banjara Hills, Hyderabad",
        lat: 17.4158,
        lon: 78.4485,
        phone: "+91 40 6165 6565",
        email: "carebloodbank.banjara@carehospitals.com",
        contact_person: "Dr. T. Venkat Rao",
        registration_number: "TS/HYD/BB/2001/017",
        established_year: 2000,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Sunshine Hospital Blood Centre - Gachibowli",
        code: "FAC-HYD-BC11",
        type: "PRIVATE_BLOOD_BANK",
        ownership: "PRIVATE",
        area: "Gachibowli",
        address: "Near ORR Junction, Financial District, Gachibowli, Hyderabad",
        lat: 17.4398,
        lon: 78.3489,
        phone: "+91 40 4455 0000",
        email: "bloodcentre@sunshinehospitals.com",
        contact_person: "Dr. Lakshmi Narayana",
        registration_number: "TS/RR/BB/2015/058",
        established_year: 2015,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Innova Transfusion Services & Blood Bank",
        code: "FAC-HYD-BC12",
        type: "PRIVATE_BLOOD_BANK",
        ownership: "PRIVATE",
        area: "Tarnaka",
        address: "Opposite St. Ann's High School, Tarnaka, Secunderabad",
        lat: 17.4278,
        lon: 78.5342,
        phone: "+91 40 2701 9888",
        email: "innovablood@innovahospitals.com",
        contact_person: "Dr. S. Mohan",
        registration_number: "TS/SEC/BB/2009/042",
        established_year: 2008,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Pragati Charitable Blood Bank",
        code: "FAC-HYD-BC13",
        type: "PRIVATE_BLOOD_BANK",
        ownership: "CHARITABLE",
        area: "Dilsukhnagar",
        address: "P&T Colony, Dilsukhnagar, Hyderabad",
        lat: 17.3687,
        lon: 78.5245,
        phone: "+91 40 2404 3322",
        email: "pragatibloodbank@gmail.com",
        contact_person: "Sri Prabhakar Reddy",
        registration_number: "TS/HYD/BB/2007/036",
        established_year: 2007,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Friends Voluntary Blood Centre",
        code: "FAC-HYD-BC14",
        type: "PRIVATE_BLOOD_BANK",
        ownership: "VOLUNTARY",
        area: "Ameerpet",
        address: "Dharam Karan Road, Ameerpet, Hyderabad",
        lat: 17.4374,
        lon: 78.4482,
        phone: "+91 40 2373 6677",
        email: "friendsbloodcenter@hotmail.com",
        contact_person: "Dr. G. Satyanarayana",
        registration_number: "TS/HYD/BB/2003/024",
        established_year: 2002,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Srikara Blood Storage & Transfusion Centre",
        code: "FAC-HYD-BC15",
        type: "BLOOD_STORAGE_CENTRE",
        ownership: "PRIVATE",
        area: "Miyapur",
        address: "Allwyn X Road, Miyapur, Hyderabad",
        lat: 17.4967,
        lon: 78.3546,
        phone: "+91 40 4646 4646",
        email: "srikarablood@srikarahospitals.com",
        contact_person: "Dr. Akhila Reddy",
        registration_number: "TS/RR/BSC/2018/011",
        established_year: 2018,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Aster Prime Hospital Blood Bank",
        code: "FAC-HYD-BC16",
        type: "PRIVATE_BLOOD_BANK",
        ownership: "PRIVATE",
        area: "Ameerpet",
        address: "Plot 4, HMDA Maitrivanam Lane, Ameerpet, Hyderabad",
        lat: 17.4352,
        lon: 78.4431,
        phone: "+91 40 4959 4959",
        email: "bloodbank@asterprime.com",
        contact_person: "Dr. M. Sridevi",
        registration_number: "TS/HYD/BB/2014/052",
        established_year: 2013,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Medicover Hospitals Blood Centre - HITEC City",
        code: "FAC-HYD-BC17",
        type: "PRIVATE_BLOOD_BANK",
        ownership: "PRIVATE",
        area: "HITEC City",
        address: "Behind Cyber Towers, Madhapur, HITEC City, Hyderabad",
        lat: 17.4498,
        lon: 78.3791,
        phone: "+91 40 6833 4455",
        email: "bloodcentre.hitec@medicoverhospitals.in",
        contact_person: "Dr. K. Praveen Kumar",
        registration_number: "TS/RR/BB/2016/063",
        established_year: 2016,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Rainbow Children's Hospital Blood Centre",
        code: "FAC-HYD-BC18",
        type: "PRIVATE_BLOOD_BANK",
        ownership: "PRIVATE",
        area: "Banjara Hills",
        address: "Road No. 2, Banjara Hills, Hyderabad",
        lat: 17.4201,
        lon: 78.4358,
        phone: "+91 40 4242 4242",
        email: "transfusion@rainbowhospitals.in",
        contact_person: "Dr. Sujatha Sharma",
        registration_number: "TS/HYD/BB/2012/048",
        established_year: 2012,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Mythri Charitable Blood Centre",
        code: "FAC-HYD-BC19",
        type: "PRIVATE_BLOOD_BANK",
        ownership: "CHARITABLE",
        area: "Mehdipatnam",
        address: "Near Rythu Bazar, Mehdipatnam, Hyderabad",
        lat: 17.3916,
        lon: 78.4385,
        phone: "+91 40 2351 1234",
        email: "mythribloodbank@gmail.com",
        contact_person: "Sri B. Sudheer",
        registration_number: "TS/HYD/BB/2008/038",
        established_year: 2008,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Hyderabad Central Blood Bank",
        code: "FAC-HYD-BC20",
        type: "PRIVATE_BLOOD_BANK",
        ownership: "PRIVATE",
        area: "Abids",
        address: "Station Road, Abids, Hyderabad",
        lat: 17.3872,
        lon: 78.4735,
        phone: "+91 40 2474 8899",
        email: "hydcentralblood@yahoo.com",
        contact_person: "Dr. N. Chandrasekhar",
        registration_number: "TS/HYD/BB/1999/019",
        established_year: 1999,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    }
];

// 2. 15 Government Blood Centres & Medical Colleges
const GOVT_BLOOD_CENTRES = [
    {
        name: "Osmania General Hospital State Blood Centre",
        code: "FAC-GOV-01",
        type: "GOVERNMENT_BLOOD_BANK",
        ownership: "GOVERNMENT",
        area: "Afzal Gunj",
        address: "Afzal Gunj, High Court Road, Hyderabad",
        lat: 17.3753,
        lon: 78.4741,
        phone: "+91 40 2460 0121",
        email: "bloodbank@osmaniageneral.telangana.gov.in",
        contact_person: "Dr. G. Triveni (Prof. Transfusion Med)",
        registration_number: "TS/GOV/BB/1965/001",
        established_year: 1965,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Gandhi Hospital & Medical College Blood Centre",
        code: "FAC-GOV-02",
        type: "GOVERNMENT_BLOOD_BANK",
        ownership: "GOVERNMENT",
        area: "Musheerabad",
        address: "Padmarao Nagar, Musheerabad, Secunderabad",
        lat: 17.4239,
        lon: 78.5034,
        phone: "+91 40 2750 5566",
        email: "transfusion@gandhihospital.telangana.gov.in",
        contact_person: "Dr. K. Srinivas Rao",
        registration_number: "TS/GOV/BB/1970/002",
        established_year: 1970,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Niloufer Hospital for Women & Children Blood Centre",
        code: "FAC-GOV-03",
        type: "GOVERNMENT_BLOOD_BANK",
        ownership: "GOVERNMENT",
        area: "Red Hills",
        address: "Red Hills, Lakdikapul, Hyderabad",
        lat: 17.3995,
        lon: 78.4632,
        phone: "+91 40 2339 4243",
        email: "nilouferbloodbank@telangana.gov.in",
        contact_person: "Dr. S. Usha Rani",
        registration_number: "TS/GOV/BB/1975/004",
        established_year: 1975,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Nizam's Institute of Medical Sciences (NIMS) Transfusion Medicine",
        code: "FAC-GOV-04",
        type: "GOVERNMENT_BLOOD_BANK",
        ownership: "GOVERNMENT",
        area: "Punjagutta",
        address: "NIMS Campus, Punjagutta, Hyderabad",
        lat: 17.4228,
        lon: 78.4526,
        phone: "+91 40 2348 9000",
        email: "transfusionmedicine@nims.edu.in",
        contact_person: "Prof. Dr. D. Radhika",
        registration_number: "TS/GOV/BB/1989/007",
        established_year: 1989,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Government Maternity Hospital Blood Centre - Nayapul",
        code: "FAC-GOV-05",
        type: "GOVERNMENT_BLOOD_BANK",
        ownership: "GOVERNMENT",
        area: "Nayapul",
        address: "Nayapul, Near Salar Jung Museum, Hyderabad",
        lat: 17.3698,
        lon: 78.4776,
        phone: "+91 40 2452 4001",
        email: "maternity.nayapul@telangana.gov.in",
        contact_person: "Dr. B. Padmavati",
        registration_number: "TS/GOV/BB/1980/005",
        established_year: 1980,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Government ENT Hospital Blood Storage Centre",
        code: "FAC-GOV-06",
        type: "BLOOD_STORAGE_CENTRE",
        ownership: "GOVERNMENT",
        area: "Koti",
        address: "Bank Street, Koti, Hyderabad",
        lat: 17.3842,
        lon: 78.4821,
        phone: "+91 40 2474 0247",
        email: "enthospital.koti@telangana.gov.in",
        contact_person: "Dr. V. Prasad",
        registration_number: "TS/GOV/BSC/1995/001",
        established_year: 1995,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "ESIC Medical College & Hospital Blood Centre - Sanathnagar",
        code: "FAC-GOV-07",
        type: "GOVERNMENT_BLOOD_BANK",
        ownership: "GOVERNMENT",
        area: "Sanathnagar",
        address: "ESI Hospital Road, Sanathnagar, Hyderabad",
        lat: 17.4563,
        lon: 78.4412,
        phone: "+91 40 2380 1122",
        email: "bloodbank-esichyd@esic.nic.in",
        contact_person: "Dr. Rajesh Kumar",
        registration_number: "TS/GOV/BB/2012/012",
        established_year: 2012,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Sarojini Devi Eye Hospital Blood Storage Centre",
        code: "FAC-GOV-08",
        type: "BLOOD_STORAGE_CENTRE",
        ownership: "GOVERNMENT",
        area: "Mehdipatnam",
        address: "Near Asif Nagar Police Station, Mehdipatnam, Hyderabad",
        lat: 17.3934,
        lon: 78.4419,
        phone: "+91 40 2353 8880",
        email: "sdeyehospital@telangana.gov.in",
        contact_person: "Dr. Anupama",
        registration_number: "TS/GOV/BSC/1998/003",
        established_year: 1998,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Sir Ronald Ross Institute of Tropical & Communicable Diseases (Fever Hospital)",
        code: "FAC-GOV-09",
        type: "BLOOD_STORAGE_CENTRE",
        ownership: "GOVERNMENT",
        area: "Nallakunta",
        address: "Nallakunta Main Road, Hyderabad",
        lat: 17.3991,
        lon: 78.5023,
        phone: "+91 40 2761 5444",
        email: "feverhospital.hyd@telangana.gov.in",
        contact_person: "Dr. K. Shankar",
        registration_number: "TS/GOV/BSC/2001/006",
        established_year: 2001,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "MNJ Institute of Oncology & Regional Cancer Centre Blood Centre",
        code: "FAC-GOV-10",
        type: "GOVERNMENT_BLOOD_BANK",
        ownership: "GOVERNMENT",
        area: "Red Hills",
        address: "Red Hills, Lakdikapul, Hyderabad",
        lat: 17.4012,
        lon: 78.4619,
        phone: "+91 40 2331 4455",
        email: "mnjcancerhospital@telangana.gov.in",
        contact_person: "Dr. N. Jayalatha",
        registration_number: "TS/GOV/BB/1990/009",
        established_year: 1986,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Government Hospital for Chest & Communicable Diseases",
        code: "FAC-GOV-11",
        type: "BLOOD_STORAGE_CENTRE",
        ownership: "GOVERNMENT",
        area: "Erragadda",
        address: "Erragadda Main Road, Hyderabad",
        lat: 17.4589,
        lon: 78.4285,
        phone: "+91 40 2381 4433",
        email: "chesthospital@telangana.gov.in",
        contact_person: "Dr. Mehboob Khan",
        registration_number: "TS/GOV/BSC/2003/008",
        established_year: 2003,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "King Koti District Hospital Blood Centre",
        code: "FAC-GOV-12",
        type: "GOVERNMENT_BLOOD_BANK",
        ownership: "GOVERNMENT",
        area: "Koti",
        address: "King Koti Road, Hyderguda, Hyderabad",
        lat: 17.3915,
        lon: 78.4802,
        phone: "+91 40 2475 3322",
        email: "kingkotidh@telangana.gov.in",
        contact_person: "Dr. Mallikarjun",
        registration_number: "TS/GOV/BB/2010/011",
        established_year: 2010,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Malakpet Area Hospital Blood Storage Centre",
        code: "FAC-GOV-13",
        type: "BLOOD_STORAGE_CENTRE",
        ownership: "GOVERNMENT",
        area: "Malakpet",
        address: "Old Malakpet, Near TV Tower, Hyderabad",
        lat: 17.3734,
        lon: 78.5028,
        phone: "+91 40 2454 6611",
        email: "areahospital.malakpet@telangana.gov.in",
        contact_person: "Dr. B. Vijay Kumar",
        registration_number: "TS/GOV/BSC/2014/013",
        established_year: 2014,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Golconda Area Hospital Blood Storage Centre",
        code: "FAC-GOV-14",
        type: "BLOOD_STORAGE_CENTRE",
        ownership: "GOVERNMENT",
        area: "Golconda",
        address: "Near Golconda Fort, Hyderabad",
        lat: 17.3828,
        lon: 78.4012,
        phone: "+91 40 2356 1234",
        email: "areahospital.golconda@telangana.gov.in",
        contact_person: "Dr. Syed Moiz",
        registration_number: "TS/GOV/BSC/2015/015",
        established_year: 2015,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    },
    {
        name: "Vanasthalipuram Area Hospital Blood Centre",
        code: "FAC-GOV-15",
        type: "GOVERNMENT_BLOOD_BANK",
        ownership: "GOVERNMENT",
        area: "Vanasthalipuram",
        address: "Red Tank Road, Vanasthalipuram, Hyderabad",
        lat: 17.3421,
        lon: 78.5634,
        phone: "+91 40 2424 0099",
        email: "areahospital.vanasthalipuram@telangana.gov.in",
        contact_person: "Dr. G. Ravinder",
        registration_number: "TS/GOV/BB/2016/016",
        established_year: 2016,
        verification_status: "VERIFIED",
        operating_status: "ONLINE"
    }
];

// 3. 75+ Major Hyderabad & Secunderabad Hospitals
const HYDERABAD_HOSPITALS = [
    { name: "Apollo Hospitals - Jubilee Hills", type: "PRIVATE_HOSPITAL", area: "Jubilee Hills", lat: 17.4172, lon: 78.4118, phone: "+91 40 2360 7777", beds: 550, ownership: "PRIVATE" },
    { name: "Apollo Health City - Jubilee Hills", type: "PRIVATE_HOSPITAL", area: "Jubilee Hills", lat: 17.4170, lon: 78.4115, phone: "+91 40 2360 7778", beds: 300, ownership: "PRIVATE", possible_duplicate: true, duplicate_group: "HYD-DUP-01" }, // duplicate flag demonstration
    { name: "Apollo Hospitals - Hyderguda", type: "PRIVATE_HOSPITAL", area: "Hyderguda", lat: 17.3995, lon: 78.4812, phone: "+91 40 2323 1380", beds: 200, ownership: "PRIVATE" },
    { name: "Apollo Hospitals - Secunderabad", type: "PRIVATE_HOSPITAL", area: "Secunderabad", lat: 17.4421, lon: 78.4982, phone: "+91 40 2771 8888", beds: 180, ownership: "PRIVATE" },
    { name: "Apollo Cradle & Children's Hospital - Kondapur", type: "PRIVATE_HOSPITAL", area: "Kondapur", lat: 17.4628, lon: 78.3612, phone: "+91 40 4424 4424", beds: 100, ownership: "PRIVATE" },
    { name: "Yashoda Hospitals - Somajiguda", type: "PRIVATE_HOSPITAL", area: "Somajiguda", lat: 17.4241, lon: 78.4578, phone: "+91 40 4567 4567", beds: 450, ownership: "PRIVATE" },
    { name: "Yashoda Hospitals - Secunderabad", type: "PRIVATE_HOSPITAL", area: "Secunderabad", lat: 17.4438, lon: 78.4985, phone: "+91 40 2770 3999", beds: 500, ownership: "PRIVATE" },
    { name: "Yashoda Hospitals - Malakpet", type: "PRIVATE_HOSPITAL", area: "Malakpet", lat: 17.3752, lon: 78.5089, phone: "+91 40 2455 5555", beds: 400, ownership: "PRIVATE" },
    { name: "Yashoda Medicity - Hitec City", type: "PRIVATE_HOSPITAL", area: "HITEC City", lat: 17.4512, lon: 78.3721, phone: "+91 40 4767 4767", beds: 600, ownership: "PRIVATE" },
    { name: "KIMS Hospitals - Minister Road, Secunderabad", type: "MEDICAL_COLLEGE_HOSPITAL", area: "Begumpet", lat: 17.4382, lon: 78.4842, phone: "+91 40 4488 5000", beds: 1000, ownership: "PRIVATE" },
    { name: "KIMS Hospitals - Kondapur", type: "PRIVATE_HOSPITAL", area: "Kondapur", lat: 17.4682, lon: 78.3582, phone: "+91 40 6750 5050", beds: 250, ownership: "PRIVATE" },
    { name: "KIMS Cuddles - Kondapur", type: "PRIVATE_HOSPITAL", area: "Kondapur", lat: 17.4690, lon: 78.3590, phone: "+91 40 6750 5000", beds: 120, ownership: "PRIVATE" },
    { name: "Care Hospitals - Road No 1, Banjara Hills", type: "PRIVATE_HOSPITAL", area: "Banjara Hills", lat: 17.4158, lon: 78.4485, phone: "+91 40 6165 6565", beds: 435, ownership: "PRIVATE" },
    { name: "Care Hospital Banjara Hills Unit 2", type: "PRIVATE_HOSPITAL", area: "Banjara Hills", lat: 17.4162, lon: 78.4490, phone: "+91 40 6165 6566", beds: 150, ownership: "PRIVATE", possible_duplicate: true, duplicate_group: "HYD-DUP-02" }, // duplicate flag
    { name: "Care Hospitals - HITEC City", type: "PRIVATE_HOSPITAL", area: "HITEC City", lat: 17.4418, lon: 78.3812, phone: "+91 40 6720 6565", beds: 260, ownership: "PRIVATE" },
    { name: "Care Hospitals - Musheerabad", type: "PRIVATE_HOSPITAL", area: "Musheerabad", lat: 17.4182, lon: 78.4982, phone: "+91 40 3041 8555", beds: 200, ownership: "PRIVATE" },
    { name: "Care Hospitals - Malakpet", type: "PRIVATE_HOSPITAL", area: "Malakpet", lat: 17.3712, lon: 78.5042, phone: "+91 40 3041 7777", beds: 180, ownership: "PRIVATE" },
    { name: "Care Hospitals - Nampally", type: "PRIVATE_HOSPITAL", area: "Nampally", lat: 17.3912, lon: 78.4712, phone: "+91 40 3041 6666", beds: 150, ownership: "PRIVATE" },
    { name: "Continental Hospitals - Gachibowli", type: "PRIVATE_HOSPITAL", area: "Financial District", lat: 17.4221, lon: 78.3392, phone: "+91 40 6700 0000", beds: 750, ownership: "PRIVATE" },
    { name: "AIG Hospitals (Asian Institute of Gastroenterology) - Gachibowli", type: "PRIVATE_HOSPITAL", area: "Gachibowli", lat: 17.4412, lon: 78.3612, phone: "+91 40 4244 4222", beds: 800, ownership: "PRIVATE" },
    { name: "Sunshine Hospitals - Paradise, Secunderabad", type: "PRIVATE_HOSPITAL", area: "Secunderabad", lat: 17.4452, lon: 78.4912, phone: "+91 40 4455 0000", beds: 350, ownership: "PRIVATE" },
    { name: "Sunshine Hospitals - Gachibowli", type: "PRIVATE_HOSPITAL", area: "Gachibowli", lat: 17.4398, lon: 78.3489, phone: "+91 40 4455 1111", beds: 200, ownership: "PRIVATE" },
    { name: "Star Hospitals - Banjara Hills", type: "PRIVATE_HOSPITAL", area: "Banjara Hills", lat: 17.4142, lon: 78.4412, phone: "+91 40 4477 7777", beds: 310, ownership: "PRIVATE" },
    { name: "Star Hospitals - Financial District, Nanakramguda", type: "PRIVATE_HOSPITAL", area: "Nanakramguda", lat: 17.4158, lon: 78.3421, phone: "+91 40 4477 8888", beds: 400, ownership: "PRIVATE" },
    { name: "Medicover Hospitals - HITEC City", type: "PRIVATE_HOSPITAL", area: "HITEC City", lat: 17.4498, lon: 78.3791, phone: "+91 40 6833 4455", beds: 450, ownership: "PRIVATE" },
    { name: "Medicover Hospitals - Secretariat, Saifabad", type: "PRIVATE_HOSPITAL", area: "Saifabad", lat: 17.4082, lon: 78.4682, phone: "+91 40 6833 4466", beds: 250, ownership: "PRIVATE" },
    { name: "Medicover Hospitals - Chandanagar", type: "PRIVATE_HOSPITAL", area: "Chandanagar", lat: 17.4982, lon: 78.3298, phone: "+91 40 6833 4477", beds: 150, ownership: "PRIVATE" },
    { name: "Medicover Cancer Institute - HITEC City", type: "PRIVATE_HOSPITAL", area: "HITEC City", lat: 17.4518, lon: 78.3775, phone: "+91 40 6833 4488", beds: 180, ownership: "PRIVATE" },
    { name: "Basavatarakam Indo-American Cancer Hospital & Research Institute", type: "PRIVATE_HOSPITAL", area: "Banjara Hills", lat: 17.4282, lon: 78.4298, phone: "+91 40 2355 1235", beds: 500, ownership: "CHARITABLE" },
    { name: "Rainbow Children's Hospital - Road No 2, Banjara Hills", type: "PRIVATE_HOSPITAL", area: "Banjara Hills", lat: 17.4201, lon: 78.4358, phone: "+91 40 4242 4242", beds: 250, ownership: "PRIVATE" },
    { name: "Rainbow Children's Hospital - Vikrampuri, Secunderabad", type: "PRIVATE_HOSPITAL", area: "Secunderabad", lat: 17.4521, lon: 78.4998, phone: "+91 40 4242 4252", beds: 150, ownership: "PRIVATE" },
    { name: "Rainbow Children's Hospital - Kondapur", type: "PRIVATE_HOSPITAL", area: "Kondapur", lat: 17.4695, lon: 78.3618, phone: "+91 40 4242 4262", beds: 120, ownership: "PRIVATE" },
    { name: "Rainbow Children's Hospital - Hydernagar, Kukatpally", type: "PRIVATE_HOSPITAL", area: "Kukatpally", lat: 17.4942, lon: 78.3892, phone: "+91 40 4242 4272", beds: 100, ownership: "PRIVATE" },
    { name: "Ankura Hospital for Women & Children - Kukatpally", type: "PRIVATE_HOSPITAL", area: "Kukatpally", lat: 17.4892, lon: 78.3982, phone: "+91 40 4969 4969", beds: 100, ownership: "PRIVATE" },
    { name: "Ankura Hospital for Women & Children - Banjara Hills", type: "PRIVATE_HOSPITAL", area: "Banjara Hills", lat: 17.4212, lon: 78.4398, phone: "+91 40 4969 4970", beds: 80, ownership: "PRIVATE" },
    { name: "Ankura Hospital for Women & Children - Madinaguda", type: "PRIVATE_HOSPITAL", area: "Madinaguda", lat: 17.4982, lon: 78.3382, phone: "+91 40 4969 4971", beds: 90, ownership: "PRIVATE" },
    { name: "Fernandez Hospital - Bogulkunta", type: "PRIVATE_HOSPITAL", area: "Bogulkunta", lat: 17.3912, lon: 78.4821, phone: "+91 40 4022 2300", beds: 120, ownership: "PRIVATE" },
    { name: "Fernandez Hospital - Hyderguda", type: "PRIVATE_HOSPITAL", area: "Hyderguda", lat: 17.4012, lon: 78.4842, phone: "+91 40 4022 2400", beds: 100, ownership: "PRIVATE" },
    { name: "Fernandez Hospital - Jubilee Hills", type: "PRIVATE_HOSPITAL", area: "Jubilee Hills", lat: 17.4321, lon: 78.4112, phone: "+91 40 4022 2500", beds: 80, ownership: "PRIVATE" },
    { name: "Fernandez Hospital - Miyapur", type: "PRIVATE_HOSPITAL", area: "Miyapur", lat: 17.4942, lon: 78.3512, phone: "+91 40 4022 2600", beds: 75, ownership: "PRIVATE" },
    { name: "Aster Prime Hospital - Ameerpet", type: "PRIVATE_HOSPITAL", area: "Ameerpet", lat: 17.4352, lon: 78.4431, phone: "+91 40 4959 4959", beds: 220, ownership: "PRIVATE" },
    { name: "Citizens Specialty Hospital - Nallagandla", type: "PRIVATE_HOSPITAL", area: "Nallagandla", lat: 17.4721, lon: 78.3182, phone: "+91 40 6719 9999", beds: 300, ownership: "PRIVATE" },
    { name: "American Oncology Institute (AOI) - Nallagandla", type: "PRIVATE_HOSPITAL", area: "Nallagandla", lat: 17.4725, lon: 78.3188, phone: "+91 40 6719 9900", beds: 150, ownership: "PRIVATE" },
    { name: "TX Hospitals - Banjara Hills", type: "PRIVATE_HOSPITAL", area: "Banjara Hills", lat: 17.4192, lon: 78.4432, phone: "+91 9089 48 9089", beds: 200, ownership: "PRIVATE" },
    { name: "TX Hospitals - Kachiguda", type: "PRIVATE_HOSPITAL", area: "Kachiguda", lat: 17.3892, lon: 78.4982, phone: "+91 9089 48 9090", beds: 150, ownership: "PRIVATE" },
    { name: "TX Hospitals - Uppal", type: "PRIVATE_HOSPITAL", area: "Uppal", lat: 17.3995, lon: 78.5582, phone: "+91 9089 48 9091", beds: 180, ownership: "PRIVATE" },
    { name: "Omni Hospitals - Kothapet, Dilsukhnagar", type: "PRIVATE_HOSPITAL", area: "Dilsukhnagar", lat: 17.3621, lon: 78.5398, phone: "+91 40 4776 7777", beds: 200, ownership: "PRIVATE" },
    { name: "Omni Hospitals - Nampally", type: "PRIVATE_HOSPITAL", area: "Nampally", lat: 17.3882, lon: 78.4682, phone: "+91 40 4776 8888", beds: 120, ownership: "PRIVATE" },
    { name: "Srikara Hospitals - Secunderabad", type: "PRIVATE_HOSPITAL", area: "Secunderabad", lat: 17.4412, lon: 78.5082, phone: "+91 40 4646 4646", beds: 150, ownership: "PRIVATE" },
    { name: "Srikara Hospitals - Miyapur", type: "PRIVATE_HOSPITAL", area: "Miyapur", lat: 17.4967, lon: 78.3546, phone: "+91 40 4646 4747", beds: 180, ownership: "PRIVATE" },
    { name: "Srikara Hospitals - RTC X Roads", type: "PRIVATE_HOSPITAL", area: "Chikkadpally", lat: 17.4092, lon: 78.4982, phone: "+91 40 4646 4848", beds: 100, ownership: "PRIVATE" },
    { name: "Srikara Hospitals - ECIL", type: "PRIVATE_HOSPITAL", area: "ECIL", lat: 17.4821, lon: 78.5682, phone: "+91 40 4646 4949", beds: 120, ownership: "PRIVATE" },
    { name: "Pace Hospitals - HITEC City", type: "PRIVATE_HOSPITAL", area: "HITEC City", lat: 17.4462, lon: 78.3742, phone: "+91 40 4848 6868", beds: 150, ownership: "PRIVATE" },
    { name: "Pace Hospitals - Begumpet", type: "PRIVATE_HOSPITAL", area: "Begumpet", lat: 17.4398, lon: 78.4612, phone: "+91 40 4848 5858", beds: 100, ownership: "PRIVATE" },
    { name: "Prathima Hospital - Kachiguda", type: "PRIVATE_HOSPITAL", area: "Kachiguda", lat: 17.3918, lon: 78.4921, phone: "+91 40 4345 4345", beds: 300, ownership: "PRIVATE" },
    { name: "Prathima Hospital - Kukatpally", type: "PRIVATE_HOSPITAL", area: "Kukatpally", lat: 17.4912, lon: 78.4082, phone: "+91 40 4345 4444", beds: 200, ownership: "PRIVATE" },
    { name: "MaxCure / Medicover Hospitals - Secretariat", type: "PRIVATE_HOSPITAL", area: "Saifabad", lat: 17.4072, lon: 78.4692, phone: "+91 40 6833 4499", beds: 200, ownership: "PRIVATE" },
    { name: "Mythri Hospital - Mehdipatnam", type: "PRIVATE_HOSPITAL", area: "Mehdipatnam", lat: 17.3912, lon: 78.4382, phone: "+91 40 2351 2233", beds: 120, ownership: "PRIVATE" },
    { name: "Olive Hospital - Mehdipatnam", type: "PRIVATE_HOSPITAL", area: "Mehdipatnam", lat: 17.3882, lon: 78.4282, phone: "+91 40 2351 0000", beds: 150, ownership: "PRIVATE" },
    { name: "Princess Durru Shehvar Children's & General Hospital", type: "PRIVATE_HOSPITAL", area: "Purani Haveli", lat: 17.3682, lon: 78.4842, phone: "+91 40 2452 3344", beds: 200, ownership: "CHARITABLE" },
    { name: "Owaisi Hospital & Research Centre", type: "MEDICAL_COLLEGE_HOSPITAL", area: "Kanchanbagh", lat: 17.3412, lon: 78.5082, phone: "+91 40 2434 2222", beds: 1000, ownership: "PRIVATE" },
    { name: "Deccan College of Medical Sciences Hospital", type: "MEDICAL_COLLEGE_HOSPITAL", area: "Santoshnagar", lat: 17.3482, lon: 78.5012, phone: "+91 40 2434 0169", beds: 750, ownership: "PRIVATE" },
    { name: "Shadan Hospital & Institute of Medical Sciences", type: "MEDICAL_COLLEGE_HOSPITAL", area: "Himayatsagar Road", lat: 17.3382, lon: 78.3982, phone: "+91 40 2419 8888", beds: 800, ownership: "PRIVATE" },
    { name: "Malla Reddy Narayana Multispeciality Hospital", type: "MEDICAL_COLLEGE_HOSPITAL", area: "Suraram, Jeedimetla", lat: 17.5342, lon: 78.4382, phone: "+91 40 2378 3000", beds: 1100, ownership: "PRIVATE" },
    { name: "Mamata Academy of Medical Sciences Hospital", type: "MEDICAL_COLLEGE_HOSPITAL", area: "Bachupally", lat: 17.5382, lon: 78.3682, phone: "+91 40 2304 4444", beds: 650, ownership: "PRIVATE" },
    { name: "SLG Hospitals - Nizampet", type: "PRIVATE_HOSPITAL", area: "Nizampet", lat: 17.5182, lon: 78.3782, phone: "+91 40 2388 4444", beds: 350, ownership: "PRIVATE" },
    { name: "Remedy Hospitals - Kukatpally", type: "PRIVATE_HOSPITAL", area: "Kukatpally", lat: 17.4882, lon: 78.4082, phone: "+91 40 2306 4444", beds: 150, ownership: "PRIVATE" },
    { name: "Anupama Hospital - KPHB Colony", type: "PRIVATE_HOSPITAL", area: "KPHB Colony", lat: 17.4912, lon: 78.3992, phone: "+91 40 2315 2222", beds: 100, ownership: "PRIVATE" },
    { name: "Prime Hospitals - KPHB Colony", type: "PRIVATE_HOSPITAL", area: "KPHB Colony", lat: 17.4932, lon: 78.3982, phone: "+91 40 2315 3333", beds: 120, ownership: "PRIVATE" },
    { name: "Udai Omni Hospital - Chapel Road, Nampally", type: "PRIVATE_HOSPITAL", area: "Nampally", lat: 17.3942, lon: 78.4742, phone: "+91 40 2323 2226", beds: 100, ownership: "PRIVATE" },
    { name: "Mahavir Hospital & Research Centre - AC Guards", type: "PRIVATE_HOSPITAL", area: "Lakdikapul", lat: 17.4012, lon: 78.4592, phone: "+91 40 2339 3333", beds: 220, ownership: "CHARITABLE" },
    { name: "St. Theresa's Hospital - Sanathnagar", type: "PRIVATE_HOSPITAL", area: "Sanathnagar", lat: 17.4532, lon: 78.4432, phone: "+91 40 2381 2288", beds: 180, ownership: "CHARITABLE" },
    { name: "Shenoy Hospitals - East Marredpally", type: "PRIVATE_HOSPITAL", area: "Secunderabad", lat: 17.4482, lon: 78.5142, phone: "+91 40 2773 0000", beds: 100, ownership: "PRIVATE" },
    { name: "Geetha Hospital - West Marredpally", type: "PRIVATE_HOSPITAL", area: "Secunderabad", lat: 17.4462, lon: 78.5082, phone: "+91 40 2780 4455", beds: 90, ownership: "PRIVATE" },
    { name: "Apollo Spectra Hospitals - Ameerpet", type: "PRIVATE_HOSPITAL", area: "Ameerpet", lat: 17.4362, lon: 78.4482, phone: "+91 40 4488 4488", beds: 60, ownership: "PRIVATE" },
    { name: "Genesis Hospital - Secunderabad", type: "PRIVATE_HOSPITAL", area: "Secunderabad", lat: 17.4412, lon: 78.4942, phone: "+91 40 2789 2233", beds: 80, ownership: "PRIVATE", verification_status: "PENDING_VERIFICATION" }, // unverified demo
    { name: "LifeSpring Maternity Hospital - Bowenpally", type: "PRIVATE_HOSPITAL", area: "Bowenpally", lat: 17.4712, lon: 78.4882, phone: "+91 40 2775 1122", beds: 40, ownership: "PRIVATE" },
    { name: "Old City Community Trauma Centre", type: "OTHER_AUTHORIZED_FACILITY", area: "Charminar", lat: 17.3612, lon: 78.4742, phone: "+91 40 2450 0000", beds: 30, ownership: "CHARITABLE", operating_status: "DEBOARDED", deboard_reason: "Facility relocated; license transferred to regional facility", is_active: false } // deboarded demo
];

async function seedFacilitiesNetwork() {
    console.log("🏥 Starting Unified Blood Network Facilities & Logistics Seeding...");
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Clear existing facility blood inventory and tracking events
        console.log("🧹 Clearing old facility inventory & units...");
        await client.query("DELETE FROM tracking_events");
        await client.query("DELETE FROM blood_unit_alerts");
        await client.query("DELETE FROM blood_unit_events");
        await client.query("DELETE FROM blood_units WHERE facility_id IS NOT NULL");
        await client.query("DELETE FROM facility_blood_inventory");
        await client.query("DELETE FROM facilities");

        const allFacilities = [
            ...HYDERABAD_BLOOD_CENTRES,
            ...GOVT_BLOOD_CENTRES,
            ...HYDERABAD_HOSPITALS.map((h, i) => ({
                name: h.name,
                code: `FAC-HSP-${String(i + 1).padStart(3, "0")}`,
                type: h.type,
                ownership: h.ownership || "PRIVATE",
                area: h.area,
                address: `${h.area}, Hyderabad, Telangana`,
                lat: h.lat,
                lon: h.lon,
                phone: h.phone,
                email: `${h.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@facility.hexavision.demo`,
                contact_person: `Medical Superintendent (${h.area})`,
                registration_number: `TS/HYD/HSP/201${i % 9}/${String(100 + i)}`,
                established_year: 1990 + (i % 30),
                verification_status: h.verification_status || "VERIFIED",
                operating_status: h.operating_status || "ONLINE",
                is_active: h.is_active !== undefined ? h.is_active : true,
                possible_duplicate: Boolean(h.possible_duplicate),
                duplicate_group: h.duplicate_group || null,
                deboard_reason: h.deboard_reason || null,
                deboarded_at: h.operating_status === "DEBOARDED" ? new Date() : null,
                deboarded_by: h.operating_status === "DEBOARDED" ? "State Blood Transfusion Council" : null
            }))
        ];

        console.log(`📥 Seeding ${allFacilities.length} Facilities into Unified Directory...`);

        const insertedFacilityIds = [];

        for (const f of allFacilities) {
            const res = await client.query(`
                INSERT INTO facilities (
                    facility_code, facility_name, facility_type, ownership,
                    country, state, district, city, area, address,
                    latitude, longitude, phone, email, contact_person,
                    established_year, registration_number,
                    verification_status, operating_status, is_active,
                    possible_duplicate, duplicate_group,
                    deboard_reason, deboarded_at, deboarded_by,
                    data_source
                ) VALUES (
                    $1, $2, $3, $4,
                    'India', 'Telangana', 'Hyderabad', 'Hyderabad', $5, $6,
                    $7, $8, $9, $10, $11,
                    $12, $13,
                    $14, $15, $16,
                    $17, $18,
                    $19, $20, $21,
                    'DEMO_DATA'
                ) RETURNING id, facility_code, facility_name, facility_type, operating_status, is_active
            `, [
                f.code, f.name, f.type, f.ownership,
                f.area, f.address,
                f.lat, f.lon, f.phone, f.email, f.contact_person,
                f.established_year || 2000, f.registration_number,
                f.verification_status || "VERIFIED", f.operating_status || "ONLINE", f.is_active !== undefined ? f.is_active : true,
                f.possible_duplicate || false, f.duplicate_group || null,
                f.deboard_reason || null, f.deboarded_at || null, f.deboarded_by || null
            ]);

            insertedFacilityIds.push(res.rows[0]);
        }

        console.log(`✅ ${insertedFacilityIds.length} facilities created.`);

        // Setup some attached centre relationships
        // E.g., Government ENT Hospital, Sarojini Devi, Chest Hospital attached to Osmania
        const osmania = insertedFacilityIds.find(f => f.facility_name.includes("Osmania"));
        if (osmania) {
            await client.query(`
                UPDATE facilities 
                SET parent_facility_id = $1, is_attached_centre = TRUE
                WHERE facility_code IN ('FAC-GOV-06', 'FAC-GOV-08', 'FAC-GOV-11')
            `, [osmania.id]);
        }

        // 4. Seed Facility Blood Inventory Matrix (8 Blood Groups x 4 Components)
        console.log("📦 Generating Multi-Component Inventory Matrix across facilities...");

        const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

        let totalUnitsSeedCount = 0;
        const activeFacilities = insertedFacilityIds.filter(f => f.is_active && f.operating_status !== "DEBOARDED");

        for (const fac of activeFacilities) {
            // Larger facilities have more units
            const isMajorBank = fac.facility_type.includes("BLOOD_BANK") || fac.facility_type.includes("MEDICAL_COLLEGE");
            const baseMultiplier = isMajorBank ? 2.5 : 1.0;

            for (const bg of BLOOD_GROUPS) {
                for (const comp of COMPONENTS) {
                    let totalUnits = 0;
                    let availableUnits = 0;
                    let reservedUnits = 0;
                    let expiringSoon = 0;

                    // Rare blood groups have less stock
                    const isRare = ["AB-", "B-", "A-", "O-"].includes(bg);
                    const maxStock = isRare ? Math.floor(12 * baseMultiplier) : Math.floor(35 * baseMultiplier);
                    const minStock = isRare ? 1 : 4;

                    totalUnits = randomInt(minStock, maxStock);
                    reservedUnits = Math.min(randomInt(0, 3), totalUnits);
                    availableUnits = totalUnits - reservedUnits;
                    expiringSoon = Math.min(randomInt(0, 2), availableUnits);

                    await client.query(`
                        INSERT INTO facility_blood_inventory (
                            facility_id, blood_group, component,
                            total_units, available_units, reserved_units,
                            expiring_soon_units, critical_threshold, last_updated
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
                    `, [fac.id, bg, comp, totalUnits, availableUnits, reservedUnits, expiringSoon, isRare ? 5 : 10]);

                    totalUnitsSeedCount += totalUnits;
                }
            }
        }

        console.log(`✅ Facility Inventory Matrix created (~${totalUnitsSeedCount} aggregate units).`);

        // 5. Seed 350+ Individual Trackable Blood Units with Cold-Chain & Tracking Events
        console.log("🛰️ Seeding 350+ Individual Trackable Blood Units with Cold-Chain Telemetry...");

        const now = new Date();
        const locations = ["COLD_ROOM_BAY_A", "COLD_ROOM_BAY_B", "REFRIGERATOR_04", "AGITATOR_BAY_01", "FREEZER_UNIT_C"];
        const statuses = ["LAB_PREPARED", "READY_FOR_DISPATCH", "IN_TRANSIT", "AT_HOSPITAL", "DELIVERED"];

        let unitCounter = 1;
        // Seed 350 distinct blood units attached to top 20 blood centres and hospitals
        for (let i = 0; i < 350; i++) {
            const fac = activeFacilities[i % activeFacilities.length];
            const bg = BLOOD_GROUPS[i % BLOOD_GROUPS.length];
            const comp = COMPONENTS[i % COMPONENTS.length];
            const status = statuses[i % statuses.length];

            const unitBarcode = `HEXA-${bg.replace("+", "P").replace("-", "N")}-${comp.slice(0, 3)}-${String(10000 + unitCounter++).padStart(5, "0")}`;

            // Expiry date calculation based on component shelf life:
            // Platelets: 5 days, RBC: 42 days, Whole Blood: 35 days, Plasma: 365 days
            let shelfDays = 35;
            if (comp === "PLATELETS") shelfDays = 5;
            if (comp === "RBC") shelfDays = 42;
            if (comp === "PLASMA") shelfDays = 365;

            // Some units collected recently, some collected near end of shelf life
            const daysSinceCollection = randomInt(1, Math.max(2, shelfDays - 2));
            const collectionDate = new Date(now.getTime() - daysSinceCollection * 24 * 60 * 60 * 1000);
            const expiryDate = new Date(collectionDate.getTime() + shelfDays * 24 * 60 * 60 * 1000);

            // Cold chain target temperature
            let targetTemp = "1-6°C";
            let actualTemp = 3.8 + (Math.random() - 0.5) * 1.5;
            if (comp === "PLASMA") {
                targetTemp = "-25°C to -18°C";
                actualTemp = -21.4 + (Math.random() - 0.5) * 2.0;
            } else if (comp === "PLATELETS") {
                targetTemp = "20-24°C";
                actualTemp = 22.1 + (Math.random() - 0.5) * 1.0;
            }

            const storageLoc = locations[i % locations.length];

            const unitRes = await client.query(`
                INSERT INTO blood_units (
                    unit_id, blood_group, component, status,
                    facility_id, source_facility_id,
                    collection_date, expiry_date,
                    storage_location, current_location,
                    temperature_celsius, target_temperature_c,
                    current_latitude, current_longitude,
                    transport_id, dispatch_id, eta,
                    last_gps_update, qr_code
                ) VALUES (
                    $1, $2, $3, $4,
                    $5, $5,
                    $6, $7,
                    $8, $9,
                    $10, $11,
                    $12, $13,
                    $14, $15, $16,
                    CURRENT_TIMESTAMP, $17
                ) RETURNING id
            `, [
                unitBarcode, bg, comp, status,
                fac.id,
                collectionDate.toISOString().slice(0, 10),
                expiryDate.toISOString().slice(0, 10),
                storageLoc,
                status === "IN_TRANSIT" ? "En-route Outer Ring Road Logistics Corridor" : fac.address,
                Number(actualTemp.toFixed(1)), targetTemp,
                fac.latitude || 17.3850, fac.longitude || 78.4867,
                status === "IN_TRANSIT" ? `VAN-HEXA-${randomInt(10, 99)}` : null,
                status === "IN_TRANSIT" || status === "DELIVERED" ? `DISP-${randomInt(1000, 9999)}` : null,
                status === "IN_TRANSIT" ? `${randomInt(12, 45)} mins` : null,
                `QR:${unitBarcode}:${bg}:${comp}`
            ]);

            const unitDbId = unitRes.rows[0].id;

            // Tracking lifecycle events for this unit
            const events = [
                { type: "Collection", desc: "Collected at facility donor station under aseptic protocol", timeOffsetDays: daysSinceCollection },
                { type: "Testing", desc: "Serology and NAT testing passed (HIV, HBV, HCV, Syphilis, Malaria negative)", timeOffsetDays: daysSinceCollection - 1 },
                { type: "Storage", desc: `Component separated and stored in ${storageLoc} at ${targetTemp}`, timeOffsetDays: daysSinceCollection - 1 }
            ];

            if (status === "READY_FOR_DISPATCH" || status === "IN_TRANSIT" || status === "DELIVERED") {
                events.push({ type: "Reservation", desc: "Reserved for authorized clinical dispatch", timeOffsetDays: 1 });
            }

            if (status === "IN_TRANSIT" || status === "DELIVERED") {
                events.push({ type: "Dispatch", desc: "Dispatched in active temperature-controlled cold box", timeOffsetDays: 0 });
                events.push({ type: "Transportation", desc: "GPS & temperature telemetry streaming in real-time", timeOffsetDays: 0 });
            }

            if (status === "DELIVERED") {
                events.push({ type: "Hospital Reception", desc: "Delivered & verified by receiving hospital blood transfusion desk", timeOffsetDays: 0 });
            }

            for (const ev of events) {
                const evTime = new Date(now.getTime() - ev.timeOffsetDays * 24 * 60 * 60 * 1000);
                await client.query(`
                    INSERT INTO tracking_events (
                        blood_unit_id, event_type, event_description, location_name,
                        latitude, longitude, temperature_celsius, recorded_by, event_time
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    unitDbId, ev.type, ev.desc, fac.facility_name,
                    fac.latitude, fac.longitude, Number(actualTemp.toFixed(1)),
                    "Autonomous Transfusion Hub Officer", evTime
                ]);
            }
        }

        console.log("✅ 350+ Trackable Blood Units and full tracking event chains seeded.");

        // 6. Seed Initial Audit Logs
        console.log("📝 Generating System Audit Logs...");
        const auditEntries = [
            { action: "FACILITY_ONBOARDED", entity_type: "FACILITY", entity_id: insertedFacilityIds[0].id, reason: "Initial network bootstrap for Chiranjeevi Eye & Blood Centre", actor_name: "Dr. Arvind (Director SBTC)" },
            { action: "FACILITY_VERIFIED", entity_type: "FACILITY", entity_id: insertedFacilityIds[1].id, reason: "Regulatory inspection completed and license verified", actor_name: "Quality Cell Auditor" },
            { action: "FACILITY_DEBOARDED", entity_type: "FACILITY", entity_id: insertedFacilityIds[insertedFacilityIds.length - 1].id, reason: "Facility relocated; license transferred to regional facility", actor_name: "State Blood Transfusion Council" }
        ];

        for (const aud of auditEntries) {
            await client.query(`
                INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, entity_type, entity_id, reason, metadata)
                VALUES ('ADMIN-SYS', $1, 'ADMIN', $2, $3, $4, $5, '{"source": "SYSTEM_SEED"}'::jsonb)
            `, [aud.actor_name, aud.action, aud.entity_type, aud.entity_id, aud.reason]);
        }

        await client.query("COMMIT");
        console.log("🎉 Unified Blood Network Facilities & Logistics Seeding Finished Successfully!");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Facilities network seeding failed:", err);
        throw err;
    } finally {
        client.release();
    }
}

if (require.main === module) {
    seedFacilitiesNetwork()
        .then(() => pool.end().then(() => process.exit(0)))
        .catch(() => pool.end().then(() => process.exit(1)));
}

module.exports = seedFacilitiesNetwork;
