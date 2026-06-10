"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { OgreSprite, MailSprite, SnakeSprite, GreyMonsterSprite, BlackMonsterSprite } from "./pixel-sprites";

// Constants
const GRAVITY = 0.6;
const JUMP_FORCE = -10;
const GAME_SPEED = 5;
const GROUND_Y = 200;

interface GameObject {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'snake' | 'grey' | 'black' | 'coin' | 'spam';
  passed?: boolean;
}

export function PlayableMiniGame() {
  const [gameState, setGameState] = useState<"autoplay" | "playing" | "gameover">("autoplay");
  const [health, setHealth] = useState(100);
  const [score, setScore] = useState(0);

  // Physics state (refs for synchronous loop updates)
  const ogreY = useRef(GROUND_Y);
  const ogreVelocity = useRef(0);
  const objects = useRef<GameObject[]>([]);
  const gameLoopRef = useRef<number>(0);
  const frameCount = useRef(0);

  // Jump function
  const jump = useCallback(() => {
    if (gameState !== "playing") return;
    if (ogreY.current >= GROUND_Y) {
      ogreVelocity.current = JUMP_FORCE;
    }
  }, [gameState]);

  // Handle Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (gameState === "playing") jump();
        if (gameState === "gameover" || gameState === "autoplay") startGame();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, jump]);

  const startGame = () => {
    setGameState("playing");
    setHealth(100);
    setScore(0);
    ogreY.current = GROUND_Y;
    ogreVelocity.current = 0;
    objects.current = [];
    frameCount.current = 0;
  };

  // Game Loop
  useEffect(() => {
    if (gameState !== "playing") return;

    let isMounted = true;

    const loop = () => {
      if (!isMounted) return;

      frameCount.current += 1;

      // Apply Gravity
      ogreVelocity.current += GRAVITY;
      ogreY.current += ogreVelocity.current;

      // Ground Collision
      if (ogreY.current > GROUND_Y) {
        ogreY.current = GROUND_Y;
        ogreVelocity.current = 0;
      }

      // Spawning logic
      if (frameCount.current % 120 === 0) {
        // Spawn monster
        const types: ('snake' | 'grey' | 'black')[] = ['snake', 'grey', 'black'];
        objects.current.push({
          id: Date.now(),
          x: 800,
          y: GROUND_Y,
          width: 32,
          height: 32,
          type: types[Math.floor(Math.random() * types.length)]
        });
      } else if (frameCount.current % 180 === 0) {
        // Spawn coin
        objects.current.push({
          id: Date.now(),
          x: 800,
          y: GROUND_Y - 80 - Math.random() * 40,
          width: 24,
          height: 24,
          type: 'coin'
        });
      } else if (frameCount.current % 600 === 0) {
        // Spawn SPAM filter
        objects.current.push({
          id: Date.now(),
          x: 800,
          y: GROUND_Y - 20,
          width: 40,
          height: 60,
          type: 'spam'
        });
      }

      // Update positions and check collisions
      const ogreRect = { x: 100, y: ogreY.current, width: 32, height: 32 };
      
      let currentHealth = health;

      objects.current = objects.current.filter(obj => {
        obj.x -= GAME_SPEED;

        // Collision Check (AABB)
        const objRect = { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
        
        const isCollision = (
          ogreRect.x < objRect.x + objRect.width &&
          ogreRect.x + ogreRect.width > objRect.x &&
          ogreRect.y < objRect.y + objRect.height &&
          ogreRect.height + ogreRect.y > objRect.y
        );

        if (isCollision && !obj.passed) {
          obj.passed = true;
          
          if (obj.type === 'coin') {
            setScore(s => s + 10);
            setHealth(h => Math.min(100, h + 10));
            return false; // Remove coin
          } else if (obj.type === 'spam') {
            // SPAM Filter Logic
            if (currentHealth < 50) {
              setHealth(0);
              setGameState("gameover");
            } else {
              setScore(s => s + 50);
            }
          } else {
            // Monster
            currentHealth -= 20;
            setHealth(currentHealth);
            if (currentHealth <= 0) {
              setGameState("gameover");
            }
          }
        }

        // Remove offscreen objects
        return obj.x > -50;
      });

      if (currentHealth > 0) {
        // Force re-render to update UI positions
        // This is a bit of a hack but works for a simple React game loop
        setHealth(h => h); 
        gameLoopRef.current = requestAnimationFrame(loop);
      }
    };

    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      isMounted = false;
      cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, health]);

  // Autoplay animation effect
  useEffect(() => {
    if (gameState === "autoplay") {
      const timer = setTimeout(() => {
        setGameState("gameover"); // Autoplay finishes in Game Over
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  return (
    <div 
      className="relative w-full max-w-3xl mx-auto h-[300px] bg-black border-2 border-primary shadow-[4px_4px_0_0_#15803d] overflow-hidden retro cursor-pointer select-none"
      onClick={() => {
        if (gameState !== "playing") startGame();
        else jump();
      }}
    >
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between z-20 text-primary">
        <div>
          <span>EMAIL HEALTH:</span>
          <div className="w-32 h-4 border-2 border-primary bg-black inline-block ml-2 align-middle overflow-hidden">
            <div 
              className="h-full bg-primary transition-all" 
              style={{ width: `${Math.max(0, health)}%` }}
            />
          </div>
        </div>
        <div>SCORE: {score.toString().padStart(4, '0')}</div>
      </div>

      {/* Game Over / Autoplay screen */}
      {gameState === "autoplay" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/50">
          <h2 className="text-primary animate-pulse text-2xl">AUTOPLAYING...</h2>
          <p className="text-primary mt-4">WATCHING OGRE DELIVER EMAIL</p>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/80">
          <h2 className="text-red-500 font-bold text-4xl tracking-widest mb-4">BLOCKED</h2>
          <p className="text-primary animate-pulse">CLICK OR PRESS SPACE TO RETRY</p>
        </div>
      )}

      {/* Game World */}
      <div className="absolute inset-0 z-10">
        
        {/* Ground Line */}
        <div className="absolute bottom-[68px] left-0 right-0 h-0 border-b-2 border-dashed border-primary/50"></div>

        {/* Player (Ogre) */}
        <div 
          className="absolute"
          style={{ 
            left: 100, 
            top: gameState === "autoplay" ? GROUND_Y : ogreY.current,
            transition: gameState === 'autoplay' ? 'all 0.5s' : 'none'
          }}
        >
          <OgreSprite scale={3} className={gameState === "playing" && ogreY.current === GROUND_Y ? "animate-bounce" : ""} />
          
          {/* Envelope Follower */}
          <div className="absolute -top-6 left-2 animate-bounce">
             <MailSprite scale={2} />
          </div>
        </div>

        {/* Objects (only rendered during gameplay) */}
        {gameState === "playing" && objects.current.map(obj => (
          <div 
            key={obj.id} 
            className="absolute"
            style={{ left: obj.x, top: obj.y }}
          >
            {obj.type === 'snake' && <SnakeSprite scale={3} />}
            {obj.type === 'grey' && <GreyMonsterSprite scale={3} />}
            {obj.type === 'black' && <BlackMonsterSprite scale={3} />}
            {obj.type === 'coin' && (
               <div className="w-6 h-6 rounded-full bg-yellow-400 border-2 border-white flex items-center justify-center animate-spin">
                 <span className="text-[10px] text-black font-bold">$</span>
               </div>
            )}
            {obj.type === 'spam' && (
              <div className="text-red-500 text-6xl font-bold animate-pulse">
                @
              </div>
            )}
          </div>
        ))}
        
        {/* Autoplay Objects */}
        {gameState === "autoplay" && (
           <div className="absolute top-[GROUND_Y] left-[300px] text-red-500 text-6xl font-bold animate-pulse">
             @
           </div>
        )}

      </div>
    </div>
  );
}
