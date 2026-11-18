
import MerchantDashboard from "./MerchantDashboard";
import AdminDashboard from "./AdminDashboard";
import SupportRequest from "./SupportRequest";
import Auth from "./Auth";

import { useEffect, useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate
} from "react-router-dom";

import { auth, db } from "./firebase";

import {
  onAuthStateChanged,
  reload,
  getIdToken
} from "firebase/auth";

import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";

import {
  ArrowRight,
  ShieldCheck,
  MessageCircle,
  CreditCard,
  Palette,
  Globe,
  Search,
  Settings,
  Package,
  Menu,
  X,
  Headphones,
  Clock,
  CheckCircle,
  Zap,
  BarChart3,
  ChevronRight,
  Lock
} from "lucide-react";

import "./App.css";

const ADMIN_EMAIL = "lunafromshopify.help@gmail.com";

const categories = [
  {
    name: "Payments & Checkout",
    icon: CreditCard,
    desc: "Payment problems, checkout errors and billing."
  },
  {
    name: "Store Design",
    icon: Palette,
    desc: "Themes, layouts and storefront appearance."
  },
  {
    name: "Store Configuration",
    icon: Settings,
    desc: "Settings, domains and store functionality."
  },
  {
    name: "Products & Inventory",
    icon: Package,
    desc: "Product listings, stock and collections."
  },
  {
    name: "SEO & Marketing",
    icon: BarChart3,
    desc: "Visibility, traffic and marketing support."
  },
  {
    name: "Apps & Integrations",
    icon: Zap,
    desc: "Third-party applications and integrations."
  },
  {
    name: "Account Restrictions",
    icon: Lock,
    desc: "Account access and restriction-related guidance."
  },
  {
    name: "Other Issues",
    icon: Globe,
    desc: "Anything else affecting your store."
  }
];

/* =========================================
   REUSABLE BRANDING
========================================= */

function Brand() {
  return (
    <div className="brand-group">
      <a href="/" className="brand">
        <span className="brand-icon">
          <Headphones size={23} />
        </span>

        <span>
          Merchant<span className="brand-green">Care</span>
        </span>
      </a>

      <span className="brand-divider"></span>

      <a
        href="https://www.shopify.com"
        target="_blank"
        rel="noopener noreferrer"
        className="shopify-brand"
        aria-label="Visit Shopify website"
      >
        <img src="/shopify-logo.svg" alt="Shopify" />
      </a>
    </div>
  );
}

/* =========================================
   PUBLIC WEBSITE
========================================= */

