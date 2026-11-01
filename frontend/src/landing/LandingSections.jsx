import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  Check,
  ChevronDown,
  CircleCheck,
  Clock3,
  Command,
  CornerDownLeft,
  Plus,
  QrCode,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const MotionSection = motion.section;
const MotionDiv = motion.div;
const MotionArticle = motion.article;

const reveal = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const transition = { duration: 0.7, ease: [0.2, 0.75, 0.25, 1] };

export default function LandingSections({ content, language }) {
  const story = content.story;

  return (
    <>
      <ProblemSection content={story.problem} language={language} />
      <FeaturesSection content={story.features} language={language} />
      <JourneySection content={story.journey} language={language} />
      <NumbersSection content={story.numbers} language={language} />
      <TestimonialsSection content={story.testimonials} language={language} />
      <PricingSection content={story.pricing} />
      <FaqSection content={story.faq} />
      <FinalSection content={story.finalCta} brand={content.brand} />
    </>
  );
}

function WordTitle({ words, className = "" }) {
  return (
    <h2 className={`mp-section-title ${className}`}>
      {words.map((word, index) => (
        <span className="mp-title-word" key={`${word}-${index}`}>
          {word}
        </span>
      ))}
    </h2>
  );
}

function SectionHeading({ eyebrow, title, description, centered = false }) {
  return (
    <div className={`mp-section-heading${centered ? " is-centered" : ""}`}>
      <span className="mp-section-eyebrow">
        <span className="mp-eyebrow-dot" aria-hidden="true" />
        {eyebrow}
      </span>
      <WordTitle words={title} />
      {description && <p className="mp-section-description">{description}</p>}
    </div>
  );
}

