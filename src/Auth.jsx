
import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,
  signOut,
  updateProfile,
  reload,
  getIdToken
} from "firebase/auth";

import { auth } from "./firebase";

import {
  ShieldCheck,
  X,
  LogOut,
  UserRound,
  Mail,
  Lock
} from "lucide-react";

import "./Auth.css";
import { useNavigate } from "react-router-dom";

const ADMIN_EMAIL = "lunafromshopify.help@gmail.com";

export default function Auth() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("login");
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  const getDashboardPath = (currentUser) => {
    return currentUser.email?.toLowerCase() === ADMIN_EMAIL
      ? "/admin"
      : "/merchant";
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    clearMessages();

    if (password.length < 6) {
      setError("Your password must contain at least 6 characters.");
      return;
    }

    setBusy(true);

    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      if (name.trim()) {
        await updateProfile(result.user, {
          displayName: name.trim()
        });
      }

      await sendEmailVerification(result.user);

      setUser(auth.currentUser);

      setMessage(
        "Your account has been created. Check your inbox and click the verification link before signing in."
      );

      setMode("verify");
      setPassword("");
    } catch (err) {
      setError(getFriendlyError(err.code));
    } finally {
      setBusy(false);
    }
  };

  // LOGIN AND AUTOMATIC DASHBOARD REDIRECT

  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    setBusy(true);

    try {
      const result = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await reload(result.user);

      const refreshedUser = auth.currentUser;

      if (!refreshedUser.emailVerified) {
        setUser(refreshedUser);
        setMode("verify");

        setMessage(
          "Your email address is not verified yet. Check your inbox, then use the button below."
        );
      } else {
        await getIdToken(refreshedUser, true);

        setUser(refreshedUser);
        setShowModal(false);
        setMessage("");

        navigate(getDashboardPath(refreshedUser), {
          replace: true
        });
      }
    } catch (err) {
      setError(getFriendlyError(err.code));
    } finally {
      setBusy(false);
    }
  };

  const resendVerification = async () => {
    clearMessages();

    if (!auth.currentUser) {
      setError("Please sign in with your email and password first.");
      setMode("login");
      return;
    }

    setBusy(true);

    try {
      await sendEmailVerification(auth.currentUser);

      setMessage(
        "A new verification email has been sent. Check your inbox and spam folder."
      );
    } catch (err) {
      setError(getFriendlyError(err.code));
    } finally {
      setBusy(false);
    }
  };

  // VERIFY EMAIL AND REDIRECT TO CORRECT DASHBOARD

  const checkVerification = async () => {
    clearMessages();

    if (!auth.currentUser) return;

    setBusy(true);

    try {
      await reload(auth.currentUser);

      const refreshedUser = auth.currentUser;

      if (refreshedUser.emailVerified) {
        await getIdToken(refreshedUser, true);

        setUser(refreshedUser);
        setShowModal(false);
        setMessage("");

        navigate(getDashboardPath(refreshedUser), {
          replace: true
        });
      } else {
        setError(
          "Your email is not verified yet. Open the link in your email, then try again."
        );
      }
    } catch (err) {
      setError(getFriendlyError(err.code));
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);

      setUser(null);
      setMessage("");
      setError("");
      setShowModal(false);

      navigate("/", { replace: true });
    } catch (err) {
      setError(getFriendlyError(err.code));
    }
  };

  const openAuth = (selectedMode) => {
    setMode(selectedMode);
    clearMessages();
    setShowModal(true);
  };

  if (loading) {
    return <span className="auth-loading">Loading...</span>;
  }

  const verified = user?.emailVerified === true;

  return (
    <>
      {user && verified ? (
        <div className="auth-account">
          <span className="auth-user-icon">
            <UserRound size={17} />
          </span>

          <span className="auth-user-name">
            {user.displayName || user.email}
          </span>

          <button
            className="auth-logout"
            onClick={handleLogout}
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      ) : (
        <button
          className="auth-open-button"
          onClick={() => openAuth("login")}
        >
          Sign in
        </button>
      )}

      {showModal && (
        <div
          className="auth-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="auth-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="auth-close"
              onClick={() => setShowModal(false)}
            >
              <X size={19} />
            </button>

            <div className="auth-logo">
              <ShieldCheck size={25} />
            </div>

            {mode === "verify" ? (
              <>
                <h2>Verify your email</h2>

                <p className="auth-description">
                  We need to confirm your email address before you can use your merchant account.
                </p>

                <div className="auth-verification-note">
                  <Mail size={21} />

                  <span>
                    Check your inbox for the verification link from Firebase Authentication.
                  </span>
                </div>

                {message && (
                  <div className="auth-success">{message}</div>
                )}

                {error && (
                  <div className="auth-error">{error}</div>
                )}

                <button
                  className="auth-submit"
                  onClick={checkVerification}
                  disabled={busy}
                >
                  {busy ? "Checking..." : "I've verified my email"}
                </button>

                <button
                  className="auth-secondary"
                  onClick={resendVerification}
                  disabled={busy}
                >
                  Resend verification email
                </button>

                <button
                  className="auth-text-button"
                  onClick={handleLogout}
                >
                  Sign out and return to login
                </button>
              </>
            ) : (
              <>
                <h2>
                  {mode === "register"
                    ? "Create your account"
                    : "Welcome back"}
                </h2>

                <p className="auth-description">
                  {mode === "register"
                    ? "Create your MerchantCare account to manage your support requests."
                    : "Sign in to access your MerchantCare account."}
                </p>

                <form
                  onSubmit={
                    mode === "register"
                      ? handleRegister
                      : handleLogin
                  }
                >
                  {mode === "register" && (
                    <>
                      <label>Full name</label>

                      <div className="auth-input-wrap">
                        <UserRound size={17} />

                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name"
                          required
                        />
                      </div>
                    </>
                  )}

                  <label>Email address</label>

                  <div className="auth-input-wrap">
                    <Mail size={17} />

                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>

                  <label>Password</label>

                  <div className="auth-input-wrap">
                    <Lock size={17} />

                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      autoComplete={
                        mode === "register"
                          ? "new-password"
                          : "current-password"
                      }
                      required
                    />
                  </div>

                  {error && (
                    <div className="auth-error">{error}</div>
                  )}

                  {message && (
                    <div className="auth-success">{message}</div>
                  )}

                  <button
                    className="auth-submit"
                    type="submit"
                    disabled={busy}
                  >
                    {busy
                      ? "Please wait..."
                      : mode === "register"
                      ? "Create account"
                      : "Sign in"}
                  </button>
                </form>

                <p className="auth-switch">
                  {mode === "register"
                    ? "Already have an account?"
                    : "New to MerchantCare?"}

                  <button
                    onClick={() => {
                      setMode(
                        mode === "register" ? "login" : "register"
                      );
                      clearMessages();
                    }}
                  >
                    {mode === "register"
                      ? "Sign in"
                      : "Create an account"}
                  </button>
                </p>
              </>
            )}

            <p className="auth-privacy">
              Your account credentials are handled securely by Firebase Authentication. Never share your Shopify password.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function getFriendlyError(code) {
  const errors = {
    "auth/email-already-in-use":
      "An account already exists with this email. Try signing in.",
    "auth/invalid-email":
      "Enter a valid email address.",
    "auth/weak-password":
      "Choose a stronger password with at least 6 characters.",
    "auth/invalid-credential":
      "The email or password is incorrect.",
    "auth/user-not-found":
      "No account was found with this email.",
    "auth/wrong-password":
      "The password is incorrect.",
    "auth/too-many-requests":
      "Too many attempts. Please wait and try again.",
    "auth/network-request-failed":
      "Network error. Check your internet connection.",
    "auth/operation-not-allowed":
      "Email/Password sign-in is not enabled in Firebase Authentication."
  };

  return (
    errors[code] ||
    `Something went wrong (${code || "unknown error"}). Please try again.`
  );
}