function PublicHome() {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [tracking, setTracking] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");

  /* =========================================
     REQUEST TRACKING
  ========================================= */

  const handleTrackRequest = async (e) => {
    e.preventDefault();

    const user = auth.currentUser;

    if (!user) {
      setTrackingError(
        "Please sign in to track your support request."
      );
      setTrackingResult(null);
      return;
    }

    if (!tracking.trim()) {
      setTrackingError(
        "Please enter your support reference number."
      );
      return;
    }

    if (!user.emailVerified) {
      setTrackingError(
        "Please verify your email address before tracking requests."
      );
      setTrackingResult(null);
      return;
    }

    setTrackingLoading(true);
    setTrackingError("");
    setTrackingResult(null);

    try {
      const requestQuery = query(
        collection(db, "requests"),
        where("uid", "==", user.uid),
        where(
          "reference",
          "==",
          tracking.trim().toUpperCase()
        )
      );

      const snapshot = await getDocs(requestQuery);

      if (snapshot.empty) {
        setTrackingError(
          "No request was found with that reference number. Check the number and try again."
        );
      } else {
        setTrackingResult({
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data()
        });
      }
    } catch (error) {
      console.error("Request tracking error:", error);

      setTrackingError(
        "We couldn't retrieve your request. Please try again."
      );
    } finally {
      setTrackingLoading(false);
    }
  };

  /* =========================================
     REQUEST STATUS
  ========================================= */

  const getStatusLabel = (status) => {
    const statuses = {
      open: "Request received",
      in_progress: "In progress",
      resolved: "Resolved",
      closed: "Closed"
    };

    return statuses[status] || status || "Awaiting update";
  };

  /* =========================================
     DATE FORMATTING
  ========================================= */

  const getFormattedDate = (timestamp) => {
    if (!timestamp?.toDate) {
      return "Date unavailable";
    }

    return timestamp.toDate().toLocaleString();
  };

  /* =========================================
     AUTHENTICATION CHECK
  ========================================= */

  const navigateToDashboard = async (path) => {
    const user = auth.currentUser;

    if (!user) {
      setTrackingError(
        "Please sign in before accessing your dashboard."
      );
      setTrackingResult(null);
      return;
    }

    if (!user.emailVerified) {
      setTrackingError(
        "Please verify your email address before accessing your dashboard."
      );
      setTrackingResult(null);
      return;
    }

    const isAdmin =
      user.email?.toLowerCase() === ADMIN_EMAIL;

    if (path === "/admin" && !isAdmin) {
      setTrackingError(
        "You do not have administrator access."
      );
      return;
    }

    if (path === "/merchant" && isAdmin) {
      navigate("/admin");
      return;
    }

    setMenuOpen(false);
    navigate(path);
  };

  return (
    <div className="app">

      {/* NAVIGATION */}

      <header className="navbar">
        <Brand />

        <button
          className="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <nav className={menuOpen ? "nav-links open" : "nav-links"}>
          <a href="#services" onClick={() => setMenuOpen(false)}>
            Services
          </a>

          <a href="#how" onClick={() => setMenuOpen(false)}>
            How it works
          </a>

          <a href="#track" onClick={() => setMenuOpen(false)}>
            Track request
          </a>

          <a href="#faq" onClick={() => setMenuOpen(false)}>
            Help centre
          </a>
        </nav>

        <div className="nav-actions">
          <Auth />

          <button
            className="merchant-dashboard-open-button"
            onClick={() => navigateToDashboard("/merchant")}
          >
            My Dashboard
          </button>

          <button
            className="merchant-dashboard-open-button"
            onClick={() => navigateToDashboard("/admin")}
          >
            Admin Panel
          </button>

          <button
            className="nav-button"
            onClick={() => setShowForm(true)}
          >
            Get support <ArrowRight size={16} />
          </button>
        </div>
      </header>

      <main>

        {/* HERO SECTION */}

        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="pulse"></span>
              INDEPENDENT MERCHANT SUPPORT
            </div>

            <h1>
              Better support.<br />
              <span>Stronger stores.</span>
            </h1>

            <p className="hero-text">
              Running an online store comes with challenges. Get practical
              assistance, track your support requests and communicate
              directly with our support team.
            </p>

            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() => setShowForm(true)}
              >
                Submit a request <ArrowRight size={17} />
              </button>

              <a className="secondary-button" href="#how">
                How it works <ChevronRight size={17} />
              </a>
            </div>

            <div className="trust-row">
              <span>
                <ShieldCheck size={17} /> Private communication
              </span>

              <span>
                <Clock size={17} /> 24-hour response target
              </span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-glow"></div>

            <div className="dashboard-card">
              <div className="dash-top">
                <div>
                  <span className="dash-dot"></span>
                  <span className="dash-dot"></span>
                  <span className="dash-dot"></span>
                </div>

                <span>SUPPORT OVERVIEW</span>
              </div>

              <div className="dash-welcome">
                <div>
                  <small>YOUR SUPPORT SPACE</small>
                  <h3>How can we help?</h3>
                </div>

                <div className="dash-avatar">
                  <Headphones size={21} />
                </div>
              </div>

              <div className="dash-stat">
                <div className="stat-icon">
                  <MessageCircle size={20} />
                </div>

                <div>
                  <small>Support requests</small>
                  <strong>One place. Every update.</strong>
                </div>

                <CheckCircle className="stat-check" size={20} />
              </div>

              <div className="dash-stat">
                <div className="stat-icon light">
                  <Lock size={20} />
                </div>

                <div>
                  <small>Communication</small>
                  <strong>Private and organised</strong>
                </div>

                <ShieldCheck className="stat-check" size={20} />
              </div>

              <div className="dash-progress">
                <div className="progress-heading">
                  <span>Support experience</span>
                  <span>Connected</span>
                </div>

                <div className="progress-track">
                  <div></div>
                </div>
              </div>

              <div className="dash-footer">
                <span>
                  <span className="online-dot"></span>
                  Support workspace
                </span>

                <span>MerchantCare</span>
              </div>
            </div>

            <div className="floating-card">
              <div className="float-icon">
                <MessageCircle size={18} />
              </div>

              <div>
                <strong>Direct support</strong>
                <small>Chat from your dashboard</small>
              </div>
            </div>
          </div>
        </section>

        {/* STATISTICS STRIP */}

        <section className="stats-strip">
          <div>
            <strong>01</strong>
            <span>Submit your issue</span>
          </div>

          <div>
            <strong>02</strong>
            <span>Get a reference number</span>
          </div>

          <div>
            <strong>03</strong>
            <span>Chat and track progress</span>
          </div>

          <div>
            <strong>04</strong>
            <span>Get your resolution</span>
          </div>
        </section>

        {/* SERVICES SECTION */}

        <section className="services section" id="services">
          <div className="section-heading">
            <span className="section-label">
              WHAT WE HELP WITH
            </span>

            <h2>
              Support for the challenges<br />
              behind your store.
            </h2>

            <p>
              Explore our support categories and tell us what you need help with.
            </p>
          </div>

          <div className="category-grid">
            {categories.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  className="category-card"
                  key={item.name}
                  onClick={() => setShowForm(true)}
                >
                  <span className="category-icon">
                    <Icon size={22} />
                  </span>

                  <strong>{item.name}</strong>
                  <p>{item.desc}</p>

                  <span className="card-arrow">
                    <ArrowRight size={17} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}

        <section className="process section" id="how">
          <div className="process-copy">
            <span className="section-label">
              SIMPLE PROCESS
            </span>

            <h2>
              Your support journey,<br />
              without the confusion.
            </h2>

            <p>
              Every request has its own reference number and dedicated
              conversation space. You can return at any time to see updates.
            </p>

            <button
              className="primary-button"
              onClick={() => setShowForm(true)}
            >
              Start a support request <ArrowRight size={17} />
            </button>
          </div>

          <div className="steps">
            {[
              [
                "01",
                "Create your request",
                "Describe your store issue and provide the necessary details."
              ],
              [
                "02",
                "Receive your reference",
                "Your request receives a unique tracking reference."
              ],
              [
                "03",
                "Communicate directly",
                "Continue the conversation securely on this website."
              ],
              [
                "04",
                "Follow your progress",
                "See updates and responses from your support dashboard."
              ]
            ].map(([number, title, desc]) => (
              <div className="step" key={number}>
                <span>{number}</span>

                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* REQUEST TRACKING SECTION */}

        <section className="track-section section" id="track">
          <div className="track-card">
            <div className="track-icon">
              <Search size={25} />
            </div>

            <div className="track-copy">
              <span className="section-label">
                REQUEST TRACKING
              </span>

              <h2>Already have a request?</h2>

              <p>
                Enter your support reference number to find your request.
              </p>
            </div>

            <form
              className="track-form"
              onSubmit={handleTrackRequest}
            >
              <input
                value={tracking}
                onChange={(e) => {
                  setTracking(e.target.value);
                  setTrackingError("");
                  setTrackingResult(null);
                }}
                placeholder="e.g. MC-XXXXXXXX"
                required
              />

              <button
                className="primary-button"
                type="submit"
                disabled={trackingLoading}
              >
                {trackingLoading
                  ? "Checking..."
                  : <>Track request <ArrowRight size={16} /></>
                }
              </button>
            </form>

            {trackingError && (
              <p className="tracking-error">
                {trackingError}
              </p>
            )}

            {trackingResult && (
              <div className="tracking-result">
                <div className="tracking-result-heading">
                  <div>
                    <small>SUPPORT REFERENCE</small>
                    <h3>{trackingResult.reference}</h3>
                  </div>

                  <span className={"tracking-status " + trackingResult.status}>
                    {getStatusLabel(trackingResult.status)}
                  </span>
                </div>

                <div className="tracking-details">
                  <div>
                    <span>Store</span>
                    <strong>
                      {trackingResult.storeUrl || "Not provided"}
                    </strong>
                  </div>

                  <div>
                    <span>Issue category</span>
                    <strong>
                      {trackingResult.category || "Not provided"}
                    </strong>
                  </div>

                  <div>
                    <span>Date submitted</span>
                    <strong>
                      {getFormattedDate(trackingResult.createdAt)}
                    </strong>
                  </div>
                </div>

                <div className="tracking-description">
                  <span>Issue description</span>
                  <p>{trackingResult.description}</p>
                </div>

                <div className="tracking-update">
                  <CheckCircle size={20} />

                  <div>
                    <strong>
                      {getStatusLabel(trackingResult.status)}
                    </strong>

                    <p>
                      {trackingResult.status === "open"
                        ? "Your request has been received and is awaiting review."
                        : trackingResult.status === "in_progress"
                        ? "Your request is currently being handled by the support team."
                        : trackingResult.status === "resolved"
                        ? "Your support request has been resolved."
                        : trackingResult.status === "closed"
                        ? "This support request has been closed."
                        : "Your request status is being updated."
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* CALL TO ACTION */}

        <section className="cta-section">
          <div>
            <span className="section-label">
              LET'S GET YOUR STORE MOVING
            </span>

            <h2>
              Every store challenge<br />
              deserves a clear solution.
            </h2>

            <p>
              Start a support conversation with MerchantCare today.
            </p>
          </div>

          <button
            className="white-button"
            onClick={() => setShowForm(true)}
          >
            Get started <ArrowRight size={17} />
          </button>
        </section>

        {/* FAQ SECTION */}

        <section className="faq section" id="faq">
          <div className="section-heading">
            <span className="section-label">
              NEED TO KNOW
            </span>

            <h2>Frequently asked questions</h2>
          </div>

          <div className="faq-list">
            <details>
              <summary>
                Is MerchantCare Shopify's official support team?
              </summary>

              <p>
                No. MerchantCare is an independent support service and is
                not affiliated with, endorsed by, or sponsored by Shopify.
              </p>
            </details>

            <details>
              <summary>
                Do I need to share my Shopify password?
              </summary>

              <p>
                No. Never share your Shopify password with us. If store
                access is required for a task, we will discuss an appropriate
                authorised collaborator-access process.
              </p>
            </details>

            <details>
              <summary>
                Where will I communicate with the support team?
              </summary>

              <p>
                Our intended support workflow keeps your conversations
                inside the MerchantCare website. Email is used for
                verification and notifications.
              </p>
            </details>

            <details>
              <summary>
                How do I follow my request?
              </summary>

              <p>
                Use your unique support reference or sign in to your
                account to follow the request and its updates.
              </p>
            </details>
          </div>
        </section>
      </main>

      {/* FOOTER */}

      <footer className="footer">
        <Brand />

        <p>
          Independent support for online merchants.
        </p>

        <span className="footer-copy">
          © 2026 MerchantCare. All rights reserved.
        </span>

        <p className="disclaimer">
          MerchantCare is an independent service and is not affiliated
          with or endorsed by Shopify.
        </p>
      </footer>

      {/* SUPPORT REQUEST MODAL */}

      <SupportRequest
        open={showForm}
        onClose={() => setShowForm(false)}
      />
    </div>
  );
}

/* =========================================
   APPLICATION ROUTES
========================================= */

function AppRoutes() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (active) {
          setCurrentUser(null);
          setAuthLoading(false);
        }
        return;
      }

      try {
        await reload(user);
        await getIdToken(user, true);
      } catch (error) {
        console.error("Authentication refresh error:", error);
      }

      if (active) {
        setCurrentUser(auth.currentUser);
        setAuthLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (authLoading) {
    return <div className="auth-loading">Loading...</div>;
  }

  const verified = currentUser?.emailVerified === true;

  const isAdmin =
    verified &&
    currentUser?.email?.toLowerCase() === ADMIN_EMAIL;

  return (
    <Routes>
      <Route
        path="/"
        element={
          verified ? (
            <Navigate
              to={isAdmin ? "/admin" : "/merchant"}
              replace
            />
          ) : (
            <PublicHome />
          )
        }
      />

      <Route
        path="/merchant"
        element={
          !verified || isAdmin ? (
            <Navigate
              to={isAdmin ? "/admin" : "/"}
              replace
            />
          ) : (
            <MerchantDashboard />
          )
        }
      />

      <Route
        path="/admin"
        element={
          isAdmin ? (
            <AdminDashboard />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

/* =========================================
   MAIN APPLICATION
========================================= */

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
