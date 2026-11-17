
import { useEffect, useRef, useState } from "react";
import { db } from "./firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";
import {
  Send,
  MessageCircle,
  RefreshCw
} from "lucide-react";
import "./RequestChat.css";

export default function RequestChat({
  request,
  currentUser,
  isAdmin = false
}) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!request?.id || !currentUser) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setMessages([]);
    setLoading(true);
    setError("");

    const messagesQuery = query(
      collection(db, "requests", request.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const conversation = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data()
        }));

        setMessages(conversation);
        setLoading(false);
        setError("");
      },
      (firebaseError) => {
        console.error("Chat loading error:", firebaseError);
        setError("Unable to load this conversation.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [request?.id, currentUser]);

  useEffect(() => {
    if (!loading) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end"
      });
    }
  }, [messages, loading]);

  async function sendMessage(event) {
    event.preventDefault();

    const text = message.trim();

    if (
      !text ||
      !request?.id ||
      !currentUser ||
      sending
    ) return;

    if (text.length > 2000) {
      setError("Messages cannot exceed 2,000 characters.");
      return;
    }

    setSending(true);
    setError("");

    try {
      await addDoc(
        collection(db, "requests", request.id, "messages"),
        {
          text,
          senderUid: currentUser.uid,
          senderEmail: currentUser.email || "",
          senderRole: isAdmin ? "admin" : "merchant",
          createdAt: serverTimestamp()
        }
      );

      setMessage("");
    } catch (firebaseError) {
      console.error("Message sending error:", firebaseError);
      setError(
        "Message could not be sent. Please check your connection and try again."
      );
    } finally {
      setSending(false);
    }
  }

  function formatMessageDate(timestamp) {
    if (!timestamp?.toDate) return "Sending...";

    return timestamp.toDate().toLocaleString();
  }

  if (!request || !currentUser) return null;

  return (
    <section className="request-chat">

      <div className="request-chat-header">
        <div>
          <MessageCircle size={20} />

          <div>
            <h3>Support Conversation</h3>
            <p>
              Reference: {request.reference || request.id}
            </p>
          </div>
        </div>
      </div>

      <div className="request-chat-messages">

        {loading ? (
          <div className="request-chat-state">
            <RefreshCw
              className="request-chat-spin"
              size={23}
            />
            <p>Loading conversation...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="request-chat-state">
            <MessageCircle size={30} />
            <p>
              No messages yet. Start the conversation with our support team.
            </p>
          </div>
        ) : (
          messages.map((item) => {
            const ownMessage =
              item.senderUid === currentUser.uid;

            return (
              <div
                key={item.id}
                className={`request-chat-message ${
                  ownMessage
                    ? "own-message"
                    : "other-message"
                }`}
              >
                <div className="request-chat-bubble">

                  <span className="request-chat-sender">
                    {item.senderRole === "admin"
                      ? "MerchantCare Support"
                      : item.senderEmail || "Merchant"}
                  </span>

                  <p>{item.text}</p>

                  <small>
                    {formatMessageDate(item.createdAt)}
                  </small>

                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />

      </div>

      {error && (
        <p className="request-chat-error">
          {error}
        </p>
      )}

      <form
        className="request-chat-form"
        onSubmit={sendMessage}
      >

        <input
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Write your message..."
          maxLength={2000}
          disabled={!currentUser || sending}
        />

        <button
          type="submit"
          disabled={
            !message.trim() ||
            sending ||
            !currentUser
          }
          aria-label="Send message"
        >
          {sending ? (
            <RefreshCw
              className="request-chat-spin"
              size={18}
            />
          ) : (
            <Send size={18} />
          )}
        </button>

      </form>

    </section>
  );
}
