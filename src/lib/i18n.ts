import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import hi from '../locales/hi.json'

const saved = localStorage.getItem('dd-lang') || 'en'

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng: saved,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export const setLang = (l: 'en' | 'hi') => {
  localStorage.setItem('dd-lang', l)
  i18n.changeLanguage(l)
  document.documentElement.lang = l
}

export default i18n
