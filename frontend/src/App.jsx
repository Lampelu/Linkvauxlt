import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const [originalUrl, setOriginalUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Fetch saved links from the backend.
  async function fetchUrls() {
    try {
      const response = await axios.get(`${API_URL}/api/urls`);
      setUrls(response.data);
    } catch (err) {
      console.error(err);
      setError("Unable to load links. Check your backend.");
    }
  }

  // Load links when the page opens.
  useEffect(() => {
    fetchUrls();
  }, []);

  // Create a shortened URL.
  async function handleShorten(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!originalUrl.trim()) {
      setError("Please enter a URL.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/urls`, {
        originalUrl: originalUrl.trim(),
        expiresAt: expiresAt || null,
      });

      setMessage(`Short link created: ${response.data.shortUrl}`);

      setOriginalUrl("");
      setExpiresAt("");

      await fetchUrls();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Unable to shorten the URL. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // Copy a short link.
  async function handleCopy(shortUrl) {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setMessage("Short link copied to clipboard!");
      setError("");
    } catch {
      setError("Copy failed. Please copy the link manually.");
    }
  }

  // Calculate total clicks across all saved links.
  const totalClicks = urls.reduce(
    (total, url) => total + url.clicks,
    0
  );

  const activeLinks = urls.filter((url) => !url.expired).length;

  return (
    <main className="page">
      <header className="header">
        <a className="brand" href="/">
          <span className="brand-icon">L</span>
          LinkVault
        </a>

        <span className="header-label">URL SHORTENER & ANALYTICS</span>
      </header>

      <section className="hero">
        <p className="eyebrow">YOUR LINKS, SIMPLIFIED</p>

        <h1>
          Short links.
          <br />
          <span>Clear insights.</span>
        </h1>

        <p className="subtitle">
          Turn long URLs into simple links and track their visits
          from one clean dashboard.
        </p>
      </section>

      <section className="shortener card">
        <h2>Create a short link</h2>

        <p className="muted">
          Paste your destination URL to get started.
        </p>

        <form onSubmit={handleShorten}>
          <label htmlFor="originalUrl">Destination URL</label>

          <input
            id="originalUrl"
            type="url"
            placeholder="https://example.com/your-long-url"
            value={originalUrl}
            onChange={(event) => setOriginalUrl(event.target.value)}
            required
          />

          <label htmlFor="expiresAt">
            Expiry date <span className="optional">(optional)</span>
          </label>

          <input
            id="expiresAt"
            type="datetime-local"
            value={expiresAt}
            min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16)}
            onChange={(event) => setExpiresAt(event.target.value)}
          />

          <button className="primary-button" disabled={loading}>
            {loading ? "Creating..." : "Shorten URL →"}
          </button>
        </form>

        {error && <p className="notice error">{error}</p>}
        {message && <p className="notice success">{message}</p>}
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <p>Total links</p>
          <strong>{urls.length}</strong>
        </article>

        <article className="stat-card">
          <p>Active links</p>
          <strong>{activeLinks}</strong>
        </article>

        <article className="stat-card">
          <p>Total clicks</p>
          <strong>{totalClicks}</strong>
        </article>
      </section>

      <section className="links-section">
        <div className="section-heading">
          <div>
            <h2>Your links</h2>
            <p className="muted">
              Manage your shortened URLs and monitor their visits.
            </p>
          </div>

          <button className="refresh-button" onClick={fetchUrls}>
            ↻ Refresh
          </button>
        </div>

        {urls.length === 0 ? (
          <div className="empty-state card">
            <h3>No links yet</h3>
            <p>Your shortened links will appear here.</p>
          </div>
        ) : (
          <div className="links-list">
            {urls.map((url) => (
              <article className="link-card card" key={url._id}>
                <div className="link-info">
                  <a
                    className="short-url"
                    href={url.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {url.shortUrl}
                  </a>

                  <p className="original-url">{url.originalUrl}</p>

                  <p className="link-date">
                    Created:{" "}
                    {new Date(url.createdAt).toLocaleString()}
                  </p>

                  {url.expiresAt && (
                    <p className="link-date">
                      Expires:{" "}
                      {new Date(url.expiresAt).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="link-actions">
                  <div className="click-count">
                    <strong>{url.clicks}</strong>
                    <span>clicks</span>
                  </div>

                  <span
                    className={`badge ${
                      url.expired ? "expired" : "active"
                    }`}
                  >
                    {url.expired ? "Expired" : "Active"}
                  </span>

                  <button
                    className="copy-button"
                    onClick={() => handleCopy(url.shortUrl)}
                  >
                    Copy link
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer>
        <p>LinkVault · Built with the MERN stack</p>
      </footer>
    </main>
  );
}

export default App;
