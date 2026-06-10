"use client";

import React, { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";

export function GameAnimation() {
  const [gameState, setGameState] = useState<"playing" | "gameover">("playing");
  const ogreControls = useAnimation();
  const filterControls = useAnimation();
  const envelopeControls = useAnimation();

  useEffect(() => {
    let isMounted = true;

    const runSequence = async () => {
      while (isMounted) {
        setGameState("playing");

        // Reset positions
        await Promise.all([
          ogreControls.set({ x: -150, y: 0, rotate: 0 }),
          filterControls.set({ x: 300 }),
          envelopeControls.set({ x: 0, y: -40, rotate: 0, opacity: 1 }), // Envelope relative to ogre
        ]);

        // 1. Ogre walks in, filter moves towards ogre
        ogreControls.start({
          x: 0,
          transition: { duration: 1.5, ease: "linear" }
        });

        await filterControls.start({
          x: 40, // Collision point
          transition: { duration: 1.5, ease: "linear" }
        });

        // Collision happens
        setGameState("gameover");

        // 2. Ogre falls down, envelope drops
        ogreControls.start({
          y: 80,
          rotate: -90,
          transition: { duration: 0.5, type: "spring" }
        });

        await envelopeControls.start({
          y: 60,
          x: -20,
          rotate: -45,
          opacity: 0,
          transition: { duration: 0.8 }
        });

        // Wait before restart
        await new Promise(r => setTimeout(r, 1500));
      }
    };

    runSequence();

    return () => {
      isMounted = false;
    };
  }, [ogreControls, filterControls, envelopeControls]);

  return (
    <div className="relative w-full max-w-2xl mx-auto h-64 bg-black border-4 border-black shadow-[8px_8px_0_0_#000] overflow-hidden retro flex flex-col items-center justify-end pb-8">
      
      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-8 border-t-4 border-dashed border-gray-600 bg-gray-900 z-0"></div>

      {/* Game Over Text */}
      {gameState === "gameover" && (
        <div className="absolute top-1/4 text-center z-20">
          <h2 className="text-red-500 font-bold text-2xl mb-2 tracking-widest">BLOCKED</h2>
          <p className="text-white text-[10px] animate-pulse">SPAM FILTER HIT</p>
        </div>
      )}

      {/* Game Scene */}
      <div className="relative w-full h-full flex items-end justify-center z-10 pb-4">
        
        {/* Spam Filter */}
        <motion.div 
          animate={filterControls}
          className="absolute bottom-0 right-1/2 w-16 h-24 bg-red-600 border-4 border-black flex flex-col items-center justify-evenly"
        >
          <div className="w-8 h-2 bg-black"></div>
          <div className="w-12 h-2 bg-black"></div>
          <div className="w-8 h-2 bg-black"></div>
          <span className="text-[8px] text-black font-bold rotate-90 absolute left-4 top-8">SPAM</span>
        </motion.div>

        {/* Ogre Container */}
        <motion.div 
          animate={ogreControls}
          className="absolute bottom-0 flex flex-col items-center"
        >
          {/* Envelope */}
          <motion.div 
            animate={envelopeControls}
            className="w-12 h-8 bg-white border-4 border-black relative flex items-center justify-center shadow-md mb-2"
          >
            <div className="absolute top-0 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[14px] border-t-black"></div>
            <div className="w-2 h-2 rounded-full bg-red-500 z-10 absolute"></div>
          </motion.div>

          {/* Ogre Body (Pure CSS) */}
          <div className="w-16 h-16 bg-green-500 border-4 border-black relative shadow-[-4px_0_0_0_rgba(0,0,0,0.2)_inset]">
             {/* Eyes */}
             <div className="absolute top-2 left-2 w-3 h-3 bg-white border-2 border-black flex items-center justify-center">
                <div className="w-1 h-1 bg-black"></div>
             </div>
             <div className="absolute top-2 right-2 w-3 h-3 bg-white border-2 border-black flex items-center justify-center">
                <div className="w-1 h-1 bg-black"></div>
             </div>
             {/* Mouth */}
             <div className="absolute bottom-2 left-4 w-6 h-2 bg-black"></div>
             {/* Horns */}
             <div className="absolute -top-3 left-1 w-2 h-3 bg-white border-2 border-black"></div>
             <div className="absolute -top-3 right-1 w-2 h-3 bg-white border-2 border-black"></div>
          </div>
          {/* Legs */}
          <div className="flex gap-2 -mt-1 z-[-1]">
             <div className={`w-4 h-6 bg-green-700 border-4 border-black ${gameState === "playing" ? "animate-[ogre-walk_0.4s_infinite]" : ""}`}></div>
             <div className={`w-4 h-6 bg-green-700 border-4 border-black ${gameState === "playing" ? "animate-[ogre-walk_0.4s_infinite_0.2s]" : ""}`}></div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
