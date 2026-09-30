"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useScroll from "@/lib/hooks/use-scroll";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import CustomUserButton from "@/components/CustomUserButton";
import { LayoutDashboard, Sun, Moon, ChevronDown, Briefcase, FileText, TrendingUp, User, CheckCircle, Bookmark, MessageCircle, HelpCircle, Star, Menu, X, Euro, Coffee } from "lucide-react";
import WalletModal from "@/components/WalletModal";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useUnreadMessages } from "@/lib/hooks/useUnreadMessages";
import { useUnverifiedMissions } from "@/lib/hooks/useUnverifiedMissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// import WalletConnect from "@/components/WalletConnect";

const SUPPORT_URL = process.env.NEXT_PUBLIC_SUPPORT_URL || "https://buymeacoffee.com/mcfly21";

export default function NavBar() {
  const scrolled = useScroll(50);
  const pathname = usePathname();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { userId, isLoaded } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const { unverifiedCount } = useUnverifiedMissions();
  const [acceptedContractsCount, setAcceptedContractsCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    // Only check system preference after component mounts
    if (typeof window !== 'undefined') {
      try {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setTheme(systemTheme);
      } catch (error) {
        console.error("Error setting theme:", error);
        setTheme('light'); // fallback
      }
    }
    
    // Force mounted to true after a short delay as fallback
    const timeout = setTimeout(() => {
      setMounted(true);
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme, mounted]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Fetch user role for navigation only when Clerk is loaded and userId is available
  useEffect(() => {
    if (!isLoaded) {
      return; // Wait for Clerk to load
    }
    if (!userId) {
      setUserRole(null);
      setRoleError(null);
      return;
    }
    setRoleError(null);
    setUserRole(null); // Reset before fetching
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/me');
        if (response.ok) {
          const userData = await response.json();
          setUserData(userData);
          setUserRole(userData.role);
          setIsAdmin(userData.isAdmin || false);
        } else if (response.status === 404) {
          // User exists in Clerk but not in our database - they need to complete onboarding
          setRoleError('Please complete your profile setup');
        } else {
          setRoleError('Could not fetch user role');
        }
      } catch (error) {
        console.error("Navbar: Error fetching user role:", error);
        setRoleError('Could not fetch user role');
      }
    };
    fetchUserRole();
    
    // Force role fetch to complete after 3 seconds if still null
    const timeout = setTimeout(() => {
      if (userRole === null) {
        // Try to fetch again
        fetchUserRole();
      }
    }, 3000);
    
    return () => {
      clearTimeout(timeout);
    };
  }, [userId, isLoaded, pathname]);
  
  // Separate useEffect for fetching accepted contracts count (only for clients)
  useEffect(() => {
    if (!userId || userRole !== 'client') {
      setAcceptedContractsCount(0);
      return;
    }
    
    const fetchAcceptedContractsCount = async () => {
      try {
        const contractsResponse = await fetch('/api/contracts', {
          cache: 'no-store' // Ensure fresh data
        });
        if (contractsResponse.ok) {
          const contracts = await contractsResponse.json();
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          const unseenCount = Array.isArray(contracts)
            ? contracts.filter((c: any) => {
                const contractDate = new Date(c.createdAt);
                return c.isActive && 
                       contractDate >= sevenDaysAgo && 
                       !c.seenByClientAt;
              }).length
            : 0;
          
          setAcceptedContractsCount(unseenCount);
        }
      } catch (error) {
        console.error("Navbar: Error fetching accepted contracts count:", error);
        setAcceptedContractsCount(0);
      }
    };
    
    fetchAcceptedContractsCount();
    
    // Listen for contracts being marked as seen (from /my-missions page)
    const handleContractsMarkedAsSeen = () => {
      console.log('[Navbar] Contracts marked as seen event received, refreshing count...');
      // Small delay to ensure database is updated
      setTimeout(() => {
        fetchAcceptedContractsCount();
      }, 200);
    };
    window.addEventListener('contractsMarkedAsSeen', handleContractsMarkedAsSeen);
    
    // Also refresh when page becomes visible (user returns from /my-missions)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[Navbar] Page visible, refreshing count...');
        setTimeout(() => {
          fetchAcceptedContractsCount();
        }, 200);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Refresh accepted contracts count every 30 seconds for clients
    const interval = setInterval(fetchAcceptedContractsCount, 30000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('contractsMarkedAsSeen', handleContractsMarkedAsSeen);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, userRole]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Don't render theme-dependent content until mounted
  if (!mounted) {
    return null; // Don't render anything until mounted
  }

  const renderMobileMenu = () => {
    if (!mobileMenuOpen) return null;

    return (
      <div className="fixed inset-0 z-50 lg:hidden">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={toggleMobileMenu}
        />
        
        {/* Mobile menu */}
        <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
              <button
                onClick={toggleMobileMenu}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Menu content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Show different content based on authentication status */}
              <SignedIn>
                {/* Dashboard */}
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={toggleMobileMenu}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span>Dashboard</span>
                </Link>
                {/* Wallet Connect */}
                <div className="p-3">
                  <WalletModal />
                </div>
              </SignedIn>

              <SignedOut>
                {/* Authentication buttons */}
                <div className="space-y-2">
                  <Link
                    href="/sign-up"
                    className="flex items-center justify-center gap-3 p-3 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                    onClick={toggleMobileMenu}
                  >
                    <span>Sign Up</span>
                  </Link>
                  <Link
                    href="/sign-in"
                    className="flex items-center justify-center gap-3 p-3 rounded-lg border border-gray-900 dark:border-white text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={toggleMobileMenu}
                  >
                    <span>Sign In</span>
                  </Link>
                </div>
              </SignedOut>

              {/* Role-specific navigation - only for authenticated users */}
              <SignedIn>
                {userRole === 'freelance' && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 px-3">Builder Tools</h3>
                    <div className="space-y-2">
                      <Link href="/contracts" className="flex items-center gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                        <FileText className="h-5 w-5" />
                        <span>Contracts</span>
                      </Link>
                      <Link href="/portfolios" className="flex items-center gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                        <FileText className="h-5 w-5" />
                        <span>Portfolio</span>
                      </Link>
                      <Link href="/skills" className="flex items-center gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                        <TrendingUp className="h-5 w-5" />
                        <span>Skills</span>
                      </Link>
                      {userData?.id && (
                        <Link href={`/builders/${userData.id}`} className="flex items-center gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                          <User className="h-5 w-5" />
                          <span>About</span>
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 px-3">Management</h3>
                    <div className="space-y-2">
                      <Link href="/offers" className="flex items-center gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                        <CheckCircle className="h-5 w-5" />
                        <span>Offers</span>
                      </Link>
                      <Link href="/messages" className="flex items-center justify-between p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                        <div className="flex items-center gap-3">
                          <MessageCircle className="h-5 w-5" />
                          <span>Messages</span>
                        </div>
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                      <Link href="/reviews" className="flex items-center gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                        <Star className="h-5 w-5" />
                        <span>Reviews</span>
                      </Link>
                    </div>
                  </div>
                </>
              )}

              {userRole === 'client' && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 px-3">Client Tools</h3>
                    <div className="space-y-2">
                      <Link href="/missions?status=IN_PROGRESS" className="flex items-center justify-between gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                        <div className="flex items-center gap-3">
                          <Briefcase className="h-5 w-5" />
                          <span>Mission Progress</span>
                        </div>
                        {userRole === 'client' && acceptedContractsCount > 0 && (
                          <span className="bg-blue-600 text-white text-xs font-semibold rounded-full px-2 py-1 min-w-[20px] text-center">
                            {acceptedContractsCount}
                          </span>
                        )}
                      </Link>
                      <Link href="/builders" className="flex items-center gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                        <User className="h-5 w-5" />
                        <span>Browse Builders</span>
                      </Link>
                      <Link href="/contracts" className="flex items-center gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                        <FileText className="h-5 w-5" />
                        <span>Contracts</span>
                      </Link>
                      <Link href="/client-applications" className="flex items-center gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                        <CheckCircle className="h-5 w-5" />
                        <span>Mission Offers</span>
                      </Link>
                      <Link href="/payments" className="flex items-center gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                        <Euro className="h-5 w-5" />
                        <span>Payments</span>
                      </Link>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 px-3">Management</h3>
                    <div className="space-y-2">
                      <Link href="/messages" className="flex items-center justify-between p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                        <div className="flex items-center gap-3">
                          <MessageCircle className="h-5 w-5" />
                          <span>Messages</span>
                        </div>
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                      <Link href="/reviews" className="flex items-center gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                        <Star className="h-5 w-5" />
                        <span>Reviews</span>
                      </Link>
                      {userData?.id && (
                        <Link href={`/clients/${userData.id}`} className="flex items-center gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                          <User className="h-5 w-5" />
                          <span>About</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </>
              )}

              {userRole === 'admin' && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 px-3">Admin Tools</h3>
                    <div className="space-y-2">
                      <Link href="/dashboard" className="flex items-center gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                        <LayoutDashboard className="h-5 w-5" />
                        <span>Admin Dashboard</span>
                      </Link>
                      <Link href="/admin/users" className="flex items-center gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                        <User className="h-5 w-5" />
                        <span>Manage Users</span>
                      </Link>
                      <Link href="/admin/verify-missions" className="flex items-center justify-between p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                        <div className="flex items-center gap-3">
                        <Briefcase className="h-5 w-5" />
                        <span>Verify Missions</span>
                        </div>
                        {isAdmin && unverifiedCount > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                            {unverifiedCount > 99 ? '99+' : unverifiedCount}
                          </span>
                        )}
                      </Link>
                      <Link href="/admin/payments" className="flex items-center gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                        <Euro className="h-5 w-5" />
                        <span>Payment Management</span>
                      </Link>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 px-3">General</h3>
                    <div className="space-y-2">
                      <Link href="/contracts" className="flex items-center gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                        <FileText className="h-5 w-5" />
                        <span>Contracts</span>
                      </Link>
                      <Link href="/messages" className="flex items-center justify-between p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                        <div className="flex items-center gap-3">
                          <MessageCircle className="h-5 w-5" />
                          <span>Messages</span>
                        </div>
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                    </div>
                  </div>
                </>
              )}
              </SignedIn>

              {/* Help & Support - Available to all users */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <Link href="/help" className="flex items-center gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                  <HelpCircle className="h-5 w-5" />
                  <span>Help</span>
                </Link>
                <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={toggleMobileMenu}>
                  <Coffee className="h-5 w-5" />
                  <span>Support</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 flex w-full justify-center glass-nav z-50 transition-all clerk-navbar`}
        aria-label="Main navigation"
      >
        <div className="mx-5 flex h-16 w-full max-w-screen-xl items-center justify-between">
          <Link href="/" className="flex items-center font-display text-2xl text-gray-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg hover:opacity-80 transition-opacity">
            <Image
              src="/logo.svg"
              alt="Peak Logo"
              width="36"
              height="36"
              className="mr-3"
              priority
            />
            <span className="font-bold tracking-tight">Peak</span>
          </Link>
          
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Mobile menu button - only show on mobile */}
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden rounded-full border border-gray-900 dark:border-white bg-transparent p-2 text-gray-900 dark:text-white hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors"
              aria-label="Open mobile menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop navigation - hide on mobile */}
            <div className="hidden lg:flex items-center gap-4">
              <WalletModal />
              <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="rounded-full border border-gray-900 dark:border-white bg-transparent px-4 py-1.5 text-sm text-gray-900 dark:text-white transition-colors hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 flex items-center gap-2">
                <Coffee className="h-4 w-4" />
                Support
              </a>
              <button
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="rounded-full border border-gray-900 dark:border-white bg-transparent p-2 text-gray-900 dark:text-white hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors"
                style={{ minWidth: 40, minHeight: 40 }}
              >
                {mounted && theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <SignedOut>
                <Link
                  href="/sign-up"
                  className="rounded-full border border-gray-900 dark:border-white bg-transparent px-4 py-1.5 text-sm text-gray-900 dark:text-white transition-colors hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  Sign Up
                </Link>
                <Link
                  href="/sign-in"
                  className="rounded-full border border-gray-900 dark:border-white bg-transparent px-4 py-1.5 text-sm text-gray-900 dark:text-white transition-colors hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  Sign In
                </Link>
              </SignedOut>
              <SignedIn>
                {!isLoaded || userId === undefined ? (
                  <div className="text-gray-500 dark:text-gray-400 px-4 py-1.5 text-sm animate-pulse">Loading menu…</div>
                ) : roleError ? (
                  <div className="flex items-center gap-2">
                    <div className="text-amber-600 dark:text-amber-400 px-4 py-1.5 text-sm">
                      {roleError}
                    </div>
                    {roleError === 'Please complete your profile setup' && (
                      <Link
                        href="/onboarding"
                        className="rounded-full border border-amber-600 dark:border-amber-400 bg-transparent px-3 py-1 text-xs text-amber-600 dark:text-amber-400 transition-colors hover:bg-amber-600 hover:text-white dark:hover:bg-amber-400 dark:hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                      >
                        Setup
                      </Link>
                    )}
                  </div>
                ) : userRole === null ? (
                  <div className="text-gray-500 dark:text-gray-400 px-4 py-1.5 text-sm animate-pulse">
                    Loading menu… 
                    <button 
                      onClick={() => {
                        console.log("Force refresh clicked");
                        window.location.reload();
                      }}
                      className="ml-2 text-blue-500 hover:text-blue-700"
                    >
                      (Click to refresh)
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* Dashboard - Available to all authenticated users */}
                    <Button
                      variant="outline"
                      asChild
                      className="rounded-full border border-gray-900 dark:border-white bg-transparent px-4 py-1.5 text-sm text-gray-900 dark:text-white transition-colors hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                    >
                      <Link href="/dashboard" className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Link>
                    </Button>

                    {/* Role-specific Profile Dropdowns */}
                    {userRole === 'freelance' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="rounded-full border border-gray-900 dark:border-white bg-transparent px-4 py-1.5 text-sm text-gray-900 dark:text-white transition-colors hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
                            <User className="h-4 w-4 mr-2" />
                            Builder Profile
                            <ChevronDown className="h-4 w-4 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href="/contracts" className="flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              Contracts
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/missions?status=IN_PROGRESS" className="flex items-center">
                              <Briefcase className="h-4 w-4 mr-2" />
                              Mission Progress
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href="/portfolios" className="flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              Portfolio
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/skills" className="flex items-center">
                              <TrendingUp className="h-4 w-4 mr-2" />
                              Skills
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/builders/${userData?.id}`} className="flex items-center">
                              <User className="h-4 w-4 mr-2" />
                              About
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href="/offers" className="flex items-center">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Offers
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/messages" className="flex items-center justify-between">
                              <div className="flex items-center">
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Messages
                              </div>
                              {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                                  {unreadCount}
                                </span>
                              )}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/reviews" className="flex items-center">
                              <Star className="h-4 w-4 mr-2" />
                              Reviews
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href="/help" className="flex items-center">
                              <HelpCircle className="h-4 w-4 mr-2" />
                              Help
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {userRole === 'client' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="rounded-full border border-gray-900 dark:border-white bg-transparent px-4 py-1.5 text-sm text-gray-900 dark:text-white transition-colors hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
                            <User className="h-4 w-4 mr-2" />
                            Client Profile
                            <ChevronDown className="h-4 w-4 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href="/missions?status=IN_PROGRESS" className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Briefcase className="h-4 w-4 mr-2" />
                                Mission Progress
                              </div>
                              {userRole === 'client' && acceptedContractsCount > 0 && (
                                <span className="bg-blue-600 text-white text-xs font-semibold rounded-full px-2 py-1 min-w-[20px] text-center ml-auto">
                                  {acceptedContractsCount}
                                </span>
                              )}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/builders" className="flex items-center">
                              <User className="h-4 w-4 mr-2" />
                              Browse Builders
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/contracts" className="flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              Contracts
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/client-applications" className="flex items-center">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mission Offers
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/messages" className="flex items-center justify-between">
                              <div className="flex items-center">
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Messages
                              </div>
                              {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                                  {unreadCount}
                                </span>
                              )}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/reviews" className="flex items-center">
                              <Star className="h-4 w-4 mr-2" />
                              Reviews
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/clients/${userData?.id}`} className="flex items-center">
                              <User className="h-4 w-4 mr-2" />
                              About
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href="/help" className="flex items-center">
                              <HelpCircle className="h-4 w-4 mr-2" />
                              Help
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                                        {userRole === 'admin' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="rounded-full border border-gray-900 dark:border-white bg-transparent px-4 py-1.5 text-sm text-gray-900 dark:text-white transition-colors hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
                            <User className="h-4 w-4 mr-2" />
                            Admin Panel
                            <ChevronDown className="h-4 w-4 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href="/dashboard" className="flex items-center">
                              <LayoutDashboard className="h-4 w-4 mr-2" />
                              Dashboard
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/admin/users" className="flex items-center">
                              <User className="h-4 w-4 mr-2" />
                              Manage Users
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/admin/categories" className="flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              Manage Categories
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/admin/verify-missions" className="flex items-center justify-between w-full">
                              <div className="flex items-center">
                              <Briefcase className="h-4 w-4 mr-2" />
                              Verify Missions
                              </div>
                              {isAdmin && unverifiedCount > 0 && (
                                <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center ml-2">
                                  {unverifiedCount > 99 ? '99+' : unverifiedCount}
                                </span>
                              )}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href="/contracts" className="flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              Contracts
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/messages" className="flex items-center justify-between">
                              <div className="flex items-center">
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Messages
                              </div>
                              {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                                  {unreadCount}
                                </span>
                              )}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href="/help" className="flex items-center">
                              <HelpCircle className="h-4 w-4 mr-2" />
                              Help
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )}
              </SignedIn>
            </div>

            {/* Mobile: Theme toggle and UserButton */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="rounded-full border border-gray-900 dark:border-white bg-transparent p-2 text-gray-900 dark:text-white hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors"
                style={{ minWidth: 40, minHeight: 40 }}
              >
                {mounted && theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <CustomUserButton />
            </div>

            {/* Desktop: UserButton */}
            <div className="hidden lg:block">
              <CustomUserButton />
            </div>
          </div>
        </div>
      </nav>
      
      {/* Mobile menu overlay */}
      {renderMobileMenu()}
    </>
  );
}
