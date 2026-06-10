"use client";

import React, { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";

export function GameAnimation() {
  const controls = useAnimation();
  const [isShaking, setIsShaking] = useState(false);

  // Define the looping sequence
  useEffect(() => {
    let isMounted = true;

    const runSequence = async () => {
      while (isMounted) {
        // Reset positions
        setIsShaking(false);
        await controls.start("reset", { duration: 0 });

        // Phase 1: Ogre runs in
        controls.start("run");

        // Monsters spawn and move left
        controls.start("obstacleMove");

        // Phase 2: Jump over Snake
        await new Promise(r => setTimeout(r, 1000));
        await controls.start("jump", { duration: 0.6, ease: "easeInOut" });
        controls.start("run"); // back to running

        // Phase 3: Jump over Grey Monster
        await new Promise(r => setTimeout(r, 1200));
        await controls.start("jump", { duration: 0.6, ease: "easeInOut" });
        controls.start("run");

        // Phase 4: Crash into Spam Filter (Black Monster)
        await new Promise(r => setTimeout(r, 1500));
        setIsShaking(true);
        await controls.start("crash", { duration: 0.2 });
        
        // Wait a bit on game over screen
        await new Promise(r => setTimeout(r, 2000));
      }
    };

    runSequence();

    return () => {
      isMounted = false;
      controls.stop();
    };
  }, [controls]);

  // Framer motion variants
  const ogreVariants: any = {
    reset: { x: -100, y: 0, rotate: 0 },
    run: { 
      x: 150, 
      y: [0, -10, 0], 
      transition: { 
        x: { duration: 4.3, ease: "linear" },
        y: { duration: 0.3, repeat: Infinity, ease: "linear" } 
      } 
    },
    jump: {
      x: "+=80",
      y: [-20, -120, -20],
      transition: { duration: 0.6, ease: "easeInOut", times: [0, 0.5, 1] }
    },
    crash: {
      x: "+=20",
      y: 0,
      rotate: -90,
      transition: { duration: 0.2 }
    }
  };

  const mailVariants: any = {
    reset: { x: -70, y: -40, opacity: 1, rotate: 0 },
    run: {
      x: 180,
      y: [-40, -50, -40],
      transition: {
        x: { duration: 4.3, ease: "linear" },
        y: { duration: 0.3, repeat: Infinity, ease: "linear" }
      }
    },
    jump: {
      x: "+=80",
      y: [-60, -160, -60],
      transition: { duration: 0.6, ease: "easeInOut", times: [0, 0.5, 1] }
    },
    crash: {
      x: "+=100",
      y: -100,
      rotate: 360,
      opacity: 0,
      transition: { duration: 1, ease: "easeOut" }
    }
  };

  const snakeVariants: any = {
    reset: { x: 800, opacity: 1 },
    obstacleMove: {
      x: -200,
      transition: { duration: 3.5, ease: "linear", delay: 0.5 }
    }
  };

  const greyVariants: any = {
    reset: { x: 800, opacity: 1 },
    obstacleMove: {
      x: -200,
      transition: { duration: 3.5, ease: "linear", delay: 1.7 }
    }
  };

  const spamVariants: any = {
    reset: { x: 800, opacity: 1, scale: 1 },
    obstacleMove: {
      x: 400, // Stops in the middle
      scale: [1, 1.2, 1],
      transition: {
        x: { duration: 2, ease: "easeOut", delay: 2.3 },
        scale: { duration: 0.5, repeat: Infinity, delay: 4.3 } // pulses after stopping
      }
    }
  };

  // Background speed lines
  const speedLineVariants: any = {
    animate: {
      x: ["100%", "-100%"],
      transition: { duration: 1.5, repeat: Infinity, ease: "linear" }
    }
  };

  return (
    <div 
      className={`relative w-full max-w-4xl mx-auto h-[350px] bg-black border-4 border-primary shadow-[0_0_30px_rgba(21,128,61,0.4)] overflow-hidden retro ${isShaking ? 'animate-[shake_0.2s_ease-in-out_infinite]' : ''}`}
    >
      {/* Background Grid & Scanlines for Premium Feel */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#15803d1a_1px,transparent_1px),linear-gradient(to_bottom,#15803d1a_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px] pointer-events-none" />

      {/* Speed lines */}
      <motion.div variants={speedLineVariants} animate="animate" className="absolute top-[100px] left-0 right-0 h-[2px] bg-primary/20 w-1/3" />
      <motion.div variants={speedLineVariants} animate="animate" className="absolute top-[150px] left-0 right-0 h-[2px] bg-primary/20 w-1/2" style={{ animationDelay: '0.5s' }} />
      <motion.div variants={speedLineVariants} animate="animate" className="absolute top-[220px] left-0 right-0 h-[2px] bg-primary/20 w-1/4" style={{ animationDelay: '1s' }} />

      {/* Ground Line */}
      <div className="absolute bottom-[40px] left-0 right-0 h-[4px] bg-primary shadow-[0_0_10px_#15803d]"></div>

      {/* Game World Container */}
      <div className="absolute inset-0" style={{ transform: "translateY(50px)" }}>
        
        {/* Ogre Player */}
        <motion.div 
          className="absolute z-30"
          style={{ bottom: 90 }}
          variants={ogreVariants}
          initial="reset"
          animate={controls}
        >
          <img src="/ogre.png" alt="Ogre" className="w-24 h-24 object-contain pixelated drop-shadow-[0_0_8px_rgba(21,128,61,0.8)]" />
        </motion.div>

        {/* Mail Follower */}
        <motion.div 
          className="absolute z-40"
          style={{ bottom: 130 }}
          variants={mailVariants}
          initial="reset"
          animate={controls}
        >
          <img src="/mail.png" alt="Mail" className="w-12 h-12 object-contain pixelated drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]" />
        </motion.div>

        {/* Snake Obstacle */}
        <motion.div 
          className="absolute z-20"
          style={{ bottom: 90 }}
          variants={snakeVariants}
          initial="reset"
          animate={controls}
        >
          <img src="/snake.jpg" alt="Snake" className="w-16 h-16 object-contain pixelated mix-blend-screen" />
        </motion.div>

        {/* Grey Monster Obstacle */}
        <motion.div 
          className="absolute z-20"
          style={{ bottom: 90 }}
          variants={greyVariants}
          initial="reset"
          animate={controls}
        >
          <img src="/grey-monster.jpg" alt="Grey Monster" className="w-20 h-20 object-contain pixelated mix-blend-screen" />
        </motion.div>

        {/* Spam Filter (Black Monster) */}
        <motion.div 
          className="absolute z-20 flex flex-col items-center"
          style={{ bottom: 90 }}
          variants={spamVariants}
          initial="reset"
          animate={controls}
        >
          <div className="text-red-500 font-bold text-2xl mb-2 animate-pulse drop-shadow-[0_0_10px_rgba(255,0,0,1)]">SPAM FILTER</div>
          <img src="/black-monster.jpg" alt="Spam Monster" className="w-32 h-32 object-contain pixelated mix-blend-screen drop-shadow-[0_0_20px_rgba(255,0,0,0.5)]" />
        </motion.div>

      </div>

      {/* Game Over Screen Overlay */}
      {isShaking && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/40 z-50 pointer-events-none">
          <h2 className="text-red-500 text-6xl font-bold animate-pulse drop-shadow-[0_0_20px_rgba(255,0,0,1)] tracking-widest">BLOCKED</h2>
        </div>
      )}

      {/* Global shake animation style */}
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px) translateY(-5px); }
          50% { transform: translateX(10px) translateY(5px); }
          75% { transform: translateX(-10px) translateY(5px); }
        }
      `}} />
    </div>
  );
}
