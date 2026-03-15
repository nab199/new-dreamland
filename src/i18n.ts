import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "welcome": "Welcome to Dreamland College",
      "login": "Login",
      "username": "Username",
      "password": "Password",
      "dashboard": "Dashboard",
      "students": "Students",
      "branches": "Branches",
      "academics": "Academics",
      "finance": "Finance",
      "logout": "Logout",
      "programs": "Programs",
      "announcements": "Announcements",
      "apply_now": "Apply Now",
      "registration": "Registration",
      "full_name": "Full Name",
      "birth_year": "Birth Year",
      "phone": "Phone Number",
      "email": "Email Address",
      "emergency_contact": "Emergency Contact",
      "emergency_phone": "Emergency Phone",
      "student_type": "Student Type",
      "program": "Program",
      "program_degree": "Program Degree",
      "branch": "Branch",
      "address": "Address Information",
      "region": "Region",
      "zone": "Zone",
      "woreda": "Woreda",
      "kebele": "Kebele",
      "documents": "Document Uploads",
      "payment": "Payment Information",
      "submit": "Submit Registration",
      "next": "Next Step",
      "previous": "Previous Step",
      "our_mission": "Our Mission",
      "mission_text": "To provide quality higher education that empowers the next generation of Ethiopian leaders.",
      "contact_us": "Contact Us"
    }
  },
  am: {
    translation: {
      "welcome": "እንኳን ወደ ድሪምላንድ ኮሌጅ በደህና መጡ",
      "login": "ግባ",
      "username": "የተጠቃሚ ስም",
      "password": "የይለፍ ቃል",
      "dashboard": "ዳሽቦርድ",
      "students": "ተማሪዎች",
      "branches": "ቅርንጫፎች",
      "academics": "አካዳሚክ",
      "finance": "ፋይናንስ",
      "logout": "ውጣ",
      "programs": "ፕሮግራሞች",
      "announcements": "ማስታወቂያዎች",
      "apply_now": "አሁን ያመልክቱ",
      "registration": "የተማሪዎች ምዝገባ",
      "full_name": "ሙሉ ስም",
      "birth_year": "የትውልድ ዘመን",
      "phone": "ስልክ ቁጥር",
      "email": "ኢሜል አድራሻ",
      "emergency_contact": "የድንገተኛ አደጋ ተጠሪ",
      "emergency_phone": "የተጠሪ ስልክ",
      "student_type": "የተማሪ ዓይነት",
      "program": "የትምህርት መስክ",
      "program_degree": "የትምህርት ደረጃ",
      "branch": "ቅርንጫፍ",
      "address": "የአድራሻ መረጃ",
      "region": "ክልል",
      "zone": "ዞን",
      "woreda": "ወረዳ",
      "kebele": "ቀበሌ",
      "documents": "ሰነዶች",
      "payment": "ክፍያ",
      "submit": "ምዝገባውን ጨርስ",
      "next": "ቀጣይ",
      "previous": "ተመለስ",
      "our_mission": "የእኛ ተልዕኮ",
      "mission_text": "ቀጣዩን የኢትዮጵያ መሪዎችን የሚያበረታታ ጥራት ያለው ከፍተኛ ትምህርት መስጠት።",
      "contact_us": "ያግኙን"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
