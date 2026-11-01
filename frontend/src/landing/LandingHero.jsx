import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { ArrowDown, ArrowUpLeft, Check, Sparkles } from "lucide-react";

const MotionDiv = motion.div;
const MotionSpan = motion.span;
const MotionA = motion.a;

export default function LandingHero({ content }) {
  const sceneRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 80, damping: 22 });
  const springY = useSpring(pointerY, { stiffness: 80, damping: 22 });
  const titleWords = content.title;

  function handlePointerMove(event) {
    if (reduceMotion || !sceneRef.current) return;
    const bounds = sceneRef.current.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left - bounds.width / 2) / 28);
    pointerY.set((event.clientY - bounds.top - bounds.height / 2) / 32);
  }

  function resetPointer() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <section
      className="mp-hero"
      id="hero"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      <div className="mp-hero-inner">
        <MotionDiv
          className="mp-hero-copy"
          initial={reduceMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.2, 0.75, 0.25, 1] }}
        >
          <div className="mp-eyebrow">
            <span className="mp-eyebrow-dot" aria-hidden="true" />
            <span>{content.eyebrow}</span>
          </div>

          <h1 className="mp-hero-title">
            {titleWords.map((word, index) => (
              <MotionSpan
                className="mp-title-word"
                key={`${word}-${index}`}
                initial={reduceMotion ? false : { opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: reduceMotion ? 0 : 0.18 + index * 0.09,
                  duration: 0.58,
                  ease: [0.18, 0.72, 0.25, 1],
                }}
              >
                {word}
              </MotionSpan>
            ))}
          </h1>

          <p className="mp-hero-description">{content.description}</p>

          <div className="mp-hero-actions">
            <MotionA
              className="mp-button-primary"
              href="#features"
              whileHover={reduceMotion ? undefined : { y: -3, scale: 1.015 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            >
              <span>{content.primaryAction}</span>
              <ArrowUpLeft className="mp-directional-arrow" size={18} />
            </MotionA>
            <a className="mp-button-text" href="#journey">
              <span className="mp-play-icon" aria-hidden="true">
                <ArrowDown size={15} />
              </span>
              <span>{content.secondaryAction}</span>
            </a>
          </div>

          <div className="mp-hero-proof">
            <div className="mp-proof-stars" aria-hidden="true">
              <Sparkles size={15} />
              <Sparkles size={15} />
              <Sparkles size={15} />
            </div>
            <span>{content.proof}</span>
          </div>
        </MotionDiv>

        <div className="mp-hero-visual" ref={sceneRef} aria-label={content.mock.table}>
          <MotionDiv
            className="mp-scene-glow"
            style={reduceMotion ? undefined : { x: springX, y: springY }}
            aria-hidden="true"
          />
          <MotionDiv
            className="mp-device"
            initial={reduceMotion ? false : { opacity: 0, y: 38, rotate: 2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.2, 0.75, 0.25, 1] }}
          >
            <div className="mp-device-top">
              <span className="mp-device-brand">{content.brand}</span>
              <span className="mp-device-top-mark" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </div>
            <div className="mp-menu-screen">
              <div className="mp-menu-heading">
                <span className="mp-menu-kicker">{content.mock.subtitle}</span>
                <h2>{content.mock.table}</h2>
              </div>
              <div className="mp-dish-art" aria-hidden="true">
                <div className="mp-dish-shadow" />
                <div className="mp-dish-plate">
                  <div className="mp-dish-rim">
                    <div className="mp-risotto">
                      <span className="mp-risotto-herb" />
                      <span className="mp-risotto-herb" />
                      <span className="mp-risotto-mushroom" />
                      <span className="mp-risotto-mushroom" />
                      <span className="mp-risotto-mushroom" />
                      <span className="mp-risotto-sprinkle" />
                    </div>
                  </div>
                </div>
                <span className="mp-art-orbit mp-art-orbit--one" />
                <span className="mp-art-orbit mp-art-orbit--two" />
              </div>
              <div className="mp-dish-info">
                <div>
                  <h3>{content.mock.dish}</h3>
                  <p>{content.mock.dishDetail}</p>
                </div>
                <div className="mp-dish-price">
                  <span>{content.mock.price}</span>
                  <small>{content.mock.currency}</small>
                </div>
              </div>
              <button className="mp-mock-order" type="button">
                <span>{content.mock.add}</span>
                <ArrowUpLeft className="mp-directional-arrow" size={15} />
              </button>
            </div>
            <div className="mp-device-home" aria-hidden="true" />
          </MotionDiv>

          <MotionDiv
            className="mp-float-card mp-order-card"
            initial={reduceMotion ? false : { opacity: 0, x: 18, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.65, delay: 0.8 }}
            style={reduceMotion ? undefined : { x: springX, y: springY }}
          >
            <span className="mp-order-check" aria-hidden="true">
              <Check size={14} />
            </span>
            <span className="mp-order-copy">
              <strong>{content.mock.order}</strong>
              <small>{content.mock.orderDetail}</small>
              <span>{content.mock.status}</span>
            </span>
            <span className="mp-order-pulse" aria-hidden="true" />
          </MotionDiv>

          <MotionDiv
            className="mp-float-card mp-qr-card"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 1 }}
            style={reduceMotion ? undefined : { x: springX, y: springY }}
          >
            <div className="mp-qr-art" aria-hidden="true">
              <QrPattern />
            </div>
            <span>{content.mock.qr}</span>
          </MotionDiv>

          <MotionDiv
            className="mp-float-card mp-rating-card"
            animate={reduceMotion ? undefined : { y: [0, -7, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="mp-rating-spark" aria-hidden="true">
              <Sparkles size={16} />
            </span>
            <span>{content.mock.rating}</span>
          </MotionDiv>
        </div>
      </div>
      <div className="mp-hero-bottom" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

function QrPattern() {
  return (
    <svg viewBox="0 0 42 42" role="presentation">
      <path d="M2 2h13v13H2zM5 5v7h7V5zM27 2h13v13H27zM30 5v7h7V5zM2 27h13v13H2zM5 30v7h7v-7z" />
      <path d="M19 2h4v4h-4zM19 9h4v4h-4zM18 18h5v5h-5zM26 18h4v4h-4zM34 19h6v4h-6zM19 27h4v4h-4zM26 26h6v6h-6zM35 28h5v4h-5zM18 35h5v5h-5zM28 36h4v4h-4zM35 36h5v4h-5z" />
    </svg>
  );
}
