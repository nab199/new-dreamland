import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Users,
  Building2,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  Globe,
  Mail,
  Phone,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Clock,
  Target,
  MapPin
} from 'lucide-react';

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform duration-300">
              <GraduationCap size={24} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-stone-900 leading-none">DREAMLAND</span>
              <span className="text-[10px] font-black tracking-[0.2em] text-emerald-600 uppercase mt-1">College</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-10">
            {['Programs', 'Admissions', 'About Us', 'Contact'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-bold text-stone-600 hover:text-emerald-600 transition-colors uppercase tracking-widest">{item}</a>
            ))}
          </div>
          <Link to="/login" className="px-6 py-2.5 bg-stone-900 text-white rounded-full text-sm font-bold hover:bg-stone-800 transition-all shadow-xl shadow-stone-200 active:scale-95">
            Student Portal
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-44 pb-32 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-emerald-50/50 -skew-x-12 origin-top transform translate-x-1/2 -z-10" />
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-8"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-100">
              <Sparkles size={14} />
              Accredited Higher Education
            </motion.div>
            <motion.h1 variants={itemVariants} className="text-6xl md:text-7xl font-black text-stone-900 leading-[1.1] tracking-tight">
              Empowering the <span className="text-emerald-600 underline decoration-emerald-100 underline-offset-8">Leaders</span> of Tomorrow
            </motion.h1>
            <motion.p variants={itemVariants} className="text-xl text-stone-600 leading-relaxed max-w-xl">
              Dreamland College provides a transformative educational experience that prepares students for global challenges with innovation, ethics, and excellence.
            </motion.p>
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
              <Link to="/public-registration" className="px-10 py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-200 flex items-center justify-center gap-3 active:scale-95 group">
                Apply Now
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="px-10 py-5 bg-white text-stone-900 border-2 border-stone-200 rounded-2xl font-black text-lg hover:border-emerald-600 hover:text-emerald-600 transition-all active:scale-95">
                Explore Programs
              </button>
            </motion.div>
            <motion.div variants={itemVariants} className="flex items-center gap-8 pt-6 border-t border-stone-200">
              <div>
                <p className="text-3xl font-black text-stone-900">15k+</p>
                <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mt-1">Graduates</p>
              </div>
              <div>
                <p className="text-3xl font-black text-stone-900">4+</p>
                <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mt-1">Branches</p>
              </div>
              <div>
                <p className="text-3xl font-black text-stone-900">98%</p>
                <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mt-1">Success Rate</p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
            style={{ perspective: 1200 }}
          >
            <div className="aspect-square bg-emerald-600 rounded-[3rem] transform rotate-3 absolute inset-0 -z-10 shadow-2xl shadow-emerald-100" />
            <motion.div
              whileHover={{ rotateY: 15, rotateX: -10, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="aspect-square bg-stone-900 rounded-[3rem] transform -rotate-3 overflow-hidden border-8 border-white shadow-2xl"
            >
              <img
                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=1000"
                alt="Students"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 to-transparent flex flex-col justify-end p-10">
                <div className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                  <p className="text-white font-bold leading-relaxed italic text-lg">
                    "Dreamland provided the foundation for my international career in Computer Science. The faculty are truly world-class."
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 border-2 border-white" />
                    <div>
                      <p className="text-white text-sm font-bold">Abebe Kebede</p>
                      <p className="text-emerald-300 text-[10px] font-black uppercase">Software Architect, Google</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-white" id="programs">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-stone-900 mb-6 leading-tight">Why Choose Dreamland College?</h2>
            <p className="text-lg text-stone-600 leading-relaxed font-medium">We combine traditional academic rigor with modern technological integration to provide a comprehensive learning experience.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: BookOpen,
                title: "Excellence in Academics",
                desc: "Rigorous curriculum updated with the latest industry standards and global trends.",
                color: "bg-blue-50 text-blue-600"
              },
              {
                icon: Users,
                title: "Expert Faculty",
                desc: "Learn from distinguished professors and industry leaders with decades of experience.",
                color: "bg-emerald-50 text-emerald-600"
              },
              {
                icon: Building2,
                title: "Multiple Branches",
                desc: "Modern campus facilities in Addis Ababa, Adama, and other strategic locations.",
                color: "bg-purple-50 text-purple-600"
              },
              {
                icon: Target,
                title: "Practical Learning",
                desc: "Emphasis on lab work, internships, and real-world project experience for all students.",
                color: "bg-orange-50 text-orange-600"
              },
              {
                icon: Clock,
                title: "Flexible Scheduling",
                desc: "Regular, Extension, Weekend, and Distance programs to fit your busy lifestyle.",
                color: "bg-pink-50 text-pink-600"
              },
              {
                icon: ShieldCheck,
                title: "Fully Accredited",
                desc: "All our programs are fully recognized and accredited by the Ministry of Education.",
                color: "bg-stone-50 text-stone-900"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className="p-10 rounded-[2.5rem] bg-stone-50/50 border border-stone-100 hover:bg-white hover:shadow-2xl hover:shadow-stone-200 transition-all group"
              >
                <div className={`w-16 h-16 rounded-2xl ${feature.color} flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon size={32} />
                </div>
                <h3 className="text-xl font-black text-stone-900 mb-4">{feature.title}</h3>
                <p className="text-stone-500 leading-relaxed font-medium">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto bg-stone-900 rounded-[3rem] overflow-hidden relative p-12 md:p-24 text-center">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#059669_0%,transparent_50%)]" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative z-10"
          >
            <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight leading-tight">Ready to start your journey <br className="hidden md:block" /> at Dreamland College?</h2>
            <p className="text-emerald-100 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">Join thousands of students who have transformed their lives through quality education. Our admissions are currently open.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/public-registration" className="px-10 py-4 bg-emerald-500 text-white rounded-2xl font-bold text-lg hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-2">
                Apply Now <ArrowRight size={20} />
              </Link>
              <Link to="/contact" className="px-10 py-4 bg-stone-800 text-white border border-stone-700 rounded-2xl font-bold text-lg hover:bg-stone-700 transition-all active:scale-95">
                Contact Admissions
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 py-20 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                <GraduationCap size={20} />
              </div>
              <span className="text-lg font-black tracking-tight text-white">DREAMLAND</span>
            </div>
            <p className="text-sm leading-relaxed">
              Empowering students with knowledge and skills for a brighter future since 2010.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Quick Links</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="hover:text-emerald-500 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Programs</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Admissions</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">News & Events</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Contact</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-emerald-600" />
                +251 11 123 4567
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-emerald-600" />
                info@dreamland.edu.et
              </li>
              <li className="flex items-center gap-3">
                <MapPin size={16} className="text-emerald-600" />
                4 Kilo, Addis Ababa
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Newsletter</h4>
            <p className="text-xs mb-4">Subscribe to get the latest updates.</p>
            <div className="flex gap-2">
              <input type="email" placeholder="Email" className="bg-stone-800 border-none rounded-xl px-4 py-2 text-sm w-full focus:ring-1 focus:ring-emerald-500" />
              <button className="bg-emerald-600 text-white rounded-xl px-4 py-2 hover:bg-emerald-700 transition-colors">
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-12 mt-12 border-t border-stone-800 text-center text-xs">
          <p>&copy; {new Date().getFullYear()} Dreamland College. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}