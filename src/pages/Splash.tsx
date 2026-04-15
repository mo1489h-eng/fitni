import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isOnboardingComplete } from "@/lib/onboarding";
import { hideNativeSplashAfterPaint } from "@/lib/native-splash";
import { SPLASH_SESSION_KEY } from "@/lib/splash-session";

const BG = "#050505";
const PRIMARY = "#22C55E";

const MIN_VISIBLE_MS = 1600;
const MAX_AUTH_WAIT_MS = 6000;
const EXIT_FADE_MS = 420;

/**
 * Premium cold-start splash: native layer hands off to this screen, then routing.
 */
const Splash = () => {
  const navigate = useNavigate();
  const { loading } = useAuth();
  const reduceMotion = useReducedMotion() ?? false;
  const [exiting, setExiting] = useState(false);
  const mountedAt = useRef(Date.now());
  const exitOnce = useRef(false);
  const nativeHidden = useRef(false);

  const runExit = useCallback(() => {
    if (exitOnce.current) return;
    exitOnce.current = true;
    setExiting(true);
    window.setTimeout(() => {
      try {
        sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
      } catch {
        /* private mode */
      }
      const next = isOnboardingComplete() ? "/" : "/onboarding";
      navigate(next, { replace: true });
    }, EXIT_FADE_MS);
  }, [navigate]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SPLASH_SESSION_KEY) === "1") {
        navigate("/", { replace: true });
      }
    } catch {
      /* ignore */
    }
  }, [navigate]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (nativeHidden.current) return;
        nativeHidden.current = true;
        void hideNativeSplashAfterPaint();
      });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const [authTimeout, setAuthTimeout] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setAuthTimeout(true), MAX_AUTH_WAIT_MS);
    return () => window.clearTimeout(t);
  }, []);

  const authReady = !loading || authTimeout;

  useEffect(() => {
    if (!authReady || exiting) return;
    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - mountedAt.current));
    const t = window.setTimeout(() => runExit(), remaining);
    return () => window.clearTimeout(t);
  }, [authReady, exiting, runExit]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        backgroundColor: BG,
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
      dir="rtl"
      initial={{ opacity: 0 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: exiting ? EXIT_FADE_MS / 1000 : 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex flex-col items-center px-8">
        <motion.div
          className="relative mb-8 flex h-[88px] w-[88px] items-center justify-center rounded-[22px]"
          style={{
            background: `${PRIMARY}14`,
            boxShadow: `0 0 60px ${PRIMARY}28, 0 12px 40px rgba(0,0,0,0.45)`,
          }}
          initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {!reduceMotion && !exiting ? (
            <motion.span
              className="pointer-events-none absolute inset-0 rounded-[22px]"
              style={{ boxShadow: `0 0 48px ${PRIMARY}35` }}
              animate={{ opacity: [0.45, 0.9, 0.45] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden
            />
          ) : null}
          <TrendingUp className="relative z-[1] h-11 w-11" style={{ color: PRIMARY }} strokeWidth={1.5} aria-hidden />
        </motion.div>

        <motion.h1
          className="text-center text-[26px] font-black tracking-tight text-white sm:text-3xl"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          CoachBase
        </motion.h1>
        <motion.p
          className="mt-3 max-w-xs text-center text-sm font-medium text-white/55"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduceMotion ? 0 : 0.35, duration: 0.4 }}
        >
          Train Smarter. Grow Faster.
        </motion.p>
      </div>
    </motion.div>
  );
};

export default Splash;
