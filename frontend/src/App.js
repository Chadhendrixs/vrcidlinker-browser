import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL;

export default function App() {
  const [servers, setServers] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/servers`)
      .then((res) => res.json())
      .then(async (data) => {
        const enriched = await Promise.all(
          data.map(async (server) => {
            if (server.name && server.member_count !== null) return server;

            try {
              const res = await fetch(
                `https://discord.com/api/invites/${server.invite_code}?with_counts=true`
              );
              if (!res.ok) throw new Error();
              const json = await res.json();
              const guild = json.guild || {};
              const profile = json.profile || {};
              const guild_id = guild.id;

              const buildImageUrl = (hash, id, type) => {
                if (!hash || !id) return null;
                const ext = hash.startsWith("a_") ? "gif" : "webp";
                if (type === "icon")
                  return `https://cdn.discordapp.com/icons/${id}/${hash}.${ext}`;
                if (type === "banner")
                  return `https://cdn.discordapp.com/banners/${id}/${hash}.${ext}?size=512`;
                return null;
              };

              return {
                ...server,
                name: guild.name || server.invite_code,
                description: guild.description,
                member_count: json.approximate_member_count,
                custom_tag: profile.tag,
                boost_tier: guild.premium_tier,
                icon_url: buildImageUrl(guild.icon, guild_id, "icon"),
                banner_url: buildImageUrl(guild.banner, guild_id, "banner"),
              };
            } catch {
              return server;
            }
          })
        );

        setServers(enriched);
      })
      .catch((err) => console.error("Failed to fetch servers:", err));
  }, []);

  return (
    <div className={`app-container ${menuOpen ? "menu-open" : ""}`}>
      <div className="sidebar">
        <div className="search-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          🔍
        </div>
        {menuOpen && (
          <div className="top-search-panel">
            <h2>Search & Filters</h2>
            <p>[Search bar here]</p>
            <p>[Tag checkboxes here]</p>
          </div>
        )}
      </div>

      <div className="content">
        <div className="video-banner">
          <video autoPlay muted loop className="background-video">
            <source src="https://vrcidlinker.com/filesize.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="video-overlay">
            <h1 className="banner-text">Server Directory</h1>
          </div>
        </div>

        <div className="grid-container">
          {servers.length === 0 ? (
            <p className="empty-message">Server API is</p>
          ) : (
            servers.map((server) => {
              const displayName = server.name || server.invite_code;
              const isInvalid = !server.name;
              const tagList = server.tags?.split(",").map((tag) => tag.trim()) || [];
              const primaryTags = tagList.slice(0, 2);
              const hiddenTags = tagList.slice(2);

              return (
                <div
                  key={server.id}
                  className="server-card"
                  style={{
                    backgroundImage: server.banner_url
                      ? `url(${server.banner_url})`
                      : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="card-content">
                    {server.icon_url && (
                      <img
                        src={server.icon_url}
                        alt="icon"
                        className="server-icon large"
                      />
                    )}
                    <Link
                      to={`/invite/${server.invite_code}`}
                      className="server-name-link"
                      title={displayName}
                    >
                      <h2 className="server-name ellipsis">{displayName}</h2>
                    </Link>
                    {isInvalid && (
                      <span
                        className="invalid-warning"
                        title="This server is missing a Discord name."
                      >
                        ⚠
                      </span>
                    )}
                    {server.description && (
                      <div
                        className="server-description ellipsis"
                        data-full={server.description}
                        title={server.description}>
                        {server.description}
                      </div>
                    )}
                    <div className="member-and-tags">
                      {server.member_count != null && (
                        <div className="member-count">
                          {server.member_count.toLocaleString()} members
                        </div>
                      )}
                      <div className="tag-container">
                        {primaryTags.map((tag, index) => (
                          <span key={index} className="tag">
                            {tag}
                          </span>
                        ))}
                        {hiddenTags.length > 0 && (
                          <span className="tag more-tag" title={hiddenTags.join(", ")}>
                            +{hiddenTags.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
