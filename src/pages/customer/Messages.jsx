import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  LoaderCircle,
  MessageCircle,
  Send,
  ShoppingBag,
} from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import { formatDate, formatMoney, publicRequest } from "./customerUtils";

function getId(value) {
  return String(
    value?._id ||
      value?.id ||
      value?.userId ||
      (typeof value === "string" || typeof value === "number" ? value : "")
  );
}

function readUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function getOtherParticipant(conversation, userId) {
  return getId(conversation.customer) === userId
    ? conversation.seller
    : conversation.customer;
}

function getParticipantName(participant, isSeller) {
  return isSeller
    ? participant?.name || "Customer"
    : participant?.sellerApplication?.shopName || participant?.name || "Shop";
}

function ParticipantAvatar({ participant, isSeller }) {
  const name = getParticipantName(participant, isSeller);
  if (participant?.avatar?.url) {
    return (
      <span className="customer-conversation-avatar">
        <img src={participant.avatar.url} alt={`${name} profile`} />
      </span>
    );
  }
  return (
    <span className="customer-conversation-avatar" aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [user] = useState(readUser);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [threadConversationId, setThreadConversationId] = useState("");
  const [productContext, setProductContext] = useState(
    location.state?.product || null
  );
  const [draft, setDraft] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const messagesEndRef = useRef(null);
  const selectedConversationId = searchParams.get("conversation") || "";
  const productId = searchParams.get("product") || "";
  const userId = getId(user);
  const isSeller = user?.role === "seller";

  const selectedConversationFromList = useMemo(
    () => conversations.find((item) => item._id === selectedConversationId),
    [conversations, selectedConversationId]
  );
  const activeConversation =
    selectedConversation?._id === selectedConversationId
      ? selectedConversation
      : selectedConversationFromList;
  const otherParticipant = activeConversation
    ? getOtherParticipant(activeConversation, userId)
    : null;

  useEffect(() => {
    let active = true;
    const loadConversations = async () => {
      try {
        const response = await apiRequest("/api/conversation");
        if (!Array.isArray(response.data)) {
          throw new Error("The server returned an invalid conversation list.");
        }
        if (active) {
          setConversations(response.data);
          setListError("");
        }
      } catch (requestError) {
        if (active) {
          setListError(requestError.message || "Unable to load your conversations.");
        }
      } finally {
        if (active) setListLoading(false);
      }
    };

    loadConversations();
    const intervalId = window.setInterval(loadConversations, 30000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!selectedConversationId) return undefined;

    let active = true;
    const controller = new AbortController();
    let intervalId;

    async function loadThread() {
      try {
        const [conversationResponse, messageResponse] = await Promise.all([
          apiRequest(`/api/conversation/${selectedConversationId}`, {
            signal: controller.signal,
          }),
          apiRequest(`/api/message/${selectedConversationId}`, {
            signal: controller.signal,
          }),
        ]);
        if (!Array.isArray(messageResponse.data)) {
          throw new Error("The server returned an invalid message history.");
        }
        if (!active) return;

        setSelectedConversation(conversationResponse.data);
        setConversations((current) => {
          const existing = current.find(
            (conversation) => conversation._id === conversationResponse.data._id
          );
          const next = existing
            ? current.map((conversation) =>
                conversation._id === conversationResponse.data._id
                  ? { ...conversation, ...conversationResponse.data }
                  : conversation
              )
            : [conversationResponse.data, ...current];
          return next.sort(
            (left, right) =>
              new Date(right.lastMessageAt || right.updatedAt) -
              new Date(left.lastMessageAt || left.updatedAt)
          );
        });
        setMessages((current) => {
          const unchanged =
            current.length === messageResponse.data.length &&
            current.every(
              (message, index) =>
                message._id === messageResponse.data[index]?._id
            );
          return unchanged ? current : messageResponse.data;
        });
        setThreadConversationId(selectedConversationId);
        setError("");

        if (
          messageResponse.data.some(
            (message) => getId(message.receiver) === userId && !message.read
          )
        ) {
          await apiRequest(`/api/message/${selectedConversationId}/read`, {
            method: "PATCH",
            signal: controller.signal,
          });
        }
      } catch (requestError) {
        if (active && requestError.name !== "AbortError") {
          setError(requestError.message || "Unable to load this conversation.");
        }
      }
    }

    loadThread();
    intervalId = window.setInterval(loadThread, 5000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [selectedConversationId, userId]);

  useEffect(() => {
    if (!productId || getId(productContext) === productId) return undefined;

    let active = true;
    const controller = new AbortController();
    publicRequest(`/api/product/${productId}`, { signal: controller.signal })
      .then((response) => {
        if (active) setProductContext(response.data);
      })
      .catch((requestError) => {
        if (active && requestError.name !== "AbortError") {
          setError(requestError.message || "Unable to load the product details.");
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [productId, productContext]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, threadConversationId]);

  const chooseConversation = (conversationId) => {
    setError("");
    setProductContext(null);
    setSearchParams({ conversation: conversationId });
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !selectedConversationId || sending) return;

    setSending(true);
    setError("");
    try {
      const response = await apiRequest(
        `/api/message/${selectedConversationId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            ...(productId ? { product: productId } : {}),
          }),
        }
      );
      setMessages((current) => [...current, response.data]);
      setDraft("");
      setConversations((current) => {
        const existing = current.find(
          (conversation) => conversation._id === selectedConversationId
        );
        if (!existing) return current;
        return [
          { ...existing, lastMessage: text, lastMessageAt: new Date().toISOString() },
          ...current.filter(
            (conversation) => conversation._id !== selectedConversationId
          ),
        ];
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to send your message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="customer-messages-page">
      <div className="customer-page-heading">
        <div>
          <p className="page-eyebrow">{isSeller ? "SELLER WORKSPACE" : "CUSTOMER SUPPORT"}</p>
          <h1>Messages</h1>
          <p>
            {isSeller
              ? "Reply to customer questions about your products."
              : "Talk directly with sellers about their products."}
          </p>
        </div>
        <Link className="text-link" to={isSeller ? "/seller" : "/"}>
          <ArrowLeft size={15} /> {isSeller ? "Seller workspace" : "Continue shopping"}
        </Link>
      </div>

      <div className="customer-messages-layout">
        <aside className="customer-conversation-list" aria-label="Your conversations">
          <div className="customer-messages-panel-heading">
            <h2>Your conversations</h2>
            <span>{conversations.length}</span>
          </div>
          {listError && <p className="store-alert" role="alert">{listError}</p>}
          {listLoading ? (
            <div className="customer-messages-state" role="status">
              <LoaderCircle className="spin" size={20} /> Loading conversations…
            </div>
          ) : conversations.length === 0 ? (
            <div className="customer-messages-state">
              <MessageCircle size={24} />
              <strong>No conversations yet</strong>
              <span>
                {isSeller
                  ? "Customer messages about your listings will appear here."
                  : "Open a product and message its seller to start chatting."}
              </span>
              {!isSeller && <Link className="text-link" to="/">Browse products</Link>}
            </div>
          ) : (
            <div className="customer-conversation-items">
              {conversations.map((conversation) => {
                const participant = getOtherParticipant(conversation, userId);
                const selected = conversation._id === selectedConversationId;
                return (
                  <button
                    className={`customer-conversation-item${selected ? " is-selected" : ""}`}
                    key={conversation._id}
                    type="button"
                    onClick={() => chooseConversation(conversation._id)}
                  >
                    <ParticipantAvatar participant={participant} isSeller={isSeller} />
                    <span className="customer-conversation-copy">
                      <strong>{getParticipantName(participant, isSeller)}</strong>
                      <span>{conversation.lastMessage || "Start a conversation"}</span>
                    </span>
                    <time>
                      {conversation.lastMessageAt
                        ? formatDate(conversation.lastMessageAt)
                        : ""}
                    </time>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="customer-chat-panel" aria-label="Chat">
          {!selectedConversationId ? (
            <div className="customer-chat-empty">
              <span><MessageCircle size={27} /></span>
              <h2>Choose a conversation</h2>
              <p>Select a seller from your conversations to read and send messages.</p>
            </div>
          ) : (
            <>
              <header className="customer-chat-header">
                <ParticipantAvatar participant={otherParticipant} isSeller={isSeller} />
                <div>
                  <strong>{getParticipantName(otherParticipant, isSeller)}</strong>
                  <span>{isSeller ? "Customer on ShopEveryDay" : "Shop on ShopEveryDay"}</span>
                </div>
              </header>

              {productContext && (
                <div className="customer-chat-product">
                  {productContext.images?.[0]?.url ? (
                    <img src={productContext.images[0].url} alt="" />
                  ) : (
                    <span><ShoppingBag size={18} /></span>
                  )}
                  <div>
                    <small>Asking about</small>
                    <strong>{productContext.name}</strong>
                    {(productContext.discountPrice ?? productContext.basePrice) !== undefined && (
                      <span>
                        {formatMoney(
                          productContext.discountPrice ?? productContext.basePrice
                        )}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="customer-chat-messages" aria-live="polite">
                {threadConversationId !== selectedConversationId ? (
                  <div className="customer-messages-state" role="status">
                    <LoaderCircle className="spin" size={20} /> Loading messages…
                  </div>
                ) : messages.length === 0 ? (
                  <div className="customer-chat-empty compact">
                    <MessageCircle size={23} />
                    <p>Send a message to start the conversation.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const ownMessage = getId(message.sender) === userId;
                    return (
                      <article
                        className={`customer-chat-message${ownMessage ? " is-own" : ""}`}
                        key={message._id}
                      >
                        {message.product && (
                          <span className="customer-message-product">
                            Product: {message.product.name || "Listing"}
                          </span>
                        )}
                        <p>{message.text}</p>
                        <time>{formatDate(message.createdAt)}</time>
                      </article>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {error && <p className="store-alert customer-chat-error" role="alert">{error}</p>}
              <form className="customer-chat-composer" onSubmit={sendMessage}>
                <label className="customer-visually-hidden" htmlFor="customer-message">
                  Write a message
                </label>
                <textarea
                  id="customer-message"
                  rows="1"
                  maxLength="5000"
                  placeholder="Write a message…"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  disabled={!threadConversationId || threadConversationId !== selectedConversationId}
                />
                <button
                  className="primary-button"
                  type="submit"
                  disabled={
                    sending ||
                    !draft.trim() ||
                    threadConversationId !== selectedConversationId
                  }
                  aria-label="Send message"
                >
                  {sending ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}
                  <span>{sending ? "Sending…" : "Send"}</span>
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
