import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import client from "../api/client";

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const POLL_MS = 60000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  const load = useCallback(() => {
    client
      .get("/notifications")
      .then(({ data }) => {
        setItems(data.notifications);
        setUnread(data.unread);
      })
      .catch(() => {
        /* a failed poll should never interrupt the page */
      });
  }, []);

  useEffect(() => {
    load();
    // Light polling keeps the badge fresh without a websocket layer.
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openPanel = () => {
    const next = !open;
    setOpen(next);
    if (next) load();
  };

  const readAll = async () => {
    const { data } = await client.patch("/notifications/read-all");
    setItems(data.notifications);
    setUnread(data.unread);
  };

  const openItem = async (item) => {
    if (!item.read) {
      try {
        const { data } = await client.patch(`/notifications/${item.id}/read`);
        setItems(data.notifications);
        setUnread(data.unread);
      } catch (err) {
        /* still navigate */
      }
    }
    setOpen(false);
    if (item.link) navigate(item.link);
  };

  return (
    <div className="menu-wrap" ref={wrapRef}>
      <button
        className="icon-btn"
        onClick={openPanel}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
      >
        <Bell />
        {unread > 0 && <span className="notif-dot">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <h4>Notifications</h4>
            {unread > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={readAll}>
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="empty-state" style={{ padding: "36px 16px" }}>
              <Bell />
              <p>Nothing yet. Decisions on your bookings will show up here.</p>
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                className={`notif-item ${item.read ? "" : "unread"}`}
                onClick={() => openItem(item)}
              >
                <div className="notif-title">{item.title}</div>
                <div className="notif-body">{item.message}</div>
                <div className="notif-time">{timeAgo(item.createdAt)}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
