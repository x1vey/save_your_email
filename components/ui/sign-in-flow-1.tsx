"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "./8bit-button";

const AnimatedNavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
  const defaultTextColor = 'text-gray-400';
  const hoverTextColor = 'text-white';
  const textSizeClass = 'text-[10px]';

  return (
    <a href={href} className={`group relative inline-block overflow-hidden h-5 flex items-center retro ${textSizeClass}`}>
      <div className="flex flex-col transition-transform duration-300 ease-out transform group-hover:-translate-y-1/2">
        <span className={defaultTextColor}>{children}</span>
        <span className={hoverTextColor}>{children}</span>
      </div>
    </a>
  );
};

export function MiniNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const navLinksData = [
    { label: 'Mission', href: '/mission' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Book Audit', href: '/book-audit' },
  ];

  return (
    <header className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center pl-6 pr-6 py-3 border-2 border-black bg-white shadow-[4px_4px_0_0_#000] w-[calc(100%-2rem)] sm:w-auto">
      <div className="flex items-center justify-between w-full gap-x-6 sm:gap-x-8">
        <div className="flex items-center retro font-bold text-xs uppercase tracking-tighter">
           <Link href="/">MailCheck</Link>
        </div>

        <nav className="hidden sm:flex items-center space-x-4 sm:space-x-6">
          {navLinksData.map((link) => (
            <AnimatedNavLink key={link.href} href={link.href}>
              {link.label}
            </AnimatedNavLink>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-2 sm:gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-[10px] uppercase">Log In</Button>
          </Link>
          <Link href="/login">
            <Button size="sm" className="text-[10px] uppercase">Sign Up</Button>
          </Link>
        </div>

        <button className="sm:hidden flex items-center justify-center w-8 h-8 text-black focus:outline-none retro" onClick={toggleMenu} aria-label={isOpen ? 'Close Menu' : 'Open Menu'}>
          {isOpen ? 'X' : '☰'}
        </button>
      </div>

      <div className={`sm:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100 pt-4' : 'max-h-0 opacity-0 pt-0 pointer-events-none'}`}>
        <nav className="flex flex-col items-center space-y-4 w-full retro text-[10px]">
          {navLinksData.map((link) => (
            <a key={link.href} href={link.href} className="text-gray-600 hover:text-black transition-colors w-full text-center uppercase">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex flex-col items-center space-y-4 mt-4 w-full">
          <Link href="/login" className="w-full">
             <Button variant="ghost" className="w-full text-[10px] uppercase">Log In</Button>
          </Link>
          <Link href="/login" className="w-full">
             <Button className="w-full text-[10px] uppercase">Sign Up</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

interface SignInPageProps {
  className?: string;
}

export const SignInPage = ({ className }: SignInPageProps) => {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code" | "success">("email");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setStep("code");
    }
  };

  useEffect(() => {
    if (step === "code") {
      setTimeout(() => {
        codeInputRefs.current[0]?.focus();
      }, 500);
    }
  }, [step]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length <= 1) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      
      if (value && index < 5) {
        codeInputRefs.current[index + 1]?.focus();
      }
      
      if (index === 5 && value) {
        const isComplete = newCode.every(digit => digit.length === 1);
        if (isComplete) {
          setTimeout(() => {
            setStep("success");
          }, 1000);
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleBackClick = () => {
    setStep("email");
    setCode(["", "", "", "", "", ""]);
  };

  return (
    <div className={cn("flex w-[100%] flex-col min-h-screen bg-background retro relative overflow-hidden", className)}>
      {/* 8-bit Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 0)', backgroundSize: '24px 24px' }}></div>
      
      <div className="relative z-10 flex flex-col flex-1">
        <MiniNavbar />

        <div className="flex flex-1 flex-col lg:flex-row justify-center items-center px-4">
          <div className="w-full mt-[100px] max-w-md bg-white border-4 border-black shadow-[12px_12px_0_0_#000] p-8">
            <AnimatePresence mode="wait">
              {step === "email" ? (
                <motion.div 
                  key="email-step"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 text-center"
                >
                  <div className="space-y-2 mb-8">
                    <h1 className="text-xl md:text-2xl font-bold uppercase leading-relaxed text-black">Welcome Player</h1>
                    <p className="text-[10px] text-gray-500 uppercase leading-loose">Insert coin to sign in</p>
                  </div>
                  
                  <div className="space-y-6">
                    <Button variant="outline" className="w-full uppercase text-[10px] py-6">
                       [G] Sign in with Google
                    </Button>
                    
                    <div className="flex items-center gap-4">
                      <div className="h-1 bg-black flex-1" />
                      <span className="text-black text-[10px] uppercase font-bold">OR</span>
                      <div className="h-1 bg-black flex-1" />
                    </div>
                    
                    <form onSubmit={handleEmailSubmit}>
                      <div className="flex flex-col space-y-4">
                        <input 
                          type="email" 
                          placeholder="PLAYER@GMAIL.COM"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-white text-black border-4 border-black p-4 focus:outline-none focus:ring-0 text-center uppercase text-xs shadow-[4px_4px_0_0_#000]"
                          required
                        />
                        <Button type="submit" className="w-full py-6 uppercase text-xs">
                          START →
                        </Button>
                      </div>
                    </form>
                  </div>
                  
                  <p className="text-[8px] text-gray-500 pt-8 uppercase leading-loose">
                    By signing up, you agree to the <Link href="#" className="underline">Terms</Link> and <Link href="#" className="underline">Privacy</Link>.
                  </p>
                </motion.div>
              ) : step === "code" ? (
                <motion.div 
                  key="code-step"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 text-center"
                >
                  <div className="space-y-2 mb-8">
                    <h1 className="text-xl md:text-2xl font-bold uppercase leading-relaxed text-black">Enter Cheat Code</h1>
                    <p className="text-[10px] text-gray-500 uppercase leading-loose">Check your inventory (email)</p>
                  </div>
                  
                  <div className="w-full mb-8">
                    <div className="flex items-center justify-center gap-2">
                      {code.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            codeInputRefs.current[i] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleCodeChange(i, e.target.value)}
                          onKeyDown={e => handleKeyDown(i, e)}
                          className="w-10 h-14 text-center text-xl bg-white text-black border-4 border-black focus:outline-none focus:bg-gray-100 uppercase"
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex w-full gap-4">
                    <Button 
                      variant="outline"
                      onClick={handleBackClick}
                      className="uppercase text-[10px] px-6"
                    >
                      ← Back
                    </Button>
                    <Button 
                      className="flex-1 uppercase text-[10px]"
                      disabled={!code.every(d => d !== "")}
                    >
                      Continue
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="success-step"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6 text-center py-8"
                >
                  <div className="space-y-4">
                    <h1 className="text-3xl font-bold uppercase text-black text-green-600">LEVEL CLEARED!</h1>
                    <p className="text-xs text-gray-600 uppercase">Login Successful</p>
                  </div>
                  
                  <div className="py-8">
                    <div className="text-6xl">🏆</div>
                  </div>
                  
                  <Button className="w-full uppercase text-xs py-6">
                    ENTER GAME
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
