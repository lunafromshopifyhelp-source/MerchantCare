
import { useState } from "react";
import { auth, db } from "./firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { X, ShieldCheck, ArrowRight, CheckCircle } from "lucide-react";
import "./SupportRequest.css";

const categories = [
  "Payments & Checkout",
  "Store Design",
  "Store Configuration",
  "Products & Inventory",
  "SEO & Marketing",
  "Apps & Integrations",
  "Account Restrictions",
  "Other Issues"
];

export default function SupportRequest({ open, onClose }) {
  const [storeUrl, setStoreUrl] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  if (!open) return null;

  const submitRequest = async (e) => {
    e.preventDefault();
    setError("");

    const user = auth.currentUser;

    if (!user) {
      setError("Please sign in to your MerchantCare account before submitting a request.");
      return;
    }

    if (!user.emailVerified) {
      setError("Please verify your email address before submitting a support request.");
      return;
    }

    setBusy(true);

    try {
      // Firestore generates a unique document ID for this request.
      const requestRef = doc(collection(db, "requests"));
      const requestCode = `MC-${requestRef.id.toUpperCase()}`;

      await setDoc(requestRef, {
        reference: requestCode,
        uid: user.uid,
        email: user.email,
        merchantName: user.displayName || "",
        storeUrl: storeUrl.trim(),
        category,
        description: description.trim(),
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setReference(requestCode);
      setStoreUrl("");
      setCategory("");
      setDescription("");
    } catch (err) {
      console.error("Support request error:", err);
      setError("We couldn't submit your request. Check your connection and Firestore security rules, then try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sr-overlay" onClick={onClose}>
      <div className="sr-modal" onClick={(e) => e.stopPropagation()}>
        <button className="sr-close" onClick={onClose}><X size={20} /></button>

        {reference ? (
          <div className="sr-success-screen">
            <div className="sr-success-icon"><CheckCircle size={35} /></div>
            <span className="sr-label">REQUEST SUBMITTED</span>
            <h2>Your request is in the system.</h2>
            <p>Your support reference number is:</p>
            <div className="sr-reference">{reference}</div>
            <p className="sr-help">Keep this reference number. You'll use it to identify your support request.</p>
            <button className="sr-submit" onClick={onClose}>Done <CheckCircle size={17} /></button>
          </div>
        ) : (
          <>
            <span className="sr-label">MERCHANT SUPPORT</span>
            <h2>Tell us what you need.</h2>
            <p className="sr-intro">Describe your store issue. Your request will be linked to your verified MerchantCare account.</p>

            <form onSubmit={submitRequest} className="sr-form">
              <label>Verified account</label>
              <div className="sr-account">
                <ShieldCheck size={17} />
                <span>{auth.currentUser?.email || "Sign in to continue"}</span>
              </div>

              <label>Store URL</label>
              <input
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="yourstore.myshopify.com"
                required
              />

              <label>Issue category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                <option value="">Select a category</option>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>

              <label>Describe the issue</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what happened and what assistance you need..."
                rows={5}
                minLength={10}
                required
              />

              {error && <div className="sr-error">{error}</div>}

              <button className="sr-submit" type="submit" disabled={busy}>
                {busy ? "Submitting request..." : "Submit support request"}
                {!busy && <ArrowRight size={17} />}
              </button>
            </form>

            <div className="sr-privacy"><ShieldCheck size={14} /> Never share your Shopify password.</div>
          </>
        )}
      </div>
    </div>
  );
}
