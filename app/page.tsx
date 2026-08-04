import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Plans from "@/components/Plans";
import Menu from "@/components/Menu";
import WhyChooseUs from "@/components/WhyChooseUs";
import Reviews from "@/components/Reviews";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

export default function Home() {
  return (
    <>
      <Navbar />

      <Hero />

      <Plans />

      <Menu />

      <WhyChooseUs />

      <Reviews />

      <Contact />

      <Footer />

      <WhatsAppButton />
    </>
  );
}