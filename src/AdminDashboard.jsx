
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  doc,
  updateDoc,
  serverTimestamp,
  orderBy,
  limit
} from "firebase/firestore";
import {
  Search,
  RefreshCw,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  ChevronDown,
  MessageCircle,
  LayoutDashboard,
  Inbox,
  Users,
  Home,
  ArrowLeft
} from "lucide-react";
import "./AdminDashboard.css";
import RequestChat from "./RequestChat";
import Auth from "./Auth";

const ADMIN_EMAIL = "lunafromshopify.help@gmail.com";

const statusLabels = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed"
};

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "Date unavailable";
  return timestamp.toDate().toLocaleString();
}

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [latestMessages, setLatestMessages] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [activeSection, setActiveSection] = useState("overview");
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [updatingId, setUpdatingId] = useState("");

  const isAdmin =
    user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
    user?.emailVerified === true;

  // AUTHENTICATION AND REQUEST LISTENER
  useEffect(() => {
    let unsubscribeRequests = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (unsubscribeRequests) {
        unsubscribeRequests();
        unsubscribeRequests = null;
      }

      setUser(currentUser);
      setRequests([]);
      setLatestMessages({});
      setError("");
      setAuthLoading(false);

      if (
        !currentUser ||
        !currentUser.emailVerified ||
        currentUser.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
      ) {
        setLoading(false);
        return;
      }

      setLoading(true);

      unsubscribeRequests = onSnapshot(
        query(collection(db, "requests")),
        (snapshot) => {
          const allRequests = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data()
          }));

          allRequests.sort(
            (a, b) =>
              (b.createdAt?.toMillis?.() || 0) -
              (a.createdAt?.toMillis?.() || 0)
          );

          setRequests(allRequests);
          setLoading(false);
          setError("");
        },
        (firebaseError) => {
          console.error("Admin dashboard error:", firebaseError);
          setError(
            "Unable to load requests. Check your Firestore administrator permissions."
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

  // LATEST MESSAGE LISTENERS FOR THE CENTRALIZED INBOX
  useEffect(() => {
    if (!isAdmin || requests.length === 0) {
      setLatestMessages({});
      return;
    }

    const unsubscribers = [];

    requests.forEach((request) => {
      const latestMessageQuery = query(
        collection(db, "requests", request.id, "messages"),
        orderBy("createdAt", "desc"),
        limit(1)
      );

      const unsubscribe = onSnapshot(
        latestMessageQuery,
        (snapshot) => {
          if (snapshot.empty) {
            setLatestMessages((previous) => {
              const updated = { ...previous };
              delete updated[request.id];
              return updated;
            });
            return;
          }

          const messageDocument = snapshot.docs[0];

          setLatestMessages((previous) => ({
            ...previous,
            [request.id]: {
              id: messageDocument.id,
              ...messageDocument.data()
            }
          }));
        },
        (firebaseError) => {
          console.error(
            "Latest message listener error:",
            request.id,
            firebaseError
          );
        }
      );

      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [requests, isAdmin]);

  // KEEP SELECTED REQUEST CONNECTED TO LIVE REQUEST DATA
  const selectedRequest = requests.find(
    (request) => request.id === selectedRequestId
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

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus =
        filter === "all" || request.status === filter;

      const matchesSearch =
        !term ||
        [
          request.reference,
          request.email,
          request.merchantName,
          request.storeUrl,
          request.category,
          request.description
        ].some((value) =>
          String(value || "").toLowerCase().includes(term)
        );

      return matchesStatus && matchesSearch;
    });
  }, [requests, search, filter]);

  const inboxRequests = useMemo(() => {
    const term = search.trim().toLowerCase();

    return requests
      .filter((request) => {
        const latestMessage = latestMessages[request.id];

        const searchableValues = [
          request.reference,
          request.email,
          request.merchantName,
          request.storeUrl,
          request.category,
          latestMessage?.text
        ];

        return (
          !term ||
          searchableValues.some((value) =>
            String(value || "").toLowerCase().includes(term)
          )
        );
      })
      .sort((a, b) => {
        const dateA =
          latestMessages[a.id]?.createdAt?.toMillis?.() ||
          a.createdAt?.toMillis?.() ||
          0;

        const dateB =
          latestMessages[b.id]?.createdAt?.toMillis?.() ||
          b.createdAt?.toMillis?.() ||
          0;

        return dateB - dateA;
      });
  }, [requests, latestMessages, search]);

  async function updateStatus(requestId, newStatus) {
    try {
      setUpdatingId(requestId);

      await updateDoc(doc(db, "requests", requestId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      setError("");
    } catch (firebaseError) {
      console.error("Status update error:", firebaseError);
      setError(
        "Status update failed. Check your Firestore administrator permissions."
      );
    } finally {
      setUpdatingId("");
    }
  }

  if (authLoading || loading) {
    return (
      <div className="admin-dashboard-page">
        <div className="admin-message">
          <RefreshCw className="admin-spin" size={28} />
          <p>Loading administrator workspace...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.emailVerified || !isAdmin) {
    return (
      <div className="admin-dashboard-page admin-access-page">
        <div className="admin-access-card">
          <AlertCircle size={42} />
          <h2>Administrator access required</h2>
          <p>
            Sign in with your verified administrator account to
            access this workspace.
          </p>
          <Auth />
          <a href="/" className="admin-back-link">
            <ArrowLeft size={16} /> Return to website
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-page">

      {/* ADMIN SIDEBAR */}
      <aside className="admin-sidebar">
        <a href="/" className="admin-brand">
          <span className="admin-brand-icon">
            <MessageCircle size={22} />
          </span>
          <span>
            Merchant<span>Care</span>
          </span>
        </a>

        <div className="admin-sidebar-label">
          ADMINISTRATION
        </div>

        <nav className="admin-navigation">
          <button
            className={activeSection === "overview" ? "active" : ""}
            onClick={() => {
              setActiveSection("overview");
              setSearch("");
            }}
          >
            <LayoutDashboard size={19} />
            Overview
          </button>

          <button
            className={activeSection === "messages" ? "active" : ""}
            onClick={() => {
              setActiveSection("messages");
              setSearch("");
              setSelectedRequestId(null);
            }}
          >
            <Inbox size={19} />
            Messages Inbox
            <span>{requests.length}</span>
          </button>

          <button
            className={activeSection === "requests" ? "active" : ""}
            onClick={() => {
              setActiveSection("requests");
              setSearch("");
            }}
          >
            <FileText size={19} />
            Support Requests
          </button>

          <button
            className={activeSection === "merchants" ? "active" : ""}
            onClick={() => {
              setActiveSection("merchants");
              setSearch("");
            }}
          >
            <Users size={19} />
            Merchants
          </button>
        </nav>

        <div className="admin-sidebar-bottom">
          <a href="/">
            <Home size={18} />
            Back to website
          </a>

          <div className="admin-sidebar-user">
            <div className="admin-user-avatar">A</div>
            <div>
              <strong>Administrator</strong>
              <small>{user.email}</small>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN ADMIN WORKSPACE */}
      <main className="admin-main">

        <header className="admin-topbar">
          <div>
            <span className="admin-eyebrow">
              MERCHANTCARE CONTROL PANEL
            </span>
            <h2>
              {activeSection === "overview"
                ? "Overview"
                : activeSection === "messages"
                ? "Messages Inbox"
                : activeSection === "requests"
                ? "Support Requests"
                : "Merchants"}
            </h2>
          </div>

          <div className="admin-topbar-user">
            <span>{user.email}</span>
            <Auth />
          </div>
        </header>

        {error && <div className="admin-error">{error}</div>}

        {/* OVERVIEW */}
        {activeSection === "overview" && (
          <section className="admin-content">

            <div className="admin-welcome">
              <div>
                <h3>Administrator workspace</h3>
                <p>
                  Monitor merchant activity, manage support requests
                  and respond to conversations.
                </p>
              </div>
              <div className="admin-welcome-icon">
                <LayoutDashboard size={25} />
              </div>
            </div>

            <div className="admin-stats">
              <div className="admin-stat">
                <FileText />
                <span>Total requests</span>
                <strong>{requests.length}</strong>
              </div>

              <div className="admin-stat">
                <AlertCircle />
                <span>Open</span>
                <strong>{openCount}</strong>
              </div>

              <div className="admin-stat">
                <RefreshCw />
                <span>In progress</span>
                <strong>{progressCount}</strong>
              </div>

              <div className="admin-stat">
                <CheckCircle />
                <span>Resolved / closed</span>
                <strong>{resolvedCount}</strong>
              </div>
            </div>

            <div className="admin-section-heading">
              <div>
                <h3>Recent support requests</h3>
                <p>Latest requests submitted by merchants.</p>
              </div>
              <button
                onClick={() => setActiveSection("requests")}
              >
                View all
              </button>
            </div>

            {requests.length === 0 ? (
              <div className="admin-message">
                <FileText size={34} />
                <h3>No requests yet</h3>
                <p>New merchant requests will appear here.</p>
              </div>
            ) : (
              <div className="admin-recent-list">
                {requests.slice(0, 5).map((request) => (
                  <div className="admin-recent-item" key={request.id}>
                    <div>
                      <strong>
                        {request.reference || request.id}
                      </strong>
                      <span>
                        {request.merchantName ||
                          request.email ||
                          "Merchant"}
                      </span>
                    </div>

                    <span
                      className={`admin-status status-${request.status || "open"}`}
                    >
                      {statusLabels[request.status] || "Unknown"}
                    </span>

                    <button
                      className="admin-view-button"
                      onClick={() => {
                        setSelectedRequestId(request.id);
                        setActiveSection("requests");
                      }}
                    >
                      <Eye size={16} /> Details
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              className="admin-primary-button"
              onClick={() => setActiveSection("messages")}
            >
              <MessageCircle size={18} />
              Open Messages Inbox
            </button>
          </section>
        )}

        {/* CENTRALIZED MESSAGES INBOX */}
        {activeSection === "messages" && (
          <section className="admin-content">

            <div className="admin-section-heading">
              <div>
                <h3>All merchant conversations</h3>
                <p>
                  Select a merchant conversation to respond directly.
                </p>
              </div>
              <span className="admin-count">
                {requests.length} conversations
              </span>
            </div>

            <div className="admin-toolbar">
              <div className="admin-search">
                <Search size={18} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search merchant, reference or message..."
                />
              </div>
            </div>

            {inboxRequests.length === 0 ? (
              <div className="admin-message">
                <MessageCircle size={35} />
                <h3>No conversations found</h3>
                <p>
                  Merchant conversations will appear here when
                  support requests are created.
                </p>
              </div>
            ) : (
              <div className="admin-inbox-layout">

                {/* CONVERSATION LIST */}
                <div className="admin-inbox-list">
                  {inboxRequests.map((request) => {
                    const latestMessage = latestMessages[request.id];

                    return (
                      <button
                        type="button"
                        key={request.id}
                        className={`admin-inbox-item ${
                          selectedRequestId === request.id ? "active" : ""
                        }`}
                        onClick={() =>
                          setSelectedRequestId(request.id)
                        }
                      >
                        <span className="admin-inbox-avatar">
                          {(request.merchantName ||
                            request.email ||
                            "M")
                            .charAt(0)
                            .toUpperCase()}
                        </span>

                        <span className="admin-inbox-info">
                          <strong>
                            {request.merchantName ||
                              request.email ||
                              "Merchant"}
                          </strong>

                          <small>
                            {request.reference || request.id}
                          </small>

                          <small className="admin-inbox-preview">
                            {latestMessage
                              ? `${latestMessage.senderRole === "admin" ? "You: " : ""}${latestMessage.text}`
                              : "No messages yet. Start the conversation."}
                          </small>
                        </span>

                        <span className="admin-inbox-date">
                          {formatDate(
                            latestMessage?.createdAt ||
                            request.createdAt
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* SELECTED CONVERSATION */}
                <div className="admin-inbox-chat">
                  {selectedRequest ? (
                    <>
                      <div className="admin-chat-heading">
                        <div>
                          <h3>
                            {selectedRequest.merchantName ||
                              selectedRequest.email ||
                              "Merchant"}
                          </h3>
                          <p>
                            {selectedRequest.reference ||
                              selectedRequest.id}
                          </p>
                        </div>

                        <span
                          className={`admin-status status-${selectedRequest.status || "open"}`}
                        >
                          {statusLabels[selectedRequest.status] ||
                            "Unknown"}
                        </span>
                      </div>

                      <RequestChat
                        request={selectedRequest}
                        currentUser={user}
                        isAdmin={true}
                      />
                    </>
                  ) : (
                    <div className="admin-message">
                      <MessageCircle size={32} />
                      <h3>Select a conversation</h3>
                      <p>
                        Choose a merchant from the inbox to open
                        the conversation.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* SUPPORT REQUESTS */}
        {activeSection === "requests" && (
          <section className="admin-content">

            <div className="admin-section-heading">
              <div>
                <h3>Support requests</h3>
                <p>
                  Review requests and manage their current status.
                </p>
              </div>
              <span className="admin-count">
                {filteredRequests.length} displayed
              </span>
            </div>

            <div className="admin-toolbar">
              <div className="admin-search">
                <Search size={18} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search reference, email, store..."
                />
              </div>

              <div className="admin-filter">
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  <option value="all">All requests</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <ChevronDown size={16} />
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="admin-message">
                <FileText size={34} />
                <h3>No requests found</h3>
                <p>Requests matching your search will appear here.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Merchant</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Details</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRequests.map((request) => (
                      <tr key={request.id}>
                        <td>
                          {request.reference || request.id}
                        </td>

                        <td>
                          <strong>
                            {request.merchantName || "Merchant"}
                          </strong>
                          <small>{request.email || "No email"}</small>
                        </td>

                        <td>
                          {request.category || "Not specified"}
                        </td>

                        <td>{formatDate(request.createdAt)}</td>

                        <td>
                          <span
                            className={`admin-status status-${request.status || "open"}`}
                          >
                            {statusLabels[request.status] || "Unknown"}
                          </span>
                        </td>

                        <td>
                          <button
                            className="admin-view-button"
                            onClick={() =>
                              setSelectedRequestId(request.id)
                            }
                          >
                            <Eye size={16} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="admin-footer">
              <span>{filteredRequests.length} request(s) displayed</span>
              <span>
                <Clock size={14} /> Live updates enabled
              </span>
            </div>

            {/* REQUEST DETAILS ARE SEPARATE FROM THE INBOX */}
            {selectedRequest && (
              <div className="admin-detail-backdrop">
                <div className="admin-detail">
                  <div className="admin-detail-header">
                    <div>
                      <span className="admin-eyebrow">
                        REQUEST DETAILS
                      </span>
                      <h3>
                        {selectedRequest.reference ||
                          selectedRequest.id}
                      </h3>
                    </div>

                    <button
                      className="admin-close"
                      onClick={() => setSelectedRequestId(null)}
                      aria-label="Close details"
                    >
                      ×
                    </button>
                  </div>

                  <div className="admin-detail-content">
                    <p>
                      <strong>Merchant:</strong>{" "}
                      {selectedRequest.merchantName || "Not provided"}
                    </p>

                    <p>
                      <strong>Email:</strong>{" "}
                      {selectedRequest.email || "Not provided"}
                    </p>

                    <p>
                      <strong>Store:</strong>{" "}
                      {selectedRequest.storeUrl || "Not provided"}
                    </p>

                    <p>
                      <strong>Category:</strong>{" "}
                      {selectedRequest.category || "Not provided"}
                    </p>

                    <p>
                      <strong>Submitted:</strong>{" "}
                      {formatDate(selectedRequest.createdAt)}
                    </p>

                    <p><strong>Description:</strong></p>

                    <div className="admin-description">
                      {selectedRequest.description ||
                        "No description provided."}
                    </div>

                    <label htmlFor="admin-status-select">
                      Update request status
                    </label>

                    <select
                      id="admin-status-select"
                      value={selectedRequest.status || "open"}
                      disabled={updatingId === selectedRequest.id}
                      onChange={(event) =>
                        updateStatus(
                          selectedRequest.id,
                          event.target.value
                        )
                      }
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>

                    {updatingId === selectedRequest.id && (
                      <small>Updating status...</small>
                    )}

                    <button
                      className="admin-primary-button"
                      onClick={() => {
                        setActiveSection("messages");
                        setSearch("");
                      }}
                    >
                      <MessageCircle size={17} />
                      Open conversation
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* MERCHANTS */}
        {activeSection === "merchants" && (
          <section className="admin-content">
            <div className="admin-section-heading">
              <div>
                <h3>Merchants</h3>
                <p>
                  Merchant accounts associated with support requests.
                </p>
              </div>
              <span className="admin-count">
                {new Set(requests.map((request) => request.uid)).size}
                {" "}merchants
              </span>
            </div>

            {requests.length === 0 ? (
              <div className="admin-message">
                <Users size={34} />
                <h3>No merchants yet</h3>
                <p>Merchant activity will appear here.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Merchant</th>
                      <th>Email</th>
                      <th>Requests</th>
                      <th>Latest request</th>
                    </tr>
                  </thead>

                  <tbody>
                    {Array.from(
                      requests.reduce((map, request) => {
                        const key = request.uid || request.email || request.id;

                        if (!map.has(key)) {
                          map.set(key, []);
                        }

                        map.get(key).push(request);
                        return map;
                      }, new Map())
                    ).map(([key, merchantRequests]) => {
                      const latestRequest = merchantRequests[0];

                      return (
                        <tr key={key}>
                          <td>
                            <strong>
                              {latestRequest.merchantName || "Merchant"}
                            </strong>
                          </td>
                          <td>{latestRequest.email || "Not provided"}</td>
                          <td>{merchantRequests.length}</td>
                          <td>
                            {latestRequest.reference ||
                              latestRequest.id}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

      </main>
    </div>
  );
}
