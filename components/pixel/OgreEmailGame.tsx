"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { PixelButton } from "./PixelButton";
import ogreRunImg from "@/assets/sprites/ogre-run.png";
import ogreFallImg from "@/assets/sprites/ogre-fall.png";
import envelopeImg from "@/assets/sprites/envelope.png";
import spamWallImg from "@/assets/sprites/spam-wall.png";
import blacklistGateImg from "@/assets/sprites/blacklist-gate.png";
import cloudImg from "@/assets/sprites/cloud.png";

const ogreRunUrl = ogreRunImg.src;
const ogreFallUrl = ogreFallImg.src;
const envelopeUrl = envelopeImg.src;
const spamWallUrl = spamWallImg.src;
const blacklistGateUrl = blacklistGateImg.src;
const cloudUrl = cloudImg.src;

type Obstacle = { id: number; x: number; type: "spam" | "blacklist" };
type Phase = "intro" | "countdown" | "playing" | "paused" | "over";

const GROUND_Y = 56;
const OGRE_W = 84;
const OGRE_H = 96;
const JUMP_V = 14;
const GRAVITY = 0.7;
const BASE_SPEED = 6;
const MAX_HEALTH = 100;
const HIT_DAMAGE = 34;

const pixelImg: React.CSSProperties = {
  imageRendering: "pixelated",
  WebkitFontSmoothing: "none",
};

