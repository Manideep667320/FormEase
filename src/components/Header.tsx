import { useState } from "react";
import { Link } from "react-router-dom";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import UserProfile from "@/components/UserProfile";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LoginForm } from "@/components/LoginForm";
import { RegisterForm } from "@/components/RegisterForm";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
} from "@/components/ui/resizable-navbar";

const Header = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { currentUser } = useAuth();

  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  const handleOpenRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const handleOpenLogin = () => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  const navItems = [
    { name: "Features", link: "#features" },
    { name: "Benefits", link: "#benefits" },
    { name: "Testimonials", link: "#testimonials" },
    { name: "Pricing", link: "#pricing" },
  ];

  return (
    <>
      <Navbar className="top-0">
        {/* Desktop Resizable Navbar */}
        <NavBody>
          {/* Logo */}
          <Link to="/" className="relative z-20 flex items-center space-x-2.5 px-1 py-1">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center border border-white/30 shadow-xs"
              style={{
                background: "url('/logo.jpeg')",
                backgroundSize: "cover",
              }}
            />
            <span
              className={cn(
                "font-bold text-xl transition-colors duration-200",
                isScrolled ? "text-primary hover:text-orange-600" : "text-white drop-shadow-xs"
              )}
            >
              FormEase
            </span>
          </Link>

          {/* Desktop Center Links */}
          <NavItems items={navItems} visible={isScrolled} />

          {/* Desktop Right Actions */}
          <div className="relative z-20 flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <UserProfile />
                <Link to="/main">
                  <Button className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs px-3.5 py-1.5 h-8 rounded-full shadow-xs">
                    Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  className={cn(
                    "hidden md:inline-flex font-semibold text-sm px-3.5 h-9 rounded-full transition-colors",
                    isScrolled
                      ? "text-slate-800 hover:text-primary hover:bg-slate-100"
                      : "text-white hover:text-white hover:bg-white/15 drop-shadow-xs"
                  )}
                  onClick={() => setShowLoginModal(true)}
                >
                  Log in
                </Button>
                <Button
                  className="bg-accent hover:bg-accent/90 text-white font-semibold text-sm px-4 h-9 rounded-full shadow-sm transition-transform hover:-translate-y-0.5"
                  onClick={() => setShowRegisterModal(true)}
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </NavBody>

        {/* Mobile Resizable Navbar */}
        <MobileNav>
          <MobileNavHeader>
            <Link to="/" className="flex items-center space-x-2">
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center border border-white/30 shadow-xs"
                style={{
                  background: "url('/logo.jpeg')",
                  backgroundSize: "cover",
                }}
              />
              <span
                className={cn(
                  "font-bold text-lg transition-colors",
                  isScrolled ? "text-primary" : "text-white drop-shadow-xs"
                )}
              >
                FormEase
              </span>
            </Link>

            <div className="flex items-center space-x-2">
              {!currentUser && (
                <Button
                  size="sm"
                  className="bg-accent hover:bg-accent/90 text-white font-semibold text-xs px-3 h-8 rounded-full"
                  onClick={() => setShowRegisterModal(true)}
                >
                  Start
                </Button>
              )}
              <MobileNavToggle
                isOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                visible={isScrolled}
              />
            </div>
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            <div className="flex flex-col gap-4 w-full">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.link}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-base font-semibold text-slate-800 hover:text-primary transition-colors py-1"
                >
                  {item.name}
                </a>
              ))}
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5 w-full">
                {currentUser ? (
                  <div className="flex items-center justify-between">
                    <UserProfile />
                    <Link to="/main" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button className="bg-primary hover:bg-primary/90 text-white font-semibold text-sm">
                        Access Dashboard
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full text-slate-800 font-semibold"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setShowLoginModal(true);
                      }}
                    >
                      Log in
                    </Button>
                    <Link to="/main" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold">
                        Access Dashboard
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>

      {/* Login Dialog */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md">
          <LoginForm onSuccess={() => setShowLoginModal(false)} />
          <div className="mt-4 text-center text-sm">
            Don't have an account?{" "}
            <Button variant="link" className="p-0 text-primary font-semibold" onClick={handleOpenRegister}>
              Register
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Register Dialog */}
      <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
        <DialogContent className="sm:max-w-md">
          <RegisterForm
            onSuccess={() => setShowRegisterModal(false)}
            onRegistrationComplete={handleOpenLogin}
          />
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Button variant="link" className="p-0 text-primary font-semibold" onClick={handleOpenLogin}>
              Log in
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;
