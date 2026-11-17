
import { useState } from "react";
import { auth, db } from "./firebase";
import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";
import {
  Search,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import "./TrackRequest.css";

export default function TrackRequest() {
  const [reference, setReference] = useState("");
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trackRequest = async (e) => {
    e.preventDefault();

    const user = auth.currentUser;

    if (!user) {
      setError("Please sign in to track your request.");
      return;
    }

    if (!reference.trim()) {
      setError("Enter your support reference number.");
      return;
    }

    setLoading(true);
    setError("");
    setRequest(null);

    try {
      const q = query(
        collection(db, "requests"),
        where("uid", "==", user.uid),
        where("reference", "==", reference.trim().toUpperCase())
      );

      const result = await getDocs(q);

      if (result.empty) {
        setError("No request found with that reference number.");
      } else {
        setRequest(result.docs[0].data());
      }
    } catch (err) {
      console.error("Tracking error:", err);
      setError("Unable to track your request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const status = request?.status || "open";

  const statusLabel = {
    open: "Request received",
    in_progress: "In progress",
    resolved: "Resolved",
    closed: "Closed"
  };

  const formattedDate = request?.createdAt?.toDate
    ? request.createdAt.toDate().toLocaleString()
    : "Date unavailable";

  return (
    <section className="track-section" id="track-request">
      <div className="track-container">
        <div className="track-heading">
          <span className="track-tag">REQUEST TRACKING</span>
          <h2>Track your support request</h2>
          <p>
            Enter the reference number you received after submitting
            your request.
          </p>
        </div>

        <form className="track-form" onSubmit={trackRequest}>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. MC-XXXXXXXX"
          />

          <button type="submit" disabled={loading}>
            {loading ? "Checking..." : (
              <>
                <Search size={17} />
                Track request
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="track-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {request && (
          <div className="track-result">
            <div className="track-result-top">
              <div>
                <span className="track-small-label">REFERENCE NUMBER</span>
                <h3>{request.reference}</h3>
              </div>

              <span className={`track-status ${status}`}>
                {statusLabel[status] || status}
              </span>
            </div>

            <div className="track-details">
              <div>
                <span>Store</span>
                <strong>{request.storeUrl || "Not provided"}</strong>
              </div>

              <div>
                <span>Request category</span>
                <strong>{request.category || "Not provided"}</strong>
              </div>

              <div>
                <span>Date submitted</span>
                <strong>{formattedDate}</strong>
              </div>
            </div>

            <div className="track-progress">
              <div className="track-progress-icon">
                {status === "resolved" || status === "closed"
                  ? <CheckCircle size={21} />
                  : <Clock size={21} />}
              </div>

              <div>
                <strong>{statusLabel[status] || status}</strong>
                <p>
                  {status === "open"
                    ? "Your request has been received and is awaiting review."
                    : status === "in_progress"
                    ? "Our support team is currently working on your request."
                    : status === "resolved"
                    ? "Your support request has been resolved."
                    : status === "closed"
                    ? "This support request has been closed."
                    : "Your request status has been updated."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