export function OgreEmailGame() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(MAX_HEALTH);
  const [ogreY, setOgreY] = useState(0);
  const [frame, setFrame] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);

  const vyRef = useRef(0);
  const jumpingRef = useRef(false);
  const speedRef = useRef(BASE_SPEED);
  const nextSpawnRef = useRef(80);
  const tickRef = useRef(0);
  const idRef = useRef(0);
  const widthRef = useRef(800);
  const ogreYRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const healthRef = useRef(MAX_HEALTH);
  const invulnRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { ogreYRef.current = ogreY; }, [ogreY]);
  useEffect(() => { obstaclesRef.current = obstacles; }, [obstacles]);
  useEffect(() => { healthRef.current = health; }, [health]);

  const reset = useCallback(() => {
    setObstacles([]);
    setScore(0);
    setHealth(MAX_HEALTH);
    setOgreY(0);
    vyRef.current = 0;
    jumpingRef.current = false;
    speedRef.current = BASE_SPEED;
    nextSpawnRef.current = 80;
    tickRef.current = 0;
    invulnRef.current = 0;
  }, []);

  const startGame = useCallback(() => {
    reset();
    setPhase("countdown");
    setCountdown(3);
  }, [reset]);

  const togglePause = useCallback(() => {
    setPhase((p) => (p === "playing" ? "paused" : p === "paused" ? "playing" : p));
  }, []);

  const jump = useCallback(() => {
    if (jumpingRef.current) return;
    vyRef.current = JUMP_V;
    jumpingRef.current = true;
  }, []);

  useEffect(() => {
    const u = () => { if (containerRef.current) widthRef.current = containerRef.current.clientWidth; };
    u(); window.addEventListener("resize", u);
    return () => window.removeEventListener("resize", u);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (e.code === "KeyP" || e.code === "Escape") {
        e.preventDefault();
        togglePause();
        return;
      }
      if (e.code !== "Space" && e.code !== "ArrowUp" && e.code !== "Enter") return;
      e.preventDefault();
      if (phase === "intro" || phase === "over") startGame();
      else if (phase === "playing") jump();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, jump, startGame, togglePause]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) { setPhase("playing"); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    const loop = () => {
      tickRef.current += 1;
      if (invulnRef.current > 0) invulnRef.current -= 1;

      if (tickRef.current % 6 === 0) setFrame((f) => (f + 1) % 2);

      vyRef.current -= GRAVITY;
      setOgreY((y) => {
        const ny = Math.max(0, y + vyRef.current);
        if (ny === 0) { vyRef.current = 0; jumpingRef.current = false; }
        return ny;
      });

      nextSpawnRef.current -= 1;
      if (nextSpawnRef.current <= 0) {
        idRef.current += 1;
        setObstacles((obs) => [
          ...obs,
          { id: idRef.current, x: widthRef.current + 20, type: Math.random() > 0.5 ? "spam" : "blacklist" },
        ]);
        nextSpawnRef.current = 75 + Math.floor(Math.random() * 90);
      }

      setObstacles((obs) =>
        obs
          .map((o) => ({ ...o, x: o.x - speedRef.current }))
          .filter((o) => {
            if (o.x < -100) { setScore((s) => s + 1); return false; }
            return true;
          }),
      );

      const ogreLeft = 80;
      const ogreRight = ogreLeft + OGRE_W - 20;
      const ogreBottom = ogreYRef.current;
      let hit = false;
      for (const o of obstaclesRef.current) {
        const oLeft = o.x + 8;
        const oRight = o.x + (o.type === "spam" ? 60 : 52);
        const oHeight = o.type === "spam" ? 72 : 92;
        if (ogreRight > oLeft && ogreLeft < oRight && ogreBottom < oHeight - 8) {
          hit = true; break;
        }
      }
      if (hit && invulnRef.current === 0) {
        invulnRef.current = 45;
        const next = healthRef.current - HIT_DAMAGE;
        setHealth(Math.max(0, next));
        if (next <= 0) { setPhase("over"); return; }
      }

      if (tickRef.current % 600 === 0) speedRef.current += 0.5;

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    if (phase !== "over") return;
    const t = setTimeout(startGame, 2800);
    return () => clearTimeout(t);
  }, [phase, startGame]);

  const healthPct = (health / MAX_HEALTH) * 100;
  const healthColor = healthPct > 60 ? "#22c55e" : healthPct > 30 ? "#facc15" : "#ef4444";

  const ogreSrc = phase === "over" ? ogreFallUrl : ogreRunUrl;
  const ogreFlashing = invulnRef.current > 0 && tickRef.current % 6 < 3;
  const runBob = phase === "playing" && ogreY === 0 ? (frame === 0 ? 0 : -3) : 0;

  return (
    <div
      ref={containerRef}
      onClick={() => {
        if (phase === "intro" || phase === "over") startGame();
        else if (phase === "playing") jump();
      }}
      className="pixel-border-lg scanlines relative w-full h-[340px] md:h-[400px] overflow-hidden cursor-pointer select-none"
      style={{
        background: "#0a0f0a",
        backgroundImage:
          "repeating-linear-gradient(0deg, #0a0f0a 0, #0a0f0a 18px, #0d140d 18px, #0d140d 19px)",
        boxShadow: "inset 0 0 60px rgba(34,197,94,0.15), 8px 8px 0 0 var(--color-ink)",
      }}
    >
      {/* TOP STATUS BAR */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-ink border-b-4 border-crt-green px-3 py-2 flex items-center gap-3 font-pixel text-[9px] text-crt-green">
        <span className="whitespace-nowrap">EMAIL HEALTH</span>
        <div className="flex-1 h-3 bg-[#0a0f0a] border-2 border-crt-green relative overflow-hidden">
          <div
            className="h-full transition-[width,background] duration-200"
            style={{ width: `${healthPct}%`, background: healthColor }}
          />
          <div className="absolute inset-0 flex">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex-1 border-r border-[#0a0f0a] last:border-r-0" />
            ))}
          </div>
        </div>
        <span className="whitespace-nowrap">SCORE {String(score).padStart(4, "0")}</span>
        {(phase === "playing" || phase === "paused") && (
          <button
            onClick={(e) => { e.stopPropagation(); togglePause(); }}
            className="ml-2 px-2 py-0.5 border-2 border-crt-green text-crt-green hover:bg-crt-green hover:text-ink transition-colors whitespace-nowrap"
            aria-label={phase === "paused" ? "Resume" : "Pause"}
          >
            {phase === "paused" ? "▶ PLAY" : "‖ PAUSE"}
          </button>
        )}
      </div>

      {/* clouds */}
      <img src={cloudUrl} alt="" style={pixelImg} className="absolute top-12 left-[10%] w-16 opacity-70 animate-pixel-float" />
      <img src={cloudUrl} alt="" style={{ ...pixelImg, animationDelay: "0.6s" }} className="absolute top-20 left-[55%] w-12 opacity-60 animate-pixel-float" />
      <img src={cloudUrl} alt="" style={{ ...pixelImg, animationDelay: "1.1s" }} className="absolute top-14 left-[80%] w-14 opacity-70 animate-pixel-float" />

      {/* ground line */}
      <div
        className="absolute left-0 right-0 z-0"
        style={{
          bottom: GROUND_Y - 6,
          height: 6,
          background: "#22c55e",
          boxShadow: "0 -2px 0 #15803d, 0 8px 0 #0d140d",
        }}
      />
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: GROUND_Y - 18,
          height: 12,
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0, transparent 14px, #22c55e 14px, #22c55e 18px)",
          opacity: 0.4,
        }}
      />

      {/* Envelope above ogre */}
      {(phase === "playing" || phase === "paused") && (
        <img
          src={envelopeUrl}
          alt=""
          style={{
            ...pixelImg,
            left: 80 + 20,
            bottom: GROUND_Y + ogreY + OGRE_H - 10 + runBob,
            opacity: ogreFlashing ? 0.4 : 1,
            width: 44,
          }}
          className="absolute z-10"
        />
      )}

      {/* Ogre */}
      <img
        src={ogreSrc}
        alt="Ogre"
        style={{
          ...pixelImg,
          left: 80,
          bottom: GROUND_Y + ogreY + runBob,
          width: OGRE_W,
          height: OGRE_H,
          opacity: ogreFlashing ? 0.35 : 1,
        }}
        className="absolute z-10"
      />

      {/* Obstacles */}
      {obstacles.map((o) => (
        <img
          key={o.id}
          src={o.type === "spam" ? spamWallUrl : blacklistGateUrl}
          alt=""
          style={{
            ...pixelImg,
            left: o.x,
            bottom: GROUND_Y,
            width: o.type === "spam" ? 64 : 56,
            height: o.type === "spam" ? 72 : 96,
          }}
          className="absolute z-10"
        />
      ))}

      {/* INTRO overlay */}
      {phase === "intro" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center px-4" style={{ background: "rgba(10,15,10,0.85)" }}>
          <div className="font-pixel text-xs md:text-base text-crt-green mb-3 animate-pulse">{">_ ./inbox-runner --start"}</div>
          <div className="font-pixel text-base md:text-2xl text-paper mb-2">SPAM OGRE</div>
          <div className="font-pixel text-[10px] md:text-xs text-gold mb-6">DELIVER OR DIE</div>
          <div className="font-mono-pixel text-lg md:text-xl text-crt-green mb-6">
            <span className="animate-blink">▮</span> JUMP THE SPAM. PROTECT YOUR HEALTH.
          </div>
          <PixelButton variant="accent" size="lg" onClick={(e) => { e.stopPropagation(); startGame(); }}>
            PRESS START
          </PixelButton>
          <div className="font-pixel text-[8px] text-paper/60 mt-4">SPACE / TAP TO JUMP · P TO PAUSE</div>
        </div>
      )}

      {/* COUNTDOWN overlay */}
      {phase === "countdown" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: "rgba(10,15,10,0.6)" }}>
          <div className="font-pixel text-6xl md:text-8xl text-crt-green animate-pulse">
            {countdown > 0 ? countdown : "GO!"}
          </div>
        </div>
      )}

      {/* PAUSE overlay */}
      {phase === "paused" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center" style={{ background: "rgba(10,15,10,0.75)" }}>
          <div className="font-pixel text-2xl md:text-4xl text-crt-green mb-4">‖ PAUSED</div>
          <div className="font-mono-pixel text-lg text-paper/80 mb-6">press P or click resume</div>
          <PixelButton variant="accent" size="md" onClick={(e) => { e.stopPropagation(); togglePause(); }}>
            ▶ RESUME
          </PixelButton>
        </div>
      )}

      {/* GAME OVER overlay */}
      {phase === "over" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: "rgba(239,68,68,0.25)" }}>
          <div className="bg-ink pixel-border-lg p-6 text-center max-w-xs" style={{ borderColor: "#ef4444" }}>
            <div className="font-pixel text-sm text-hazard mb-2">SYSTEM FAILURE</div>
            <div className="font-pixel text-[10px] text-crt-green mb-4">DELIVERY REJECTED</div>
            <div className="font-mono-pixel text-xl text-paper mb-1">SCORE: {score}</div>
            <div className="font-mono-pixel text-sm text-crt-green mb-4">restarting...</div>
            <PixelButton variant="accent" size="sm" onClick={(e) => { e.stopPropagation(); startGame(); }}>
              INSERT COIN
            </PixelButton>
          </div>
        </div>
      )}
    </div>
  );
}
