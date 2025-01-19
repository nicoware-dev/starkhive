"use client";

import { useEffect, useState, useRef } from "react";

// Import all logos
import ai16z from "../assets/logos-ext/ai16z.svg";
import apibara from "../assets/logos-ext/apibara.svg";
import argent from "../assets/logos-ext/argent.svg";
import avnu from "../assets/logos-ext/avnu.svg";
import braavos from "../assets/logos-ext/braavos.svg";
import coingecho from "../assets/logos-ext/coingecho.svg";
import defillama from "../assets/logos-ext/defillama.svg";
import ekubo from "../assets/logos-ext/ekubo.svg";
import endur from "../assets/logos-ext/endur.svg";
import nethermind from "../assets/logos-ext/nethermind.svg";
import starknet from "../assets/logos-ext/starknet.svg";
import starknetid from "../assets/logos-ext/starknetid.svg";
import unruggable from "../assets/logos-ext/unruggable.svg";
import vesu from "../assets/logos-ext/vesu.svg";
import voyager from "../assets/logos-ext/voyager.svg";

const logos = [
  { id: "starknet", src: starknet, alt: "Starknet" },
  { id: "argent", src: argent, alt: "Argent Wallet" },
  { id: "braavos", src: braavos, alt: "Braavos Wallet" },
  { id: "starknetid", src: starknetid, alt: "Starknet ID" },
  { id: "avnu", src: avnu, alt: "Avnu DEX" },
  { id: "ekubo", src: ekubo, alt: "Ekubo DEX" },
  { id: "defillama", src: defillama, alt: "DefiLlama" },
  { id: "nethermind", src: nethermind, alt: "Nethermind" },
  { id: "apibara", src: apibara, alt: "Apibara" },
  { id: "endur", src: endur, alt: "Endur" },
  { id: "unruggable", src: unruggable, alt: "Unruggable Labs" },
  { id: "vesu", src: vesu, alt: "Vesu" },
  { id: "voyager", src: voyager, alt: "Voyager" },
  { id: "ai16z", src: ai16z, alt: "AI16Z" },
  { id: "coingecho", src: coingecho, alt: "Coingecho" },
];

export function LogoCarousel() {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const scrollContainer = containerRef.current;
    const totalWidth = scrollContainer.scrollWidth / 2;
    let animationFrameId: number;

    const scroll = () => {
      if (!isHovered) {
        scrollPositionRef.current += 0.5;
        if (scrollPositionRef.current >= totalWidth) {
          scrollPositionRef.current = 0;
        }
        scrollContainer.style.transform = `translateX(-${scrollPositionRef.current}px)`;
      }
      animationFrameId = requestAnimationFrame(scroll);
    };

    scroll();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isHovered]);

  return (
    <div className="w-full overflow-hidden bg-background/80 backdrop-blur-sm border-y border-white/[0.08] py-12">
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          ref={containerRef}
          className="flex space-x-12 whitespace-nowrap"
          style={{
            willChange: 'transform',
          }}
        >
          {/* First set of logos */}
          {logos.map((logo) => (
            <div
              key={`first-${logo.id}`}
              className="inline-block w-32 h-16 flex-shrink-0"
            >
              <img
                src={logo.src}
                alt={logo.alt}
                className="w-full h-full object-contain filter brightness-75 hover:brightness-100 transition-all duration-300"
                title={logo.alt}
              />
            </div>
          ))}
          {/* Duplicate set for seamless loop */}
          {logos.map((logo) => (
            <div
              key={`second-${logo.id}`}
              className="inline-block w-32 h-16 flex-shrink-0"
            >
              <img
                src={logo.src}
                alt={logo.alt}
                className="w-full h-full object-contain filter brightness-75 hover:brightness-100 transition-all duration-300"
                title={logo.alt}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
