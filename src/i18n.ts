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
