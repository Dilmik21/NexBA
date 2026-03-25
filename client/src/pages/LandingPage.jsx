import { useState } from "react";
import { Link } from "react-router-dom";
import { Play, CheckCircle2, Shield, BrainCircuit, Sparkles, FileText, Menu, X } from "lucide-react";

// Import your custom logos
import logoDark from '../assets/logo-dark.png';
import logoLight from '../assets/logo-light.png';

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white font-sans text-navy overflow-x-hidden">
      
      {/* 1. TOP NAVBAR */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <nav className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          
          <Link to="/" className="flex items-center transition-transform hover:scale-105 duration-300 z-50">
            <img 
              src={logoDark} 
              alt="NexBA Logo" 
              className="h-8 md:h-10 w-auto object-contain" 
            />
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-600">
            <Link to="/features" className="hover:text-primary transition-colors">Features</Link>
            <Link to="/solutions" className="hover:text-primary transition-colors">Solutions</Link>
            <Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
              Log In
            </Link>
            <Link to="/register" className="bg-primary text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-blue-700 transition-shadow shadow-md hover:shadow-lg">
              Get Started
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button 
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors z-50"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="absolute top-[100%] left-0 w-full bg-white border-b border-gray-200 shadow-lg md:hidden animate-in slide-in-from-top-4 duration-200">
            <div className="flex flex-col px-4 py-4 space-y-4">
              <Link to="/features" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-600 font-medium hover:text-primary py-2 border-b border-gray-50">Features</Link>
              <Link to="/solutions" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-600 font-medium hover:text-primary py-2 border-b border-gray-50">Solutions</Link>
              <Link to="/pricing" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-600 font-medium hover:text-primary py-2 border-b border-gray-50">Pricing</Link>
              <Link to="/contact" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-600 font-medium hover:text-primary py-2 border-b border-gray-50">Contact</Link>
              
              <div className="flex flex-col space-y-3 pt-2">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center text-navy font-bold py-3 border border-gray-200 rounded-xl hover:bg-gray-50">
                  Log In
                </Link>
                <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center bg-primary text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-md">
                  Get Started Free
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <div className="container mx-auto px-4 md:px-6 pt-32 pb-16 md:pt-40 md:pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center text-center lg:text-left">
        
        {/* Left Side: Text & Buttons */}
        <div className="space-y-6 md:space-y-8 z-10 flex flex-col items-center lg:items-start">
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-primary px-4 py-2 rounded-full text-xs md:text-sm font-semibold max-w-full">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Intelligent Requirement Management</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight">
            Intelligent Requirements, <br className="hidden sm:block" />
            <span className="text-primary">Verified Execution.</span>
          </h1>
          
          <p className="text-base md:text-lg text-gray-600 max-w-lg leading-relaxed px-4 lg:px-0">
            Bridge the gap between Clients, Analysts, and Developers with intelligent verification and AI-powered analysis.
          </p>
          
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto px-4 lg:px-0">
            <Link to="/register" className="w-full sm:w-auto bg-primary text-white px-8 py-4 rounded-full font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl text-center">
              Get Started Free →
            </Link>
            <button className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-white text-navy border border-gray-200 px-8 py-4 rounded-full font-semibold hover:bg-gray-50 transition-all">
              <Play className="w-5 h-5 text-gray-600" />
              <span>Watch Demo</span>
            </button>
          </div>

          {/* Trusted by Teams */}
          <div className="flex flex-col sm:flex-row items-center sm:space-x-4 pt-4 space-y-3 sm:space-y-0">
            <div className="flex -space-x-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white z-40 shadow-sm">SM</div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white z-30 shadow-sm">JC</div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white z-20 shadow-sm">AW</div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white z-10 shadow-sm">P2</div>
            </div>
            <div className="text-sm text-center sm:text-left">
              <p className="font-bold text-navy">Trusted by 200+ teams</p>
              <p className="text-gray-500 text-xs">Managing 5,000+ requirements</p>
            </div>
          </div>
        </div>

        {/* Right Side: Floating Cards (Hidden on small mobile, visible on desktop) */}
        <div className="relative h-[450px] lg:h-[550px] w-full hidden md:block mt-10 lg:mt-0">
          
          <div className="absolute top-10 left-16 bg-white p-5 rounded-2xl shadow-xl border border-gray-100 w-72 animate-float z-20">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-blue-100 p-2 rounded-lg"><FileText className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-gray-500 font-semibold">REQ-241</p>
                <p className="text-sm font-bold">New Requirement</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">Microservices Architecture Migration with zero-downtime...</p>
            <div className="flex space-x-2">
              <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-bold">High</span>
              <span className="text-[10px] bg-blue-100 text-primary px-2 py-1 rounded font-bold">Analysis</span>
            </div>
          </div>

          <div className="absolute top-36 right-8 bg-white p-5 rounded-2xl shadow-xl border border-gray-100 w-80 animate-float-delayed z-30">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shadow-inner">JC</div>
              <div>
                <p className="text-sm font-bold">James Chen</p>
                <p className="text-xs text-gray-500">Business Analyst</p>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 mb-3 border border-gray-100">
              Is that 50k concurrent or unique daily?
            </div>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start space-x-2">
              <BrainCircuit className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-primary">AI Analysis</p>
                <p className="text-xs text-gray-600">2 ambiguities found.</p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-20 left-28 bg-white p-5 rounded-2xl shadow-xl border border-gray-100 w-72 animate-float-fast z-40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-bold text-sm">Verified</span>
              </div>
              <span className="text-xs text-gray-500">BA Approval</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-primary h-2 rounded-full w-[82%]"></div>
            </div>
            <p className="text-right text-xs font-bold mt-1 text-gray-500">82%</p>
          </div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 md:w-[28rem] md:h-[28rem] bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        </div>
      </div>

      {/* 3. FEATURES SECTION */}
      <div className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-primary text-sm font-bold bg-blue-50 px-3 py-1 rounded-full">Why NexBA</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-4 px-4">Built for Enterprise Teams</h2>
            <p className="text-gray-600 max-w-xl mx-auto px-4">Streamline your requirement lifecycle from submission to verification.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            <div className="p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow bg-gray-50/50">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <BrainCircuit className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Intelligent Analysis</h3>
              <p className="text-gray-600 text-sm leading-relaxed">AI-powered requirement parsing and summary generation. Automatically extract key requirements, acceptance criteria, and risk factors.</p>
            </div>

            <div className="p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow bg-gray-50/50">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Role-Based Security</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Strict access controls ensure data integrity across teams. Clients, Analysts, and Developers each see only what they need.</p>
            </div>

            <div className="p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow bg-gray-50/50 sm:col-span-2 md:col-span-1">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <CheckCircle2 className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">Evidence Verification</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Screenshot and commit-based proof of completion. Every deliverable is verified before sign-off, ensuring accountability.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CALL TO ACTION SECTION */}
      <div className="container mx-auto px-4 md:px-6 py-16 md:py-20">
        <div className="bg-primary rounded-3xl p-8 md:p-12 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
             </svg>
          </div>
          
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">Ready to streamline your workflow?</h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto text-base md:text-lg px-2">Join 200+ teams already using NexBA to manage requirements with AI-powered intelligence.</p>
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <Link to="/register" className="w-full sm:w-auto bg-white text-primary px-8 py-4 rounded-full font-bold hover:bg-gray-50 transition-colors shadow-lg">
                Start Free Trial →
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 rounded-full font-bold border border-blue-300 hover:bg-blue-600 transition-colors">
                Talk to Sales
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. FOOTER */}
      <footer className="bg-[#1A2536] text-gray-400 py-10 mt-6">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 mb-6 md:mb-0">
            <img 
              src={logoLight} 
              alt="NexBA Logo" 
              className="h-8 md:h-10 w-auto object-contain opacity-90" 
            />
            <p className="text-xs md:text-sm">© 2026 NexBA Inc. All rights reserved.</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-xs md:text-sm">
            <Link to="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link to="#" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}