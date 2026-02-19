import { Link } from "react-router-dom";
import { Play, CheckCircle2, Shield, BrainCircuit, Sparkles, FileText } from "lucide-react";

// Import your custom logos
import logoDark from '../assets/logo-dark.png';
import logoLight from '../assets/logo-light.png';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white font-sans text-navy overflow-x-hidden">
      
      {/* 1. TOP NAVBAR (Changed to FIXED to guarantee it stays at the top) */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center transition-transform hover:scale-105 duration-300">
            <img 
              src={logoDark} 
              alt="NexBA Logo" 
              className="h-8 md:h-10 w-auto object-contain" 
            />
          </Link>
          
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-600">
            <Link to="/features" className="hover:text-primary transition-colors">Features</Link>
            <Link to="/solutions" className="hover:text-primary transition-colors">Solutions</Link>
            <Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
              Log In
            </Link>
            <Link to="/register" className="bg-primary text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-blue-700 transition-shadow shadow-md hover:shadow-lg">
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* 2. HERO SECTION (Added pt-32 to push it down below the fixed navbar) */}
      <div className="container mx-auto px-6 pt-32 pb-16 md:pt-40 md:pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: Text & Buttons */}
        <div className="space-y-8 z-10">
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-primary px-4 py-2 rounded-full text-sm font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>Intelligent Requirement Management and Collaboration System</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
            Intelligent Requirements, <br />
            <span className="text-primary">Verified Execution.</span>
          </h1>
          
          <p className="text-lg text-gray-600 max-w-lg leading-relaxed">
            Bridge the gap between Clients, Analysts, and Developers with intelligent verification and AI-powered analysis.
          </p>
          
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <Link to="/register" className="bg-primary text-white px-8 py-4 rounded-full font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl text-center">
              Get Started Free →
            </Link>
            <button className="flex items-center justify-center space-x-2 bg-white text-navy border border-gray-200 px-8 py-4 rounded-full font-semibold hover:bg-gray-50 transition-all">
              <Play className="w-5 h-5 text-gray-600" />
              <span>Watch Demo</span>
            </button>
          </div>

          {/* Trusted by Teams */}
          <div className="flex items-center space-x-4 pt-4">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white z-40 shadow-sm">SM</div>
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white z-30 shadow-sm">JC</div>
              <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white z-20 shadow-sm">AW</div>
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white z-10 shadow-sm">P2</div>
            </div>
            <div className="text-sm">
              <p className="font-bold text-navy">Trusted by 200+ teams</p>
              <p className="text-gray-500 text-xs">Managing 5,000+ requirements</p>
            </div>
          </div>
        </div>

        {/* Right Side: Floating Cards */}
        <div className="relative h-[450px] lg:h-[550px] w-full hidden md:block">
          
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
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        </div>
      </div>

      {/* 3. FEATURES SECTION */}
      <div className="bg-white py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-primary text-sm font-bold bg-blue-50 px-3 py-1 rounded-full">Why NexBA</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-4">Built for Enterprise Teams</h2>
            <p className="text-gray-600 max-w-xl mx-auto">Streamline your requirement lifecycle from submission to verification.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow bg-gray-50/50">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <BrainCircuit className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Intelligent Analysis</h3>
              <p className="text-gray-600 text-sm leading-relaxed">AI-powered requirement parsing and summary generation. Automatically extract key requirements, acceptance criteria, and risk factors.</p>
            </div>

            <div className="p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow bg-gray-50/50">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Role-Based Security</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Strict access controls ensure data integrity across teams. Clients, Analysts, and Developers each see only what they need.</p>
            </div>

            <div className="p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow bg-gray-50/50">
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
      <div className="container mx-auto px-6 py-20">
        <div className="bg-primary rounded-3xl p-12 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
             </svg>
          </div>
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to streamline your workflow?</h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto text-lg">Join 200+ teams already using NexBA to manage requirements with AI-powered intelligence.</p>
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link to="/register" className="bg-white text-primary px-8 py-4 rounded-full font-bold hover:bg-gray-50 transition-colors shadow-lg">
                Start Free Trial →
              </Link>
              <button className="px-8 py-4 rounded-full font-bold border border-blue-300 hover:bg-blue-600 transition-colors">
                Talk to Sales
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. FOOTER */}
      <footer className="bg-[#1A2536] text-gray-400 py-12 mt-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <img 
              src={logoLight} 
              alt="NexBA Logo" 
              className="h-9 md:h-10 w-auto object-contain opacity-90" 
            />
          </div>
          <p className="text-sm">© 2026 NexBA Inc. All rights reserved.</p>
          <div className="flex space-x-6 text-sm mt-4 md:mt-0">
            <Link to="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link to="#" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}