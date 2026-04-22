import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  GraduationCap,
  BookOpen,
  Users,
  ShieldCheck,
  ArrowRight,
  Globe,
  CheckCircle2,
  Clock3,
  BadgeCheck,
  Building2,
  Phone,
  Mail,
  MapPin,
  Menu,
  X,
  Brain,
  MessageCircle,
  Smartphone,
  Shield,
  Zap,
  Star,
  ChevronDown,
  ChevronUp,
  Facebook,
  Twitter,
  Instagram,
  Linkedin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [activeFaq, setActiveFaq] = React.useState<number | null>(null);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'am' : 'en';
    i18n.changeLanguage(newLang);
  };

  const stats = [
    { label: t('stats_students'), value: '5,000+', icon: Users },
    { label: t('stats_programs'), value: '15+', icon: BookOpen },
    { label: t('stats_employment'), value: '94%', icon: BadgeCheck },
    { label: t('stats_branches'), value: '4', icon: Building2 },
  ];

  const aiFeatures = [
    {
      title: t('ai_grade_predict'),
      desc: t('ai_grade_desc'),
      icon: Brain,
      color: 'bg-blue-500',
    },
    {
      title: t('ai_chatbot'),
      desc: t('ai_chatbot_desc'),
      icon: MessageCircle,
      color: 'bg-purple-500',
    },
    {
      title: t('ai_at_risk'),
      desc: t('ai_at_risk_desc'),
      icon: Zap,
      color: 'bg-amber-500',
    },
  ];

  const steps = [
    { title: t('step_1'), desc: t('step_1_desc'), icon: Clock3 },
    { title: t('step_2'), desc: t('step_2_desc'), icon: ShieldCheck },
    { title: t('step_3'), desc: t('step_3_desc'), icon: Zap },
    { title: t('step_4'), desc: t('step_4_desc'), icon: GraduationCap },
  ];

  const faqs = [
    {
      q: "What are the admission requirements?",
      a: "Admission requirements vary by program. Generally, for undergraduate degrees, you need to have completed secondary education with a passing score on the national entrance exam. Specific document requirements are listed during the application process."
    },
    {
      q: "How can I pay my registration fees?",
      a: "We support multiple payment methods including online payments via Chapa (using Telebirr, CBEBirr, Cards) and bank receipt verification for CBE (Commercial Bank of Ethiopia)."
    },
    {
      q: "Is Dreamland College accredited?",
      a: "Yes, Dreamland College is fully accredited by the Ministry of Education of Ethiopia for all programs we offer."
    },
    {
      q: "Can I manage my studies via mobile?",
      a: "Absolutely! Our official mobile app allows students to view schedules, check grades, make payments, and receive important notifications directly on their smartphones."
    }
  ];

  const programs = [
    {
      title: 'Computer Science',
      level: 'BSc Degree',
      duration: '4 Years',
      format: 'Full-time',
      image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Business Administration',
      level: 'BA Degree',
      duration: '4 Years',
      format: 'Weekend / Regular',
      image: 'https://images.unsplash.com/photo-1454165833767-027ff33026b6?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Accounting & Finance',
      level: 'BA Degree',
      duration: '4 Years',
      format: 'Full-time',
      image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Public Health',
      level: 'BSc Degree',
      duration: '4 Years',
      format: 'Full-time',
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
    },
  ];

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/70 backdrop-blur-xl z-50 border-b border-stone-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ rotate: 10 }}
              className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20"
            >
              <GraduationCap size={24} />
            </motion.div>
            <div>
              <span className="font-black text-xl block leading-none tracking-tight">DREAMLAND</span>
              <span className="text-[10px] font-bold text-emerald-600 tracking-[3px] uppercase">College</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-10">
            {['About', 'Programs', 'AI Learning', 'Contact'].map((item) => (
              <a 
                key={item}
                href={`#${item.toLowerCase().replace(' ', '-')}`} 
                className="text-sm font-semibold text-stone-600 hover:text-emerald-600 transition-colors relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-600 transition-all group-hover:w-full"></span>
              </a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 text-sm font-bold hover:bg-stone-50 transition-all"
            >
              <Globe size={16} className="text-emerald-600" />
              {i18n.language === 'en' ? 'አማርኛ' : 'English'}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-bold text-stone-700 hover:text-emerald-600 transition-colors px-4"
            >
              {t('login')}
            </button>
            <button
              onClick={() => navigate('/public-registration')}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
            >
              {t('apply_now')}
            </button>
          </div>

          <button
            className="lg:hidden p-2 text-stone-600 hover:text-emerald-600 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="lg:hidden bg-white border-b border-stone-100 overflow-hidden"
            >
              <div className="flex flex-col p-6 space-y-4">
                {['About', 'Programs', 'AI Learning', 'Contact'].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replace(' ', '-')}`}
                    onClick={() => setIsMenuOpen(false)}
                    className="text-lg font-bold text-stone-700 py-3 border-b border-stone-50 flex items-center justify-between"
                  >
                    {item}
                    <ArrowRight size={18} className="text-stone-300" />
                  </a>
                ))}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button
                    onClick={() => { toggleLanguage(); setIsMenuOpen(false); }}
                    className="flex items-center justify-center gap-2 py-4 rounded-2xl border border-stone-200 font-bold text-sm"
                  >
                    <Globe size={18} />
                    {i18n.language === 'en' ? 'አማርኛ' : 'English'}
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="py-4 rounded-2xl bg-stone-100 text-stone-900 font-bold text-sm"
                  >
                    {t('login')}
                  </button>
                </div>
                <button
                  onClick={() => navigate('/public-registration')}
                  className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-600/20"
                >
                  {t('apply_now')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.05),_transparent_40%)]" />
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-emerald-100/30 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute bottom-1/4 left-0 w-72 h-72 bg-blue-100/20 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-widest mb-8 border border-emerald-100 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Registration for 2026/27 is Live
            </div>
            
            <h1 className="text-6xl md:text-7xl font-black text-stone-900 leading-[1.05] mb-8">
              Shape Your Future at <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Dreamland.</span>
            </h1>
            
            <p className="text-xl text-stone-600 mb-10 leading-relaxed max-w-xl">
              {t('mission_text')} Ethiopia's premier AI-integrated college offering world-class degree programs and career-ready skills.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 mb-12">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/public-registration')}
                className="px-10 py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-600/30 flex items-center justify-center gap-3"
              >
                {t('apply_now')}
                <ArrowRight size={22} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/login')}
                className="px-10 py-5 bg-white text-stone-700 border-2 border-stone-100 rounded-2xl font-black text-lg hover:border-emerald-200 transition-all flex items-center justify-center shadow-sm"
              >
                Student Portal
              </motion.button>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex -space-x-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-12 h-12 rounded-full border-4 border-white overflow-hidden bg-stone-100">
                    <img src={`https://i.pravatar.cc/150?u=${i + 10}`} alt="Student" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 text-amber-500">
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={16} fill="currentColor" />)}
                </div>
                <p className="text-sm font-bold text-stone-900 mt-1">Join 5,000+ ambitious students</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            {/* Hero Image Container */}
            <div className="relative z-10 rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white">
              <img
                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80"
                alt="Dreamland Students"
                className="w-full aspect-[4/5] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/80 via-transparent to-transparent" />
              <div className="absolute bottom-10 left-10 right-10 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="font-black text-xl leading-tight">Ministry of Education<br/>Accredited</p>
                </div>
                <p className="text-emerald-50/80 text-sm leading-relaxed max-w-xs italic font-medium">
                  "The AI-powered grade predictor helped me identify my weak areas early in the semester. Truly revolutionary!"
                </p>
              </div>
            </div>

            {/* Floating Card: AI Preview */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-8 top-1/4 z-20 bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-stone-100 max-w-[200px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Brain size={28} />
              </div>
              <h4 className="font-black text-stone-900 text-sm mb-1">AI Grade Predictor</h4>
              <p className="text-[11px] text-stone-500 leading-tight">Predicting student outcomes with 94% accuracy.</p>
              <div className="mt-3 h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "85%" }}
                  transition={{ duration: 1.5, delay: 1 }}
                  className="h-full bg-blue-500" 
                />
              </div>
            </motion.div>

            {/* Floating Card: Mobile App */}
            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-12 bottom-1/4 z-20 bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-stone-100 max-w-[220px]"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Smartphone size={24} />
                </div>
                <h4 className="font-black text-stone-900 text-sm">Mobile ID</h4>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-3/4 bg-stone-100 rounded-full" />
                <div className="h-2 w-full bg-stone-100 rounded-full" />
                <div className="h-8 w-full bg-emerald-600 rounded-xl mt-2 flex items-center justify-center text-[10px] text-white font-bold">
                  ACTIVE PASSPORT
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-6 p-6 rounded-3xl bg-stone-50 border border-stone-100 group hover:bg-white hover:shadow-xl hover:shadow-stone-200/50 transition-all duration-500"
              >
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500">
                  <stat.icon size={32} />
                </div>
                <div>
                  <div className="text-3xl font-black text-stone-900 leading-tight">{stat.value}</div>
                  <div className="text-xs font-bold text-stone-500 uppercase tracking-widest mt-1">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Features Highlight */}
      <section id="ai-learning" className="py-24 bg-stone-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] -z-0" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] -z-0" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-3xl mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[3px] mb-6">
              <Brain size={12} />
              AI-First Campus
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
              {t('ai_title')}
            </h2>
            <p className="text-xl text-stone-400 leading-relaxed">
              {t('ai_subtitle')} We are the first college in Ethiopia to integrate predictive AI to support student success.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {aiFeatures.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-10 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all group"
              >
                <div className={`w-16 h-16 rounded-2xl ${feature.color} flex items-center justify-center text-white mb-8 shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon size={32} />
                </div>
                <h3 className="text-2xl font-black mb-4">{feature.title}</h3>
                <p className="text-stone-400 leading-relaxed text-lg mb-8">{feature.desc}</p>
                <div className="flex items-center gap-2 text-emerald-400 font-bold group-hover:gap-4 transition-all">
                  Learn more <ArrowRight size={20} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="how-it-works" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-sm font-black text-emerald-600 uppercase tracking-[5px] mb-4">Admissions</h2>
            <p className="text-4xl md:text-5xl font-black text-stone-900">{t('how_it_works')}</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden lg:block absolute top-1/4 left-0 w-full h-0.5 bg-stone-100 -z-10" />
            
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-3xl bg-white border-2 border-stone-50 flex items-center justify-center text-emerald-600 mx-auto mb-8 shadow-xl shadow-stone-200/50 relative z-10 group hover:border-emerald-500 transition-colors">
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                    {i + 1}
                  </div>
                  <step.icon size={36} />
                </div>
                <h3 className="text-xl font-black text-stone-900 mb-4">{step.title}</h3>
                <p className="text-stone-500 leading-relaxed text-sm px-4">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Programs Grid */}
      <section id="programs" className="py-24 px-6 bg-stone-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
            <div className="max-w-2xl">
              <h2 className="text-sm font-black text-emerald-600 uppercase tracking-[5px] mb-4">Academics</h2>
              <p className="text-4xl md:text-5xl font-black text-stone-900 mb-6">Explore Our Accredited Programs</p>
              <p className="text-lg text-stone-600">Built for the Ethiopian job market and international standards.</p>
            </div>
            <motion.button
              whileHover={{ x: 10 }}
              onClick={() => navigate('/public-registration')}
              className="px-8 py-4 bg-white border-2 border-stone-200 rounded-2xl font-black text-stone-900 flex items-center gap-3 hover:border-emerald-500 hover:text-emerald-600 transition-all"
            >
              All Programs <ArrowRight size={20} />
            </motion.button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {programs.map((prog, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group cursor-pointer"
                onClick={() => navigate('/public-registration')}
              >
                <div className="aspect-[3/4] rounded-[2.5rem] overflow-hidden bg-stone-200 mb-6 relative">
                  <img
                    src={prog.image}
                    alt={prog.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                  <div className="absolute top-6 right-6">
                    <span className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest border border-white/20">
                      {prog.level}
                    </span>
                  </div>
                  <div className="absolute bottom-8 left-8 right-8 text-white transform group-hover:-translate-y-2 transition-transform">
                    <h4 className="text-2xl font-black mb-2 leading-tight">{prog.title}</h4>
                    <p className="text-white/70 text-sm font-bold flex items-center gap-2">
                      <Clock3 size={16} /> {prog.duration} • {prog.format}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile App Section */}
      <section className="py-24 px-6 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto rounded-[3rem] bg-emerald-600 p-12 lg:p-24 text-white relative flex flex-col lg:flex-row items-center gap-16">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-[100px] -z-0" />
          
          <div className="flex-1 relative z-10 text-center lg:text-left">
            <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
              {t('mobile_app_title')}
            </h2>
            <p className="text-xl text-emerald-50/80 leading-relaxed mb-12 max-w-xl">
              {t('mobile_app_desc')} Our digital-first approach means you never lose track of your progress.
            </p>
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <button className="bg-white text-emerald-900 px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-emerald-50 transition-colors shadow-xl shadow-emerald-900/20">
                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white">
                  <Smartphone size={18} />
                </div>
                Download App
              </button>
              <button className="bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black border border-emerald-500/30 flex items-center gap-3 hover:bg-emerald-800 transition-colors">
                View Features <ArrowRight size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 relative lg:h-[500px] w-full max-w-[320px]">
            {/* Phone Mockup (CSS) */}
            <motion.div 
              initial={{ rotate: 10, y: 100 }}
              whileInView={{ rotate: -10, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="w-full h-full bg-stone-900 rounded-[3rem] border-8 border-stone-800 shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-stone-800 rounded-b-2xl z-20" />
              <div className="p-6 pt-12">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-2 w-1/2 bg-white/20 rounded-full" />
                    <div className="h-1.5 w-1/3 bg-white/10 rounded-full" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="aspect-square rounded-2xl bg-white/5 border border-white/10 p-4">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 mb-2" />
                      <div className="h-1.5 w-full bg-white/20 rounded-full" />
                    </div>
                  ))}
                </div>
                <div className="h-32 w-full rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="h-2 w-1/2 bg-emerald-500 rounded-full mb-3" />
                  <div className="space-y-2">
                    <div className="h-1.5 w-full bg-white/10 rounded-full" />
                    <div className="h-1.5 w-full bg-white/10 rounded-full" />
                    <div className="h-1.5 w-3/4 bg-white/10 rounded-full" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-6 bg-stone-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-sm font-black text-emerald-600 uppercase tracking-[5px] mb-4">Questions</h2>
            <p className="text-4xl font-black text-stone-900">Frequently Asked</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div 
                key={i}
                initial={false}
                className="bg-white rounded-3xl border border-stone-100 overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full p-8 flex items-center justify-between text-left hover:bg-stone-50 transition-colors"
                >
                  <span className="text-lg font-black text-stone-900">{faq.q}</span>
                  <div className={`w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center transition-transform ${activeFaq === i ? 'rotate-180 bg-emerald-600 border-emerald-600 text-white' : 'text-stone-400'}`}>
                    <ChevronDown size={20} />
                  </div>
                </button>
                <AnimatePresence>
                  {activeFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-8 pt-0 text-stone-600 leading-relaxed border-t border-stone-50">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-7xl font-black text-stone-900 mb-8 leading-tight">
            Ready to Start Your <br/> <span className="text-emerald-600">Educational Journey?</span>
          </h2>
          <p className="text-xl text-stone-600 mb-12 max-w-2xl mx-auto">
            Join thousands of successful graduates who have built their careers with Dreamland College. Online application takes less than 5 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              onClick={() => navigate('/public-registration')}
              className="px-12 py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-xl hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-600/30 active:scale-95 flex items-center justify-center gap-3"
            >
              Apply Online Now
              <ArrowRight size={24} />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-12 py-6 bg-stone-900 text-white rounded-[2rem] font-black text-xl hover:bg-stone-800 transition-all flex items-center justify-center"
            >
              Student Login
            </button>
          </div>
        </div>
        
        {/* Background blobs */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-50 rounded-full blur-[100px] -z-0" />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-blue-50 rounded-full blur-[100px] -z-0" />
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-white pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
            <div className="col-span-1 lg:col-span-1">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <span className="font-black text-xl block leading-none tracking-tight">DREAMLAND</span>
                  <span className="text-[10px] font-bold text-emerald-500 tracking-[3px] uppercase">College</span>
                </div>
              </div>
              <p className="text-stone-400 mb-8 leading-relaxed">
                Empowering Ethiopia's future through quality higher education, innovation, and digital-first learning experiences.
              </p>
              <div className="flex gap-4">
                {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-emerald-600 hover:scale-110 transition-all">
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-black mb-8 text-white uppercase tracking-[3px] text-xs">Quick Links</h4>
              <ul className="space-y-4">
                {['Programs', 'Admissions', 'Student Portal', 'About Us', 'News & Events'].map(item => (
                  <li key={item}>
                    <a href="#" className="text-stone-400 hover:text-emerald-500 transition-colors flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-black mb-8 text-white uppercase tracking-[3px] text-xs">Contact Information</h4>
              <ul className="space-y-6">
                <li className="flex gap-4 items-start group">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white mb-1">Visit Us</div>
                    <div className="text-stone-400 text-sm">Addis Ababa, 4 Kilo Area</div>
                  </div>
                </li>
                <li className="flex gap-4 items-start group">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Phone size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white mb-1">Call Us</div>
                    <div className="text-stone-400 text-sm">+251 11 122 3344</div>
                  </div>
                </li>
                <li className="flex gap-4 items-start group">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Mail size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white mb-1">Email Us</div>
                    <div className="text-stone-400 text-sm">info@dreamland.edu.et</div>
                  </div>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-black mb-8 text-white uppercase tracking-[3px] text-xs">Newsletter</h4>
              <p className="text-stone-400 text-sm mb-6">Stay updated with our latest news and program offerings.</p>
              <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10">
                  Subscribe Now
                </button>
              </form>
            </div>
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-stone-500 text-sm">
              &copy; 2026 Dreamland College. All rights reserved. 
            </p>
            <div className="flex gap-8 text-stone-500 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Accreditations</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