function ProblemSection({ content, language }) {
  const sectionRef = useRefElement();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const chaosY = useTransform(scrollYProgress, [0, 0.55], [26, -16]);
  const calmY = useTransform(scrollYProgress, [0.35, 1], [36, -14]);
  const reduceMotion = useReducedMotion();
  const directional = language === "ar" ? -1 : 1;

  return (
    <MotionSection
      className="mp-problem-section"
      id="problem"
      ref={sectionRef}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={reveal}
      transition={transition}
    >
      <div className="mp-section-shell">
        <SectionHeading
          eyebrow={content.eyebrow}
          title={content.title}
          description={content.description}
          centered
        />
        <div className="mp-contrast-stage">
          <MotionArticle
            className="mp-contrast-card mp-chaos-card"
            style={reduceMotion ? undefined : { y: chaosY }}
            initial={reduceMotion ? false : { opacity: 0, x: -directional * 32, rotate: -3 }}
            whileInView={{ opacity: 1, x: 0, rotate: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={transition}
          >
            <div className="mp-contrast-topline">
              <span className="mp-window-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>{content.chaosLabel}</span>
            </div>
            <div className="mp-chaos-scene" aria-hidden="true">
              <span className="mp-chaos-thread mp-chaos-thread--one" />
              <span className="mp-chaos-thread mp-chaos-thread--two" />
              <span className="mp-chaos-thread mp-chaos-thread--three" />
              <div className="mp-chaos-note mp-chaos-note--menu">
                <Command size={14} />
                <span>{content.looseNote}</span>
              </div>
              <div className="mp-chaos-note mp-chaos-note--order">
                <CornerDownLeft size={14} />
                <span>{content.looseOrder}</span>
              </div>
              <div className="mp-chaos-note mp-chaos-note--bell">
                <span className="mp-chaos-ping" />
                <span>{content.looseBell}</span>
              </div>
              <div className="mp-chaos-note mp-chaos-note--receipt">
                <Clock3 size={14} />
                <span>{content.looseReceipt}</span>
              </div>
              <span className="mp-chaos-cross mp-chaos-cross--one" />
              <span className="mp-chaos-cross mp-chaos-cross--two" />
            </div>
            <span className="mp-contrast-caption">{content.chaosLabel}</span>
          </MotionArticle>

          <div className="mp-contrast-switch" aria-hidden="true">
            <span />
            <ArrowLeft className="mp-contrast-arrow" size={18} />
            <span />
          </div>

          <MotionArticle
            className="mp-contrast-card mp-calm-card"
            style={reduceMotion ? undefined : { y: calmY }}
            initial={reduceMotion ? false : { opacity: 0, x: directional * 32, rotate: 3 }}
            whileInView={{ opacity: 1, x: 0, rotate: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ ...transition, delay: 0.12 }}
          >
            <div className="mp-contrast-topline">
              <span className="mp-calm-icon" aria-hidden="true">
                <CircleCheck size={14} />
              </span>
              <span>{content.calmEyebrow}</span>
            </div>
            <div className="mp-calm-scene">
              <div className="mp-calm-orbit mp-calm-orbit--one" aria-hidden="true" />
              <div className="mp-calm-orbit mp-calm-orbit--two" aria-hidden="true" />
              <div className="mp-calm-center">
                <div className="mp-calm-check" aria-hidden="true">
                  <Check size={27} />
                </div>
                <span>{content.calmStatus}</span>
              </div>
              <span className="mp-calm-satellite mp-calm-satellite--one" aria-hidden="true">
                <QrCode size={17} />
              </span>
              <span className="mp-calm-satellite mp-calm-satellite--two" aria-hidden="true">
                <Check size={17} />
              </span>
              <span className="mp-calm-satellite mp-calm-satellite--three" aria-hidden="true">
                <TrendingUp size={17} />
              </span>
            </div>
            <div className="mp-calm-copy">
              <WordTitle words={content.calmTitle} />
              <p>{content.calmDescription}</p>
            </div>
            <span className="mp-contrast-caption">{content.calmLabel}</span>
          </MotionArticle>
        </div>
      </div>
    </MotionSection>
  );
}

function FeaturesSection({ content, language }) {
  const featureItems = [
    { tag: content.menuTag, title: content.menuTitle, description: content.menuDescription },
    { tag: content.orderTag, title: content.orderTitle, description: content.orderDescription },
    { tag: content.insightTag, title: content.insightTitle, description: content.insightDescription },
  ];

  return (
    <section className="mp-features-section" id="features">
      <div className="mp-section-shell">
        <SectionHeading
          eyebrow={content.eyebrow}
          title={content.title}
          description={content.description}
        />
        <div className="mp-feature-stack">
          {featureItems.map((feature, index) => (
            <FeatureScene
              key={feature.tag}
              feature={feature}
              index={index}
              content={content}
              language={language}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureScene({ feature, index, content, language }) {
  const reverse = index === 1;
  const directional = language === "ar" ? -1 : 1;

  return (
    <MotionArticle
      className={`mp-feature-row${reverse ? " is-reversed" : ""}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.24 }}
      variants={reveal}
      transition={transition}
    >
      <div className="mp-feature-copy">
        <span className="mp-feature-tag">{feature.tag}</span>
        <h3>{feature.title}</h3>
        <p>{feature.description}</p>
        <a className="mp-feature-link" href="#journey">
          <span>{content.menuAction}</span>
          {directional < 0 ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
        </a>
      </div>
      <div className={`mp-feature-stage mp-feature-stage--${index + 1}`}>
        {index === 0 && <MenuScene content={content} />}
        {index === 1 && <OrderScene content={content} />}
        {index === 2 && <InsightScene content={content} />}
      </div>
    </MotionArticle>
  );
}

function MenuScene({ content }) {
  return (
    <div className="mp-showcase-menu" aria-label={content.menuCategory}>
      <div className="mp-showcase-menu-top">
        <span className="mp-mini-brand">MP / MENU</span>
        <span className="mp-menu-open-dot" />
      </div>
      <span className="mp-showcase-kicker">{content.menuCategory}</span>
      <div className="mp-menu-illustration" aria-hidden="true">
        <div className="mp-menu-illustration-plate">
          <span className="mp-food-leaf" />
          <span className="mp-food-leaf" />
          <span className="mp-food-dot" />
          <span className="mp-food-dot" />
          <span className="mp-food-dot" />
          <span className="mp-food-ring" />
        </div>
        <span className="mp-menu-illustration-glow" />
      </div>
      <div className="mp-showcase-menu-list">
        {content.menuItems.map((item, index) => (
          <div className="mp-showcase-menu-item" key={item}>
            <span className={`mp-menu-item-mark mp-menu-item-mark--${index + 1}`} />
            <span>{item}</span>
            <Plus size={13} />
          </div>
        ))}
      </div>
      <span className="mp-menu-ribbon">{content.menuAction}</span>
    </div>
  );
}

function OrderScene({ content }) {
  return (
    <div className="mp-order-scene">
      <div className="mp-order-ambient" aria-hidden="true" />
      <div className="mp-ticket">
        <div className="mp-ticket-notch mp-ticket-notch--start" />
        <div className="mp-ticket-notch mp-ticket-notch--end" />
        <div className="mp-ticket-head">
          <span className="mp-ticket-number">{content.orderNumber}</span>
          <span className="mp-ticket-time">{content.orderTime}</span>
        </div>
        <span className="mp-ticket-table">{content.orderTable}</span>
        <div className="mp-ticket-rule" />
        {content.orderItems.map((item, index) => (
          <div className="mp-ticket-item" key={item}>
            <span className="mp-ticket-quantity">{index ? "1" : "2"}</span>
            <span>{item}</span>
            <Check size={13} />
          </div>
        ))}
        <div className="mp-ticket-rule is-dashed" />
        <div className="mp-ticket-status">
          <span className="mp-ticket-status-dot" />
          <span>{content.orderState}</span>
        </div>
      </div>
      <MotionDiv
        className="mp-order-orbit-mark"
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        aria-hidden="true"
      >
        <span />
      </MotionDiv>
    </div>
  );
}

function InsightScene({ content }) {
  return (
    <div className="mp-insight-scene">
      <div className="mp-insight-window">
        <div className="mp-insight-top">
          <div>
            <span>{content.insightHeading}</span>
            <strong>{content.insightPeriod}</strong>
          </div>
          <span className="mp-insight-spark" aria-hidden="true">
            <Sparkles size={16} />
          </span>
        </div>
        <div className="mp-insight-metrics">
          <div className="mp-insight-metric">
            <span>{content.insightRevenue}</span>
            <strong>{content.insightRevenueValue} <small>{content.insightCurrency}</small></strong>
          </div>
          <div className="mp-insight-metric">
            <span>{content.insightOrders}</span>
            <strong>128</strong>
          </div>
        </div>
        <div className="mp-chart">
          <div className="mp-chart-guide mp-chart-guide--one" />
          <div className="mp-chart-guide mp-chart-guide--two" />
          <svg viewBox="0 0 420 150" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="mpChartFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#FF9A3D" stopOpacity=".34" />
                <stop offset="100%" stopColor="#FF7A1A" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              className="mp-chart-area"
              d="M0 126 C35 120 40 95 76 101 S122 113 150 78 S198 99 225 66 S267 92 299 55 S340 66 367 34 S396 42 420 17 V150 H0Z"
            />
            <path
              className="mp-chart-line"
              d="M0 126 C35 120 40 95 76 101 S122 113 150 78 S198 99 225 66 S267 92 299 55 S340 66 367 34 S396 42 420 17"
            />
            <circle className="mp-chart-point" cx="367" cy="34" r="5" />
          </svg>
          <div className="mp-chart-labels">
            {content.insightBars.map((label) => <span key={label}>{label}</span>)}
          </div>
        </div>
        <span className="mp-insight-trend">
          <TrendingUp size={14} />
          {content.insightTrend}
        </span>
      </div>
      <span className="mp-insight-stamp" aria-hidden="true">
        <Sparkles size={17} />
      </span>
    </div>
  );
}

function JourneySection({ content, language }) {
  const sectionRef = useRefElement();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.8", "end 0.8"],
  });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const titleStart = language === "ar" ? 1 : -1;

  return (
    <section className="mp-journey-section" id="journey" ref={sectionRef}>
      <div className="mp-section-shell">
        <SectionHeading
          eyebrow={content.eyebrow}
          title={content.title}
          description={content.description}
        />
        <div className="mp-journey-rail">
          <MotionDiv className="mp-journey-progress" style={{ scaleY: lineScale }} />
          {content.steps.map((step, index) => (
            <MotionArticle
              className="mp-journey-step"
              key={step.number}
              initial={{ opacity: 0, x: titleStart * 28, y: 18 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ ...transition, delay: index * 0.11 }}
            >
              <span className="mp-journey-step-index">{step.number}</span>
              <div className="mp-journey-step-copy">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
              <StepVisual index={index} label={step.visual} />
            </MotionArticle>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepVisual({ index, label }) {
  return (
    <div className={`mp-step-visual mp-step-visual--${index + 1}`}>
      {index === 0 && (
        <div className="mp-step-menu-art" aria-hidden="true">
          <span />
          <span />
          <span />
          <i />
        </div>
      )}
      {index === 1 && (
        <div className="mp-step-qr-art" aria-hidden="true">
          <QrCode size={40} strokeWidth={1.5} />
        </div>
      )}
      {index === 2 && (
        <div className="mp-step-connected-art" aria-hidden="true">
          <span><Check size={14} /></span>
          <i />
          <span><TrendingUp size={14} /></span>
        </div>
      )}
      <span className="mp-step-visual-label">{label}</span>
    </div>
  );
}

function NumbersSection({ content, language }) {
  const numberWords = new Intl.NumberFormat(language);

  return (
    <section className="mp-numbers-section">
      <div className="mp-numbers-glow" aria-hidden="true" />
      <div className="mp-section-shell">
        <SectionHeading
          eyebrow={content.eyebrow}
          title={content.title}
          description={content.description}
          centered
        />
        <div className="mp-metrics-grid">
          {content.metrics.map((metric, index) => (
            <MetricCounter
              key={metric.label}
              metric={metric}
              formatter={numberWords}
              delay={index * 0.1}
            />
          ))}
        </div>
        <p className="mp-metrics-note">{content.note}</p>
      </div>
    </section>
  );
}

function MetricCounter({ metric, formatter, delay }) {
  const targetRef = useRefElement();
  const isInView = useInView(targetRef, { once: true, amount: 0.7 });
  const reduceMotion = useReducedMotion();
  const count = useCounterValue(metric.value, isInView, reduceMotion);

  return (
    <MotionArticle
      className="mp-metric-card"
      ref={targetRef}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.35 }}
      variants={reveal}
      transition={{ ...transition, delay }}
    >
      <span className="mp-metric-orbit" aria-hidden="true" />
      <strong className="mp-metric-value">
        <span>{metric.format === "compact" && count >= 1000
          ? `${formatter.format(count / 1000)}k`
          : formatter.format(count)}</span>
        <small>{metric.suffix}</small>
      </strong>
      <span className="mp-metric-label">{metric.label}</span>
    </MotionArticle>
  );
}

function useCounterValue(target, isInView, reduceMotion) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!isInView) return undefined;
    if (reduceMotion) {
      setValue(target);
      return undefined;
    }

    const controls = animate(0, target, {
      duration: 1.65,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (current) => setValue(Math.round(current)),
    });

    return () => controls.stop();
  }, [isInView, reduceMotion, target]);

  return value;
}

function TestimonialsSection({ content, language }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const current = content.quotes[activeIndex];
  const directional = language === "ar" ? -1 : 1;

  function move(direction) {
    setActiveIndex((index) => (index + direction + content.quotes.length) % content.quotes.length);
  }

  return (
    <section className="mp-testimonials-section" id="testimonials">
      <div className="mp-section-shell">
        <SectionHeading
          eyebrow={content.eyebrow}
          title={content.title}
          description={content.description}
          centered
        />
        <div className="mp-testimonial-stage">
          <div className="mp-testimonial-orbit mp-testimonial-orbit--one" aria-hidden="true" />
          <div className="mp-testimonial-orbit mp-testimonial-orbit--two" aria-hidden="true" />
          <div className="mp-testimonial-dots" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <MotionArticle
            className="mp-testimonial-card"
            key={current.name}
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={transition}
          >
            <span className="mp-testimonial-mark" aria-hidden="true">“</span>
            <span className="mp-testimonial-label">{content.label}</span>
            <blockquote>{current.quote}</blockquote>
            <div className="mp-testimonial-person">
              <span className="mp-person-avatar" aria-hidden="true">{current.initials}</span>
              <span>
                <strong>{current.name}</strong>
                <small>{current.role}</small>
              </span>
            </div>
          </MotionArticle>
          <div className="mp-testimonial-controls">
            <button type="button" onClick={() => move(-1)} aria-label={content.previous}>
              {directional < 0 ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
            </button>
            <span><strong>0{activeIndex + 1}</strong> / 0{content.quotes.length}</span>
            <button type="button" onClick={() => move(1)} aria-label={content.next}>
              {directional < 0 ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection({ content }) {
  return (
    <section className="mp-pricing-section" id="pricing">
      <div className="mp-section-shell">
        <SectionHeading
          eyebrow={content.eyebrow}
          title={content.title}
          description={content.description}
          centered
        />
        <div className="mp-pricing-grid">
          {content.plans.map((plan, index) => (
            <MotionArticle
              className={`mp-plan-card${index === 1 ? " is-featured" : ""}`}
              key={plan.name}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.24 }}
              variants={reveal}
              transition={{ ...transition, delay: index * 0.1 }}
              whileHover={{ y: -7 }}
            >
              {index === 1 && <span className="mp-plan-popular">{content.popular}</span>}
              <span className="mp-plan-index">0{index + 1}</span>
              <h3>{plan.name}</h3>
              <p className="mp-plan-description">{plan.description}</p>
              <div className="mp-plan-price">
                <strong>{plan.price}</strong>
                <span>{plan.period}</span>
              </div>
              <div className="mp-plan-rule" />
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={15} aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <a className={index === 1 ? "mp-plan-action is-primary" : "mp-plan-action"} href="#hero">
                <span>{content.action}</span>
                <ArrowUpLeft className="mp-directional-arrow" size={16} />
              </a>
            </MotionArticle>
          ))}
        </div>
        <p className="mp-pricing-footnote">{content.footnote}</p>
      </div>
    </section>
  );
}

function FaqSection({ content }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="mp-faq-section" id="faq">
      <div className="mp-section-shell mp-faq-layout">
        <SectionHeading eyebrow={content.eyebrow} title={content.title} />
        <div className="mp-faq-list">
          {content.items.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `mp-faq-answer-${index}`;

            return (
              <div className={`mp-faq-item${isOpen ? " is-open" : ""}`} key={item.question}>
                <button
                  type="button"
                  className="mp-faq-question"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                >
                  <span className="mp-faq-index">0{index + 1}</span>
                  <span>{item.question}</span>
                  <ChevronDown size={18} aria-hidden="true" />
                </button>
                <div className="mp-faq-answer" id={panelId} hidden={!isOpen}>
                  <p>{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalSection({ content, brand }) {
  return (
    <footer className="mp-footer" id="footer">
      <MotionSection
        className="mp-final-cta"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.32 }}
        variants={reveal}
        transition={transition}
      >
        <div className="mp-final-orbit mp-final-orbit--one" aria-hidden="true" />
        <div className="mp-final-orbit mp-final-orbit--two" aria-hidden="true" />
        <span className="mp-section-eyebrow">
          <Sparkles size={14} aria-hidden="true" />
          {content.eyebrow}
        </span>
        <WordTitle words={content.title} className="mp-final-title" />
        <p className="mp-final-description">{content.description}</p>
        <a className="mp-button-primary mp-final-action" href="#hero">
          <span>{content.action}</span>
          <ArrowUpLeft className="mp-directional-arrow" size={18} />
        </a>
        <span className="mp-final-note">
          <ArrowDown size={14} aria-hidden="true" />
          {content.note}
        </span>
      </MotionSection>
      <div className="mp-footer-bottom">
        <a className="mp-brand" href="#hero" aria-label={brand}>
          <span className="mp-brand-mark" aria-hidden="true">
            <Command size={17} />
          </span>
          <span>{brand}</span>
        </a>
        <span className="mp-footer-line">{content.footerLine}</span>
        <nav className="mp-footer-links" aria-label={content.footerLine}>
          {content.links.map((link, index) => (
            <a href={["#features", "#journey", "#pricing"][index]} key={link}>{link}</a>
          ))}
        </nav>
        <span className="mp-footer-copyright">{content.copyright}</span>
      </div>
    </footer>
  );
}

function useRefElement() {
  return useRef(null);
}
