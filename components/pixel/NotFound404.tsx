"use client";
import Link from "next/link";
import ogre from "@/assets/sprites/ogre-404.png";
import { PixelButton } from "./PixelButton";

export function NotFound404() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-xl">
        <h1 className="font-pixel text-6xl md:text-8xl text-hazard text-pixel-shadow mb-6">404</h1>
        <img src={ogre.src} alt="Angry ogre" className="mx-auto w-48 h-48 mb-6 animate-pixel-float" />
        <h2 className="font-pixel text-lg md:text-xl mb-4">You made the Ogre angry!</h2>
        <p className="font-mono-pixel text-lg mb-8 text-muted-foreground">
          This room doesn't exist. Turn back before it's too late.
        </p>
        <Link href="/">
          <PixelButton variant="primary" size="lg">Return Home</PixelButton>
        </Link>
      </div>
    </div>
  );
}
