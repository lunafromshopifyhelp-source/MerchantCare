
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  where
} from "firebase/firestore";
import {
  RefreshCw,
  MessageCircle,
  Clock,
  CheckCircle,
  FileText,
  LogIn,
  LayoutDashboard,
  Inbox,
  Home,
  ArrowLeft
} from "lucide-react";
import "./MerchantDashboard.css";
import RequestChat from "./RequestChat";
import Auth from "./Auth";

const statusLabels = {
  open: "Request received",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed"
};

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "Date unavailable";
  return timestamp.toDate().toLocaleString();
}

function MerchantDashboard() {
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const [selectedChatId, setSelectedChatId] = useState(null);

  useEffect(() => {
    let unsubscribeRequests = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (unsubscribeRequests) {
        unsubscribeRequests();
        unsubscribeRequests = null;
      }

      setUser(currentUser);
      setRequests([]);
      setSelectedChatId(null);
      setError("");

      if (!currentUser) {
        setLoading(false);
        return;
      }

      if (!currentUser.emailVerified) {
        setLoading(false);
        setError(
          "Please verify your email address before accessing your dashboard."
        );
        return;
      }

      setLoading(true);

      const requestsQuery = query(
        collection(db, "requests"),
        where("uid", "==", currentUser.uid)
      );

      unsubscribeRequests = onSnapshot(
        requestsQuery,
        (snapshot) => {
          const userRequests = snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data()
          }));

          userRequests.sort((a, b) => {
            const dateA = a.createdAt?.toMillis?.() || 0;
            const dateB = b.createdAt?.toMillis?.() || 0;
            return dateB - dateA;
          });

          setRequests(userRequests);
          setLoading(false);
          setError("");
        },
        (firebaseError) => {
          console.error("Dashboard loading error:", firebaseError);
          setError(
            "We couldn't load your requests. Please refresh and try again."
          );
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeRequests) unsubscribeRequests();
    };
  }, []);

  // Keep the selected conversation connected to the latest request data.
  useEffect(() => {
    if (requests.length === 0) {
      setSelectedChatId(null);
      return;
    }

    const selectedStillExists = requests.some(
      (request) => request.id === selectedChatId
    );

    if (!selectedStillExists) {
      setSelectedChatId(requests[0].id);
    }
  }, [requests, selectedChatId]);

  const selectedChatRequest = requests.find(
    (request) => request.id === selectedChatId
  );

  const openCount = requests.filter(
    (request) => request.status === "open"
  ).length;

  const progressCount = requests.filter(
    (request) => request.status === "in_progress"
  ).length;

  const resolvedCount = requests.filter(
    (request) =>
      request.status === "resolved" || request.status === "closed"
  ).length;

  if (loading) {
    return (
      <div className="merchant-dashboard-page">
        <div className="merchant-dashboard-message">
          <RefreshCw className="dashboard-spin" size={28} />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="merchant-dashboard-page">
        <div className="merchant-dashboard-message">
          <LogIn size={35} />
          <h3>Sign in to continue</h3>
          <p>
            Sign in to your MerchantCare account to access your
            support requests and conversations.
          </p>
          <Auth />
          <a href="/" className="merchant-dashboard-back-link">
            <ArrowLeft size={16} /> Return to website
          </a>
        </div>
      </div>
    );
  }

  if (!user.emailVerified || error) {
    return (
      <div className="merchant-dashboard-page">
        <div className="merchant-dashboard-message">
          <h3>Dashboard unavailable</h3>
          <p>
            {error || "Please verify your email before continuing."}
          </p>
          <Auth />
          <a href="/" className="merchant-dashboard-back-link">
            <ArrowLeft size={16} /> Return to website
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="merchant-dashboard-page">

      {/* SIDEBAR */}
      <aside className="merchant-dashboard-sidebar">
        <a href="/" className="merchant-dashboard-brand">
          <span className="merchant-dashboard-brand-icon">
            <MessageCircle size={22} />
          </span>
          <span>
            Merchant<span>Care</span>
          </span>
        </a>

        <div className="merchant-dashboard-sidebar-label">
          MERCHANT WORKSPACE
        </div>

        <nav className="merchant-dashboard-navigation">
          <button
            className={activeSection === "overview" ? "active" : ""}
            onClick={() => setActiveSection("overview")}
          >
            <LayoutDashboard size={19} />
            Overview
          </button>

          <button
            className={activeSection === "messages" ? "active" : ""}
            onClick={() => setActiveSection("messages")}
          >
            <Inbox size={19} />
            Messages
            <span className="merchant-dashboard-nav-count">
              {requests.length}
            </span>
          </button>

          <button
            className={activeSection === "requests" ? "active" : ""}
            onClick={() => setActiveSection("requests")}
          >
            <FileText size={19} />
            My Requests
          </button>
        </nav>

        <div className="merchant-dashboard-sidebar-bottom">
          <a href="/">
            <Home size={18} />
            Back to website
          </a>

          <div className="merchant-dashboard-sidebar-user">
            <div className="merchant-dashboard-user-avatar">
              {(user.displayName || user.email || "M")
                .charAt(0)
                .toUpperCase()}
            </div>
            <div>
              <strong>{user.displayName || "Merchant"}</strong>
              <small>{user.email}</small>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <main className="merchant-dashboard-main">

        <header className="merchant-dashboard-topbar">
          <div>
            <span className="merchant-dashboard-label">
              MERCHANTCARE ACCOUNT
            </span>
            <h2>
              {activeSection === "overview"
                ? "Dashboard"
                : activeSection === "messages"
                ? "Messages"
                : "My Support Requests"}
            </h2>
          </div>

          <div className="merchant-dashboard-topbar-user">
            <span>{user.displayName || user.email}</span>
            <Auth />
          </div>
        </header>

        {/* OVERVIEW */}
        {activeSection === "overview" && (
          <section className="merchant-dashboard-content">
            <div className="merchant-dashboard-welcome">
              <div>
                <h3>Welcome back, {user.displayName || "Merchant"}!</h3>
                <p>
                  Manage your support activity and communicate
                  directly with our support team.
                </p>
              </div>

              <div className="merchant-dashboard-account-icon">
                <MessageCircle size={25} />
              </div>
            </div>

            <div className="merchant-dashboard-stats">
              <div className="merchant-dashboard-stat">
                <FileText size={21} />
                <span>Total requests</span>
                <strong>{requests.length}</strong>
              </div>

              <div className="merchant-dashboard-stat">
                <Clock size={21} />
                <span>Open requests</span>
                <strong>{openCount}</strong>
              </div>

              <div className="merchant-dashboard-stat">
                <RefreshCw size={21} />
                <span>In progress</span>
                <strong>{progressCount}</strong>
              </div>

              <div className="merchant-dashboard-stat">
                <CheckCircle size={21} />
                <span>Resolved / closed</span>
                <strong>{resolvedCount}</strong>
              </div>
            </div>

            <div className="merchant-dashboard-requests-heading">
              <div>
                <h3>Recent support requests</h3>
                <p>Your latest support activity.</p>
              </div>

              <button
                type="button"
                onClick={() => setActiveSection("requests")}
              >
                View all
              </button>
            </div>

            {requests.length === 0 ? (
              <div className="merchant-dashboard-empty">
                <MessageCircle size={32} />
                <h3>No support requests yet</h3>
                <p>
                  Your submitted support requests will appear here.
                </p>
              </div>
            ) : (
              <div className="merchant-dashboard-request-list">
                {requests.slice(0, 3).map((request) => (
                  <div
                    className="merchant-dashboard-request"
                    key={request.id}
                  >
                    <div className="merchant-dashboard-request-top">
                      <div>
                        <small>SUPPORT REFERENCE</small>
                        <strong>
                          {request.reference || request.id}
                        </strong>
                      </div>

                      <span
                        className={`merchant-dashboard-status status-${request.status || "open"}`}
                      >
                        {statusLabels[request.status] || "Awaiting update"}
                      </span>
                    </div>

                    <div className="merchant-dashboard-request-details">
                      <div>
                        <span>Store</span>
                        <strong>{request.storeUrl || "Not provided"}</strong>
                      </div>

                      <div>
                        <span>Category</span>
                        <strong>{request.category || "Not provided"}</strong>
                      </div>

                      <div>
                        <span>Date submitted</span>
                        <strong>{formatDate(request.createdAt)}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              className="merchant-dashboard-open-button"
              onClick={() => setActiveSection("messages")}
            >
              <MessageCircle size={18} />
              Open Messages
            </button>
          </section>
        )}

        {/* DEDICATED MESSAGES SECTION */}
        {activeSection === "messages" && (
          <section className="merchant-dashboard-content">
            <div className="merchant-dashboard-requests-heading">
              <div>
                <h3>Your conversations</h3>
                <p>
                  Select a support conversation to message the
                  MerchantCare team.
                </p>
              </div>
              <span>{requests.length} conversations</span>
            </div>

            {requests.length === 0 ? (
              <div className="merchant-dashboard-empty">
                <MessageCircle size={35} />
                <h3>No conversations available</h3>
                <p>
                  Once you submit a support request, its conversation
                  will appear here.
                </p>
              </div>
            ) : (
              <div className="merchant-dashboard-messages-layout">

                {/* CONVERSATION LIST */}
                <div className="merchant-dashboard-conversation-list">
                  {requests.map((request) => (
                    <button
                      type="button"
                      key={request.id}
                      className={`merchant-dashboard-conversation-item ${
                        selectedChatId === request.id ? "active" : ""
                      }`}
                      onClick={() => setSelectedChatId(request.id)}
                    >
                      <span className="merchant-dashboard-conversation-icon">
                        <MessageCircle size={20} />
                      </span>

                      <span className="merchant-dashboard-conversation-info">
                        <strong>
                          {request.reference || request.id}
                        </strong>
                        <small>
                          {request.category || "Support request"}
                        </small>
                        <small>
                          {statusLabels[request.status] || "Awaiting update"}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>

                {/* SELECTED CHAT */}
                <div className="merchant-dashboard-conversation-panel">
                  {selectedChatRequest ? (
                    <>
                      <div className="merchant-dashboard-chat-heading">
                        <div>
                          <h3>
                            {selectedChatRequest.reference ||
                              selectedChatRequest.id}
                          </h3>
                          <p>MerchantCare Support</p>
                        </div>
                        <span
                          className={`merchant-dashboard-status status-${selectedChatRequest.status || "open"}`}
                        >
                          {statusLabels[selectedChatRequest.status] ||
                            "Awaiting update"}
                        </span>
                      </div>

                      <RequestChat
                        request={selectedChatRequest}
                        currentUser={user}
                        isAdmin={false}
                      />
                    </>
                  ) : (
                    <div className="merchant-dashboard-empty">
                      <MessageCircle size={30} />
                      <p>Select a conversation to begin.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* MY REQUESTS SECTION */}
        {activeSection === "requests" && (
          <section className="merchant-dashboard-content">
            <div className="merchant-dashboard-requests-heading">
              <div>
                <h3>Your support requests</h3>
                <p>
                  View your submitted issues and their current status.
                </p>
              </div>
              <span>{requests.length} total</span>
            </div>

            {requests.length === 0 ? (
              <div className="merchant-dashboard-empty">
                <FileText size={32} />
                <h3>No support requests yet</h3>
                <p>
                  When you submit a support request, it will appear here.
                </p>
              </div>
            ) : (
              <div className="merchant-dashboard-request-list">
                {requests.map((request) => (
                  <div
                    className="merchant-dashboard-request"
                    key={request.id}
                  >
                    <div className="merchant-dashboard-request-top">
                      <div>
                        <small>SUPPORT REFERENCE</small>
                        <strong>
                          {request.reference || request.id}
                        </strong>
                      </div>

                      <span
                        className={`merchant-dashboard-status status-${request.status || "open"}`}
                      >
                        {statusLabels[request.status] || "Awaiting update"}
                      </span>
                    </div>

                    <div className="merchant-dashboard-request-details">
                      <div>
                        <span>Store</span>
                        <strong>{request.storeUrl || "Not provided"}</strong>
                      </div>

                      <div>
                        <span>Category</span>
                        <strong>{request.category || "Not provided"}</strong>
                      </div>

                      <div>
                        <span>Date submitted</span>
                        <strong>{formatDate(request.createdAt)}</strong>
                      </div>
                    </div>

                    <div className="merchant-dashboard-description">
                      <span>Issue description</span>
                      <p>
                        {request.description || "No description provided."}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="merchant-dashboard-open-button"
                      onClick={() => {
                        setSelectedChatId(request.id);
                        setActiveSection("messages");
                      }}
                    >
                      <MessageCircle size={17} />
                      Open conversation
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

      </main>
    </div>
  );
}

export default MerchantDashboard;
