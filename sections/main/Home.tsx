"use client";

import React from "react";
import TelegramCTA from "@/components/TelegramCTA";
import Featured from "../other/Featured";
import Hero from "./Hero/Hero";
import PricingBanner from "../other/HorizontalPricing";
import FreePlanBanner from "../other/PricingBanner";
import TickerTape from "../other/TradingView";
import LogoMarquee from "../other/Marquee";
import { images } from "@/data/marquee";
import GoldIndicatorAbout from "../other/About";
import ProductShowcase from "./Showcase";
import OfficialMembershipPlans from "@/components/OfficialMembershipPlans";

function Home() {
  return (
    <div className="space-y-20 pb-20">
      {/* HERO SECTION */}
      <Hero />
      <OfficialMembershipPlans />
      {/* <FreePlanBanner /> */}
      {/* <PricingBanner /> */}
      <div className="">
      <LogoMarquee 
      logos={images}
      />
      <TickerTape />
      </div>
      <ProductShowcase />
      <GoldIndicatorAbout />
      {/* <Pricing /> */}
      <Featured />

      {/* TELEGRAM SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <TelegramCTA variant="banner" />
      </section>
    </div>
  );
}

export default Home;
